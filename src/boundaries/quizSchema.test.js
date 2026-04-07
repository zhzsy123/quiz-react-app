import { describe, expect, it } from 'vitest'
import { normalizeQuizPayload, parseQuizText } from './quizSchema'

describe('quizSchema boundary', () => {
  it('parses fenced legacy payloads into normalized items', () => {
    const input = `
\`\`\`json
{
  "title": "Legacy quiz",
  "items": [
    {
      "id": "q1",
      "question": "What is 2 + 2?",
      "options": ["A. 3", "B. 4"],
      "correct_answer": "B",
      "rationale": "Basic math"
    }
  ]
}
\`\`\`
`

    const result = parseQuizText(input)

    expect(result.cleanedText.startsWith('{')).toBe(true)
    expect(result.parsed.title).toBe('Legacy quiz')
    expect(result.parsed.compatibility.sourceSchema).toBe('legacy_items')
    expect(result.parsed.items).toHaveLength(1)
    expect(result.parsed.items[0].options[1]).toEqual({ key: 'B', text: '4' })
  })

  it('normalizes schema v1 reading and cloze data', () => {
    const result = normalizeQuizPayload({
      schema_version: '1.0',
      title: 'Schema quiz',
      questions: [
        {
          id: 'reading_1',
          type: 'reading',
          prompt: 'Read and answer',
          passage: {
            title: 'Passage',
            content: 'Body',
          },
          questions: [
            {
              id: 'reading_1_q1',
              type: 'single_choice',
              prompt: 'Pick one',
              options: [{ key: 'A', text: 'Yes' }, { key: 'B', text: 'No' }],
              answer: {
                correct: 'A',
                rationale: 'Because',
              },
            },
          ],
        },
        {
          id: 'cloze_1',
          type: 'cloze',
          title: 'Cloze',
          prompt: 'Fill blank',
          article: 'Hello [[1]] world',
          blanks: [
            {
              blank_id: 1,
              options: [{ key: 'A', text: 'big' }, { key: 'B', text: 'small' }],
              correct: 'A',
            },
          ],
        },
      ],
    })

    expect(result.items).toHaveLength(2)
    expect(result.items[0].type).toBe('reading')
    expect(result.items[1].type).toBe('single_choice')
    expect(result.items[1].context).toContain('____(1)____')
    expect(result.compatibility.supportedCount).toBe(2)
  })

  it('normalizes multiple choice, true false and fill blank data', () => {
    const result = normalizeQuizPayload({
      schema_version: '2.0',
      title: 'Objective quiz',
      questions: [
        {
          id: 'q_mc_1',
          type: 'multiple_choice',
          prompt: 'Pick all',
          options: [{ key: 'A', text: 'One' }, { key: 'B', text: 'Two' }],
          answer: {
            correct: ['B', 'A'],
          },
        },
        {
          id: 'q_tf_1',
          type: 'true_false',
          prompt: 'True or false',
          answer: {
            correct: true,
          },
        },
        {
          id: 'q_fb_1',
          type: 'fill_blank',
          prompt: 'Fill',
          blanks: [
            {
              blank_id: 1,
              accepted_answers: ['alpha', 'Alpha'],
            },
          ],
          answer: {
            type: 'objective',
          },
        },
      ],
    })

    expect(result.items).toHaveLength(3)
    expect(result.items[0].type).toBe('multiple_choice')
    expect(result.items[0].answer.correct).toEqual(['A', 'B'])
    expect(result.items[1].type).toBe('true_false')
    expect(result.items[1].answer.correct).toBe('T')
    expect(result.items[2].type).toBe('fill_blank')
    expect(result.items[2].blanks[0].accepted_answers).toEqual(['alpha', 'Alpha'])
  })

  it('reports invalid payloads at the boundary', () => {
    expect(() => normalizeQuizPayload({ title: 'broken' })).toThrow(/questions|items/)
  })
})
