# 数据结构试题 JSON 解析规范

这份规范对应当前首页“数据结构”下载入口，目标是让题库作者或 AI 清洗链输出**可被当前系统稳定导入**的 JSON。

## 适用范围

- 科目：`data_structure`
- 当前推荐题型：
  - `single_choice`
  - `true_false`
  - `fill_blank`
  - `function_fill_blank`
  - `short_answer`
  - `programming`
  - `composite`

## 顶层结构

```json
{
  "schema_version": "2026-04",
  "paper_id": "ds_mock_001",
  "title": "数据结构模拟卷 01",
  "subject": "data_structure",
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
3. 当前科目必须写成 `subject: "data_structure"`。
4. 推荐使用顶层 `questions`；旧版 `items` 仍兼容，但不建议新文件继续使用。
5. 同一张卷子可以混合多种题型，全部放在同一个 `questions` 数组中。

## 题型说明

### 1. 单项选择题 `single_choice`

```json
{
  "id": "ds_sc_001",
  "type": "single_choice",
  "prompt": "下列关于顺序表的说法，正确的是（ ）。",
  "score": 2,
  "options": [
    { "key": "A", "text": "顺序表只能顺序查找" },
    { "key": "B", "text": "顺序表支持随机访问" },
    { "key": "C", "text": "顺序表不能插入" },
    { "key": "D", "text": "顺序表一定是链式存储" }
  ],
  "answer": {
    "type": "objective",
    "correct": "B",
    "rationale": "顺序表的核心特点之一是支持按下标随机访问。"
  }
}
```

要求：
- `options` 必须是 `{ key, text }` 数组
- `answer.correct` 必须是单个选项字母

### 2. 判断题 `true_false`

```json
{
  "id": "ds_tf_001",
  "type": "true_false",
  "prompt": "栈属于先进先出结构。",
  "score": 2,
  "answer": {
    "type": "objective",
    "correct": "F",
    "rationale": "栈是后进先出。"
  }
}
```

要求：
- `answer.correct` 推荐写 `T / F`

### 3. 普通填空题 `fill_blank`

```json
{
  "id": "ds_fb_001",
  "type": "fill_blank",
  "prompt": "在单链表中，若 p 指向某结点，则在 p 后插入结点 s 的核心操作是 ____；____。",
  "score": 4,
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["s->next=p->next"],
      "score": 2,
      "rationale": "先让新结点接住原后继。"
    },
    {
      "blank_id": 2,
      "accepted_answers": ["p->next=s"],
      "score": 2,
      "rationale": "再让前驱指向新结点。"
    }
  ]
}
```

要求：
- 使用 `blanks` 数组，不要把多空题压成单个字符串答案
- 每个 blank 建议带 `score` 和 `rationale`

### 4. 函数填空题 `function_fill_blank`

```json
{
  "id": "ds_func_001",
  "type": "function_fill_blank",
  "prompt": "补全顺序查找函数。",
  "score": 6,
  "context": "int search(int a[], int n, int key) { for (int i = 0; i < ____; ++i) { if (a[i] == key) return ____; } return -1; }",
  "response_format": "code",
  "blanks": [
    {
      "blank_id": 1,
      "accepted_answers": ["n"],
      "score": 3,
      "rationale": "循环上界是 n。"
    },
    {
      "blank_id": 2,
      "accepted_answers": ["i"],
      "score": 3,
      "rationale": "命中后返回当前位置 i。"
    }
  ]
}
```

要求：
- 题型必须写 `function_fill_blank`
- 建议带 `context` 和 `response_format: "code"`

### 5. 简答题 `short_answer`

```json
{
  "id": "ds_short_001",
  "type": "short_answer",
  "prompt": "简述栈和队列的区别。",
  "score": 8,
  "answer": {
    "type": "subjective",
    "reference_answer": "栈是后进先出，队列是先进先出。",
    "scoring_points": ["说明栈的存取特征", "说明队列的存取特征", "完成对比"]
  }
}
```

### 6. 程序设计题 `programming`

```json
{
  "id": "ds_prog_001",
  "type": "programming",
  "prompt": "编写函数实现二叉树的先序遍历。",
  "score": 12,
  "answer": {
    "type": "subjective",
    "reference_answer": "参考代码或伪代码。",
    "scoring_points": ["递归/非递归思路正确", "访问顺序正确", "边界处理正确"]
  }
}
```

### 7. 综合题 `composite`

适用于“共享材料 + 多个子题”的情况，例如代码阅读、算法过程分析。

```json
{
  "id": "ds_comp_001",
  "type": "composite",
  "prompt": "阅读下列图的遍历过程并回答问题。",
  "material_title": "图遍历材料",
  "material_format": "code",
  "material": "visited[v]=true; for (...) ...",
  "score": 10,
  "questions": [
    {
      "id": "ds_comp_001_q1",
      "type": "single_choice",
      "prompt": "该过程对应的遍历方式是（ ）。",
      "score": 2,
      "options": [
        { "key": "A", "text": "广度优先遍历" },
        { "key": "B", "text": "深度优先遍历" },
        { "key": "C", "text": "拓扑排序" },
        { "key": "D", "text": "最短路径" }
      ],
      "answer": {
        "type": "objective",
        "correct": "B",
        "rationale": "递归访问邻接点，对应 DFS。"
      }
    },
    {
      "id": "ds_comp_001_q2",
      "type": "short_answer",
      "prompt": "说明该遍历算法的时间复杂度。",
      "score": 8,
      "answer": {
        "type": "subjective",
        "reference_answer": "邻接表存储下为 O(V+E)。",
        "scoring_points": ["写出复杂度", "说明与顶点边数关系"]
      }
    }
  ]
}
```

约束：
- `composite.questions` 内子题必须继续使用当前已支持的通用题型
- 不允许嵌套 `composite`

## 不推荐的做法

- 不要给数据结构科目写 `reading / cloze / translation / essay`
- 不要把函数填空写成普通 `fill_blank` 且丢失代码上下文
- 不要把“共享材料 + 多小题”硬压成一题长问答，应该用 `composite`

## 给 AI 的推荐提示词

```text
请把这份数据结构试卷整理成符合本规范的合法 JSON，只输出 JSON，不要输出解释。

要求：
1. 顶层必须包含 schema_version、paper_id、title、subject、questions。
2. subject 必须是 data_structure。
3. 仅使用本规范允许的题型：single_choice、true_false、fill_blank、function_fill_blank、short_answer、programming、composite。
4. 共享材料 + 多个子题必须整理成 composite。
5. 所有客观题必须尽量给出标准答案与解析。
6. 所有主观题尽量给出 reference_answer 和 scoring_points。
7. 只返回合法 JSON。
```
