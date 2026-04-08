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
        id: 'gq_002',
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
        id: 'gq_003',
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
        id: 'gq_004',
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
        id: 'gq_005',
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
    defaultScore: 20,
    description: '完形填空题，使用 article + blanks。',
    isLegacy: true,
    isDeprecated: true,
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: 'article 使用 [[1]]、[[2]] 占位，blanks 中提供选项和正确答案。',
      requiredFields: ['id', 'type', 'prompt', 'article', 'blanks[]'],
      example: {
        id: 'gq_006',
        type: 'cloze',
        prompt: '阅读短文并完成完形填空。',
        score: 20,
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
        id: 'gq_007',
        type: 'reading',
        prompt: '阅读下面短文并回答问题。',
        score: 10,
        passage: {
          title: 'Passage A',
          content: 'Tom likes reading books after school...',
        },
        questions: [
          {
            id: 'gq_007_1',
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
    inputMode: 'text',
    defaultScore: 15,
    description: '中译英或英译中。',
    mockExamConfig: { defaultCount: 2, defaultScore: 15 },
    generationContract: {
      summary: '必须提供 source_text、reference_answer 和 scoring_points。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'source_text', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_008',
        type: 'translation',
        prompt: '将下列句子译成中文。',
        score: 15,
        source_text: 'A good book is a good friend.',
        answer: createSubjectiveAnswer('好书如挚友。', ['语义准确', '表达通顺']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'essay',
    label: '作文题',
    shortLabel: '作文',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 30,
    description: '自由写作或命题写作。',
    mockExamConfig: { defaultCount: 1, defaultScore: 30 },
    generationContract: {
      summary: '必须提供写作要求、参考答案或评分参考，以及 scoring_points。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_009',
        type: 'essay',
        prompt: 'Write a short essay about your college life.',
        score: 30,
        answer: createSubjectiveAnswer('参考范文...', ['覆盖主题', '结构完整', '语言准确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'short_answer',
    label: '简答题',
    shortLabel: '简答',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 8,
    description: '简要说明、定义或比较题。',
    mockExamConfig: { defaultCount: 4, defaultScore: 8 },
    generationContract: {
      summary: '必须提供参考答案和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_010',
        type: 'short_answer',
        prompt: '简述栈和队列的区别。',
        score: 8,
        answer: createSubjectiveAnswer('栈是后进先出，队列是先进先出。', ['说明栈特点', '说明队列特点', '进行对比']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'case_analysis',
    label: '案例分析题',
    shortLabel: '案例',
    family: 'subjective',
    inputMode: 'structured_text',
    defaultScore: 12,
    description: '给出业务案例，要求判断、分析并说明理由。',
    mockExamConfig: { defaultCount: 2, defaultScore: 12 },
    generationContract: {
      summary: '应提供案例背景、问题、参考答案和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_011',
        type: 'case_analysis',
        prompt: '根据案例分析买方是否有权拒收。',
        score: 12,
        context: '某出口合同约定以信用证支付，卖方迟延提交单据。',
        answer: createSubjectiveAnswer('应结合迟延提交单据的后果判断。', ['识别争议点', '判断是否拒收', '说明依据']),
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
    description: '需要列出过程和最终结果的计算题。',
    mockExamConfig: { defaultCount: 3, defaultScore: 6 },
    generationContract: {
      summary: '必须给出标准过程、最终结果和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_012',
        type: 'calculation',
        prompt: '计算成功查找的平均查找长度。',
        score: 6,
        answer: createSubjectiveAnswer('ASL 成功 = ...', ['公式正确', '代入正确', '结果正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'operation',
    label: '操作题',
    shortLabel: '操作',
    family: 'subjective',
    inputMode: 'steps',
    defaultScore: 6,
    description: '要求按步骤写出结构变化、执行过程或图示。',
    mockExamConfig: { defaultCount: 3, defaultScore: 6 },
    generationContract: {
      summary: '必须给出步骤型参考答案或判定依据。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_013',
        type: 'operation',
        prompt: '画出其进行折半搜索时的判定树。',
        score: 6,
        answer: createSubjectiveAnswer('判定树如下 ...', ['根节点正确', '左右分支正确']),
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
    description: '要求写出程序、伪代码或核心算法。',
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: '必须提供代码背景、参考实现和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_014',
        type: 'programming',
        prompt: '编写函数实现二叉树层序遍历。',
        score: 20,
        context: '要求给出核心代码或伪代码。',
        answer: createSubjectiveAnswer('参考代码 ...', ['数据结构选择正确', '遍历逻辑正确', '边界条件完整']),
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
    description: '要求写出 SQL 语句。',
    mockExamConfig: { defaultCount: 2, defaultScore: 12 },
    generationContract: {
      summary: '必须提供表结构背景、目标结果和参考 SQL。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_015',
        type: 'sql',
        prompt: '查询每个部门平均工资最高的员工。',
        score: 12,
        context: '表 employee(emp_id, dept_id, salary, name)',
        answer: createSubjectiveAnswer('SELECT ...', ['分组正确', '子查询正确', '结果正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'er_diagram',
    label: 'E-R 图题',
    shortLabel: 'E-R 图',
    family: 'subjective',
    inputMode: 'diagram_text',
    defaultScore: 10,
    description: '根据业务描述设计 E-R 图。',
    mockExamConfig: { defaultCount: 1, defaultScore: 10 },
    generationContract: {
      summary: '必须说明实体、联系、属性和主键设计。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_016',
        type: 'er_diagram',
        prompt: '根据业务描述设计 E-R 图。',
        score: 10,
        context: '学生选课管理系统，包含学生、课程、教师、开课等信息。',
        answer: createSubjectiveAnswer('实体包括学生、课程、教师...', ['实体完整', '联系正确', '属性合理']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'composite',
    label: '综合题',
    shortLabel: '综合',
    family: 'compound',
    inputMode: 'composite',
    defaultScore: 10,
    description: '一个材料下挂多个子题。',
    mockExamConfig: { defaultCount: 2, defaultScore: 10 },
    generationContract: {
      summary: '必须提供 material/context 和 questions 子题数组，子题不能再嵌套 composite。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'material', 'questions[]'],
      example: {
        id: 'gq_017',
        type: 'composite',
        prompt: '根据给定顺序表完成下列问题。',
        score: 10,
        material: '{017, 094, 154, 170, 275}',
        questions: [
          {
            id: 'gq_017_1',
            type: 'operation',
            prompt: '画出折半搜索判定树。',
            score: 4,
            answer: createSubjectiveAnswer('判定树如下 ...', ['根节点正确', '左右分支正确']),
          },
          {
            id: 'gq_017_2',
            type: 'calculation',
            prompt: '计算平均搜索长度。',
            score: 6,
            answer: createSubjectiveAnswer('ASL = ...', ['公式正确', '计算正确']),
          },
        ],
      },
    },
  }),
]

export function normalizeQuestionTypeKey(typeKey) {
  const normalized = String(typeKey || '').trim()
  if (!normalized) return ''
  return QUESTION_TYPE_ALIAS[normalized] || normalized
}

export function getQuestionTypeMeta(typeKey) {
  const normalized = normalizeQuestionTypeKey(typeKey)
  return QUESTION_TYPE_CATALOG.find((item) => item.key === normalized) || createQuestionTypeMeta({ key: normalized, label: normalized, shortLabel: normalized })
}

export function buildQuestionTypeSummary(typeKeys = [], { short = true } = {}) {
  return typeKeys
    .map((typeKey) => getQuestionTypeMeta(typeKey))
    .filter((item, index, list) => item.key && list.findIndex((candidate) => candidate.key === item.key) === index)
    .map((item) => (short ? item.shortLabel : item.label))
    .join('、')
}
