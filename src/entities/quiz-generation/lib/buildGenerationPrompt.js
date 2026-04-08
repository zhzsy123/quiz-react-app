import {
  getQuestionTypeMeta,
  getSubjectGenerationConfig,
  getSubjectMeta,
  getSubjectQuestionTypeOptions,
} from '../../subject/model/subjects.js'

const PROFILE_GUIDANCE = {
  english:
    '题干和选项允许使用英文，但解析、评分点和说明必须使用中文。不要生成英语科目未支持的题型。',
  data_structure:
    '统一使用中文术语，题目要贴近专升本或课程考试场景，过程题必须可拆分评分点。',
  database_principles:
    '统一使用中文术语。SQL 题要给出清晰的数据背景，E-R 图题要说明实体、联系和属性。',
  international_trade:
    '统一使用中文术语，重点覆盖国际贸易术语、案例、计算与操作场景，确保答案适合 AI 评分。',
  generic: '统一使用中文说明，题目、答案、解析和评分点都要结构化。',
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
          score: meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
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
          score: Number(current.score) > 0 ? Number(current.score) : meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
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
    const score = Number(config.score) > 0 ? Number(config.score) : meta.mockExamConfig?.defaultScore || meta.defaultScore || 1
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

export function normalizeGenerationParams(subjectKey, params = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  const generation = getSubjectGenerationConfig(subjectKey)
  const questionTypes = normalizeQuestionTypes(subjectMeta, params)
  const mode = params.mode || generation.supportedModes?.[0] || 'practice'
  const questionPlan = normalizeQuestionPlan(questionTypes, {
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
    targetPaperTotal: Number(params.targetPaperTotal) || generation.defaultPaperTotal || subjectMeta.expectedPaperTotal || 0,
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
    summary: questionTypeMeta.generationContract.summary,
    requiredFields: questionTypeMeta.generationContract.requiredFields,
    example: questionTypeMeta.generationContract.example,
  }
}

export function buildGenerationPrompt({
  subjectKey,
  params = {},
  requestId = '',
  planItem,
  questionIndex = 1,
  totalQuestions = 1,
} = {}) {
  const { subjectMeta, generation, normalized } = normalizeGenerationParams(subjectKey, params)
  const profile = generation.promptProfile || 'generic'
  const guidance = PROFILE_GUIDANCE[profile] || PROFILE_GUIDANCE.generic
  const questionTypeMeta = getQuestionTypeMeta(planItem?.typeKey)
  const allowedQuestionTypes = getSubjectQuestionTypeOptions(subjectMeta.key).map((item) => item.key)

  const systemPrompt = [
    '你是题库出题助手。',
    '这次只生成 1 道题，并且只返回 1 个 JSON 对象。',
    '不要输出 markdown、解释文字、代码块、数组外壳、前后缀或注释。',
    '返回内容必须能被 JSON.parse 直接解析。',
    '字段要紧凑，不要 pretty print，不要额外换行。',
    '题目必须符合指定科目和指定题型，答案、解析、评分点必须自洽。',
    guidance,
  ].join(' ')

  const userPrompt = JSON.stringify({
    request_id: requestId || `gen_${Date.now()}`,
    subject: subjectMeta.key,
    subject_label: subjectMeta.label,
    mode: normalized.mode,
    difficulty: normalized.difficulty,
    question_index: questionIndex,
    total_questions: totalQuestions,
    target_question_type: planItem?.typeKey,
    target_question_type_label: questionTypeMeta.label,
    target_score: planItem?.score,
    paper_title: normalized.paperTitle || subjectMeta.label,
    duration_minutes: normalized.durationMinutes,
    target_paper_total: normalized.targetPaperTotal,
    allowed_question_types: allowedQuestionTypes,
    question_type_contract: getContractPayload(questionTypeMeta),
    extra_prompt: normalized.extraPrompt,
    rules: [
      '客观题的 answer.type 必须是 objective，主观题的 answer.type 必须是 subjective。',
      'single_choice 和 reading 子题的 options 必须是数组，元素必须是 {key,text}。',
      'single_choice 的 answer.correct 必须是单个选项 key，例如 A。',
      'true_false 的 answer.correct 只能是 T 或 F。',
      'fill_blank / function_fill_blank 必须提供 blanks 数组，每个 blank 都有 blank_id、accepted_answers、score。',
      'translation / essay / short_answer / programming / sql / er_diagram 必须提供 reference_answer 和 scoring_points。',
      '不要生成当前科目未支持的题型。',
      '不要省略 score，不要生成无法判分的空题。',
      '解析和评分点使用中文。',
    ],
  })

  return {
    subjectMeta,
    generation,
    normalized,
    systemPrompt,
    userPrompt,
    questionTypeMeta,
    typeContract: getContractPayload(questionTypeMeta),
  }
}
