# WPS 机器人卡片推送说明

## 当前现象

- **Markdown 推送**：可正常送达（`msgtype: "markdown"`, `markdown: { text: "..." }`）。
- **卡片推送**：仍返回 `InvalidArgument`，因此已做**自动降级**：卡片失败时改用 Markdown 再发一次，保证简报能送达。

## 为什么卡片依旧不行（可能原因）

WPS 开放平台对「**发送卡片**」和「**回调返回卡片**」的格式可能不一致，且公开文档里「webhook 发送卡片」的完整请求体示例较少，容易出现参数不匹配。

### 1. 发送 vs 回调 的格式差异

| 场景 | 当前用法 | 说明 |
|------|----------|------|
| **我们 → WPS（发送）** | `msgtype: "card"`, `card: { config, i18n_items: [ { key: "zh-CN", value: { header, elements } } ] }` | 按文档「消息卡片总体结构」：config + i18n_items，且 value 内含 header、elements。 |
| **WPS → 我们（回调）** | `content.card.i18n_items: { zh_CN: [ ... ] }`（对象、下划线、直接组件数组，无 header/elements） | 见 `app/api/webhook/wps-card/route.ts`。 |

也就是说：**回调**里用的是「对象 + zh_CN + 直接组件数组」，**发送**我们按文档用的是「数组 + zh-CN + value 里带 header/elements」。若发送接口实际期望的格式和文档或回调不一致，就会报 InvalidArgument。

### 2. 可能不一致的点

- **语言 key**：文档示例为 `"zh-CN"`，回调里为 `zh_CN`，发送接口可能只认其中一种。
- **i18n_items 结构**：是数组 `[{ key, value }]` 还是对象 `{ "zh_CN": { header, elements } }` 或 `{ "zh_CN": [ ... ] }`，需以实际发送接口为准。
- **顶层字段**：部分接口要求 `msg_type`、或把卡片放在 `content.card` 下，需对照「webhook 发送」文档。
- **config**：如 `processing_state`、`shared_card` 的类型或枚举值若不符合，也可能导致 InvalidArgument。
- **组件结构**：如 `action`、`button`、`markdown` 等组件的必填字段或层级与文档有细微差异。

## 建议排查方式

1. **查 WPS 官方「机器人 webhook - 发送消息」文档**  
   打开 [WPS 开放平台 / 365 文档](https://365.kdocs.cn/3rd/open/documents/app-integration-dev/guide/robot/webhook)（或 open.wps.cn 对应入口），找到「发送卡片」的**完整请求体示例**，和当前 `inngest/functions/daily-digest.ts` 里构造的 `payload` 逐字段对比。
2. **用消息卡片编辑器**  
   若文档提到「消息卡片编辑器」或类似工具，用其导出一份「发送用」的 JSON，与当前代码里 `card` 的结构对比（尤其是 config、i18n_items、header、elements、组件 tag）。
3. **抓包或看响应体**  
   卡片失败时，Inngest 日志里会打印 `body=...`（响应前 500 字）。若 WPS 在 body 里返回了更具体的错误码或字段名，可据此调整对应字段。
4. **联系 WPS 支持**  
   若文档没有「webhook 发送卡片」的完整示例，可向 open@wps.cn 或文档中的支持渠道索要：**webhook 发送卡片消息的请求体 JSON 示例**（含 config、i18n_items、header、elements）。

## 当前代码策略

- 先按文档发送**卡片**；若返回失败（如 InvalidArgument），则**自动用同内容以 Markdown 再发一次**，确保简报能推送成功。
- 卡片格式按你提供的「消息卡片总体结构」与示例实现；若后续拿到官方「发送」示例，只需在 `daily-digest.ts` 里把 `payload` 改成与示例一致即可，无需改降级逻辑。
