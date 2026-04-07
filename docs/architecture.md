# Architecture

以下文档描述当前代码的实际分层与职责边界。

## 一、当前主结构

当前项目已不是“`pages + boundaries` 作为唯一主结构”的设计。现有实际目录如下：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### 结构定位

- `app`  
  - 启动入口与运行时骨架：`main.jsx`
  - 路由：`router/AppRouter.jsx`
  - 全局上下文/Provider：`providers/AppContext.jsx`
  - 全局样式：`styles/*`

- `pages`  
  - 页面容器（容纳页面布局与状态连接）
  - 当前页面示例：`DashboardSplitPage`, `FileHubPage`, `SubjectWorkspacePage`, `HistoryPage`, `WrongBookPage`, `FavoritesPage`

- `widgets`  
  - 可复用 UI 组件  
  - 当前示例：`quiz/CleanQuizView`, `quiz-importer/QuizImporter`

- `features`  
  - 页面内业务逻辑、状态与交互协调（含 `model`）
  - 当前示例：`dashboard`, `workspace`, `history`, `wrong-book`, `favorites`, `file-hub`, `ai`

- `entities`  
  - 领域能力与基础模块
  - `quiz`：题目处理流水线与评分/解析/校验/文本标准化能力
  - `subject`：学科模型
  - 业务仓储：`attempt`, `history`, `favorite`, `wrong-book`, `wrongbook`, `library`, `profile`, `session`, `workspace`

- `shared`  
  - 通用能力与基础设施
  - `api`：`httpClient`, `aiGateway`, `deepseekClient`
  - `lib/preferences`: 偏好管理
  - `storage`: `adapters`, `indexedDb`, `compat`

## 二、entities / features / widgets 关系

### 1. `entities`（领域核心）

```text
entities/
  quiz/
    lib/
      text/
      validation/
      normalize/
      scoring/
      quizPipeline.js
      quizSchema.js
      paperId.js
  */api/*Repository.js
```

`entities/quiz/lib/` 提供了题库导入链路的基础处理函数，包括：

- `text/*`：文本到结构化数据解析与归一化预处理
- `validation/*`：payload 与 schema 校验
- `normalize/*`：通用题目结构标准化
- `scoring/*`：题目得分规则与统计
- `quizPipeline.js`：统一编排上述能力

### 2. `features`（业务编排）

每个 feature 负责页面内状态与交互（主要是 hook/状态模型）：

- `features/dashboard/model`, `features/workspace/model`, `features/history/model`, ...
- 与 `pages` 协作形成“页面状态 + 业务模型 + 组件”链条
- `features/ai/reviewService` 负责 AI 能力调用封装

### 3. `widgets`（展示组件）

- `widgets` 承担可复用展示与交互组件职责
- 当前核心入口示例 `quiz-importer`（导入入口）与 `quiz`（题目展示）
- 与 `features` 协同，避免直接跨层直接操作持久化细节

## 三、数据依赖流

### 页面与实体

```text
pages
  -> features/*/model
  -> entities/*/api/*Repository
  -> shared/storage/adapters/*
  -> shared/storage/indexedDb/* 或 browserStorageAdapter
```

### AI 调用链

```text
features/ai/reviewService
  -> shared/api/aiGateway
  -> shared/api/deepseekClient
  -> shared/api/httpClient
```

### 偏好配置流

```text
features/*
  -> shared/lib/preferences/preferenceRepository
  -> shared/storage/adapters/browserStorageAdapter
  -> localStorage
```

### 兼容层

```text
features/*
  -> shared/storage/compat/legacyStorageFacade
  -> shared/lib/storage/storageFacade
  -> shared/storage/indexedDb/*
```

## 四、当前架构状态（已落地）

- 已完成：`app`, `pages`, `widgets`, `features`, `entities`, `shared` 分层落地
- 已完成：实体层将题库核心流水线集中到 `entities/quiz/lib/quizPipeline` 周边
- 进行中：文档与链接逐步从历史旧结构中清理（如旧绝对路径引用）
- 风险点：部分命名历史遗留（如 `wrong-book` 与 `wrongbook` 并存）需持续关注一致性
- 进行中：`features -> AppContext` 与业务层数据链的进一步收敛优化

## 五、仓储能力覆盖

已见仓储实现示例（含别名/re-export）：

- `profileRepository`
- `libraryRepository`
- `historyRepository`
- `favoriteRepository`
- `wrongbookRepository`
- `sessionRepository`
- `attemptRepository`、`workspaceSessionRepository`、`wrongBookRepository`（兼容入口）

## 六、迁移说明

`docs/migration.md` 记录旧结构（含 `boundaries`）到现结构的迁移状态与待办，作为本文件的配套文档。
