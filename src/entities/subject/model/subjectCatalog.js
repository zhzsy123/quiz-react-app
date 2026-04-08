const COMMON_QUESTION_TYPE_KEYS = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'reading']

export const QUESTION_TYPE_CATALOG = [
  { key: 'single_choice', label: '单项选择', shortLabel: '单选', family: 'objective' },
  { key: 'multiple_choice', label: '多项选择', shortLabel: '多选', family: 'objective' },
  { key: 'true_false', label: '判断题', shortLabel: '判断', family: 'objective' },
  { key: 'fill_blank', label: '填空题', shortLabel: '填空', family: 'objective' },
  { key: 'cloze', label: '完形填空', shortLabel: '完形', family: 'objective' },
  { key: 'reading', label: '阅读理解', shortLabel: '阅读', family: 'compound' },
  { key: 'translation', label: '翻译题', shortLabel: '翻译', family: 'subjective' },
  { key: 'short_answer', label: '简答题', shortLabel: '简答', family: 'subjective' },
  { key: 'case_analysis', label: '案例分析', shortLabel: '案例', family: 'subjective' },
  { key: 'calculation', label: '计算题', shortLabel: '计算', family: 'subjective' },
  { key: 'operation', label: '操作题', shortLabel: '操作', family: 'subjective' },
  { key: 'essay', label: '作文题', shortLabel: '作文', family: 'subjective' },
  { key: 'composite', label: '综合题', shortLabel: '综合', family: 'compound' },
]

const QUESTION_TYPE_ALIAS = {
  legacy_single_choice: 'single_choice',
  legacy_multiple_choice: 'multiple_choice',
  legacy_true_false: 'true_false',
  legacy_fill_blank: 'fill_blank',
}

const QUESTION_TYPE_LOOKUP = new Map(QUESTION_TYPE_CATALOG.map((item) => [item.key, item]))

function createDownloadDoc(config) {
  return {
    description: '',
    ...config,
  }
}

function createGenerationConfig(config) {
  return {
    enabled: true,
    supportedModes: ['practice', 'mock_exam'],
    supportedQuestionTypes: [...COMMON_QUESTION_TYPE_KEYS],
    defaultCounts: [5, 10, 20],
    defaultDifficulty: 'medium',
    defaultDurationMinutes: 90,
    defaultPaperTotal: 0,
    promptProfile: 'generic',
    ...config,
  }
}

function createSubjectMeta(config) {
  return {
    expectedPaperTotal: null,
    defaultDurationMinutes: 90,
    isAvailable: true,
    questionTypeKeys: COMMON_QUESTION_TYPE_KEYS,
    downloadDocs: [],
    generation: createGenerationConfig(),
    ...config,
  }
}

