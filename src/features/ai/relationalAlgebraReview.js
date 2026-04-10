import { requestAiJson } from '../../shared/api/aiGateway.js'
import {
  getRelationalAlgebraResponseText,
  getRelationalAlgebraSubquestions,
  normalizeRelationalAlgebraExpression,
  normalizeRelationalAlgebraQuestion,
} from '../../entities/quiz/lib/relationalAlgebraNormalize'

export function buildRelationalAlgebraReviewMap(reviews = []) {
  return reviews.reduce((map, review) => {
    const reviewKey = review?.question_id || review?.subquestion_id
    if (!reviewKey) return map
    const maxScore = Number(review.max_score) || 0
    const score = Number(review.score) || 0
    const derivedCompletion =
      typeof review.completion === 'number'
        ? review.completion
        : maxScore > 0
          ? Math.round((score / maxScore) * 100)
          : 0

    map[reviewKey] = {
      status: review.status || 'completed',
      questionId: reviewKey,
      subquestionId: review.subquestion_id || reviewKey,
      score,
      maxScore,
      verdict: review.verdict || 'incorrect',
      equivalent: Boolean(review.equivalent),
      completion: Math.max(0, Math.min(100, Number(derivedCompletion) || 0)),
      confidence: Math.max(0, Math.min(100, Number(review.confidence) || 0)),
      feedback: review.comment || '',
      strengths: Array.isArray(review.earned_points)
        ? review.earned_points
        : Array.isArray(review.strengths)
          ? review.strengths
          : [],
      weaknesses: Array.isArray(review.missing_points) ? review.missing_points : [],
      suggestions: Array.isArray(review.error_points) ? review.error_points : [],
      earned_points: Array.isArray(review.earned_points)
        ? review.earned_points
        : Array.isArray(review.strengths)
          ? review.strengths
          : [],
      missing_points: Array.isArray(review.missing_points) ? review.missing_points : [],
      error_points: Array.isArray(review.error_points) ? review.error_points : [],
      normalizedReference: review.normalized_reference || '',
      normalizedUserAnswer: review.normalized_user_answer || '',
      answerText: review.answer_text || '',
    }
    return map
  }, {})
}

function resolveRelationalAlgebraSubquestionScore(subQuestion = {}, fallbackScore = 0) {
  const explicitScore = Number(subQuestion.score)
  if (Number.isFinite(explicitScore) && explicitScore > 0) return explicitScore
  return Number(fallbackScore) || 0
}

function buildRelationalAlgebraQuestionTarget(item, subQuestion, userAnswer) {
  const normalizedItem = normalizeRelationalAlgebraQuestion(item) || item || {}
  const normalizedReference = normalizeRelationalAlgebraExpression(
    subQuestion?.reference_answer || subQuestion?.answer || subQuestion?.correct_answer || ''
  )
  const normalizedUserAnswer = normalizeRelationalAlgebraExpression(userAnswer || '')

  return {
    question_id: `${normalizedItem.id || item?.id || 'relational-algebra'}:${subQuestion.id}`,
    type: 'relational_algebra',
    prompt: subQuestion.prompt || '',
    score: resolveRelationalAlgebraSubquestionScore(
      subQuestion,
      normalizedItem.score && normalizedItem.subquestions?.length
        ? normalizedItem.score / normalizedItem.subquestions.length
        : normalizedItem.score || 0
    ),
    schemas: Array.isArray(normalizedItem.schemas) ? normalizedItem.schemas : [],
    tooling: normalizedItem.tooling || {},
    subquestion: {
      id: subQuestion.id,
      label: subQuestion.label || '',
      prompt: subQuestion.prompt || '',
      score: resolveRelationalAlgebraSubquestionScore(
        subQuestion,
        normalizedItem.score && normalizedItem.subquestions?.length
          ? normalizedItem.score / normalizedItem.subquestions.length
          : normalizedItem.score || 0
      ),
      reference_answer: normalizedReference,
    },
    user_answer: userAnswer || '',
    normalized_reference_answer: normalizedReference,
    normalized_user_answer: normalizedUserAnswer,
  }
}

function resolveRelationalAlgebraVerdict(verdict, equivalent, score, maxScore) {
  if (['correct', 'partial', 'incorrect', 'unanswered'].includes(verdict)) return verdict
  if (equivalent) return 'correct'
  if (Number(score) > 0 && Number(score) < Number(maxScore)) return 'partial'
  return 'incorrect'
}

