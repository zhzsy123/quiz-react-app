# Architecture

本文档描述的是当前仓库已经落地的真实结构，不是计划态草案。

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

职责：

- 应用入口
- 路由注册
- 全局 Provider
- 全局样式

当前关键文件：

- [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- [src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- [src/app/providers/AppContext.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/providers/AppContext.jsx)
- [src/app/styles](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/styles)

### `pages`

职责：

- 路由页面
- 页面布局与页面级组装

当前页面：

- [DashboardSplitPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/DashboardSplitPage.jsx)
- [FileHubPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/FileHubPage.jsx)
- [SubjectWorkspacePage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/SubjectWorkspacePage.jsx)
- [HistoryPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/HistoryPage.jsx)
- [WrongBookPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/WrongBookPage.jsx)
- [FavoritesPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/FavoritesPage.jsx)

当前状态：

- `pages` 已经比旧结构更薄
- 页面业务逻辑主要下沉到了 `features/*/model`

### `widgets`

职责：

- 页面内可复用视图组件
- 只承载展示与轻交互，不直接承担存储基础设施职责

当前 widgets：

- [src/widgets/quiz/CleanQuizView.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/widgets/quiz/CleanQuizView.jsx)
- [src/widgets/quiz-importer/QuizImporter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/widgets/quiz-importer/QuizImporter.jsx)

### `features`

职责：

- 页面场景逻辑
- 页面状态编排
- 业务动作组合
- AI 交互编排

当前 feature：

- [src/features/dashboard](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/dashboard)
- [src/features/file-hub](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/file-hub)
- [src/features/workspace](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/workspace)
- [src/features/history](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/history)
- [src/features/wrong-book](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/wrong-book)
- [src/features/favorites](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/favorites)
- [src/features/ai](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/ai)

### `entities`

职责：

- 领域对象
- 题库标准化与题型归一化
- repository 抽象
- 科目元数据

当前主入口：

- quiz 主入口：[src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- subject 元数据：[src/entities/subject/model/subjects.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjects.js)
- repositories：
  - [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
  - [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
  - [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
  - [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
  - [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
  - [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)

#### quiz lib 当前结构

```text
src/entities/quiz/lib/
  text/
  validation/
  normalize/
  scoring/
  quizPipeline.js
  quizSchema.js
  paperId.js
```

职责拆分：

- `text/*`
  - 文本清洗与 JSON 文本解析
- `validation/*`
  - payload 校验
- `normalize/*`
  - 题型归一化分发、兼容处理、各题型 normalizer
- `scoring/*`
  - 分值配置与分值统计
- `quizPipeline.js`
  - quiz 导入与标准化主入口
- `quizSchema.js`
  - 兼容入口，不再是新业务代码主入口

### `shared`

职责：

- 存储 adapter
- API client
- 偏好项访问
- IndexedDB 基础设施

当前关键目录：

- [src/shared/api](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/api)
- [src/shared/lib/preferences](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/preferences)
- [src/shared/storage/adapters](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/adapters)
- [src/shared/storage/indexedDb](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/indexedDb)
- [src/shared/storage/compat](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat)

## 当前依赖方向

推荐依赖方向：

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

偏好项主路径：

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

## 当前主路径已经切换的部分

以下能力已经不再以旧 `storageFacade` 为主路径：

- 档案访问：`profileRepository`
- 题库访问：`libraryRepository`
- 历史记录：`historyRepository`
- 收藏：`favoriteRepository`
- 错题本：`wrongbookRepository`
- 工作区进度：`sessionRepository`
- 题库导入与标准化：`quizPipeline`

## 当前仍保留的兼容层

这些文件仍然存在，但都不属于主架构组成：

- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
  - 旧存储门面兼容层
  - 仅用于过渡期旧链路与旧测试
  - 禁止新代码依赖
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
  - 指向 `legacyStorageFacade` 的桥接文件
  - 仅用于旧路径兼容
- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
  - 兼容入口
  - 新代码应改走 `quizPipeline.js` 与子模块
- [src/entities/attempt/api/attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [src/entities/workspace/api/workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [src/entities/wrong-book/api/wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)
  - 以上三个都是旧命名兼容 re-export

## 当前仍未完全收口的地方

- `features` 仍会通过 `useAppContext()` 读取当前活动档案，说明 `app -> features` 之间仍有轻度耦合
- `quizSchema.js` 虽然已经明显变薄，但仍保留兼容入口职责
- `legacyStorageFacade` 仍需继续存在一段时间，以保障旧测试和旧链路不被粗暴打断
- `shared/api` 目前只有 DeepSeek provider，没有真实后端实现
