import { ensureQuestionBase, parseScore } from './helpers'
import {
  normalizeFillBlankQuestion,
  normalizeMultipleChoiceQuestion,
  normalizeSingleChoiceQuestion,
  normalizeTrueFalseQuestion,
} from './objectiveNormalizers'
import {
  normalizeEssayQuestion,
  normalizeGenericSubjectiveQuestion,
  normalizeTranslationQuestion,
} from './subjectiveNormalizers'

const COMPOSITE_CHILD_NORMALIZERS = {
  single_choice: (question) => normalizeSingleChoiceQuestion(question),
  multiple_choice: (question) => normalizeMultipleChoiceQuestion(question),
  true_false: (question) => normalizeTrueFalseQuestion(question),
  fill_blank: (question) => normalizeFillBlankQuestion(question),
  function_fill_blank: (question) =>
    normalizeFillBlankQuestion(
      { ...question, type: 'function_fill_blank' },
      {
        normalizedType: 'fill_blank',
        baseType: 'function_fill_blank',
      }
    ),
  translation: (question) => normalizeTranslationQuestion(question),
  essay: (question) => normalizeEssayQuestion(question),
  short_answer: (question) => normalizeGenericSubjectiveQuestion(question, 'short_answer'),
  case_analysis: (question) => normalizeGenericSubjectiveQuestion(question, 'case_analysis'),
  calculation: (question) => normalizeGenericSubjectiveQuestion(question, 'calculation'),
  operation: (question) => normalizeGenericSubjectiveQuestion(question, 'operation'),
  programming: (question) => normalizeGenericSubjectiveQuestion(question, 'short_answer'),
  sql: (question) => normalizeGenericSubjectiveQuestion(question, 'short_answer'),
  er_diagram: (question) => normalizeGenericSubjectiveQuestion(question, 'short_answer'),
}

function normalizeCompositeMaterialMeta(question) {
  return {
    material_title: question.material_title || question.context_title || question.title || '',
    material:
      question.material ||
      question.context ||
      question.case_material ||
      question.material_body ||
      question.body ||
      '',
    material_format:
      question.material_format ||
      question.context_format ||
      question.presentation ||
      'plain',
    presentation:
      question.presentation ||
      question.material_format ||
      question.context_format ||
      'plain',
    deliverable_type: question.deliverable_type || '',
  }
}

function attachCompositeContext(childQuestion, compositeQuestion, childIndex) {
  const normalizeChildQuestion = COMPOSITE_CHILD_NORMALIZERS[childQuestion?.type]
  if (!normalizeChildQuestion) return null

  const normalizedChild = normalizeChildQuestion({
    ...childQuestion,
    id: childQuestion?.id || `${compositeQuestion.id}_sub_${childIndex + 1}`,
  })

  if (!normalizedChild) return null

  const materialMeta = normalizeCompositeMaterialMeta(compositeQuestion)

  return {
    ...normalizedChild,
    composite_context: {
      composite_id: compositeQuestion.id,
      composite_prompt: compositeQuestion.prompt || compositeQuestion.title || '综合题',
      ...materialMeta,
    },
  }
}

export function normalizeCompositeQuestion(question) {
  if (!Array.isArray(question?.questions) || !question.questions.length) return null

  const normalizedQuestions = question.questions
    .map((childQuestion, index) => attachCompositeContext(childQuestion, question, index))
    .filter(Boolean)

  if (!normalizedQuestions.length) return null

  const aggregatedScore = normalizedQuestions.reduce(
    (sum, childQuestion) => sum + parseScore(childQuestion.score, 0),
    0
  )

  return {
    ...ensureQuestionBase(question, 'composite', aggregatedScore),
    prompt: question.prompt || question.title || '综合题',
    ...normalizeCompositeMaterialMeta(question),
    questions: normalizedQuestions,
    answer: {
      type: 'composite',
    },
    score: aggregatedScore,
  }
}
