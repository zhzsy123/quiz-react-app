import { buildDocumentDraft, normalizeDocumentText } from '../buildDocumentDraft'
import { assessDocumentTextGate } from '../textGate'

const OCR_RENDER_SCALE = 2

function ensureBrowserCanvas() {
  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持 OCR 画布渲染。')
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('当前浏览器无法创建 OCR 画布上下文。')
  }

  return { canvas, context }
}

async function createOcrWorker() {
  const { createWorker } = await import('tesseract.js')

  try {
    const worker = await createWorker('eng+chi_sim')
    await worker.setParameters({
      preserve_interword_spaces: '1',
    })
    return worker
  } catch {
    const worker = await createWorker('eng')
    await worker.setParameters({
      preserve_interword_spaces: '1',
    })
    return worker
  }
}

async function recognizePdfPage(worker, page) {
  const { canvas, context } = ensureBrowserCanvas()
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  const result = await worker.recognize(canvas)
  return normalizeDocumentText(result?.data?.text || '')
}

export async function extractPdfTextWithOcr(pdf, { fileName = '', subject = '', gateOptions } = {}) {
  const worker = await createOcrWorker()
  const pages = []

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const text = await recognizePdfPage(worker, page)
      pages.push({
        page: pageNumber,
        text,
      })
    }
  } finally {
    await worker.terminate()
  }

  const documentDraft = {
    ...buildDocumentDraft({
      fileName,
      mimeType: 'application/pdf',
      subject,
      sourceType: 'pdf',
      pages,
    }),
    ocrUsed: true,
  }

  return {
    documentDraft,
    gate: assessDocumentTextGate(documentDraft, gateOptions),
    warnings: ['已启用 OCR 识别扫描件 PDF，文本结果可能受图片清晰度和版式影响。'],
  }
}
