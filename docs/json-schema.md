# JSON 规范

本文件是当前项目对外生效的 JSON 题库规范。目标不是描述实现细节，而是定义：

1. 题库作者应该如何组织题目
2. 导入链路会接受什么结构
3. 新旧题库如何兼容
4. 数据结构 / 数据库类考试内容应如何建模

## 设计原则

1. 一份 JSON 对应一张试卷
2. 一份 JSON 对应一个学科
3. 同一张试卷可以混合多种题型
4. 优先复用现有通用题型，避免为学科领域名词额外发明顶层 `type`
5. 仅当题目天然包含“共享材料 + 多个异构子题”时，才使用 `composite`

## 顶层结构

```json
{
  "schema_version": "2026-04",
  "paper_id": "db_mock_001",
  "title": "数据库模拟卷 01",
  "subject": "database",
  "description": "用于平时练习或模拟考试导入",
  "duration_minutes": 120,
  "questions": []
}
```

## 顶层字段

- `schema_version`: 当前题库 schema 版本
- `paper_id`: 试卷唯一标识
- `title`: 试卷标题
- `subject`: 学科标识
- `description`: 可选说明
- `duration_minutes`: 可选时长
- `questions`: 题目数组

## 兼容规则

项目当前同时兼容两类输入：

1. 旧题库
- 使用顶层 `items`
- 保持现有导入行为，不要求迁移

2. 新题库
- 使用顶层 `questions`
- 推荐用于后续新增内容，包括数据结构 / 数据库考试内容

兼容原则：

1. 旧 `items` 题库继续可导入
2. 旧 `questions` 题库继续可导入
3. 现有顶层 `type` 语义不改变
4. 新增 `composite` 时，不影响旧题型解析

## 当前支持的顶层题型

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `cloze`
- `reading`
- `translation`
- `short_answer`
- `case_analysis`
- `calculation`
- `operation`
- `essay`
- `composite`

## 建模规则

### 1. 直接复用现有题型的场景

以下场景不应新增顶层 `type`：

1. 单选 / 多选 / 判断
- 继续使用：
  - `single_choice`
  - `multiple_choice`
  - `true_false`
- 适用于：
  - 数据结构概念题
  - SQL 语义判断题
  - 范式选择题
  - 事务并发判断题

2. 填空
- 继续使用 `fill_blank`
- 适用于：
  - 代码填空
  - SQL 填空
  - 关系模式填空

3. 简答 / 解释题
- 继续使用 `short_answer`
- 适用于：
  - 概念解释
  - 原理说明
  - 规范化理由说明
  - 事务隔离级别解释

4. 算法过程题
- 默认使用 `calculation`
- 如更偏解释而非过程计算，也可使用 `short_answer`

5. SQL / 关系代数主观题
- 默认使用：
  - `calculation`（结果或过程较明确）
  - `short_answer`（更偏解释或文字表达）

6. E-R 图 / 关系模式设计题
- 默认使用：
  - `operation`
  - 或 `case_analysis`

7. 事务 / 并发 / 规范化分析题
- 默认使用 `case_analysis`

### 2. 必须新增结构的场景

仅新增一个顶层复合结构：

- `composite`

适用场景：

1. 综合题
2. 代码阅读题
3. SQL 材料题
4. 含共享背景材料的数据库设计题
5. 含多个异构子题的算法 / 并发 / 模式分析题

`composite` 的核心特征：

1. 有共享材料
2. 有一组子题
3. 子题允许异构
- 单选
- 多选
- 判断
- 填空
- 简答
- 计算

## 推荐扩展字段

这些字段是可选扩展字段，不要求旧题库提供：

- `material`
- `material_title`
- `material_format`
- `context_format`
- `stem_format`
- `presentation`
- `response_format`
- `deliverable_type`
- `knowledge_tags`

推荐值示例：

- `material_format`: `plain` / `markdown` / `code` / `sql`
- `context_format`: `plain` / `markdown` / `code` / `sql`
- `presentation`: `text` / `code` / `sql`
- `response_format`: `text` / `steps` / `sql` / `schema`
- `deliverable_type`: `er_diagram` / `relation_schema` / `normalization_result`

这些字段用于：

1. 保留领域语义
2. 支持 UI 后续选择更合适的展示方式
3. 不改变既有评分和题型主语义

## `composite` 结构

