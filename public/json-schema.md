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
- 简答题：每题一个 `short_answer`
- 案例分析题：每题一个 `case_analysis`
- 计算题：每题一个 `calculation`
- 操作题：每题一个 `operation`
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
- `short_answer`
- `case_analysis`
- `calculation`
- `operation`
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

### 简答题

```json
{
  "id": "q_short_001",
  "type": "short_answer",
  "prompt": "简述国际资本流动与国际贸易的相互关系。",
  "score": 10,
  "answer": {
    "type": "subjective",
    "reference_answer": "可从替代关系和互补关系两个角度作答。",
    "scoring_points": ["替代关系", "互补关系"]
  }
}
```

### 案例分析题

```json
{
  "id": "q_case_001",
  "type": "case_analysis",
  "prompt": "分析银行拒付是否合理，并提出解决方案。",
  "score": 20,
  "context_title": "案例材料",
  "context": "某出口企业在信用证项下提交单据后遭银行拒付。",
  "answer": {
    "type": "subjective",
    "reference_answer": "应围绕单证一致原则、拒付理由与补救路径展开。",
    "scoring_points": ["审核标准", "拒付是否合理", "补救措施"]
  }
}
```

### 计算题

```json
{
  "id": "q_calc_001",
  "type": "calculation",
  "prompt": "试计算该商品的换汇成本。",
  "score": 6,
  "context": "出口商品 1000 箱，每箱收购价 100 元，国内费用 15%，每箱退税 7 元，FOB 净收入 16.8 美元。",
  "answer": {
    "type": "subjective",
    "reference_answer": "换汇成本 = 108000 / 16800 = 6.43 元/美元。"
  }
}
```

### 操作题

```json
{
  "id": "q_operation_001",
  "type": "operation",
  "prompt": "根据磋商函电分析各自属于哪个环节，并完成合同要点。",
  "score": 16,
  "context_title": "磋商函电",
  "context": "甲乙双方围绕 CIF 纽约价格、装运期和信用证支付条件多次往来。",
  "answer": {
    "type": "subjective",
    "reference_answer": "可从发盘、还盘、接受以及最终合同要点四个方面整理。"
  }
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
7. 简答题、案例分析题、计算题、操作题分别写成 short_answer、case_analysis、calculation、operation。
8. 作文题写成独立 essay。
9. 选择题 options 必须使用 { key, text }。
10. 如果原卷信息缺失，不要随意编造；如必须推断，请在 description 或 rationale 中明确说明。
11. 只返回合法 JSON。
```
