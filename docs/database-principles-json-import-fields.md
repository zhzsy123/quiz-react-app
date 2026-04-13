# 数据库原理 JSON 导入字段说明

本文档基于当前仓库里的实际实现整理，目标是说明：

- 数据库原理科目当前推荐输出哪些题型
- 每种题型至少需要哪些字段
- 导入器还兼容哪些字段别名
- 哪些写法虽然底层能解析，但不建议在数据库科目里继续使用

适用科目：`database_principles`

参考实现：

- `src/entities/subject/model/subjectCatalogV2.js`
- `src/entities/quiz/lib/validation/validateQuizPayload.js`
- `src/entities/quiz/lib/normalize/normalizeQuizPayload.js`
- `src/entities/quiz/lib/normalize/objectiveNormalizers.js`
- `src/entities/quiz/lib/normalize/subjectiveNormalizers.js`
- `src/entities/quiz/lib/normalize/compoundNormalizers.js`

## 1. 当前数据库科目推荐题型

数据库原理科目当前配置允许以下题型：

- `single_choice`
- `true_false`
- `fill_blank`
- `short_answer`
- `relational_algebra`
- `composite`
- `sql`
- `er_diagram`

说明：

- 这是数据库原理科目的“正式题型集合”。
- 通用 JSON 导入器底层还支持更多题型，但数据库科目不建议使用那些额外题型。
- 如果你是给 AI 一份规范，让它输出“数据库原理”可导入 JSON，应该只使用上面 8 种。

## 1.1 导入器当前支持的全部题型

当前通用 JSON 导入器支持以下全部顶层题型：

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `function_fill_blank`
- `cloze`
- `reading`
- `translation`
- `essay`
- `short_answer`
- `programming`
- `sql`
- `er_diagram`
- `relational_algebra`
- `case_analysis`
- `calculation`
- `operation`
- `composite`

说明：

- 上面是“导入器实现层”的全量支持范围。
- 其中只有一部分属于数据库原理科目的正式题型。
- 本文后面会把这些题型都列出来，但会明确哪些是数据库科目正式支持、哪些只是通用导入器可识别。

## 2. 顶层结构

推荐顶层结构如下：

```json
{
  "schema_version": "2026-04",
  "paper_id": "db_mock_001",
  "title": "数据库原理模拟卷 01",
  "subject": "database_principles",
  "description": "用于练习或模考导入",
  "duration_minutes": 90,
  "questions": []
}
```

### 2.1 顶层推荐字段

| 字段 | 是否推荐 | 说明 |
| --- | --- | --- |
| `schema_version` | 推荐 | 建议写 `2026-04` |
| `paper_id` | 推荐 | 试卷唯一标识 |
| `title` | 推荐 | 试卷标题，缺失时系统会回退为默认标题 |
| `subject` | 必填推荐 | 数据库原理必须写 `database_principles` |
| `description` | 可选 | 试卷说明 |
| `duration_minutes` | 可选 | 时长，非数字会被归一化为 `0` |
| `questions` | 推荐必填 | 新格式题目数组 |

### 2.2 顶层兼容写法

当前导入器兼容以下顶层写法：

- 新格式：`questions`
- 旧格式：`items`

注意：

- `questions` 是当前推荐写法。
- `items` 仍可导入，但属于兼容层，不建议继续新写。
- 顶层必须是单个 JSON 对象，不能是数组。

## 3. 题目通用字段

绝大多数题型都会读取以下通用字段：

| 字段 | 是否常用 | 说明 |
| --- | --- | --- |
| `id` | 强烈推荐 | 题目唯一标识 |
| `type` | 必填 | 题型 |
| `prompt` | 强烈推荐 | 题干 |
| `score` | 强烈推荐 | 分值 |
| `difficulty` | 可选 | 难度 |
| `tags` | 可选 | 标签数组 |
| `assets` | 可选 | 资源数组 |

一些主观题 / 材料题还会读取这些通用上下文字段：

- `context_title`
- `context`
- `context_format`
- `presentation`
- `deliverable_type`
- `response_format`
- `material_title`
- `material`
- `material_format`
- `case_title`
- `case_material`
- `background`
- `body`

归一化时的大致映射规则是：

