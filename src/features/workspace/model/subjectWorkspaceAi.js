import {
  auditQuizQuestionCompliance,
  explainQuizQuestionWithMode,
  generateSimilarQuestions,
  gradeRelationalAlgebraAttempt,
  gradeSubjectiveAttempt,
} from '../../ai/reviewService'

export async function runSubjectiveAiReview({
  quiz,
  answers,
  objectiveScore,
  objectiveTotal,
  paperTotal,
  subjectiveTotal,
  createPendingAiReview,
}) {
  if (!quiz || subjectiveTotal <= 0) return null

  const pendingReview = createPendingAiReview(subjectiveTotal)

  const completedReview = await gradeSubjectiveAttempt({
    quiz,
    answers,
    objectiveScore,
    objectiveTotal,
    paperTotal,
    subjectivePendingTotal: subjectiveTotal,
  })

  const relationalAlgebraReview = await gradeRelationalAlgebraAttempt({
    quiz,
    answers,
    objectiveScore,
    objectiveTotal,
    paperTotal,
  })

  if (!completedReview && !relationalAlgebraReview) return pendingReview

  const questionReviews = {
    ...(completedReview?.questionReviews || {}),
    ...(relationalAlgebraReview?.questionReviews || {}),
  }

  const totalSubjectiveScore =
    Number(completedReview?.totalSubjectiveScore || 0) +
    Number(relationalAlgebraReview?.totalRelationalAlgebraScore || 0)

  return {
    ...(completedReview || pendingReview),
    status: 'completed',
    totalSubjectiveScore,
    totalScore: objectiveScore + totalSubjectiveScore,
    questionReviews,
    weaknessSummary: [
      ...(completedReview?.weaknessSummary || []),
      ...(relationalAlgebraReview?.weaknessSummary || []),
    ],
    overallComment: [completedReview?.overallComment, relationalAlgebraReview?.overallComment]
      .filter(Boolean)
      .join(' '),
    relationalAlgebraReviews: relationalAlgebraReview?.relationalAlgebraReviews || [],
    totalMaxScore: Number(relationalAlgebraReview?.totalMaxScore || 0),
  }
}

export async function runExplainQuestionAi({
  mode,
  aiExplainMode,
  quiz,
  answers,
  item,
  subQuestion = null,
  focus = 'general',
}) {
  if (!quiz || !item) return null

  if (mode === 'exam') {
    return auditQuizQuestionCompliance({
      paperTitle: quiz.title,
      item,
      response: answers[item.id],
      subQuestion,
    })
  }

  return explainQuizQuestionWithMode({
    paperTitle: quiz.title,
    item,
    response: answers[item.id],
    subQuestion,
    mode: aiExplainMode,
    focus,
  })
}

export async function runSimilarQuestionsAi({ quiz, answers, item }) {
  if (!quiz || !item) return null

  return generateSimilarQuestions({
    paperTitle: quiz.title,
    item,
    response: answers[item.id],
  })
}
