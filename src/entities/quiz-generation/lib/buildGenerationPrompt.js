import {
  getQuestionTypeMeta,
  getSubjectGenerationConfig,
  getSubjectMeta,
  getSubjectQuestionTypeOptions,
} from '../../subject/model/subjects.js'

const SUBJECT_PROMPT_LABELS = {
  english: '英语',
  data_structure: '数据结构',
  database_principles: '数据库原理',
  international_trade: '国际贸易',
  generic: '通用科目',
}

const QUESTION_TYPE_PROMPT_LABELS = {
  single_choice: '单项选择题',
  multiple_choice: '多项选择题',
  true_false: '判断题',
  fill_blank: '填空题',
  function_fill_blank: '函数填空题',
  cloze: '完形填空',
  reading: '阅读理解',
  translation: '翻译题',
  essay: '作文题',
  short_answer: '简答题',
  case_analysis: '案例分析题',
  calculation: '计算题',
  operation: '操作题',
  programming: '程序设计题',
  sql: 'SQL 题',
  er_diagram: 'E-R 图题',
  composite: '综合题',
}

const PROFILE_GUIDANCE = {
  english:
    'Question stems and options may be in English. Rationales, scoring points, and all structured explanations must be in Chinese.',
  data_structure:
    'Use Chinese. Questions should match专升本或课程考试场景，过程题必须能拆成明确评分点。',
  database_principles:
    'Use Chinese. SQL and E-R questions must include enough schema or business context for grading.',
  international_trade:
    'Use Chinese. Cover trade terms, case analysis, calculations, and operation scenarios with AI-gradeable answers.',
  generic:
    'Use Chinese for explanations, scoring points, and grading notes. Keep the question structure explicit and complete.',
}

const COMMON_RULES = [
  'Return exactly one JSON object and nothing else.',
  'The object must be directly parseable by JSON.parse.',
  'Do not wrap the result in markdown, arrays, comments, or extra prose.',
  'The type field must exactly equal target_question_type.',
  'Do not generate any unsupported question type.',
  'Do not omit score.',
  'All rationale, scoring points, and structured explanations must be in Chinese.',
]

const TYPE_SPECIFIC_RULES = {
  single_choice: [
    'options must be an array of {key,text}.',
    'answer.type must be objective.',
    'answer.correct must be a single option key such as "A".',
  ],
  multiple_choice: [
    'options must be an array of {key,text}.',
    'answer.type must be objective.',
    'answer.correct must be an array of option keys.',
  ],
  true_false: [
    'answer.type must be objective.',
    'answer.correct must be either "T" or "F".',
  ],
  fill_blank: [
    'Use a blanks array.',
    'Each blank must contain blank_id, accepted_answers, score, and rationale.',
  ],
  function_fill_blank: [
    'Use a blanks array and provide context or code snippet text.',
    'Each blank must contain blank_id, accepted_answers, score, and rationale.',
  ],
  cloze: [
    'Use article plus blanks structure.',
    'article must contain the full passage text with inline placeholders such as [[1]], [[2]] at the exact blank locations.',
    'blanks must be an array, and every blank must contain blank_id, options, correct, score, and rationale.',
    'Do not put blanks outside the passage. Do not append a separate blank list under the article.',
    'Do not convert a cloze question into ordinary single_choice questions.',
  ],
  reading: [
    'Use passage plus questions structure.',
    'passage must be an object with content text.',
    'questions must be an array of single_choice child questions.',
  ],
  translation: [
    'answer.type must be subjective.',
    'Provide answer.reference_answer and answer.scoring_points.',
  ],
  essay: [
    'answer.type must be subjective.',
    'Provide answer.reference_answer and answer.scoring_points.',
  ],
  short_answer: [
    'answer.type must be subjective.',
    'Provide answer.reference_answer and answer.scoring_points.',
  ],
  case_analysis: [
    'Provide context text.',
    'answer.type must be subjective with reference_answer and scoring_points.',
  ],
  calculation: [
    'answer.type must be subjective.',
    'Provide reference_answer and scoring_points that reflect the solving steps.',
  ],
  operation: [
    'answer.type must be subjective.',
    'Provide reference_answer and scoring_points that reflect the operation steps.',
  ],
  programming: [
    'answer.type must be subjective.',
    'Provide reference_answer and scoring_points.',
  ],
  sql: [
    'Provide context text.',
    'answer.type must be subjective with reference_answer and scoring_points.',
  ],
  er_diagram: [
    'Provide context text.',
    'answer.type must be subjective with reference_answer and scoring_points.',
  ],
  composite: [
    'Use material plus questions structure.',
    'questions must be an array of valid child questions.',
  ],
}