export const SUBJECT_REGISTRY = [
  createSubjectMeta({
    key: 'english',
    routeSlug: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '支持本地题库导入、刷题模式、考试模式、历史记录、错题本与 AI 辅助。',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 150,
    defaultDurationMinutes: 90,
    questionTypeKeys: [
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_blank',
      'reading',
      'cloze',
      'translation',
      'essay',
    ],
    generation: createGenerationConfig({
      supportedQuestionTypes: ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'reading', 'cloze', 'translation', 'essay'],
      defaultPaperTotal: 150,
      defaultDurationMinutes: 90,
      promptProfile: 'english',
    }),
    downloadDocs: [
      createDownloadDoc({
        key: 'english-json-spec',
        title: '英语试题 JSON 解析规范文档',
        href: './json-schema.md',
        filename: '英语试题 JSON 解析规范文档.md',
        description: '支持单选、多选、判断、填空、阅读、完形、翻译和作文。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'data_structure',
    routeSlug: 'data-structure',
    label: '数据结构模考系统 V1.0',
    shortLabel: '数据结构',
    description: '支持本地题库导入、刷题模式、考试模式、历史记录与综合题练习。',
    route: '/exam/data-structure',
    workspaceRoute: '/workspace/data-structure',
    defaultDurationMinutes: 90,
    defaultPaperTotal: 100,
    questionTypeKeys: [
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_blank',
      'reading',
      'composite',
      'short_answer',
      'case_analysis',
      'calculation',
      'operation',
    ],
    generation: createGenerationConfig({
      supportedQuestionTypes: [
        'single_choice',
        'multiple_choice',
        'true_false',
        'fill_blank',
        'reading',
        'composite',
        'short_answer',
        'case_analysis',
        'calculation',
        'operation',
      ],
      defaultPaperTotal: 100,
      defaultDurationMinutes: 90,
      promptProfile: 'data_structure',
    }),
    downloadDocs: [
      createDownloadDoc({
        key: 'data-structure-json-spec',
        title: '数据结构试题 JSON 解析规范文档',
        href: './json-schema.md',
        filename: '数据结构试题 JSON 解析规范文档.md',
        description: '支持选择题、综合题、简答题、计算题与操作题。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'database_principles',
    routeSlug: 'database-principles',
    label: '数据库原理模考系统 V1.0',
    shortLabel: '数据库原理',
    description: '支持本地题库导入、刷题模式、考试模式、历史记录与综合题练习。',
    route: '/exam/database-principles',
    workspaceRoute: '/workspace/database-principles',
    defaultDurationMinutes: 90,
    defaultPaperTotal: 100,
    questionTypeKeys: [
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_blank',
      'reading',
      'composite',
      'short_answer',
      'case_analysis',
      'calculation',
      'operation',
    ],
    generation: createGenerationConfig({
      supportedQuestionTypes: [
        'single_choice',
        'multiple_choice',
        'true_false',
        'fill_blank',
        'reading',
        'composite',
        'short_answer',
        'case_analysis',
        'calculation',
        'operation',
      ],
      defaultPaperTotal: 100,
      defaultDurationMinutes: 90,
      promptProfile: 'database_principles',
    }),
    downloadDocs: [
      createDownloadDoc({
        key: 'database-principles-json-spec',
        title: '数据库原理试题 JSON 解析规范文档',
        href: './json-schema.md',
        filename: '数据库原理试题 JSON 解析规范文档.md',
        description: '支持选择题、综合题、简答题、计算题与操作题。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'international_trade',
    routeSlug: 'international-trade',
    label: '国际贸易模考系统 V1.0',
    shortLabel: '国际贸易',
    description: '支持国际贸易综合题库导入、刷题模式、考试模式与主观题 AI 评阅。',
    route: '/exam/international-trade',
    workspaceRoute: '/workspace/international-trade',
    expectedPaperTotal: 200,
    defaultDurationMinutes: 150,
    questionTypeKeys: [
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_blank',
      'reading',
      'translation',
      'short_answer',
      'case_analysis',
      'calculation',
      'operation',
      'essay',
    ],
    generation: createGenerationConfig({
      supportedQuestionTypes: [
        'single_choice',
        'multiple_choice',
        'true_false',
        'fill_blank',
        'reading',
        'translation',
        'short_answer',
        'case_analysis',
        'calculation',
        'operation',
        'essay',
      ],
      defaultPaperTotal: 200,
      defaultDurationMinutes: 150,
      promptProfile: 'international_trade',
    }),
    downloadDocs: [
      createDownloadDoc({
        key: 'international-trade-json-spec',
        title: '国际贸易试题 JSON 解析规范文档',
        href: './json-schema.md',
        filename: '国际贸易试题 JSON 解析规范文档.md',
        description: '支持单选、多选、判断、填空、阅读、翻译、简答、案例、计算、操作和作文。',
      }),
      createDownloadDoc({
        key: 'international-trade-sample',
        title: '国际贸易混合样卷示例 JSON',
        href: './sample-international-trade.json',
        filename: '国际贸易混合样卷示例.json',
        description: '一个 JSON 混合展示多题型样例，适合直接发给 AI 参考。',
      }),
    ],
  }),
]

const SUBJECT_FALLBACK = {
  key: 'unknown',
  routeSlug: 'unknown',
  label: '未知科目',
  shortLabel: '未知科目',
  description: '',
  route: null,
  workspaceRoute: null,
  expectedPaperTotal: null,
  defaultDurationMinutes: 90,
  isAvailable: false,
  questionTypeKeys: [],
  downloadDocs: [],
  generation: createGenerationConfig({
    enabled: false,
    supportedModes: [],
    supportedQuestionTypes: [],
    defaultCounts: [5],
    defaultDifficulty: 'medium',
    defaultDurationMinutes: 90,
    defaultPaperTotal: 0,
    promptProfile: 'generic',
  }),
}

export function normalizeQuestionTypeKey(value) {
  const key = String(value || '').trim()
  return QUESTION_TYPE_ALIAS[key] || key
}

export function getQuestionTypeMeta(typeKey) {
  const normalizedKey = normalizeQuestionTypeKey(typeKey)
  return QUESTION_TYPE_LOOKUP.get(normalizedKey) || {
    key: normalizedKey || 'unknown',
    label: '其他题型',
    shortLabel: '其他',
    family: 'other',
  }
}

export function getSubjectMeta(subjectKey) {
  const found = SUBJECT_REGISTRY.find((item) => item.key === subjectKey)
  if (found) return found

  return {
    ...SUBJECT_FALLBACK,
    key: subjectKey,
    routeSlug: subjectKey,
    label: subjectKey,
    shortLabel: subjectKey,
  }
}

export function getSubjectMetaByRouteParam(subjectParam) {
  return SUBJECT_REGISTRY.find((item) => item.routeSlug === subjectParam || item.key === subjectParam) || SUBJECT_REGISTRY[0]
}

export function getSubjectQuestionTypeKeys(subjectKey) {
  if (!subjectKey || subjectKey === 'all') {
    return [...new Set(SUBJECT_REGISTRY.flatMap((subject) => subject.questionTypeKeys || []))]
  }
  return getSubjectMeta(subjectKey).questionTypeKeys || []
}

export function getSubjectQuestionTypeOptions(subjectKey) {
  return getSubjectQuestionTypeKeys(subjectKey)
    .map((typeKey) => getQuestionTypeMeta(typeKey))
    .filter((item, index, list) => item.key && list.findIndex((candidate) => candidate.key === item.key) === index)
}

export function buildQuestionTypeSummary(typeKeys = [], options = {}) {
  const { short = true, separator = '、' } = options
  const labels = typeKeys
    .map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      return short ? meta.shortLabel : meta.label
    })
    .filter(Boolean)

  return labels.length ? labels.join(separator) : '通用题型'
}

export function getSubjectDownloadGroups() {
  return SUBJECT_REGISTRY.map((subject) => ({
    subjectKey: subject.key,
    subjectLabel: subject.label,
    shortLabel: subject.shortLabel,
    description: subject.description,
    questionTypeSummary: buildQuestionTypeSummary(subject.questionTypeKeys, { short: false }),
    generation: subject.generation,
    items: (subject.downloadDocs || []).map((doc) => ({
      ...doc,
      subjectKey: subject.key,
      subjectLabel: subject.label,
      questionTypeSummary: buildQuestionTypeSummary(subject.questionTypeKeys, { short: false }),
    })),
  })).filter((group) => group.items.length > 0)
}

export function getSubjectGenerationConfig(subjectKey) {
  return getSubjectMeta(subjectKey).generation || SUBJECT_FALLBACK.generation
}
