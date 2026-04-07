import { formatStructuredResponse } from '../utils/questionRuntime'

export const EXAM_IMPORT_SCHEMA_VERSION = '1.0'

const DEFAULT_IMPORT_SCORES = {
  single_choice: 2,
  multiple_choice: 2,
  true_false: 2,
  fill_blank: 2,
  short_answer: 8,
  application: 12,
  sql: 12,
}

function fallbackOptionKey(index) {
  return String.fromCharCode(65 + index)
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])[.\s、:：-]+(.*)$/)
    if (match) {
      return {
        key: match[1],
        text: match[2].trim(),
      }
    }

    return {
      key: fallbackOptionKey(index),
      text: option,
    }
  }

  if (option && typeof option === 'object') {
    return {
      key: option.key || fallbackOptionKey(index),
      text: option.text ?? option.label ?? '',
    }
  }

  return {
    key: fallbackOptionKey(index),
    text: String(option ?? ''),
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function parseScore(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function getDefaultScore(questionType, answerMode) {
  if (answerMode === 'structured_form') return 10
  if (answerMode === 'sql_editor') return 12
  if (answerMode === 'textarea' || answerMode === 'text') {
    return questionType === 'application' ? 12 : 8
  }
  return DEFAULT_IMPORT_SCORES[questionType] || 5
}

function normalizeDifficulty(value) {
  const numeric = Number(value)
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) return numeric

  const lowered = normalizeText(value).toLowerCase()
  if (lowered === 'easy') return 2
  if (lowered === 'medium') return 3
  if (lowered === 'hard') return 4
  return undefined
}

function normalizeArrayStrings(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((item) => normalizeText(item))
    .filter(Boolean))]
}

function normalizeContentBlock(block) {
  if (typeof block === 'string') {
    return { type: 'text', value: block }
  }

  if (!block || typeof block !== 'object') return null

  const type = normalizeText(block.type || block.blockType || '').toLowerCase()

  if (!type && typeof block.value === 'string') {
    return { type: 'text', value: block.value }
  }

  switch (type) {
    case 'text':
      return {
        type: 'text',
        value: normalizeText(block.value || block.text),
      }
    case 'table':
      return {
        type: 'table',
        caption: normalizeText(block.caption),
        headers: Array.isArray(block.headers) ? block.headers.map((header) => String(header)) : [],
        rows: Array.isArray(block.rows) ? block.rows.map((row) => (Array.isArray(row) ? row : [])) : [],
      }
    case 'image':
      return {
        type: 'image',
        caption: normalizeText(block.caption),
        url: normalizeText(block.url || block.src),
        alt: normalizeText(block.alt),
      }
    case 'graph':
      return {
        type: 'graph',
        caption: normalizeText(block.caption),
        graphType: normalizeText(block.graphType || block.graph_type || 'undirected'),
        vertices: Array.isArray(block.vertices) ? block.vertices.map((vertex) => String(vertex)) : [],
        edges: Array.isArray(block.edges)
          ? block.edges
            .filter((edge) => edge && typeof edge === 'object')
            .map((edge) => ({
              from: String(edge.from),
              to: String(edge.to),
              ...(edge.weight !== undefined ? { weight: Number(edge.weight) } : {}),
            }))
          : [],
      }
    case 'tree':
    case 'binary_tree':
      return {
        type: 'binary_tree',
        caption: normalizeText(block.caption),
        root: normalizeText(block.root),
        nodes: Array.isArray(block.nodes)
          ? block.nodes
            .filter((node) => node && typeof node === 'object' && normalizeText(node.id))
            .map((node) => ({
              id: String(node.id),
              ...(node.value !== undefined ? { value: node.value } : {}),
              left: node.left ?? null,
              right: node.right ?? null,
            }))
          : [],
      }
    case 'schema':
    case 'table_schema':
      return {
        type: 'schema',
        caption: normalizeText(block.caption),
        tables: Array.isArray(block.tables)
          ? block.tables
            .filter((table) => table && typeof table === 'object' && normalizeText(table.name))
            .map((table) => ({
              name: String(table.name),
              columns: Array.isArray(table.columns)
                ? table.columns
                  .filter((column) => column && typeof column === 'object' && normalizeText(column.name))
                  .map((column) => ({
                    name: String(column.name),
                    dataType: String(column.dataType || column.data_type || 'string'),
                    ...(column.isPrimaryKey !== undefined ? { isPrimaryKey: Boolean(column.isPrimaryKey) } : {}),
                    ...(column.isForeignKey !== undefined ? { isForeignKey: Boolean(column.isForeignKey) } : {}),
                    ...(column.references ? { references: String(column.references) } : {}),
                    ...(column.nullable !== undefined ? { nullable: Boolean(column.nullable) } : {}),
                  }))
                : [],
            }))
          : [],
      }
    default:
      return {
        type: 'text',
        value: normalizeText(block.value || block.text || JSON.stringify(block)),
      }
  }
}

