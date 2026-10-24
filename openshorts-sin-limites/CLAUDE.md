# CLAUDE.md

Guidance for Claude Code when working in `openshorts-sin-limites/`.

## Project Overview

A copy of the MIT core of [OpenShorts](https://github.com/mutonby/openshorts)
(upstream commit `9fc517b`) with every limit removed. It turns long videos into
vertical 9:16 clips (Gemini or a local LLM picks the moments), makes AI UGC
videos, and has a YouTube Studio for thumbnails/titles/descriptions. Self-hosted
only: upstream's paid `cloud/` package is not here.

## "Sin límites" rules

- `BILLING_ENABLED` is pinned to `False` in `app.py` and `mcp_server._billing_enabled()`.
  Never read it from the env again: `cloud/` does not exist, so turning it on
  would crash the cloud-only branches that are still in the code.
- Every cap that refuses work or deletes files defaults to off (0 / None):
  `MAX_FILE_SIZE_MB`, `MIN_SOURCE_SECONDS`, `JOB_RETENTION_SECONDS`,
  `OUTPUT_MAX_GB`, `UPLOADS_MAX_GB`, `RECUT_MAX_SEGMENTS`,
  `RECUT_MAX_TOTAL_SECONDS`, `FREE_TOOLS_RATE_LIMIT`. Keep new caps the same
  way: opt-in through `.env`, documented in `.env.example` and the README table.
- Clip count and length have a floor only (1 clip, 5s / 10s): no ceiling in
  `/api/process`, the MCP schema, `clip_selection.clip_duration_bounds` or the
  dashboard inputs. `shortlist_target` must reach at least `CLIP_TARGET_MAX`.
- The dashboard reads caps from `/api/config` (`minSourceSeconds`,
  `maxFileSizeMb`) and the clip EDL (`limits`, `null` = no cap). Never hard-code
  a limit in the frontend.
- The dashboard shows only the Clip Generator and Settings (the user asked for
  clips only). AI Shorts, AI Agent, UGC Gallery and YouTube Studio tabs, the
  fal.ai and agent cards in Settings and the landing-page links were removed
  from `dashboard/src/App.jsx`; their backend endpoints are still there, unused.
- Keep the diff from upstream small (no mass refactors, no deleting the inert
  billing branches) so upstream fixes can still be ported.

## Development Commands

```bash
docker compose up --build        # backend :8000 (FastAPI), frontend :5175 (Vite proxies the API)

pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
pytest tests/ -v                 # runs without the heavy ML stack

cd dashboard && npm install
npm run dev                      # :5173
npm run build                    # CI runs this
```

`npm run lint` has 10 pre-existing upstream errors in files this copy does not
touch; lint the files you change.

## Pipeline

Ingest (yt-dlp or upload) → transcription (word timestamps) → scene detection →
the LLM picks moments (15-60 s by default) → FFmpeg cut → vertical reframing →
effects/subtitles → hook overlay → optional ElevenLabs dubbing → optional S3
backup → optional social posting via Upload-Post.

## Key Files

- `main.py`: core processing; runs as a child process per job.
- `app.py`: FastAPI server, job queue, REST endpoints.
- `clip_selection.py`, `layout_picker.py`, `reframe_v2.py`, `split_layout.py`,
  `screencast_layout.py`, `camera_inset.py`: moment picking and layouts.
- `editor.py` (AI FFmpeg effects), `hooks.py`, `subtitles.py`, `translate.py`
  (dubbing), `thumbnail.py`, `recut.py` (clip editor), `saasshorts.py` (AI Shorts).
- `mcp_server.py`, `mcp_stdio.py`: MCP over HTTP and stdio. `cli/`: the CLI.
- `dashboard/src/App.jsx`: main React component.
- `tests/test_sin_limites.py`: pins what this copy changes.

## Upstream rules that still apply

- `layout_picker` sends 12 frames at 1024px and asks for a closed choice;
  `layout_picker.apply()` only adds options. A vertical source skips the picker.
- SPLIT captions need ASS with `{\an5}` per word on the seam. Preserve
  `layout_ranges` through recut (`layout_ranges.remap`).
- The scoring pass ranks every window (global top N); the `min_clips` floor is
  enforced in code.
- Call `transcribe_backends.release_models()` after any ASR.
- MCP stdio: swap `sys.stdout` for stderr before importing `app`.
- Webhook URLs go through `security_utils.assert_public_url` at submit and at delivery.
- Keep the explicit `yt_clients.py` client list; `noplaylist` always.
- Architecture notes: `docs/architecture/` (written for upstream, cloud parts do not apply).
