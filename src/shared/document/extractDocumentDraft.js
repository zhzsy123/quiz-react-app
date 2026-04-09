import {
  SUPPORTED_DOCUMENT_IMPORT_EXTENSIONS,
  SUPPORTED_DOCUMENT_IMPORT_MIME_TYPES,
  createDocumentImportError,
} from '../../entities/document-import/lib/documentImportContracts'
import { extractDocxText } from './docx/extractDocxText'
import { extractPdfText } from './pdf/extractPdfText'
import { assertDocumentTextGate } from './textGate'

function getLowerCaseName(file) {
  return String(file?.name || '').toLowerCase()
}

export function detectDocumentKind(file) {
  const mimeType = String(file?.type || '').toLowerCase()
  const fileName = getLowerCaseName(file)

  if (
    SUPPORTED_DOCUMENT_IMPORT_MIME_TYPES.pdf.includes(mimeType) ||
    SUPPORTED_DOCUMENT_IMPORT_EXTENSIONS.pdf.some((extension) => fileName.endsWith(extension))
  ) {
    return 'pdf'
  }

  if (
    SUPPORTED_DOCUMENT_IMPORT_MIME_TYPES.docx.includes(mimeType) ||
    SUPPORTED_DOCUMENT_IMPORT_EXTENSIONS.docx.some((extension) => fileName.endsWith(extension))
  ) {
    return 'docx'
  }

  return ''
}

export async function extractDocumentDraft(file, { subject = '', gateOptions } = {}) {
  const documentKind = detectDocumentKind(file)
  if (!documentKind) {
    throw createDocumentImportError('reading_file', '当前仅支持导入 PDF 或 DOCX 文件。', {
      fileName: file?.name || '',
      mimeType: file?.type || '',
    })
  }

  const result =
    documentKind === 'pdf'
      ? await extractPdfText(file, { subject, gateOptions })
      : await extractDocxText(file, { subject, gateOptions })

  assertDocumentTextGate(result.documentDraft, gateOptions)

  return {
    documentKind,
    ...result,
  }
}
