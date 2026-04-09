export const DOCUMENT_IMPORT_FAILED_STAGES = [
  '',
  'reading_file',
  'extracting_text',
  'calling_ai',
  'validating',
  'saving',
  'launching',
]

export const DOCUMENT_IMPORT_STATUSES = [
  'idle',
  'file_selected',
  'reading_file',
  'extracting_text',
  'calling_ai',
  'validating',
  'preview_ready',
  'saving',
  'launching',
  'completed',
  'failed',
]

export const DOCUMENT_IMPORT_PREVIEW_POLICY = {
  canSaveWithWarnings: true,
  canSaveWithErrors: false,
  canSaveWithInvalidQuestions: false,
  reuseSavedPaperForPractice: true,
  requireExplicitSubjectSelection: true,
}

export const SUPPORTED_DOCUMENT_IMPORT_MIME_TYPES = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
}

export const SUPPORTED_DOCUMENT_IMPORT_EXTENSIONS = {
  pdf: ['.pdf'],
  docx: ['.docx'],
}

export function isDocumentImportFailedStage(value) {
  return DOCUMENT_IMPORT_FAILED_STAGES.includes(value)
}

export function isDocumentImportStatus(value) {
  return DOCUMENT_IMPORT_STATUSES.includes(value)
}

export function createDocumentImportError(stage, message, details = {}) {
  const failedStage = isDocumentImportFailedStage(stage) ? stage : 'validating'
  const error = new Error(message)
  error.failedStage = failedStage
  error.details = details
  return error
}

export function createEmptyDocumentDraft() {
  return {
    fileName: '',
    mimeType: '',
    subject: '',
    sourceType: '',
    plainText: '',
    pages: [],
    paragraphs: [],
    outline: [],
    stats: {
      pageCount: 0,
      paragraphCount: 0,
      characterCount: 0,
      nonWhitespaceCharacterCount: 0,
      lineCount: 0,
    },
  }
}

export function createEmptyImportPreview() {
  return {
    title: '',
    subject: '',
    questionCount: 0,
    totalScore: 0,
    validCount: 0,
    warningCount: 0,
    invalidCount: 0,
    typeStats: [],
    questionPreviews: [],
  }
}

export function createEmptyImportDraftResult() {
  return {
    requestId: '',
    documentDraft: createEmptyDocumentDraft(),
    rawAiPayload: null,
    normalizedDocument: null,
    scoreBreakdown: null,
    preview: createEmptyImportPreview(),
    warnings: [],
    errors: [],
    invalidReasons: [],
  }
}
