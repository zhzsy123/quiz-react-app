const QUESTION_TYPE_ALIAS = {
  legacy_single_choice: 'single_choice',
  legacy_multiple_choice: 'multiple_choice',
  legacy_true_false: 'true_false',
  legacy_fill_blank: 'fill_blank',
  function_blank: 'function_fill_blank',
  function_cloze: 'function_fill_blank',
  program_design: 'programming',
  programming_question: 'programming',
  sql_question: 'sql',
  er: 'er_diagram',
}

function createObjectiveAnswer(correct = 'A', rationale = '请给出简短中文解析。') {
  return {
    type: 'objective',
    correct,
    rationale,
  }
}

function createSubjectiveAnswer(referenceAnswer = '请给出参考答案。', scoringPoints = ['命中关键评分点']) {
  return {
    type: 'subjective',
    reference_answer: referenceAnswer,
    scoring_points: scoringPoints,
  }
}

function createQuestionTypeMeta(config) {
  return {
    key: 'unknown',
    label: '其他题型',
    shortLabel: '其他',
    family: 'other',
    inputMode: 'text',
    defaultScore: 1,
    description: '',
    supportsGeneration: true,
    supportsImport: true,
    supportsMockExam: true,
    supportsDisplay: true,
    aliases: [],
    isLegacy: false,
    isDeprecated: false,
    mockExamConfig: {
      defaultCount: 1,
      defaultScore: 1,
    },
    generationContract: null,
    ...config,
  }
}

