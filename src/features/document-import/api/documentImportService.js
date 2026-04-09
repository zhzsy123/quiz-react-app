import {
  createDocumentImportError,
  createEmptyImportDraftResult,
} from '../../../entities/document-import/lib/documentImportContracts'
import { buildImportPreview } from '../../../entities/document-import/lib/buildImportPreview'
import { buildPersistedImportPayload } from '../../../entities/document-import/lib/buildPersistedImportPayload'
import { buildImportPrompt } from '../../../entities/document-import/lib/buildImportPrompt'
import { buildRepairImportQuestionPrompt } from '../../../entities/document-import/lib/buildRepairImportQuestionPrompt'
import { detectEnglishImportSections } from '../../../entities/document-import/lib/detectEnglishImportSections'
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

function buildSectionDocumentDraft(documentDraft, section) {
  return {
    ...documentDraft,
    plainText: section.text,
    pages: [],
    paragraphs: [],
    outline: [{ text: section.label, page: null }],
  }
}

function parseRawPayloadToObject(rawPayload) {
  if (typeof rawPayload !== 'string') {
    return rawPayload
  }

  return JSON.parse(rawPayload)
}

function collectQuestionsFromRawPayload(rawPayload) {
  const payload = parseRawPayloadToObject(rawPayload)
  const candidate =
    payload?.quiz_document ||
    payload?.quiz ||
    payload?.paper ||
    payload?.document ||
    payload

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return []
  }

  if (Array.isArray(candidate.questions)) {
    return candidate.questions
  }

  if (candidate.type) {
    return [candidate]
  }

  if (candidate.question && typeof candidate.question === 'object') {
    return [candidate.question]
  }

  return []
}

function buildCombinedImportPayload({ subjectKey, documentDraft, sectionResults }) {
  const mergedQuestions = sectionResults.flatMap((sectionResult) =>
    collectQuestionsFromRawPayload(sectionResult.rawAiPayload)
  )

  return {
    schema_version: '2026-04',
    paper_id: `import_${subjectKey}_${Date.now()}`,
    title: documentDraft?.fileName?.replace(/\.[^.]+$/, '') || `${subjectKey} 文档导入`,
    subject: subjectKey,
    description: `按 section 并发解析后的 ${subjectKey} 文档导入结果`,
    questions: mergedQuestions,
  }
}

function countQuestionsInSectionResult(sectionResult) {
  return collectQuestionsFromRawPayload(sectionResult?.rawAiPayload).length
}

function buildImportDiagnostics({
  documentDraft,
  strategy,
  detection = null,
  sectionResults = [],
  failedSections = [],
  skippedCount = 0,
  skippedTypes = [],
}) {
  return {
    strategy,
    ocrUsed: Boolean(documentDraft?.ocrUsed),
    characterCount: Number(documentDraft?.stats?.characterCount) || 0,
    pageCount: Number(documentDraft?.stats?.pageCount) || 0,
    sectionCount: detection?.sections?.length || 0,
    coverage: Number(detection?.coverage) || 0,
    skippedCount,
    skippedTypes,
    failedSections: failedSections.map((item) => ({
      key: item.section.key,
      label: item.section.label,
      targetQuestionTypes: item.section.targetQuestionTypes || [],
      optional: Boolean(item.section.optional),
      reason: item.reason || '',
      sourceLength: String(item.section.text || '').length,
    })),
    sections: sectionResults.map((sectionResult) => ({
      key: sectionResult.section.key,
      label: sectionResult.section.label,
      targetQuestionTypes: sectionResult.section.targetQuestionTypes || [],
      itemCount: countQuestionsInSectionResult(sectionResult),
      repaired: Boolean(sectionResult.repaired),
      warnings: sectionResult.warnings || [],
      sourceLength: String(sectionResult.section.text || '').length,
    })),
  }
}