```json
{
  "id": "db_comp_1",
  "type": "composite",
  "prompt": "阅读下列事务执行过程并回答问题。",
  "material_title": "事务并发案例",
  "material_format": "sql",
  "material": "T1: read(A) ...",
  "score": 20,
  "questions": [
    {
      "id": "q1",
      "type": "true_false",
      "prompt": "该调度是否冲突可串行化？",
      "score": 4,
      "answer": {
        "correct": "T"
      }
    },
    {
      "id": "q2",
      "type": "short_answer",
      "prompt": "说明理由。",
      "score": 6,
      "answer": {
        "type": "subjective",
        "scoring_points": ["冲突图", "环", "可串行化判断"]
      }
    }
  ]
}
```

约束：

1. `composite.questions` 内子题必须继续使用现有通用题型
2. 不允许在 `composite` 内再次嵌套 `composite`
3. `score` 应等于子题分值总和，或可由导入链路根据子题汇总

## 数据结构 / 数据库场景建模建议

### 数据结构

1. 概念题
- `single_choice` / `multiple_choice` / `true_false`

2. 代码阅读题
- `composite`
- 共享材料放在 `material`
- `material_format: "code"`

3. 代码填空
- `fill_blank`
- 如有共享代码上下文，可放到 `context`，并设置 `context_format: "code"`

4. 算法过程题
- `calculation`
- 如需要分步骤评分，可在 `requirements.steps` 与 `answer.scoring_points` 中表达

5. 综合题
- `composite`

### 数据库

1. SQL 单选 / 多选 / 判断
- 继续用客观题

2. SQL 填空
- `fill_blank`
- `presentation: "sql"`

3. SQL 阅读 + 多子题
- `composite`
- `material_format: "sql"`

4. 关系代数主观题
- `calculation` 或 `short_answer`

5. E-R 图 / 关系模式设计
- `operation`
- 可加 `deliverable_type`

6. 事务 / 并发 / 规范化分析
- `case_analysis`
- 如果包含多子题，则用 `composite`

## 现有导入链路一致性要求

### quizPipeline

1. 顶层入口保持不变
2. `quizPipeline` 继续只负责：
- parse
- validate
- normalize
- scoreBreakdown

### validate / normalize

1. validate 需要识别 `composite`
2. normalize 需要：
- 保持旧 `items` 兼容
- 保持旧 `questions` 兼容
- 支持 `composite`
- 保留扩展字段到运行时模型

### scoring

1. `composite` 总分按子题聚合
2. objective / subjective 总分也按子题聚合
3. 旧题型统计规则不变

### UI / session / history / wrongbook

1. `composite` 需要支持：
- 材料展示
- 子题作答
- 子题级答案保存
- 子题级历史快照
- 子题级错题抽取，或明确定义的题内粒度

2. 旧题型显示与保存行为不变

## 示例

### 代码填空

```json
{
  "id": "ds_fill_1",
  "type": "fill_blank",
  "prompt": "补全二叉搜索树插入逻辑中的关键条件。",
  "context_format": "code",
  "context": "if (node == null) return new Node(x); if (x ____ node.value) ...",
  "presentation": "code",
  "blanks": [
    {
      "blank_id": "b1",
      "accepted_answers": ["<", "less than"],
      "score": 2
    }
  ]
}
```

### SQL 填空

```json
{
  "id": "db_fill_1",
  "type": "fill_blank",
  "prompt": "补全 SQL 语句。",
  "presentation": "sql",
  "context_format": "sql",
  "context": "SELECT ____ FROM student WHERE age > 18;",
  "blanks": [
    {
      "blank_id": "b1",
      "accepted_answers": ["name", "name, age"],
      "score": 2
    }
  ]
}
```

### E-R / 关系模式设计

```json
{
  "id": "db_op_1",
  "type": "operation",
  "prompt": "根据业务描述设计关系模式。",
  "deliverable_type": "relation_schema",
  "context_title": "业务背景",
  "context": "学校管理系统包含学生、课程、选课记录。",
  "score": 12,
  "answer": {
    "type": "subjective",
    "scoring_points": ["实体识别", "联系识别", "主键设计", "约束表达"]
  }
}
```

## 迁移建议

1. 旧题库无需立刻迁移
2. 新增 DS/DB 题库优先使用 `questions`
3. 需要共享材料且子题异构时，使用 `composite`
4. 不要为了学科领域名称新增 `sql_question`、`er_design`、`normalization_analysis` 之类顶层类型
