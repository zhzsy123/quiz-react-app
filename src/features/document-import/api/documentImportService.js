import {
  createDocumentImportError,
  createEmptyImportDraftResult,
} from '../../../entities/document-import/lib/documentImportContracts'
import { buildImportPreview } from '../../../entities/document-import/lib/buildImportPreview'
import { buildPersistedImportPayload } from '../../../entities/document-import/lib/buildPersistedImportPayload'
import { buildImportPrompt } from '../../../entities/document-import/lib/buildImportPrompt'
import { buildRepairImportQuestionPrompt } from '../../../entities/document-import/lib/buildRepairImportQuestionPrompt'
import { buildQuizDocumentFromText, normalizeQuizDocument } from '../../../entities/quiz/lib/quizPipeline'
import { getSubjectMeta } from '../../../entities/subject/model/subjects'
import { requestAiJson } from '../../../shared/api/aiGateway'

function createImportRequestId(subjectKey = 'import') {
  return `import_${subjectKey}_${Date.now()}`
}

function ensureImportPayloadShape(rawPayload, subjectKey) {
  const candidate =
    rawPayload?.quiz_document ||
    rawPayload?.quiz ||
    rawPayload?.paper ||
    rawPayload?.document ||
    rawPayload

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw createDocumentImportError('validating', 'AI 返回的题库结构不是合法的 JSON 对象。', {
      rawPayload,
    })
  }

  return {
    ...candidate,
    subject: subjectKey,
  }
}

function normalizeImportResultPayload(rawAiPayload, subjectKey) {
  if (typeof rawAiPayload === 'string') {
    return buildQuizDocumentFromText(rawAiPayload)
  }

  const payload = ensureImportPayloadShape(rawAiPayload, subjectKey)
  return normalizeQuizDocument(payload)
}

export async function importDocumentWithAi({
  documentDraft,
  subjectKey,
  provider = 'deepseek',
  signal,
  chunkOptions,
  onStageChange,
} = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  if (!documentDraft?.plainText) {
    throw createDocumentImportError('extracting_text', '当前文档未提取到可供解析的有效文本。')
  }

  if (!subjectMeta?.isAvailable) {
    throw createDocumentImportError('validating', '当前科目不可用，无法执行文档导入。', {
      subjectKey,
    })
  }

  const requestId = createImportRequestId(subjectMeta.key)
  const prompt = buildImportPrompt({
    documentDraft,
    subjectKey: subjectMeta.key,
    chunkOptions,
  })

  let rawAiPayload = null
  try {
    onStageChange?.('calling_ai', '正在调用 AI 解析试卷结构')
    const response = await requestAiJson({
      provider,
      feature: 'document_import',
      title: documentDraft.fileName || `${subjectMeta.shortLabel || subjectMeta.key} 文档导入`,
      subject: subjectMeta.key,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.1,
      signal,
    })
    rawAiPayload = response.content
  } catch (error) {
    throw createDocumentImportError('calling_ai', `AI 解析试卷失败：${error.message}`, {
      requestId,
      subjectKey: subjectMeta.key,
    })
  }

  let normalizedDocument = null
  try {
    onStageChange?.('validating', '正在校验并标准化题库结构')
    normalizedDocument = normalizeImportResultPayload(rawAiPayload, subjectMeta.key)
  } catch (error) {
    throw createDocumentImportError('validating', error.message, {
      requestId,
      subjectKey: subjectMeta.key,
      rawAiPayload,
      details: error.details || [],
    })
  }

  const invalidReasons = []
  const skippedCount = Number(normalizedDocument?.validation?.skippedCount) || 0
  const skippedTypes = normalizedDocument?.validation?.skippedTypes || []
  if (skippedCount > 0) {
    invalidReasons.push(`已跳过 ${skippedCount} 道当前不支持的题目。`)
  }

  const warnings = [...(prompt.warnings || []), ...(normalizedDocument?.validation?.warnings || [])]

  if (skippedTypes.length > 0) {
    warnings.push(`检测到未支持题型：${skippedTypes.join('、')}。`)
  }

  const preview = buildImportPreview({
    normalizedDocument,
    subjectKey: subjectMeta.key,
    warnings,
    invalidReasons,
  })
  const persistedPayload = buildPersistedImportPayload(normalizedDocument.quiz)

  return {
    ...createEmptyImportDraftResult(),
    requestId,
    documentDraft,
    rawAiPayload,
    normalizedDocument,
    persistedPayload,
    scoreBreakdown: normalizedDocument.scoreBreakdown,
    preview,
    warnings,
    errors: [],
    invalidReasons,
  }
}

export async function repairImportedQuestionWithAi({
  documentDraft,
  subjectKey,
  question,
  questionPreview,
  provider = 'deepseek',
  signal,
} = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  if (!documentDraft?.plainText) {
    throw createDocumentImportError('extracting_text', '当前文档缺少可用于局部重解析的原始文本。')
  }

  const prompt = buildRepairImportQuestionPrompt({
    documentDraft,
    subjectMeta,
    question,
    questionPreview,
  })

  let rawAiPayload = null
  try {
    const response = await requestAiJson({
      provider,
      feature: 'document_import_repair',
      title: questionPreview?.prompt || question?.prompt || '文档导入题目修复',
      subject: subjectMeta.key,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0.1,
      signal,
    })
    rawAiPayload = response.content
  } catch (error) {
    throw createDocumentImportError('calling_ai', `局部重解析失败：${error.message}`, {
      subjectKey: subjectMeta.key,
      questionId: question?.id,
    })
  }

  let normalizedDocument = null
  try {
    normalizedDocument = normalizeImportResultPayload(
      {
        schema_version: 'document-import-repair-v1',
        title: '局部修复题目',
        subject: subjectMeta.key,
        questions: [
          rawAiPayload?.question || rawAiPayload,
        ],
      },
      subjectMeta.key
    )
  } catch (error) {
    throw createDocumentImportError('validating', `局部重解析后的题目结构仍然无效：${error.message}`, {
      subjectKey: subjectMeta.key,
      questionId: question?.id,
      rawAiPayload,
    })
  }

  const repairedQuestion = normalizedDocument?.quiz?.items?.[0]
  if (!repairedQuestion) {
    throw createDocumentImportError('validating', '局部重解析未生成任何可用题目。', {
      subjectKey: subjectMeta.key,
      questionId: question?.id,
      rawAiPayload,
    })
  }

  return {
    rawAiPayload,
    repairedQuestion,
  }
}
