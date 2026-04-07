import { describe, expect, it } from 'vitest'
import { getQuizScoreBreakdown, normalizeQuizPayload, parseQuizText } from './quizSchema'

describe('quizSchema boundary', () => {
  it('keeps compatibility for legacy items payloads', () => {
    const result = normalizeQuizPayload({
      title: 'Legacy quiz',
      items: [
        {
          id: 'q1',
          question: 'Legacy question',
          options: ['A. one', 'B. two'],
          correct_answer: 'B',
          rationale: 'Legacy rationale',
        },
      ],
    })

    expect(result.compatibility.sourceSchema).toBe('legacy_items')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe('single_choice')
  })

  it('parses fenced schema payloads into normalized items', () => {
    const input = `
\`\`\`json
{
  "schema_version": "2026-04",
  "title": "Clean quiz",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "prompt": "What is 2 + 2?",
      "options": ["A. 3", "B. 4"],
      "answer": {
        "correct": "B",
        "rationale": "Basic math"
      }
    }
  ]
}
\`\`\`
`

    const result = parseQuizText(input)

    expect(result.cleanedText.startsWith('{')).toBe(true)
    expect(result.parsed.title).toBe('Clean quiz')
    expect(result.parsed.compatibility.sourceSchema).toBe('2026-04')
    expect(result.parsed.items).toHaveLength(1)
    expect(result.parsed.items[0].options[1]).toEqual({ key: 'B', text: '4' })
  })

  it('normalizes reading and cloze data', () => {
    const result = normalizeQuizPayload({
      schema_version: '2026-04',
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
    expect(result.items[0].questions[0].score).toBe(2.5)
    expect(result.items[1].score).toBe(2)
  })

  it('normalizes multiple choice, true false and fill blank data', () => {
    const result = normalizeQuizPayload({
      schema_version: '2026-04',
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
    expect(result.items[0].score).toBe(2)
    expect(result.items[1].type).toBe('true_false')
    expect(result.items[1].answer.correct).toBe('T')
    expect(result.items[1].score).toBe(2)
    expect(result.items[2].type).toBe('fill_blank')
    expect(result.items[2].blanks[0].accepted_answers).toEqual(['alpha', 'Alpha'])
    expect(result.items[2].score).toBe(2)
  })

  it('accepts translation questions that use prompt plus answer.correct', () => {
    const result = normalizeQuizPayload({
      schema_version: '2026-04',
      title: 'Translation quiz',
      questions: [
        {
          id: 'q_tr_1',
          type: 'translation',
          prompt: 'Translate this sentence into Chinese.',
          answer: {
            type: 'objective',
            correct: '把这句话翻译成中文。',
          },
        },
      ],
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe('translation')
    expect(result.items[0].source_text).toBe('Translate this sentence into Chinese.')
    expect(result.items[0].score).toBe(15)
    expect(result.items[0].answer.reference_answer).toBe('把这句话翻译成中文。')
  })

  it('computes objective, subjective and paper totals', () => {
    const result = normalizeQuizPayload({
      schema_version: '2026-04',
      title: 'English paper',
      questions: [
        {
          id: 'q1',
          type: 'single_choice',
          prompt: 'Single',
          options: ['A. one', 'B. two'],
          answer: {
            correct: 'A',
          },
        },
        {
          id: 'q2',
          type: 'reading',
          prompt: 'Reading',
          passage: {
            title: 'Passage',
            content: 'Content',
          },
          questions: [
            {
              id: 'q2_1',
              type: 'single_choice',
              prompt: 'Sub question',
              options: ['A. one', 'B. two'],
              answer: {
                correct: 'B',
              },
            },
          ],
        },
        {
          id: 'q3',
          type: 'translation',
          prompt: 'Translate',
          answer: {
            correct: '答案',
          },
        },
        {
          id: 'q4',
          type: 'essay',
          prompt: 'Write',
          answer: {},
        },
      ],
    })

    expect(getQuizScoreBreakdown(result.items)).toEqual({
      objectiveTotal: 4.5,
      subjectiveTotal: 45,
      paperTotal: 49.5,
    })
  })

  it('reports invalid payloads at the boundary', () => {
    expect(() => normalizeQuizPayload({ title: 'broken' })).toThrow(/questions/)
  })

  it('accepts the new exam import package for structured subjects', () => {
    const result = normalizeQuizPayload({
      version: '1.0',
      meta: {
        title: '数据结构与数据库专题',
        sourceType: 'ai_generated',
        subjectScope: ['data_structure'],
      },
      questions: [
        {
          id: 'graph_1',
          subject: 'data_structure',
          module: 'graph',
          questionType: 'application',
          answerMode: 'sequence_input',
          content: [
            { type: 'text', value: '写出 DFS 访问序列。' },
            {
              type: 'graph',
              graphType: 'undirected',
              vertices: ['A', 'B', 'C'],
              edges: [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
              ],
            },
          ],
          answerSpec: {
            fields: [
              { key: 'dfs_order', label: 'DFS 序列', separatorHint: '空格分隔' },
            ],
          },
          standardAnswer: {
            type: 'sequence_input',
            fields: {
              dfs_order: ['A', 'B', 'C'],
            },
          },
        },
        {
          id: 'design_1',
          subject: 'database',
          module: 'database_design',
          questionType: 'application',
          answerMode: 'structured_form',
          content: [{ type: 'text', value: '写出实体、联系和关系模式。' }],
          answerSpec: {
            fields: [
              { key: 'entities', label: '实体', fieldType: 'textarea' },
              { key: 'relations', label: '关系模式', fieldType: 'textarea' },
            ],
          },
          standardAnswer: {
            type: 'structured_form',
            fields: {
              entities: 'Student(sno,sname)',
              relations: 'Student(sno PK,sname)',
            },
          },
        },
        {
          id: 'sql_1',
          subject: 'database',
          module: 'sql',
          questionType: 'sql',
          answerMode: 'sql_editor',
          content: [{ type: 'text', value: '写出查询 SQL。' }],
          standardAnswer: {
            type: 'sql',
            sql: 'SELECT * FROM student;',
          },
        },
      ],
    })

    expect(result.compatibility.sourceSchema).toBe('exam-import@1.0')
    expect(result.items).toHaveLength(3)
    expect(result.items[0].type).toBe('fill_blank')
    expect(result.items[0].blanks[0].comparison_mode).toBe('ordered_sequence')
    expect(result.items[0].content_blocks[0].type).toBe('graph')
    expect(result.items[1].type).toBe('structured_form')
    expect(result.items[1].answer.reference_fields.entities).toContain('Student')
    expect(result.items[2].type).toBe('sql')
    expect(result.items[2].answer.reference_answer).toContain('SELECT')
  })
})
