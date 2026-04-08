# Current Architecture

当前有效架构说明以以下文档为准：

- [architecture.md](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\docs\architecture.md)
- [migration.md](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\docs\migration.md)

补充说明：

1. 当前主结构为 `app / pages / widgets / features / entities / shared`
2. quiz 导入主入口是 [quizPipeline.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\entities\quiz\lib\quizPipeline.js)
3. 导入链路稳定顺序为：
- parse
- validate
- normalize
- scoreBreakdown
4. 旧 `items` 题库仍需兼容
5. 新 `questions` 题库是后续新增内容的主入口
6. DS/DB 题型扩展采用：
- 复用现有通用题型
- 仅新增 `composite`
7. `storageFacade` 当前仍是兼容层：
- [legacyStorageFacade.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\shared\storage\compat\legacyStorageFacade.js)
- [storageFacade.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\shared\lib\storage\storageFacade.js)
