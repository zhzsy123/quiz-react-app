# 数据库原理试题 JSON 解析规范

这份规范对应当前首页“数据库原理”下载入口，目标是让题库作者或 AI 清洗链输出**可被当前系统稳定导入**的 JSON。

## 适用范围

- 科目：`database_principles`
- 当前推荐题型：
  - `single_choice`
  - `true_false`
  - `fill_blank`
  - `short_answer`
  - `relational_algebra`
  - `composite`
  - `sql`
  - `er_diagram`

## 顶层结构

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

## 顶层必填字段

- `schema_version`
- `paper_id`
- `title`
- `subject`
- `questions`

## 基本规则

1. 一份 JSON 只对应一张试卷。
2. 一份 JSON 只对应一个科目。
3. 当前科目必须写成 `subject: "database_principles"`。
4. 推荐使用顶层 `questions`；旧版 `items` 仍兼容，但不建议新文件继续使用。
5. 同一张卷子可以混合多种题型，全部放进同一个 `questions` 数组。

## 题型说明

### 1. 单项选择题 `single_choice`

```json
{
  "id": "db_sc_001",
  "type": "single_choice",
  "prompt": "数据的物理独立性是指（ ）。",
  "score": 2,
  "options": [
    { "key": "A", "text": "外模式改变内模式不变" },
    { "key": "B", "text": "内模式改变模式尽量不变" },
    { "key": "C", "text": "模式改变外模式不变" },
    { "key": "D", "text": "逻辑结构独立于数据库" }
  ],
  "answer": {
    "type": "objective",
    "correct": "B",
    "rationale": "物理独立性强调存储结构改变尽量不影响概念模式和应用。"
  }
}
```

### 2. 判断题 `true_false`

```json
{
  "id": "db_tf_001",
  "type": "true_false",
  "prompt": "B+ 树的叶子结点通常按关键字有序链接。",
  "score": 2,
  "answer": {
    "type": "objective",
    "correct": "T",
    "rationale": "叶子结点链表是 B+ 树支持范围查询的重要结构。"
  }
}
```

### 3. 填空题 `fill_blank`

```json
{
  "id": "db_fb_001",
  "type": "fill_blank",
  "prompt": "SQL 中，CREATE、ALTER、DROP 属于 ____ 语言。",
  "score": 2,
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["DDL", "数据定义语言"],
      "score": 2,
      "rationale": "CREATE、ALTER、DROP 都用于定义或修改数据库对象结构。"
    }
  ]
}
```

### 4. 简答题 `short_answer`

```json
{
  "id": "db_short_001",
  "type": "short_answer",
  "prompt": "简述事务的 ACID 特性。",
  "score": 8,
  "answer": {
    "type": "subjective",
    "reference_answer": "事务应满足原子性、一致性、隔离性和持久性。",
    "scoring_points": ["原子性", "一致性", "隔离性", "持久性"]
  }
}
```

### 5. SQL 题 `sql`

```json
{
  "id": "db_sql_001",
  "type": "sql",
  "prompt": "查询每个学院平均成绩最高的学生。",
  "score": 10,
  "context": "Student(id, name, dept_id, score)",
  "answer": {
    "type": "subjective",
    "reference_answer": "SELECT ...",
    "scoring_points": ["连接关系正确", "分组逻辑正确", "筛选条件正确"]
  }
}
```

要求：
- 建议带 `context`
- `reference_answer` 不能缺

### 6. E-R 图题 `er_diagram`

```json
{
  "id": "db_er_001",
  "type": "er_diagram",
  "prompt": "根据业务描述绘制 E-R 图。",
  "score": 8,
  "context": "学生可以选修多门课程，每门课程可被多个学生选修。",
  "answer": {
    "type": "subjective",
    "reference_answer": "实体包括学生、课程，联系为选修。",
    "scoring_points": ["实体完整", "联系正确", "主键清晰"]
  }
}
```

### 7. 关系代数题 `relational_algebra`

这是数据库科目专属题型，当前系统已经有专属答题模式和 AI 判等链。

```json
{
  "id": "db_ra_001",
  "type": "relational_algebra",
  "prompt": "已知关系模式：学生(学号, 姓名, 性别, 专业, 奖学金)、课程(课程号, 名称, 学分)、学习(学号, 课程号, 分数)，请用关系代数表达式完成下列查询。",
  "score": 20,
  "schemas": [
    {
      "name": "学生",
      "attributes": ["学号", "姓名", "性别", "专业", "奖学金"]
    },
    {
      "name": "课程",
      "attributes": ["课程号", "名称", "学分"]
    },
    {
      "name": "学习",
      "attributes": ["学号", "课程号", "分数"]
    }
  ],
  "subquestions": [
    {
      "id": "1",
      "label": "（1）",
      "prompt": "检索“英语”专业学生所学课程的信息，包括学号、姓名、课程名和分数。",
      "score": 5,
      "reference_answer": "Π[学号,姓名,课程名,分数](σ[专业='英语'](学生 ⋈ 学习 ⋈ 课程))"
    },
    {
      "id": "2",
      "label": "（2）",
      "prompt": "检索“数据库原理”课程成绩高于 90 分的所有学生的学号、姓名、专业和分数。",
      "score": 5,
      "reference_answer": "Π[学号,姓名,专业,分数](σ[名称='数据库原理' AND 分数>90](学生 ⋈ 学习 ⋈ 课程))"
    }
  ]
}
```

要求：
- 必须提供 `schemas`
- 必须提供 `subquestions`
- 每个 `subquestion` 必须有：
  - `id`
  - `prompt`
  - `score`
  - `reference_answer`

### 8. 综合题 `composite`

适用于“共享材料 + 多个子题”的数据库分析题，例如事务调度、范式分析、SQL 材料题。

```json
{
  "id": "db_comp_001",
  "type": "composite",
  "prompt": "阅读下列事务执行过程并回答问题。",
  "material_title": "事务并发案例",
  "material_format": "sql",
  "material": "T1: read(A); T2: write(A);",
  "score": 12,
  "questions": [
    {
      "id": "db_comp_001_q1",
      "type": "true_false",
      "prompt": "该调度是否冲突可串行化？",
      "score": 4,
      "answer": {
        "type": "objective",
        "correct": "F",
        "rationale": "冲突图中存在环。"
      }
    },
    {
      "id": "db_comp_001_q2",
      "type": "short_answer",
      "prompt": "说明理由。",
      "score": 8,
      "answer": {
        "type": "subjective",
        "reference_answer": "应基于冲突图判断。",
        "scoring_points": ["冲突图", "环", "可串行化结论"]
      }
    }
  ]
}
```

## 不推荐的做法

- 不要给数据库科目写 `reading / cloze / translation / essay`
- 不要把关系代数题伪装成普通 `short_answer`
- 不要把 SQL / 事务综合题强压成单题长问答，应该用 `composite`

## 给 AI 的推荐提示词

```text
请把这份数据库原理试卷整理成符合本规范的合法 JSON，只输出 JSON，不要输出解释。

要求：
1. 顶层必须包含 schema_version、paper_id、title、subject、questions。
2. subject 必须是 database_principles。
3. 仅使用本规范允许的题型：single_choice、true_false、fill_blank、short_answer、relational_algebra、composite、sql、er_diagram。
4. 关系代数题必须输出 schemas 和 subquestions，每个小题都要有 reference_answer。
5. 共享材料 + 多个子题必须整理成 composite。
6. 所有客观题必须尽量给出标准答案与解析。
7. 所有主观题尽量给出 reference_answer 和 scoring_points。
8. 只返回合法 JSON。
```
