import { getQuestionTypeMeta, getSubjectGenerationConfig, getSubjectMeta, getSubjectQuestionTypeOptions } from '../../subject/model/subjectCatalog.js'

const PROFILE_GUIDANCE = {
  english: '题目内容保持英语学科风格，题干与选项可以使用英文，解析与说明优先使用中文，确保 JSON 可直接导入。',
  data_structure: '题目内容使用中文，术语遵循数据结构教材常用表达，尽量生成可判分、可教学的题目。',
  database_principles: '题目内容使用中文，术语遵循数据库原理教材常用表达，尽量生成可判分、可教学的题目。',
  international_trade: '题目内容使用中文，突出国际贸易术语、案例、计算和操作类表达，确保题目与答案能被核题和入库。',
  generic: '题目内容使用中文，确保题干、答案、解析和评分点结构化、可导入、可复用。',
}

function normalizeGenerationParams(subjectMeta, params = {}) {
  const generation = subjectMeta.generation || getSubjectGenerationConfig(subjectMeta.key)
  const requestedTypes =
    Array.isArray(params.questionTypes) && params.questionTypes.length > 0
      ? params.questionTypes
      : generation.supportedQuestionTypes || subjectMeta.questionTypeKeys || []
  const availableTypes = getSubjectQuestionTypeOptions(subjectMeta.key).map((item) => item.key)
  const questionTypes = requestedTypes.filter((typeKey) => availableTypes.includes(typeKey))

  return {
    mode: params.mode || generation.supportedModes?.[0] || 'practice',
    difficulty: params.difficulty || generation.defaultDifficulty || 'medium',
    count: Number(params.count) || generation.defaultCounts?.[0] || 5,
    questionTypes: questionTypes.length ? questionTypes : [...availableTypes],
    extraPrompt: String(params.extraPrompt || '').trim(),
    paperTitle: String(params.paperTitle || '').trim(),
    durationMinutes: Number(params.durationMinutes) || generation.defaultDurationMinutes || subjectMeta.defaultDurationMinutes || 90,
    targetPaperTotal: Number(params.targetPaperTotal) || generation.defaultPaperTotal || subjectMeta.expectedPaperTotal || 0,
  }
}

function buildQuestionTypeInstruction(typeKeys = []) {
  return typeKeys
    .map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      return `${meta.key}（${meta.label}）`
    })
    .join('、')
}

export function buildGenerationPrompt({ subjectKey, params = {}, requestId = '' } = {}) {
  const subjectMeta = getSubjectMeta(subjectKey)
  const generation = getSubjectGenerationConfig(subjectKey)
  const normalized = normalizeGenerationParams(subjectMeta, params)
  const profile = generation.promptProfile || 'generic'
  const guidance = PROFILE_GUIDANCE[profile] || PROFILE_GUIDANCE.generic
  const allowedQuestionTypes = Array.from(new Set(normalized.questionTypes))

  const systemPrompt = [
    '你是一个题库生成器，只能输出 NDJSON，每一行都是一个独立 JSON 对象。',
    '不要输出 markdown、说明文字、代码块、列表外文本。',
    '每个事件对象必须包含 stream_version、type、request_id、subject。',
    '支持的事件类型只有 meta、question、warning、error、done。',
    'question 事件中的 question 对象必须符合当前项目的题库协议，可被本地校验与归一化。',
    '题目必须可判分，答案必须与解析一致，分值必须明确。',
    '主观题必须提供 reference_answer 和 scoring_points，必要时提供 scoring_rubric。',
    guidance,
  ].join(' ')

  const userPrompt = JSON.stringify(
    {
      stream_version: 'v1',
      request_id: requestId || `gen_${Date.now()}`,
      subject: subjectMeta.key,
      subject_label: subjectMeta.label,
      mode: normalized.mode,
      difficulty: normalized.difficulty,
      count: normalized.count,
      paper_title: normalized.paperTitle || subjectMeta.label,
      duration_minutes: normalized.durationMinutes,
      target_paper_total: normalized.targetPaperTotal,
      allowed_question_types: allowedQuestionTypes,
      selected_question_types: allowedQuestionTypes,
      question_type_summary: buildQuestionTypeInstruction(allowedQuestionTypes),
      extra_prompt: normalized.extraPrompt || '',
      output_contract: {
        meta: {
          type: 'meta',
          fields: ['stream_version', 'type', 'request_id', 'subject', 'paper_title', 'mode', 'difficulty', 'target_count'],
        },
        question: {
          type: 'question',
          fields: ['stream_version', 'type', 'request_id', 'subject', 'index', 'question'],
        },
        warning: {
          type: 'warning',
          fields: ['stream_version', 'type', 'request_id', 'subject', 'index', 'message'],
        },
        error: {
          type: 'error',
          fields: ['stream_version', 'type', 'request_id', 'subject', 'index', 'message'],
        },
        done: {
          type: 'done',
          fields: ['stream_version', 'type', 'request_id', 'subject', 'generated_count'],
        },
      },
      question_schema_hint: {
        id: 'gq_001',
        type: 'single_choice',
        prompt: 'string',
        score: 'number',
        difficulty: 'easy | medium | hard | mixed',
        tags: ['string'],
        answer: {
          type: 'objective | subjective',
          correct: 'string | string[]',
          rationale: 'string',
          reference_answer: 'string',
          scoring_points: ['string'],
          scoring_rubric: [{ point: 'string', score: 'number' }],
        },
      },
      constraints: [
        '只返回 NDJSON，不要包裹在数组或对象里。',
        '每题都要有 score。',
        '不要生成无法判分的空题。',
        '答案与解析必须互相一致。',
        '禁止输出与当前科目无关的题型。',
      ],
    },
    null,
    2
  )

  return {
    subjectMeta,
    generation,
    normalized,
    systemPrompt,
    userPrompt,
  }
}
