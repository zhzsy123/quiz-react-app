# 英语试卷 AI 清洗协议 v2

> 适用主链：`PDF / DOCX / OCR -> 文本清洗 -> AI 结构化 -> quizPipeline -> 预览 -> 入库 / 立即开刷`
>
> 本协议是英语试卷的专用清洗协议，不是给用户手工编写 JSON 的说明书。它服务于系统内部的 AI 清洗主链，用于约束模型把原始试卷文本稳定地转换成当前系统可消费的内部标准结构。

## 1. 目标

把英语试卷从“原始文档文本”清洗成“可导入、可展示、尽量可自动判分”的结构化数据。

本协议优先解决以下问题：

1. 客观题缺少标准答案
2. 阅读理解被拆坏或子题缺字段
3. 完形填空缺少文内空位、缺 blanks 结构
4. 翻译题方向不明确、正文位置不稳定
5. 作文题评分要点丢失
6. OCR / PDF 提取后的脏文本污染结构化结果

## 2. 适用范围

英语试卷只允许以下五种顶层题型：

1. `single_choice`
2. `cloze`
3. `reading`
4. `translation`
5. `essay`

禁止输出：

1. `multiple_choice`
2. `true_false`
3. `fill_blank`
4. `function_fill_blank`
5. `short_answer`
6. `case_analysis`
7. `calculation`
8. `operation`
9. `programming`
10. `sql`
11. `er_diagram`
12. `composite`

## 3. 输入约束

AI 清洗时，输入不是原始 PDF/DOCX 文件本身，而是系统已经提取出的文本草稿。

建议输入内容包括：

1. `subject = english`
2. `source_type = pdf | docx | ocr_pdf`
3. `document_title`
4. `plain_text`
5. `page_blocks`
6. `outline`
7. `known_warnings`

系统在调用 AI 前应尽量先做本地脏文本清洗：

1. 去除连续空白、异常换行
2. 统一全角/半角标点
3. 修正明显的 OCR 误识别符号
4. 保留题号、选项字母、分值、段落边界

## 4. 输出总规则

AI 输出必须满足：

1. 只输出一个 JSON 对象
2. 不输出 Markdown
3. 不输出代码围栏
4. 不输出解释文字
5. 不输出注释
6. 不输出多份 JSON
7. 不发明协议外题型
8. 所有题目统一放进同一个 `questions` 数组

顶层结构：

```json
{
  "schema_version": "2026-04",
  "paper_id": "english_mock_001",
  "title": "2026 湖南专升本英语模拟卷",
  "subject": "english",
  "description": "可选，试卷说明",
  "duration_minutes": 120,
  "questions": []
}
```

顶层字段要求：

1. `schema_version` 必须是 `"2026-04"`
2. `subject` 必须是 `"english"`
3. `title` 必须有值
4. `questions` 必须是非空数组

## 5. 题目级通用规则

每道顶层题至少包含：

1. `id`
2. `type`
3. `prompt`
4. `score`

可选字段：

1. `context`
2. `context_title`
3. `passage`
4. `article`
5. `options`
6. `answer`
7. `questions`
8. `blanks`

通用硬规则：

1. `id` 必须唯一
2. `score` 必须是数字
3. 题干不得为空
4. 不得把一篇阅读拆成多个顶层单选
5. 不得把一篇完形拆成多个顶层单选

## 6. 各题型协议

### 6.1 单项选择题 `single_choice`

适用：

1. 词汇
2. 语法
3. 句法
4. 语境选择

必填字段：

1. `id`
2. `type = "single_choice"`
3. `prompt`
4. `score`
5. `options`
6. `answer.correct`

结构：

```json
{
  "id": "q1",
  "type": "single_choice",
  "prompt": "Choose the best answer.",
  "score": 2,
  "options": [
    { "key": "A", "text": "go" },
    { "key": "B", "text": "goes" },
    { "key": "C", "text": "went" },
    { "key": "D", "text": "gone" }
  ],
  "answer": {
    "type": "objective",
    "correct": "B",
    "rationale": "用中文给出简短解析。"
  }
}
```

硬规则：

1. `options` 必须正好四个
2. `key` 必须是 `A/B/C/D`
3. `answer.correct` 不能为空
4. `answer.correct` 必须与某个选项 key 对应
5. `rationale` 强烈建议提供，且默认用中文

### 6.2 完形填空 `cloze`

适用：

1. 一篇短文
2. 文中多个空
3. 每空一个四选一答案

必填字段：

1. `id`
2. `type = "cloze"`
3. `prompt`
4. `score`
5. `article`
6. `blanks`

结构：

```json
{
  "id": "cloze_1",
  "type": "cloze",
  "prompt": "Read the passage and choose the best answers.",
  "score": 20,
  "article": "A long time ago, [[1]] ... [[2]] ...",
  "blanks": [
    {
      "blank_id": 1,
      "score": 2,
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." }
      ],
      "correct": "A",
      "rationale": "中文解析"
    }
  ]
}
```

硬规则：

