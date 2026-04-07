import { callDeepSeekJson } from './deepseekClient'
import { formatStructuredResponse } from '../../utils/questionRuntime'

function serializeResponse(item, response) {
  if (item?.type === 'structured_form') {
    return formatStructuredResponse(response, item.fields || [])
  }

  if (item?.type === 'sql') {
    if (typeof response === 'string') return response
    return response?.text || ''
  }

  if (item?.answer?.type === 'subjective') {
    if (typeof response === 'string') return response
    return response?.text || ''
  }

  if (Array.isArray(response)) return response.join(', ')
  if (response && typeof response === 'object') return JSON.stringify(response, null, 2)
  return response || ''
}

function subjectiveQuestionPayload(item, response) {
  return {
    question_id: item.id,
    type: item.type,
    subject: item.subject || '',
    module: item.module || '',
    subtype: item.subtype || '',
    prompt: item.prompt,
    score: item.score || 0,
    source_text: item.source_text || '',
    content_blocks: item.content_blocks || [],
    fields: item.fields || [],
    requirements: item.requirements || {},
    reference_answer: item.answer?.reference_answer || '',
    reference_fields: item.answer?.reference_fields || {},
    scoring_points: item.answer?.scoring_points || [],
    scoring_rubric: item.answer?.scoring_rubric || null,
    user_answer: serializeResponse(item, response),
  }
}

function buildQuestionReviewMap(questionReviews = []) {
  return questionReviews.reduce((map, review) => {
    if (!review?.question_id) return map
    map[review.question_id] = {
      questionId: review.question_id,
      score: Number(review.score) || 0,
      maxScore: Number(review.max_score) || 0,
      feedback: review.feedback || '',
      strengths: Array.isArray(review.strengths) ? review.strengths : [],
      weaknesses: Array.isArray(review.weaknesses) ? review.weaknesses : [],
      suggestions: Array.isArray(review.suggestions) ? review.suggestions : [],
    }
    return map
  }, {})
}

function buildQuestionTarget(item, response, subQuestion = null) {
  if (subQuestion) {
    return {
      question_id: subQuestion.id,
      type: subQuestion.type || 'single_choice',
      prompt: subQuestion.prompt,
      options: subQuestion.options || [],
      correct_answer: subQuestion.answer?.correct || '',
      rationale: subQuestion.answer?.rationale || '',
      user_answer: typeof response === 'object' ? response?.[subQuestion.id] || '' : '',
      passage_title: item?.passage?.title || item?.title || '',
      passage_content: item?.passage?.content || '',
    }
  }

  return {
    question_id: item.id,
    type: item.type,
    prompt: item.prompt,
    options: item.options || [],
    blanks: item.blanks || [],
    correct_answer: item.answer?.correct || item.answer?.reference_answer || '',
    rationale: item.answer?.rationale || item.answer?.reference_answer || '',
    user_answer: serializeResponse(item, response),
    source_text: item.source_text || '',
    context_title: item.context_title || '',
    context: item.context || '',
    content_blocks: item.content_blocks || [],
    fields: item.fields || [],
  }
}

