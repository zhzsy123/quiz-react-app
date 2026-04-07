# Architecture

本文描述当前已落地结构与稳定度，并与迁移过程保持区分：未完全稳定的模块只标注为“预埋/在建”。

## 一、当前主结构（已稳定）

当前项目结构不再是“`pages + boundaries`”作为主要分层，实际主干为：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### 结构稳定度说明

- `app`：**稳定**（应用启动、路由、全局上下文和样式入口已定型）
- `pages`：**迁移中（稳定承载 + 命名收敛进行中）**
- `widgets`：**稳定**（功能组件边界稳定，接口逐步收敛）
- `features`：**稳定（内部分布式模型仍在优化）**
- `entities`：**稳定（quiz 与若干领域能力已落地）**
- `shared`：**稳定（存储/接口分层已稳定）**

## 二、分层职责

### `app`（稳定）

- 负责应用启动、路由注册、全局 Provider 与基础样式：
  - `src/app/main.jsx`
  - `src/app/router/AppRouter.jsx`
  - `src/app/providers/AppContext.jsx`
  - `src/app/styles/*`

### `pages`（迁移中）

- 页面容器层，当前作为可运行的迁移容器，承载页面布局与路由映射。
- 当前页面示例：`DashboardSplitPage`, `FileHubPage`, `SubjectWorkspacePage`, `HistoryPage`, `WrongBookPage`, `FavoritesPage`
- 说明：页面命名与调用链仍在清理中，优先保证兼容和可运行性。

### `widgets`（稳定）

- 可复用展示/交互组件，当前重点承载题库展示与导入类组件：
  - `widgets/quiz/CleanQuizView.jsx`
  - `widgets/quiz-importer/QuizImporter.jsx`

### `features`（稳定，部分能力在建）

- 负责页面内业务编排与状态管理（含 `model`），如：
  - `dashboard`, `workspace`, `history`, `wrong-book`, `favorites`, `file-hub`
- AI 相关：`ai` 层为**在建增强能力**，当前已有预留与部分落地，不应视为全部成熟功能。

### `entities`（稳定）

- 领域能力层：实体模型 + 基础服务 + 仓储导出
- 关键能力：`entities/quiz/lib`（`quizPipeline` 及配套子模块）
- 当前仓储能力：`entities/*/api/*Repository.js`
- `quiz` 子结构：

```text
entities/quiz/lib/
  text/
  validation/
  normalize/
  scoring/
  quizPipeline.js
  quizSchema.js
  paperId.js
```

`quizPipeline` 当前处于“**已稳定运转的核心入口 + 正在收口兼容边界**”阶段，主要用于题库导入闭环的统一编排。

### `shared`（稳定）

- 提供横向能力：`api`、`lib/preferences`、`storage`
- 关键注意：`shared/storage/compat/legacyStorageFacade` 与 `shared/lib/storage/storageFacade` 仍处于迁移收口阶段，兼容层尚未宣布清退。

## 三、关键能力成熟度

### 已稳定支持

- `entities/quiz/lib` 的 `validation / normalize / scoring / pipeline` 主要链路可运行
- 页面容器 + 核心 state 流转（features -> pages）的闭环可用
- 持久化基础能力（IndexedDB / browserStorageAdapter）链路可用

### 预埋/在建

- `PDF / DOCX` 导入（与题库流程的完整闭环仍在持续整合）
- `features/ai` 及其与 `shared/api` 的完整能力演进（AI 服务调用与结果处理处于增强中）
- 页面层命名与历史命名兼容清理（包括部分目录与引用）

## 四、数据与调用链（当前）

### 页面/Widget -> 实体 -> 存储

```text
pages / widgets / features
  -> entities/*/api/*Repository
  -> shared/storage/adapters/*
  -> shared/storage/indexedDb/*
  -> localStorage
```

### AI 调用链（在建增强）

```text
features/ai/reviewService
  -> shared/api/aiGateway
  -> shared/api/deepseekClient
  -> shared/api/httpClient
```

## 五、与迁移文档关系

本文件聚焦“当前稳定结构 + 迁移中的边界状态”。完整迁移步骤、完成度、风险项与待办事项请以
[docs/migration.md](/C:/Users/23343/.codex/worktrees/e580/quiz-react-app/docs/migration.md)
为准。
