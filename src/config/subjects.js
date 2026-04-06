export const SUBJECT_REGISTRY = [
  {
    key: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '支持 90 分钟计时、断点续刷、历史记录与错题本闭环。',
    route: '/exam/english',
    isAvailable: true,
  },
  {
    key: 'data_structure',
    label: '数据结构',
    shortLabel: '数据结构',
    description: '系统路由与本地数据库已为该科目预留扩展位。',
    route: null,
    isAvailable: false,
  },
  {
    key: 'database_principles',
    label: '数据库原理',
    shortLabel: '数据库原理',
    description: '后续可复用当前的本地档案、题库与成绩记录框架。',
    route: null,
    isAvailable: false,
  },
]

export function getSubjectMeta(subjectKey) {
  return SUBJECT_REGISTRY.find((item) => item.key === subjectKey) || {
    key: subjectKey,
    label: subjectKey,
    shortLabel: subjectKey,
    description: '',
    route: null,
    isAvailable: false,
  }
}
