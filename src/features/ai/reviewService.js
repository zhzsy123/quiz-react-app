import { requestAiJson } from '../../shared/api/aiGateway.js'
export {
  gradeRelationalAlgebraAttempt,
  gradeRelationalAlgebraSubquestionAttempt,
} from './relationalAlgebraReview'

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
      correct_answer: subQuestion.answer?.correct || subQuestion.answer?.reference_answer || subQuestion.reference_answer || '',
      rationale: subQuestion.answer?.rationale || subQuestion.answer?.reference_answer || subQuestion.reference_answer || '',
      user_answer: typeof response === 'object' ? response?.[subQuestion.id] || '' : '',
      score: Number(subQuestion.score) || 0,
      passage_title: item?.passage?.title || item?.title || '',
      passage_content: item?.passage?.content || '',
      parent_question: {
        id: item?.id || '',
        type: item?.type || '',
        prompt: item?.prompt || item?.title || '',
        title: item?.title || '',
        material_title: item?.material_title || item?.context_title || item?.passage?.title || '',
        material: item?.material || item?.context || item?.passage?.content || '',
      },
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
    score: Number(item?.score) || 0,
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
    feature: 'subjective_grading',
    title: quiz?.title || 'Untitled paper',
    subject: quiz?.subject || '',
    systemPrompt: '你是一名严格但专业的考试阅卷老师。只返回 JSON。分数必须在 0 到 max_score 之间，反馈必须具体、可执行，并且使用中文。',
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
              feedback: '中文字符串',
              strengths: ['中文字符串'],
              weaknesses: ['中文字符串'],
              suggestions: ['中文字符串'],
            },
          ],
          overall_comment: '中文字符串',
          weakness_summary: ['中文字符串'],
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
    feature: 'question_explanation',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
    systemPrompt:
      '你是一名讲解清晰、排版克制的考试辅导老师。只返回 JSON。请使用中文，先给出简洁总评，再分别解释正确选项为什么对、其余选项为什么错；如果学生已作答且作错，要明确指出错因。不要输出 Markdown 表格。',
    userPrompt: JSON.stringify(
      {
        task: 'explain_quiz_question',
        mode,
        focus,
        paper_title: paperTitle || 'Untitled paper',
        question: target,
        output_schema: {
          title: 'string',
          summary: 'string',
          correct_reason: 'string',
          user_mistake: 'string',
          option_reviews: [
            {
              key: 'string',
              text: 'string',
              verdict: 'correct | distractor',
              reason: 'string',
            },
          ],
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
    kind: 'explain',
    status: 'completed',
    provider: 'deepseek',
    model,
    generatedAt: Date.now(),
    title: content?.title || 'AI 解释',
    explanation: content?.summary || '',
    correctReason: content?.correct_reason || '',
    userMistake: content?.user_mistake || '',
    optionReviews: Array.isArray(content?.option_reviews)
      ? content.option_reviews.map((review) => ({
          key: review?.key || '',
          text: review?.text || '',
          verdict: review?.verdict === 'correct' ? 'correct' : 'distractor',
          reason: review?.reason || '',
        }))
      : [],
    keyPoints: Array.isArray(content?.key_points) ? content.key_points : [],
    commonMistakes: Array.isArray(content?.common_mistakes) ? content.common_mistakes : [],
    answerStrategy: Array.isArray(content?.answer_strategy) ? content.answer_strategy : [],
  }
}

export async function auditQuizQuestionCompliance({ paperTitle, item, response, subQuestion = null }) {
  const target = buildQuestionTarget(item, response, subQuestion)

  const { content, model } = await requestAiJson({
    feature: 'question_audit',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
    systemPrompt:
      '你是一名考试质量审核员。只返回 JSON。请站在出卷质量角度，检查题目、答案、解析、选项与学生作答是否彼此一致、表述是否规范清楚。只给出规范性结论、问题点和修改建议，不要重复答案内容，不要展开教学式解析。',
    userPrompt: JSON.stringify(
      {
        task: 'audit_quiz_question_compliance',
        paper_title: paperTitle || 'Untitled paper',
        question: target,
        allowed_verdicts: ['规范合理', '基本合理', '存在问题', '明显错误'],
        output_schema: {
          verdict: '规范合理 | 基本合理 | 存在问题 | 明显错误',
          summary: 'string',
          issues: ['string'],
          consistency_checks: ['string'],
          suggestions: ['string'],
        },
      },
      null,
      2
    ),
  })

  return {
    kind: 'audit',
    status: 'completed',
    provider: 'deepseek',
    model,
    generatedAt: Date.now(),
    title: 'AI 核题',
    explanation: content?.summary || '',
    keyPoints: Array.isArray(content?.consistency_checks) ? content.consistency_checks : [],
    commonMistakes: Array.isArray(content?.issues) ? content.issues : [],
    answerStrategy: Array.isArray(content?.suggestions) ? content.suggestions : [],
    auditVerdict: content?.verdict || '规范合理',
  }
}

export async function generateSimilarQuestions({ paperTitle, item, response, count = 5 }) {
  const target = buildQuestionTarget(item, response)

  const { content, model } = await requestAiJson({
    feature: 'similar_question_generation',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
    systemPrompt: '你是一名考试命题助手。只返回 JSON。请基于原题生成同类题，并按难度递进组织，且使用中文。',
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
    title: content?.title || 'AI 同类题',
    questions: Array.isArray(content?.questions) ? content.questions : [],
  }
}
