import { describe, expect, it } from 'vitest'
import { assessDocumentTextGate } from './textGate'

describe('assessDocumentTextGate', () => {
  it('rejects empty text', () => {
    const gate = assessDocumentTextGate({
      plainText: '',
      stats: {
        lineCount: 0,
      },
    })

    expect(gate.isUsable).toBe(false)
    expect(gate.reasons[0]).toContain('未提取到任何文本')
  })

  it('rejects short text', () => {
    const gate = assessDocumentTextGate({
      plainText: '短文本',
      stats: {
        lineCount: 1,
      },
    })

    expect(gate.isUsable).toBe(false)
    expect(gate.reasons.some((reason) => reason.includes('有效文本过短'))).toBe(true)
  })

  it('detects scanned-like pdf files and gives ocr guidance', () => {
    const gate = assessDocumentTextGate({
      sourceType: 'pdf',
      plainText: ' ',
      stats: {
        lineCount: 0,
        pageCount: 3,
        pagesWithTextCount: 0,
      },
    })

    expect(gate.isUsable).toBe(false)
    expect(gate.reasons[0]).toContain('暂不支持 OCR')
    expect(gate.hints[0]).toContain('优先拦截扫描件')
  })

  it('accepts usable extracted text', () => {
    const gate = assessDocumentTextGate({
      plainText:
        '这是一份具有足够长度的可解析文本。\n它包含多行内容，用于模拟 PDF 或 DOCX 中提取出的试卷正文。\n这里继续补充一些句子，确保文本长度达到门槛。',
      stats: {
        lineCount: 3,
      },
    }, {
      minNonWhitespaceCharacters: 40,
      minLines: 3,
    })

    expect(gate.isUsable).toBe(true)
    expect(gate.reasons).toHaveLength(0)
  })
})
