import { createEmptyDocumentDraft } from '../../entities/document-import/lib/documentImportContracts'

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizePage(page, fallbackIndex = 0) {
  const text = normalizeText(page?.text)
  return {
    page: Number(page?.page) || fallbackIndex + 1,
    text,
  }
}

function normalizeParagraph(paragraph, fallbackIndex = 0) {
  const text = normalizeText(paragraph?.text)
  return {
    page: Number(paragraph?.page) || null,
    index: Number(paragraph?.index) || fallbackIndex,
    text,
  }
}

function buildOutline(pages, paragraphs) {
  const candidates = []
  const pushCandidate = (item, source) => {
    const text = normalizeText(item?.text)
    if (!text || text.length > 64) return
    if (/^[\W_]+$/.test(text)) return
    if (/[。！？!?]$/.test(text) && text.length > 24) return
    candidates.push({
      source,
      page: Number(item?.page) || null,
      text,
    })
  }

  pages.forEach((page) => pushCandidate(page, 'page'))
  paragraphs.forEach((paragraph) => pushCandidate(paragraph, 'paragraph'))
  return candidates.slice(0, 12)
}

function countLines(text) {
  if (!text) return 0
  return text.split('\n').filter(Boolean).length
}

function countPagesWithText(pages = []) {
  return pages.filter((page) => String(page?.text || '').trim()).length
}

export function buildDocumentDraft({
  fileName,
  mimeType,
  subject,
  sourceType,
  pages = [],
  paragraphs = [],
  plainText = '',
}) {
  const normalizedPages = pages.map(normalizePage).filter((page) => page.text)
  const normalizedParagraphs = paragraphs.map(normalizeParagraph).filter((paragraph) => paragraph.text)

  const mergedText = normalizeText(
    plainText || normalizedPages.map((page) => page.text).join('\n\n') || normalizedParagraphs.map((item) => item.text).join('\n\n')
  )

  const outline = buildOutline(normalizedPages, normalizedParagraphs)
  const nonWhitespaceCharacterCount = mergedText.replace(/\s/g, '').length

  return {
    ...createEmptyDocumentDraft(),
    fileName: fileName || '',
    mimeType: mimeType || '',
    subject: subject || '',
    sourceType: sourceType || '',
    plainText: mergedText,
    pages: normalizedPages,
    paragraphs: normalizedParagraphs,
    outline,
    stats: {
      pageCount: normalizedPages.length,
      pagesWithTextCount: countPagesWithText(normalizedPages),
      paragraphCount: normalizedParagraphs.length,
      characterCount: mergedText.length,
      nonWhitespaceCharacterCount,
      lineCount: countLines(mergedText),
    },
  }
}

export function normalizeDocumentText(text) {
  return normalizeText(text)
}
