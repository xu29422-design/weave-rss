# WPS 多维表格推送配置说明

## 功能概述

现在系统支持将 RSS 推送数据同时发送到：
1. **机器人 Webhook**（原有功能）
2. **WPS 多维表格**（新增功能）

每条高质量的内容都会作为一条记录推送到 WPS 多维表格中。

## 前置准备

### 1. 在 WPS 开放平台创建应用

1. 访问 [WPS 开放平台](https://open.kdocs.cn/)
2. 创建应用，获取：
   - **App ID**（应用 ID）
   - **App Secret**（应用密钥）

### 2. 创建 WPS 多维表格

1. 在 WPS 中创建一个多维表格（数据库表格）
2. 从多维表格的 URL 中提取 **File Token**
   - 例如：`https://www.kdocs.cn/wo/sl/xxxxx` 中的 `xxxxx` 就是 File Token
3. 获取 **Table ID**（数据表 ID）
   - 在多维表格中，每个数据表都有一个唯一的 Table ID

### 3. 配置多维表格字段

建议在多维表格中创建以下字段（字段名需要与代码中的字段名匹配）：

- **标题**（文本类型）- 存储文章标题
- **内容**（文本类型）- 存储文章内容
- **摘要**（文本类型，可选）- 存储文章摘要
- **来源**（文本类型，可选）- 存储文章来源 URL
- **发布时间**（日期时间类型，可选）- 存储文章发布时间
- **推送时间**（日期时间类型，自动）- 记录推送到表格的时间

## 配置方法

### 方式一：通过代码配置（推荐用于测试）

在 `lib/redis.ts` 中，`PushChannel` 接口已支持 WPS 多维表格配置：

```typescript
{
  id: "channel_wps_001",
  type: "wps-dbsheet",
  name: "WPS 多维表格推送",
  wpsAppId: "你的 App ID",
  wpsAppSecret: "你的 App Secret",
  wpsFileToken: "你的 File Token",
  wpsTableId: "你的 Table ID",
  enabled: true,
  createdAt: new Date().toISOString()
}
```

### 方式二：通过数据库直接配置

可以通过 Redis/KV 存储直接添加推送渠道配置。

## 工作原理

1. **数据收集**：系统每天定时收集 RSS 源的新内容
2. **AI 分析**：使用 AI 对内容进行分析和筛选
3. **双重推送**：
   - 推送到机器人 Webhook（发送 Markdown 格式的简报）
   - 推送到 WPS 多维表格（每条高质量内容作为一条记录）

## 推送数据格式

推送到 WPS 多维表格的记录格式：

```json
{
  "标题": "文章标题",
  "内容": "文章完整内容",
  "摘要": "AI 生成的摘要（如果有）",
  "来源": "文章原始 URL",
  "发布时间": "2024-01-01T00:00:00.000Z",
  "推送时间": "2024-01-01T12:00:00.000Z"
}
```

## API 端点

### 获取访问令牌
```
POST https://open.kdocs.cn/api/v1/openapi/oauth/token
```

### 创建记录
```
POST https://open.kdocs.cn/api/v1/openapi/dbsheet/{fileToken}/tables/{tableId}/records
```

## 注意事项

1. **字段名匹配**：确保多维表格中的字段名与代码中的字段名完全一致（区分大小写）
2. **权限配置**：确保 WPS 应用有权限访问和写入指定的多维表格
3. **API 限制**：注意 WPS 开放平台的 API 调用频率限制
4. **错误处理**：如果某条记录推送失败，系统会继续推送其他记录，并在日志中记录错误

## 故障排查

### 问题：推送失败，提示"获取访问令牌失败"
- 检查 App ID 和 App Secret 是否正确
- 确认应用状态是否正常

### 问题：推送失败，提示"创建记录失败"
- 检查 File Token 和 Table ID 是否正确
- 确认应用是否有写入权限
- 检查字段名是否匹配

### 问题：部分记录推送成功，部分失败
- 查看日志了解具体失败原因
- 可能是字段类型不匹配或数据格式问题

## 相关文档

- [WPS 开放平台文档](https://365.kdocs.cn/3rd/open/documents/app-integration-dev/guide/dbsheet/AirScript/AirScript-instro)
- [WPS 多维表格 API 文档](https://open.kdocs.cn/)

## 代码位置

- API 客户端：`lib/wps-dbsheet-api.ts`
- 推送逻辑：`inngest/functions/daily-digest.ts`
- 数据模型：`lib/redis.ts`
