# Current Architecture

当前有效架构说明请以以下文档为准：

- [docs/architecture.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/architecture.md)
- [docs/migration.md](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/docs/migration.md)

补充说明：

- 当前主结构是 `app / pages / widgets / features / entities / shared`
- quiz 主入口是 [src/entities/quiz/lib/quizPipeline.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/entities/quiz/lib/quizPipeline.js)
- `quizSchema.js` 只是兼容入口
- 旧 `storageFacade` 已降级为兼容层：
  - [src/shared/storage/compat/legacyStorageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/storage/compat/legacyStorageFacade.js)
  - [src/shared/lib/storage/storageFacade.js](E:/VorinsFile/BaiduSyncdisk/Github项目/quiz-react-app/src/shared/lib/storage/storageFacade.js)
