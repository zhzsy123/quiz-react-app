# Migration Status

用于记录“旧结构（`pages + boundaries`）”到当前分层结构的迁移状态。  
当前仓库已经实际运行在 `app / pages / widgets / features / entities / shared` 体系下，本文件反映的是 **到当前结构** 的落地情况。

## 迁移范围与目标

- 取消 `boundaries` 作为主目录承载。
- 明确建立 `entities / features / widgets / shared` 的职责边界。
- 将题库处理链（parse/validate/normalize/score）集中到 `entities/quiz/lib/quizPipeline` 周边，作为可复用领域能力。
- 保持页面可运行的同时逐步收口存储与 AI 调用层。

## 总体状态

### 已完成（Done）

1. **目录结构重心切换**
   - 实际目录已为：`app / pages / widgets / features / entities / shared`。
   - 不再以 `pages + boundaries` 为项目唯一主结构。

2. **`app` 层收敛**
   - `src/app/main.jsx`、`src/app/router/AppRouter.jsx`、`src/app/providers/AppContext.jsx` 与 `styles` 已在运行链路中。

3. **`features` 层与 `pages` 的状态分工**
   - `features/*` 已建立如 `dashboard`, `workspace`, `history`, `wrong-book`, `favorites`, `file-hub`, `ai` 等域模型目录。
   - 页面与状态模型关联关系清晰，仓库中的实际结构与文档已同步。

4. **`entities` 层题库能力集中化**
   - `entities/quiz/lib` 已包含：
     - `quizPipeline.js`
     - `text/*`, `validation/*`, `normalize/*`, `scoring/*`, `quizSchema.js`, `paperId.js`
   - 核心能力链路已可支持“导入解析 -> 校验 -> 标准化 -> 评分”闭环。

5. **数据与持久化链路**
   - `entities/*/api/*Repository.js` 已落在实体层。
   - 实体仓储对 `shared/storage` 的依赖已建立（`adapters / indexedDb / compat`）。

6. **AI 调用统一入口**
   - `features/ai/reviewService` 到 `shared/api/aiGateway -> deepseekClient -> httpClient` 的链路可工作。

### 进行中（In Progress）

1. **文档统一清理**
   - 部分文档仍保留旧路径样式或历史性语言，正在替换为与当前结构一致的说明。
2. **仓储与偏好层次收口**
   - `shared/lib/storage/storageFacade`、`shared/storage/compat/legacyStorageFacade` 与现有仓储调用的关系仍在持续整理与补充说明。
3. **边界语义固化**
   - 继续补齐 `features -> AppContext` 与 `pages/widgets` 之间的数据流文档。

### 待办（To Do）

1. `entities` 名称一致性与历史遗留并存项（如 `wrong-book`/`wrongbook`）的文档与使用约定统一。
2. 对 `storageFacade` 的长期兼容策略出具最终实施清单（是否保留与替换节奏、弃用路径和验收规则）。
3. 继续清理 README/architecture/migration 之外文档里的绝对路径引用，统一为项目内相对路径。

## 关键迁移映射（旧 -> 新）

| 旧定位 | 当前定位 | 状态 | 说明 |
|---|---|---|---|
| `src/main.jsx` | `src/app/main.jsx` | 已完成 | 入口已迁移到 app 层 |
| `src/router/AppRouter.jsx` | `src/app/router/AppRouter.jsx` | 已完成 | 路由在 app 层 |
| 页面逻辑分散在旧边界层 | `src/pages/*` + `features/*/model` | 进行中 | 页面与 feature 分工已建立 |
| 题库处理散落于使用处 | `src/entities/quiz/lib` | 已完成 | pipeline + text/validate/normalize/scoring 模块集中 |
| `src/repositories` 化 | `src/entities/*/api/*Repository.js` | 已完成 | 仓储能力集中到实体层 |
| `boundaries` 为主目录 | `boundaries` 已移除主路径 | 已完成 | 当前无 `src/boundaries` 目录作为主层 |
| 平台存储 | `shared/storage/*` | 已完成 | 统一在 shared 层完成存储适配与兼容 |
| AI 相关 API | `features/ai` + `shared/api` | 已完成 | 保持业务层调用共享 API |

## 风险点

1. **命名与兼容双轨风险**  
   `wrong-book` 与 `wrongbook` 并存，需确保导入路径与重导出关系在演进过程中不引入重复或冲突。

2. **迁移痕迹残留风险**  
   文档历史内容与旧调用描述若未清理，会误导新成员理解当前边界。

3. **兼容层退役节奏风险**  
   `legacyStorageFacade` 与 `storageFacade` 的协作关系短期可用，但长期目标是否继续保留需确认。

4. **状态传播边界风险**  
   `AppContext` 与 `features` 的状态共享仍需稳定接口约束，避免页面与特性层直接穿透实现细节。

## 下一步建议（执行顺序）

1. 先完成文档全量一致性（README、architecture、migration 和其他入口文档）。  
2. 完成 `wrong-book` 与 `wrongbook` 的命名/导出策略说明并固定约定。  
3. 明确 `storageFacade` 与 `legacyStorageFacade` 的迁移到位条件：什么时候允许逐步去掉兼容分支。  
4. 保持上述进度在 `docs/migration.md` 更新（每次仓库结构变化都同步）。
