# DS/DB 题型建模冻结结论

本文件用于冻结“数据结构 / 数据库原理”相关考试内容的题型建模结论。当前 subject catalog 已经把这份结论落到代码里，后续实现仍需以此为准。

## 冻结结论

### 1. 顶层类型策略

冻结结论：

1. 复用现有顶层类型作为主策略
2. 只新增一个顶层复合类型：`composite`
3. 不新增学科专属顶层类型

明确禁止：

1. 不新增 `sql`
2. 不新增 `code_reading`
3. 不新增 `er_design`
4. 不新增 `normalization`
5. 不新增 `transaction_analysis`

这些内容都必须通过：

1. 现有通用题型
2. `composite`

来承载。

### 2. 复用题型清单

1. `single_choice`
- 普通概念单选
- SQL 语义单选
- 索引 / 事务 / 范式单选

2. `multiple_choice`
- 多概念判断
- SQL 语义多选
- 数据结构性质多选

3. `true_false`
- 判断题
- 对错判断类事务 / 并发 / 规范化题

4. `fill_blank`
- 普通填空
- 代码填空
- SQL 填空
- 关系模式或表达式填空

5. `short_answer`
- 定义解释
- 原理说明
- 简短分析

6. `calculation`
- 算法过程题
- 关系代数推导
- 代价或过程型主观题

7. `operation`
- E-R 图设计
- 关系模式设计
- 结构化操作题

8. `case_analysis`
- 事务 / 并发分析
- 规范化分析
- 含背景材料的主观分析题

### 3. 必须新增的结构

唯一新增：

1. `composite`

使用条件：

1. 有共享材料
2. 有多个子题
3. 子题可能异构

禁止使用 `composite` 的场景：

1. 单题只为“看起来复杂”
2. 没有共享材料
3. 只是普通单题外加上下文文本时

### 4. 运行时形态冻结

冻结结论：

1. `quizPipeline` 入口不改
2. 新 schema 仍走 `parse -> validate -> normalize -> scoreBreakdown`
3. `composite` 在 normalize 后进入统一 `items`
4. `composite.questions` 内子题必须被 normalize 为现有通用题型结构

### 5. 一致性边界

#### validate

必须负责：

1. 识别 `composite`
2. 校验子题数组存在
3. 禁止 `composite` 递归嵌套

#### normalize

必须负责：

1. 保留旧 `items` 兼容
2. 保留旧 `questions` 兼容
3. 支持 `composite`
4. 保留 `material_format` / `context_format` / `presentation` / `deliverable_type`

#### scoring

必须负责：

1. `composite` 总分聚合
2. objective / subjective 聚合
3. 保持旧客观题规则不变

#### UI / workspace

必须负责：

1. 共享材料展示
2. 子题级作答
3. 子题级答案恢复
4. 尽量复用现有 objective / subjective 渲染逻辑

#### session / history / wrongbook

必须负责：

1. 保存 `composite` 子题答案
2. 生成稳定的子题 key
3. 保持旧快照结构兼容读取

## 开放问题

这些点需要实现前由你确认：

1. `composite.score` 是否强制等于子题总分
2. `wrongbook` 在 `composite` 下是否一律落到子题级
3. 代码 / SQL 展示是否只做格式标记，还是需要专门代码块样式
4. `operation` 是否足够承载 E-R 图 / 关系模式设计，还是未来需要专门 deliverable 渲染

