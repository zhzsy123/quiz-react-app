# JSON 规范

这份文档就是给 AI 清洗试卷时用的规范说明，可以直接连同 PDF / DOCX 一起发给 AI。

## 核心原则

- 一份 JSON 只对应一张试卷。
- 一份 JSON 只对应一个科目。
- 同一张试卷里可以混合多种题型，但仍然只用一个 JSON。
- 不要把同一张卷子拆成两个 JSON，只因为题型不同。

## 顶层结构

```json
{
  "schema_version": "2026-04",
  "paper_id": "international_trade_mock_001",
  "title": "国际贸易模拟卷 01",
  "subject": "international_trade",
  "description": "用于个人练习与模考导入",
  "duration_minutes": 150,
  "questions": []
}
```

## 必填字段

- `schema_version`
- `paper_id`
- `title`
- `subject`
- `questions`

## 题型约定

- 普通选择题：`single_choice`
- 多选题：`multiple_choice`
- 判断题：`true_false`
- 单题填空：`fill_blank`
- 完形填空：`cloze`
- 阅读理解：`reading`
- 翻译题：`translation`
- 简答题：`short_answer`
- 案例分析题：`case_analysis`
- 计算题：`calculation`
- 操作题：`operation`
- 作文题：`essay`

## 组织规则

- 阅读理解每篇文章写成一个 `reading`，小题放进 `questions`。
- 完形填空整篇写成一个 `cloze`，空位放进 `blanks`。
- 简答、案例分析、计算、操作、翻译、作文都各自作为独立题目。
- 一张国际贸易试卷里完全可以同时出现 `single_choice`、`true_false`、`short_answer`、`case_analysis`、`calculation`、`operation`，直接放在同一个 `questions` 数组里。

## 字段细则

### 选择题

- `options` 统一写成 `[{ "key": "A", "text": "..." }]`
- `single_choice.answer.correct` 是单个选项字母
- `multiple_choice.answer.correct` 是数组
- `true_false.answer.correct` 可以写 `true / false`，也可以写 `T / F`

### 阅读理解

```json
{
  "id": "reading_1",
  "type": "reading",
  "prompt": "阅读下文并回答问题。",
  "passage": {
    "title": "Passage A",
    "content": "文章正文"
  },
  "questions": [
    {
      "id": "reading_1_q1",
      "type": "single_choice",
      "prompt": "主旨是什么？",
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." }
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

### 完形填空

```json
{
  "id": "cloze_1",
  "type": "cloze",
  "prompt": "选择最合适的答案。",
  "article": "国际贸易 [[1]] 资源配置。",
  "blanks": [
    {
      "blank_id": 1,
      "options": [
        { "key": "A", "text": "优化" },
        { "key": "B", "text": "阻碍" }
      ],
      "correct": "A",
      "rationale": "语义最合适"
    }
  ]
}
```

### 国际贸易主观题

```json
{
  "id": "short_1",
  "type": "short_answer",
  "prompt": "简述贸易转移与贸易创造的区别。",
  "score": 10,
  "answer": {
    "type": "subjective",
    "reference_answer": "可从定义、形成原因、经济效果三方面回答。",
    "scoring_points": ["定义", "形成原因", "经济效果"]
  }
}
```

```json
{
  "id": "case_1",
  "type": "case_analysis",
  "prompt": "分析银行拒付是否合理，并提出补救路径。",
  "score": 20,
  "context_title": "案例材料",
  "context": "某出口企业在信用证项下提交单据后遭银行拒付。",
  "answer": {
    "type": "subjective",
    "reference_answer": "应围绕单证一致原则、拒付理由、补救方案展开。",
    "scoring_points": ["规则依据", "争议判断", "补救措施"]
  }
}
```

```json
{
  "id": "calc_1",
  "type": "calculation",
  "prompt": "计算该商品的换汇成本。",
  "score": 6,
  "context": "已知收购价、国内费用、退税额和 FOB 净收入。",
  "answer": {
    "type": "subjective",
    "reference_answer": "先算出口总成本，再除以 FOB 外汇净收入。"
  }
}
```

```json
{
  "id": "operation_1",
  "type": "operation",
  "prompt": "根据磋商函电整理合同关键条款。",
  "score": 16,
  "context_title": "函电往来",
  "context": "双方围绕价格、装运期、保险和付款方式进行了多轮磋商。",
  "answer": {
    "type": "subjective",
    "reference_answer": "应按发盘、还盘、接受和合同条款整理。"
  }
}
```

## 给 AI 的推荐提示词

把下面这段话和这份规范一起发给 AI 即可：

```text
请把这份试卷整理成符合本规范的合法 JSON，只输出 JSON，不要输出解释。

要求：
1. 一份 JSON 只对应一张试卷、一个科目。
2. 同一张试卷里的不同题型全部放进同一个 questions 数组，不要拆成多个 JSON。
3. 顶层必须包含 schema_version、paper_id、title、subject、questions。
4. 阅读理解按每篇文章一个 reading；完形填空按整篇一个 cloze。
5. 翻译、简答、案例分析、计算、操作、作文都作为独立题目。
6. options 必须写成 { key, text } 结构。
7. 如果原卷信息缺失，不要乱编；必须推断时，请在 description 或 rationale 里明确说明。
8. 如未给分值，请尽量按原卷结构补 score；确实没有时也不要臆造整卷结构说明之外的信息。
9. 只返回合法 JSON。
```
