---
name: openshorts
version: 1.1.0
description: Turn long videos (podcasts, webinars, streams) into vertical 9:16 clips with subtitles, re-cut them, and publish them to TikTok, Instagram Reels and YouTube Shorts via the OpenShorts API or MCP server. Use when the user wants to clip a video into shorts, find the best moments of a video, restyle captions on a clip, re-cut a clip, schedule or post clips to social platforms, or automate a clipping pipeline.
homepage: https://github.com/StivenBry/Repositorio_python/tree/main/openshorts-sin-limites
metadata:
  openclaw:
    emoji: "🎬"
    primaryEnv: OPENSHORTS_API_URL
  hermes:
    category: media
    tags: [video, clips, shorts, social-media, publishing, automation]
---

# OpenShorts: clip and publish video

OpenShorts turns a long video into vertical 9:16 clips (15-60s each by
default, any count and length on request) with
word-level subtitles burned in, reframed so the speaker stays in shot, then
optionally publishes them. One job takes minutes, not seconds: always work async
(submit, then webhook or poll).

## Connect

Two equivalent surfaces on the user's own server (no key); prefer MCP when
the client supports it:

- **MCP** (streamable HTTP): `http://localhost:8000/mcp`. Eight tools:
  `process_video`, `create_upload`, `get_job_status`, `list_clips`,
  `get_quota`, `add_subtitles`, `recut_clip`, `publish_clip`.
- **REST**: the same server, `http://localhost:8000`. Exact payloads and error
  shapes are in `reference.md`; read it before the first HTTP call.

This is a fork without upstream's hosted plans: no minute quota, no
watermark, no upload size or source length cap. The server needs a Gemini key
(in its env or as an `X-Gemini-Key` header) unless it picks moments with a
local LLM.

## The core loop

1. No quota to check: jobs are never refused for minutes, size or length.
   Very long sources simply take longer.
2. Submit: `POST /api/process` with JSON
   `{"url": "...", "acknowledged": true}`. Returns `{"job_id": ...}`
   immediately. See the next section for the options worth setting.
3. Finish: **webhooks beat polling.** With `webhook_url` set, OpenShorts POSTs
   exactly once when the job ends (completed OR failed, so pipelines never
   hang): `{"event": "job.completed", "job_id", "status", "clips": [{"index",
   "title", "video_url", "download_url"}]}`. If a secret was set, verify
   `X-OpenShorts-Signature: sha256=<hex>` = HMAC-SHA256 of the raw body.
   Without a webhook, poll `GET /api/status/{job_id}` every 30-60s; response is
   `{"status", "logs", "result"}` and `result.clips` appears on completion.
4. Publish: `POST /api/social/post` with `{"job_id", "clip_index",
   "platforms": ["tiktok", "instagram", "youtube"]}`, optional `title`,
   `scheduled_date` (ISO) + `timezone`. TikTok lands as a draft in the app;
   Instagram and YouTube publish directly. Restyle captions first if asked:
   `POST /api/subtitle` with `{"job_id", "clip_index", "style"}` (`classic`
   or `karaoke` word highlighting).

## The choices the API cannot make for you

**How many clips.** Leave `target_clips` unset by default: the AI decides, and
most videos yield two to six. It is a target (1 or more, no upper cap), not a
guarantee. Asking a short video for 15 clips does not produce 15 good ones, it produces the same
handful plus filler.

**Clip length.** `clip_min_seconds` / `clip_max_seconds` default to 15 and 60,
which is what the platforms reward. The max must sit at least 5 seconds above
the min.

**Aspect.** `output_format` is `auto` (vertical 9:16, what shorts want),
`vertical`, `horizontal` or `square`. It is not a resolution.

**Layouts.** Leave `layouts` empty unless you know the footage. The useful value
is `["auto"]`: one cheap AI call per source picks between no change, a
screencast layout and a split layout. The rest are manual overrides.
`split` stacks two people who are visible in the *same* frame, and is wrong for
shot/reverse-shot footage where it would show one person twice. `screencast` is
for scenes whose meaning lives outside the centre (a demo, slides, a
spreadsheet) that a plain crop would cut away. `speaker_cut` hard-cuts to
whoever is talking. `punch_in` is not a layout, it is a subtle push on the
clip's beats and composes with the others.

**Re-cutting.** `recut_clip` (`POST /api/clip/rerender`) takes an ordered list of
segments in seconds **of the original source video**, not of the clip, so you
can trim, extend, drop a dead moment in the middle, or reorder. Pass
`snap_to_words: true` so the boundaries land on word edges.

## A response that is not a failure

- **`needs_confirmation`** comes back with HTTP 200, not an error: the best
  available source resolution is below the quality gate. Ask the user, then
  resubmit the same body with `force_low_quality: true`. Never retry
  automatically: low resolution in means low resolution out.

Jobs past the server's `MAX_CONCURRENT_JOBS` are queued, not refused:
`GET /api/status/{job_id}` reports the queue position.

## Rules

- Only submit videos the user has rights to; `process_video` requires the
  `confirm_rights` acknowledgement and that is deliberate.
- Publishing is public and irreversible: confirm platforms and caption with the
  user before every `publish_clip` call.
- `download_url` links are presigned for 24h: fetch or forward them promptly.
- This copy is free and MIT-licensed, but the AI services it calls are the
  user's own accounts (Gemini; fal.ai, ElevenLabs and Upload-Post for AI
  Shorts, dubbing and publishing), each with its own pricing and limits.

## CLI shortcut

When shell access is easier than HTTP: install `cli/` from this repo
(`pip install ./cli`), then `openshorts process <url> --clips 20 --wait`,
`openshorts clips <job_id>`, `openshorts publish <job_id> 0 --platforms
tiktok`. It talks to `http://localhost:8000` unless `OPENSHORTS_API_URL` says
otherwise.