function normalizeContentBlocks(content) {
  if (typeof content === 'string') {
    return [{ type: 'text', value: content }]
  }

  if (!Array.isArray(content)) return []

  return content
    .map(normalizeContentBlock)
    .filter((block) => block && (block.type !== 'text' || block.value))
}

function normalizeQuestionField(rawQuestion, key, fallback = undefined) {
  if (rawQuestion[key] !== undefined) return rawQuestion[key]
  const snakeKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
  if (rawQuestion[snakeKey] !== undefined) return rawQuestion[snakeKey]
  return fallback
}

function buildPromptAndContent(rawQuestion) {
  const stem = normalizeText(
    normalizeQuestionField(rawQuestion, 'stem') ||
    normalizeQuestionField(rawQuestion, 'prompt')
  )

  const contentBlocks = normalizeContentBlocks(normalizeQuestionField(rawQuestion, 'content'))
  if (stem) return { prompt: stem, contentBlocks }

  const firstTextIndex = contentBlocks.findIndex((block) => block.type === 'text' && normalizeText(block.value))
  if (firstTextIndex >= 0) {
    const promptBlock = contentBlocks[firstTextIndex]
    return {
      prompt: normalizeText(promptBlock.value),
      contentBlocks: contentBlocks.filter((_, index) => index !== firstTextIndex),
    }
  }

  return {
    prompt: `题目 ${normalizeText(rawQuestion.id) || ''}`.trim(),
    contentBlocks,
  }
}

function normalizeBaseItem(rawQuestion, packageMeta, runtimeType, defaultScore) {
  const { prompt, contentBlocks } = buildPromptAndContent(rawQuestion)
  const questionType = normalizeText(
    normalizeQuestionField(rawQuestion, 'questionType') ||
    normalizeQuestionField(rawQuestion, 'type')
  )
  const source = normalizeQuestionField(rawQuestion, 'source') || {}
  const knowledgePoints = normalizeArrayStrings(normalizeQuestionField(rawQuestion, 'knowledgePoints'))
  const tags = normalizeArrayStrings(rawQuestion.tags)
  const subject = normalizeText(rawQuestion.subject || (Array.isArray(packageMeta.subjectScope) ? packageMeta.subjectScope[0] : '') || '')

  return {
    id: normalizeText(rawQuestion.id),
    type: runtimeType,
    prompt,
    difficulty: normalizeDifficulty(rawQuestion.difficulty),
    tags: [...new Set([...tags, ...knowledgePoints])],
    score: parseScore(rawQuestion.score, defaultScore),
    source_type: questionType || runtimeType,
    assets: [],
    content_blocks: contentBlocks,
    module: normalizeText(rawQuestion.module),
    subtype: normalizeText(rawQuestion.subtype),
    subject,
    import_source: {
      school: normalizeText(source.school || packageMeta.school),
      year: Number(source.year || packageMeta.year || 0) || undefined,
      paperTitle: normalizeText(source.paperTitle || packageMeta.paperTitle),
      paperType: normalizeText(source.paperType || packageMeta.paperType),
      sectionName: normalizeText(source.sectionName),
      questionNo: normalizeText(source.questionNo),
    },
  }
}

