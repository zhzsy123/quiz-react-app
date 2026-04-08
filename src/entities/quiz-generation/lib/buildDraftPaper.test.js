import { describe, expect, it } from 'vitest'
import { buildQuizDocumentFromText } from '../../quiz/lib/quizPipeline.js'
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
    expect(draft.items).toBeUndefined()
    expect(draft.scoreBreakdown.paperTotal).toBe(8)
    expect(draft.generation.acceptedCount).toBe(2)
    expect(draft.generation.rejectedCount).toBe(1)
    expect(draft.compatibility.skippedCount).toBe(1)
    expect(draft.questions[0].generation_preview.previewText).toBe('Question 1')
    expect(draft.questions[1].generation_status).toBe('warning')
  })

  it('round-trips generated draft papers through quizPipeline using questions as the primary source', () => {
    const draft = buildDraftPaper({
      subject: 'english',
      title: 'Generated English Draft',
      durationMinutes: 90,
      requestId: 'req-generated-1',
      questionDrafts: [
        {
          status: 'valid',
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Choose the correct conjunction.',
            score: 2,
            options: [
              { key: 'A', text: 'because' },
              { key: 'B', text: 'that' },
              { key: 'C', text: 'for' },
              { key: 'D', text: 'as' },
            ],
            answer: {
              type: 'objective',
              correct: 'B',
              rationale: 'that 引导表语从句。',
            },
          },
        },
      ],
    })

    const normalized = buildQuizDocumentFromText(JSON.stringify(draft))

    expect(normalized.quiz.title).toBe('Generated English Draft')
    expect(normalized.quiz.items).toHaveLength(1)
    expect(normalized.quiz.items[0].type).toBe('single_choice')
    expect(normalized.quiz.items[0].prompt).toBe('Choose the correct conjunction.')
  })
})
