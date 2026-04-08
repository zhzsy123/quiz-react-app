# Architecture

本文描述当前仓库已经落地的真实结构，不写计划态。

## 当前分层

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

## 分层职责

### `app`

- 应用入口
- 路由注册
- 全局 Provider
- 全局样式

关键文件：

- [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- [src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- [src/app/providers/AppContext.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/providers/AppContext.jsx)

### `pages`

- 路由页
- 页面级布局与组合

当前页面：

- [DashboardSplitPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/DashboardSplitPage.jsx)
- [FileHubPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/FileHubPage.jsx)
- [SubjectWorkspacePage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/SubjectWorkspacePage.jsx)
- [HistoryPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/HistoryPage.jsx)
- [WrongBookPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/WrongBookPage.jsx)
- [FavoritesPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/FavoritesPage.jsx)

### `widgets`

- 页面内可复用视图组件
- 只负责展示和轻交互，不直接操作底层存储

当前关键 widgets：

- [src/widgets/quiz/CleanQuizView.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/widgets/quiz/CleanQuizView.jsx)
- [src/widgets/quiz-importer/QuizImporter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/widgets/quiz-importer/QuizImporter.jsx)

### `features`

- 页面场景逻辑
- 状态编排
- AI 交互编排

当前关键 feature：

- [src/features/dashboard](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/dashboard)
- [src/features/file-hub](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/file-hub)
- [src/features/workspace](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/workspace)
- [src/features/history](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/history)
- [src/features/wrong-book](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/wrong-book)
- [src/features/favorites](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/favorites)
- [src/features/ai](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/ai)

### `entities`

- 领域对象
- 题库标准化
- 科目能力模型
- repository

当前主入口：

- quiz pipeline: [src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- quiz 兼容入口: [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
- 科目能力模型: [src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js)

repository 主入口：

- [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
- [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
- [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
- [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
- [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
- [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)

### `shared`

- 存储适配器
- API client
- 偏好项仓库
- 基础设施

当前目录：

- [src/shared/api](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/api)
- [src/shared/lib/preferences](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/preferences)
- [src/shared/storage/adapters](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/adapters)
- [src/shared/storage/indexedDb](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/indexedDb)
- [src/shared/storage/compat](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat)

## 依赖方向

推荐依赖方向如下：

```text
app
  -> pages
    -> widgets
    -> features
      -> entities
        -> shared
```

数据访问主路径：

```text
pages / widgets / features
  -> entities/*/api/*Repository.js
    -> shared/storage/adapters/*
      -> shared/storage/indexedDb/*
```

偏好项路径：

```text
features / shared/api
  -> shared/lib/preferences/preferenceRepository.js
    -> shared/storage/adapters/browserStorageAdapter.js
      -> localStorage
```

AI 主路径：

```text
features/ai/reviewService.js
  -> shared/api/aiGateway.js
    -> shared/api/deepseekClient.js
      -> shared/api/httpClient.js
```

## 科目能力模型

科目能力和题型元数据统一放在 [src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js)。

当前承担的职责：

- 科目基础元数据
- 路由 slug
- 默认考试时长
- 期望总分
- 题型可用性
- 首页下载资料
- 错题本题型筛选标签

这意味着首页下载项、题型标签、错题本筛选项都应该从科目能力模型派生，不再在各页里写死。

## 兼容层

以下文件仍保留，但属于兼容层，不是主架构组成：

- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
- [src/entities/attempt/api/attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [src/entities/workspace/api/workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [src/entities/wrong-book/api/wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)

## 现状总结

- `pages` 已明显变薄，主要负责组合。
- `features` 承接场景逻辑，但工作区仍然是最重的 feature。
- `entities/quiz/lib` 已经拆成 `text / validation / normalize / scoring / pipeline`。
- `shared/api` 已经有统一入口，当前 provider 只有 DeepSeek。
- `legacyStorageFacade` 和 `quizSchema` 仍在，但都应该被视为过渡层。

