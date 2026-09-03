// Cheap header-only probe: runs `ffmpeg -i input` (no output) which makes
// ffmpeg exit with an error but first print stream info to its log. We
// parse that log instead of shipping a separate demuxer/probe library.
export async function probeInput(ffmpeg, inputName, fallbackDuration = null) {
  const logs = []
  const handler = ({ message }) => logs.push(message)
  ffmpeg.on('log', handler)

  try {
    await ffmpeg.exec(['-i', inputName])
  } catch {
    // expected: ffmpeg errors out because no output was specified
  } finally {
    ffmpeg.off('log', handler)
  }

  const text = logs.join('\n')
  const hasAudio = /Stream #0:\d+.*: ?Audio:/.test(text)

  let duration = fallbackDuration
  const durationMatch = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (durationMatch) {
    const [, h, m, s] = durationMatch
    const parsed = Number(h) * 3600 + Number(m) * 60 + parseFloat(s)
    if (Number.isFinite(parsed) && parsed > 0) duration = parsed
  }

  return { hasAudio, duration, raw: text }
}
