import { describe, expect, it } from 'vitest'
import { buildDraftPaper } from './buildDraftPaper.js'

describe('buildDraftPaper', () => {
  it('keeps usable questions and summarizes scores', () => {
    const draft = buildDraftPaper({
      subject: 'data_structure',
      title: 'AI draft',
      durationMinutes: 90,
      requestId: 'req-1',
      questionDrafts: [
        {
          status: 'valid',
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Question 1',
            score: 2,
            answer: {
              type: 'objective',
              correct: 'A',
              rationale: 'Because A.',
            },
          },
        },
        {
          status: 'warning',
          normalizedQuestion: {
            id: 'q2',
            type: 'calculation',
            prompt: 'Question 2',
            score: 6,
            answer: {
              type: 'subjective',
              reference_answer: 'Reference',
              scoring_points: ['Point 1', 'Point 2'],
            },
          },
          warnings: ['needs review'],
        },
        {
          status: 'invalid',
          rawQuestion: { id: 'q3', type: 'unknown' },
        },
      ],
    })

    expect(draft.subject).toBe('data_structure')
    expect(draft.title).toBe('AI draft')
    expect(draft.duration_minutes).toBe(90)
    expect(draft.questions).toHaveLength(2)
    expect(draft.items).toHaveLength(2)
    expect(draft.scoreBreakdown.paperTotal).toBe(8)
    expect(draft.generation.acceptedCount).toBe(2)
    expect(draft.generation.rejectedCount).toBe(1)
    expect(draft.compatibility.skippedCount).toBe(1)
    expect(draft.questions[0].generation_preview.previewText).toBe('Question 1')
    expect(draft.questions[1].generation_status).toBe('warning')
  })
})

