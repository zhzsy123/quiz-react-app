import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestAiJson = vi.fn()

vi.mock('../../../shared/api/aiGateway', () => ({
  requestAiJson,
}))

describe('importDocumentWithAi', () => {
  beforeEach(() => {
    requestAiJson.mockReset()
  })

  it('parses document draft through ai and quiz pipeline', async () => {
    const { importDocumentWithAi } = await import('./documentImportService')

    requestAiJson.mockResolvedValue({
      content: {
        schema_version: '2026-04',
        title: '英语模拟卷',
        subject: 'english',
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            prompt: '示例题',
            score: 2,
            options: [
              { key: 'A', text: 'A' },
              { key: 'B', text: 'B' },
              { key: 'C', text: 'C' },
              { key: 'D', text: 'D' },
            ],
            answer: {
              type: 'objective',
              correct: 'A',
              rationale: '解析',
            },
          },
        ],
      },
    })

    const result = await importDocumentWithAi({
      subjectKey: 'english',
      documentDraft: {
        fileName: 'paper.pdf',
        sourceType: 'pdf',
        plainText: '普通题干文本',
        pages: [{ page: 1, text: '普通题干文本' }],
        outline: [],
      },
    })

    expect(requestAiJson).toHaveBeenCalledTimes(1)
    expect(result.preview.questionCount).toBe(1)
    expect(result.normalizedDocument.quiz.items).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('splits english document into sections and parses them in parallel', async () => {
    const { importDocumentWithAi } = await import('./documentImportService')

    requestAiJson.mockImplementation(async ({ title }) => {
      if (title.includes('单项选择')) {
        return {
          content: {
            questions: [
              {
                id: 'q1',
                type: 'single_choice',
                prompt: 'Choose the best answer.',
                score: 2,
                options: [
                  { key: 'A', text: 'A' },
                  { key: 'B', text: 'B' },
                  { key: 'C', text: 'C' },
                  { key: 'D', text: 'D' },
                ],
                answer: { type: 'objective', correct: 'A', rationale: '解析' },
              },
            ],
          },
        }
      }

      if (title.includes('完形填空')) {
        return {
          content: {
            questions: [
              {
                id: 'cloze_1',
                type: 'cloze',
                prompt: 'Read the passage and choose the best answers.',
                score: 4,
                article: 'This is [[1]] and [[2]].',
                blanks: [
                  {
                    blank_id: 1,
                    score: 2,
                    options: [
                      { key: 'A', text: 'a' },
                      { key: 'B', text: 'b' },
                      { key: 'C', text: 'c' },
                      { key: 'D', text: 'd' },
                    ],
                    correct: 'A',
                    rationale: '解析',
                  },
                  {
                    blank_id: 2,
                    score: 2,
                    options: [
                      { key: 'A', text: 'a' },
                      { key: 'B', text: 'b' },
                      { key: 'C', text: 'c' },
                      { key: 'D', text: 'd' },
                    ],
                    correct: 'B',
                    rationale: '解析',
                  },
                ],
              },
            ],
          },
        }
      }

      if (title.includes('阅读 A')) {
        return {
          content: {
            questions: [
              {
                id: 'reading_a',
                type: 'reading',
                prompt: 'Read Passage A and answer the questions.',
                score: 2,
                passage: {
                  label: 'A',
                  title: 'Passage A',
                  content: 'Passage A content',
                },
                questions: [
                  {
                    id: 'A-1',
                    type: 'single_choice',
                    prompt: 'Question A-1',
                    score: 2,
                    options: [
                      { key: 'A', text: 'A' },
                      { key: 'B', text: 'B' },
                      { key: 'C', text: 'C' },
                      { key: 'D', text: 'D' },
                    ],
                    answer: { type: 'objective', correct: 'B', rationale: '解析' },
                  },
                ],
              },
            ],
          },
        }
      }

      if (title.includes('翻译')) {
        return {
          content: {
            questions: [
              {
                id: 'translation_1',
                type: 'translation',
                prompt: 'Translate into Chinese.',
                score: 10,
                direction: 'en_to_zh',
                context: 'Knowledge is power.',
                answer: {
                  type: 'subjective',
                  reference_answer: '知识就是力量。',
                  scoring_points: ['语义准确'],
                },
              },
            ],
          },
        }
      }

      return {
        content: {
          questions: [
            {
              id: 'essay_1',
              type: 'essay',
              prompt: 'Write an essay.',
              score: 15,
              answer: {
                type: 'subjective',
                reference_answer: '参考范文',
                scoring_points: ['切题', '结构完整'],
              },
            },
          ],
        },
      }
    })

    const result = await importDocumentWithAi({
      subjectKey: 'english',
      documentDraft: {
        fileName: 'paper.pdf',
        sourceType: 'pdf',
        plainText: `
Part I Grammar and Vocabulary
1. Choose the best answer.

Part II Cloze
Read the passage and choose the best answer for each blank.

Part III Reading Comprehension
Passage A
Read Passage A and answer the questions.

Part IV Translation
Translate the following sentence.

Part V Writing
Write an essay.
        `,
      },
    })

    expect(requestAiJson).toHaveBeenCalledTimes(5)
    expect(result.preview.questionCount).toBe(5)
    expect(result.warnings.some((item) => item.includes('section 并发解析'))).toBe(true)
    expect(result.normalizedDocument.quiz.items).toHaveLength(5)
  })

  it('wraps ai failures with calling_ai stage', async () => {
    const { importDocumentWithAi } = await import('./documentImportService')
    requestAiJson.mockRejectedValue(new Error('余额不足'))

    await expect(
      importDocumentWithAi({
        subjectKey: 'english',
        documentDraft: {
          fileName: 'paper.pdf',
          sourceType: 'pdf',
          plainText: '题干文本',
        },
      })
    ).rejects.toMatchObject({
      failedStage: 'calling_ai',
    })
  })

  it('wraps validation failures with validating stage', async () => {
    const { importDocumentWithAi } = await import('./documentImportService')
    requestAiJson.mockResolvedValue({
      content: {
        title: '坏结构',
        subject: 'english',
      },
    })

    await expect(
      importDocumentWithAi({
        subjectKey: 'english',
        documentDraft: {
          fileName: 'paper.pdf',
          sourceType: 'pdf',
          plainText: '题干文本',
        },
      })
    ).rejects.toMatchObject({
      failedStage: 'validating',
    })
  })
})