- `context_title` 会兼容读取 `case_title`、`material_title`
- `context` 会兼容读取 `material`、`case_material`、`background`、`body`
- `context_format` 会兼容读取 `material_format`、`presentation`

## 4. 各题型字段说明

### 4.1 单选题 `single_choice`

最小推荐结构：

```json
{
  "id": "db_sc_001",
  "type": "single_choice",
  "prompt": "数据的物理独立性是指（）。",
  "score": 2,
  "options": [
    { "key": "A", "text": "..." },
    { "key": "B", "text": "..." },
    { "key": "C", "text": "..." },
    { "key": "D", "text": "..." }
  ],
  "answer": {
    "type": "objective",
    "correct": "B",
    "rationale": "解析"
  }
}
```

支持字段：

- `options`
- `answer.correct`
- `answer.rationale`

兼容别名：

- 选项数组：`options` / `choices` / `selections`
- 正确答案：`answer.correct` / `answer.answer` / `correct_answer` / `correctAnswer` / `correct_option` / `correctOption` / `correct`

说明：

- 缺少正确答案时，导入后题目仍可展示，但会被标记为不可自动判分。
- 选项如果直接写字符串，导入器也会自动补 `A/B/C/D`。

### 4.2 判断题 `true_false`

最小推荐结构：

```json
{
  "id": "db_tf_001",
  "type": "true_false",
  "prompt": "B+ 树叶子结点通常按关键字有序链接。",
  "score": 2,
  "answer": {
    "type": "objective",
    "correct": "T",
    "rationale": "解析"
  }
}
```

支持字段：

- `answer.correct`
- `answer.rationale`

兼容值：

- `T` / `F`
- `true` / `false`
- 布尔值 `true` / `false`

### 4.3 填空题 `fill_blank`

最小推荐结构：

```json
{
  "id": "db_fb_001",
  "type": "fill_blank",
  "prompt": "CREATE、ALTER、DROP 属于 ____ 语言。",
  "score": 2,
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["DDL", "数据定义语言"],
      "score": 2,
      "rationale": "解析"
    }
  ]
}
```

支持字段：

- `blanks`
- 每个 blank 的 `blank_id`
- 每个 blank 的 `accepted_answers`
- 每个 blank 的 `score`
- 每个 blank 的 `rationale`

兼容别名：

- blank 列表：`blanks` / `answers`
- 每空答案：`accepted_answers` / `answers` / `correct`
- 每空编号：`blank_id` / `id`

说明：

- 顶层 `score` 会按所有 blank 的分值总和重新归一化。
- `accepted_answers` 为空的 blank 会被丢弃。

### 4.4 函数填空题 `function_fill_blank`

这是通用导入器支持的题型，当前更适合数据结构或代码类科目，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "code_fb_001",
  "type": "function_fill_blank",
  "prompt": "补全 SQL 执行过程伪代码。",
  "score": 6,
  "context": "for (...) { result = ____; return ____; }",
  "response_format": "code",
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["expr1"],
      "score": 3,
      "rationale": "解析"
    },
    {
      "blank_id": 2,
      "accepted_answers": ["expr2"],
      "score": 3,
      "rationale": "解析"
    }
  ]
}
```

支持字段和兼容别名与 `fill_blank` 基本一致，另外推荐：

- `context`
- `response_format`
- `deliverable_type`

说明：

- 归一化后仍会走填空题结构，但会保留 `source_type: "function_fill_blank"`。
- 如果你写的是数据库题，除非确实是代码/伪代码填空，否则优先继续用普通 `fill_blank`。

### 4.5 单篇阅读题 `reading`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "reading_001",
  "type": "reading",
  "prompt": "阅读材料并回答问题。",
  "score": 10,
  "passage": {
    "title": "Passage A",
    "content": "..."
  },
  "questions": [
    {
      "id": "reading_001_1",
      "type": "single_choice",
      "prompt": "问题 1",
      "score": 2,
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." }
      ],
      "answer": {
        "type": "objective",
        "correct": "A",
        "rationale": "解析"
      }
    }
  ]
}
```

支持字段：

- `passage.title`
- `passage.content`
- `questions`

兼容别名：

- 材料正文：`passage.content` / `passage.body` / `passage.text` / `article` / `content`
- 子题数组：`questions` / `sub_questions` / `subQuestions`

说明：

- `reading` 的子题当前按单选题归一化。
- 子题缺失标准答案时，整题仍可导入，但会告警。

