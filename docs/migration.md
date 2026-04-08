# Migration Status

本文记录从旧结构迁移到当前分层结构的真实状态。

## 旧结构回顾

旧结构的核心特征是：

- 入口集中在 `src/main.jsx`
- 路由集中在 `src/router/AppRouter.jsx`
- 页面逻辑大量堆在 `src/pages/*`
- 存储和题库边界集中在 `src/boundaries/*`
- 页面或工具函数直接访问 IndexedDB / localStorage

这套结构能跑，但随着题型、AI 能力、错题链路和题库导入复杂度上升，已经不再适合作为主架构。

## 当前结构

当前仓库的主结构已经迁移到：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

## 迁移阶段

### Phase 1

状态：已完成

完成内容：

- 目录迁移到 `app / pages / widgets / features / entities / shared`
- 修复 import
- 不改行为

当前结果：

- 旧 `src/router` 不再是主入口
- 当前应用入口是 [src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)

### Phase 2

状态：已完成

完成内容：

- 页面变薄
- 页面级业务逻辑下沉到 `features/*/model`

当前结果：

- `DashboardSplitPage`
- `FileHubPage`
- `SubjectWorkspacePage`
- `HistoryPage`
- `WrongBookPage`
- `FavoritesPage`

都已经转成“页面负责组装，业务逻辑在 feature hook 中”的形态。

### Phase 3

状态：已完成

完成内容：

- 建立 `shared/storage/adapters`
- 建立 repository 主路径
- 页面 / feature 不再直接碰 IndexedDB store 文件或 localStorage 细节

当前主 repository：

- [profileRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/profile/api/profileRepository.js)
- [libraryRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/library/api/libraryRepository.js)
- [historyRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/history/api/historyRepository.js)
- [favoriteRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/favorite/api/favoriteRepository.js)
- [wrongbookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrongbook/api/wrongbookRepository.js)
- [sessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/session/api/sessionRepository.js)

### Phase 4

状态：已完成

完成内容：

- 建立 quiz validate / normalize 流程
- 导入数据先标准化，再进入业务层

当前结果：

- quiz 主入口是 [quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- 导入链路固定为：
  - `parseQuizJsonText`
  - `validateQuizPayload`
  - `normalizeQuizDocument`
  - `getQuizScoreBreakdown`
- 旧 `items` 仍保留兼容

### Phase 5

状态：已完成

完成内容：

- 建立 `shared/api`
- 抽出 `httpClient`
- 抽出 `aiGateway`
- 将 DeepSeek provider 纳入统一入口

当前结果：

- `features/ai/reviewService.js` 不再直接面对底层 fetch 细节
- `shared/api` 已经为未来 remote / api implementation 预留统一入口

## 当前清爽重构

这轮重构的目标不是推翻，而是继续收口旧语义。

### 1. `quizSchema.js` 继续变薄

当前状态：

- `src/entities/quiz/lib/quizPipeline.js` 是主入口
- `src/entities/quiz/lib/quizSchema.js` 只是兼容入口
- 新业务代码应优先走 `quizPipeline`

### 2. `legacyStorageFacade` 只是兼容层

当前状态：

- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)

语义已经明确：

- 这是过渡兼容层
- 禁止新代码把它当主入口
- 只为旧链路和旧测试保留

### 3. 主路径改走 repository

当前主路径已经切换到：

- `profileRepository`
- `libraryRepository`
- `historyRepository`
- `favoriteRepository`
- `wrongbookRepository`
- `sessionRepository`

### 4. 科目能力模型集中化

当前科目能力模型统一放在：

- [src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js)

它承担：

- 科目元数据
- 题型元数据
- 首页下载项
- 错题本题型筛选

## 仍然保留的兼容入口

这些文件还在，但只作为兼容壳存在：

- [src/entities/quiz/lib/quizSchema.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizSchema.js)
- [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
- [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
- [src/entities/attempt/api/attemptRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/attempt/api/attemptRepository.js)
- [src/entities/workspace/api/workspaceSessionRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/workspace/api/workspaceSessionRepository.js)
- [src/entities/wrong-book/api/wrongBookRepository.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/wrong-book/api/wrongBookRepository.js)

## 仍未完全收口的部分

- `features/workspace` 仍然是最重的 feature
- `widgets/quiz/CleanQuizView.jsx` 仍然是最大的视图组件
- `legacyStorageFacade` 还要继续保留一段过渡期
- `quizSchema.js` 还需要继续瘦身

