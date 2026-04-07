# JSON 规范

这个项目现在只保留一套公开 JSON 规范，站点首页和导入工作流都以这份文档为准。

## 顶层结构

```json
{
  "schema_version": "2026-04",
  "paper_id": "english_mock_2026_001",
  "title": "英语模拟卷 2026-01",
  "subject": "english",
  "description": "用于个人模考与刷题",
  "duration_minutes": 120,
  "questions": []
}
```

## 统一规则

- 顶层必须包含 `questions` 数组。
- 每道题至少包含 `id`、`type`、`prompt`。
- `score`、`difficulty`、`tags`、`assets` 为可选字段。
- 选择题统一使用 `options: [{ key, text }]`。
- 图片资源统一挂到 `assets`，任何题型都可以带图。

## 支持题型

### `single_choice`

```json
{
  "id": "q_sc_001",
  "type": "single_choice",
  "prompt": "What is 2 + 2?",
  "options": [
    { "key": "A", "text": "3" },
    { "key": "B", "text": "4" }
  ],
  "answer": {
    "type": "objective",
    "correct": "B",
    "rationale": "基础算术。"
  }
}
```

### `multiple_choice`

```json
{
  "id": "q_mc_001",
  "type": "multiple_choice",
  "prompt": "Which are renewable energy sources?",
  "options": [
    { "key": "A", "text": "Solar" },
    { "key": "B", "text": "Wind" },
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

### `true_false`

```json
{
  "id": "q_tf_001",
  "type": "true_false",
  "prompt": "The Pacific Ocean is the largest ocean on Earth.",
  "answer": {
    "type": "objective",
    "correct": true,
    "rationale": "太平洋面积最大。"
  }
}
```

### `fill_blank`

```json
{
  "id": "q_fb_001",
  "type": "fill_blank",
  "prompt": "Only by making good use of time can students improve learning ____.",
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["efficiency"],
      "rationale": "固定搭配 learning efficiency。",
      "score": 1
    }
  ],
  "answer": {
    "type": "objective"
  }
}
```

### `reading`

```json
{
  "id": "q_reading_001",
  "type": "reading",
  "title": "Healthy Study Habits",
  "prompt": "Read the passage and answer the questions.",
  "passage": {
    "title": "Healthy Study Habits",
    "content": "Passage text here."
  },
  "questions": [
    {
      "id": "q_reading_001_1",
      "type": "single_choice",
      "prompt": "What is the passage mainly about?",
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

### `cloze`

```json
{
  "id": "q_cloze_001",
  "type": "cloze",
  "title": "Cloze Test",
  "prompt": "Choose the best answer for each blank.",
  "article": "Hello [[1]] world.",
  "blanks": [
    {
      "blank_id": 1,
      "options": [
        { "key": "A", "text": "big" },
        { "key": "B", "text": "small" }
      ],
      "correct": "A",
      "rationale": "语义最合理。"
    }
  ]
}
```

### `translation`

```json
{
  "id": "q_tr_001",
  "type": "translation",
  "prompt": "请将下列句子译成中文。",
  "direction": "en_to_zh",
  "source_text": "Knowledge grows through practice.",
  "answer": {
    "type": "subjective",
    "reference_answer": "知识在实践中增长。"
  }
}
```

### `essay`

```json
{
  "id": "q_es_001",
  "type": "essay",
  "prompt": "Write a short essay about online learning.",
  "essay_type": "writing",
  "requirements": {
    "min_words": 120
  },
  "answer": {
    "type": "subjective",
    "reference_answer": "Reference answer here."
  }
}
```

## 给 AI 的提示词

```text
请把这份试卷整理成符合本站 JSON 规范的合法 JSON。
只输出 JSON，不要输出解释。
顶层必须包含 schema_version、paper_id、title、questions。
选择题 options 必须使用 { key, text } 结构。
如有图片，请放入 assets。
如信息不确定，请尽量保留，并放到 description 或 rationale 中说明。
```
