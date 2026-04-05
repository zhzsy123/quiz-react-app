# JSON Schema v1 for Quiz React App

## 目标

这份规范用于统一题库格式，支持以下题型：

- `single_choice` 单选题
- `cloze` 完形填空
- `reading` 阅读理解
- `translation` 翻译题
- `essay` 作文题

设计目标：

1. 一套顶层协议覆盖客观题与主观题
2. 前端可按 `type` 分发渲染组件
3. 客观题可自动判分
4. 主观题可先展示参考答案与评分点，后续可接 AI 评分
5. 兼容进度保存、错题本、统计分析与 AI 阅卷扩展

---

## 1. 顶层试卷结构

```json
{
  "schema_version": "1.0",
  "paper_id": "hunan_english_mock_001",
  "title": "湖南专升本英语模拟卷 1",
  "subject": "english",
  "description": "用于专升本英语冲刺训练",
  "duration_minutes": 90,
  "total_score": 150,
  "sections": [],
  "questions": []
}
```

### 字段说明

- `schema_version`：题库规范版本
- `paper_id`：试卷唯一标识
- `title`：试卷标题
- `subject`：学科，例如 `english`
- `description`：试卷说明
- `duration_minutes`：建议作答时长
- `total_score`：总分
- `sections`：分区信息
- `questions`：题目列表

---

## 2. section 结构

```json
{
  "id": "sec_1",
  "title": "语法与词汇",
  "description": "单项选择题",
  "question_ids": ["mc_001", "mc_002"]
}
```

### 字段说明

- `id`：分区唯一 ID
- `title`：分区标题
- `description`：分区描述
- `question_ids`：该分区包含的题目 ID 列表

---

## 3. 所有题目的公共字段

所有题型都建议包含以下公共字段：

```json
{
  "id": "唯一题号",
  "type": "题型",
  "section_id": "所属分区ID",
  "title": "题目标题，可选",
  "prompt": "题干或说明",
  "score": 5,
  "difficulty": "easy",
  "tags": ["grammar", "vocabulary"],
  "metadata": {
    "source": "mock",
    "year": 2026,
    "region": "湖南"
  }
}
```

### 说明

- `id`：整卷唯一
- `type`：决定前端渲染方式
- `section_id`：所属 section
- `prompt`：题干或说明
- `score`：题目分值
- `difficulty`：`easy | medium | hard`
- `tags`：便于筛选与统计
- `metadata`：扩展信息

---

## 4. 单选题 `single_choice`

适用于：

- 词汇选择
- 语法选择
- 单句理解题
- 其他标准单选题

### 结构