### 4.6 完形填空题 `cloze`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "cloze_001",
  "type": "cloze",
  "prompt": "阅读短文并完成填空。",
  "score": 20,
  "article": "He [[1]] to school and [[2]] hard.",
  "blanks": [
    {
      "blank_id": 1,
      "score": 2,
      "options": [
        { "key": "A", "text": "go" },
        { "key": "B", "text": "goes" },
        { "key": "C", "text": "went" },
        { "key": "D", "text": "gone" }
      ],
      "correct": "B",
      "rationale": "解析"
    }
  ]
}
```

支持字段：

- `article`
- `blanks`
- 每个 blank 的 `options`
- 每个 blank 的 `correct`
- 每个 blank 的 `rationale`

说明：

- `article` 里必须有 `[[1]]`、`[[2]]` 这种占位符，否则无法归一化。
- 缺少选项或正确答案的 blank 会被丢弃。

### 4.7 翻译题 `translation`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "trans_001",
  "type": "translation",
  "prompt": "请将下列句子译成中文。",
  "score": 10,
  "direction": "en_to_zh",
  "source_text": "A good book is a good friend.",
  "answer": {
    "type": "subjective",
    "reference_answer": "好书如良友。",
    "scoring_points": ["语义准确", "表达通顺"]
  }
}
```

支持字段：

- `direction`
- `source_text`
- `answer.reference_answer`
- `answer.scoring_points`

兼容别名：

- 原文：`source_text` / `sourceText` / `context` / `text` / `content` / `body` / `prompt`
- 参考答案：同 `short_answer`

### 4.8 作文题 `essay`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "essay_001",
  "type": "essay",
  "prompt": "Write a short essay...",
  "score": 15,
  "essay_type": "writing",
  "requirements": {
    "min_words": 120
  },
  "answer": {
    "type": "subjective",
    "reference_answer": "参考范文",
    "scoring_points": ["内容", "结构", "语言"]
  }
}
```

支持字段：

- `essay_type`
- `requirements`
- `answer.reference_answer`
- `answer.scoring_points`
- `answer.scoring_rubric`

### 4.9 简答题 `short_answer`

最小推荐结构：

```json
{
  "id": "db_short_001",
  "type": "short_answer",
  "prompt": "简述事务的 ACID 特性。",
  "score": 8,
  "answer": {
    "type": "subjective",
    "reference_answer": "参考答案",
    "scoring_points": ["评分点 1", "评分点 2"]
  }
}
```

支持字段：

- `answer.reference_answer`
- `answer.scoring_points`
- `answer.scoring_rubric`
- `answer.outline`
- `answer.common_errors`
- `answer.ai_scoring`
- `requirements`
- `context_title`
- `context`

兼容别名：

- 参考答案：`answer.reference_answer` / `answer.correct` / `reference_answer` / `sample_answer`
- 评分点：`answer.scoring_points` / `answer.points`

说明：

- 即使没有参考答案也能导入，但会影响后续主观题评阅质量。

### 4.10 程序设计题 `programming`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "prog_001",
  "type": "programming",
  "prompt": "编写函数实现排序。",
  "score": 12,
  "response_format": "code",
  "answer": {
    "type": "subjective",
    "reference_answer": "参考代码或思路",
    "scoring_points": ["函数定义正确", "逻辑正确", "边界处理正确"]
  }
}
```

说明：

- 顶层 `programming` 题归一化时会默认补 `response_format: "code"`。
- 如果放在 `composite` 子题里，当前实现会把它收口成通用主观题表现形态。

### 4.11 SQL 题 `sql`

推荐结构：

```json
{
  "id": "db_sql_001",
  "type": "sql",
  "prompt": "查询每个学院平均成绩最高的学生。",
  "score": 10,
  "context": "Student(id, name, dept_id, score)",
  "response_format": "sql",
  "answer": {
    "type": "subjective",
    "reference_answer": "SELECT ...",
    "scoring_points": ["连接正确", "分组正确", "过滤正确"]
  }
}
```

支持字段：

- 与 `short_answer` 基本相同
- 额外推荐：`context`
- 额外推荐：`response_format`

说明：

- 归一化时如果是顶层 `sql` 题，缺少 `response_format` 会默认补成 `sql`。
- 表结构、业务背景、字段含义建议都放进 `context`。

