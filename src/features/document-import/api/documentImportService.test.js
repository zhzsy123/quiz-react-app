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
        plainText: '题干文本',
        pages: [{ page: 1, text: '题干文本' }],
        outline: [],
      },
    })

    expect(requestAiJson).toHaveBeenCalledTimes(1)
    expect(result.preview.questionCount).toBe(1)
    expect(result.normalizedDocument.quiz.items).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
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