function normalizeChoiceQuestion(rawQuestion, packageMeta, runtimeType) {
  const standardAnswer = normalizeQuestionField(rawQuestion, 'standardAnswer') || {}
  const rawOptions = normalizeQuestionField(rawQuestion, 'options')
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) return null

  const base = normalizeBaseItem(rawQuestion, packageMeta, runtimeType, getDefaultScore(runtimeType, runtimeType))
  const options = rawOptions.map(normalizeOption)

  if (runtimeType === 'single_choice') {
    const correct = normalizeText(standardAnswer.value)
    if (!correct) return null

    return {
      ...base,
      options,
      answer: {
        type: 'objective',
        correct,
        rationale: normalizeText(rawQuestion.analysis),
      },
    }
  }

  if (runtimeType === 'multiple_choice') {
    const values = Array.isArray(standardAnswer.value) ? standardAnswer.value : []
    const correct = [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].sort()
    if (!correct.length) return null

    return {
      ...base,
      options,
      answer: {
        type: 'objective',
        correct,
        rationale: normalizeText(rawQuestion.analysis),
      },
    }
  }

  const tfValue = standardAnswer.value
  const normalizedCorrect =
    tfValue === true || String(tfValue).toLowerCase() === 'true' || String(tfValue).toUpperCase() === 'T'
      ? 'T'
      : tfValue === false || String(tfValue).toLowerCase() === 'false' || String(tfValue).toUpperCase() === 'F'
        ? 'F'
        : ''

  if (!normalizedCorrect) return null

  return {
    ...base,
    options: [
      { key: 'T', text: '正确' },
      { key: 'F', text: '错误' },
    ],
    answer: {
      type: 'objective',
      correct: normalizedCorrect,
      rationale: normalizeText(rawQuestion.analysis),
    },
  }
}

function distributeBlankScores(totalScore, count) {
  if (!count) return []
  const fallback = totalScore / count
  return Array.from({ length: count }, (_, index) => {
    if (index === count - 1) {
      const assigned = fallback * index
      return Number((totalScore - assigned).toFixed(2))
    }
    return Number(fallback.toFixed(2))
  })
}

function normalizeBlankComparisonMode(defaultMode, judgeConfig) {
  const strategy = normalizeText(judgeConfig?.strategy)
  if (strategy === 'ordered_sequence') return 'ordered_sequence'
  if (strategy === 'unordered_set') return 'unordered_set'
  if (defaultMode) return defaultMode
  return 'text'
}

function normalizeBlankFromScalar({ key, label, value, score, analysis, comparisonMode }) {
  const scalarValue = normalizeText(value)
  if (!scalarValue) return null

  return {
    blank_id: key,
    label: label || key,
    input_mode: 'text',
    comparison_mode: comparisonMode,
    accepted_answers: [scalarValue],
    accepted_sequences: [],
    display_answer: scalarValue,
    rationale: analysis || '',
    score,
  }
}

function normalizeBlankFromArray({ key, label, value, score, analysis, comparisonMode, separatorHint }) {
  const tokens = (Array.isArray(value) ? value : [])
    .map((item) => normalizeText(item))
    .filter(Boolean)

  if (!tokens.length) return null

  if (comparisonMode === 'unordered_set') {
    return {
      blank_id: key,
      label: label || key,
      input_mode: 'text',
      comparison_mode,
      accepted_answers: [tokens.join(' / ')],
      accepted_sequences: [tokens],
      display_answer: tokens.join(' / '),
      separator_hint: separatorHint || '可用空格、逗号或箭头分隔',
      rationale: analysis || '',
      score,
    }
  }

  return {
    blank_id: key,
    label: label || key,
    input_mode: 'text',
    comparison_mode: comparisonMode || 'ordered_sequence',
    accepted_answers: [tokens.join(' ')],
    accepted_sequences: [tokens],
    display_answer: tokens.join(' '),
    separator_hint: separatorHint || '可用空格、逗号或箭头分隔',
    rationale: analysis || '',
    score,
  }
}

