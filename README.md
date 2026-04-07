# Quiz React App

基于 `Vite + React` 的题库学习客户端，当前以“可用功能 + 在建能力”并存的迁移收口状态运行。

## 功能状态（当前）

- 已稳定支持：JSON 导入与题库基础流程（解析/标准化/校验/评分）基础闭环
- 预埋/在建：`PDF / DOCX` 导入能力（当前以适配与能力链路为主）
- 预埋/在建：AI 相关能力（当前为相关能力预留 + 部分落地 + 在建增强）
- 已稳定支持：练习、收藏、历史记录、错题、工作区、答题进度等核心业务流程
- 已稳定支持：本地存储（IndexedDB / localStorage）基础持久化

## 运行方式

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 当前代码结构（实际）

项目当前不再使用“`pages + boundaries`”作为唯一主结构；应用运行在迁移收口阶段，部分细节仍在整理中：

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

> 说明：除核心结构稳定外，`pages` 与若干领域命名仍有迁移中的历史兼容关系，详见 `docs/migration.md`。

### 结构说明

- `app`：应用启动与运行时骨架（`main.jsx`, `router`, `providers`, `styles`）
- `pages`：页面容器层（迁移中页面容器），主要承载布局和路由切换
- `widgets`：页面可复用组件（如题库展示与导入组件）
- `features`：页面内业务状态与交互逻辑（工作流、历史、错题、收藏等）
- `entities`：领域能力与基础能力（题库处理 pipeline、仓储能力、领域模型）
- `shared`：横切基础设施（存储适配、网络调用、偏好管理）

## 代表性业务域（对外）

- 题库与题目处理：`entities/quiz/lib`（`quizPipeline`、文本与校验处理、评分）
- 题目会话与历史：`entities/session`, `entities/history`
- 收藏与错题：`entities/favorite`, `entities/wrong-book`
- 学科与资源：`entities/subject`, `entities/library`
- 文件与工作区：`features/workspace`, `features/file-hub`

更详细的兼容与迁移约定放在 `docs/migration.md`，避免将迁移中的中间状态暴露为最终结构。

## 题库处理链（当前状态）

```text
widgets/quiz-importer -> entities/quiz/lib/quizPipeline -> entities/quiz/lib/quizSchema
                                        -> text/*
                                        -> validation/*
                                        -> normalize/*
                                        -> scoring/*
```

> 当前状态说明：该链路为“核心能力逐步收口”结果，稳定基础功能已可运行，但仍在配套接口与历史兼容收敛过程中（详见迁移文档）。

## 迁移收口提醒

- `quizPipeline`：已作为核心链路使用，但其上游/下游边界与兼容场景仍在统一命名与导出整理。
- `legacyStorageFacade`：仍在迁移收口期，作为兼容路径保留。
- `pages` 命名与历史页面引用：逐步收束中，当前先保证可用性与兼容性，部分历史命名尚未完成清理。
