import { beforeEach, describe, expect, it, vi } from 'vitest'

const extractPdfText = vi.fn()
const extractDocxText = vi.fn()

vi.mock('./pdf/extractPdfText', () => ({
  extractPdfText,
}))

vi.mock('./docx/extractDocxText', () => ({
  extractDocxText,
}))

describe('extractDocumentDraft', () => {
  beforeEach(() => {
    extractPdfText.mockReset()
    extractDocxText.mockReset()
  })

  it('routes pdf files to the pdf extractor', async () => {
    const { extractDocumentDraft } = await import('./extractDocumentDraft')

    extractPdfText.mockResolvedValue({
      documentDraft: {
        plainText:
          '这是一份具有足够长度的可解析文本。\n它包含多行内容，用于模拟 PDF 或 DOCX 中提取出的试卷正文。\n这里继续补充一些句子，确保文本长度达到门槛。',
        stats: { lineCount: 3 },
      },
      gate: {
        isUsable: true,
      },
      warnings: [],
    })

    const result = await extractDocumentDraft(
      {
        name: 'paper.pdf',
        type: 'application/pdf',
        arrayBuffer: vi.fn(),
      },
      {
        subject: 'english',
        gateOptions: {
          minNonWhitespaceCharacters: 40,
          minLines: 1,
        },
      }
    )

    expect(extractPdfText).toHaveBeenCalledTimes(1)
    expect(result.documentKind).toBe('pdf')
  })

  it('routes docx files to the docx extractor', async () => {
    const { extractDocumentDraft } = await import('./extractDocumentDraft')

    extractDocxText.mockResolvedValue({
      documentDraft: {
        plainText:
          '这是一份具有足够长度的可解析文本。\n它包含多行内容，用于模拟 PDF 或 DOCX 中提取出的试卷正文。\n这里继续补充一些句子，确保文本长度达到门槛。',
        stats: { lineCount: 3 },
      },
      gate: {
        isUsable: true,
      },
      warnings: [],
    })

    const result = await extractDocumentDraft(
      {
        name: 'paper.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        arrayBuffer: vi.fn(),
      },
      {
        subject: 'english',
        gateOptions: {
          minNonWhitespaceCharacters: 40,
          minLines: 1,
        },
      }
    )

    expect(extractDocxText).toHaveBeenCalledTimes(1)
    expect(result.documentKind).toBe('docx')
  })
})