export const QUESTION_TYPE_CATALOG = [
  createQuestionTypeMeta({
    key: 'single_choice',
    label: '单项选择题',
    shortLabel: '单选',
    family: 'objective',
    inputMode: 'choice',
    defaultScore: 2,
    description: '四选一客观题。',
    mockExamConfig: { defaultCount: 10, defaultScore: 2 },
    generationContract: {
      summary: '生成四个选项，且仅有一个正确答案。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'options', 'answer.correct', 'answer.rationale'],
      example: {
        id: 'gq_001',
        type: 'single_choice',
        prompt: '下列说法正确的是（）。',
        score: 2,
        options: [
          { key: 'A', text: '选项 A' },
          { key: 'B', text: '选项 B' },
          { key: 'C', text: '选项 C' },
          { key: 'D', text: '选项 D' },
        ],
        answer: createObjectiveAnswer('B'),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'multiple_choice',
    label: '多项选择题',
    shortLabel: '多选',
    family: 'objective',
    inputMode: 'choice_multi',
    defaultScore: 2,
    description: '多选客观题。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 5, defaultScore: 2 },
    generationContract: {
      summary: '生成至少四个选项，answer.correct 必须是选项 key 数组。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'options', 'answer.correct[]', 'answer.rationale'],
      example: {
        id: 'gq_001',
        type: 'multiple_choice',
        prompt: '下列说法正确的是（）。',
        score: 2,
        options: [
          { key: 'A', text: '选项 A' },
          { key: 'B', text: '选项 B' },
          { key: 'C', text: '选项 C' },
          { key: 'D', text: '选项 D' },
        ],
        answer: createObjectiveAnswer(['A', 'C']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'true_false',
    label: '判断题',
    shortLabel: '判断',
    family: 'objective',
    inputMode: 'boolean',
    defaultScore: 2,
    description: '正确 / 错误判断题。',
    mockExamConfig: { defaultCount: 10, defaultScore: 2 },
    generationContract: {
      summary: 'answer.correct 只能是 T 或 F。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.correct', 'answer.rationale'],
      example: {
        id: 'gq_001',
        type: 'true_false',
        prompt: '二叉树的度可以大于 2。',
        score: 2,
        answer: createObjectiveAnswer('F'),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'fill_blank',
    label: '填空题',
    shortLabel: '填空',
    family: 'objective',
    inputMode: 'blank',
    defaultScore: 2,
    description: '普通填空题，可单空或多空。',
    mockExamConfig: { defaultCount: 6, defaultScore: 2 },
    generationContract: {
      summary: '使用 blanks 数组描述每个空的标准答案。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'blanks[]'],
      example: {
        id: 'gq_001',
        type: 'fill_blank',
        prompt: '栈的基本操作包括 ____ 和 ____。',
        score: 4,
        blanks: [
          { blank_id: 1, accepted_answers: ['入栈', 'push'], score: 2, rationale: '第一空是入栈。' },
          { blank_id: 2, accepted_answers: ['出栈', 'pop'], score: 2, rationale: '第二空是出栈。' },
        ],
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'function_fill_blank',
    label: '函数填空题',
    shortLabel: '函数填空',
    family: 'objective',
    inputMode: 'blank',
    defaultScore: 4,
    description: '代码片段或函数体填空题，可多空。',
    mockExamConfig: { defaultCount: 3, defaultScore: 4 },
    generationContract: {
      summary: '沿用 blanks 结构，但题型必须是 function_fill_blank。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'response_format', 'blanks[]'],
      example: {
        id: 'gq_001',
        type: 'function_fill_blank',
        prompt: '补全顺序查找函数。',
        score: 6,
        context:
          'int search(int a[], int n, int key) { for (int i = 0; i < ____; ++i) { if (a[i] == key) return ____; } return -1; }',
        response_format: 'code',
        blanks: [
          { blank_id: 1, accepted_answers: ['n'], score: 3, rationale: '循环上界是 n。' },
          { blank_id: 2, accepted_answers: ['i'], score: 3, rationale: '返回当前位置 i。' },
        ],
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'cloze',
    label: '完形填空',
    shortLabel: '完形',
    family: 'compound',
    inputMode: 'cloze',
    defaultScore: 2,
    description: '完形填空题，使用 article + blanks。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: 'article 使用 [[1]]、[[2]] 占位，blanks 中提供选项和正确答案。',
      requiredFields: ['id', 'type', 'prompt', 'article', 'blanks[]'],
      example: {
        id: 'gq_001',
        type: 'cloze',
        prompt: '阅读短文并完成完形填空。',
        score: 4,
        article: 'He [[1]] to school every day and [[2]] hard.',
        blanks: [
          {
            blank_id: 1,
            score: 2,
            options: [
              { key: 'A', text: 'go' },
              { key: 'B', text: 'goes' },
              { key: 'C', text: 'went' },
              { key: 'D', text: 'gone' },
            ],
            correct: 'B',
            rationale: '主语是第三人称单数。',
          },
        ],
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'reading',
    label: '阅读理解',
    shortLabel: '阅读',
    family: 'compound',
    inputMode: 'reading',
    defaultScore: 10,
    description: '文章材料 + 多个客观子题。',
    mockExamConfig: { defaultCount: 4, defaultScore: 10 },
    generationContract: {
      summary: 'passage 必须是对象，questions 必须是单选子题数组。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'passage.content', 'questions[]'],
      example: {
        id: 'gq_001',
        type: 'reading',
        prompt: '阅读下面短文并回答问题。',
        score: 10,
        passage: {
          title: 'Passage A',
          content: 'Tom likes reading books after school...',
        },
        questions: [
          {
            id: 'gq_001_1',
            type: 'single_choice',
            prompt: 'What does Tom like to do after school?',
            score: 2.5,
            options: [
              { key: 'A', text: 'Play football.' },
              { key: 'B', text: 'Read books.' },
              { key: 'C', text: 'Watch TV.' },
              { key: 'D', text: 'Go shopping.' },
            ],
            answer: createObjectiveAnswer('B'),
          },
        ],
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'translation',
    label: '翻译题',
    shortLabel: '翻译',
    family: 'subjective',
    inputMode: 'translation',
    defaultScore: 15,
    description: '翻译主观题。',
    mockExamConfig: { defaultCount: 1, defaultScore: 15 },
    generationContract: {
      summary: '必须提供 source_text 与参考答案。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'source_text', 'answer.reference_answer'],
      example: {
        id: 'gq_001',
        type: 'translation',
        prompt: '请将下面句子翻译成中文。',
        score: 15,
        source_text: 'Knowledge changes destiny.',
        answer: createSubjectiveAnswer('知识改变命运。', ['译文准确', '表达自然']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'essay',
    label: '作文题',
    shortLabel: '作文',
    family: 'subjective',
    inputMode: 'essay',
    defaultScore: 30,
    description: '长文本写作题。',
    mockExamConfig: { defaultCount: 1, defaultScore: 30 },
    generationContract: {
      summary: '必须提供 requirements 与参考范文。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'requirements', 'answer.reference_answer'],
      example: {
        id: 'gq_001',
        type: 'essay',
        prompt: '请以 My Favorite Hobby 为题写一篇短文。',
        score: 30,
        requirements: {
          topic: 'My Favorite Hobby',
          word_limit: '120-150',
        },
        answer: {
          type: 'subjective',
          reference_answer: '这里给出参考范文。',
          scoring_points: ['内容完整', '结构清晰', '语言自然'],
        },
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'short_answer',
    label: '简答题',
    shortLabel: '简答',
    family: 'subjective',
    inputMode: 'structured_text',
    defaultScore: 10,
    description: '简答主观题。',
    mockExamConfig: { defaultCount: 4, defaultScore: 10 },
    generationContract: {
      summary: '必须提供 reference_answer 与 scoring_points。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'short_answer',
        prompt: '简述栈和队列的区别。',
        score: 10,
        answer: createSubjectiveAnswer('栈是后进先出，队列是先进先出。', ['说明栈的特点', '说明队列的特点', '比较差异']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'case_analysis',
    label: '案例分析题',
    shortLabel: '案例',
    family: 'subjective',
    inputMode: 'structured_text',
    defaultScore: 20,
    description: '案例分析题。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 2, defaultScore: 20 },
    generationContract: {
      summary: '需要 context 与评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'case_analysis',
        prompt: '根据案例判断卖方是否违约。',
        score: 20,
        context: '某出口合同约定装运时间为 3 月 1 日……',
        answer: createSubjectiveAnswer('卖方构成违约。', ['识别争议点', '判断是否违约', '说明理由']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'calculation',
    label: '计算题',
    shortLabel: '计算',
    family: 'subjective',
    inputMode: 'steps_with_final',
    defaultScore: 6,
    description: '需要结果和过程的计算题。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 2, defaultScore: 6 },
    generationContract: {
      summary: '答案应包含最终结果与关键步骤评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'calculation',
        prompt: '计算成功查找的平均搜索长度。',
        score: 6,
        answer: createSubjectiveAnswer('ASL = 3.14。', ['列出公式', '代入数据', '结果正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'operation',
    label: '操作题',
    shortLabel: '操作',
    family: 'subjective',
    inputMode: 'steps',
    defaultScore: 8,
    description: '强调步骤和过程的操作题。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 2, defaultScore: 8 },
    generationContract: {
      summary: '答案应给出操作步骤。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'operation',
        prompt: '画出折半查找判定树。',
        score: 8,
        answer: createSubjectiveAnswer('根节点为 503，左子树……', ['根节点正确', '左右子树结构正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'programming',
    label: '程序设计题',
    shortLabel: '程序设计',
    family: 'subjective',
    inputMode: 'code',
    defaultScore: 20,
    description: '程序设计或算法实现题。',
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: 'response_format 使用 code，reference_answer 给出关键代码或伪代码。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'response_format', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'programming',
        prompt: '编写函数实现链表逆置。',
        score: 20,
        response_format: 'code',
        answer: createSubjectiveAnswer('给出关键代码或伪代码。', ['函数接口正确', '核心逻辑正确', '边界处理合理']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'sql',
    label: 'SQL 题',
    shortLabel: 'SQL',
    family: 'subjective',
    inputMode: 'sql',
    defaultScore: 12,
    description: 'SQL 编写题。',
    mockExamConfig: { defaultCount: 2, defaultScore: 12 },
    generationContract: {
      summary: 'response_format 必须是 sql，reference_answer 给出标准 SQL。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'response_format', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'sql',
        prompt: '查询每个部门的平均工资。',
        score: 12,
        response_format: 'sql',
        answer: createSubjectiveAnswer('SELECT dept_id, AVG(salary) ...', ['字段正确', '聚合正确', '分组正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'er_diagram',
    label: 'E-R 图题',
    shortLabel: 'E-R 图',
    family: 'subjective',
    inputMode: 'diagram_text',
    defaultScore: 12,
    description: 'E-R 图或概念模型设计题。',
    mockExamConfig: { defaultCount: 1, defaultScore: 12 },
    generationContract: {
      summary: '用结构化文本描述实体、属性、联系。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points[]'],
      example: {
        id: 'gq_001',
        type: 'er_diagram',
        prompt: '为图书管理系统设计 E-R 图。',
        score: 12,
        answer: createSubjectiveAnswer('实体：图书、读者、借阅；联系：借阅。', ['实体完整', '属性合理', '联系正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'composite',
    label: '综合题',
    shortLabel: '综合',
    family: 'compound',
    inputMode: 'composite',
    defaultScore: 12,
    description: '一个材料下挂多个子题。',
    mockExamConfig: { defaultCount: 2, defaultScore: 20 },
    generationContract: {
      summary: '使用 material 和 questions[]，questions 中放允许的子题类型。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'material', 'questions[]'],
      example: {
        id: 'gq_001',
        type: 'composite',
        prompt: '根据给定数据完成下列问题。',
        score: 12,
        material: '{15, 18, 29, 12, 33}',
        material_format: 'plain',
        questions: [
          {
            id: 'gq_001_1',
            type: 'single_choice',
            prompt: '下列说法正确的是（）。',
            score: 2,
            options: [
              { key: 'A', text: '选项 A' },
              { key: 'B', text: '选项 B' },
              { key: 'C', text: '选项 C' },
              { key: 'D', text: '选项 D' },
            ],
            answer: createObjectiveAnswer('A'),
          },
          {
            id: 'gq_001_2',
            type: 'short_answer',
            prompt: '简述原因。',
            score: 10,
            answer: createSubjectiveAnswer('给出参考答案。', ['命中关键点 1', '命中关键点 2']),
          },
        ],
      },
    },
  }),
]

const QUESTION_TYPE_LOOKUP = new Map(QUESTION_TYPE_CATALOG.map((item) => [item.key, item]))

export function normalizeQuestionTypeKey(value) {
  const key = String(value || '').trim()
  return QUESTION_TYPE_ALIAS[key] || key
}

export function getQuestionTypeMeta(typeKey) {
  const normalizedKey = normalizeQuestionTypeKey(typeKey)
  return (
    QUESTION_TYPE_LOOKUP.get(normalizedKey) || {
      key: normalizedKey || 'unknown',
      label: '其他题型',
      shortLabel: '其他',
      family: 'other',
      inputMode: 'text',
      defaultScore: 1,
      description: '',
      generationContract: null,
      mockExamConfig: {
        defaultCount: 1,
        defaultScore: 1,
      },
    }
  )
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
