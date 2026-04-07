# Quiz React App

一个基于 `Vite + React` 的本地题库刷题与考试应用，当前主要面向个人使用场景，适合托管到 GitHub Pages 这类静态网站。

项目目前已经形成完整闭环：

- 本地导入 JSON 题库
- 自动归一化旧版 / 新版 schema
- 本地题库管理
- 刷题模式与考试模式
- 历史记录、错题本、收藏夹
- 多本地档案切换
- GitHub Pages 静态部署

## 项目定位

这个项目不是在线判卷平台，也不是多人协作系统，而是一个偏个人使用的本地学习工具。

核心思路是：

- 题库文件由你自己维护
- 网站负责导入、练习、记录、整理错题
- 数据默认保存在浏览器本地
- 页面以静态站点方式部署，方便长期托管

## 当前功能

### 1. 题库导入

- 支持导入本地 `JSON` / `TXT`
- 支持 Markdown fenced code block 中包裹的 JSON
- 支持旧版 `items` 结构
- 支持新版 `schema v1` 的 `questions` 结构
- 导入时会进行 schema normalize，并给出兼容提示

### 2. 本地题库管理

- 按科目管理题库
- 自动保存到本地题库库
- 支持重命名、打标签、删除
- 支持按标题 / 标签 / schema 版本搜索

### 3. 做题工作区

- 支持刷题模式
- 支持考试模式
- 支持自动保存进度
- 支持恢复上次进度
- 支持自动跳题、暂停、计时
- 支持主观题录入

### 4. 学习闭环

- 历史考试记录
- 错题本
- 收藏夹
- 本地档案切换

## 当前生效架构

当前项目已经清理过历史版本文件，只有一套生效架构：

- 入口文件：[src/main.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\main.jsx)
- 主路由：[src/router/AppRouter.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\router\AppRouter.jsx)
- 当前页面：
  - [src/pages/DashboardSplitPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\DashboardSplitPage.jsx)
  - [src/pages/FileHubPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\FileHubPage.jsx)
  - [src/pages/SubjectWorkspacePage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\SubjectWorkspacePage.jsx)
  - [src/pages/HistoryPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\HistoryPage.jsx)
  - [src/pages/WrongBookPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\WrongBookPage.jsx)
  - [src/pages/FavoritesPage.jsx](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\pages\FavoritesPage.jsx)

### 边界层

项目里有两个明确的正式边界层：

- 题库边界：[src/boundaries/quizSchema.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\quizSchema.js)
  - 负责清洗导入文本、解析 JSON、归一化题库结构、输出兼容信息
- 存储边界：[src/boundaries/storageFacade.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\storageFacade.js)
  - 负责浏览器偏好项读写和 UI 面向的持久化 API

内部持久化实现位于：

- [src/services/storage/indexedDb](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\services\storage\indexedDb)

约定：

- UI 页面不要直接跨过边界层访问底层存储
- 新 schema 支持统一进 `quizSchema.js`
- 新持久化能力统一进 `storageFacade.js`

## 目录说明

```text
src/
  boundaries/                题库与存储边界层
  components/                可复用界面组件
  config/                    科目配置
  context/                   全局上下文
  pages/                     当前实际使用的页面
  router/                    主路由
  services/storage/indexedDb IndexedDB 存储实现
  utils/                     辅助工具

public/
  sample-quiz.json           旧版示例题库
  sample-schema-v1.json      新版 schema v1 示例题库
```

## 支持的题库格式

### 1. 旧版 `items` 格式

适合纯单选题快速导入。

示例：

```json
{
  "title": "示例试卷",
  "items": [
    {
      "id": "q1",
      "question": "Artificial intelligence is developing so rapidly that its influence on modern life cannot be ______.",
      "options": ["A. ignored", "B. ignoring", "C. ignore", "D. to ignore"],
      "correct_answer": "A",
      "rationale": "cannot be ignored 为被动结构。",
      "difficulty": "medium",
      "tags": ["grammar", "voice"]
    }
  ]
}
```

### 2. 新版 `schema v1`

支持：

- `single_choice`
- `reading`
- `cloze`
- `translation`
- `essay`

示例文件：

- [public/sample-schema-v1.json](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\public\sample-schema-v1.json)

说明：

- 导入时会被统一转换为内部使用的标准 `items`
- 当前版本支持兼容导入，不支持的题型会被统计到兼容提示中

## 本地数据说明

项目数据主要保存在浏览器本地：

- 档案
- 本地题库
- 做题进度
- 历史记录
- 错题掌握状态
- 收藏夹
- 偏好设置

其中：

- 业务数据主要使用 `IndexedDB`
- 少量偏好项和激活档案 ID 使用 `localStorage`

这意味着：

- 同一个浏览器里刷新页面不会丢失数据
- 换浏览器、清缓存、清站点数据后，本地记录会丢失

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

### 构建产物

```bash
npm run build
```

### 本地预览构建结果

```bash
npm run preview
```

## 运行说明

### 正确访问方式

开发时请通过本地 HTTP 服务访问：

- `npm run dev`
- 或 `npm run preview`

不要直接双击仓库根目录的 `index.html`。

### 关于 `file://`

即使 `dist/index.html` 是构建产物，也不建议通过 `file://` 直接打开。  
当前项目依赖模块脚本、路由和浏览器本地存储能力，最稳定的方式仍然是通过本地或线上 HTTP 服务访问。

## 部署到 GitHub Pages

这个项目已经适配静态托管，适合直接部署到 GitHub Pages。

通常流程：

1. 将仓库推送到 GitHub
2. 使用 GitHub Actions 或 Pages 发布 `dist/`
3. 通过 Pages 地址访问网站

当前 [vite.config.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\vite.config.js) 已配置：

```js
base: './'
```

这使它更适合静态资源托管环境。

## 当前测试覆盖

当前已补的自动化测试主要是边界层测试：

- [src/boundaries/quizSchema.test.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\quizSchema.test.js)
- [src/boundaries/storageFacade.test.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\boundaries\storageFacade.test.js)

覆盖内容包括：

- schema normalize
- fenced JSON 解析
- 兼容导入
- localStorage 安全访问
- IndexedDB facade 持久化流程

## 后续维护建议

如果继续迭代，建议遵守下面几条：

- 新题型支持统一从 `src/boundaries/quizSchema.js` 进入
- 新存储逻辑统一从 `src/boundaries/storageFacade.js` 进入
- 不再恢复旧版路由 / 旧版页面并存
- 页面只消费标准化后的内部题目结构
- 保持 `npm test` 和 `npm run build` 始终可通过

## 备注

这是一个以个人使用为核心的静态刷题项目。  
它的重点不是复杂权限系统和服务端，而是：

- 题库可控
- 本地体验稳定
- 页面可长期托管
- 后续继续加题型和学习功能时不至于失控
