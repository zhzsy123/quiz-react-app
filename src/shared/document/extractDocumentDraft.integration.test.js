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

vi.mock('./pdf/extractPdfTextWithOcr', () => ({
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

describe('extractDocumentDraft integration', () => {
  beforeEach(() => {
    vi.resetModules()
    getDocument.mockReset()
    extractPdfTextWithOcr.mockReset()
  })

  it('runs through the real pdf extraction chain before invoking OCR fallback', async () => {
    const { extractDocumentDraft } = await import('./extractDocumentDraft')
    const mockPdf = createMockPdf(['', ''])
    getDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) })
    extractPdfTextWithOcr.mockResolvedValue({
      documentDraft: {
        fileName: 'ocr.pdf',
        plainText:
          '这是 OCR 恢复出的足够长文本，用于验证 extractDocumentDraft 会穿过真实的 PDF 提取链后，再回退到 OCR，并最终通过文本门禁。\n这里补充第二行内容，确保非空白字符数量足够。\n这里补充第三行内容，避免再次触发过短文本错误。',
        stats: {
          lineCount: 3,
          pageCount: 2,
          pagesWithTextCount: 2,
          paragraphCount: 0,
          characterCount: 104,
        },
        ocrUsed: true,
      },
      gate: {
        isUsable: true,
      },
      warnings: ['已启用 OCR 识别扫描件 PDF，文本结果可能受图片清晰度和版式影响。'],
    })

    const result = await extractDocumentDraft(
      {
        name: 'ocr.pdf',
        type: 'application/pdf',
        arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
      },
      { subject: 'english' }
    )

    expect(getDocument).toHaveBeenCalledTimes(1)
    expect(extractPdfTextWithOcr).toHaveBeenCalledTimes(1)
    expect(result.documentKind).toBe('pdf')
    expect(result.documentDraft.ocrUsed).toBe(true)
    expect(result.warnings[0]).toContain('已启用 OCR')
  })
})