function emitSectionActivity(onStageChange, section, status, summary, detail = '') {
  onStageChange?.(
    {
      id: `section-${section.key}`,
      title: `解析 ${section.label}`,
      status,
      summary,
      detail: detail || summary,
      meta: section.targetQuestionTypes?.join(' / ') || '',
    },
    detail || summary
  )
}

function validateSectionImportPayload(rawAiPayload, subjectKey, targetQuestionTypes = []) {
  const normalizedDocument = normalizeImportResultPayload(rawAiPayload, subjectKey)
  const items = normalizedDocument?.quiz?.items || []

  if (!items.length) {
    throw new Error('本 section 未生成任何可用题目。')
  }

  if (targetQuestionTypes.length > 0) {
    const matchedCount = items.filter((item) => {
      const typeKey = item?.source_type || item?.type
      return targetQuestionTypes.includes(typeKey)
    }).length

    if (matchedCount === 0) {
      throw new Error(`本 section 未生成预期题型：${targetQuestionTypes.join('、')}。`)
    }
  }

  return normalizedDocument
}

async function requestSectionAi({
  provider,
  subjectMeta,
  section,
  documentDraft,
  signal,
  onStageChange,
}) {
  emitSectionActivity(onStageChange, section, 'running', '正在调用 AI 处理该 section。', `开始解析 ${section.label}`)

  const sectionDraft = buildSectionDocumentDraft(documentDraft, section)

  const runSectionImport = async (repairHint = '') => {
    const prompt = buildImportPrompt({
      documentDraft: sectionDraft,
      subjectKey: subjectMeta.key,
      targetQuestionTypes: section.targetQuestionTypes,
      sectionLabel: section.label,
      repairHint,
    })

    const response = await requestAiJson({
      provider,
      feature: repairHint ? 'document_import_section_repair' : 'document_import_section',
      title: `${documentDraft.fileName || subjectMeta.shortLabel || subjectMeta.key} / ${section.label}`,
      subject: subjectMeta.key,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: repairHint ? 0.05 : 0.1,
      signal,
    })

    validateSectionImportPayload(response.content, subjectMeta.key, section.targetQuestionTypes)

    return {
      section,
      rawAiPayload: response.content,
      warnings: prompt.warnings || [],
      repaired: Boolean(repairHint),
    }
  }

  try {
    const result = await runSectionImport()
    emitSectionActivity(onStageChange, section, 'completed', '该 section 已解析完成。', `${section.label} 解析完成`)
    return result
  } catch (error) {
    const canRepair = section.targetQuestionTypes?.length === 1

    if (canRepair) {
      emitSectionActivity(
        onStageChange,
        section,
        'running',
        '首轮结果结构不稳定，正在定向修复本 section。',
        `${section.label} 首轮失败：${error?.message || '结构不稳定'}`
      )

      try {
        const repairedResult = await runSectionImport(
          `上一轮 section 解析失败：${error?.message || '结构无效'}。请严格按当前 section 的唯一题型 contract 重写，并确保结构完整。`
        )
        emitSectionActivity(onStageChange, section, 'completed', '该 section 已解析完成。', `${section.label} 修复后解析完成`)
      return repairedResult
      } catch (repairError) {
        emitSectionActivity(
          onStageChange,
          section,
          'failed',
          repairError?.message || '该 section 解析失败。',
          `${section.label} 解析失败`
        )
        throw repairError
      }
    }

    emitSectionActivity(
      onStageChange,
      section,
      'failed',
      error?.message || '该 section 解析失败。',
      `${section.label} 解析失败`
    )
    throw error
  }
}