function normalizeFillBlankFromImport(rawQuestion, packageMeta, mode) {
  const standardAnswer = normalizeQuestionField(rawQuestion, 'standardAnswer') || {}
  const answerSpec = normalizeQuestionField(rawQuestion, 'answerSpec') || {}
  const defaultScore = getDefaultScore(normalizeQuestionField(rawQuestion, 'questionType'), mode)
  const base = normalizeBaseItem(rawQuestion, packageMeta, 'fill_blank', parseScore(rawQuestion.score, defaultScore))
  const analysis = normalizeText(rawQuestion.analysis)

  let blanks = []

  if (mode === 'multi_blank' && standardAnswer.type === 'multi_blank') {
    const specBlanks = Array.isArray(answerSpec.blanks) ? answerSpec.blanks : []
    const answerEntries = Object.entries(standardAnswer.blanks || {})
    const scores = distributeBlankScores(base.score || defaultScore, answerEntries.length)
    const comparisonMode = normalizeBlankComparisonMode('text', normalizeQuestionField(rawQuestion, 'judgeConfig'))

    blanks = answerEntries
      .map(([key, value], index) => {
        const spec = specBlanks.find((blank) => blank.key === key) || {}
        if (Array.isArray(value)) {
          return normalizeBlankFromArray({
            key,
            label: spec.label || key,
            value,
            score: scores[index],
            analysis,
            comparisonMode,
            separatorHint: spec.separatorHint,
          })
        }

        return normalizeBlankFromScalar({
          key,
          label: spec.label || key,
          value,
          score: scores[index],
          analysis,
          comparisonMode,
        })
      })
      .filter(Boolean)
  }

  if (mode === 'sequence_input' && standardAnswer.type === 'sequence_input') {
    const fields = Array.isArray(answerSpec.fields) ? answerSpec.fields : []
    const answerEntries = Object.entries(standardAnswer.fields || {})
    const scores = distributeBlankScores(base.score || defaultScore, answerEntries.length)
    const comparisonMode = normalizeBlankComparisonMode('ordered_sequence', normalizeQuestionField(rawQuestion, 'judgeConfig'))

    blanks = answerEntries
      .map(([key, value], index) => {
        const field = fields.find((item) => item.key === key) || {}
        if (Array.isArray(value)) {
          return normalizeBlankFromArray({
            key,
            label: field.label || key,
            value,
            score: scores[index],
            analysis,
            comparisonMode,
            separatorHint: field.separatorHint,
          })
        }

        return normalizeBlankFromScalar({
          key,
          label: field.label || key,
          value,
          score: scores[index],
          analysis,
          comparisonMode,
        })
      })
      .filter(Boolean)
  }

  if ((mode === 'text' || mode === 'textarea') && (standardAnswer.type === 'text' || standardAnswer.type === 'short_answer')) {
    const singleBlank = normalizeBlankFromScalar({
      key: 'blank_1',
      label: '答案',
      value: standardAnswer.value,
      score: base.score || defaultScore,
      analysis,
      comparisonMode: normalizeBlankComparisonMode('text', normalizeQuestionField(rawQuestion, 'judgeConfig')),
    })
    blanks = singleBlank ? [singleBlank] : []
  }

  if (!blanks.length) return null

  return {
    ...base,
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.display_answer),
      rationale: analysis,
    },
    score: blanks.reduce((sum, blank) => sum + (blank.score || 0), 0),
  }
}

