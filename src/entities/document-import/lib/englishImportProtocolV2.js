export const ENGLISH_IMPORT_PROTOCOL_V2 = {
  version: 'english-import-v2',
  subject: 'english',
  purpose: '将英语试卷文本清洗为可导入、可展示、尽量可自动判分的题库结构',
  allowedQuestionTypes: ['single_choice', 'cloze', 'reading', 'translation', 'essay'],
  outputRules: [
    '只输出一个 JSON 对象',
    '不要输出 Markdown',
    '不要输出代码围栏',
    '不要输出解释文字',
    '不要输出注释',
    '顶层必须使用 questions 数组',
    'subject 必须等于 english',
    '所有题目统一放入同一个 questions 数组',
  ],
  hardConstraints: [
    '英语试卷只允许 single_choice、cloze、reading、translation、essay 五种题型',
    '不要输出 multiple_choice、true_false、fill_blank、short_answer、composite 等其他题型',
    '不要把一篇阅读拆成多个顶层单选题',
    '不要把一篇完形拆成多个顶层单选题',
    '所有题目 id 必须唯一',
    '所有 score 必须是数字',
    'JSON 必须可解析',
  ],
  textCleanupRules: {
    chineseGarble: [
      '允许修复明显的中文乱码、错码和断裂短语',
      '没有上下文依据时，不要凭空重写整句',
    ],
    punctuation: [
      '统一全角与半角标点',
      '修复错误的引号、括号、破折号和选项分隔符',
    ],
    optionLetters: [
      '统一识别 A.、A)、A、 这类选项前缀',
      '若 OCR 明显把 B 识别成 8、把 D 识别成 0，可结合上下文纠正',
      '结构化后选项 key 必须统一为 A/B/C/D',
    ],
    whitespaceAndBreaks: [
      '清理连续空格和异常换行',
      '如果题干与选项被分页打断，应尝试恢复连续结构',
      '不得因为清洗换行而把相邻两题合并',
    ],
  },
  gradabilityRules: [
    '所有客观题必须优先保证 answer.correct 存在',
    '所有阅读子题必须有 answer.correct',
    '完形每空必须有 correct 与 rationale',
    '翻译题必须显式给 direction',
    '作文题必须给 answer.scoring_points',
  ],
  typeContracts: {
    single_choice: {
      requiredFields: ['id', 'type', 'prompt', 'score', 'options', 'answer.correct'],
      rules: [
        'options 必须正好四个',
        'options.key 只能是 A/B/C/D',
        'answer.correct 不能为空，且必须与某个选项 key 对应',
        'answer.rationale 默认用中文给出',
      ],
    },
    cloze: {
      requiredFields: ['id', 'type', 'prompt', 'score', 'article', 'blanks'],
      rules: [
        '整篇完形只写成一个 cloze',
        'article 中必须出现 [[1]]、[[2]] 这类文内空位占位符',
        'blanks.length 必须与文内空位数量一致',
        '每个 blank 必须有 blank_id、options、correct、rationale',
        '每个 blank.options 必须正好四个，correct 只能是 A/B/C/D',
      ],
    },
    reading: {
      requiredFields: ['id', 'type', 'prompt', 'score', 'passage', 'questions'],
      rules: [
        '每篇阅读只写成一个 reading',
        '阅读小题放在 questions 中',
        '阅读小题 type 必须是 single_choice',
        '每个子题必须有 answer.correct',
        '子题 id 使用 A-1、A-2、A-3 这种命名',
      ],
    },
    translation: {
      requiredFields: ['id', 'type', 'prompt', 'score', 'direction'],
      rules: [
        'direction 只能是 en_to_zh 或 zh_to_en',
        '正文必须放在 context 或 source_text',
        '尽量提供 answer.reference_answer 与 answer.scoring_points',
      ],
    },
    essay: {
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.scoring_points'],
      rules: [
        '作文题必须提供 scoring_points',
        'scoring_points 必须是非空数组',
        '如有字数要求或体裁要求，应保留在 prompt 中',
      ],
    },
  },
}

export function getDocumentImportProtocol(subjectKey) {
  if (subjectKey === 'english') {
    return ENGLISH_IMPORT_PROTOCOL_V2
  }

  return null
}
