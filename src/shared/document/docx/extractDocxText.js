import mammoth from 'mammoth'
import { createDocumentImportError } from '../../../entities/document-import/lib/documentImportContracts'
import { buildDocumentDraft, normalizeDocumentText } from '../buildDocumentDraft'
import { assessDocumentTextGate } from '../textGate'

function parseParagraphs(rawText) {
  return normalizeDocumentText(rawText)
    .split(/\n{2,}/)
    .map((text, index) => ({
      index,
      text,
    }))
    .filter((item) => item.text)
}

export async function extractDocxText(file, { subject = '', gateOptions } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw createDocumentImportError('reading_file', '当前 DOCX 文件无法读取。')
  }

  const arrayBuffer = await file.arrayBuffer()
  const { value, messages = [] } = await mammoth.extractRawText({ arrayBuffer })
  const paragraphs = parseParagraphs(value)
  const documentDraft = buildDocumentDraft({
    fileName: file.name,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    subject,
    sourceType: 'docx',
    paragraphs,
    plainText: value,
  })

  return {
    documentDraft,
    gate: assessDocumentTextGate(documentDraft, gateOptions),
    warnings: messages.map((item) => item.message).filter(Boolean),
  }
}
