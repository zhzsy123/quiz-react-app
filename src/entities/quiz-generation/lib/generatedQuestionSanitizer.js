import { getQuestionTypeMeta, normalizeQuestionTypeKey } from '../../subject/model/subjects.js'
import {
  buildFallbackClozeArticle,
  getClozeBlankId,
  getClozeRawBlanks,
} from '../../quiz/lib/clozeHelpers.js'

export const OBJECTIVE_GENERATION_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'function_fill_blank',
  'cloze',
  'reading',
])

function normalizeOptionList(options) {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option === 'string') {
        const match = option.match(/^([A-Z])(?:[\.\s、，：:）\)]*)\s*(.*)$/)
        if (match) {
          return { key: match[1], text: match[2] || match[1] }
        }

        return { key: String.fromCharCode(65 + index), text: option }
      }

      return {
        key: option?.key || String.fromCharCode(65 + index),
        text: option?.text || option?.label || option?.value || '',
      }
    })
  }

  if (!options || typeof options !== 'object') {
    return []
  }

  return Object.entries(options)
    .map(([key, value]) => ({
      key,
      text: typeof value === 'string' ? value : value?.text || value?.label || value?.value || '',
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
}

function normalizeCorrectValue(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return normalized

    if (/[,/、，\s]+/.test(normalized)) {
      return [...new Set(normalized.split(/[,/、，\s]+/).map((item) => item.trim()).filter(Boolean))].sort()
    }

    return normalized
  }

  return value
}

function normalizeSubjectiveReference(question = {}) {
  return (
    question?.reference_answer ||
    question?.referenceAnswer ||
    question?.sample_answer ||
    question?.sampleAnswer ||
    question?.standard_answer ||
    question?.standardAnswer ||
    ''
  )
}

function normalizeAnswerShape(question, typeKey) {
  const topLevelCorrect =
    question?.correct_answer ??
    question?.correctAnswer ??
    question?.correct_option ??
    question?.correctOption ??
    question?.correct
  const topLevelReference = normalizeSubjectiveReference(question)

  if (question?.answer && typeof question.answer === 'object' && !Array.isArray(question.answer)) {
    const correctValue = normalizeCorrectValue(question.answer.correct ?? question.answer.answer ?? topLevelCorrect)
    return {
      ...question.answer,
      type: question.answer.type || (OBJECTIVE_GENERATION_TYPES.has(typeKey) ? 'objective' : 'subjective'),
      correct: correctValue,
      reference_answer:
        question.answer.reference_answer ?? question.answer.referenceAnswer ?? topLevelReference,
      rationale: question.answer.rationale ?? question.rationale ?? '',
      scoring_points: question.answer.scoring_points ?? question.scoring_points ?? [],
      scoring_rubric: question.answer.scoring_rubric ?? question.scoring_rubric ?? null,
    }
  }

  if (typeof question?.answer === 'string' || Array.isArray(question?.answer)) {
    if (OBJECTIVE_GENERATION_TYPES.has(typeKey)) {
      return {
        type: 'objective',
        correct: normalizeCorrectValue(question.answer),
        rationale: question.rationale || '',
      }
    }

    return {
      type: 'subjective',
      reference_answer: Array.isArray(question.answer) ? question.answer.join(' / ') : question.answer,
      scoring_points: question.scoring_points || [],
      rationale: question.rationale || '',
    }
  }

  if (OBJECTIVE_GENERATION_TYPES.has(typeKey)) {
    return {
      type: 'objective',
      correct: normalizeCorrectValue(topLevelCorrect),
      rationale: question?.rationale || '',
    }
  }

  return {
    type: 'subjective',
    reference_answer: topLevelReference || '',
    scoring_points: question?.scoring_points || [],
    scoring_rubric: question?.scoring_rubric || null,
    rationale: question?.rationale || '',
  }
}

function sanitizeObjectiveChild(rawQuestion = {}, fallbackType = 'single_choice') {
  const type = normalizeQuestionTypeKey(rawQuestion.type || fallbackType)
  return {
    ...rawQuestion,
    id: rawQuestion.id || `sub_${Date.now()}`,
    type,
    prompt: rawQuestion.prompt || rawQuestion.title || '',
    score: Number(rawQuestion.score) > 0 ? Number(rawQuestion.score) : 2,
    options: normalizeOptionList(rawQuestion.options || rawQuestion.choices || rawQuestion.selections),
    answer: normalizeAnswerShape(rawQuestion, type),
  }
}

function sanitizeClozeBlank(blank = {}, index = 0, defaultScore = 2) {
  const correct =
    blank?.answer?.correct ??
    blank?.answer?.answer ??
    blank?.correct_answer ??
    blank?.correctAnswer ??
    blank?.correct_option ??
    blank?.correctOption ??
    blank?.correct ??
    ''

  return {
    blank_id: getClozeBlankId(blank, index),
    score: Number(blank?.score) > 0 ? Number(blank.score) : defaultScore,
    options: normalizeOptionList(blank?.options || blank?.choices || blank?.selections),
    correct: normalizeCorrectValue(correct),
    rationale: blank?.rationale || blank?.answer?.rationale || '暂无解析',
    prompt: blank?.prompt || blank?.title || blank?.stem || blank?.sentence || '',
  }
}

function sanitizeRelationalAlgebraSchema(schema = {}) {
  if (!schema || typeof schema !== 'object') return null

  const attributes = Array.isArray(schema.attributes)
    ? schema.attributes
    : Array.isArray(schema.fields)
      ? schema.fields
      : Array.isArray(schema.columns)
        ? schema.columns
        : []

  return {
    name: schema.name || schema.table || schema.relation || '',
    attributes: [...new Set(attributes.map((attribute) => String(attribute || '').trim()).filter(Boolean))],
  }
}

function sanitizeRelationalAlgebraSubquestion(subquestion = {}, index = 0, defaultScore = 5) {
  if (!subquestion || typeof subquestion !== 'object') return null

  return {
    id: String(subquestion.id || index + 1),
    label: subquestion.label || `（${index + 1}）`,
    prompt: subquestion.prompt || subquestion.stem || subquestion.title || '',
    score: Number(subquestion.score) > 0 ? Number(subquestion.score) : defaultScore,
    reference_answer:
      subquestion.reference_answer ||
      subquestion.referenceAnswer ||
      subquestion.answer?.reference_answer ||
      subquestion.answer?.referenceAnswer ||
      subquestion.standard_answer ||
      subquestion.standardAnswer ||
      '',
  }
}

export function sanitizeGeneratedQuestion(rawQuestion, planItem) {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    return null
  }

  const targetType = normalizeQuestionTypeKey(planItem?.typeKey)
  const questionType = normalizeQuestionTypeKey(rawQuestion.type || targetType)
  const normalizedTypeMeta = getQuestionTypeMeta(questionType)
  const normalizedType =
    normalizedTypeMeta?.supportsGeneration === false && targetType ? targetType : questionType || targetType

  const question = {
    ...rawQuestion,
    id: rawQuestion.id || `gq_${planItem?.index || Date.now()}`,
    type: normalizedType,
    prompt: rawQuestion.prompt || rawQuestion.title || '',
    score: Number(rawQuestion.score) > 0 ? Number(rawQuestion.score) : planItem?.score,
    options: normalizeOptionList(rawQuestion.options || rawQuestion.choices || rawQuestion.selections),
  }

  if (normalizedType === 'reading') {
    const passagePayload = rawQuestion.passage && typeof rawQuestion.passage === 'object' ? rawQuestion.passage : null
    question.passage =
      typeof rawQuestion.passage === 'string'
        ? { title: rawQuestion.title || rawQuestion.prompt || '阅读材料', content: rawQuestion.passage }
        : {
            ...passagePayload,
            title: rawQuestion.title || rawQuestion.prompt || '阅读材料',
            content: rawQuestion.article || rawQuestion.content || rawQuestion.body || '',
          }

    if (passagePayload && !question.passage?.content) {
      question.passage = {
        ...question.passage,
        title: question.passage?.title || passagePayload.title || rawQuestion.title || rawQuestion.prompt || '阅读材料',
        content: passagePayload.content || passagePayload.body || passagePayload.text || '',
      }
    }

    question.questions = (
      rawQuestion.questions ||
      rawQuestion.sub_questions ||
      rawQuestion.subQuestions ||
      []
    ).map((subQuestion, subIndex) =>
      sanitizeObjectiveChild(
        {
          ...subQuestion,
          id: subQuestion?.id || `${question.id}_${subIndex + 1}`,
          score: Number(subQuestion?.score) > 0 ? Number(subQuestion.score) : 2.5,
        },
        'single_choice'
      )
    )
  }

  if (normalizedType === 'cloze') {
    const rawBlanks = getClozeRawBlanks(rawQuestion)
    const totalScore = Number(question.score) > 0 ? Number(question.score) : Number(planItem?.score) || 0
    const defaultBlankScore =
      rawBlanks.length > 0 && totalScore > 0 ? Math.max(1, totalScore / rawBlanks.length) : 2

    question.title = rawQuestion.title || rawQuestion.prompt || '完形填空'
    question.article = buildFallbackClozeArticle(rawQuestion, rawBlanks)
    question.blanks = rawBlanks
      .map((blank, index) =>
        sanitizeClozeBlank(
          blank,
          index,
          Number(blank?.score) > 0 ? Number(blank.score) : defaultBlankScore
        )
      )
      .filter((blank) => blank.options.length > 0 && blank.correct)
  }

  if (normalizedType === 'translation') {
    question.source_text =
      rawQuestion.source_text ||
      rawQuestion.sourceText ||
      rawQuestion.text ||
      rawQuestion.content ||
      rawQuestion.body ||
      rawQuestion.prompt
  }

  if (normalizedType === 'fill_blank' || normalizedType === 'function_fill_blank') {
    question.blanks = (rawQuestion.blanks || rawQuestion.answers || rawQuestion.items || []).map((blank, index) => ({
      blank_id: blank?.blank_id || blank?.id || index + 1,
      accepted_answers:
        Array.isArray(blank?.accepted_answers)
          ? blank.accepted_answers
          : Array.isArray(blank?.answers)
            ? blank.answers
            : [blank?.answer || blank?.correct || ''],
      score: Number(blank?.score) > 0 ? Number(blank.score) : question.score || planItem?.score || 1,
      rationale: blank?.rationale || '',
    }))
  }

  if (normalizedType === 'composite') {
    question.material = rawQuestion.material || rawQuestion.context || rawQuestion.passage || ''
    question.material_format =
      rawQuestion.material_format || rawQuestion.materialFormat || rawQuestion.response_format || 'plain'
    question.questions = (rawQuestion.questions || rawQuestion.sub_questions || []).map((childQuestion, index) =>
      sanitizeGeneratedQuestion(
        {
          ...childQuestion,
          id: childQuestion?.id || `${question.id}_${index + 1}`,
        },
        {
          typeKey: normalizeQuestionTypeKey(childQuestion?.type || 'short_answer'),
          score: Number(childQuestion?.score) > 0 ? Number(childQuestion.score) : 5,
          index: index + 1,
        }
      )
    )
  }

  if (normalizedType === 'relational_algebra') {
    const schemas = (
      rawQuestion.schemas ||
      rawQuestion.relations ||
      rawQuestion.schema_definitions ||
      []
    )
      .map((schema) => sanitizeRelationalAlgebraSchema(schema))
      .filter((schema) => schema?.name && schema.attributes.length > 0)

    const subquestions = (
      rawQuestion.subquestions ||
      rawQuestion.questions ||
      rawQuestion.items ||
      []
    )
      .map((subquestion, index) =>
        sanitizeRelationalAlgebraSubquestion(
          subquestion,
          index,
          Number(rawQuestion.score) > 0 && Array.isArray(rawQuestion.subquestions || rawQuestion.questions || rawQuestion.items)
            ? Number(rawQuestion.score) / (rawQuestion.subquestions || rawQuestion.questions || rawQuestion.items).length
            : 5
        )
      )
      .filter((subquestion) => subquestion?.prompt)

    question.schemas = schemas
    question.subquestions = subquestions
    question.questions = subquestions
    question.tooling = {
      symbols: ['Π', 'σ', '⋈', '∪', '∩', '-', '÷', 'ρ', 'AND', 'OR', '=', '!=', '>', '<', '>=', '<='],
      wrap_symbols: ['Π', 'σ', '⋈', '∪', '∩', '-', '÷', 'ρ'],
      default_join_symbol: '⋈',
      ...(rawQuestion.tooling && typeof rawQuestion.tooling === 'object' ? rawQuestion.tooling : {}),
    }
    question.answer_mode = rawQuestion.answer_mode || rawQuestion.answerMode || 'per_subquestion_expression'
  }

  question.answer = normalizeAnswerShape(rawQuestion, normalizedType)
  return question
}
