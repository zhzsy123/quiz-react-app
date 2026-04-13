import { requestAiJson } from '../../shared/api/aiGateway.js'
import { serializeErDiagramResponse } from '../../entities/quiz/lib/erDiagramAnswerUtils.js'

export {
  gradeRelationalAlgebraAttempt,
  gradeRelationalAlgebraSubquestionAttempt,
} from './relationalAlgebraReview'

function normalizeSubjectiveResponse(response, itemType = '') {
  if (typeof response === 'string') return response.trim()
  if (!response || typeof response !== 'object') return ''
  if (typeof response.text === 'string') return response.text.trim()
  if (itemType === 'er_diagram' || response.diagram || response.relations) {
    return serializeErDiagramResponse(response)
  }
  try {
    return JSON.stringify(response, null, 2)
  } catch {
    return ''
  }
}

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
    user_answer: normalizeSubjectiveResponse(response, item.type),
  }
}

function buildQuestionReviewMap(questionReviews = []) {
  return questionReviews.reduce((map, review) => {
    if (!review?.question_id) return map
    map[review.question_id] = {
      questionId: review.question_id,
      status: 'completed',
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
      blanks: subQuestion.blanks || [],
      correct_answer:
        subQuestion.answer?.correct ||
        subQuestion.answer?.reference_answer ||
        subQuestion.reference_answer ||
        '',
      rationale:
        subQuestion.answer?.rationale ||
        subQuestion.answer?.reference_answer ||
        subQuestion.reference_answer ||
        '',
      user_answer: typeof response === 'object' ? response?.[subQuestion.id] || '' : '',
      score: Number(subQuestion.score) || 0,
      context_title: subQuestion.context_title || '',
      context: subQuestion.context || '',
      requirements: subQuestion.requirements || {},
      scoring_points: subQuestion.answer?.scoring_points || [],
      parent_question: {
        id: item?.id || '',
        type: item?.type || '',
        prompt: item?.prompt || item?.title || '',
        title: item?.title || '',
        material_title: item?.material_title || item?.context_title || item?.passage?.title || '',
        material: item?.material || item?.context || item?.passage?.content || '',
      },
      schemas: Array.isArray(item?.schemas) ? item.schemas : [],
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
    user_answer: normalizeSubjectiveResponse(response, item.type),
    score: Number(item?.score) || 0,
    source_text: item.source_text || '',
    context_title: item.context_title || '',
    context: item.context || '',
    material_title: item.material_title || '',
    material: item.material || '',
    schemas: Array.isArray(item?.schemas) ? item.schemas : [],
    subquestions: Array.isArray(item?.subquestions)
      ? item.subquestions.map((question) => ({
          id: question?.id || '',
          type: question?.type || '',
          prompt: question?.prompt || '',
          score: Number(question?.score) || 0,
          reference_answer:
            question?.reference_answer || question?.answer?.reference_answer || question?.answer?.correct || '',
        }))
      : [],
    requirements: item.requirements || {},
    scoring_points: item.answer?.scoring_points || [],
    er_diagram_answer: item.type === 'er_diagram' ? normalizeSubjectiveResponse(response, item.type) : '',
  }
}

function resolveQuestionAuditStrategy(item, subQuestion = null) {
  const targetType = String(subQuestion?.type || item?.type || 'generic').trim()

  if (targetType === 'sql') {
    return {
      strategy: 'database_sql',
      title: 'SQL 题规范性审核',
      focus: '从 SQL 语义、表字段引用、连接条件、筛选条件、聚合分组和答案一致性角度审核题目是否规范。',
      checks: [
        '题干、参考答案、解析、评分点是否指向同一个查询目标',
        '表名、字段名、别名、连接条件是否自洽',
        'SELECT、WHERE、GROUP BY、HAVING、ORDER BY 的使用是否合理',
        '参考答案是否存在明显语法错误或遗漏关键条件',
      ],
    }
  }

  if (targetType === 'er_diagram') {
    return {
      strategy: 'database_er_diagram',
      title: 'E-R 图题规范性审核',
      focus: '从实体、属性、联系、主键和基数约束角度审核题目和参考答案是否规范一致。',
      checks: [
        '实体与属性划分是否清晰',
        '联系、联系名、基数和约束是否一致',
        '主键、外键或唯一标识是否缺失',
        '题干、答案、解析是否处在同一建模语境中',
      ],
    }
  }

  if (targetType === 'relational_algebra') {
    return {
      strategy: 'database_relational_algebra',
      title: '关系代数题规范性审核',
      focus: '从关系模式、运算符使用、表达式合法性以及答案解析一致性角度审核题目。',
      checks: [
        '关系模式与表达式中引用的关系、属性是否一致',
        '投影、选择、连接、差集、除法等运算是否符合题意',
        '参考表达式与解析、评分点是否指向同一语义',
        '题目是否存在歧义、漏条件或不完整描述',
      ],
    }
  }

  if (targetType === 'short_answer') {
    return {
      strategy: 'database_short_answer',
      title: '数据库简答题规范性审核',
      focus: '从题干表述、参考答案覆盖面、评分点清晰度和解析一致性角度审核题目。',
      checks: [
        '题干是否明确，不存在歧义',
        '参考答案是否覆盖题干要求的核心点',
        '评分点是否可执行、可判分',
        '解析是否与参考答案一致，未偏离题意',
      ],
    }
  }

  return {
    strategy: 'generic_question',
    title: '题目规范性审核',
    focus: '从题干、答案、解析、评分点和作答一致性角度审核题目是否规范合理。',
    checks: [
      '题干是否清晰完整',
      '答案与解析是否一致',
      '评分点是否明确',
      '用户作答是否暴露出题目本身的歧义或错误',
    ],
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
    systemPrompt:
      '你是一名严格但专业的考试阅卷老师。只返回 JSON。分数必须在 0 到 max_score 之间，反馈必须具体、可执行，并且使用中文。',
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

export async function gradeSingleSubjectiveQuestionAttempt({
  paperTitle,
  item,
  response,
  subQuestion = null,
}) {
  const target = subQuestion || item
  if (!item || !target) return null

  const payload = {
    question_id: subQuestion ? `${item.id}:${target.id}` : item.id,
    type: target.type || item.type,
    prompt: target.prompt || item.prompt || '',
    score: Number(target.score || item.score || 0),
    context_title: target.context_title || item.context_title || '',
    context: target.context || item.context || '',
    requirements: target.requirements || item.requirements || {},
    reference_answer:
      target.answer?.reference_answer || target.reference_answer || item.answer?.reference_answer || '',
    scoring_points:
      target.answer?.scoring_points || target.scoring_points || item.answer?.scoring_points || [],
    user_answer: normalizeSubjectiveResponse(response, target.type || item.type),
    parent_question: subQuestion
      ? {
          id: item.id,
          type: item.type,
          prompt: item.prompt,
          material_title: item.material_title || item.context_title || '',
          material: item.material || item.context || '',
        }
      : null,
    schemas: Array.isArray(item.schemas) ? item.schemas : [],
  }

  const { content, model } = await requestAiJson({
    feature: 'question_scoring',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
    systemPrompt:
      '你是一名数据库课程助教。只返回 JSON。请依据题干、参考答案、评分点和学生答案，用中文给出分数、优点、不足和改进建议。',
    userPrompt: JSON.stringify(
      {
        task: 'grade_single_subjective_question',
        paper_title: paperTitle || 'Untitled paper',
        question: payload,
        output_schema: {
          question_id: 'string',
          score: 'number',
          max_score: 'number',
          feedback: '中文字符串',
          strengths: ['中文字符串'],
          weaknesses: ['中文字符串'],
          suggestions: ['中文字符串'],
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
    reviewedAt: Date.now(),
    questionId: content?.question_id || payload.question_id,
    score: Number(content?.score) || 0,
    maxScore: Number(content?.max_score) || payload.score,
    feedback: content?.feedback || '',
    strengths: Array.isArray(content?.strengths) ? content.strengths : [],
    weaknesses: Array.isArray(content?.weaknesses) ? content.weaknesses : [],
    suggestions: Array.isArray(content?.suggestions) ? content.suggestions : [],
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
  const auditStrategy = resolveQuestionAuditStrategy(item, subQuestion)

  const { content, model } = await requestAiJson({
    feature: 'question_audit',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
    systemPrompt:
      '你是一名考试质量审核员。只返回 JSON。请站在出卷质量角度，检查题目、答案、解析、评分点与学生作答之间是否一致、表述是否规范清楚。只给出规范性结论、问题点和修改建议，不要直接重复正确答案，也不要展开成教学式解析。',
    userPrompt: JSON.stringify(
      {
        task: 'audit_quiz_question_compliance',
        audit_strategy: auditStrategy.strategy,
        audit_title: auditStrategy.title,
        audit_focus: auditStrategy.focus,
        audit_checks: auditStrategy.checks,
        paper_title: paperTitle || 'Untitled paper',
        question: target,
        allowed_verdicts: ['规范合理', '基本合理', '存在问题', '明显错误'],
        response_rules: [
          '不要直接重复正确答案内容',
          '不要输出教学式完整解析',
          '重点判断题干、答案、解析、评分点与用户作答之间是否一致',
          '建议必须面向命题质量修正，而不是面向学生做题技巧',
        ],
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
    systemPrompt: '你是一名考试命题助手。只返回 JSON。请基于原题生成同类题，并按难度递进组织，而且使用中文。',
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
