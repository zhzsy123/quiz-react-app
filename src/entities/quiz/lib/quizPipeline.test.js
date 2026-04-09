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

  it('keeps objective questions without standard answers as ungradable instead of dropping them', () => {
    const result = buildQuizDocumentFromText(`{
      "schema_version": "2026-04",
      "title": "English import",
      "subject": "english",
      "questions": [
        {
          "id": "q1",
          "type": "single_choice",
          "prompt": "Choose one",
          "score": 2,
          "options": [
            { "key": "A", "text": "one" },
            { "key": "B", "text": "two" }
          ]
        },
        {
          "id": "reading_1",
          "type": "reading",
          "passage": {
            "title": "Passage 1",
            "content": "A short passage."
          },
          "questions": [
            {
              "id": "reading_1_q1",
              "type": "single_choice",
              "prompt": "Question 1",
              "score": 2,
              "options": [
                { "key": "A", "text": "one" },
                { "key": "B", "text": "two" }
              ]
            }
          ]
        },
        {
          "id": "translation_1",
          "type": "translation",
          "prompt": "Translate the following paragraph.",
          "context": "This is the source paragraph."
        },
        {
          "id": "essay_1",
          "type": "essay",
          "prompt": "Write an essay.",
          "answer": {
            "type": "subjective",
            "scoring_points": ["切题", "结构完整"]
          }
        }
      ]
    }`)

    expect(result.quiz.items).toHaveLength(4)
    expect(result.validation.warnings).toEqual(
      expect.arrayContaining([
        'q1 缺少标准答案，导入后可以展示和作答，但暂时无法自动判分。',
        'reading_1 中至少有一个小题缺少标准答案，导入后可以展示和作答，但暂时无法自动判分。',
      ])
    )

    expect(result.quiz.items[0]).toEqual(
      expect.objectContaining({
        type: 'single_choice',
        answer: expect.objectContaining({
          correct: '',
          is_gradable: false,
          missing_answer: true,
        }),
      })
    )

    expect(result.quiz.items[1]).toEqual(
      expect.objectContaining({
        type: 'reading',
        questions: [
          expect.objectContaining({
            answer: expect.objectContaining({
              correct: '',
              is_gradable: false,
              missing_answer: true,
            }),
          }),
        ],
      })
    )

    expect(result.quiz.items[2]).toEqual(
      expect.objectContaining({
        type: 'translation',
        source_text: 'This is the source paragraph.',
      })
    )

    expect(result.quiz.items[3]).toEqual(
      expect.objectContaining({
        type: 'essay',
        answer: expect.objectContaining({
          scoring_points: ['切题', '结构完整'],
        }),
      })
    )
  })
})
