# 项目审查报告（2026-04-07）

## 审查范围
- 工程结构与可维护性
- 构建与交付流程
- 路由与页面演进一致性
- 存储层与数据迁移风险

## 执行检查
1. `npm run build`：构建成功。
2. `rg --files -g '!node_modules/**'`：确认源码结构与目录分布。
3. `rg "AppRouterV[2-4]|DashboardPageV2|HistoryPage|system[2-6]\\.css" src -n`：检查多版本并存痕迹。
4. 关键文件阅读：`src/main.jsx`、`src/router/AppRouterV5.jsx`、`src/context/AppContext.jsx`、`src/services/storage/indexedDb/db.js`、`src/utils/storage.js`。

## 主要结论

### 1) 交付卫生问题（已修复）
- 项目缺失 `.gitignore`，导致 `node_modules/` 和 `dist/` 在仓库中处于未忽略状态（`git status` 可见）。
- 这会增加误提交风险、污染 PR、拖慢 CI。
- 本次已新增 `.gitignore`，覆盖依赖目录、构建目录、日志与常见编辑器文件。

### 2) 架构演进存在“版本并存”现象（建议治理）
- 入口当前固定使用 `AppRouterV5`，但仓库内仍保留 `AppRouter`、`AppRouterV2`、`AppRouterV3`、`AppRouterV4`。
- 页面也存在 `DashboardPage`/`DashboardPageV2`、`HistoryPage`/`HistoryPageV2` 双轨。
- 风险：
  - 新需求落点不清（维护者可能改到旧文件）。
  - 代码搜索结果噪音高，回归范围难界定。
- 建议：
  1. 建立 `legacy/` 目录归档历史版本，或直接删除未引用实现。
  2. 在 README 增加“当前生效入口与路由版本”说明。

### 3) 样式层叠来源较多（建议收敛）
- `main.jsx` 连续引入 `system.css` 到 `system6.css` 多份全局样式文件。
- 风险：选择器覆盖关系复杂，改样式时容易出现“局部修复影响全局”。
- 建议：
  1. 逐步收敛为单一 design-token + 模块化样式（或按页面拆分）。
  2. 给每个 system 样式增加用途注释和废弃计划。

### 4) 数据库版本策略偏保守（建议提前规划迁移）
- IndexedDB 当前 `DB_VERSION = 1`，对象仓库在 `onupgradeneeded` 中一次性创建。
- 当前可用，但后续 schema 变化（新增索引、字段迁移）会需要清晰 migration 策略。
- 建议：
  1. 增加 migration 约定（例如 `switch(oldVersion)`）。
  2. 为核心读取路径加入更明确的兼容兜底与埋点日志。

### 5) 存在历史存储工具文件（建议确认是否可删除）
- `src/utils/storage.js` 仍保留 localStorage 方案；而当前业务主要通过 `src/utils/indexedDb.js` 聚合到 IndexedDB 服务层。
- 若该文件未被调用，可考虑删除，减少认知负担。

## 优先级建议
- P0（本次已完成）：补齐 `.gitignore`。
- P1（1 周内）：完成路由/页面历史版本清理与 README 对齐。
- P2（2~3 周）：样式体系收敛、建立 CSS 分层约束。
- P2（并行）：制定 IndexedDB migration 模板，避免后续升级时临时补救。

## 总体评价
- 项目可正常构建，核心功能框架已成型。
- 主要风险不在“功能不可用”，而在“版本演进造成的维护复杂度”。
- 若按上述清理路线推进，可显著降低后续迭代成本。
