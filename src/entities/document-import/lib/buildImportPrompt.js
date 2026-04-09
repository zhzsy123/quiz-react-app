import { getQuestionTypeMeta, getSubjectMeta } from '../../subject/model/subjects'
import { getDocumentImportProtocol } from './englishImportProtocolV2'

export const DEFAULT_DOCUMENT_IMPORT_CHUNK_OPTIONS = {
  maxCharsPerChunk: 4000,
  maxIncludedChunks: 6,
  maxTotalChars: 18000,
}

const SUBJECT_GUIDANCE = {
  english:
    '英语只允许 single_choice、cloze、reading、translation、essay。阅读理解必须是一篇文章配 3 到 5 个子题；完形填空必须使用 article 加 blanks，并在 article 中标出文内空位。',
  data_structure:
    '数据结构只允许 single_choice、true_false、fill_blank、function_fill_blank、short_answer、programming、composite。',
  database_principles:
    '数据库原理只允许 single_choice、true_false、fill_blank、short_answer、composite、sql、er_diagram。',
  international_trade:
    '国际贸易只允许 single_choice、true_false、translation、short_answer、case_analysis、calculation、operation、essay。',
}

function buildSourceSegments(documentDraft) {
  if (Array.isArray(documentDraft?.paragraphs) && documentDraft.paragraphs.length > 0) {
    return documentDraft.paragraphs.map((item, index) => ({
      index: index + 1,
      page: item.page || null,
      text: String(item.text || '').trim(),
      source: 'paragraph',
    }))
  }

  if (Array.isArray(documentDraft?.pages) && documentDraft.pages.length > 0) {
    return documentDraft.pages.map((item, index) => ({
      index: index + 1,
      page: item.page || null,
      text: String(item.text || '').trim(),
      source: 'page',
    }))
  }

  return String(documentDraft?.plainText || '')
    .split(/\n{2,}/)
    .map((text, index) => ({
      index: index + 1,
      page: null,
      text: text.trim(),
      source: 'text',
    }))
    .filter((item) => item.text)
}

function chunkSegments(segments, options = {}) {
  const maxCharsPerChunk = Number(options.maxCharsPerChunk) || DEFAULT_DOCUMENT_IMPORT_CHUNK_OPTIONS.maxCharsPerChunk
  const chunks = []
  let current = null

  segments.forEach((segment) => {
    const text = String(segment.text || '').trim()
    if (!text) return

    if (!current) {
      current = {
        index: chunks.length + 1,
        source: segment.source,
        pageFrom: segment.page,
        pageTo: segment.page,
        text,
      }
      return
    }

    const mergedText = `${current.text}\n\n${text}`
    if (mergedText.length > maxCharsPerChunk) {
      chunks.push(current)
      current = {
        index: chunks.length + 1,
        source: segment.source,
        pageFrom: segment.page,
        pageTo: segment.page,
        text,
      }
      return
    }

    current = {
      ...current,
      pageTo: segment.page || current.pageTo,
      text: mergedText,
    }
  })

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function selectChunks(chunks, options = {}) {
  const maxIncludedChunks = Number(options.maxIncludedChunks) || DEFAULT_DOCUMENT_IMPORT_CHUNK_OPTIONS.maxIncludedChunks
  const maxTotalChars = Number(options.maxTotalChars) || DEFAULT_DOCUMENT_IMPORT_CHUNK_OPTIONS.maxTotalChars

  if (chunks.length <= maxIncludedChunks) {
    const limited = []
    let usedChars = 0

    for (const chunk of chunks) {
      if (usedChars + chunk.text.length > maxTotalChars && limited.length > 0) break
      limited.push(chunk)
      usedChars += chunk.text.length
    }

    return {
      selectedChunks: limited,
      truncated: limited.length < chunks.length,
      totalChunks: chunks.length,
    }
  }

  const headCount = Math.ceil(maxIncludedChunks / 2)
  const tailCount = Math.floor(maxIncludedChunks / 2)
  const selected = [...chunks.slice(0, headCount), ...chunks.slice(-tailCount)]
  const uniqueSelected = selected.filter(
    (chunk, index, list) => list.findIndex((candidate) => candidate.index === chunk.index) === index
  )

  let usedChars = 0
  const limited = []
  uniqueSelected.forEach((chunk) => {
    if (usedChars + chunk.text.length > maxTotalChars && limited.length > 0) return
    limited.push(chunk)
    usedChars += chunk.text.length
  })

  return {
    selectedChunks: limited,
    truncated: limited.length < chunks.length,
    totalChunks: chunks.length,
  }
}

function buildQuestionTypeContracts(subjectMeta, allowedQuestionTypes = subjectMeta.questionTypeKeys || []) {
  return allowedQuestionTypes.map((typeKey) => {
    const meta = getQuestionTypeMeta(typeKey)
    return {
      type: meta.key,
      summary: meta.generationContract?.summary || '',
      requiredFields: meta.generationContract?.requiredFields || [],
    }
  })
}

function buildQuestionTypeLabelMap(subjectMeta, allowedQuestionTypes = subjectMeta.questionTypeKeys || []) {
  return Object.fromEntries(
    allowedQuestionTypes.map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      return [meta.key, meta.shortLabel || meta.label || meta.key]
    })
  )
}

