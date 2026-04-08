# 兼容层退场清单与迁移说明

本文档只记录现状、退场顺序和后续执行边界，不改变任何实现行为。

## 目标

- 把兼容层相关入口、桥接关系、依赖方和退场顺序写清楚。
- 让后续执行线程可以按清单逐步删除旧路径，而不是继续口头判断。
- 在未完成验证前，保留现有兼容行为，不做隐式重构。

## 当前兼容节点

| 节点 | 文件 | 角色 | 当前状态 |
| --- | --- | --- | --- |
| 主存储门面桥接 | `src/shared/lib/storage/storageFacade.js` | 指向旧兼容层的桥接文件 | 仅做旧路径转发，不应再作为新代码入口 |
| 旧存储兼容层 | `src/shared/storage/compat/legacyStorageFacade.js` | 旧存储门面兼容层 | 当前仍聚合 profile/library/session/history/wrongbook/favorite/preference 等导出 |
| 旧命名错题仓储 | `src/entities/wrong-book/api/wrongBookRepository.js` | 旧命名 re-export | 仅兼容旧 import 路径 |
| 新命名错题仓储 | `src/entities/wrongbook/api/wrongbookRepository.js` | 当前主仓储实现 | 新代码应优先依赖这里 |

## 现状入口与桥接关系

### 1. `storageFacade.js`

- 现状作用：旧路径桥接文件。
- 关系：`src/shared/lib/storage/storageFacade.js -> src/shared/storage/compat/legacyStorageFacade.js`
- 语义：新代码不应继续从这里导入；它只承担历史兼容。

### 2. `legacyStorageFacade.js`

- 现状作用：旧存储 API 的兼容聚合层。
- 当前聚合的能力包括：
  - profile
  - library
  - session / progress
  - history / attempt
  - wrongbook
  - favorite
  - preference
- 语义：这是兼容层，不是当前主架构入口。

### 3. `wrongBookRepository.js`

- 现状作用：旧命名仓储 re-export。
- 关系：`src/entities/wrong-book/api/wrongBookRepository.js -> src/entities/wrongbook/api/wrongbookRepository.js`
- 语义：只保留给旧测试或旧 import 路径过渡使用。

## 推荐退场顺序

### 第 1 步：冻结新依赖

- 新代码禁止再从 `storageFacade.js` 导入。
- 新代码禁止再从 `wrong-book/api/wrongBookRepository.js` 导入。
- 新代码只允许使用当前主路径：
  - `src/shared/storage/compat/legacyStorageFacade.js` 仅作为过渡保留
  - `src/entities/wrongbook/api/wrongbookRepository.js` 作为主错题仓储

前置条件：
- 需要先确认没有新的代码路径继续增加旧 import。
- 需要确认所有现存调用点都能通过静态搜索列出。

### 第 2 步：收敛调用方到主路径

- 将业务代码逐步迁移到新的 repository 主入口。
- 将仍依赖 `storageFacade.js` 的调用点改到对应 repository。
- 将仍依赖 `wrong-book/api/wrongBookRepository.js` 的调用点改到 `wrongbook/api/wrongbookRepository.js`。

前置条件：
- 每个调用点都要确认行为等价。
- 需要先识别是否存在测试专门覆盖旧导出路径。

### 第 3 步：保留兼容层但停止扩散

- 只保留极少数旧测试和过渡代码依赖。
- 兼容层文件上继续标注弃用，但不再新增 re-export。
- 如果出现新增需求，先补主路径，再考虑是否继续暴露旧路径。

前置条件：
- 新入口已经覆盖主要业务链路。
- 旧路径不再被新功能使用。

### 第 4 步：删除桥接文件

- 删除 `src/shared/lib/storage/storageFacade.js`。
- 删除 `src/entities/wrong-book/api/wrongBookRepository.js`。
- 如有需要，再决定是否缩减 `legacyStorageFacade.js` 的导出面。

前置条件：
- 所有旧 import 已迁移完毕。
- 旧测试、旧脚本、旧文档都已更新或移除。

## 建议的删除优先级

1. `src/shared/lib/storage/storageFacade.js`
2. `src/entities/wrong-book/api/wrongBookRepository.js`
3. `legacyStorageFacade.js` 中最外围、最少使用的旧导出
4. `legacyStorageFacade.js` 其余导出

理由：
- `storageFacade.js` 和 `wrongBookRepository.js` 都是纯桥接，最容易先删除。
- `legacyStorageFacade.js` 目前聚合面最广，必须最后收口。

## 风险点

- `legacyStorageFacade.js` 仍聚合 history / attempt / wrongbook / favorite 等多个领域，删除前必须确认所有调用方已经迁移。
- `wrongbook` 与 `wrong-book` 两条命名路径仍并存，删除过快会影响旧测试或旧脚本。
- 现有文档和代码中的旧路径可能不一致，不能只靠文件名判断是否安全删除。
- 如果某些调用点仍通过间接 re-export 进入，静态搜索时容易漏掉，需要补全依赖图。

## 后续代码线程需要确认的未知点

1. `storageFacade.js` 当前还有哪些直接 import 方。
2. `legacyStorageFacade.js` 中每个 re-export 的真实调用覆盖范围。
3. `wrong-book/api/wrongBookRepository.js` 是否仍被测试、脚本或过渡文档引用。
4. `wrongbookRepository.js` 是否已经覆盖全部业务调用，还是仍有旧路径依赖。
5. 是否存在尚未显式列出的兼容层文件，仍在扮演桥接角色。

## 执行建议

- 文档线程只负责把退场顺序和风险写清楚，不碰实现。
- 代码线程应按“冻结新依赖 -> 迁移调用方 -> 保留兼容 -> 删除桥接”顺序推进。
- 每一步都应先确认调用方清单，再执行删除。

