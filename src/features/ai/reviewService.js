import { requestAiJson } from '../../shared/api/aiGateway'
import {
  getRelationalAlgebraResponseText,
  getRelationalAlgebraSubquestions,
  normalizeRelationalAlgebraExpression,
  normalizeRelationalAlgebraQuestion,
} from '../../entities/quiz/lib/relationalAlgebraNormalize'

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

function buildRelationalAlgebraReviewMap(reviews = []) {
  return reviews.reduce((map, review) => {
    const reviewKey = review?.question_id || review?.subquestion_id
    if (!reviewKey) return map
    map[reviewKey] = {
      questionId: reviewKey,
      subquestionId: review.subquestion_id || reviewKey,
      score: Number(review.score) || 0,
      maxScore: Number(review.max_score) || 0,
      verdict: review.verdict || 'incorrect',
      equivalent: Boolean(review.equivalent),
      confidence: Number(review.confidence) || 0,
      feedback: review.comment || '',
      strengths: Array.isArray(review.strengths) ? review.strengths : [],
      weaknesses: Array.isArray(review.missing_points) ? review.missing_points : [],
      suggestions: Array.isArray(review.error_points) ? review.error_points : [],
      normalizedReference: review.normalized_reference || '',
      normalizedUserAnswer: review.normalized_user_answer || '',
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
    feature: 'subjective_grading',
    title: quiz?.title || 'Untitled paper',
    subject: quiz?.subject || '',
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
      overallComment: 'This paper has no relational algebra questions to grade.',
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
          question_id: target.question_id,
          subquestion_id: subQuestion.id,
          verdict: 'unanswered',
          equivalent: false,
          score: 0,
          max_score: resolveRelationalAlgebraSubquestionScore(subQuestion, normalizedItem.score || 0),
          confidence: 100,
          missing_points: ['No answer provided'],
          error_points: [],
          comment: 'Unanswered.',
          normalized_reference: normalizeRelationalAlgebraExpression(subQuestion.reference_answer || ''),
          normalized_user_answer: '',
        })
        continue
      }

      const { content, model } = await requestAiJson({
        feature: 'relational_algebra_grading',
        title: quiz?.title || 'Untitled paper',
        subject: quiz?.subject || item?.subject || 'database_principles',
        temperature: 0.1,
        systemPrompt:
          'You are a strict database theory examiner specialized in relational algebra. Return JSON only. Judge semantic equivalence, not surface syntax. Accept operator aliases and whitespace differences. Focus on logic equivalence only.',
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
                'Treat Π/π/PROJECT/PI and σ/SELECT/SIGMA and ρ/RENAME and ⋈/JOIN/∞ and ∪/UNION and ∩/INTERSECT and -/DIFFERENCE and ÷/DIVIDE and >=/≥ and <=/≤ and !=/≠ and OR/∨ and NOT/¬ as equivalent aliases where appropriate.',
              'Ignore whitespace, line breaks, and bracket style differences.',
              'Judge semantic equivalence of the relational algebra expression.',
              'Return partial credit only when the answer is materially close but missing a non-critical component.',
            ],
            output_schema: {
              verdict: 'correct | partial | incorrect',
              equivalent: 'boolean',
              score: 'number',
              max_score: 'number',
              confidence: 'number(0-100)',
              missing_points: ['string'],
              error_points: ['string'],
              comment: 'string',
            },
          },
          null,
          2
        ),
      })

      reviewRecords.push({
        question_id: target.question_id,
        subquestion_id: subQuestion.id,
        verdict: content?.verdict || (content?.equivalent ? 'correct' : 'incorrect'),
        equivalent: Boolean(content?.equivalent),
        score: Number(content?.score) || 0,
        max_score: Number(content?.max_score) || resolveRelationalAlgebraSubquestionScore(subQuestion, normalizedItem.score || 0),
        confidence: Number(content?.confidence) || 0,
        missing_points: Array.isArray(content?.missing_points) ? content.missing_points : [],
        error_points: Array.isArray(content?.error_points) ? content.error_points : [],
        comment: content?.comment || '',
        normalized_reference: target.normalized_reference_answer,
        normalized_user_answer: target.normalized_user_answer,
        provider: 'deepseek',
        model,
      })
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
            .map((review) => `${review.subquestion_id}: ${review.comment || (review.equivalent ? 'Equivalent.' : 'Not equivalent.')}`)
            .join(' ')
        : 'This paper has no relational algebra questions to grade.',
    weaknessSummary: reviewRecords
      .filter((review) => !review.equivalent)
      .flatMap((review) => review.error_points || review.missing_points || []),
    questionReviews: reviewMap,
    relationalAlgebraReviews: reviewRecords,
    totalMaxScore,
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
    feature: focus === 'audit' ? 'question_audit' : 'question_explanation',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
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
    feature: 'question_audit',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
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
    feature: 'similar_question_generation',
    title: paperTitle || 'Untitled paper',
    subject: item?.subject || '',
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