export async function gradeSubjectiveAttempt({
  quiz,
  answers,
  objectiveScore,
  objectiveTotal,
  paperTotal,
  subjectivePendingTotal,
}) {
  const subjectiveQuestions = (quiz?.items || [])
    .filter((item) => item?.answer?.type === 'subjective')
    .map((item) => subjectiveQuestionPayload(item, answers[item.id]))
    .filter((item) => item.user_answer.trim())

  if (!subjectiveQuestions.length) {
    return {
      status: 'completed',
      provider: 'deepseek',
      questionReviews: {},
      totalSubjectiveScore: 0,
      totalScore: objectiveScore,
      overallComment: '本次没有可评阅的主观题。',
      weaknessSummary: [],
    }
  }

  const { content, model } = await callDeepSeekJson({
    systemPrompt:
      'You are a strict but professional exam grader. Return JSON only. Scores must stay between 0 and max_score, and feedback must be concrete, actionable, and grounded in the provided reference answer or scoring points.',
    userPrompt: JSON.stringify(
      {
        task: 'grade_subjective_questions',
        paper_title: quiz?.title || 'Untitled paper',
        scoring_context: {
          objective_score: objectiveScore,
          objective_total: objectiveTotal,
          paper_total: paperTotal,
          subjective_total: subjectivePendingTotal,
        },
        subjective_questions: subjectiveQuestions,
        output_schema: {
          question_reviews: [
            {
              question_id: 'string',
              score: 'number',
              max_score: 'number',
              feedback: 'string',
              strengths: ['string'],
              weaknesses: ['string'],
              suggestions: ['string'],
            },
          ],
          overall_comment: 'string',
          weakness_summary: ['string'],
        },
      },
      null,
      2
    ),
  })

  const questionReviewMap = buildQuestionReviewMap(content?.question_reviews)
  const totalSubjectiveScore = Object.values(questionReviewMap).reduce((sum, review) => sum + (review.score || 0), 0)

  return {
    status: 'completed',
    provider: 'deepseek',
    model,
    reviewedAt: Date.now(),
    totalSubjectiveScore,
    totalScore: objectiveScore + totalSubjectiveScore,
    overallComment: content?.overall_comment || '',
    weaknessSummary: Array.isArray(content?.weakness_summary) ? content.weakness_summary : [],
    questionReviews: questionReviewMap,
  }
}

export async function explainQuizQuestion({ paperTitle, item, response, subQuestion = null }) {
  return explainQuizQuestionWithMode({
    paperTitle,
    item,
    response,
    subQuestion,
    mode: 'standard',
    focus: 'general',
  })
}

export async function explainQuizQuestionWithMode({
  paperTitle,
  item,
  response,
  subQuestion = null,
  mode = 'standard',
  focus = 'general',
}) {
  const target = buildQuestionTarget(item, response, subQuestion)

  const { content, model } = await callDeepSeekJson({
    systemPrompt:
      'You are a clear exam tutor. Return JSON only. Explain why the answer is correct or wrong, identify the tested point, and give improvement advice.',
    userPrompt: JSON.stringify(
      {
        task: 'explain_quiz_question',
        mode,
        focus,
        paper_title: paperTitle || 'Untitled paper',
        question: target,
        output_schema: {
          title: 'string',
          explanation: 'string',
          key_points: ['string'],
          common_mistakes: ['string'],
          answer_strategy: ['string'],
        },
      },
      null,
      2
    ),
  })

  return {
    status: 'completed',
    provider: 'deepseek',
    model,
    generatedAt: Date.now(),
    title: content?.title || 'AI 解释',
    explanation: content?.explanation || '',
    keyPoints: Array.isArray(content?.key_points) ? content.key_points : [],
    commonMistakes: Array.isArray(content?.common_mistakes) ? content.common_mistakes : [],
    answerStrategy: Array.isArray(content?.answer_strategy) ? content.answer_strategy : [],
  }
}

export async function generateSimilarQuestions({ paperTitle, item, response, count = 5 }) {
  const target = buildQuestionTarget(item, response)

  const { content, model } = await callDeepSeekJson({
    systemPrompt:
      'You are an exam question generator. Return JSON only. Based on the source question, generate similar questions with progressively increasing difficulty and keep them aligned with the same knowledge point.',
    userPrompt: JSON.stringify(
      {
        task: 'generate_similar_questions',
        paper_title: paperTitle || 'Untitled paper',
        count,
        source_question: target,
        output_schema: {
          title: 'string',
          questions: [
            {
              index: 'number',
              difficulty: 'easy | medium | hard',
              prompt: 'string',
              options: ['string'],
              answer: 'string',
              explanation: 'string',
            },
          ],
        },
      },
      null,
      2
    ),
  })

  return {
    status: 'completed',
    provider: 'deepseek',
    model,
    generatedAt: Date.now(),
    title: content?.title || 'AI Similar Questions',
    questions: Array.isArray(content?.questions) ? content.questions : [],
  }
}
