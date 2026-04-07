import { callDeepSeekJson } from './deepseekClient'

function subjectiveQuestionPayload(item, response) {
  return {
    question_id: item.id,
    type: item.type,
    prompt: item.prompt,
    score: item.score || 0,
    source_text: item.source_text || '',
    requirements: item.requirements || {},
    reference_answer: item.answer?.reference_answer || '',
    scoring_points: item.answer?.scoring_points || [],
    scoring_rubric: item.answer?.scoring_rubric || null,
    user_answer: response?.text || '',
  }
}

function buildQuestionReviewMap(questionReviews = []) {
  return questionReviews.reduce((map, review) => {
    if (review?.question_id) {
      map[review.question_id] = {
        questionId: review.question_id,
        score: Number(review.score) || 0,
        maxScore: Number(review.max_score) || 0,
        feedback: review.feedback || '',
        strengths: Array.isArray(review.strengths) ? review.strengths : [],
        weaknesses: Array.isArray(review.weaknesses) ? review.weaknesses : [],
        suggestions: Array.isArray(review.suggestions) ? review.suggestions : [],
      }
    }
    return map
  }, {})
}

export async function gradeSubjectiveAttempt({ quiz, answers, objectiveScore, objectiveTotal, paperTotal, subjectivePendingTotal }) {
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
      '你是一名严格但专业的英语模考试卷评阅老师。请只返回 JSON，不要输出任何额外文本。分数必须在 0 到 max_score 之间，点评要具体、可执行。',
    userPrompt: JSON.stringify(
      {
        task: 'grade_subjective_questions',
        paper_title: quiz?.title || '未命名试卷',
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
  const target = subQuestion
    ? {
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
    : {
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

  const { content, model } = await callDeepSeekJson({
    systemPrompt:
      '你是一名善于讲题的英语考试老师。请只返回 JSON，不要输出任何额外文本。解释要说明为什么对、为什么错，以及考点和改进建议。',
    userPrompt: JSON.stringify(
      {
        task: 'explain_quiz_question',
        paper_title: paperTitle || '未命名试卷',
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
