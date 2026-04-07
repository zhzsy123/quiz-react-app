# JSON 规范

这个项目建议的最小单位是：

- 一份 JSON = 一份试卷
- 一份 JSON = 一个科目
- 不要把多个科目混在同一个 JSON 里

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

## 必须遵守的规则

- 顶层必须包含 `schema_version`、`paper_id`、`title`、`subject`、`questions`
- `questions` 必须是数组
- 每道题至少包含 `id`、`type`、`prompt`
- 一份 JSON 只放一张完整试卷，不要把多张卷子拼在一起
- 一份 JSON 只放一个科目，不要把英语、数学、数据结构混写
- 如果某些信息 OCR 缺失，不要凭空乱编；确实需要补推断时，必须在 `description` 或 `answer.rationale` 里说明

## 题型拆分规则

- 普通选择题：每题一个 `single_choice`
- 多选题：每题一个 `multiple_choice`
- 判断题：每题一个 `true_false`
- 单句填空：每题一个 `fill_blank`
- 完形填空：整篇文章用一个 `cloze`
- 阅读理解：每篇文章用一个 `reading`
- 英译中 / 中译英：每题一个 `translation`
- 作文：每题一个 `essay`

不要这样做：

- 不要把整套阅读的 16 个小题全部拆成 16 个独立单选并丢掉文章上下文
- 不要把整篇完形填空拆成 10 个顶层题目
- 不要把整张卷子写成一个大对象然后塞所有子题

## 支持题型

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `reading`
- `cloze`
- `translation`
- `essay`

## 关键字段约定

- 选择题统一使用 `options: [{ key, text }]`
- 判断题使用 `answer.correct: true / false`，也可写成 `T / F`
- `multiple_choice.answer.correct` 必须是数组
- `fill_blank.blanks[].accepted_answers` 必须是字符串数组
- `cloze.blanks[].correct` 填选项字母，例如 `"A"`
- `reading.questions` 里的子题目前只使用 `single_choice`
- 图片统一挂到 `assets`，不要单独设计图片题类型

## 示例

### 单选题

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

### 完形填空

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

### 阅读理解

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

## 推荐给 AI 的提示词

```text
请把这份试卷整理成符合本站 JSON 规范的合法 JSON。
只输出 JSON，不要输出解释。

要求：
1. 一份 JSON 只对应一张试卷、一个科目。
2. 顶层必须包含 schema_version、paper_id、title、subject、questions。
3. 普通选择题写成 single_choice。
4. 完形填空整篇写成 cloze，不要拆成多个顶层题。
5. 阅读理解每篇文章写成一个 reading，子题放到 questions 数组里。
6. 翻译题分别写成独立 translation。
7. 作文题写成独立 essay。
8. 选择题 options 必须使用 { key, text }。
9. 如果原卷信息缺失，不要随意编造；如必须推断，请在 description 或 rationale 中明确说明。
10. 只返回合法 JSON。
```
