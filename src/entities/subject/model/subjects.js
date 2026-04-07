export const SUBJECT_REGISTRY = [
  {
    key: 'english',
    routeSlug: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '支持本地题库导入、刷题模式、考试模式、历史记录与错题本闭环。',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 150,
    defaultDurationMinutes: 90,
    isAvailable: true,
  },
  {
    key: 'data_structure',
    routeSlug: 'data-structure',
    label: '数据结构模考系统 V1.0',
    shortLabel: '数据结构',
    description: '支持本地题库导入、刷题模式、考试模式与历史记录。',
    route: '/exam/data-structure',
    workspaceRoute: '/workspace/data-structure',
    expectedPaperTotal: null,
    defaultDurationMinutes: 90,
    isAvailable: true,
  },
  {
    key: 'database_principles',
    routeSlug: 'database-principles',
    label: '数据库原理模考系统 V1.0',
    shortLabel: '数据库原理',
    description: '支持本地题库导入、刷题模式、考试模式与历史记录。',
    route: '/exam/database-principles',
    workspaceRoute: '/workspace/database-principles',
    expectedPaperTotal: null,
    defaultDurationMinutes: 90,
    isAvailable: true,
  },
  {
    key: 'international_trade',
    routeSlug: 'international-trade',
    label: '国际贸易模考系统 V1.0',
    shortLabel: '国际贸易',
    description: '支持国际贸易综合题库导入、刷题模式、考试模式与主观题 AI 评阅。',
    route: '/exam/international-trade',
    workspaceRoute: '/workspace/international-trade',
    expectedPaperTotal: 200,
    defaultDurationMinutes: 150,
    isAvailable: true,
  },
]

export function getSubjectMeta(subjectKey) {
  return SUBJECT_REGISTRY.find((item) => item.key === subjectKey) || {
    key: subjectKey,
    routeSlug: subjectKey,
    label: subjectKey,
    shortLabel: subjectKey,
    description: '',
    route: null,
    workspaceRoute: null,
    isAvailable: false,
  }
}

export function getSubjectMetaByRouteParam(subjectParam) {
  return SUBJECT_REGISTRY.find((item) => item.routeSlug === subjectParam || item.key === subjectParam) || SUBJECT_REGISTRY[0]
}
