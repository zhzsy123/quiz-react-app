import { createDocumentImportError } from '../../entities/document-import/lib/documentImportContracts'

const DEFAULT_MIN_NON_WHITESPACE_CHARACTERS = 80
const DEFAULT_MIN_LINES = 3

export function assessDocumentTextGate(documentDraft, options = {}) {
  const minChars = Number(options.minNonWhitespaceCharacters) || DEFAULT_MIN_NON_WHITESPACE_CHARACTERS
  const minLines = Number(options.minLines) || DEFAULT_MIN_LINES
  const plainText = String(documentDraft?.plainText || '')
  const nonWhitespaceText = plainText.replace(/\s/g, '')
  const reasons = []
  const hints = []
  const sourceType = String(documentDraft?.sourceType || '').toLowerCase()
  const pageCount = Number(documentDraft?.stats?.pageCount) || 0
  const pagesWithTextCount = Number(documentDraft?.stats?.pagesWithTextCount) || 0

  if (!plainText.trim()) {
    reasons.push('未提取到任何文本内容。')
  }

  if (nonWhitespaceText.length < minChars) {
    reasons.push(`提取到的有效文本过短，少于 ${minChars} 个非空白字符。`)
  }

  const lineCount = Number(documentDraft?.stats?.lineCount) || 0
  if (lineCount < minLines) {
    reasons.push(`提取到的有效文本行数不足，少于 ${minLines} 行。`)
  }

  const looksLikeScannedPdf =
    sourceType === 'pdf' &&
    pageCount > 0 &&
    (pagesWithTextCount === 0 ||
      (nonWhitespaceText.length < minChars && pagesWithTextCount <= Math.max(1, Math.ceil(pageCount / 3))))

  if (looksLikeScannedPdf) {
    reasons.unshift('当前 PDF 疑似扫描件或图片 PDF，需要先尝试 OCR 才能继续解析。')
    hints.push('系统会先尝试 OCR；如果结果仍然很差，建议换用带文本层的 PDF，或先做 OCR 后再导入。')
  }

  return {
    isUsable: reasons.length === 0,
    reasons,
    hints,
    stats: {
      characterCount: Number(documentDraft?.stats?.characterCount) || 0,
      nonWhitespaceCharacterCount: nonWhitespaceText.length,
      lineCount,
      pageCount,
      pagesWithTextCount,
      paragraphCount: Number(documentDraft?.stats?.paragraphCount) || 0,
    },
  }
}

export function assertDocumentTextGate(documentDraft, options = {}) {
  const gate = assessDocumentTextGate(documentDraft, options)
  if (!gate.isUsable) {
    throw createDocumentImportError(
      'extracting_text',
      gate.reasons[0] || '当前文档未提取到可供解析的有效文本。',
      { reasons: gate.reasons, hints: gate.hints, stats: gate.stats }
    )
  }

  return gate
}
