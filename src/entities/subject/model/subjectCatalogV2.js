import {
  buildQuestionTypeSummary,
  getQuestionTypeMeta,
  normalizeQuestionTypeKey,
  QUESTION_TYPE_CATALOG,
} from './questionTypes.js'

function createDownloadDoc(config) {
  return {
    description: '',
    ...config,
  }
}

function createGenerationConfig(config = {}) {
  return {
    enabled: true,
    supportedModes: ['practice', 'mock_exam'],
    supportedQuestionTypes: [],
    defaultCounts: [5, 10, 20],
    defaultDifficulty: 'medium',
    defaultDurationMinutes: 90,
    defaultPaperTotal: 0,
    promptProfile: 'generic',
    ...config,
  }
}

function createSubjectMeta(config) {
  const questionTypeKeys = config.questionTypeKeys || []

  return {
    expectedPaperTotal: null,
    defaultDurationMinutes: 90,
    isAvailable: true,
    questionTypeKeys,
    downloadDocs: [],
    generation: createGenerationConfig({
      supportedQuestionTypes: questionTypeKeys,
      defaultDurationMinutes: config.defaultDurationMinutes || 90,
      defaultPaperTotal: config.expectedPaperTotal || 0,
      ...(config.generation || {}),
    }),
    ...config,
  }
}

export const SUBJECT_REGISTRY = [
  createSubjectMeta({
    key: 'english',
    routeSlug: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '支持英语题库导入、刷题模式、考试模式、历史记录、错题本与 AI 辅助。',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 150,
    defaultDurationMinutes: 90,
    questionTypeKeys: ['single_choice', 'cloze', 'reading', 'translation', 'essay'],
    generation: createGenerationConfig({
      supportedQuestionTypes: ['single_choice', 'cloze', 'reading', 'translation', 'essay'],
      defaultPaperTotal: 150,
      defaultDurationMinutes: 90,
      promptProfile: 'english',
    }),
    downloadDocs: [
      createDownloadDoc({
        key: 'english-json-spec',
        title: '英语试卷解析规范',
        href: './英语试卷解析规范.JSON',
        filename: '英语试卷解析规范.JSON',
        description: '仅支持单选题、阅读理解、完形填空、翻译题和作文题。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'data_structure',
    routeSlug: 'data-structure',
    label: '数据结构模考系统 V1.0',
    shortLabel: '数据结构',
    description: '支持题库导入、刷题模式、考试模式、历史记录与综合题练习。',
    route: '/exam/data-structure',
    workspaceRoute: '/workspace/data-structure',
    expectedPaperTotal: 100,
    defaultDurationMinutes: 90,
    questionTypeKeys: [
      'single_choice',
      'true_false',
      'fill_blank',
      'function_fill_blank',
      'short_answer',
      'programming',
      'composite',
    ],
    generation: createGenerationConfig({
      supportedQuestionTypes: [
        'single_choice',
        'true_false',
        'fill_blank',
        'function_fill_blank',
        'short_answer',
        'programming',
        'composite',
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
        description: '支持单选、判断、填空、函数填空、简答、程序设计和综合题。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'database_principles',
    routeSlug: 'database-principles',
    label: '数据库原理模考系统 V1.0',
    shortLabel: '数据库原理',
    description: '支持题库导入、刷题模式、考试模式、历史记录与数据库综合题练习。',
    route: '/exam/database-principles',
    workspaceRoute: '/workspace/database-principles',
    expectedPaperTotal: 100,
    defaultDurationMinutes: 90,
    questionTypeKeys: ['single_choice', 'true_false', 'fill_blank', 'short_answer', 'composite', 'sql', 'er_diagram'],
    generation: createGenerationConfig({
      supportedQuestionTypes: ['single_choice', 'true_false', 'fill_blank', 'short_answer', 'composite', 'sql', 'er_diagram'],
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
        description: '支持单选、判断、填空、简答、综合题、SQL 题和 E-R 图题。',
      }),
    ],
  }),
  createSubjectMeta({
    key: 'international_trade',
    routeSlug: 'international-trade',
    label: '国际贸易模考系统 V1.0',
    shortLabel: '国际贸易',
    description: '支持国际贸易题库导入、刷题模式、考试模式以及主观题 AI 评阅。',
    route: '/exam/international-trade',
    workspaceRoute: '/workspace/international-trade',
    expectedPaperTotal: 200,
    defaultDurationMinutes: 150,
    questionTypeKeys: [
      'single_choice',
      'true_false',
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
        'true_false',
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
        description: '支持单选、判断、翻译、简答、案例分析、计算、操作和作文。',
      }),
      createDownloadDoc({
        key: 'international-trade-sample',
        title: '国际贸易混合样卷示例 JSON',
        href: './sample-international-trade.json',
        filename: '国际贸易混合样卷示例.json',
        description: '一个 JSON 混合展示多题型样例，适合直接交给 AI 参考。',
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

export {
  QUESTION_TYPE_CATALOG,
  buildQuestionTypeSummary,
  getQuestionTypeMeta,
  normalizeQuestionTypeKey,
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
    .map((typeKey) => {
      const meta = getQuestionTypeMeta(typeKey)
      return {
        ...meta,
        mockExamDefaultCount: meta.mockExamConfig?.defaultCount || 1,
        mockExamDefaultScore: meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
      }
    })
    .filter((item, index, list) => item.key && list.findIndex((candidate) => candidate.key === item.key) === index)
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

export function buildQuestionPlan(typeKeys = [], options = []) {
  const optionLookup = new Map(options.map((item) => [item.key, item]))
  return typeKeys.reduce((plan, typeKey) => {
    const meta = optionLookup.get(typeKey) || getQuestionTypeMeta(typeKey)
    plan[typeKey] = {
      count: meta.mockExamDefaultCount || meta.mockExamConfig?.defaultCount || 1,
      score: meta.mockExamDefaultScore || meta.mockExamConfig?.defaultScore || meta.defaultScore || 1,
    }
    return plan
  }, {})
}

export function normalizeQuestionPlan(typeKeys = [], questionPlan = {}, options = []) {
  const optionLookup = new Map(options.map((item) => [item.key, item]))
  return typeKeys.reduce((plan, typeKey) => {
    const meta = optionLookup.get(typeKey) || getQuestionTypeMeta(typeKey)
    const rawPlan = questionPlan?.[typeKey] || {}
    const count = Math.max(1, Number(rawPlan.count) || meta.mockExamDefaultCount || meta.mockExamConfig?.defaultCount || 1)
    const score = Math.max(1, Number(rawPlan.score) || meta.mockExamDefaultScore || meta.mockExamConfig?.defaultScore || meta.defaultScore || 1)
    plan[typeKey] = { count, score }
    return plan
  }, {})
}

