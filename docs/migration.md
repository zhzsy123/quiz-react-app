# Migration Status

本文档记录的是当前仓库从旧结构迁移到分层结构的实际完成状态。

## 旧结构回顾

旧结构的主要特点：

- 入口集中在 `src/main.jsx`
- 路由集中在 `src/router/AppRouter.jsx`
- 页面逻辑大量堆在 `src/pages/*`
- 题库与存储边界集中在 `src/boundaries/*`
- 页面或过程式工具函数会比较直接地碰 IndexedDB / localStorage

这个结构能工作，但随着题型、AI 功能、题库管理和错题链路逐渐变多，页面会越来越重，技术边界也会越来越模糊。

## 当前结构

当前已经迁到：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

## 迁移阶段状态

### Phase 1

状态：已完成

本阶段完成：

- 目录迁移到 `app / pages / widgets / features / entities / shared`
- 修复入口和 import
- 不改行为

当前结果：

- 旧的 `src/router` 不再是主入口
- 当前入口为 [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)

### Phase 2

状态：已完成

本阶段完成：

- 页面瘦身
- 页面级业务逻辑下沉到 `features/*/model`

当前结果：

- `DashboardSplitPage`
- `FileHubPage`
- `SubjectWorkspacePage`
- `HistoryPage`
- `WrongBookPage`
- `FavoritesPage`

都已经转成“页面负责组装，业务逻辑主要在 feature hook”。

### Phase 3

状态：已完成

本阶段完成：

- 建立 `shared/storage/adapters`
- 建立 repository 主路径
- feature / page 不再直接碰 IndexedDB store 文件和 localStorage 细节

当前主 repository：

- [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
- [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
- [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
- [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
- [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
- [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)

### Phase 4

状态：已完成

本阶段完成：

- 建立 quiz validate / normalize 流程
- 所有导入数据先标准化，再进入业务层

当前结果：

- quiz 主入口为 [quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- 导入流程固定为：
  - `parseQuizJsonText`
  - `validateQuizPayload`
  - `normalizeQuizDocument`
  - `getQuizScoreBreakdown`
- 旧 `items` 兼容仍保留

### Phase 5

状态：已完成

本阶段完成：

- 建立 `shared/api`
- 抽出 `httpClient`
- 抽出 `aiGateway`
- 将 DeepSeek provider 纳入统一 API 路径

当前结果：

- `features/ai/reviewService.js` 不再直接依赖 fetch 细节
- 当前 provider 只有 DeepSeek，但结构上已经可继续扩展

## 本轮“清爽重构”已完成内容

这轮不是推翻重来，而是在已有 Phase 1-5 基础上继续收口旧语义。

### 1. `quizSchema.js` 继续变薄

当前 `entities/quiz/lib` 已按职责拆分为：

- `text/*`
- `validation/*`
- `normalize/*`
- `scoring/*`
- `quizPipeline.js`
- `quizSchema.js`

其中：

- `quizPipeline.js` 是主入口
- `quizSchema.js` 只是兼容入口

### 2. `storageFacade` 已降级为兼容层语义

当前状态：

- 主兼容层：[src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- 桥接文件：[src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)

语义已经明确：

- `legacyStorageFacade` 是兼容层
- 禁止新代码依赖
- 仅用于旧测试和过渡期旧链路

### 3. 主路径已开始改走新 repository

当前主路径已经切换到：

- `profileRepository`
- `libraryRepository`
- `historyRepository`
- `favoriteRepository`
- `wrongbookRepository`
- `sessionRepository`

对应主业务链路已经切换：

- 首页统计
- 历史记录
- 错题本
- 工作区进度
- 交卷入历史
- 错题写入

### 4. 旧命名 repository 仍保留兼容壳

这些文件还在，但只是兼容 re-export：

- [attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)

## 当前仍保留的旧依赖

以下旧依赖仍存在，但都不是主路径：

1. `src/entities/quiz/lib/quizSchema.js`
   - 兼容入口
   - 旧测试仍会直接调用

2. `src/shared/storage/compat/legacyStorageFacade.js`
   - 兼容层
   - 旧测试仍会直接调用

3. `src/shared/lib/storage/storageFacade.js`
   - 旧路径桥接

4. 旧命名 repository re-export
   - `attemptRepository`
   - `workspaceSessionRepository`
   - `wrongBookRepository`

## 当前已经完成主路径切换的部分

- quiz 导入与标准化：`quizPipeline`
- 题库分值统计：`scoring/*`
- 页面主数据访问：`entities/*/api/*Repository.js`
- 偏好项访问：`preferenceRepository`
- AI provider 调用：`shared/api`

## 后续还可继续收口的部分

1. 继续缩小 `quizSchema.js`
   - 让更多旧测试改走 `quizPipeline` 和子模块

2. 逐步退役 `storageFacade` 桥接文件
   - 等旧测试和旧链路全部迁完后再删除

3. 逐步退役旧命名 repository re-export
   - 统一到 `historyRepository / sessionRepository / wrongbookRepository`

4. 继续降低 `features -> AppContext` 的耦合
   - 让活动档案等上下文读取进一步域化
