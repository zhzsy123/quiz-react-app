import { describe, expect, it } from 'vitest'
import { buildDocumentDraft } from './buildDocumentDraft'

describe('buildDocumentDraft', () => {
  it('normalizes pages and derives stats', () => {
    const draft = buildDocumentDraft({
      fileName: 'paper.pdf',
      mimeType: 'application/pdf',
      subject: 'english',
      sourceType: 'pdf',
      pages: [
        { page: 1, text: ' 第一页文本 \r\n\r\n第二行 ' },
        { page: 2, text: '第二页文本' },
      ],
    })

    expect(draft.fileName).toBe('paper.pdf')
    expect(draft.pages).toHaveLength(2)
    expect(draft.plainText).toContain('第一页文本')
    expect(draft.stats.pageCount).toBe(2)
    expect(draft.stats.pagesWithTextCount).toBe(2)
    expect(draft.stats.nonWhitespaceCharacterCount).toBeGreaterThan(0)
  })

  it('prefers explicit plain text when provided', () => {
    const draft = buildDocumentDraft({
      fileName: 'paper.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      subject: 'english',
      sourceType: 'docx',
      paragraphs: [{ index: 0, text: '段落一' }],
      plainText: '显式全文',
    })

    expect(draft.plainText).toBe('显式全文')
    expect(draft.stats.paragraphCount).toBe(1)
  })
})
