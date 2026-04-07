# Architecture

本文档描述的是当前仓库已经落地的真实结构，不是目标结构草案。

## 当前目录分层

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### 1. `app`

职责：

- 应用入口
- 路由注册
- 全局 Provider
- 全局样式

当前文件：

- `src/app/main.jsx`
- `src/app/router/AppRouter.jsx`
- `src/app/providers/AppContext.jsx`
- `src/app/styles/*`

### 2. `pages`

职责：

- 路由页面
- 页面布局与页面级组合

当前页面：

- `DashboardSplitPage.jsx`
- `FileHubPage.jsx`
- `SubjectWorkspacePage.jsx`
- `HistoryPage.jsx`
- `WrongBookPage.jsx`
- `FavoritesPage.jsx`

当前状态：

- 页面层已经在 Phase 2 变薄
- 主要业务状态已经下沉到 `features/*/model`

### 3. `widgets`

职责：

- 页面内复用的视图组件
- 不直接持有复杂持久化职责

当前组件：

- `src/widgets/quiz/CleanQuizView.jsx`
- `src/widgets/quiz-importer/QuizImporter.jsx`

### 4. `features`

职责：

- 页面场景逻辑
- 页面状态管理
- AI 调用编排

当前已落地 feature：

- `features/dashboard`
- `features/file-hub`
- `features/workspace`
- `features/history`
- `features/wrong-book`
- `features/favorites`
- `features/ai`

当前状态：

- `features/*/model` 中承载页面级逻辑
- `features/ai/reviewService.js` 负责 AI 批改、解释、核题、同类题生成

### 5. `entities`

职责：

- 领域对象
- 题库处理
- repository 抽象
- 科目配置

当前已落地：

- `entities/quiz/lib`
  - `quizSchema.js`
  - `quizPipeline.js`
  - `paperId.js`
- `entities/subject/model/subjects.js`
- `entities/profile/api/profileRepository.js`
- `entities/library/api/libraryRepository.js`
- `entities/attempt/api/attemptRepository.js`
- `entities/favorite/api/favoriteRepository.js`
- `entities/wrong-book/api/wrongBookRepository.js`
- `entities/workspace/api/workspaceSessionRepository.js`

### 6. `shared`

职责：

- 技术基础设施
- API client
- 偏好项访问
- 存储 adapter
- IndexedDB 基础实现

当前已落地：

- `shared/api/httpClient.js`
- `shared/api/aiGateway.js`
- `shared/api/deepseekClient.js`
- `shared/lib/preferences/preferenceRepository.js`
- `shared/storage/adapters/*`
- `shared/storage/indexedDb/*`

兼容层：

- `shared/lib/storage/storageFacade.js`

它仍然存在，但现在主要用于兼容旧测试和旧调用，不是新代码的一线入口。

## 当前依赖方向

当前推荐依赖方向：

```text
app
  -> pages
    -> widgets
    -> features
      -> entities
        -> shared
```

当前真实代码里还存在一个保留耦合点：

- `features/*` 会通过 `useAppContext()` 读取当前激活档案

这意味着 `features -> app/providers` 仍然存在轻度依赖。它没有破坏运行，但说明依赖方向还没有完全收敛成纯单向结构。

## 当前导入与标准化链路

题库导入的实际流程已经固定为：

1. `parseQuizJsonText`
2. `validateQuizPayload`
3. `normalizeQuizDocument`
4. `buildQuizDocumentFromText`
5. 进入题库仓储或工作区

代码位置：

- `src/entities/quiz/lib/quizPipeline.js`

说明：

- `quizPipeline.js` 负责流程编排
- `quizSchema.js` 仍然负责题型级归一化和兼容转换

## 当前存储边界

当前存储访问链路：

```text
features / app
  -> entities/*/api repository
    -> shared/storage/adapters
      -> shared/storage/indexedDb
```

偏好项链路：

```text
features / shared/api
  -> shared/lib/preferences/preferenceRepository
    -> shared/storage/adapters/browserStorageAdapter
      -> localStorage
```

这意味着页面和 feature 已经不直接碰 IndexedDB store 文件和 `localStorage` API。

## 当前 API 边界

当前 API 调用链路：

```text
features/ai/reviewService
  -> shared/api/aiGateway
    -> shared/api/deepseekClient
      -> shared/api/httpClient
        -> fetch
```

说明：

- `shared/api` 已经具备统一入口和 provider 分发能力
- 当前唯一真实 provider 是 DeepSeek
- 还没有接真实后端服务

## 当前仍然未完成的部分

以下内容已经明确是“还没完成”，不是当前架构已经解决的事情：

- `quizSchema.js` 仍然偏重，题型归一化尚未继续拆小
- `storageFacade.js` 仍然保留为兼容层
- `features` 对 `AppContext` 仍有轻度依赖
- `shared/api` 只完成了前端内的 provider gateway，还没有后端 API