1. `article` 中必须出现文内空位占位符
2. 占位符格式必须是 `[[1]]`、`[[2]]` 这种形式
3. `blanks.length` 必须与文内空位数量一致
4. 每个 `blank` 必须有：
   - `blank_id`
   - `options`
   - `correct`
   - `rationale`
5. 每个 `blank.options` 必须正好四个
6. `correct` 必须是 `A/B/C/D`
7. 不允许只给文章和选项，而不在正文中标出空位

强建议：

1. 如果原卷是 `16-25` 这种题号，可在 `blank_id` 上保留真实序号
2. `score` 最好写每空分值，而不是只写整篇总分

### 6.3 阅读理解 `reading`

适用：

1. 一篇文章
2. 3 到 5 个单选子题
3. 通常一张卷会有 `A/B/C/D` 多篇阅读

必填字段：

1. `id`
2. `type = "reading"`
3. `prompt`
4. `score`
5. `passage`
6. `questions`

结构：

```json
{
  "id": "reading_a",
  "type": "reading",
  "prompt": "Read Passage A and answer the questions.",
  "score": 10,
  "passage": {
    "label": "A",
    "title": "Passage A",
    "content": "Many students like reading in the library..."
  },
  "questions": [
    {
      "id": "A-1",
      "type": "single_choice",
      "prompt": "Where do many students like reading?",
      "score": 2,
      "options": [
        { "key": "A", "text": "At home" },
        { "key": "B", "text": "In the library" },
        { "key": "C", "text": "In the park" },
        { "key": "D", "text": "In the office" }
      ],
      "answer": {
        "type": "objective",
        "correct": "B",
        "rationale": "中文解析"
      }
    }
  ]
}
```

硬规则：

1. 每篇阅读只允许一个顶层 `reading`
2. 子题必须放在 `questions` 数组里
3. 子题 `type` 必须是 `single_choice`
4. 每个子题必须有 `answer.correct`
5. 子题 `id` 必须使用 `A-1 / A-2 / A-3` 这种命名
6. `passage.content` 不得为空
7. 不得把一篇阅读平铺成多个顶层单选

强建议：

1. 用 `passage.label = "A"` 这种方式显式保留篇章编号
2. `score` 最好等于子题分值总和

### 6.4 翻译题 `translation`

适用：

1. 英译中
2. 中译英

必填字段：

1. `id`
2. `type = "translation"`
3. `prompt`
4. `score`
5. `direction`
6. `context` 或 `source_text`

结构：

```json
{
  "id": "translation_1",
  "type": "translation",
  "prompt": "Translate the following sentence into Chinese.",
  "score": 15,
  "direction": "en_to_zh",
  "context": "Knowledge is power.",
  "answer": {
    "type": "subjective",
    "reference_answer": "知识就是力量。",
    "scoring_points": [
      "核心语义准确",
      "表达通顺"
    ]
  }
}
```

硬规则：

1. 必须显式给 `direction`
2. `direction` 只能是：
   - `en_to_zh`
   - `zh_to_en`
3. 正文必须放在 `context` 或 `source_text`
4. `reference_answer` 强烈建议提供
5. `scoring_points` 强烈建议提供

### 6.5 作文题 `essay`

适用：

1. 命题作文
2. 提纲作文
3. 应用写作

必填字段：

1. `id`
2. `type = "essay"`
3. `prompt`
4. `score`
5. `answer.scoring_points`

结构：

```json
{
  "id": "essay_1",
  "type": "essay",
  "prompt": "Write a short essay entitled 'My Best Friend'.",
  "score": 15,
  "answer": {
    "type": "subjective",
    "reference_answer": "可选，给出参考范文或写作方向。",
    "scoring_points": [
      "切题",
      "覆盖提纲要求",
      "结构完整",
      "语言准确",
      "表达连贯"
    ]
  }
}
```

硬规则：

1. `scoring_points` 不能为空
2. `scoring_points` 必须是数组
3. 如原卷有字数要求，应保留在 `prompt` 中
4. 如原卷有写作体裁要求，应保留在 `prompt` 中

## 7. 脏文本清洗规则

AI 在结构化前，应先按以下原则理解并修复脏文本，但不得篡改题意：

### 7.1 中文乱码

允许修复：

1. 明显的 UTF-8 / GBK 错码
2. OCR 造成的零碎乱码
3. 断裂的中文短语

禁止：

1. 在没有上下文依据时凭空重写整句
2. 用“猜测内容”覆盖原题

### 7.2 异常标点

允许修复：

1. 中文全角 / 英文半角混用
2. 错误的引号、破折号、括号
3. 选项后异常的冒号、点号

### 7.3 选项字母错位

允许修复：

1. `A.` / `A)` / `A、` / `A :` 统一成同一语义
2. OCR 把 `B` 识别成 `8`、把 `D` 识别成 `0` 时，若上下文明确，可纠正

硬规则：

1. 结构化后选项 key 必须统一成 `A/B/C/D`
2. 不得凭空新增第五个选项

### 7.4 空格和换行污染

允许修复：

