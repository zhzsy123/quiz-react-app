import {
  auditQuizQuestionCompliance,
  explainQuizQuestionWithMode,
  generateSimilarQuestions,
  gradeRelationalAlgebraAttempt,
  gradeRelationalAlgebraSubquestionAttempt,
  gradeSingleSubjectiveQuestionAttempt,
  gradeSubjectiveAttempt,
} from '../../ai/reviewService'
import { createPendingAiReview as createWorkspacePendingAiReview } from './subjectWorkspaceObjective.js'

export async function runSubjectiveAiReview({
  quiz,
  answers,
  objectiveScore,
  objectiveTotal,
  paperTotal,
  subjectiveTotal,
  subjectivePendingTotal,
  createPendingAiReview,
}) {
  const resolvedSubjectiveTotal = Number(subjectiveTotal ?? subjectivePendingTotal ?? 0)
  if (!quiz || resolvedSubjectiveTotal <= 0) return null

  const buildPendingReview =
    typeof createPendingAiReview === 'function' ? createPendingAiReview : createWorkspacePendingAiReview
  const pendingReview = buildPendingReview(resolvedSubjectiveTotal)

  const completedReview = await gradeSubjectiveAttempt({
    quiz,
    answers,
    objectiveScore,
    objectiveTotal,
    paperTotal,
    subjectivePendingTotal: resolvedSubjectiveTotal,
  })

  const relationalAlgebraReview =
    typeof gradeRelationalAlgebraAttempt === 'function'
      ? await gradeRelationalAlgebraAttempt({
          quiz,
          answers,
          objectiveScore,
          objectiveTotal,
          paperTotal,
        })
      : null

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
  aiExplainMode,
  quiz,
  answers,
  item,
  subQuestion = null,
  focus = 'general',
}) {
  if (!quiz || !item) return null

  return explainQuizQuestionWithMode({
    paperTitle: quiz.title,
    item,
    response: answers[item.id],
    subQuestion,
    mode: aiExplainMode,
    focus,
  })
}

export async function runAuditQuestionAi({
  quiz,
  answers,
  item,
  subQuestion = null,
}) {
  if (!quiz || !item) return null

  return auditQuizQuestionCompliance({
    paperTitle: quiz.title,
    item,
    response: answers[item.id],
    subQuestion,
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

export async function runRelationalAlgebraSubquestionAi({
  quiz,
  item,
  answers,
  subQuestion,
  objectiveScore = 0,
  objectiveTotal = 0,
  paperTotal = 0,
}) {
  if (!quiz || !item || !subQuestion) return null

  return gradeRelationalAlgebraSubquestionAttempt({
    quiz,
    item,
    subQuestion,
    userAnswer: answers?.[item.id]?.responses?.[subQuestion.id] || '',
    objectiveScore,
    objectiveTotal,
    paperTotal,
  })
}

export async function runSingleSubjectiveQuestionAiReview({
  quiz,
  answers,
  item,
  subQuestion = null,
}) {
  if (!quiz || !item) return null

  return gradeSingleSubjectiveQuestionAttempt({
    paperTitle: quiz.title,
    item,
    response: subQuestion ? answers?.[item.id]?.[subQuestion.id] : answers?.[item.id],
    subQuestion,
  })
}
