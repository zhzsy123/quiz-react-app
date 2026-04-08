function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function emitGeneratedLine(line, emitEvent, emitError) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return

  if (trimmed === '[DONE]') {
    emitEvent?.({ type: 'done' })
    return
  }

  const parsed = safeJsonParse(trimmed)
  if (!parsed) {
    emitError?.(new Error(`Unable to parse generated line: ${trimmed.slice(0, 160)}`))
    return
  }

  emitEvent?.(parsed)
}

function extractStreamTextChunk(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return ''
  if (trimmed === '[DONE]' || trimmed === 'data: [DONE]') return '[DONE]'

  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
  if (!payload) return ''

  const parsed = safeJsonParse(payload)
  if (!parsed) {
    return payload
  }

  const deltaContent = parsed?.choices?.[0]?.delta?.content
  if (typeof deltaContent === 'string' && deltaContent.length) return deltaContent

  if (typeof parsed?.delta?.content === 'string' && parsed.delta.content.length) {
    return parsed.delta.content
  }

  if (typeof parsed?.content === 'string' && parsed.content.length) return parsed.content

  if (parsed?.type && parsed.type !== 'text') {
    return JSON.stringify(parsed)
  }

  return ''
}

export function createNdjsonStreamParser({ onEvent, onError } = {}) {
  let transportBuffer = ''
  let generatedBuffer = ''

  function pushGeneratedText(text) {
    if (!text) return
    generatedBuffer += text

    let newlineIndex = generatedBuffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = generatedBuffer.slice(0, newlineIndex).replace(/\r$/, '')
      generatedBuffer = generatedBuffer.slice(newlineIndex + 1)
      emitGeneratedLine(line, onEvent, onError)
      newlineIndex = generatedBuffer.indexOf('\n')
    }
  }

  function pushTransportChunk(text) {
    if (!text) return
    transportBuffer += text

    let newlineIndex = transportBuffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = transportBuffer.slice(0, newlineIndex).replace(/\r$/, '')
      transportBuffer = transportBuffer.slice(newlineIndex + 1)
      const generatedText = extractStreamTextChunk(line)
      if (generatedText === '[DONE]') {
        onEvent?.({ type: 'done' })
      } else {
        pushGeneratedText(generatedText)
      }
      newlineIndex = transportBuffer.indexOf('\n')
    }
  }

  function flush() {
    const tail = transportBuffer
    transportBuffer = ''
    if (tail.trim()) {
      pushTransportChunk(`${tail}\n`)
    }

    const remaining = generatedBuffer.replace(/\r$/, '').trim()
    generatedBuffer = ''
    if (remaining) {
      emitGeneratedLine(remaining, onEvent, onError)
    }
  }

  return {
    pushTransportChunk,
    pushGeneratedText,
    flush,
  }
}
