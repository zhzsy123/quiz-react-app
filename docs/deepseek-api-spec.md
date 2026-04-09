# Deep Seek API 调用规范文档

> 更新时间：2026-04-09  
> 适用范围：基于 [DeepSeek API Docs](https://api-docs.deepseek.com/zh-cn/) 的官方公开文档整理  
> 文档目标：为当前仓库内的 AI 出题、AI 解释、AI 批改、直接导入 PDF/DOCX 方案提供统一的调用规范与接入边界

## 1. 文档结论先看

对于当前仓库，DeepSeek API 的**主调用入口**应优先收敛到：

1. `POST /chat/completions`
2. `GET /models`

可选 Beta 能力：

1. `POST /completions`（FIM 补全，Beta）
2. `POST /chat/completions` + `assistant.prefix=true`（对话前缀续写，Beta）
3. Tool Calls `strict` 模式（Beta）

对当前项目的建议是：

- **AI 出题 / 文档结构化 / JSON 解析**：优先 `deepseek-chat`
- **AI 批改主观题 / 复杂解释 / 核题**：优先 `deepseek-reasoner`，或 `deepseek-chat + thinking.enabled`
- **流式展示**：统一使用 `stream=true`
- **严格 JSON 输出**：统一使用 `response_format: { type: "json_object" }`

## 2. 官方基础信息

### 2.1 Base URL

官方标准地址：

- `https://api.deepseek.com`

OpenAI 兼容地址：

- `https://api.deepseek.com/v1`

说明：

- `v1` 只是兼容 OpenAI SDK 的路径写法，**不代表模型版本**

Beta 功能地址：

- `https://api.deepseek.com/beta`

用途：

- FIM 补全
- 对话前缀续写
- Tool Calls `strict` 模式

### 2.2 鉴权

采用 Bearer Token：

```http
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json
```

### 2.3 当前官方稳定模型

根据官方 `GET /models` 与模型价格页，常规公开可用模型主要是：

1. `deepseek-chat`
2. `deepseek-reasoner`

来源：

- [列出模型](https://api-docs.deepseek.com/zh-cn/api/list-models)
- [模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)

## 3. 模型说明与适用场景

### 3.1 `deepseek-chat`

定位：

- 非思考模式
- 通用对话模型
- 更适合结构化输出与高频调用

官方能力：

- 上下文长度：`128K`
- 默认最大输出：`4K`
- 最大输出：`8K`
- 支持 `JSON Output`
- 支持 `Tool Calls`
- 支持 `Chat Prefix Completion (Beta)`
- 支持 `FIM Completion (Beta)`

适合当前项目的场景：

1. AI 出题
2. PDF / DOCX 直导入后的题库结构化
3. JSON 规范化输出
4. 一般性 AI 解释
5. 流式逐题生成

### 3.2 `deepseek-reasoner`

定位：

- 思考模式
- 更强的复杂推理能力
- 会返回 `reasoning_content`

官方能力：

- 上下文长度：`128K`
- 默认最大输出：`32K`
- 最大输出：`64K`
- 支持 `JSON Output`
- 支持 `Chat Prefix Completion (Beta)`
- 不支持 `FIM Completion (Beta)`

适合当前项目的场景：

1. 主观题评分
2. 作文、翻译、简答题批改
3. 复杂题型解释
4. AI 核题
5. 复杂文档结构判断

### 3.3 关于 `deepseek-reasoner` 与 Tool Calls 的官方口径差异

官方文档当前存在一处需要特别注意的口径差异：

- [思考模式](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode) 页面写明：思考模式支持 `Tool Calls`
- [推理模型 (deepseek-reasoner)](https://api-docs.deepseek.com/zh-cn/guides/reasoning_model) 页面又写明：`deepseek-reasoner` 不支持 `Function Calling`

因此，对当前仓库建议采用**保守策略**：

1. 如果只是做复杂推理，不需要工具调用：使用 `deepseek-reasoner`
2. 如果需要“思考 + 工具调用”：优先使用 `deepseek-chat` 并传 `thinking: { type: "enabled" }`
3. 在官方文档口径完全统一前，不把 `deepseek-reasoner + tool_calls` 作为主生产链

## 4. 核心接口一：`POST /chat/completions`

### 4.1 用途

这是当前项目最核心的 DeepSeek 调用接口。

适合：

1. AI 出题
2. AI 解释
3. AI 主观题批改
4. AI 核题
5. 文档结构化导入
6. 流式返回
7. JSON 输出
8. Tool Calls

### 4.2 请求体字段总表

以下字段基于官方文档整理，按“当前项目高频 / 低频”区分。

#### 必填字段

| 字段 | 类型 | 说明 | 当前项目建议 |
|---|---|---|---|
| `model` | `string` | 模型 ID，当前主要是 `deepseek-chat` / `deepseek-reasoner` | 必填 |
| `messages` | `array` | 对话消息数组 | 必填 |

#### 高频可选字段

| 字段 | 类型 | 说明 | 当前项目建议 |
|---|---|---|---|
| `thinking` | `object \| null` | 控制思考模式开关 | 仅复杂推理场景使用 |
| `temperature` | `number \| null` | 采样温度 | 出题/解释可用，批改尽量低 |
| `max_tokens` | `integer \| null` | 最大输出 token 数 | 强烈建议显式设置 |
| `response_format` | `object \| null` | 响应格式控制，支持 `json_object` | 结构化输出必须用 |
| `stream` | `boolean \| null` | 是否流式返回 | 长输出、逐步展示时用 |
| `stream_options` | `object \| null` | 流式选项 | 需要 usage 时用 |
| `stop` | `string \| string[] \| null` | 停止词 | 特定格式收口时用 |
| `presence_penalty` | `number \| null` | 出现惩罚 | 少用 |
| `frequency_penalty` | `number \| null` | 频率惩罚 | 少用 |
| `top_p` | `number \| null` | nucleus sampling | 少用 |

#### Tool Calls 相关字段

| 字段 | 类型 | 说明 | 当前项目建议 |
|---|---|---|---|
| `tools` | `array \| null` | 可调用工具列表，目前仅支持 `function` | 当前仓库暂未主用 |
| `tool_choice` | `string \| object \| null` | `none / auto / required` 或指定函数 | 仅工具链需要 |

#### 概率分析相关字段

| 字段 | 类型 | 说明 | 当前项目建议 |
|---|---|---|---|
| `logprobs` | `boolean \| null` | 是否返回 token 对数概率 | 当前项目通常不用 |
| `top_logprobs` | `integer \| null` | 返回每步 top-N token 对数概率 | 仅分析类场景 |

### 4.3 `messages` 字段结构

`messages` 是一个消息数组，消息角色支持：

1. `system`
2. `user`
3. `assistant`
4. `tool`

#### system message

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | `string` | 固定 `system` |
| `content` | `string` | 系统提示词 |
| `name` | `string` | 可选，参与者名称 |

#### user message

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | `string` | 固定 `user` |
| `content` | `string` | 用户输入 |
| `name` | `string` | 可选 |

#### assistant message

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | `string` | 固定 `assistant` |
| `content` | `string \| null` | assistant 内容 |
| `name` | `string` | 可选 |
| `prefix` | `boolean` | Beta，对话前缀续写时使用 |
| `reasoning_content` | `string \| null` | Beta，前缀续写/思考模式相关 |
| `tool_calls` | `array` | tool call 结果，可在多轮工具调用时回传 |

#### tool message

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | `string` | 固定 `tool` |
| `content` | `string` | 工具执行结果 |
| `tool_call_id` | `string` | 对应上一次 assistant 的 tool_call.id |

### 4.4 `thinking` 字段

格式：

```json
{
  "thinking": {
    "type": "enabled"
  }
}
```

可选值：

- `enabled`
- `disabled`

建议：

- 需要复杂推理但又不想切模型时，可用 `deepseek-chat + thinking.enabled`
- 如果使用 OpenAI SDK，官方建议放进 `extra_body`

### 4.5 `response_format`

格式：

```json
{
  "response_format": {
    "type": "json_object"
  }
}
```

可选值：

- `text`
- `json_object`

注意事项：

1. 只设 `response_format` 不够，prompt 里还要明确要求输出 JSON
2. prompt 里最好包含 `json` 字样和 JSON 样例
3. `max_tokens` 过小会导致 JSON 被截断
4. 官方说明：JSON 模式偶发可能返回空 `content`

适合当前项目的场景：

- AI 出题
- AI 解析试卷
- AI 批改结构化结果
- AI 核题结构化结果

### 4.6 `stream` 与 `stream_options`

开启流式：

```json
{
  "stream": true,
  "stream_options": {
    "include_usage": true
  }
}
```

说明：

- 流式返回采用 SSE
- 结束标记为 `data: [DONE]`
- `include_usage=true` 时，结束前会额外返回一个带 usage 的块

适合当前项目的场景：

1. AI 生成题目逐题流式展示
2. 长解释逐段展示
3. 文档导入长结构化任务的过程反馈

### 4.7 `tools` 与 `tool_choice`

`tools` 目前只支持 `function`。

工具定义字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `string` | 固定 `function` |
| `function.name` | `string` | 函数名，最长 64 字符 |
| `function.description` | `string` | 函数描述 |
| `function.parameters` | `object` | JSON Schema 形式的参数定义 |
| `function.strict` | `boolean` | Beta，严格模式 |

`tool_choice` 支持：

- `none`
- `auto`
- `required`
- 指定某个 function

当前项目建议：

- 当前仓库先不把 Tool Calls 当主链
- 等直导入、AI 批改稳定后，再考虑把“核题 -> 外部校验工具”接进来

### 4.8 `logprobs` 与 `top_logprobs`

适用于需要 token 概率分析的场景。

注意：

- `top_logprobs` 只有在 `logprobs=true` 时才有意义
- `deepseek-reasoner` 官方明确说不支持 `logprobs / top_logprobs`

当前项目建议：

- 默认不启用

## 5. `POST /chat/completions` 响应字段

### 5.1 非流式核心字段

| 字段 | 说明 |
|---|---|
| `id` | 响应 ID |
| `object` | 通常是 `chat.completion` |
| `created` | Unix 时间戳 |
| `model` | 实际使用模型 |
| `system_fingerprint` | 后端配置指纹 |
| `choices` | 结果列表 |
| `usage` | token 用量 |

`choices[i]` 的关键字段：

| 字段 | 说明 |
|---|---|
| `finish_reason` | `stop / length / content_filter / insufficient_system_resource` |
| `index` | choice 索引 |
| `message.content` | 最终回答 |
| `message.reasoning_content` | 推理内容，仅思考模式 |
| `message.tool_calls` | 模型提出的工具调用 |
| `message.role` | assistant |
| `logprobs` | token 对数概率信息 |

### 5.2 `usage` 字段

官方返回里，`usage` 至少可能包含：

| 字段 | 说明 |
|---|---|
| `prompt_tokens` | 输入 token |
| `completion_tokens` | 输出 token |
| `total_tokens` | 总 token |
| `prompt_cache_hit_tokens` | 输入中命中上下文缓存的 token |
| `prompt_cache_miss_tokens` | 输入中未命中缓存的 token |
| `completion_tokens_details.reasoning_tokens` | 推理 token 数 |

对当前项目的价值：

1. 统计 AI 出题成本
2. 统计 AI 批改成本
3. 评估长文档直导入的费用
4. 观察缓存是否生效

### 5.3 流式增量字段

流式返回中，每个 chunk 主要看：

| 字段 | 说明 |
|---|---|
| `choices[0].delta.content` | 增量文本 |
| `choices[0].delta.reasoning_content` | 增量推理文本 |
| `choices[0].delta.role` | 一般首块出现 |
| `choices[0].finish_reason` | 结束原因 |
| `usage` | 仅在最后或 include_usage 时出现 |

## 6. 核心接口二：`POST /completions`（FIM 补全，Beta）

### 6.1 用途

这是 Fill-In-the-Middle 补全接口。

前提：

- 必须使用 `base_url = https://api.deepseek.com/beta`
- 仅支持 `deepseek-chat`

### 6.2 请求字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `model` | `string` | 固定 `deepseek-chat` |
| `prompt` | `string` | 前半部分文本 |
| `suffix` | `string \| null` | 后半部分文本 |
| `echo` | `boolean \| null` | 是否把 prompt 一起回显 |
| `frequency_penalty` | `number \| null` | 频率惩罚 |
| `presence_penalty` | `number \| null` | 出现惩罚 |
| `logprobs` | `integer \| null` | 返回 token 概率 |
| `max_tokens` | `integer \| null` | 最大输出 |
| `stop` | `string \| string[] \| null` | 停止词 |
| `stream` | `boolean \| null` | 是否流式 |
| `stream_options` | `object \| null` | 流式选项 |
| `temperature` | `number \| null` | 采样温度 |
| `top_p` | `number \| null` | nucleus sampling |

### 6.3 当前项目建议

当前仓库**不建议主用 FIM**。

原因：

1. 题库项目以结构化 JSON 为主，不是中间补全文本 IDE
2. FIM 更适合代码补全、模板补全
3. 现有 AI 出题和直导入都更适合 `/chat/completions`

可考虑的未来场景：

- 题干模板补全
- SQL 题模板补全
- 程序设计题骨架补全

## 7. `GET /models`

### 7.1 用途

列出当前可用模型。

### 7.2 返回字段

| 字段 | 说明 |
|---|---|
| `object` | 固定 `list` |
| `data[].id` | 模型 ID |
| `data[].object` | 固定 `model` |
| `data[].owned_by` | 所属组织 |

示例返回中的稳定模型：

- `deepseek-chat`
- `deepseek-reasoner`

### 7.3 当前项目建议

建议未来用于：

1. 设置页动态列出模型
2. 启动时做模型可用性检测
3. 调试环境做健康检查

## 8. Beta 功能说明

### 8.1 对话前缀续写（Chat Prefix Completion）

条件：

1. `base_url = https://api.deepseek.com/beta`
2. `messages` 最后一条必须是 `assistant`
3. 最后一条 assistant 消息需要 `prefix: true`

适用场景：

1. 固定模板续写
2. 指定 JSON/代码前缀后续写
3. 指定开头语气后让模型完成剩余部分

对当前项目建议：

- 可用于“固定 JSON 骨架续写”
- 但第一阶段不建议作为主链

### 8.2 Tool Calls `strict` 模式

条件：

1. `base_url = https://api.deepseek.com/beta`
2. tool 里每个 function 设置 `strict: true`

作用：

- 强制模型输出严格符合 JSON Schema 的函数调用参数

对当前项目建议：

- 未来如果做“AI 核题 -> 外部校验器 / 规则引擎”，可以考虑
- 当前不建议作为首选主链

## 9. 上下文缓存（Context Caching）

官方说明：

- 对所有用户默认开启
- 不需要额外改代码
- 会在 `usage` 中返回：
  - `prompt_cache_hit_tokens`
  - `prompt_cache_miss_tokens`

适合当前项目的场景：

1. 同一套长系统提示词反复出题
2. 长文档导入时的重复前缀
3. 批量核题、批量评分

对项目的建议：

- 记录 `usage`，后续在调试面板或日志里展示缓存命中

来源：

- [上下文硬盘缓存](https://api-docs.deepseek.com/zh-cn/guides/kv_cache/)

## 10. 错误与限流

官方 FAQ 给出的实用结论：

1. API 默认 `stream=false`，网页端通常用流式，所以 API 体感可能更慢
2. 在高负载下，可能收到 `429` 或 `503`
3. 非流式请求可能持续返回空行；流式请求可能返回 `: keep-alive` 注释

对当前项目的建议：

1. 前端解析流时必须忽略空行和 keep-alive
2. 长任务一律优先流式
3. `429 / 503` 要做用户可理解的错误提示
4. 文档导入和 AI 出题都要支持中断和重试

来源：

- [常见问题](https://api-docs.deepseek.com/zh-cn/faq)

## 11. 当前仓库里的推荐接入方式

结合当前项目结构，建议把 DeepSeek API 规范应用成下面这套固定策略。

### 11.1 AI 出题

推荐：

- 接口：`POST /chat/completions`
- 模型：`deepseek-chat`
- 开启：`response_format: { type: "json_object" }`
- 是否流式：生成多题时建议 `stream=true`

原因：

- 结构化输出稳定
- 成本更低
- 响应更快

### 11.2 AI 解释

推荐：

- 简单解释：`deepseek-chat`
- 复杂解释：`deepseek-reasoner`

说明：

- 如果只做快速讲解，用 `deepseek-chat`
- 如果是复杂阅读理解、案例分析、综合题解释，再切 `reasoner`

### 11.3 AI 主观题批改

推荐：

- 接口：`POST /chat/completions`
- 模型：`deepseek-reasoner`
- 输出：`json_object`

原因：

- 需要更强推理和评分说明

### 11.4 AI 核题

推荐：

- 接口：`POST /chat/completions`
- 模型：`deepseek-reasoner`
- 输出：`json_object`

原因：

- 需要判断题目是否规范、是否有歧义、答案是否合理

### 11.5 PDF / DOCX 直导入结构化

推荐：

- 接口：`POST /chat/completions`
- 模型：`deepseek-chat`
- 输出：`json_object`
- 输入：已提取文本 + 科目协议 + 题型约束

原因：

- 这是结构化解析任务，不一定需要最强推理
- 更看重稳定 JSON 和成本

## 12. 当前仓库建议新增的统一配置项

为了支持不同场景自动选模型，建议未来在设置层增加：

```ts
{
  apiKey: string,
  baseUrl: string,
  defaultModel: string,
  generationModel: string,
  explanationModel: string,
  gradingModel: string,
 auditModel: string
}
```

对应场景：

- `generationModel`：AI 出题 / 文档结构化
- `explanationModel`：AI 解释
- `gradingModel`：主观题评分
- `auditModel`：AI 核题

## 13. 当前项目调用规范建议

### 13.1 必须做

1. 结构化输出必须启用 `json_object`
2. prompt 中必须显式出现 `json`
3. 长响应必须显式设置 `max_tokens`
4. 所有调用都要记录 `model` 与 `usage`
5. 流式解析必须跳过空行和 keep-alive

### 13.2 不建议做

1. 不要默认把所有任务都切到 `deepseek-reasoner`
2. 不要在主业务链里依赖 Beta 功能
3. 不要把 `reasoning_content` 在普通多轮对话里原样塞回下一轮
4. 不要把 FIM 当成题库主链

## 14. 本仓库落地建议

### 14.1 当前实现现状

当前仓库里的 DeepSeek 接入主文件是：

- [src/shared/api/deepseekClient.js](E:\VorinsFile\BaiduSyncdisk\Github项目\quiz-react-app\src\shared\api\deepseekClient.js)

默认值：

- `baseUrl = https://api.deepseek.com`
- `model = deepseek-chat`

这和当前项目实际主要用途是一致的：

- AI 出题
- 结构化 JSON 输出
- 流式题目生成

### 14.2 后续推荐改动

1. 把单一 `ai:deepseekModel` 扩成按场景配置
2. 在设置页加入模型用途说明
3. 在日志/调试区展示 `usage`
4. 给 `429 / 503 / 402` 做统一错误映射

## 15. 参考来源

主要参考的 DeepSeek 官方文档页面：

1. [首次调用 API](https://api-docs.deepseek.com/zh-cn/)
2. [DeepSeek API 总览](https://api-docs.deepseek.com/zh-cn/api/deepseek-api)
3. [对话补全 /chat/completions](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/)
4. [FIM 补全 /completions](https://api-docs.deepseek.com/zh-cn/api/create-completion)
5. [列出模型 /models](https://api-docs.deepseek.com/zh-cn/api/list-models)
6. [模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
7. [JSON Output](https://api-docs.deepseek.com/zh-cn/guides/json_mode/)
8. [思考模式](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode)
9. [推理模型 (deepseek-reasoner)](https://api-docs.deepseek.com/zh-cn/guides/reasoning_model)
10. [Tool Calls](https://api-docs.deepseek.com/zh-cn/guides/tool_calls)
11. [上下文硬盘缓存](https://api-docs.deepseek.com/zh-cn/guides/kv_cache/)
12. [常见问题](https://api-docs.deepseek.com/zh-cn/faq)
