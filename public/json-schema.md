# 试卷导入资料包说明

这份资料是给 `DeepSeek / 其他大模型` 和人工整理题库时一起使用的导入协议。

推荐工作流：

1. 从首页下载“导入资料包”
2. 把 `试卷原文`、`exam-import.schema.json`、`exam-import.example.json`、`deepseek-exam-import-prompt.txt` 一起发给 DeepSeek
3. 让 DeepSeek 只返回一份合法 JSON
4. 回到本站，用导入功能导入这份 JSON
5. 开始刷题

## 顶层结构

每次导入一份 `ExamImportPackage`：

```json
{
  "version": "1.0",
  "meta": {
    "title": "2025 湖南财政经济学院计算机专业综合",
    "sourceType": "paper_parsed",
    "school": "湖南财政经济学院",
    "year": 2025,
    "paperTitle": "2025 湖南财政经济学院专业考试真题回忆版",
    "paperType": "recall",
    "subjectScope": ["data_structure", "database"],
    "language": "zh-CN"
  },
  "questions": []
}
```

## 必填字段

- 顶层必须有：`version`、`meta`、`questions`
- 每道题必须有：`id`、`subject`、`module`、`questionType`、`content`、`answerMode`、`standardAnswer`

## 学科取值

- `data_structure`
- `database`

## 支持的 content 块

- `text`
- `table`
- `image`
- `graph`
- `binary_tree`
- `schema`

说明：

- 题目展示可以复杂，作答必须尽量简单
- 如果题目里有图、树、关系模式，优先给结构化数据，不要只给截图

## 支持的 questionType

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `short_answer`
- `application`
- `sql`

## 支持的 answerMode

- `single_choice`
- `multiple_choice`
- `true_false`
- `multi_blank`
- `sequence_input`
- `structured_form`
- `sql_editor`
- `text`
- `textarea`

## 关键设计原则

### 1. 用户不画图

不要要求用户在前端画树、画图、画 E-R 图。

改成这些作答方式：

- 图题：填访问序列、选边顺序、dist 数组
- 树题：填先序 / 中序 / 后序 / 编码结果
- 排序题：填每一趟结果
- E-R / 数据库设计题：填实体、联系、关系模式
- SQL 题：直接写 SQL

### 2. 题目可以复杂，答案要结构化

例如图题：

```json
{
  "content": [
    { "type": "text", "value": "写出 DFS 访问序列。" },
    {
      "type": "graph",
      "graphType": "undirected",
      "vertices": ["A", "B", "C"],
      "edges": [
        { "from": "A", "to": "B" },
        { "from": "B", "to": "C" }
      ]
    }
  ],
  "answerMode": "sequence_input"
}
```

### 3. DeepSeek 必须只返回 JSON

- 不要返回 Markdown
- 不要加 ```json 包裹
- 不要解释
- 不要夹带“以下是结果”

## 常见题型映射

### 单选题

```json
{
  "id": "q_sc_001",
  "subject": "data_structure",
  "module": "linear_list",
  "questionType": "single_choice",
  "content": [
    { "type": "text", "value": "顺序表的随机存取时间复杂度是？" }
  ],
  "options": [
    { "key": "A", "text": "O(1)" },
    { "key": "B", "text": "O(n)" },
    { "key": "C", "text": "O(log n)" },
    { "key": "D", "text": "O(n log n)" }
  ],
  "answerMode": "single_choice",
  "standardAnswer": {
    "type": "single_choice",
    "value": "A"
  },
  "analysis": "顺序表支持按下标直接访问。"
}
```

### 图题 / 遍历序列

```json
{
  "id": "q_graph_001",
  "subject": "data_structure",
  "module": "graph",
  "subtype": "dfs",
  "questionType": "application",
  "content": [
    { "type": "text", "value": "写出 DFS 访问序列。" },
    {
      "type": "graph",
      "graphType": "undirected",
      "vertices": ["A", "B", "C"],
      "edges": [
        { "from": "A", "to": "B" },
        { "from": "B", "to": "C" }
      ]
    }
  ],
  "answerMode": "sequence_input",
  "answerSpec": {
    "fields": [
      { "key": "dfs_order", "label": "DFS 序列", "separatorHint": "空格分隔" }
    ]
  },
  "standardAnswer": {
    "type": "sequence_input",
    "fields": {
      "dfs_order": ["A", "B", "C"]
    }
  }
}
```

### SQL 题

```json
{
  "id": "q_sql_001",
  "subject": "database",
  "module": "sql",
  "questionType": "sql",
  "content": [
    { "type": "text", "value": "查询所有学生信息。" }
  ],
  "answerMode": "sql_editor",
  "standardAnswer": {
    "type": "sql",
    "sql": "SELECT * FROM student;"
  }
}
```

### 数据库设计 / 结构化作答

```json
{
  "id": "q_design_001",
  "subject": "database",
  "module": "database_design",
  "subtype": "er_to_relational",
  "questionType": "application",
  "content": [
    { "type": "text", "value": "写出实体、联系和关系模式。" }
  ],
  "answerMode": "structured_form",
  "answerSpec": {
    "fields": [
      { "key": "entities", "label": "实体", "fieldType": "textarea" },
      { "key": "relations", "label": "关系模式", "fieldType": "textarea" }
    ]
  },
  "standardAnswer": {
    "type": "structured_form",
    "fields": {
      "entities": "Student(sno,sname)",
      "relations": "Student(sno PK,sname)"
    }
  }
}
```

## 给 DeepSeek 的使用要求

把下面这些文件一起发给它：

- `试卷原文`
- `exam-import.schema.json`
- `exam-import.example.json`
- `deepseek-exam-import-prompt.txt`

并要求：

- 严格按照协议输出
- 只返回 JSON
- 信息缺失时可以留空，但不要编造事实
- 复杂题用结构化 `content`
- 用户作答必须落到 `answerMode + answerSpec + standardAnswer`

## 资料包内容

- `json-schema.md`
- `exam-import.schema.json`
- `exam-import.example.json`
- `deepseek-exam-import-prompt.txt`