function buildRelationalAlgebraReviewRecord({ target, subQuestion, content, model, status = 'completed' }) {
  const maxScore = Number(content?.max_score) || resolveRelationalAlgebraSubquestionScore(subQuestion, target.score || 0)
  const score = Math.max(0, Math.min(Number(content?.score) || 0, maxScore))
  const equivalent = Boolean(content?.equivalent)
  const earnedPoints = Array.isArray(content?.earned_points)
    ? content.earned_points
    : Array.isArray(content?.strengths)
      ? content.strengths
      : []
  const completion =
    typeof content?.completion === 'number'
      ? content.completion
      : maxScore > 0
        ? Math.round((score / maxScore) * 100)
        : 0

  return {
    status,
    question_id: target.question_id,
    subquestion_id: subQuestion.id,
    verdict: resolveRelationalAlgebraVerdict(content?.verdict, equivalent, score, maxScore),
    equivalent,
    score,
    max_score: maxScore,
    completion: Math.max(0, Math.min(100, Number(completion) || 0)),
    confidence: Math.max(0, Math.min(100, Number(content?.confidence) || 0)),
    earned_points: earnedPoints,
    strengths: earnedPoints,
    missing_points: Array.isArray(content?.missing_points) ? content.missing_points : [],
    error_points: Array.isArray(content?.error_points) ? content.error_points : [],
    comment: content?.comment || '',
    normalized_reference: target.normalized_reference_answer,
    normalized_user_answer: target.normalized_user_answer,
    answer_text: target.user_answer,
    provider: 'deepseek',
    model,
  }
}

async function requestRelationalAlgebraReview({
  quiz,
  subject,
  target,
  objectiveScore = 0,
  objectiveTotal = 0,
  paperTotal = 0,
}) {
  return requestAiJson({
    feature: 'relational_algebra_grading',
    title: quiz?.title || 'Untitled paper',
    subject: subject || quiz?.subject || 'database_principles',
    temperature: 0.1,
    systemPrompt:
      '你是一名数据库原理考试中的关系代数判题老师。只返回 JSON。请严格围绕当前小题判断学生表达式与参考答案是否语义等价。忽略空格、换行、常见运算符别名和括号风格差异。comment、earned_points、missing_points、error_points 必须使用中文。',
    userPrompt: JSON.stringify(
      {
        task: 'judge_relational_algebra_equivalence',
        paper_title: quiz?.title || 'Untitled paper',
        scoring_context: {
          objective_score: objectiveScore,
          objective_total: objectiveTotal,
          paper_total: paperTotal,
        },
        question: target,
        equivalence_rules: [
          '将 π/Π/PROJECT/PI 视为等价投影符号。',
          '将 σ/Σ/SELECT/SIGMA 视为等价选择符号。',
          '将 ρ/RENAME 视为等价重命名符号。',
          '将 ⋈/JOIN/∞/⨝ 视为等价连接符号。',
          '将 ∪/UNION、∩/INTERSECT、÷/DIVIDE、∨/OR、¬/NOT、^/AND 视为等价别名。',
          '忽略空格、换行、全角半角和括号风格差异。',
          '只判断当前小题，不要评价其他小题。',
          '完成度表示学生答案逼近正确答案的程度，取值 0-100。',
          'earned_points 应该描述学生已经答对的关键得分点。',
          '如果学生答案核心语义正确但有次要缺失，可以给 partial。',
        ],
        output_schema: {
          verdict: 'correct | partial | incorrect',
          equivalent: 'boolean',
          score: 'number',
          max_score: 'number',
          completion: 'number(0-100)',
          confidence: 'number(0-100)',
          earned_points: ['中文字符串'],
          missing_points: ['中文字符串'],
          error_points: ['中文字符串'],
          comment: '中文字符串',
        },
      },
      null,
      2
    ),
  })
}

