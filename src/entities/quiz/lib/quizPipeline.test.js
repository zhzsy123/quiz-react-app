import { describe, expect, it } from 'vitest'
import { buildQuizDocumentFromText, parseQuizJsonText, validateQuizPayload } from './quizPipeline'

describe('quizPipeline', () => {
  it('validates top-level payload shape before normalization', () => {
    const result = validateQuizPayload({ title: 'Broken payload' })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('题库必须包含 questions 或 items 数组。')
  })

  it('parses quiz json text and trims fenced wrappers', () => {
    const result = parseQuizJsonText('```json\n{"title":"Demo","questions":[]}\n```')

    expect(result.cleanedText).toBe('{"title":"Demo","questions":[]}')
    expect(result.payload.title).toBe('Demo')
  })

  it('builds a normalized quiz document with validation and score summary', () => {
    const result = buildQuizDocumentFromText(`{
      "schema_version": "2026-04",
      "title": "Pipeline quiz",
      "subject": "english",
      "questions": [
        {
          "id": "q1",
          "type": "single_choice",
          "prompt": "Choose one",
          "options": ["A. one", "B. two"],
          "answer": { "correct": "B" }
        },
        {
          "id": "q2",
          "type": "translation",
          "prompt": "Translate",
          "answer": { "correct": "翻译答案" }
        }
      ]
    }`)

    expect(result.validation.isValid).toBe(true)
    expect(result.validation.sourceSchema).toBe('2026-04')
    expect(result.quiz.items).toHaveLength(2)
    expect(result.scoreBreakdown).toEqual({
      objectiveTotal: 2,
      subjectiveTotal: 15,
      paperTotal: 17,
    })
  })
})