function normalizeSubjectiveAnswerBase(rawQuestion, defaultScore) {
  const analysis = normalizeText(rawQuestion.analysis)
  return {
    type: 'subjective',
    reference_answer: '',
    alternate_answers: [],
    scoring_points: analysis ? [analysis] : [],
    ai_scoring: {
      enabled: true,
    },
  }
}

function normalizeStructuredFormQuestion(rawQuestion, packageMeta) {
  const answerSpec = normalizeQuestionField(rawQuestion, 'answerSpec') || {}
  const standardAnswer = normalizeQuestionField(rawQuestion, 'standardAnswer') || {}
  const fields = Array.isArray(answerSpec.fields)
    ? answerSpec.fields
      .filter((field) => field && normalizeText(field.key))
      .map((field) => ({
        key: String(field.key),
        label: normalizeText(field.label) || String(field.key),
        fieldType: normalizeText(field.fieldType || field.field_type || 'text') || 'text',
      }))
    : []

  if (!fields.length) return null

  const defaultScore = getDefaultScore(normalizeQuestionField(rawQuestion, 'questionType'), 'structured_form')
  const base = normalizeBaseItem(rawQuestion, packageMeta, 'structured_form', defaultScore)
  const answer = normalizeSubjectiveAnswerBase(rawQuestion, defaultScore)
  const referenceFields = standardAnswer.type === 'structured_form' && standardAnswer.fields && typeof standardAnswer.fields === 'object'
    ? standardAnswer.fields
    : {}

  return {
    ...base,
    fields,
    answer: {
      ...answer,
      reference_fields: referenceFields,
      reference_answer: formatStructuredResponse(referenceFields, fields),
    },
  }
}

function normalizeSqlQuestion(rawQuestion, packageMeta) {
  const standardAnswer = normalizeQuestionField(rawQuestion, 'standardAnswer') || {}
  const defaultScore = getDefaultScore(normalizeQuestionField(rawQuestion, 'questionType'), 'sql_editor')
  const base = normalizeBaseItem(rawQuestion, packageMeta, 'sql', defaultScore)
  const answer = normalizeSubjectiveAnswerBase(rawQuestion, defaultScore)

  const sql = normalizeText(standardAnswer.sql)
  const acceptedSql = normalizeArrayStrings(standardAnswer.acceptedSql || standardAnswer.accepted_sql)

  return {
    ...base,
    editor_placeholder: normalizeText(normalizeQuestionField(rawQuestion, 'answerSpec')?.placeholder) || '请输入 SQL 语句',
    answer: {
      ...answer,
      reference_answer: sql,
      alternate_answers: acceptedSql,
    },
  }
}

function normalizeGenericSubjectiveQuestion(rawQuestion, packageMeta) {
  const standardAnswer = normalizeQuestionField(rawQuestion, 'standardAnswer') || {}
  const answerMode = normalizeText(normalizeQuestionField(rawQuestion, 'answerMode') || 'textarea')
  const defaultScore = getDefaultScore(normalizeQuestionField(rawQuestion, 'questionType'), answerMode)
  const base = normalizeBaseItem(rawQuestion, packageMeta, 'subjective', defaultScore)
  const answer = normalizeSubjectiveAnswerBase(rawQuestion, defaultScore)

  const referenceValue = standardAnswer.type === 'text' || standardAnswer.type === 'short_answer'
    ? normalizeText(standardAnswer.value)
    : ''

  return {
    ...base,
    editor_mode: answerMode,
    editor_placeholder: normalizeText(normalizeQuestionField(rawQuestion, 'answerSpec')?.placeholder) || '请输入答案',
    answer: {
      ...answer,
      reference_answer: referenceValue,
      alternate_answers: normalizeArrayStrings(standardAnswer.acceptedValues || standardAnswer.accepted_values),
    },
  }
}

