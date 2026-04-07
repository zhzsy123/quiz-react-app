# Quiz React App

一个基于 `Vite + React` 的本地题库 / 模考项目。当前定位是：

- 先用 AI 把 `PDF / DOCX` 试卷整理成 JSON
- 再把 JSON 导入站点
- 在本地完成刷题、模考、历史回看、错题复习、收藏与 AI 辅助学习

项目当前仍以 GitHub Pages 静态托管为前提。业务数据主要保存在浏览器本地：题库与记录走 IndexedDB，少量偏好项走 localStorage。

## 当前功能

- 本地题库导入
- 刷题模式
- 考试模式
- 自动保存与恢复进度
- 历史记录
- 错题本
- 收藏夹
- 多本地档案切换
- AI 解释 / AI 批改 / AI 核题 / AI 同类题

## 当前真实结构

当前生效结构已经不是旧的 `src/router + src/pages + src/boundaries` 单层调用方式，而是分层目录：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

关键入口与主路径：

- 应用入口：[src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- 路由入口：[src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- 页面层：[src/pages](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages)
- 题库导入主入口：[src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- repository 主入口：
  - [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
  - [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
  - [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
  - [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
  - [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
  - [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)
- 存储适配层：[src/shared/storage/adapters](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/adapters)
- API 层：[src/shared/api](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/api)

### 分层职责

- `app`
  - 应用入口、路由、Provider、全局样式
- `pages`
  - 路由页面与页面组装
- `widgets`
  - 页面级复用视图组件
- `features`
  - 页面场景逻辑、状态编排、AI 交互编排
- `entities`
  - 领域对象、题库处理、repository
- `shared`
  - 存储 adapter、API client、通用偏好项与基础设施

## 题库导入主链路

当前题库导入与标准化的主入口是 [quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)。主流程为：

1. `parseQuizJsonText`
2. `validateQuizPayload`
3. `normalizeQuizDocument`
4. `getQuizScoreBreakdown`
5. 进入题库存储与工作区

`quizSchema.js` 仍然存在，但现在只是兼容入口，不再是新业务代码的主调用点。它保留给旧测试和过渡期兼容调用。

### quiz lib 当前拆分

- 文本清洗：[text/normalizeQuizText.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/text/normalizeQuizText.js)
- JSON 解析：[text/parseQuizJsonText.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/text/parseQuizJsonText.js)
- payload 校验：[validation/validateQuizPayload.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/validation/validateQuizPayload.js)
- 题型归一化分发：[normalize/normalizeQuizPayload.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/normalize/normalizeQuizPayload.js)
- 分值统计：[scoring/getQuizScoreBreakdown.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/scoring/getQuizScoreBreakdown.js)
- 兼容入口：[quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)

## 数据访问边界

页面、widget、feature 不应直接触碰 IndexedDB 或 localStorage 细节。当前主访问路径是：

```text
pages / widgets / features
  -> entities/*/api/*Repository.js
    -> shared/storage/adapters/*
      -> shared/storage/indexedDb/* 或 browserStorageAdapter
```

偏好项路径：

```text
features / shared/api
  -> shared/lib/preferences/preferenceRepository.js
    -> shared/storage/adapters/browserStorageAdapter.js
      -> localStorage
```

## 兼容层说明

以下文件仍保留，但都不是主架构入口：

- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
  - 兼容入口，禁止新业务代码继续把它当主调用点
- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
  - 旧存储门面兼容层，仅用于旧链路与旧测试
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
  - 指向 `legacyStorageFacade` 的桥接文件，禁止新代码依赖
- [src/entities/attempt/api/attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [src/entities/workspace/api/workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [src/entities/wrong-book/api/wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)
  - 以上三个都是旧命名兼容 re-export，新代码应使用 `historyRepository / sessionRepository / wrongbookRepository`

## AI 层

当前 API 主路径：

```text
features/ai/reviewService
  -> shared/api/aiGateway
    -> shared/api/deepseekClient
      -> shared/api/httpClient
```

当前只有 DeepSeek provider，但结构上已经为未来 remote / api implementation 预留了统一入口。

## 开发命令

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

运行测试：

```bash
npm test -- --run
```

生产构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 文档

- 架构说明：[docs/architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/architecture.md)
- 迁移状态：[docs/migration.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/migration.md)
- 当前架构索引：[docs/current-architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/current-architecture.md)
- JSON 规范：[docs/json-schema.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/json-schema.md)
- 对外下载版 JSON 规范：[public/json-schema.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/public/json-schema.md)