function clampPositiveInt(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback
}

function buildDefaultPlan(typeKeys = []) {
  return Object.fromEntries(
    typeKeys.map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      return [
        typeKey,
        {
          count: meta.mockExamConfig?.defaultCount || 1,
          score: meta.mockExamConfig?.defaultScore || 1,
        },
      ]
    })
  )
}

function normalizeQuestionTypes(subjectMeta, params = {}) {
  const generation = subjectMeta.generation || getSubjectGenerationConfig(subjectMeta.key)
  const allowed = new Set(generation.supportedQuestionTypes || subjectMeta.questionTypeKeys || [])
  const requested =
    Array.isArray(params.questionTypes) && params.questionTypes.length > 0
      ? params.questionTypes
      : generation.supportedQuestionTypes || subjectMeta.questionTypeKeys || []

  const normalized = requested.filter((typeKey) => allowed.has(typeKey))
  return normalized.length ? normalized : [...allowed]
}

function normalizeQuestionPlan(typeKeys, rawPlan = {}) {
  return Object.fromEntries(
    typeKeys.map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      const current = rawPlan[typeKey] || {}
      return [
        typeKey,
        {
          count: clampPositiveInt(current.count, meta.mockExamConfig?.defaultCount || 1),
          score:
            Number(current.score) > 0
              ? Number(current.score)
              : meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
        },
      ]
    })
  )
}

function expandPracticePlan(typeKeys, count) {
  if (!typeKeys.length) return []

  const plan = []
  for (let index = 0; index < count; index += 1) {
    const typeKey = typeKeys[index % typeKeys.length]
    const meta = getQuestionTypeMeta(typeKey)
    plan.push({
      index: index + 1,
      typeKey,
      score: meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
      label: meta.label,
    })
  }

  return plan
}

function expandMockExamPlan(typeKeys, questionPlan = {}) {
  const plan = []
  typeKeys.forEach((typeKey) => {
    const meta = getQuestionTypeMeta(typeKey)
    const config = questionPlan[typeKey] || {}
    const count = clampPositiveInt(config.count, meta.mockExamConfig?.defaultCount || 1)
    const score =
      Number(config.score) > 0
        ? Number(config.score)
        : meta.mockExamConfig?.defaultScore || meta.defaultScore || 1

    for (let index = 0; index < count; index += 1) {
      plan.push({
        index: plan.length + 1,
        typeKey,
        score,
        label: meta.label,
      })
    }
  })
  return plan
}

function typeKeysOrFallback(typeKeys = []) {
  return Array.isArray(typeKeys) ? typeKeys : []
}

export function normalizeGenerationParams(subjectKey, params = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  const generation = getSubjectGenerationConfig(subjectKey)
  const questionTypes = normalizeQuestionTypes(subjectMeta, params)
  const mode = params.mode || generation.supportedModes?.[0] || 'practice'
  const questionPlan = normalizeQuestionPlan(typeKeysOrFallback(questionTypes), {
    ...buildDefaultPlan(questionTypes),
    ...(params.questionPlan || {}),
  })

  const normalized = {
    mode,
    difficulty: params.difficulty || generation.defaultDifficulty || 'medium',
    count: clampPositiveInt(params.count, generation.defaultCounts?.[0] || 5),
    questionTypes,
    questionPlan,
    extraPrompt: String(params.extraPrompt || '').trim(),
    paperTitle: String(params.paperTitle || '').trim(),
    durationMinutes: clampPositiveInt(
      params.durationMinutes,
      generation.defaultDurationMinutes || subjectMeta.defaultDurationMinutes || 90
    ),
    targetPaperTotal:
      Number(params.targetPaperTotal) || generation.defaultPaperTotal || subjectMeta.expectedPaperTotal || 0,
  }

  const generationPlan =
    mode === 'mock_exam'
      ? expandMockExamPlan(questionTypes, questionPlan)
      : expandPracticePlan(questionTypes, normalized.count)

  return {
    subjectMeta,
    generation,
    normalized,
    generationPlan,
  }
}

