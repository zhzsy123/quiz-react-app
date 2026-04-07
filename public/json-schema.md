# JSON 规范

请将试卷整理成以下统一结构后再导入本站：

```json
{
  "schema_version": "2026-04",
  "paper_id": "english_mock_2026_001",
  "title": "英语模拟卷 2026-01",
  "subject": "english",
  "description": "用于个人模考与刷题",
  "duration_minutes": 120,
  "questions": [
    {
      "id": "q_sc_001",
      "type": "single_choice",
      "prompt": "Artificial intelligence is developing so rapidly that its influence on modern life cannot be ______.",
      "score": 2,
      "difficulty": "medium",
      "tags": ["grammar"],
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
  ]
}
```

支持题型：

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `reading`
- `cloze`
- `translation`
- `essay`

字段说明：

- 顶层必须包含 `questions` 数组。
- 选择题统一使用 `options: [{ key, text }]`。
- 判断题使用 `answer.correct: true / false` 或 `T / F`。
- 填空题使用 `blanks`，每个空位提供 `accepted_answers`。
- 阅读题使用 `passage + questions`。
- 完形填空使用 `article + blanks`，原文空位写成 `[[1]]` 这种标记。
- 翻译和作文使用 `answer.type = "subjective"`。
- 图片资源统一挂到题目的 `assets` 字段，不再额外设计图片题类型。

给 AI 的建议提示词：

```text
请把这份试卷整理成符合本站 JSON 规范的合法 JSON。
只输出 JSON，不要输出解释。
顶层必须包含 schema_version、paper_id、title、questions。
选择题 options 必须使用 { key, text } 结构。
如有图片，请放入 assets。
如信息不确定，请尽量保留，并放到 description 或 rationale 中说明。
```
