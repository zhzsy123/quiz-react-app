import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { getPreferenceMock } = vi.hoisted(() => ({
  getPreferenceMock: vi.fn(),
}))

vi.mock('../../../shared/lib/preferences/preferenceRepository', () => ({
  getPreference: getPreferenceMock,
  setPreference: vi.fn(),
}))

import { callDeepSeekStream } from '../../../shared/api/deepseekClient'

beforeEach(() => {
  getPreferenceMock.mockImplementation((key, fallback) => {
    if (key === 'ai:deepseekApiKey') return 'test-key'
    if (key === 'ai:deepseekBaseUrl') return 'https://api.deepseek.com'
    if (key === 'ai:deepseekModel') return 'deepseek-chat'
    return fallback
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function createStreamResponse(chunks) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  })
}

describe('deepseek stream client', () => {
  it('parses streamed NDJSON events from SSE chunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"{\\"type\\":\\"meta\\",\\"requestId\\":\\"g1\\",\\"subject\\":\\"english\\"}\\n{\\"type\\":\\"question\\",\\"index\\":1,\\"question\\":{\\"id\\":\\"q1\\",\\"type\\":\\"single_choice\\",\\"prompt\\":\\"Q1\\",\\"score\\":2,\\"options\\":[{\\"key\\":\\"A\\",\\"text\\":\\"A\\"}],\\"answer\\":{\\"type\\":\\"objective\\",\\"correct\\":\\"A\\"}}}\\n"}}]}\n',
        'data: {"choices":[{"delta":{"content":"{\\"type\\":\\"done\\",\\"generated_count\\":1}\\n"}}]}\n',
        'data: [DONE]\n',
      ])
    )

    vi.stubGlobal('fetch', fetchMock)

    const events = []
    const result = await callDeepSeekStream({
      systemPrompt: 'system',
      userPrompt: 'user',
      onEvent: (event) => events.push(event),
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(events.map((event) => event.type)).toEqual(['meta', 'question', 'done', 'done'])
    expect(result.events).toHaveLength(4)
    expect(result.events[1].type).toBe('question')
  })

  it('parses pretty-printed multi-line JSON objects from streamed content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"{\\n  \\"type\\": \\"meta\\",\\n  \\"request_id\\": \\"g2\\",\\n  \\"subject\\": \\"english\\"\\n}\\n{\\n  \\"type\\": \\"question\\",\\n  \\"index\\": 1,\\n  \\"question\\": {\\n    \\"id\\": \\"q1\\",\\n    \\"type\\": \\"single_choice\\",\\n    \\"prompt\\": \\"Q1\\",\\n    \\"score\\": 2,\\n    \\"options\\": [{\\"key\\": \\"A\\", \\"text\\": \\"A\\"}],\\n    \\"answer\\": {\\"type\\": \\"objective\\", \\"correct\\": \\"A\\"}\\n  }\\n}\\n"}}]}\n',
        'data: {"choices":[{"delta":{"content":"{\\n  \\"type\\": \\"done\\",\\n  \\"generated_count\\": 1\\n}\\n"}}]}\n',
        'data: [DONE]\n',
      ])
    )

    vi.stubGlobal('fetch', fetchMock)

    const events = []
    const errors = []
    const result = await callDeepSeekStream({
      systemPrompt: 'system',
      userPrompt: 'user',
      onEvent: (event) => events.push(event),
      onError: (error) => errors.push(error),
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errors).toHaveLength(0)
    expect(events.map((event) => event.type)).toEqual(['meta', 'question', 'done', 'done'])
    expect(result.events[1].question.prompt).toBe('Q1')
  })
})
