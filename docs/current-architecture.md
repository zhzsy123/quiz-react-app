# Current Architecture

当前仓库的主入口、主结构和兼容边界如下：

- 主结构：`src/app / src/pages / src/widgets / src/features / src/entities / src/shared`
- 应用入口：[src/app/main.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/main.jsx)
- 路由入口：[src/app/router/AppRouter.jsx](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/app/router/AppRouter.jsx)
- quiz 导入主入口：[src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- 科目能力模型：[src/entities/subject/model/subjectCatalog.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/subject/model/subjectCatalog.js)

当前最重要的依赖关系：

```text
app -> pages -> widgets -> features -> entities -> shared
```

当前保留的兼容层：

- `src/entities/quiz/lib/quizSchema.js`
- `src/shared/storage/compat/legacyStorageFacade.js`
- `src/shared/lib/storage/storageFacade.js`
- `src/entities/attempt/api/attemptRepository.js`
- `src/entities/workspace/api/workspaceSessionRepository.js`
- `src/entities/wrong-book/api/wrongBookRepository.js`

当前可用的科目元数据和题型元数据都从 subject catalog 派生，不再在页面里写死。

