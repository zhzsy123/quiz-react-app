# JSON Schema v2 规范草案

本文档用于约定“试卷经过 AI 清洗后导入本站”的目标 JSON 格式。

建议工作流：

1. 用户准备 PDF / DOCX 试卷
2. 将本文档和原始试卷一起交给 AI
3. 让 AI 输出符合本规范的 JSON
4. 在网站中导入 JSON 进行练习或考试

## 设计目标

- 统一不同来源试卷的结构
- 支持客观题与主观题并存
- 支持材料题、带图题、阅读题等复杂题型
- 保留 AI 清洗后的兼容空间

## 顶层结构

```json
{
  "schema_version": "2.0",
  "paper_id": "english_mock_2026_001",
  "title": "英语模拟卷 2026-01",
  "subject": "english",
  "description": "适用于个人练习",
  "duration_minutes": 120,
  "total_score": 100,
  "sections": [
    {
      "id": "sec_1",
      "title": "单项选择",
      "question_ids": ["q_sc_001", "q_sc_002"]
    }
  ],
  "questions": []
}
```

## 顶层字段说明

- `schema_version`: 固定写 `"2.0"`
- `paper_id`: 试卷唯一标识，建议稳定且可读
- `title`: 试卷标题
- `subject`: 科目，如 `english`
- `description`: 试卷描述，可为空
- `duration_minutes`: 考试时长
- `total_score`: 总分
- `sections`: 分区信息
- `questions`: 题目数组

## 通用题目字段

所有题型都建议包含以下通用字段：

```json
{
  "id": "q_001",
  "type": "single_choice",
  "section_id": "sec_1",
  "prompt": "题干",
  "score": 2,
  "difficulty": "medium",
  "tags": ["grammar"],
  "assets": []
}
```

## assets 资源字段

带图题不要设计成独立题型，而是通过 `assets` 挂到任意题型上。

```json
{
  "assets": [
    {
      "type": "image",
      "src": "https://example.com/question-1.png",
      "alt": "第 1 题配图"
    }
  ]
}
```

## v2 规划题型

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `reading`
- `material`
- `translation`
- `short_answer`
- `essay`

说明：

- 当前站点运行时已较好支持 `single_choice`、`reading`、`cloze`、`translation`、`essay`
- `multiple_choice`、`true_false`、`fill_blank`、`material`、`short_answer` 是第一阶段规范预留

## 题型示例

### 单选题

```json
{
  "id": "q_sc_001",
  "type": "single_choice",
  "section_id": "sec_1",
  "prompt": "Artificial intelligence is developing so rapidly that its influence on modern life cannot be ______.",
  "score": 2,
  "options": [
    { "key": "A", "text": "ignored" },
    { "key": "B", "text": "ignoring" },
    { "key": "C", "text": "ignore" },
    { "key": "D", "text": "to ignore" }
  ],
  "answer": {
    "type": "objective",
    "correct": "A",
    "rationale": "cannot be ignored 为被动结构。"
  }
}
```

### 多选题

```json
{
  "id": "q_mc_001",
  "type": "multiple_choice",
  "section_id": "sec_1",
  "prompt": "Which of the following are renewable energy sources?",
  "score": 3,
  "options": [
    { "key": "A", "text": "Solar power" },
    { "key": "B", "text": "Wind power" },
    { "key": "C", "text": "Coal" },
    { "key": "D", "text": "Hydropower" }
  ],
  "answer": {
    "type": "objective",
    "correct": ["A", "B", "D"],
    "rationale": "太阳能、风能和水电都属于可再生能源。"
  }
}
```

### 判断题

```json
{
  "id": "q_tf_001",
  "type": "true_false",
  "section_id": "sec_1",
  "prompt": "The Pacific Ocean is the largest ocean on Earth.",
  "score": 1,
  "answer": {
    "type": "objective",
    "correct": true,
    "rationale": "太平洋是面积最大的海洋。"
  }
}
```

### 填空题

```json
{
  "id": "q_fb_001",
  "type": "fill_blank",
  "section_id": "sec_2",
  "prompt": "Only by making good use of time can college students improve their learning ______.",
  "score": 2,
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["efficiency"],
      "rationale": "固定表达 learning efficiency。"
    }
  ],
  "answer": {
    "type": "objective"
  }
}
```

### 阅读题

```json
{
  "id": "q_reading_001",
  "type": "reading",
  "section_id": "sec_3",
  "title": "Healthy Study Habits",
  "prompt": "Read the passage and answer the following questions.",
  "score": 8,
  "passage": {
    "title": "Healthy Study Habits",
    "content": "Passage text here."
  },
  "questions": [
    {
      "id": "q_reading_001_1",
      "type": "single_choice",
      "prompt": "What is the passage mainly about?",
      "score": 2,
      "options": [
        { "key": "A", "text": "Good study habits" },
        { "key": "B", "text": "Travel safety" }
      ],
      "answer": {
        "type": "objective",
        "correct": "A",
        "rationale": "文章主旨是学习习惯。"
      }
    }
  ]
}
```

### 材料题

```json
{
  "id": "q_material_001",
  "type": "material",
  "section_id": "sec_4",
  "title": "案例分析",
  "prompt": "阅读材料并回答问题。",
  "material": {
    "title": "材料一",
    "content": "这里是材料正文。",
    "assets": [
      {
        "type": "image",
        "src": "https://example.com/material-chart.png",
        "alt": "统计图"
      }
    ]
  },
  "questions": [
    {
      "id": "q_material_001_1",
      "type": "short_answer",
      "prompt": "请概括材料的核心观点。",
      "score": 5,
      "answer": {
        "type": "subjective",
        "reference_answer": "核心观点示例"
      }
    }
  ]
}
```

### 翻译 / 简答 / 作文

这三类建议统一使用 `answer.type = "subjective"`，并按需要提供：

- `reference_answer`
- `alternate_answers`
- `scoring_points`
- `outline`
- `requirements`

## 给 AI 的建议提示词

```text
请将这份试卷整理成符合 quiz-react-app JSON Schema v2 的 JSON。
要求：
1. 仅输出合法 JSON，不要输出解释。
2. 顶层字段必须包含 schema_version、paper_id、title、sections、questions。
3. 所有选择题 options 使用 { key, text } 结构。
4. 有图片的题目放到 assets。
5. 阅读题和材料题使用 questions 子数组。
6. 若原卷存在不确定信息，请尽量保留并在 description 或 rationale 中说明。
```
