# Quiz React App

一个基于 `Vite + React` 的个人模考与刷题项目，适合托管到 GitHub Pages。

当前项目定位很明确：

- 用 AI 把 PDF / DOCX 试卷清洗成 JSON
- 在网页中导入 JSON
- 继续完成刷题、模考、错题复习、收藏和历史回看

## 当前功能

- 本地题库导入
- 刷题模式
- 考试模式
- 自动保存与恢复进度
- 历史记录
- 错题本
- 收藏夹
- 多本地档案切换

## 当前生效架构

- 入口：[src/main.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\main.jsx)
- 路由：[src/router/AppRouter.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\router\AppRouter.jsx)
- 首页：[src/pages/DashboardSplitPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\DashboardSplitPage.jsx)
- 题库页：[src/pages/FileHubPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\FileHubPage.jsx)
- 刷题 / 模考页：[src/pages/SubjectWorkspacePage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\SubjectWorkspacePage.jsx)
- 历史页：[src/pages/HistoryPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\HistoryPage.jsx)
- 错题页：[src/pages/WrongBookPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\WrongBookPage.jsx)
- 收藏页：[src/pages/FavoritesPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\FavoritesPage.jsx)

## 数据边界

- 题库规范边界：[src/boundaries/quizSchema.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\quizSchema.js)
- 存储边界：[src/boundaries/storageFacade.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\storageFacade.js)

## JSON 规范

公开下载入口只保留一个：

- [public/json-schema.md](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\public\json-schema.md)

完整说明文档：

- [docs/json-schema.md](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\docs\json-schema.md)

当前公开规范支持：

- `single_choice`
- `multiple_choice`
- `true_false`
- `fill_blank`
- `reading`
- `cloze`
- `translation`
- `essay`

解析层仍兼容旧版 `items` 结构，避免已经导入过的本地题库失效。

## 本地数据

项目数据主要保存在浏览器本地：

- 题库
- 进度
- 历史记录
- 错题状态
- 收藏
- 偏好设置

其中：

- 业务数据主要使用 IndexedDB
- 少量偏好项使用 localStorage

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
npm test
```

构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 部署

当前 [vite.config.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\vite.config.js) 已配置相对 `base`，适合 GitHub Pages 这类静态托管环境。

## 测试

当前自动化测试主要覆盖边界层：

- [src/boundaries/quizSchema.test.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\quizSchema.test.js)
- [src/boundaries/storageFacade.test.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\storageFacade.test.js)
