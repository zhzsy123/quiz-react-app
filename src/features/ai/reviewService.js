import { requestAiJson } from '../../shared/api/aiGateway'

function subjectiveQuestionPayload(item, response) {
  return {
    question_id: item.id,
    type: item.type,
    prompt: item.prompt,
    score: item.score || 0,
    source_text: item.source_text || '',
    context_title: item.context_title || '',
    context: item.context || '',
    requirements: item.requirements || {},
    reference_answer: item.answer?.reference_answer || '',
    scoring_points: item.answer?.scoring_points || [],
    scoring_rubric: item.answer?.scoring_rubric || null,
    user_answer: response?.text || '',
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
    user_answer:
      item.answer?.type === 'subjective'
        ? response?.text || ''
        : Array.isArray(response)
          ? response.join(', ')
          : typeof response === 'object'
            ? JSON.stringify(response)
            : response || '',
    source_text: item.source_text || '',
    context_title: item.context_title || '',
    context: item.context || '',
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

  const { content, model } = await requestAiJson({
    systemPrompt:
      'You are a strict but professional exam grader. Return JSON only. Scores must stay between 0 and max_score, and feedback must be concrete and actionable.',
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

  const { content, model } = await requestAiJson({
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

export async function auditQuizQuestionCompliance({ paperTitle, item, response, subQuestion = null }) {
  const target = buildQuestionTarget(item, response, subQuestion)

  const { content, model } = await requestAiJson({
    systemPrompt:
      'You are an exam quality auditor. Return JSON only. Check whether the question, answer, rationale, and options are compliant, unambiguous, and internally consistent.',
    userPrompt: JSON.stringify(
      {
        task: 'audit_quiz_question_compliance',
        paper_title: paperTitle || 'Untitled paper',
        question: target,
        allowed_verdicts: ['规范', '有歧义', '不规范', '错题'],
        output_schema: {
          verdict: '规范 | 有歧义 | 不规范 | 错题',
          confidence: 'number(0-100)',
          summary: 'string',
          issues: ['string'],
          evidence: ['string'],
          suggestions: ['string'],
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
    title: 'AI 核题',
    explanation: content?.summary || '',
    keyPoints: Array.isArray(content?.evidence) ? content.evidence : [],
    commonMistakes: Array.isArray(content?.issues) ? content.issues : [],
    answerStrategy: Array.isArray(content?.suggestions) ? content.suggestions : [],
    auditVerdict: content?.verdict || '规范',
    confidenceScore: Number(content?.confidence) || 0,
  }
}

export async function generateSimilarQuestions({ paperTitle, item, response, count = 5 }) {
  const target = buildQuestionTarget(item, response)

  const { content, model } = await requestAiJson({
    systemPrompt:
      'You are an exam question generator. Return JSON only. Based on the source question, generate 5 similar questions with progressively increasing difficulty.',
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
