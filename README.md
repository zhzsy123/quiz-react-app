# Quiz React App

一个基于 `Vite + React` 的个人题库 / 模考项目，当前定位是：

- 先用 AI 把 `PDF / DOCX` 试卷整理成 JSON
- 再把 JSON 导入站点
- 在本地完成刷题、模考、历史回看、错题复习和收藏

项目当前可直接静态托管到 GitHub Pages，业务数据主要保存在浏览器本地。

## 当前功能

- 本地题库导入
- 刷题模式
- 考试模式
- 自动保存与恢复进度
- 历史记录
- 错题本
- 收藏夹
- 多本地档案切换
- AI 解释 / AI 批改 / AI 核题

## 当前实际架构

项目已经从旧的“页面 + boundary”结构迁移到分层结构，当前生效目录如下：

```text
src/
  app/
    main.jsx
    router/
    providers/
    styles/
  pages/
    DashboardSplitPage.jsx
    FileHubPage.jsx
    SubjectWorkspacePage.jsx
    HistoryPage.jsx
    WrongBookPage.jsx
    FavoritesPage.jsx
  widgets/
    quiz/
    quiz-importer/
  features/
    ai/
    dashboard/
    file-hub/
    workspace/
    history/
    wrong-book/
    favorites/
  entities/
    quiz/
    subject/
    profile/
    library/
    attempt/
    favorite/
    wrong-book/
    workspace/
  shared/
    api/
    lib/
    storage/
```

当前入口和关键边界：

- 运行入口：`src/app/main.jsx`
- 路由入口：`src/app/router/AppRouter.jsx`
- 页面层：`src/pages/*`
- 题库导入 pipeline：`src/entities/quiz/lib/quizPipeline.js`
- 题型归一化：`src/entities/quiz/lib/quizSchema.js`
- repository 层：`src/entities/*/api/*.js`
- 存储适配层：`src/shared/storage/adapters/*`
- API 适配层：`src/shared/api/*`

`src/shared/lib/storage/storageFacade.js` 仍然保留，但现在是兼容层，不再是推荐的一线调用入口。

## 分层说明

- `app`
  - 应用级入口、路由、Provider、全局样式
- `pages`
  - 路由页面，只负责页面组装
- `widgets`
  - 页面级可复用 UI 组件，例如做题视图、导入器
- `features`
  - 业务场景逻辑与页面状态，例如首页状态、题库页状态、做题流程、AI 调用编排
- `entities`
  - 领域对象、题库处理、repository 抽象、科目配置
- `shared`
  - 通用 API、偏好项、存储 adapter、IndexedDB 基础设施

## 题库导入链路

当前导入流程已经固定为：

1. 读取文件文本
2. `parseQuizJsonText`
3. `validateQuizPayload`
4. `normalizeQuizDocument`
5. 进入业务层和题库仓储

对应代码：

- `src/entities/quiz/lib/quizPipeline.js`
- `src/entities/quiz/lib/quizSchema.js`

兼容情况：

- 继续兼容旧版 `items` 结构
- 继续兼容当前 JSON 规范

## 本地数据

当前数据存储方式：

- 业务数据：IndexedDB
- 少量偏好项与 API 配置：localStorage

当前边界：

- adapter：`src/shared/storage/adapters/*`
- repository：`src/entities/*/api/*.js`

页面和 feature 不再直接依赖 IndexedDB store 文件。

## AI 调用

当前 `shared/api` 已经落地为可扩展层：

- 通用请求：`src/shared/api/httpClient.js`
- AI 网关：`src/shared/api/aiGateway.js`
- DeepSeek provider：`src/shared/api/deepseekClient.js`

目前真实接入的 provider 只有 DeepSeek，但 feature 侧已经不直接依赖具体 fetch 细节。

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

## 部署

项目当前仍以静态托管为前提，`vite.config.js` 已配置相对 `base`，可用于 GitHub Pages。

## 文档

- 架构说明：`docs/architecture.md`
- 迁移状态：`docs/migration.md`
- JSON 规范：`docs/json-schema.md`
- 对外下载版 JSON 规范：`public/json-schema.md`