1. 连续空格
2. 不合理换行
3. 题干和选项被分页打断
4. 同一句被拆成多行

强规则：

1. 修复后必须保留原有题号、段落和题型边界
2. 不得因为清洗换行而把相邻两题合并

## 8. 可判分性优先原则

本协议不是“只要能展示就行”，而是“优先保证可自动判分”。

因此：

1. 所有客观题必须有标准答案
2. 阅读子题必须有标准答案
3. 完形每空必须有标准答案
4. 主观题必须尽量给 `reference_answer` 和 `scoring_points`

如果 AI 实在无法确认某道客观题标准答案：

1. 允许保留题目结构
2. 但必须显式标记为缺答案
3. 不能假装给出一个不确定答案

## 9. 导入前预检建议

系统在 AI 输出后，应重点检查：

1. 顶层是否只包含允许的英语题型
2. 所有 `single_choice` 是否有 `answer.correct`
3. 所有 `reading.questions[*]` 是否有 `answer.correct`
4. 所有 `cloze` 是否有文内空位和完整 `blanks`
5. 所有 `translation` 是否有 `direction`
6. 所有 `essay` 是否有 `scoring_points`

预检结果建议分三类：

1. `可直接使用`
2. `可展示但不可自动判分`
3. `结构异常，禁止保存`

## 10. 失败与重试策略

如果某次 AI 清洗结果不满足协议，不建议整卷盲目重试。

建议策略：

1. 优先按题型或 section 局部重解析
2. 把上一次失败原因作为 `previous_generation_error`
3. 只让 AI 修复有问题的部分，不重写整卷

典型失败原因：

1. 单选缺 `answer.correct`
2. 阅读子题缺 `correct`
3. 完形缺文内空位
4. 翻译缺 `direction`
5. 作文缺 `scoring_points`

## 11. 最小有效载荷示例

```json
{
  "schema_version": "2026-04",
  "paper_id": "english_mock_2026_01",
  "title": "2026 湖南专升本英语模拟卷 01",
  "subject": "english",
  "description": "英语 AI 清洗输出示例",
  "duration_minutes": 120,
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "prompt": "Choose the best answer.",
      "score": 2,
      "options": [
        { "key": "A", "text": "go" },
        { "key": "B", "text": "goes" },
        { "key": "C", "text": "went" },
        { "key": "D", "text": "gone" }
      ],
      "answer": {
        "type": "objective",
        "correct": "B",
        "rationale": "中文解析"
      }
    },
    {
      "id": "cloze_1",
      "type": "cloze",
      "prompt": "Read the passage and choose the best answers.",
      "score": 20,
      "article": "A long time ago, [[1]] ... [[2]] ...",
      "blanks": [
        {
          "blank_id": 1,
          "score": 2,
          "options": [
            { "key": "A", "text": "..." },
            { "key": "B", "text": "..." },
            { "key": "C", "text": "..." },
            { "key": "D", "text": "..." }
          ],
          "correct": "A",
          "rationale": "中文解析"
        },
        {
          "blank_id": 2,
          "score": 2,
          "options": [
            { "key": "A", "text": "..." },
            { "key": "B", "text": "..." },
            { "key": "C", "text": "..." },
            { "key": "D", "text": "..." }
          ],
          "correct": "C",
          "rationale": "中文解析"
        }
      ]
    },
    {
      "id": "reading_a",
      "type": "reading",
      "prompt": "Read Passage A and answer the questions.",
      "score": 8,
      "passage": {
        "label": "A",
        "title": "Passage A",
        "content": "Many students like reading in the library..."
      },
      "questions": [
        {
          "id": "A-1",
          "type": "single_choice",
          "prompt": "Where do many students like reading?",
          "score": 2,
          "options": [
            { "key": "A", "text": "At home" },
            { "key": "B", "text": "In the library" },
            { "key": "C", "text": "In the park" },
            { "key": "D", "text": "In the office" }
          ],
          "answer": {
            "type": "objective",
            "correct": "B",
            "rationale": "中文解析"
          }
        }
      ]
    },
    {
      "id": "translation_1",
      "type": "translation",
      "prompt": "Translate the following sentence into Chinese.",
      "score": 15,
      "direction": "en_to_zh",
      "context": "Knowledge is power.",
      "answer": {
        "type": "subjective",
        "reference_answer": "知识就是力量。",
        "scoring_points": [
          "核心语义准确",
          "表达通顺"
        ]
      }
    },
    {
      "id": "essay_1",
      "type": "essay",
      "prompt": "Write a short essay entitled 'My Best Friend'.",
      "score": 15,
      "answer": {
        "type": "subjective",
        "reference_answer": "可选参考范文",
        "scoring_points": [
          "切题",
          "结构完整",
          "语言准确",
          "表达连贯"
        ]
      }
    }
  ]
}
```

## 12. 一句话原则

英语试卷 AI 清洗协议 v2 的核心原则是：

**只保留英语真正需要的五种题型，优先保证结构稳定和可自动判分，任何“能显示但不可定位、不可判分、不可入库”的半残结构都不应被当成合格输出。**
