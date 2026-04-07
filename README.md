# Quiz React App

基于 `Vite + React` 的题库客户端，支持本地导入与 AI 相关增强能力。

- 支持 `PDF / DOCX / JSON` 导入
- 支持 `JSON` 题库内容转化、规范化、评分与校验
- 支持本地持久化（IndexedDB / localStorage）
- 包含题目练习、收藏、历史记录、错题、文件工作区等主流程
- 集成 AI 审核与改写能力（`features/ai`）

## 运行方式

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 当前代码结构（实际）

项目当前主结构不再是“`pages + boundaries` 组合”：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### 结构说明

- `app`：应用启动与运行时骨架（`main.jsx`, `router`, `providers`, 样式）
- `pages`：页面容器（如 `DashboardSplitPage`, `SubjectWorkspacePage`, `HistoryPage`）
- `widgets`：可复用 UI 组件（如 `quiz/CleanQuizView`, `quiz-importer/QuizImporter`）
- `features`：页面内业务域与状态逻辑（`dashboard`, `workspace`, `history`, `wrong-book`, `favorites`, `file-hub`, `ai`）
- `entities`：领域实体与基础能力
  - 业务对象模型/主题：`subject`, `attempt`, `history`, `favorite`, `wrong-book`, `wrongbook`, `profile`, `session`, `workspace`
  - 核心题库流水线：`entities/quiz/lib/quizPipeline.js` 与 `quiz/lib/*`
  - 仓储层：`entities/*/api/*Repository.js`
- `shared`：横切能力（网络、存储、偏好设置、兼容层）
  - `shared/api`、`shared/lib/preferences`、`shared/storage/adapters`
  - `shared/storage/indexedDb`、`shared/storage/compat`

## 关键链路

### 题库导入与处理链

```text
widgets/quiz-importer -> entities/quiz/lib/quizPipeline -> entities/quiz/lib/quizSchema
                                        -> text/*, validation/*, normalize/*, scoring/*
```

`quizPipeline` 在当前实现中负责：

1. 解析题目文本/JSON（`parseQuizJsonText`）
2. 校验 payload（`validateQuizPayload`）
3. 标准化题目结构（`normalize*`）
4. 评分计算（`scoring*`）
5. 转交显示/存储逻辑

### 数据流

```text
pages/widgets/features
  -> entities/*/api/*Repository
  -> shared/storage/{adapters, indexedDb, compat}

features/ai/reviewService
  -> shared/api/* -> shared/api/httpClient

features/* -> shared/lib/preferences -> shared/storage/adapters/browserStorageAdapter -> localStorage
```

## 迁移说明（简版）

详细状态见 `docs/migration.md`。简要说明：

- 旧有 `boundaries` 已不再作为主目录保留
- 页面/业务/实体/共享层边界已落地
- `quiz` 领域核心处理逻辑统一在 `entities/quiz/lib` 下维护
- 仍存在文档中的历史内容与链接（如绝对路径）需要定期统一清理

更多架构说明见：`docs/architecture.md`