function normalizeImportQuestion(rawQuestion, packageMeta) {
  if (!rawQuestion || typeof rawQuestion !== 'object') return null

  const questionId = normalizeText(rawQuestion.id)
  if (!questionId) return null

  const questionType = normalizeText(
    normalizeQuestionField(rawQuestion, 'questionType') ||
    normalizeQuestionField(rawQuestion, 'type')
  )
  const answerMode = normalizeText(normalizeQuestionField(rawQuestion, 'answerMode'))

  if (questionType === 'single_choice' || answerMode === 'single_choice') {
    return normalizeChoiceQuestion(rawQuestion, packageMeta, 'single_choice')
  }

  if (questionType === 'multiple_choice' || answerMode === 'multiple_choice') {
    return normalizeChoiceQuestion(rawQuestion, packageMeta, 'multiple_choice')
  }

  if (questionType === 'true_false' || answerMode === 'true_false') {
    return normalizeChoiceQuestion(rawQuestion, packageMeta, 'true_false')
  }

  if (answerMode === 'multi_blank' || answerMode === 'sequence_input' || questionType === 'fill_blank') {
    const converted = normalizeFillBlankFromImport(rawQuestion, packageMeta, answerMode || 'multi_blank')
    if (converted) return converted
  }

  if (answerMode === 'structured_form') {
    return normalizeStructuredFormQuestion(rawQuestion, packageMeta)
  }

  if (questionType === 'sql' || answerMode === 'sql_editor') {
    return normalizeSqlQuestion(rawQuestion, packageMeta)
  }

  if (answerMode === 'textarea' || answerMode === 'text' || questionType === 'short_answer' || questionType === 'application') {
    return normalizeGenericSubjectiveQuestion(rawQuestion, packageMeta)
  }

  return null
}

function normalizePackageMeta(data) {
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {}
  return {
    title: normalizeText(meta.title || data.title),
    sourceType: normalizeText(meta.sourceType || meta.source_type || data.sourceType || 'manual'),
    school: normalizeText(meta.school),
    year: Number(meta.year || 0) || undefined,
    paperTitle: normalizeText(meta.paperTitle || meta.paper_title || data.title),
    paperType: normalizeText(meta.paperType || meta.paper_type),
    subjectScope: Array.isArray(meta.subjectScope || meta.subject_scope)
      ? (meta.subjectScope || meta.subject_scope).map((item) => normalizeText(item)).filter(Boolean)
      : [],
    language: normalizeText(meta.language || 'zh-CN'),
  }
}

export function isExamImportPackage(data) {
  return Boolean(
    data &&
    typeof data === 'object' &&
    (data.version || data.meta) &&
    Array.isArray(data.questions)
  )
}

export function normalizeExamImportPackage(data) {
  if (!Array.isArray(data?.questions)) {
    throw new Error('导入包必须包含 questions 数组。')
  }

  const packageMeta = normalizePackageMeta(data)
  const items = []
  let skippedCount = 0
  const skippedTypes = []

  data.questions.forEach((rawQuestion) => {
    const converted = normalizeImportQuestion(rawQuestion, packageMeta)
    if (converted) {
      items.push(converted)
      return
    }

    skippedCount += 1
    skippedTypes.push(
      normalizeText(
        normalizeQuestionField(rawQuestion, 'questionType') ||
        normalizeQuestionField(rawQuestion, 'type') ||
        normalizeQuestionField(rawQuestion, 'answerMode') ||
        'unknown'
      )
    )
  })

  if (!items.length) {
    throw new Error('导入包中没有可用题目。请检查 questionType、answerMode 和 standardAnswer。')
  }

  return {
    title: packageMeta.title || packageMeta.paperTitle || '未命名题库',
    paper_id: normalizeText(data.paper_id || data.paperId),
    items,
    compatibility: {
      sourceSchema: `exam-import@${normalizeText(data.version) || EXAM_IMPORT_SCHEMA_VERSION}`,
      supportedCount: items.length,
      skippedCount,
      skippedTypes: [...new Set(skippedTypes.filter(Boolean))],
    },
    importMeta: packageMeta,
  }
}
