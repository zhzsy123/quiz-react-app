const QUESTION_TYPE_ALIAS = {
  legacy_single_choice: 'single_choice',
  legacy_multiple_choice: 'multiple_choice',
  legacy_true_false: 'true_false',
  legacy_fill_blank: 'fill_blank',
  singlechoice: 'single_choice',
  single_choice_question: 'single_choice',
  multiplechoice: 'multiple_choice',
  multiple_choice_question: 'multiple_choice',
  truefalse: 'true_false',
  true_false_question: 'true_false',
  blank_fill: 'fill_blank',
  fill_in_blank: 'fill_blank',
  fillintheblank: 'fill_blank',
  function_blank: 'function_fill_blank',
  function_cloze: 'function_fill_blank',
  function_fill_in_blank: 'function_fill_blank',
  function_fillintheblank: 'function_fill_blank',
  cloze_question: 'cloze',
  cloze_test: 'cloze',
  cloze_fill: 'cloze',
  cloze_filling: 'cloze',
  reading_comprehension: 'reading',
  reading_question: 'reading',
  translation_question: 'translation',
  essay_question: 'essay',
  shortanswer: 'short_answer',
  short_answer_question: 'short_answer',
  case_study: 'case_analysis',
  case_question: 'case_analysis',
  calculation_question: 'calculation',
  operation_question: 'operation',
  program_design: 'programming',
  programming_question: 'programming',
  sql_question: 'sql',
  er_question: 'er_diagram',
  er: 'er_diagram',
  relation_algebra: 'relational_algebra',
  relationalalgebra: 'relational_algebra',
  relational_algebra_question: 'relational_algebra',
  '单项选择题': 'single_choice',
  单选题: 'single_choice',
  单选: 'single_choice',
  '多项选择题': 'multiple_choice',
  多选题: 'multiple_choice',
  多选: 'multiple_choice',
  判断题: 'true_false',
  判断: 'true_false',
  填空题: 'fill_blank',
  填空: 'fill_blank',
  '函数填空题': 'function_fill_blank',
  函数填空: 'function_fill_blank',
  '完形填空': 'cloze',
  '完型填空': 'cloze',
  完形: 'cloze',
  完型: 'cloze',
  '阅读理解': 'reading',
  阅读题: 'reading',
  翻译题: 'translation',
  翻译: 'translation',
  作文题: 'essay',
  作文: 'essay',
  简答题: 'short_answer',
  简答: 'short_answer',
  案例分析题: 'case_analysis',
  案例分析: 'case_analysis',
  计算题: 'calculation',
  计算: 'calculation',
  操作题: 'operation',
  操作: 'operation',
  程序设计题: 'programming',
  程序设计: 'programming',
  SQL题: 'sql',
  SQL: 'sql',
  'E-R图题': 'er_diagram',
  'ER图题': 'er_diagram',
  'E-R图': 'er_diagram',
  'ER图': 'er_diagram',
}

function createObjectiveAnswer(correct = 'A', rationale = '请给出简短中文解析。') {
  return {
    type: 'objective',
    correct,
    rationale,
  }
}

