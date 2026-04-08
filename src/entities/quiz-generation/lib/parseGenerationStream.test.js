import { describe, expect, it } from 'vitest'
import { flushGenerationStreamBuffer, parseGenerationStreamChunk } from './parseGenerationStream.js'

describe('parseGenerationStreamChunk', () => {
  it('parses chunked ndjson and keeps incomplete trailing buffer', () => {
    const first = parseGenerationStreamChunk(
      '{"type":"meta","request_id":"r1"}\n{"type":"question","index":1,"question":{"id":"q1"}}',
      '',
      false
    )

    expect(first.events).toEqual([{ type: 'meta', request_id: 'r1' }])
    expect(first.remainingBuffer).toContain('"type":"question"')

    const second = parseGenerationStreamChunk('\n{"type":"done","generated_count":1}\n', first.remainingBuffer, false)
    expect(second.events).toEqual([
      { type: 'question', index: 1, question: { id: 'q1' } },
      { type: 'done', generated_count: 1 },
    ])
    expect(second.remainingBuffer).toBe('')
  })

  it('flushes final buffer when the stream ends without a trailing newline', () => {
    const buffered = '{"type":"warning","message":"ok"}'
    const flushed = flushGenerationStreamBuffer(buffered)

    expect(flushed.events).toEqual([{ type: 'warning', message: 'ok' }])
    expect(flushed.remainingBuffer).toBe('')
  })
})