async function importEnglishDocumentBySections({
  documentDraft,
  subjectMeta,
  provider,
  signal,
  onStageChange,
}) {
  const detection = detectEnglishImportSections(documentDraft)
  if (!detection.shouldSplit) {
    return null
  }

  onStageChange?.(
    'calling_ai',
    `正在并行解析英语试卷各部分，共 ${detection.sections.length} 个 section。`
  )

  const settledResults = await Promise.allSettled(
    detection.sections.map((section) =>
      requestSectionAi({
        provider,
        subjectMeta,
        section,
        documentDraft,
        signal,
        onStageChange,
      })
    )
  )

  const sectionResults = settledResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)

  const failedSections = settledResults
    .map((result, index) => ({ result, section: detection.sections[index] }))
    .filter((item) => item.result.status === 'rejected')
    .map((item) => ({
      section: item.section,
      reason: item.result.reason?.message || '该 section 解析失败。',
    }))

  if (!sectionResults.length) {
    if (failedSections.length) {
      throw new Error(
        failedSections.map((item) => `${item.section.label}：${item.reason}`).join('；')
      )
    }

    return null
  }

  return {
    detection,
    sectionResults,
    failedSections,
    combinedPayload: buildCombinedImportPayload({
      subjectKey: subjectMeta.key,
      documentDraft,
      sectionResults,
    }),
  }
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
  let rawAiPayload = null
  let promptWarnings = []
  let sectionedImport = null

  try {
    sectionedImport =
      subjectMeta.key === 'english'
        ? await importEnglishDocumentBySections({
            documentDraft,
            subjectMeta,
            provider,
            signal,
            onStageChange,
          })
        : null

    if (sectionedImport) {
      rawAiPayload = {
        mode: 'english_sectioned_import',
        sections: sectionedImport.sectionResults.map((item) => ({
          key: item.section.key,
          label: item.section.label,
          rawAiPayload: item.rawAiPayload,
        })),
        combinedPayload: sectionedImport.combinedPayload,
      }
      promptWarnings = [
        `已启用英语 section 并发解析，共解析 ${sectionedImport.detection.sections.length} 个部分。`,
        ...(sectionedImport.detection.coverage < 0.85
          ? ['本次为基于本地规则的 section 粗切分，请在预览中重点检查题型边界。']
          : []),
        ...((sectionedImport.failedSections || []).map(
          (item) => `${item.section.label} 瑙ｆ瀽澶辫触锛屽凡璺宠繃锛?{item.reason}`
        )),
      ]
    } else {
      const prompt = buildImportPrompt({
        documentDraft,
        subjectKey: subjectMeta.key,
        chunkOptions,
      })
      promptWarnings = prompt.warnings || []

      onStageChange?.('calling_ai', '正在调用 AI 解析试卷结构。')
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
    }
  } catch (error) {
    throw createDocumentImportError('calling_ai', `AI 解析试卷失败：${error.message}`, {
      requestId,
      subjectKey: subjectMeta.key,
    })
  }

  let normalizedDocument = null
  try {
    onStageChange?.('validating', '正在校验并标准化题库结构。')
    normalizedDocument = normalizeImportResultPayload(rawAiPayload?.combinedPayload || rawAiPayload, subjectMeta.key)
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

  const warnings = [
    ...promptWarnings,
    ...((sectionedImport?.failedSections || []).map(
      (item) => `${item.section.label} 解析失败，已跳过：${item.reason}`
    )),
    ...(normalizedDocument?.validation?.warnings || []),
  ]
  if (skippedTypes.length > 0) {
    warnings.push(`检测到未支持题型：${skippedTypes.join('、')}。`)
  }

  const diagnostics = buildImportDiagnostics({
    documentDraft,
    strategy: sectionedImport ? 'english_section_detection' : 'single_pass',
    detection: sectionedImport?.detection || null,
    sectionResults: sectionedImport?.sectionResults || [],
    failedSections: sectionedImport?.failedSections || [],
    skippedCount,
    skippedTypes,
  })

  const preview = buildImportPreview({
    normalizedDocument,
    subjectKey: subjectMeta.key,
    warnings,
    invalidReasons,
    diagnostics,
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
    diagnostics,
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
        questions: [rawAiPayload?.question || rawAiPayload],
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