function buildProtocolPayload(subjectKey, allowedQuestionTypes = null) {
  const protocol = getDocumentImportProtocol(subjectKey)
  if (!protocol) return null

  const filteredTypeContracts = allowedQuestionTypes?.length
    ? Object.fromEntries(
        Object.entries(protocol.typeContracts).filter(([typeKey]) => allowedQuestionTypes.includes(typeKey))
      )
    : protocol.typeContracts

  return {
    version: protocol.version,
    subject: protocol.subject,
    purpose: protocol.purpose,
    allowed_question_types: allowedQuestionTypes?.length ? allowedQuestionTypes : protocol.allowedQuestionTypes,
    output_rules: protocol.outputRules,
    hard_constraints: protocol.hardConstraints,
    text_cleanup_rules: protocol.textCleanupRules,
    gradability_rules: protocol.gradabilityRules,
    type_contracts: filteredTypeContracts,
  }
}

export function buildImportPrompt({
  documentDraft,
  subjectKey,
  chunkOptions,
  targetQuestionTypes = null,
  sectionLabel = '',
} = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  const allowedQuestionTypes = Array.isArray(targetQuestionTypes) && targetQuestionTypes.length
    ? targetQuestionTypes
    : subjectMeta.questionTypeKeys || []
  const segments = buildSourceSegments(documentDraft)
  const chunks = chunkSegments(segments, chunkOptions)
  const chunkSelection = selectChunks(chunks, chunkOptions)
  const warnings = []
  const protocolPayload = buildProtocolPayload(subjectMeta.key, allowedQuestionTypes)

  if (chunkSelection.truncated) {
    warnings.push('文档较长，当前仅发送头尾关键片段给 AI 解析。')
  }

  const systemPromptParts = [
    '你是题库结构化导入引擎。',
    '你的任务是把试卷或题库文档解析成一个可直接被 JSON.parse 解析的单个 JSON 对象。',
    '不要输出 markdown，不要输出解释文字，不要输出数组外壳。',
    '顶层必须使用 questions 数组，不允许使用 items。',
    '输出结果必须与目标科目的题型协议一致，不允许使用未授权题型。',
    '如果原文信息不足，不要编造；应尽量保留可确认的题目，并把不确定信息写得保守。',
  ]

  if (subjectMeta.key === 'english') {
    systemPromptParts.push('当前任务必须严格遵守英语试卷 AI 清洗协议 v2。')
    systemPromptParts.push('英语只允许 single_choice、cloze、reading、translation、essay 五种题型。')
    systemPromptParts.push('所有客观题必须优先给出标准答案。')
    systemPromptParts.push('阅读子题必须使用 A-1、A-2 这类命名。')
    systemPromptParts.push('完形填空必须在 article 中嵌入 [[1]]、[[2]] 这种文内空位。')
    systemPromptParts.push('所有中文解析、评分点和清洗说明默认使用中文。')
    if (sectionLabel) {
      systemPromptParts.push(`当前只解析英语试卷中的一个局部 section：${sectionLabel}。`)
    }
    if (allowedQuestionTypes.length > 0) {
      systemPromptParts.push(`本次 section 仅允许输出这些题型：${allowedQuestionTypes.join('、')}。`)
    }
  }

  const userPayload = {
    task: 'parse_exam_document_to_quiz_json',
    subject: subjectMeta.key,
    subject_label: subjectMeta.shortLabel || subjectMeta.label || subjectMeta.key,
    section_label: sectionLabel || '',
    subject_guidance: SUBJECT_GUIDANCE[subjectMeta.key] || '',
    protocol: protocolPayload,
    file_name: documentDraft?.fileName || '',
    source_type: documentDraft?.sourceType || '',
    output_contract: {
      top_level_required: ['schema_version', 'title', 'subject', 'questions'],
      subject_must_equal: subjectMeta.key,
      allowed_question_types: allowedQuestionTypes,
      question_type_labels: buildQuestionTypeLabelMap(subjectMeta, allowedQuestionTypes),
      question_type_contracts: buildQuestionTypeContracts(subjectMeta, allowedQuestionTypes),
    },
    chunking: {
      total_chunks: chunkSelection.totalChunks,
      included_chunks: chunkSelection.selectedChunks.length,
      truncated: chunkSelection.truncated,
    },
    source_outline: documentDraft?.outline || [],
    source_chunks: chunkSelection.selectedChunks.map((chunk) => ({
      index: chunk.index,
      page_from: chunk.pageFrom,
      page_to: chunk.pageTo,
      text: chunk.text,
    })),
  }

  return {
    subjectMeta,
    warnings,
    chunkSelection,
    systemPrompt: systemPromptParts.join('\n'),
    userPrompt: JSON.stringify(userPayload, null, 2),
  }
}
