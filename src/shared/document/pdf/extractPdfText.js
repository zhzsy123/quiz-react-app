import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createDocumentImportError } from '../../../entities/document-import/lib/documentImportContracts'
import { buildDocumentDraft, normalizeDocumentText } from '../buildDocumentDraft'
import { assessDocumentTextGate } from '../textGate'
import { extractPdfTextWithOcr } from './extractPdfTextWithOcr'

let workerConfigured = false

function ensurePdfWorker() {
  if (workerConfigured) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  workerConfigured = true
}

function normalizePageTextContent(items = []) {
  return normalizeDocumentText(
    items
      .map((item) => String(item?.str || '').trim())
      .filter(Boolean)
      .join(' ')
  )
}

export async function extractPdfText(file, { subject = '', gateOptions } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw createDocumentImportError('reading_file', '当前 PDF 文件无法读取。')
  }

  ensurePdfWorker()

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  })

  const pdf = await loadingTask.promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent({ normalizeWhitespace: true })
    const text = normalizePageTextContent(textContent.items)
    pages.push({
      page: pageNumber,
      text,
    })
  }

  const documentDraft = buildDocumentDraft({
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    subject,
    sourceType: 'pdf',
    pages,
  })

  const gate = assessDocumentTextGate(documentDraft, gateOptions)
  if (!gate.isUsable) {
    try {
      const ocrResult = await extractPdfTextWithOcr(pdf, {
        fileName: file.name,
        subject,
        gateOptions,
      })

      return ocrResult
    } catch (error) {
      if (error instanceof Error) {
        throw createDocumentImportError(
          'extracting_text',
          `当前 PDF 文本层不可用，且 OCR 识别失败：${error.message}`,
          { cause: error, gate }
        )
      }
      throw error
    }
  }

  return {
    documentDraft,
    gate,
    warnings: [],
  }
}