```json
{
  "id": "mc_001",
  "type": "single_choice",
  "section_id": "sec_1",
  "prompt": "Artificial intelligence is developing so rapidly that its influence on modern life cannot be ______.",
  "score": 2,
  "difficulty": "medium",
  "tags": ["grammar", "voice"],
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

### 说明

- `options`：选项数组
- `answer.type = objective`：表示可自动判分
- `correct`：正确选项 key
- `rationale`：解析

---

## 5. 完形填空 `cloze`

完形填空不建议拆成多个孤立单选题，而应建模为：

> 一篇文章 + 多个空位 + 每个空位的选项与答案

### 结构

```json
{
  "id": "cloze_001",
  "type": "cloze",
  "section_id": "sec_2",
  "title": "完形填空 1",
  "prompt": "Read the following passage and choose the best answer for each blank.",
  "score": 20,
  "difficulty": "medium",
  "tags": ["cloze", "logic", "vocabulary"],
  "article": "Modern technology has changed the way we live. [[1]] it brings convenience, it also creates new problems. Many students spend too much time on smartphones, [[2]] may affect their study and health.",
  "blanks": [
    {
      "blank_id": 1,
      "score": 1,
      "options": [
        { "key": "A", "text": "Although" },
        { "key": "B", "text": "Because" },
        { "key": "C", "text": "Unless" },
        { "key": "D", "text": "Since" }
      ],
      "correct": "A",
      "rationale": "前后是让步关系。"
    },
    {
      "blank_id": 2,
      "score": 1,
      "options": [
        { "key": "A", "text": "who" },
        { "key": "B", "text": "which" },
        { "key": "C", "text": "what" },
        { "key": "D", "text": "where" }
      ],
      "correct": "B",
      "rationale": "which 引导非限制性定语从句，指代前面整件事。"
    }
  ],
  "answer": {
    "type": "objective"
  }
}
```

### 说明

- `article` 使用 `[[1]]`、`[[2]]` 标记空位
- `blanks` 描述每个空位的选项、答案和解析
- 前端可实现为双栏模式或整篇模式

---

## 6. 阅读理解 `reading`

阅读理解应建模为：

> 一篇文章 + 多个附属小题

### 结构

```json
{
  "id": "reading_001",
  "type": "reading",
  "section_id": "sec_3",
  "title": "阅读理解 A",
  "prompt": "Read the passage and answer the following questions.",
  "score": 20,
  "difficulty": "medium",
  "tags": ["reading", "detail", "inference"],
  "passage": {
    "title": "The Influence of Technology on Learning",
    "content": "In recent years, technology has played an increasingly important role in education. Students can now access online courses, digital libraries, and educational apps..."
  },
  "questions": [
    {
      "id": "reading_001_q1",
      "type": "single_choice",
      "prompt": "What is the main idea of the passage?",
      "score": 2,
      "options": [
        { "key": "A", "text": "Technology has no influence on education." },
        { "key": "B", "text": "Technology brings both opportunities and challenges to learning." },
        { "key": "C", "text": "Students should stop using digital devices." },
        { "key": "D", "text": "Teachers are replaced by technology." }
      ],
      "answer": {
        "type": "objective",
        "correct": "B",
        "rationale": "文章主旨是技术对学习的双重影响。"
      }
    }
  ]
}
```

### 说明

- `passage`：阅读文章
- `questions`：附属小题数组
- 子题通常继续使用 `single_choice`

---

## 7. 翻译题 `translation`

建议统一使用 `translation`，再通过 `direction` 区分方向：

- `en_to_zh`
- `zh_to_en`

### 结构

```json
{
  "id": "translation_001",
  "type": "translation",
  "section_id": "sec_4",
  "prompt": "Translate the following sentence into Chinese.",
  "score": 10,
  "difficulty": "medium",
  "tags": ["translation", "en_to_zh"],
  "direction": "en_to_zh",
  "source_text": "Artificial intelligence is developing so rapidly that its influence on modern life cannot be ignored.",
  "answer": {
    "type": "subjective",
    "reference_answer": "人工智能发展如此迅速，以至于它对现代生活的影响不容忽视。",
    "alternate_answers": [
      "人工智能发展得如此之快，以至于人们无法忽视它对现代生活的影响。"
    ],
    "scoring_points": [
      {
        "point": "正确处理 so...that 结构",
        "score": 3
      },
      {
        "point": "正确理解 influence on modern life",
        "score": 4
      },
      {
        "point": "正确表达 cannot be ignored",
        "score": 3
      }
    ],
    "ai_scoring": {
      "enabled": true,
      "rubric": "translation_basic_v1"
    }
  }
}
```

### 说明

- `answer.type = subjective`
- `reference_answer`：参考答案
- `alternate_answers`：可接受替代表达
- `scoring_points`：按点给分基础
- `ai_scoring`：后续接 AI 评分时使用

---

## 8. 作文题 `essay`

作文题建议把要求拆得更结构化，以便后续 AI 稳定评分。

### 结构

```json
{
  "id": "essay_001",
  "type": "essay",
  "section_id": "sec_5",
  "title": "应用文写作",
  "prompt": "For this part, you are supposed to write an email in at least 80 words.",
  "score": 15,
  "difficulty": "hard",
  "tags": ["writing", "email"],
  "essay_type": "email",
  "requirements": {
    "topic": "Write an email to your friend Jason to give him advice on how to live a healthier life.",
    "min_words": 80,
    "max_words": 120,
    "must_include": [
      "give at least two suggestions",
      "use proper email format"
    ],
    "language": "en"
  },
  "answer": {
    "type": "subjective",
    "reference_answer": "Dear Jason, ...",
    "outline": [
      "greeting",
      "state purpose",
      "give advice 1",
      "give advice 2",
      "closing"
    ],
    "scoring_rubric": {
      "content": 5,
      "organization": 3,
      "language": 4,
      "format": 3
    },
    "common_errors": [
      "word count too short",
      "missing greeting or closing",
      "serious grammar mistakes"
    ],
    "ai_scoring": {
      "enabled": true,
      "rubric": "essay_college_english_v1"
    }
  }
}
```

### 说明

- `essay_type`：可区分 `email`、`notice`、`argumentation` 等
- `requirements`：作文要求
- `scoring_rubric`：分项评分结构
- `common_errors`：常见失分点
- `ai_scoring`：后续 AI 阅卷配置

---

## 9. 统一评分结果协议

为了兼容前端判分、历史记录、AI 返回结果，建议统一输出如下格式。

### 客观题评分结果

```json
{
  "question_id": "mc_001",
  "score_awarded": 2,
  "score_total": 2,
  "is_correct": true,
  "feedback": "回答正确。",
  "details": {
    "correct_answer": "A",
    "user_answer": "A",
    "rationale": "cannot be ignored 为被动结构。"
  }
}
```

### 主观题评分结果

```json
{
  "question_id": "essay_001",
  "score_awarded": 11,
  "score_total": 15,
  "is_correct": null,
  "feedback": "内容基本切题，结构完整，但语言错误较多。",
  "details": {
    "subscores": {
      "content": 4,
      "organization": 2,
      "language": 3,
      "format": 2
    },
    "errors": [
      {
        "type": "grammar",
        "original": "He go to school every day.",
        "suggestion": "He goes to school every day."
      }
    ],
    "revision_suggestions": [
      "Use more accurate verb forms.",
      "Make the closing sentence more formal."
    ]
  }
}
```

---

## 10. 统一用户作答协议

前端本地存储、云端同步和 AI 评分接口都建议使用统一作答结构。

```json
{
  "paper_id": "hunan_english_mock_001",
  "answers": {
    "mc_001": {
      "type": "single_choice",
      "response": "A"
    },
    "cloze_001": {
      "type": "cloze",
      "response": {
        "1": "A",
        "2": "B"
      }
    },
    "reading_001": {
      "type": "reading",
      "response": {
        "reading_001_q1": "B"
      }
    },
    "translation_001": {
      "type": "translation",
      "response": {
        "text": "人工智能发展如此迅速，以至于它对现代生活的影响不可忽视。"
      }
    },
    "essay_001": {
      "type": "essay",
      "response": {
        "text": "Dear Jason, ..."
      }
    }
  },
  "current_index": 3,
  "submitted": false,
  "updated_at": 1710000000000
}
```

### 说明

- `paper_id`：试卷 ID
- `answers`：按题号存储作答
- `current_index`：当前题索引
- `submitted`：是否已交卷
- `updated_at`：最近更新时间戳

---

## 11. 前端渲染建议

前端可根据 `question.type` 分发不同渲染器：

- `single_choice` → `SingleChoiceRenderer`
- `cloze` → `ClozeRenderer`
- `reading` → `ReadingRenderer`
- `translation` → `TranslationRenderer`
- `essay` → `EssayRenderer`

这样后续扩展题型时，只需新增题型组件与评分逻辑，不必重写整个系统。

---

## 12. 最小可行题型集合

如果分阶段开发，建议优先支持以下 5 类：

```text
single_choice
cloze
reading
translation
essay
```

它们已经覆盖专升本英语的大部分核心训练场景。

---

## 13. 完整样例

```json
{
  "schema_version": "1.0",
  "paper_id": "english_mock_001",
  "title": "英语模拟卷 1",
  "subject": "english",
  "duration_minutes": 90,
  "total_score": 49,
  "sections": [
    {
      "id": "sec_1",
      "title": "单项选择",
      "question_ids": ["mc_001"]
    },
    {
      "id": "sec_2",
      "title": "完形填空",
      "question_ids": ["cloze_001"]
    },
    {
      "id": "sec_3",
      "title": "阅读理解",
      "question_ids": ["reading_001"]
    },
    {
      "id": "sec_4",
      "title": "翻译",
      "question_ids": ["translation_001"]
    },
    {
      "id": "sec_5",
      "title": "作文",
      "question_ids": ["essay_001"]
    }
  ],
  "questions": [
    {
      "id": "mc_001",
      "type": "single_choice",
      "section_id": "sec_1",
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
        "rationale": "被动结构。"
      }
    },
    {
      "id": "cloze_001",
      "type": "cloze",
      "section_id": "sec_2",
      "prompt": "Choose the best answer for each blank.",
      "score": 10,
      "difficulty": "medium",
      "tags": ["cloze"],
      "article": "Modern life is full of stress. [[1]] people learn to manage time properly, they can improve both study and health.",
      "blanks": [
        {
          "blank_id": 1,
          "score": 1,
          "options": [
            { "key": "A", "text": "If" },
            { "key": "B", "text": "Though" },
            { "key": "C", "text": "Unless" },
            { "key": "D", "text": "Before" }
          ],
          "correct": "A",
          "rationale": "条件关系。"
        }
      ],
      "answer": {
        "type": "objective"
      }
    },
    {
      "id": "reading_001",
      "type": "reading",
      "section_id": "sec_3",
      "prompt": "Read the passage and answer the questions.",
      "score": 10,
      "difficulty": "medium",
      "tags": ["reading"],
      "passage": {
        "title": "Healthy Living",
        "content": "A healthy lifestyle includes enough sleep, regular exercise and a balanced diet..."
      },
      "questions": [
        {
          "id": "reading_001_q1",
          "type": "single_choice",
          "prompt": "What is the passage mainly about?",
          "score": 2,
          "options": [
            { "key": "A", "text": "How to make money" },
            { "key": "B", "text": "How to live healthily" },
            { "key": "C", "text": "How to use AI" },
            { "key": "D", "text": "How to travel abroad" }
          ],
          "answer": {
            "type": "objective",
            "correct": "B",
            "rationale": "主旨题。"
          }
        }
      ]
    },
    {
      "id": "translation_001",
      "type": "translation",
      "section_id": "sec_4",
      "prompt": "Translate the following sentence into Chinese.",
      "score": 12,
      "difficulty": "medium",
      "tags": ["translation", "en_to_zh"],
      "direction": "en_to_zh",
      "source_text": "Only by using AI wisely can we make it serve us better.",
      "answer": {
        "type": "subjective",
        "reference_answer": "只有明智地使用人工智能，我们才能让它更好地为我们服务。",
        "scoring_points": [
          { "point": "Only by... 倒装意义", "score": 4 },
          { "point": "wisely 的准确表达", "score": 4 },
          { "point": "serve us better 的自然翻译", "score": 4 }
        ],
        "ai_scoring": {
          "enabled": true,
          "rubric": "translation_basic_v1"
        }
      }
    },
    {
      "id": "essay_001",
      "type": "essay",
      "section_id": "sec_5",
      "prompt": "Write an email in at least 80 words.",
      "score": 15,
      "difficulty": "hard",
      "tags": ["writing", "email"],
      "essay_type": "email",
      "requirements": {
        "topic": "Write an email to your friend to advise him on how to keep healthy.",
        "min_words": 80,
        "max_words": 120,
        "must_include": [
          "at least two suggestions",
          "proper email format"
        ],
        "language": "en"
      },
      "answer": {
        "type": "subjective",
        "reference_answer": "Dear Tom, ...",
        "outline": [
          "greeting",
          "purpose",
          "advice 1",
          "advice 2",
          "closing"
        ],
        "scoring_rubric": {
          "content": 5,
          "organization": 3,
          "language": 4,
          "format": 3
        },
        "ai_scoring": {
          "enabled": true,
          "rubric": "essay_college_english_v1"
        }
      }
    }
  ]
}
```

---

## 14. 推荐落地顺序

### Phase 1

- `single_choice`
- `cloze`
- `reading`

### Phase 2

- `translation`
- `essay`

### Phase 3

- AI 评分
- 错题本
- 历史记录
- 题型统计

---

## 15. 总结

这份 JSON Schema v1 的核心价值在于：

- 用统一协议覆盖客观题与主观题
- 把题干、作答、评分拆开
- 为后续完形、阅读、翻译、作文、AI 阅卷预留标准接口

建议后续开发时始终遵守两个原则：

1. **所有题型都走统一顶层协议**
2. **题干 / 作答 / 评分严格分离**

这样项目才能从“单选题刷题器”稳定升级为“完整英语考试训练系统”。
