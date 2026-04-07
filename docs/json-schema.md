# JSON 规范

这份文档是当前项目唯一生效的公开 JSON 规范。

## 核心结论

- 一份 JSON 最好只对应一张试卷
- 一份 JSON 最好只对应一个科目
- 当前项目的导入入口本身就是按科目分开的，所以不要把多个科目混在一份 JSON 中

换句话说：

- 英语一张卷，单独一个 JSON
- 数据结构一张卷，单独一个 JSON
- 数据库原理一张卷，单独一个 JSON

不建议把“英语 + 数据结构”混成一份 JSON。这样既不符合当前模块组织，也会让 AI 在拆题时更容易失控。

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

## 顶层字段说明

- `schema_version`: 当前推荐写 `"2026-04"`
- `paper_id`: 试卷唯一标识
- `title`: 试卷标题
- `subject`: 科目，例如 `english`
- `description`: 额外说明，可为空
- `duration_minutes`: 建议考试时长
- `questions`: 题目数组

## 必须遵守的规则

- 顶层必须有 `questions`
- 每道题至少包含 `id`、`type`、`prompt`
- 一份 JSON 只放一张试卷，不要拼多张
- 一份 JSON 只放一个科目，不要混科目
- 如 OCR 缺字、漏选项、题号不清，不要随意编造
- 如果必须做合理推断，必须把推断说明写进 `description` 或 `answer.rationale`

## 题型组织规则

### 普通选择题

每题一个对象：

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`

### 完形填空

整篇文章写成一个 `cloze`，不要拆成多个顶层题。

原因：

- 保留整篇上下文
- 方便以后做整篇导航和统计
- 避免 AI 把空位和题号拆乱

### 阅读理解

每篇文章写成一个 `reading`，小题放进内部的 `questions` 数组。

不要把一篇阅读的 4 个小题拆成 4 个互不相关的顶层题，否则文章上下文会丢失。

### 翻译

英译中和中译英各写成一个独立 `translation`。

### 写作

作文写成一个独立 `essay`。

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

### 选择题

- `options` 必须是 `[{ key, text }]`
- `single_choice.answer.correct` 填单个选项字母
- `multiple_choice.answer.correct` 填数组
- `true_false.answer.correct` 填 `true/false` 或 `T/F`

### 填空题

- `fill_blank.blanks[].accepted_answers` 必须是字符串数组

### 完形填空

- 使用 `article + blanks`
- 原文空位写成 `[[1]]`、`[[2]]`
- `cloze.blanks[].correct` 填选项字母，例如 `"A"`

### 阅读题

- 使用 `passage + questions`
- 当前子题建议只使用 `single_choice`

### 主观题

- 翻译和作文统一用 `answer.type = "subjective"`

### 图片

- 统一挂在 `assets`
- 任意题型都可以带图

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

### 阅读题

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
