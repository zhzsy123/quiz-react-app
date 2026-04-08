import {
  auditQuizQuestionCompliance,
  explainQuizQuestionWithMode,
  generateSimilarQuestions,
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

  return completedReview || pendingReview
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
