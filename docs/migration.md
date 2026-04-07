# Migration Status

本文用于同步“旧结构（含 `pages + boundaries`）向当前结构”的收口状态。  
当前仓库已进入迁移收口阶段：核心分层可运行，但仍存在兼容边界和命名收敛任务。

## 一、能力成熟度矩阵（建议阅读）

### 已稳定支持

- `app / main / router / providers`：启动与路由能力稳定可用
- `entities/quiz/lib`：
  - `quizPipeline.js` 可作为题库处理主入口
  - `text / validation / normalize / scoring` 的核心路径可运行
- `shared/storage`：IndexedDB 与 browserStorageAdapter 的主链路可用
- 基础页面容器与特性交互（`dashboard`, `workspace`, `history`, `wrong-book`, `favorites`, `file-hub`）

### 预埋 / 在建

- `PDF / DOCX` 导入：能力链路仍在整合，尚未表述为全闭环稳定支持
- `features/ai`：AI 能力为“预留 + 部分落地 + 在建增强”，与业务链路的成熟度不同步
- `entities` 中 `wrong-book` 与兼容导出相关命名的收敛
- `shared/storage/compat/legacyStorageFacade` 与 `storageFacade` 的长期替换策略
- `pages` 命名与边界清理（历史命名兼容仍在整理）

## 二、迁移目标（已确认）

1. 保持当前可运行状态不回退
2. 不再将 `boundaries` 作为主结构目录
3. 保持 `entities / features / widgets / shared` 的职责边界
4. 将 `quizPipeline` 作为题库处理的核心入口进行边界统一
5. 形成稳定但可扩展的持久化与 AI 调用策略

## 三、旧结构到新结构映射与状态

| 旧定位 | 当前定位 | 状态 | 说明 |
|---|---|---|---|
| `src/main.jsx` | `src/app/main.jsx` | 已完成 | 入口已迁移到 `app` 层 |
| `src/router/AppRouter.jsx` | `src/app/router/AppRouter.jsx` | 已完成 | 路由归位到 `app` |
| 页面逻辑在旧 `boundaries` | `src/pages/*` + `features/*/model` | 进行中 | 页面仍为迁移容器，命名与边界逐步收敛 |
| 题库能力分散调用 | `src/entities/quiz/lib/quizPipeline` | 已完成（核心） | 仍在补齐历史兼容与接口一致性 |
| `src/repositories` | `src/entities/*/api/*Repository.js` | 已完成 | 仓储职责已集中到实体层 |
| `shared/storage/*`（散点） | `src/shared/storage/*` | 已完成 | 兼容层（legacy）仍保留 |
| AI 调用混散 | `features/ai` + `shared/api` | 进行中 | 具备可用入口，能力仍在增强 |
| `boundaries` 为主目录 | 无 `src/boundaries` 主承载 | 已完成 | `boundaries` 已不再作为主目录 |

## 四、当前迁移中的关键状态说明

- `quizPipeline`：核心已稳定，但上游/下游的兼容入口与历史别名收敛仍在进行。
- `legacyStorageFacade`：作为兼容阶段组件保留，后续收口策略尚未完全收敛。
- 页面命名：`pages` 为迁移期间的承载层，部分历史引用可能仍保留，需按迁移里程碑持续清理。

## 五、风险点（高优先）

1. **能力成熟度误读风险**  
   如果文档将 PDF/DOCX、AI 能力描述为完整成熟，可能误导测试与验收边界。
2. **兼容层长期存在风险**  
   `legacyStorageFacade` 与 `storageFacade` 的并行存在必须保留明确退出条件，否则会增加维护成本。
3. **命名迁移残留风险**  
   仍存历史兼容路径时，导入与复用行为需避免重复定义/重复入口。

## 六、未完成项

1. 全量清理旧路径描述与历史名词，统一迁移态表达
2. 给 `quizPipeline` 补充稳定边界协议（输入/输出与错误处理标准）
3. 固化 `pages` 与 `features` 命名约束清单（谁负责最终命名归属）
4. `AI` 能力按场景写出可验收标准（哪些端点和交互可算“可用”）

## 七、可用表达建议（对外文档）

- “预埋/在建”替代“已完成”：`PDF/DOCX` 导入、AI 相关能力、部分历史命名收敛项
- “迁移收口中”：`quizPipeline` 兼容边界、`legacyStorageFacade` 去留策略、`pages` 命名统一
