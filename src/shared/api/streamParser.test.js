import { describe, expect, it, vi } from 'vitest'

import { createNdjsonStreamParser } from './streamParser'

describe('streamParser', () => {
  it('accepts plain json lines without sse data prefix', () => {
    const events = []
    const errors = []

    const parser = createNdjsonStreamParser({
      onEvent: (event) => events.push(event),
      onError: (error) => errors.push(error),
    })

    parser.pushTransportChunk('{"type":"meta","request_id":"g1","subject":"english"}\n')
    parser.pushTransportChunk('{"type":"question","index":1,"question":{"id":"q1","type":"single_choice","prompt":"Q1","score":2,"options":[{"key":"A","text":"A"}],"answer":{"type":"objective","correct":"A"}}}\n')
    parser.flush()

    expect(errors).toHaveLength(0)
    expect(events.map((event) => event.type)).toEqual(['meta', 'question', 'done'])
    expect(events[1].question.prompt).toBe('Q1')
  })
})