### 4.12 E-R 图题 `er_diagram`

推荐结构：

```json
{
  "id": "db_er_001",
  "type": "er_diagram",
  "prompt": "根据业务描述绘制 E-R 图。",
  "score": 8,
  "context": "学生可以选修多门课程，每门课程可被多个学生选修。",
  "answer": {
    "type": "subjective",
    "reference_answer": "参考答案",
    "scoring_points": ["实体完整", "联系正确", "主键清晰"]
  }
}
```

支持字段：

- 与 `short_answer` 基本相同
- 推荐提供 `context`

### 4.13 案例分析题 `case_analysis`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "case_001",
  "type": "case_analysis",
  "prompt": "根据案例分析事务异常。",
  "score": 10,
  "context": "案例材料",
  "answer": {
    "type": "subjective",
    "reference_answer": "参考答案",
    "scoring_points": ["识别问题", "分析原因", "得出结论"]
  }
}
```

支持字段与 `short_answer` 基本一致，推荐额外提供：

- `context_title`
- `context`

### 4.14 计算题 `calculation`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "calc_001",
  "type": "calculation",
  "prompt": "计算查询代价。",
  "score": 6,
  "answer": {
    "type": "subjective",
    "reference_answer": "计算过程与结果",
    "scoring_points": ["公式正确", "代入正确", "结果正确"]
  }
}
```

支持字段与 `short_answer` 基本一致。

### 4.15 操作题 `operation`

这是通用导入器支持的题型，不属于数据库原理科目的正式推荐题型。

最小推荐结构：

```json
{
  "id": "op_001",
  "type": "operation",
  "prompt": "画出执行流程图。",
  "score": 5,
  "answer": {
    "type": "subjective",
    "reference_answer": "参考步骤",
    "scoring_points": ["步骤完整", "关键节点正确"]
  }
}
```

支持字段与 `short_answer` 基本一致。

### 4.16 多选题 `multiple_choice`

这是通用导入器支持的题型，但当前数据库原理科目没有把它列为正式题型。

最小推荐结构：

```json
{
  "id": "db_mc_001",
  "type": "multiple_choice",
  "prompt": "下列哪些属于事务特性？",
  "score": 2,
  "options": [
    { "key": "A", "text": "原子性" },
    { "key": "B", "text": "一致性" },
    { "key": "C", "text": "隔离性" },
    { "key": "D", "text": "持久性" }
  ],
  "answer": {
    "type": "objective",
    "correct": ["A", "B", "C", "D"],
    "rationale": "解析"
  }
}
```

兼容别名与单选题基本一致，另外：

- `answer.correct` 可以是数组
- 也可以是 `"A C"`、`"A,C"` 这样的字符串，导入器会拆分并排序

### 4.17 关系代数题 `relational_algebra`

这是数据库原理科目的专属重点题型。

最小推荐结构：

```json
{
  "id": "db_ra_001",
  "type": "relational_algebra",
  "prompt": "已知关系模式如下，请完成查询。",
  "score": 20,
  "schemas": [
    { "name": "学生", "attributes": ["学号", "姓名", "专业"] },
    { "name": "选课", "attributes": ["学号", "课程号", "分数"] }
  ],
  "subquestions": [
    {
      "id": "1",
      "label": "(1)",
      "prompt": "写出查询表达式。",
      "score": 10,
      "reference_answer": "Π[...]..."
    }
  ]
}
```

支持字段：

- `schemas`
- `subquestions`
- `tooling`
- `answer_mode`

`schemas` 里每项支持：

- `name`
- `attributes`

兼容别名：

- `schemas` / `relations` / `schema_definitions`
- schema 名称：`name` / `table` / `relation`
- schema 属性：`attributes` / `fields`

`subquestions` 里每项支持：

- `id`
- `label`
- `prompt`
- `score`
- `reference_answer`

兼容别名：

- 子题列表：`subquestions` / `questions` / `items`
- 子题题干：`prompt` / `stem` / `title`
- 参考答案：`reference_answer` / `referenceAnswer` / `answer.reference_answer` / `answer.referenceAnswer` / `standard_answer`

说明：