function createSubjectiveAnswer(
  referenceAnswer = '请给出参考答案。',
  scoringPoints = ['命中关键评分点']
) {
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
    description: '标准客观单选题。',
    mockExamConfig: { defaultCount: 10, defaultScore: 2 },
    generationContract: {
      summary: '生成四个选项，并且仅有一个正确答案。',
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
      summary: 'answer.correct 必须是选项 key 数组。',
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
    description: '普通填空题，可以是单空或多空。',
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
    description: '代码片段或函数体填空题，可以有多个空。',
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
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: 'article 使用 [[1]]、[[2]] 占位，blanks 提供选项和答案。',
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
    description: '文章材料加多个单选子题。',
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
        answer: createSubjectiveAnswer('好书如良友。', ['语义准确', '表达通顺']),
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
    shortLabel: '案例分析',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 10,
    description: '结合材料进行分析和判断。',
    mockExamConfig: { defaultCount: 2, defaultScore: 10 },
    generationContract: {
      summary: '必须提供案例材料、参考答案和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_011',
        type: 'case_analysis',
        prompt: '根据案例分析卖方是否违约。',
        score: 10,
        context: '某出口合同约定...',
        answer: createSubjectiveAnswer('卖方构成违约。', ['识别争议焦点', '判断违约与否', '说明理由']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'calculation',
    label: '计算题',
    shortLabel: '计算',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 6,
    description: '要求写出计算过程和结果。',
    mockExamConfig: { defaultCount: 3, defaultScore: 6 },
    generationContract: {
      summary: '必须给出最终结果、参考步骤和评分点。',
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
    inputMode: 'text',
    defaultScore: 5,
    description: '要求写出操作步骤、图或状态变化。',
    mockExamConfig: { defaultCount: 3, defaultScore: 5 },
    generationContract: {
      summary: '必须提供参考步骤和评分点，适合流程或图示型题目。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_013',
        type: 'operation',
        prompt: '画出折半搜索判定树。',
        score: 5,
        answer: createSubjectiveAnswer('根节点为 ...', ['根节点正确', '左右分支正确', '层次清晰']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'programming',
    label: '程序设计题',
    shortLabel: '程序设计',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 12,
    description: '要求写出程序或伪代码。',
    mockExamConfig: { defaultCount: 2, defaultScore: 12 },
    generationContract: {
      summary: '必须给出题目要求、参考代码思路和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_014',
        type: 'programming',
        prompt: '编写函数实现冒泡排序。',
        score: 12,
        answer: createSubjectiveAnswer('参考代码...', ['函数定义正确', '排序逻辑正确', '边界处理正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'sql',
    label: 'SQL 题',
    shortLabel: 'SQL',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 8,
    description: '数据库查询、更新或建模相关 SQL 题。',
    mockExamConfig: { defaultCount: 2, defaultScore: 8 },
    generationContract: {
      summary: '必须给出表结构背景、参考 SQL 和评分点。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_015',
        type: 'sql',
        prompt: '查询每个学院平均成绩最高的学生。',
        score: 8,
        context: 'Student(id, name, dept_id, score)',
        answer: createSubjectiveAnswer('SELECT ...', ['连接关系正确', '分组逻辑正确', '筛选条件正确']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'er_diagram',
    label: 'E-R 图题',
    shortLabel: 'E-R 图',
    family: 'subjective',
    inputMode: 'text',
    defaultScore: 8,
    description: '实体联系图与关系模型相关题。',
    mockExamConfig: { defaultCount: 2, defaultScore: 8 },
    generationContract: {
      summary: '必须说明业务背景、实体、属性和联系。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'context', 'answer.reference_answer', 'answer.scoring_points'],
      example: {
        id: 'gq_016',
        type: 'er_diagram',
        prompt: '根据业务描述绘制 E-R 图。',
        score: 8,
        context: '学生可以选修多门课程...',
        answer: createSubjectiveAnswer('实体包括学生、课程...', ['实体完整', '联系正确', '主键清晰']),
      },
    },
  }),
  createQuestionTypeMeta({
    key: 'relational_algebra',
    label: '关系代数题',
    shortLabel: '关系代数',
    family: 'compound',
    inputMode: 'relational_algebra',
    defaultScore: 20,
    description: '数据库原理中的关系代数表达式推导题，按小题分段作答并支持逻辑等价判定。',
    mockExamConfig: { defaultCount: 1, defaultScore: 20 },
    generationContract: {
      summary: '使用 schemas 描述关系模式，subquestions 中每个小题给出 prompt、score 和 reference_answer。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'schemas[]', 'subquestions[]', 'subquestions[].reference_answer'],
      example: {
        id: 'gq_017',
        type: 'relational_algebra',
        prompt: '已知关系模式：学生(学号, 姓名, 性别, 专业, 奖学金)、课程(课程号, 名称, 学分)、学习(学号, 课程号, 分数)，请用关系代数表达式完成下列查询。',
        score: 20,
        schemas: [
          {
            name: '学生',
            attributes: ['学号', '姓名', '性别', '专业', '奖学金'],
          },
          {
            name: '课程',
            attributes: ['课程号', '名称', '学分'],
          },
          {
            name: '学习',
            attributes: ['学号', '课程号', '分数'],
          },
        ],
        subquestions: [
          {
            id: '1',
            label: '（1）',
            prompt: '检索“英语”专业学生所学课程的信息，包括学号、姓名、课程名和分数。',
            score: 5,
            reference_answer: 'Π[学号,姓名,课程名,分数](σ[专业=\'英语\'](学生 ⋈ 学习 ⋈ 课程))',
          },
          {
            id: '2',
            label: '（2）',
            prompt: '检索“数据库原理”课程成绩高于 90 分的所有学生的学号、姓名、专业和分数。',
            score: 5,
            reference_answer: 'Π[学号,姓名,专业,分数](σ[名称=\'数据库原理\' AND 分数>90](学生 ⋈ 学习 ⋈ 课程))',
          },
          {
            id: '3',
            label: '（3）',
            prompt: '检索不学课程号为“C135”课程的学生信息，包括学号、姓名和专业。',
            score: 5,
            reference_answer: 'Π[学号,姓名,专业](学生) - Π[学号,姓名,专业](σ[课程号=\'C135\'](学生 ⋈ 学习))',
          },
          {
            id: '4',
            label: '（4）',
            prompt: '检索没有任何一门课程成绩不及格的所有学生的信息，包括学号、姓名和专业。',
            score: 5,
            reference_answer: 'Π[学号,姓名,专业](学生) - Π[学号,姓名,专业](σ[分数<60](学生 ⋈ 学习))',
          },
        ],
        tooling: {
          symbols: ['Π', 'σ', '⋈', '∪', '∩', '-', '÷', 'ρ', 'AND', 'OR', '=', '!=', '>', '<', '>=', '<='],
          wrap_symbols: ['Π', 'σ', '⋈', 'ρ'],
          default_join_symbol: '⋈',
        },
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
    description: '一段材料下挂多个子题，可混合客观与主观。',
    mockExamConfig: { defaultCount: 2, defaultScore: 10 },
    generationContract: {
      summary: '必须使用 material 和 questions 数组，questions 内每个子题都要符合自身题型协议。',
      requiredFields: ['id', 'type', 'prompt', 'score', 'material', 'questions[]'],
      example: {
        id: 'gq_017',
        type: 'composite',
        prompt: '根据给定顺序表完成下列问题。',
        score: 9,
        material: '{017, 094, 154, 170}',
        questions: [
          {
            id: 'gq_017_1',
            type: 'operation',
            prompt: '画出折半搜索判定树。',
            score: 4,
            answer: createSubjectiveAnswer('根节点为 ...', ['根节点正确', '左右分支正确']),
          },
          {
            id: 'gq_017_2',
            type: 'calculation',
            prompt: '计算平均查找长度。',
            score: 5,
            answer: createSubjectiveAnswer('ASL = ...', ['公式正确', '结果正确']),
          },
        ],
      },
    },
  }),
]

export function normalizeQuestionTypeKey(typeKey) {
  const normalized = String(typeKey || '').trim()
  if (!normalized) return 'unknown'

  const compact = normalized.toLowerCase().replace(/[\s-]+/g, '_')
  if (QUESTION_TYPE_ALIAS[compact]) return QUESTION_TYPE_ALIAS[compact]
  if (QUESTION_TYPE_ALIAS[normalized]) return QUESTION_TYPE_ALIAS[normalized]

  const found = QUESTION_TYPE_CATALOG.find(
    (item) => item.key === normalized || item.key === compact
  )
  return found ? found.key : normalized
}

export function getQuestionTypeMeta(typeKey) {
  const normalized = normalizeQuestionTypeKey(typeKey)
  return (
    QUESTION_TYPE_CATALOG.find((item) => item.key === normalized) ||
    createQuestionTypeMeta({
      key: normalized,
      label: normalized,
      shortLabel: normalized,
      description: '',
      supportsGeneration: false,
      supportsMockExam: false,
    })
  )
}

export function buildQuestionTypeSummary(typeKeys = [], options = {}) {
  const separator = options.short ? ' / ' : '、'
  return (typeKeys || [])
    .map((typeKey) => getQuestionTypeMeta(typeKey))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.key === item.key) === index)
    .map((item) => (options.short ? item.shortLabel : item.label))
    .join(separator)
}
