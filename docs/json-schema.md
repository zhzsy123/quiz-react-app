# JSON 规范

这份文档是项目当前唯一生效的公开 JSON 规范，目标不是“面向开发者写理论”，而是“面向 AI 清洗试卷时直接可用”。

## 设计结论

- 一份 JSON 对应一张试卷。
- 一份 JSON 对应一个科目。
- 一张试卷可以混合多种题型，但仍然只用一个 JSON。
- 不要因为题型不同，把同一张试卷拆成两个 JSON。

这次国际贸易样卷已经按这个原则收口。选择题、判断题、简答题、案例分析题、计算题、操作题可以同时存在于同一个 `questions` 数组中。

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

## 最低要求

- 顶层必须有 `schema_version`、`paper_id`、`title`、`subject`、`questions`
- 每道题至少有 `id`、`type`、`prompt`
- 同一张卷子的所有题型统一放进 `questions`
- 原卷缺字、漏题、漏选项时，不要让 AI 硬编

## 支持题型

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

## 组织规则

### 单题客观题

直接逐题写：

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`

### 阅读理解

每篇文章一个 `reading`，文章内容放 `passage`，小题放 `questions`。

### 完形填空

整篇一个 `cloze`，空位放 `blanks`，不要拆成多个顶层题目。

### 国际贸易主观题

国际贸易科目的这几类题都直接作为独立题目：

- `short_answer`
- `case_analysis`
- `calculation`
- `operation`

## 示例字段

### 简答题

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

### 案例分析题

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

### 计算题

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

### 操作题

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

## 面向 AI 的提示词模板

这份规范本身就是给 AI 用的，所以推荐直接附上这段提示词：

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
8. 如未给分值，请尽量按原卷结构补 score；确实没有时也不要臆造规范之外的信息。
9. 只返回合法 JSON。
```
