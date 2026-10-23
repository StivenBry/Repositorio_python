"""What this copy changes from upstream: no billing, and every cap that refused
work or deleted files is off by default (each one can be turned back on in the
env). Pinned at the HTTP surface where possible."""
import asyncio
import json
import os
import time

import httpx
import pytest

app_module = pytest.importorskip("app")


def _client():
    transport = httpx.ASGITransport(app=app_module.app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver",
                             headers={"X-Gemini-Key": "test-key"})


def _call(method, path, **kw):
    async def _do():
        async with _client() as c:
            return await getattr(c, method)(path, **kw)
    return asyncio.run(_do())


@pytest.fixture()
def dirs(tmp_path, monkeypatch):
    out_root = tmp_path / "output"
    up_root = tmp_path / "uploads"
    out_root.mkdir()
    up_root.mkdir()
    monkeypatch.setattr(app_module, "OUTPUT_DIR", str(out_root))
    monkeypatch.setattr(app_module, "UPLOAD_DIR", str(up_root))
    monkeypatch.setattr(app_module, "_media_duration_seconds", lambda p: 120.0)

    async def fake_put(item):  # never spawn main.py
        pass
    monkeypatch.setattr(app_module.job_queue, "put", fake_put)
    return out_root, up_root


def _age(path, days):
    t = time.time() - days * 86400
    os.utime(path, (t, t))


# --- billing ----------------------------------------------------------------

def test_billing_is_pinned_off(monkeypatch):
    monkeypatch.setenv("BILLING_ENABLED", "1")  # must not matter
    assert app_module.BILLING_ENABLED is False
    import mcp_server
    assert mcp_server._billing_enabled() is False
    cfg = _call("get", "/api/config").json()
    assert cfg["billingEnabled"] is False
    assert cfg["jobRetentionSeconds"] == 0
    # The upload box reads these: no length or size cap to show or check.
    assert cfg["minSourceSeconds"] == 0
    assert cfg["maxFileSizeMb"] is None


def test_no_watermark_on_jobs(dirs):
    resp = _call("post", "/api/process",
                 files={"file": ("talk.mp4", b"x" * 2000, "video/mp4")},
                 data={"acknowledged": "true"})
    assert resp.status_code == 200, resp.text
    job = app_module.jobs[resp.json()["job_id"]]
    assert job["watermark"] is False
    assert "WATERMARK" not in job["env"]


# --- upload size --------------------------------------------------------------

def _upload(body):
    slot = _call("post", "/api/uploads", json={"filename": "big.mp4"}).json()
    return slot, _call("put", f"/api/uploads/{slot['upload_id']}", content=body)


def test_upload_has_no_size_cap_by_default(dirs):
    assert app_module.MAX_FILE_SIZE_MB == 0
    slot, resp = _upload(b"\x00" * (3 * 1024 * 1024))
    assert slot["max_mb"] is None
    assert resp.status_code == 200 and resp.json()["bytes"] == 3 * 1024 * 1024


def test_upload_cap_can_be_turned_back_on(dirs, monkeypatch):
    monkeypatch.setattr(app_module, "MAX_FILE_SIZE_MB", 1)
    slot, resp = _upload(b"\x00" * (2 * 1024 * 1024))
    assert slot["max_mb"] == 1
    assert resp.status_code == 413


# --- clip count and length ----------------------------------------------------

def test_process_accepts_many_long_clips(dirs):
    resp = _call("post", "/api/process",
                 files={"file": ("talk.mp4", b"x" * 2000, "video/mp4")},
                 data={"acknowledged": "true", "target_clips": "40",
                       "clip_min_seconds": "200", "clip_max_seconds": "600"})
    assert resp.status_code == 200, resp.text
    env = app_module.jobs[resp.json()["job_id"]]["env"]
    assert env["CLIP_TARGET_MIN"] == env["CLIP_TARGET_MAX"] == "40"
    assert float(env["CLIP_MIN_SECONDS"]) == 200
    assert float(env["CLIP_MAX_SECONDS"]) == 600


@pytest.mark.parametrize("field,value", [
    ("target_clips", "0"), ("target_clips", "2.5"),
    ("clip_min_seconds", "1"), ("clip_max_seconds", "inf"),
])
def test_process_still_rejects_nonsense(dirs, field, value):
    resp = _call("post", "/api/process",
                 files={"file": ("talk.mp4", b"x" * 2000, "video/mp4")},
                 data={"acknowledged": "true", field: value})
    assert resp.status_code == 400


def test_mcp_schema_has_no_upper_bounds():
    import mcp_server
    tool = next(t for t in mcp_server.TOOLS if t["name"] == "process_video")
    props = tool["inputSchema"]["properties"]
    for name in ("target_clips", "clip_min_seconds", "clip_max_seconds"):
        assert "maximum" not in props[name]


# --- retention and disk caps --------------------------------------------------

def test_old_jobs_and_uploads_are_kept(dirs):
    out_root, up_root = dirs
    job = out_root / "oldjob"
    job.mkdir()
    (job / "clip.mp4").write_bytes(b"x")
    _age(job, 30)
    upload = up_root / "oldjob_talk.mp4"
    upload.write_bytes(b"x")
    _age(upload, 30)

    now = time.time()
    app_module._sweep_expired_job_dirs(now)
    app_module._sweep_expired_uploads(now)
    assert list(app_module._sweep_retained_sources(now)) == []
    app_module._enforce_output_size_cap()
    app_module._enforce_uploads_size_cap()
    assert job.exists() and upload.exists()


def test_retention_can_be_turned_back_on(dirs, monkeypatch):
    out_root, _ = dirs
    monkeypatch.setattr(app_module, "JOB_RETENTION_SECONDS", 86400)
    job = out_root / "oldjob"
    job.mkdir()
    _age(job, 2)
    app_module._sweep_expired_job_dirs(time.time())
    assert not job.exists()


def test_source_retention_works_while_jobs_are_kept(dirs, monkeypatch):
    # JOB_RETENTION_SECONDS=0 (keep jobs) must not disable the source-only knob.
    out_root, _ = dirs
    monkeypatch.setattr(app_module, "SOURCE_RETENTION_SECONDS", 3600)
    job = out_root / "urljob"
    job.mkdir()
    (job / "x_metadata.json").write_text(json.dumps({"source_video": "source.mp4"}))
    src = job / "source.mp4"
    src.write_bytes(b"x")
    _age(src, 1)
    assert list(app_module._sweep_retained_sources(time.time())) == ["urljob"]
    assert not src.exists() and job.exists()


# --- free tools ---------------------------------------------------------------

def test_free_tools_have_no_rate_limit_by_default():
    import free_tools
    assert free_tools.RATE_LIMIT_ENABLED is False
    for _ in range(500):  # upstream allowed 10 per 10 min per IP
        free_tools._enforce("transcript", object())
