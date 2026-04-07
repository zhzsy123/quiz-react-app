# Migration Status

本文档记录的是从旧结构迁移到当前分层结构的实际完成情况。

## 旧结构

历史结构核心特征：

- 入口集中在 `src/main.jsx`
- 路由集中在 `src/router/AppRouter.jsx`
- 页面逻辑主要堆在 `src/pages/*`
- 题库与存储边界集中在 `src/boundaries/*`
- UI 通过过程式存储函数直接拿 IndexedDB / localStorage 能力

这个结构可以跑，但随着功能增加，页面职责和技术边界都开始变重。

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

已经完成的内容：

- 目录迁移到 `app / pages / widgets / features / entities / shared`
- 修复入口和 import
- 保持行为不变

结果：

- 旧目录 `src/router`、`src/boundaries` 不再是主入口
- 当前入口已经是 `src/app/main.jsx`

### Phase 2

状态：已完成

已经完成的内容：

- 页面变薄
- 页面级业务逻辑下沉到 `features/*/model`

结果：

- `DashboardSplitPage`
- `FileHubPage`
- `SubjectWorkspacePage`
- `HistoryPage`
- `WrongBookPage`
- `FavoritesPage`

都改成“页面负责组装，业务逻辑在 feature hook”。

### Phase 3

状态：已完成

已经完成的内容：

- 新增 `shared/storage/adapters`
- 新增 `entities/*/api repository`
- feature / app 不再直接碰 IndexedDB store 文件和 `localStorage`

结果：

- 存储访问统一经过 repository
- 偏好项统一经过 `preferenceRepository`
- `storageFacade` 退化为兼容层

### Phase 4

状态：已完成

已经完成的内容：

- 新增 `entities/quiz/lib/quizPipeline.js`
- 建立 `parse -> validate -> normalize -> summary` 导入流程
- 导入器和工作区加载都先走 pipeline

结果：

- 所有导入数据都会先标准化，再进入业务层
- 旧 `items` 兼容仍然保留

### Phase 5

状态：已完成

已经完成的内容：

- 扩展 `shared/api`
- 新增 `httpClient`
- 新增 `aiGateway`
- 将 DeepSeek 调用纳入 `shared/api` 统一入口

结果：

- `features/ai/reviewService` 不再直接依赖具体 fetch 细节
- 当前 provider 只有 DeepSeek，但已经具备 provider gateway 结构

## 仍然保留的兼容与遗留点

以下内容当前仍然存在，属于“已知保留项”，不是遗漏：

### 1. `storageFacade` 仍在

原因：

- 兼容已有测试
- 兼容少量历史调用

状态：

- 不是新代码主入口
- 后续可逐步下线

### 2. `quizSchema.js` 仍然偏重

当前情况：

- `quizPipeline.js` 已经把流程收口
- 但题型级归一化仍集中在 `quizSchema.js`

状态：

- 目前可维护
- 但如果继续扩题型，后面仍值得进一步拆分

### 3. `features` 仍依赖 `AppContext`

当前情况：

- feature hooks 会通过 `useAppContext()` 读取当前档案

影响：

- 依赖方向还没有完全纯化
- 但当前行为稳定

### 4. `shared/api` 还没有真实后端

当前情况：

- 已有 `httpClient + aiGateway + deepseekClient`
- 但所有 API 仍然是前端直连 provider

影响：

- 适合个人自用
- 不适合多人公开生产场景

## 目前还没做的事

以下内容不属于“本轮迁移已完成”的部分：

- 服务端 API 接入
- 统一后端 repository
- 多 provider 配置 UI
- `quizSchema.js` 进一步按题型拆模块
- `features` 与 `AppContext` 彻底解耦

这些是后续演进项，不是当前代码已经落地的能力。
