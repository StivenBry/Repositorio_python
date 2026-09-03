import { clamp } from '../utils/format'
import { EXPORT_PROFILES } from './profiles'

export const INPUT_NAME = 'input.mp4'
export const OUTPUT_NAME = 'output.mp4'

// Builds the -vf / -af filter chains from the editor's edit state.
// Order: color correction -> flip -> subtle zoom crop -> speed (video pts).
// Audio: pitch shift (resample trick, tempo-compensated) -> overall speed -> 3-band EQ.
export function buildFilters({ transform, audio, color }) {
  const vf = []
  const af = []

  const brightness = clamp(color.brightness, -50, 50) / 100 // eq wants -1..1
  const contrast = clamp(color.contrast, -50, 50)
  const saturation = clamp(color.saturation, -50, 50)
  if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
    const c = clamp(1 + contrast / 100, 0.5, 2)
    const s = clamp(1 + saturation / 100, 0, 2)
    vf.push(`eq=brightness=${brightness.toFixed(3)}:contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}`)
  }

  if (transform.flip) vf.push('hflip')

  const zoomPct = clamp(transform.zoom, 0, 5)
  if (zoomPct > 0) {
    const z = (1 + zoomPct / 100).toFixed(4)
    vf.push(`crop=floor(iw/${z}/2)*2:floor(ih/${z}/2)*2`)
    vf.push(`scale=floor(iw*${z}/2)*2:floor(ih*${z}/2)*2`)
    vf.push('setsar=1')
  }

  const speed = clamp(transform.speed, 0.5, 2)
  if (speed !== 1) {
    vf.push(`setpts=PTS/${speed.toFixed(4)}`)
  }

  const pitchFactor = 1 + clamp(audio.pitch, -6, 6) / 100
  af.push('aresample=48000')
  if (pitchFactor !== 1) {
    af.push(`asetrate=48000*${pitchFactor.toFixed(5)}`)
    af.push('aresample=48000')
    af.push(`atempo=${clamp(1 / pitchFactor, 0.5, 2).toFixed(5)}`)
  }
  if (speed !== 1) {
    af.push(`atempo=${speed.toFixed(4)}`)
  }

  const bass = clamp(audio.bass, -12, 12)
  const mid = clamp(audio.mid, -12, 12)
  const treble = clamp(audio.treble, -12, 12)
  if (bass !== 0) af.push(`bass=f=100:g=${bass}`)
  if (mid !== 0) af.push(`equalizer=f=1000:t=o:w=1.5:g=${mid}`)
  if (treble !== 0) af.push(`treble=f=8000:g=${treble}`)

  return { vf, af }
}

// Combines the filter chains with export-profile settings (CRF vs target
// bitrate, audio bitrate, optional downscale, metadata stripping) into the
// final argv for ffmpeg.exec().
export function buildExportPlan({ state, probe, fileSize }) {
  const profile = EXPORT_PROFILES[state.exportSettings.profile]
  const speed = clamp(state.transform.speed, 0.5, 2)
  const { vf, af } = buildFilters(state)
  const hasAudio = probe.hasAudio !== false

  if (profile.maxWidth) {
    vf.push(`scale='min(${profile.maxWidth},iw)':-2`)
  }

  const args = ['-i', INPUT_NAME, '-map', '0:v:0']
  if (hasAudio) args.push('-map', '0:a:0?')

  if (vf.length) args.push('-vf', vf.join(','))
  if (hasAudio && af.length) args.push('-af', af.join(','))

  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p')

  let videoBitrateKbps = null
  if (profile.mode === 'bitrate') {
    const reduction = clamp(
      state.exportSettings.reduction ?? profile.defaultReduction,
      profile.reductionRange[0],
      profile.reductionRange[1],
    )
    const sourceDuration = Math.max(probe.duration || 1, 0.1)
    const outputDuration = Math.max(sourceDuration / speed, 0.1)
    const targetBits = fileSize * 8 * (1 - reduction)
    const audioBps = hasAudio ? profile.audioBitrateKbps * 1000 : 0
    const totalBps = targetBits / outputDuration
    videoBitrateKbps = Math.max(Math.round((totalBps - audioBps) / 1000), 250)
    args.push(
      '-b:v', `${videoBitrateKbps}k`,
      '-maxrate', `${Math.round(videoBitrateKbps * 1.45)}k`,
      '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`,
    )
  } else {
    const crf = clamp(state.exportSettings.crf ?? profile.defaultCrf, profile.crfRange[0], profile.crfRange[1])
    args.push('-crf', String(crf))
  }

  if (hasAudio) {
    args.push('-c:a', 'aac', '-b:a', `${profile.audioBitrateKbps}k`, '-ar', '48000', '-ac', '2')
  } else {
    args.push('-an')
  }

  // Strip all metadata (GPS/device/author tags, chapters, extra data
  // streams) and disable encoder-identifying muxer strings. The mov muxer
  // always writes generic (non-identifying) "VideoHandler"/"SoundHandler"
  // stream handler names regardless of -metadata overrides, so there's
  // nothing further to strip there.
  args.push(
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    '-fflags', '+bitexact',
    '-flags:v', '+bitexact',
    '-flags:a', '+bitexact',
    '-movflags', '+faststart',
    OUTPUT_NAME,
  )

  return { args, videoBitrateKbps, hasAudio }
}
