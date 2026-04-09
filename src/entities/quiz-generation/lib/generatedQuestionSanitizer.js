import { normalizeQuestionTypeKey } from '../../subject/model/subjects.js'

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
        const match = option.match(/^([A-Z])(?:[\.\s、，．)]*)\s*(.*)$/)
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

export function sanitizeGeneratedQuestion(rawQuestion, planItem) {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    return null
  }

  const targetType = normalizeQuestionTypeKey(planItem?.typeKey)
  const questionType = normalizeQuestionTypeKey(rawQuestion.type || targetType)
  const normalizedType = questionType || targetType

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

  question.answer = normalizeAnswerShape(rawQuestion, normalizedType)
  return question
}