- `schemas` 和 `subquestions` 至少都要有一个有效元素，否则整题无法导入。
- 子题缺失 `reference_answer` 时，校验阶段会告警，且会影响关系代数等价判定。
- `tooling` 是可选增强字段，主要用于前端关系代数编辑器与符号面板。

### 4.18 综合题 `composite`

适用于“共享材料 + 多个子题”。

推荐结构：

```json
{
  "id": "db_comp_001",
  "type": "composite",
  "prompt": "阅读材料并回答问题。",
  "material_title": "事务并发案例",
  "material_format": "plain",
  "material": "T1: read(A); T2: write(A);",
  "score": 12,
  "questions": [
    {
      "id": "db_comp_001_q1",
      "type": "true_false",
      "prompt": "该调度是否可串行化？",
      "score": 4,
      "answer": {
        "type": "objective",
        "correct": "F",
        "rationale": "解析"
      }
    },
    {
      "id": "db_comp_001_q2",
      "type": "short_answer",
      "prompt": "说明理由。",
      "score": 8,
      "answer": {
        "type": "subjective",
        "reference_answer": "参考答案",
        "scoring_points": ["评分点"]
      }
    }
  ]
}
```

支持字段：

- `material_title`
- `material`
- `material_format`
- `presentation`
- `deliverable_type`
- `questions`

兼容别名：

- 材料标题：`material_title` / `context_title` / `title`
- 材料正文：`material` / `context` / `case_material` / `material_body` / `body`
- 材料格式：`material_format` / `context_format` / `presentation`

说明：

- `questions` 必须是非空数组。
- `score` 会按所有子题分值总和重新计算。
- 子题不允许再嵌套 `composite`。

当前数据库科目里，`composite` 子题建议只使用：

- `single_choice`
- `true_false`
- `fill_blank`
- `short_answer`
- `sql`
- `er_diagram`

不建议把 `relational_algebra` 放进 `composite` 子题里，当前实现并没有把它作为稳定子题路径处理。

## 5. 数据库科目里不建议使用的通用题型

虽然导入器支持全部 18 种题型，但对数据库原理科目来说，下列题型不建议继续使用：

- `multiple_choice`
- `function_fill_blank`
- `reading`
- `cloze`
- `translation`
- `essay`
- `programming`
- `case_analysis`
- `calculation`
- `operation`

原因：

- 当前科目配置没有把它们列入正式题型集合
- AI 文档导入链也不会把这些题型当作数据库原理的目标输出
- 因此不建议在数据库原理 JSON 中继续使用

## 6. 最稳妥的写法建议

如果你的目标是“现在就能稳定导入”，建议遵循下面的约束：

1. 顶层始终用 `questions`，不要再用 `items`。
2. `subject` 固定写 `database_principles`。
3. 题型只用这 8 种：`single_choice`、`true_false`、`fill_blank`、`short_answer`、`relational_algebra`、`composite`、`sql`、`er_diagram`。
4. 所有题都写 `id`、`type`、`prompt`、`score`。
5. 所有客观题都尽量补全标准答案与解析。
6. 所有主观题都尽量补全 `reference_answer` 和 `scoring_points`。
7. `relational_algebra` 必须给 `schemas` 和 `subquestions`。
8. `composite` 必须给 `material` 和 `questions`，并避免嵌套。

## 7. 一份可直接参考的最小示例

```json
{
  "schema_version": "2026-04",
  "paper_id": "db_demo_001",
  "title": "数据库原理练习卷",
  "subject": "database_principles",
  "description": "字段示例",
  "duration_minutes": 90,
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "prompt": "数据库三级模式结构中，外模式描述的是（）。",
      "score": 2,
      "options": [
        { "key": "A", "text": "物理存储" },
        { "key": "B", "text": "用户视图" },
        { "key": "C", "text": "数据库文件" },
        { "key": "D", "text": "索引组织" }
      ],
      "answer": {
        "type": "objective",
        "correct": "B",
        "rationale": "外模式描述用户视图。"
      }
    },
    {
      "id": "q2",
      "type": "sql",
      "prompt": "查询每个学院平均成绩最高的学生。",
      "score": 10,
      "context": "Student(id, name, dept_id, score)",
      "response_format": "sql",
      "answer": {
        "type": "subjective",
        "reference_answer": "SELECT ...",
        "scoring_points": ["连接正确", "聚合正确", "过滤正确"]
      }
    }
  ]
}
```
