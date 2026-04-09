# Quiz React App

一个基于 `Vite + React` 的本地题库与模考系统，主要面向个人使用和 GitHub Pages 静态部署。

## 当前主路径

当前推荐工作流已经切到：

1. 进入某个科目的题库页
2. 点击 `导入 PDF / DOCX`
3. 拖入试卷文件并选择科目
4. 查看解析进度与预览结果
5. 选择：
   - `保存到题库`
   - `立即开始练习`

`JSON` 导入仍然保留，但已经降级成 `高级导入（JSON）`，主要用于兼容旧题库、调试和手工维护结构化题目。

## 当前功能

- `PDF / DOCX` 直导入试卷
- `JSON` 高级导入
- AI 生成题目
- 刷题模式
- 考试模式
- 自动保存与恢复进度
- 历史记录
- 错题本
- 收藏夹
- 多本地档案切换
- AI 解释、AI 核题、AI 批改、AI 控制中心

## 当前结构

项目主结构已经稳定在下面这套分层上：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
  tests/
```

### 分层职责

- `app`
  - 应用入口、路由、全局 Provider、全局样式
- `pages`
  - 路由页与页面级组装
- `widgets`
  - 页面内复用视图组件
- `features`
  - 页面场景逻辑、状态编排、AI 交互、文件导入
- `entities`
  - 领域对象、题库标准化、repository、科目能力模型
- `shared`
  - 存储适配、API client、文档提取、基础设施
- `tests`
  - 页面级 smoke、主链回归、组件与服务测试

## 关键入口

- 应用入口：
  - [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- 路由入口：
  - [src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- 题库页主入口：
  - [src/pages/FileHubPage.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/pages/FileHubPage.jsx)
- 文件直导入状态机：
  - [src/features/document-import/model/useDocumentImport.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/document-import/model/useDocumentImport.js)
- 文件直导入服务：
  - [src/features/document-import/api/documentImportService.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/features/document-import/api/documentImportService.js)
- 文档提取层：
  - [src/shared/document/extractDocumentDraft.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/document/extractDocumentDraft.js)
- 题库导入主入口：
  - [src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- 科目能力模型：
  - [src/entities/subject/model/subjects.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjects.js)
  - [src/entities/subject/model/subjectCatalogV2.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalogV2.js)

## 文件直导入链路

当前已经落地的主链是：

```text
PDF / DOCX
  -> shared/document/*
  -> DocumentDraft
  -> documentImportService
  -> quizPipeline
  -> 导入预览
  -> 保存到题库 / 立即开始练习
```

### 具体职责

- `shared/document/*`
  - 负责读取文件、提取文本、构建 `DocumentDraft`
- `features/document-import/api/documentImportService.js`
  - 负责调用 AI、组织失败阶段、交给 `quizPipeline`
- `entities/quiz/lib/quizPipeline.js`
  - 负责 `parse -> validate -> normalize -> scoreBreakdown`
- `features/document-import/model/useDocumentImport.js`
  - 负责状态机、进度日志、预览、保存、开刷

### 门禁策略

- 如果文件提取不出足够文本，不会调用 AI
- 如果预览中存在阻断错误，不允许保存到题库
- `立即开始练习` 会复用同一次保存结果，不会重复保存第二次

## 科目能力模型

当前支持的科目由 [src/entities/subject/model/subjects.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjects.js) 和 [src/entities/subject/model/subjectCatalogV2.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalogV2.js) 统一描述。

当前已支持的科目：

- 英语
- 数据结构
- 数据库原理
- 国际贸易

科目模型承担：

- 路由元数据
- 题型子集
- AI 出题配置
- 文件直导入的科目选项
- 下载资料描述

## 数据访问边界

页面、widget、feature 不直接碰 `IndexedDB` 或 `localStorage` 细节，统一通过 repository 或偏好项仓库访问。

```text
pages / widgets / features
  -> entities/*/api/*Repository.js
    -> shared/storage/adapters/*
      -> shared/storage/indexedDb/*
      -> browser storage
```

偏好项通过：

```text
features / shared/api
  -> shared/lib/preferences/preferenceRepository.js
```

## AI 链路

```text
features/*
  -> shared/api/aiGateway.js
    -> shared/api/deepseekClient.js
      -> shared/api/httpClient.js
```

当前接入场景包括：

- AI 出题
- 文件直导入结构化解析
- AI 解释
- AI 核题
- 主观题批改
- AI 控制中心的调用统计

## 兼容层

以下入口仍然保留，但都属于兼容层或过渡层，不应再作为新功能主入口：

- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
- `高级导入（JSON）`

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
- [docs/direct-import-design.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/direct-import-design.md)
- [docs/direct-import-phase1.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/direct-import-phase1.md)
- [docs/current-architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/current-architecture.md)
- [docs/json-schema.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/json-schema.md)
