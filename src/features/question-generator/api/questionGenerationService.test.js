import { describe, expect, it, vi } from 'vitest'

const { requestAiStreamMock } = vi.hoisted(() => ({
  requestAiStreamMock: vi.fn(),
}))

vi.mock('../../../shared/api/aiGateway', () => ({
  requestAiStream: requestAiStreamMock,
}))

import { buildDraftPaper, startQuestionGeneration } from './questionGenerationService'

describe('questionGenerationService', () => {
  it('builds a draft paper from generated questions', () => {
    const draftPaper = buildDraftPaper({
      config: {
        subject: 'data_structure',
        subjectLabel: '数据结构',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        extraPrompt: 'focus on heap sort',
        durationMinutes: 90,
      },
      requestId: 'gen_001',
      meta: {
        paperTitle: 'Heap sort draft',
      },
      draftQuestions: [
        {
          status: 'valid',
          rawQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            options: [
              { key: 'A', text: 'A' },
              { key: 'B', text: 'B' },
            ],
            answer: { type: 'objective', correct: 'A' },
          },
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            answer: { type: 'objective', correct: 'A' },
          },
        },
        {
          status: 'warning',
          rawQuestion: {
            id: 'q2',
            type: 'essay',
            prompt: 'Q2',
            score: 6,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
          normalizedQuestion: {
            id: 'q2',
            type: 'essay',
            prompt: 'Q2',
            score: 6,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
        },
      ],
    })

    expect(draftPaper.paper_id).toBe('gen_001')
    expect(draftPaper.questions).toHaveLength(2)
    expect(draftPaper.scoreBreakdown.totalScore).toBe(8)
    expect(draftPaper.scoreBreakdown.objectiveScore).toBe(2)
    expect(draftPaper.scoreBreakdown.subjectiveScore).toBe(6)
  })

  it('streams generation events and returns a normalized draft paper', async () => {
    requestAiStreamMock.mockImplementation(async ({ onEvent }) => {
      onEvent({
        type: 'meta',
        request_id: 'gen_002',
        subject: 'data_structure',
        paper_title: 'Draft paper',
      })

      onEvent({
        type: 'question',
        index: 1,
        question: {
          id: 'q1',
          type: 'single_choice',
          prompt: 'Which one is correct?',
          score: 2,
          options: [
            { key: 'A', text: 'Wrong' },
            { key: 'B', text: 'Right' },
          ],
          answer: {
            type: 'objective',
            correct: 'B',
            rationale: 'B is correct.',
          },
        },
      })

      onEvent({
        type: 'warning',
        index: 1,
        message: 'question is short',
      })

      onEvent({
        type: 'done',
        generated_count: 1,
      })

      return {
        model: 'deepseek-chat',
        events: [],
      }
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'data_structure',
        subjectLabel: '数据结构',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['single_choice'],
        extraPrompt: 'make it concise',
        paperTitle: 'Draft paper',
      },
      provider: 'deepseek',
    })

    expect(requestAiStreamMock).toHaveBeenCalledTimes(1)
    const request = requestAiStreamMock.mock.calls[0][0]
    expect(request.systemPrompt).toContain('NDJSON')
    expect(request.userPrompt).toContain('"subject": "data_structure"')
    expect(request.userPrompt).toContain('"allowed_question_types": [')

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toMatch(/valid|warning/)
    expect(result.draftPaper.questions).toHaveLength(1)
    expect(result.draftPaper.paper_id).toBe(result.requestId)
  })
})