export async function gradeRelationalAlgebraAttempt({
  quiz,
  answers = {},
  objectiveScore = 0,
  objectiveTotal = 0,
  paperTotal = 0,
}) {
  const relationalAlgebraItems = (quiz?.items || []).filter((item) => item?.type === 'relational_algebra')

  if (!relationalAlgebraItems.length) {
    return {
      status: 'completed',
      provider: 'deepseek',
      questionReviews: {},
      totalRelationalAlgebraScore: 0,
      totalScore: objectiveScore,
      overallComment: '本次没有可判定的关系代数题。',
      weaknessSummary: [],
    }
  }

  const reviewRecords = []

  for (const item of relationalAlgebraItems) {
    const normalizedItem = normalizeRelationalAlgebraQuestion(item) || item
    const subquestions = getRelationalAlgebraSubquestions(normalizedItem)
    const itemResponse = answers?.[item.id]

    for (const subQuestion of subquestions) {
      const userAnswer = getRelationalAlgebraResponseText(itemResponse, item.id, subQuestion.id)
      const trimmedAnswer = String(userAnswer || '').trim()
      const target = buildRelationalAlgebraQuestionTarget(normalizedItem, subQuestion, trimmedAnswer)

      if (!trimmedAnswer) {
        reviewRecords.push({
          status: 'completed',
          question_id: target.question_id,
          subquestion_id: subQuestion.id,
          verdict: 'unanswered',
          equivalent: false,
          score: 0,
          max_score: resolveRelationalAlgebraSubquestionScore(subQuestion, normalizedItem.score || 0),
          completion: 0,
          confidence: 100,
          earned_points: [],
          missing_points: ['未提供作答内容'],
          error_points: [],
          comment: '未作答，无法判题。',
          normalized_reference: normalizeRelationalAlgebraExpression(subQuestion.reference_answer || ''),
          normalized_user_answer: '',
          answer_text: '',
        })
        continue
      }

      const { content, model } = await requestRelationalAlgebraReview({
        quiz,
        subject: quiz?.subject || item?.subject || 'database_principles',
        target,
        objectiveScore,
        objectiveTotal,
        paperTotal,
      })

      reviewRecords.push(buildRelationalAlgebraReviewRecord({ target, subQuestion, content, model }))
    }
  }

  const reviewMap = buildRelationalAlgebraReviewMap(reviewRecords)
  const totalRelationalAlgebraScore = Object.values(reviewMap).reduce(
    (sum, review) => sum + (Number(review.score) || 0),
    0
  )
  const totalMaxScore = Object.values(reviewMap).reduce((sum, review) => sum + (Number(review.maxScore) || 0), 0)

  return {
    status: 'completed',
    provider: 'deepseek',
    reviewedAt: Date.now(),
    totalRelationalAlgebraScore,
    totalScore: objectiveScore + totalRelationalAlgebraScore,
    overallComment:
      reviewRecords.length > 0
        ? reviewRecords
            .map((review) =>
              `${review.subquestion_id}：${
                review.comment || (review.equivalent ? '表达式与参考答案语义等价。' : '表达式与参考答案语义不等价。')
              }`
            )
            .join(' ')
        : '本次没有可判定的关系代数题。',
    weaknessSummary: reviewRecords.filter((review) => !review.equivalent).flatMap((review) => review.error_points || []),
    questionReviews: reviewMap,
    relationalAlgebraReviews: reviewRecords,
    totalMaxScore,
  }
}

export async function gradeRelationalAlgebraSubquestionAttempt({
  quiz,
  item,
  subQuestion,
  userAnswer,
  objectiveScore = 0,
  objectiveTotal = 0,
  paperTotal = 0,
}) {
  const normalizedItem = normalizeRelationalAlgebraQuestion(item) || item
  const target = buildRelationalAlgebraQuestionTarget(normalizedItem, subQuestion, userAnswer)
  const trimmedAnswer = String(userAnswer || '').trim()

  if (!trimmedAnswer) {
    return buildRelationalAlgebraReviewMap([
      {
        status: 'completed',
        question_id: target.question_id,
        subquestion_id: subQuestion.id,
        verdict: 'unanswered',
        equivalent: false,
        score: 0,
        max_score: resolveRelationalAlgebraSubquestionScore(subQuestion, normalizedItem.score || 0),
        completion: 0,
        confidence: 100,
        earned_points: [],
        missing_points: ['未提供作答内容'],
        error_points: [],
        comment: '未作答，无法判题。',
        normalized_reference: target.normalized_reference_answer,
        normalized_user_answer: '',
        answer_text: '',
      },
    ])[target.question_id]
  }

  const { content, model } = await requestRelationalAlgebraReview({
    quiz,
    subject: quiz?.subject || item?.subject || 'database_principles',
    target,
    objectiveScore,
    objectiveTotal,
    paperTotal,
  })

  return buildRelationalAlgebraReviewMap([
    buildRelationalAlgebraReviewRecord({ target, subQuestion, content, model }),
  ])[target.question_id]
}
