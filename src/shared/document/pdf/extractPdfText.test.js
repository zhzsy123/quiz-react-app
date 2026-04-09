import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocument = vi.fn()
const extractPdfTextWithOcr = vi.fn()

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {},
  getDocument,
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker.js',
}))

vi.mock('./extractPdfTextWithOcr', () => ({
  extractPdfTextWithOcr,
}))

function createMockPdf(textByPage = []) {
  return {
    numPages: textByPage.length,
    getPage: vi.fn(async (pageNumber) => ({
      getTextContent: vi.fn(async () => ({
        items: [{ str: textByPage[pageNumber - 1] || '' }],
      })),
    })),
  }
}

describe('extractPdfText', () => {
  beforeEach(() => {
    getDocument.mockReset()
    extractPdfTextWithOcr.mockReset()
  })

  it('uses OCR fallback when text layer is unusable', async () => {
    const { extractPdfText } = await import('./extractPdfText')
    const mockPdf = createMockPdf(['', ''])
    getDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) })
    extractPdfTextWithOcr.mockResolvedValue({
      documentDraft: {
        plainText: '这是 OCR 后提取出的足够长的文本。\n包含第二行。\n包含第三行。',
        stats: {
          lineCount: 3,
          pageCount: 2,
          pagesWithTextCount: 2,
          paragraphCount: 0,
        },
        ocrUsed: true,
      },
      gate: {
        isUsable: true,
      },
      warnings: ['已启用 OCR 识别扫描件 PDF，文本结果可能受图片清晰度和版式影响。'],
    })

    const result = await extractPdfText(
      {
        name: 'scan.pdf',
        type: 'application/pdf',
        arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      },
      { subject: 'english' }
    )

    expect(extractPdfTextWithOcr).toHaveBeenCalledTimes(1)
    expect(result.documentDraft.ocrUsed).toBe(true)
    expect(result.warnings[0]).toContain('已启用 OCR')
  })

  it('throws a clear error when OCR still cannot recover enough text', async () => {
    const { extractPdfText } = await import('./extractPdfText')
    const mockPdf = createMockPdf(['', ''])
    getDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) })
    extractPdfTextWithOcr.mockResolvedValue({
      documentDraft: {
        plainText: '短',
        stats: {
          lineCount: 1,
          pageCount: 2,
          pagesWithTextCount: 1,
          paragraphCount: 0,
        },
        ocrUsed: true,
      },
      gate: {
        isUsable: false,
        reasons: ['提取到的有效文本过短。'],
      },
      warnings: ['已启用 OCR 识别扫描件 PDF，文本结果可能受图片清晰度和版式影响。'],
    })

    await expect(
      extractPdfText(
        {
          name: 'bad-scan.pdf',
          type: 'application/pdf',
          arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
        },
        { subject: 'english' }
      )
    ).rejects.toMatchObject({
      failedStage: 'extracting_text',
      message: expect.stringContaining('已尝试 OCR'),
    })
  })
})
