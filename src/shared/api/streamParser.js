function emitParseError(text, onError) {
  const preview = String(text || '').slice(0, 200)
  onError?.(new Error(`Unable to parse generated object: ${preview}`))
}

function safeJsonParse(text, onError) {
  try {
    return JSON.parse(text)
  } catch {
    emitParseError(text, onError)
    return null
  }
}

function emitGeneratedObject(candidate, onEvent, onError) {
  const parsed = safeJsonParse(candidate, onError)
  if (!parsed || typeof parsed !== 'object') return
  onEvent?.(parsed)
}

function extractStreamTextChunk(line, onError) {
  const trimmed = String(line || '').trim()
  if (!trimmed || trimmed.startsWith(':')) return { content: '', done: false }
  if (!trimmed.startsWith('data:')) {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return { content: trimmed, done: false }
    }
    return { content: '', done: false }
  }

  const payload = trimmed.slice(5).trim()
  if (!payload) return { content: '', done: false }
  if (payload === '[DONE]') return { content: '', done: true }

  const parsed = safeJsonParse(payload, onError)
  if (!parsed) return { content: '', done: false }

  const content =
    parsed?.choices?.[0]?.delta?.content ??
    parsed?.choices?.[0]?.message?.content ??
    parsed?.content ??
    ''

  return {
    content: typeof content === 'string' ? content : '',
    done: false,
  }
}

function drainGeneratedBuffer(buffer, { onEvent, onError, final = false }) {
  let startIndex = -1
  let depth = 0
  let inString = false
  let escaped = false
  let lastConsumedIndex = -1

  for (let index = 0; index < buffer.length; index += 1) {
    const char = buffer[index]

    if (startIndex === -1) {
      if (/\s/.test(char)) continue
      if (char === '{') {
        startIndex = index
        depth = 1
        inString = false
        escaped = false
      }
      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        emitGeneratedObject(buffer.slice(startIndex, index + 1), onEvent, onError)
        lastConsumedIndex = index + 1
        startIndex = -1
      }
    }
  }

  let nextBuffer = buffer
  if (lastConsumedIndex >= 0) {
    nextBuffer = buffer.slice(lastConsumedIndex)
  } else if (startIndex > 0) {
    nextBuffer = buffer.slice(startIndex)
  } else if (startIndex === -1) {
    nextBuffer = buffer.trimStart()
  }

  if (final && nextBuffer.trim()) {
    const trimmed = nextBuffer.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      emitParseError(nextBuffer, onError)
    }
    return ''
  }

  return nextBuffer
}

export function createNdjsonStreamParser({ onEvent, onError } = {}) {
  let transportBuffer = ''
  let generatedBuffer = ''
  let transportDone = false

  function processTransportLines() {
    let newlineIndex = transportBuffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = transportBuffer.slice(0, newlineIndex)
      transportBuffer = transportBuffer.slice(newlineIndex + 1)

      const { content, done } = extractStreamTextChunk(line, onError)
      if (content) {
        generatedBuffer += content
        generatedBuffer = drainGeneratedBuffer(generatedBuffer, { onEvent, onError })
      }
      if (done) {
        transportDone = true
        onEvent?.({ type: 'done' })
      }

      newlineIndex = transportBuffer.indexOf('\n')
    }
  }

  return {
    pushTransportChunk(chunk = '') {
      if (!chunk) return
      transportBuffer += String(chunk)
      processTransportLines()
    },
    flush() {
      if (transportBuffer.trim()) {
        const { content, done } = extractStreamTextChunk(transportBuffer, onError)
        if (content) {
          generatedBuffer += content
        }
        if (done && !transportDone) {
          transportDone = true
          onEvent?.({ type: 'done' })
        }
        transportBuffer = ''
      }

      generatedBuffer = drainGeneratedBuffer(generatedBuffer, {
        onEvent,
        onError,
        final: true,
      })

      if (!transportDone) {
        onEvent?.({ type: 'done' })
      }
    },
  }
}
