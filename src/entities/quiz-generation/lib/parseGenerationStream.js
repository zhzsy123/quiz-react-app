function parseLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return null
  return JSON.parse(trimmed)
}

export function parseGenerationStreamChunk(chunk, buffer = '', final = false) {
  const combined = `${buffer || ''}${chunk || ''}`
  if (!combined) {
    return { events: [], remainingBuffer: '' }
  }

  const lines = combined.split(/\r?\n/)
  const workingLines = final ? lines : lines.slice(0, -1)
  const remainingBuffer = final ? '' : lines.at(-1) || ''

  const events = []

  workingLines.forEach((line) => {
    const parsed = parseLine(line)
    if (parsed) {
      events.push(parsed)
    }
  })

  if (final && remainingBuffer.trim()) {
    const parsed = parseLine(remainingBuffer)
    if (parsed) {
      events.push(parsed)
    }
  }

  return { events, remainingBuffer }
}

export function flushGenerationStreamBuffer(buffer = '') {
  return parseGenerationStreamChunk('', buffer, true)
}

