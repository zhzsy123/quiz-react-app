import { isObjectiveAnswered, isObjectiveGradable, isObjectiveResponseCorrect } from './objectiveAnswers.js'

export const MANUAL_JUDGE_CORRECT = 'correct'
export const MANUAL_JUDGE_WRONG = 'wrong'

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function sumBlankScores(blanks = []) {
  return (Array.isArray(blanks) ? blanks : []).reduce((sum, blank) => sum + Number(blank?.score || 0), 0)
}

function getReviewVerdict(review) {
  const verdict = String(review?.verdict || '').trim().toLowerCase()
  if (verdict === 'correct') return MANUAL_JUDGE_CORRECT
  if (['incorrect', 'partially_correct'].includes(verdict)) return MANUAL_JUDGE_WRONG
  return null
}

export function normalizeManualJudgeMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value).reduce((result, [key, verdict]) => {
    if (verdict === MANUAL_JUDGE_CORRECT || verdict === MANUAL_JUDGE_WRONG) {
      result[String(key)] = verdict
    }
    return result
  }, {})
}

export function getManualJudgeKey(item, subQuestion = null) {
  if (!item?.id) return ''
  const subQuestionId =
    typeof subQuestion === 'string' || typeof subQuestion === 'number' ? subQuestion : subQuestion?.id
  return subQuestionId ? `${item.id}:${subQuestionId}` : String(item.id)
}

export function getJudgeTargetMaxScore(item, subQuestion = null) {
  const target = subQuestion || item
  if (!target) return 0

  if (target.type === 'fill_blank' || target.type === 'function_fill_blank' || target.type === 'cloze') {
    return sumBlankScores(target.blanks)
  }

  return Number(target.score || 0)
}

export function isJudgeTargetAnswered({ item, response, subQuestion = null }) {
  const target = subQuestion || item
  if (!target) return false

  if (item?.type === 'reading' && subQuestion) {
    return isNonEmptyText(response)
  }

  if (item?.type === 'relational_algebra' && subQuestion) {
    return isNonEmptyText(response)
  }

  if (target.answer?.type === 'subjective') {
    if (typeof response === 'string') return isNonEmptyText(response)
    return isNonEmptyText(response?.text)
  }

  return isObjectiveAnswered(target, response)
}

export function getJudgeTargetSystemVerdict({ item, response, subQuestion = null, questionReview = null }) {
  const target = subQuestion || item
  if (!target) return null

  if (subQuestion && item?.type === 'reading') {
    if (!isNonEmptyText(response) || !isObjectiveGradable(subQuestion)) return null
    return response === subQuestion.answer?.correct ? MANUAL_JUDGE_CORRECT : MANUAL_JUDGE_WRONG
  }

  if (item?.type === 'relational_algebra' && subQuestion) {
    return getReviewVerdict(questionReview)
  }

  if (target.answer?.type === 'subjective') {
    return getReviewVerdict(questionReview)
  }

  if (!isJudgeTargetAnswered({ item, response, subQuestion }) || !isObjectiveGradable(target)) {
    return null
  }

  return isObjectiveResponseCorrect(target, response) ? MANUAL_JUDGE_CORRECT : MANUAL_JUDGE_WRONG
}

export function resolvePracticeJudge({
  manualJudgeMap = {},
  item,
  response,
  subQuestion = null,
  questionReview = null,
}) {
  const key = getManualJudgeKey(item, subQuestion)
  const normalizedMap = normalizeManualJudgeMap(manualJudgeMap)
  const answered = isJudgeTargetAnswered({ item, response, subQuestion })
  const systemVerdict = getJudgeTargetSystemVerdict({ item, response, subQuestion, questionReview })
  const manualVerdict = answered ? normalizedMap[key] || null : null
  const effectiveVerdict = manualVerdict || systemVerdict

  return {
    key,
    answered,
    maxScore: getJudgeTargetMaxScore(item, subQuestion),
    systemVerdict,
    manualVerdict,
    effectiveVerdict,
    overridden: Boolean(manualVerdict),
    isJudged: effectiveVerdict === MANUAL_JUDGE_CORRECT || effectiveVerdict === MANUAL_JUDGE_WRONG,
    isCorrect: effectiveVerdict === MANUAL_JUDGE_CORRECT,
    isWrong: effectiveVerdict === MANUAL_JUDGE_WRONG,
  }
}
