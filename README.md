# Quiz React App

一个基于 `Vite + React` 的本地题库与模考系统，主要面向个人使用和 GitHub Pages 静态部署。

当前工作流是：

1. 用 AI 把 `PDF / DOCX` 试卷清洗成 JSON。
2. 按科目导入题库。
3. 在本站完成刷题、模考、历史回看、错题复习、收藏管理和 AI 辅助。

## 当前功能

- 本地题库导入
- 刷题模式
- 考试模式
- 自动保存与恢复进度
- 历史记录
- 错题本
- 收藏夹
- 多本地档案切换
- AI 解释、AI 核题、AI 同类题

## 当前结构

项目已经落到下面这套分层，不再是旧的单层页面结构：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### 分层职责

- `app`
  - 应用入口、路由、全局 Provider、全局样式
- `pages`
  - 路由页与页面级组装
- `widgets`
  - 页面内可复用视图组件
- `features`
  - 页面场景逻辑、状态编排、AI 交互
- `entities`
  - 领域对象、题库标准化、repository、科目能力模型
- `shared`
  - 存储适配、API client、偏好项、基础设施

## 关键入口

- 应用入口: [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- 路由入口: [src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- 题库导入主入口: [src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- 科目能力模型: [src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js)
- repository 主入口:
  - [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
  - [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
  - [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
  - [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
  - [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
  - [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)

## 科目能力模型

当前支持的科目由 [src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js) 统一描述，首页下载项、错题本题型筛选、科目元数据都从这里派生。

当前已支持的科目：

- 英语
- 数据结构
- 数据库原理
- 国际贸易

## 题库导入链路

题库导入与标准化主入口是 [quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)。

固定顺序：

1. `parseQuizJsonText`
2. `validateQuizPayload`
3. `normalizeQuizDocument`
4. `getQuizScoreBreakdown`

`quizSchema.js` 仍然存在，但只作为兼容入口，不再是新业务代码的主调用点。

## 数据访问边界

页面、widget、feature 不直接碰 `IndexedDB` 或 `localStorage` 细节，统一通过 repository 或偏好项仓库访问。

```text
pages / widgets / features
  -> entities/*/api/*Repository.js
    -> shared/storage/adapters/*
      -> shared/storage/indexedDb/*
      -> shared/storage/browserStorageAdapter
```

偏好项通过：

```text
features / shared/api
  -> shared/lib/preferences/preferenceRepository.js
```

## AI 链路

```text
features/ai/reviewService.js
  -> shared/api/aiGateway.js
    -> shared/api/deepseekClient.js
      -> shared/api/httpClient.js
```

目前只有 DeepSeek provider，但 `shared/api` 已经预留了未来接入其他 provider 或远端后端的入口。

## 兼容层

以下文件仍然保留，但都属于兼容层，不应再作为新功能主入口：

- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
- [src/entities/attempt/api/attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [src/entities/workspace/api/workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [src/entities/wrong-book/api/wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)

## 开发命令

```bash
npm install
npm run dev
npm test -- --run
npm run build
npm run preview
```

## 文档

- [docs/architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/architecture.md)
- [docs/migration.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/migration.md)
- [docs/current-architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/current-architecture.md)
- [docs/json-schema.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/json-schema.md)
- [docs/quiz-model-ds-db.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/quiz-model-ds-db.md)