function getContractPayload(questionTypeMeta) {
  if (!questionTypeMeta?.generationContract) return null
  return {
    requiredFields: questionTypeMeta.generationContract.requiredFields,
  }
}

function getSubjectPromptLabel(subjectMeta) {
  return SUBJECT_PROMPT_LABELS[subjectMeta.key] || subjectMeta.key || SUBJECT_PROMPT_LABELS.generic
}

function getQuestionTypePromptLabel(typeKey) {
  return QUESTION_TYPE_PROMPT_LABELS[typeKey] || typeKey
}

function buildRules(typeKey, isRepairAttempt) {
  const typeRules = TYPE_SPECIFIC_RULES[typeKey] || []
  if (isRepairAttempt) {
    return [
      'Fix the previous structure error first.',
      'Keep the same target_question_type and do not change the question family.',
      ...typeRules,
    ]
  }

  return [...COMMON_RULES, ...typeRules]
}

export function buildGenerationPrompt({
  subjectKey,
  params = {},
  requestId = '',
  planItem,
  questionIndex = 1,
  totalQuestions = 1,
  avoidQuestionSignatures = [],
  previousErrorMessage = '',
} = {}) {
  const { subjectMeta, generation, normalized } = normalizeGenerationParams(subjectKey, params)
  const profile = generation.promptProfile || 'generic'
  const guidance = PROFILE_GUIDANCE[profile] || PROFILE_GUIDANCE.generic
  const questionTypeMeta = getQuestionTypeMeta(planItem?.typeKey)
  const allowedQuestionTypes = getSubjectQuestionTypeOptions(subjectMeta.key).map((item) => item.key)
  const isRepairAttempt = Boolean(previousErrorMessage)
  const cleanSubjectLabel = getSubjectPromptLabel(subjectMeta)
  const cleanTypeLabel = getQuestionTypePromptLabel(planItem?.typeKey)

  const systemPrompt = isRepairAttempt
    ? [
        'You repair exactly one malformed quiz question JSON object.',
        'Return only the corrected JSON object.',
        'Do not output markdown, comments, arrays, or any explanation.',
        guidance,
      ].join(' ')
    : [
        'You generate exactly one quiz question JSON object.',
        'Return only the JSON object.',
        'Do not output markdown, comments, arrays, or any explanation.',
        'The object must be directly parseable by JSON.parse.',
        guidance,
      ].join(' ')

  const payload = {
    request_id: requestId || `gen_${Date.now()}`,
    subject: subjectMeta.key,
    subject_label: cleanSubjectLabel,
    mode: normalized.mode,
    difficulty: normalized.difficulty,
    question_index: questionIndex,
    total_questions: totalQuestions,
    target_question_type: planItem?.typeKey,
    target_question_type_label: cleanTypeLabel,
    target_score: planItem?.score,
    paper_title: normalized.paperTitle || cleanSubjectLabel,
    duration_minutes: normalized.durationMinutes,
    target_paper_total: normalized.targetPaperTotal,
    question_type_contract: getContractPayload(questionTypeMeta),
    avoid_question_signatures: avoidQuestionSignatures,
    extra_prompt: normalized.extraPrompt,
    rules: buildRules(planItem?.typeKey, isRepairAttempt),
  }

  if (isRepairAttempt) {
    payload.previous_generation_error = previousErrorMessage
  } else {
    payload.allowed_question_types = allowedQuestionTypes
  }

  return {
    subjectMeta,
    generation,
    normalized,
    systemPrompt,
    userPrompt: JSON.stringify(payload),
    questionTypeMeta,
    typeContract: getContractPayload(questionTypeMeta),
  }
}
