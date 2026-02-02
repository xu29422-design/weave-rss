# 获取轻维表 DBSheet ID 的方法

## 方法一：通过 API 获取（推荐）

### 步骤 1：获取访问令牌

使用以下信息获取访问令牌：
- App ID: `AK20260202WZVOLZ`
- App Secret: `c095602f29e116bf514922609bcc6104`

### 步骤 2：调用 Schema API

```bash
# 1. 获取访问令牌
curl -X POST https://open.kdocs.cn/api/v1/openapi/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "AK20260202WZVOLZ",
    "client_secret": "c095602f29e116bf514922609bcc6104"
  }'

# 2. 使用返回的 access_token 获取 Schema
curl -X GET "https://open.kdocs.cn/api/v1/openapi/light-table/files/cq6krGBLXZTU/schema" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json"
```

### 步骤 3：从响应中提取 DBSheet ID

从 Schema 响应中找到 `dbsheets` 数组，第一个数据表的 `id` 或 `dbsheet_id` 就是 DBSheet ID。

## 方法二：在轻维表中查看

1. 打开轻维表：http://kdocs.cn/l/cq6krGBLXZTU
2. 查看数据表设置
3. 在 URL 或设置中找到数据表 ID

## 方法三：通过 Weave 配置页面

1. 登录 Weave 系统（账号：1159370261@qq.com）
2. 进入配置页面
3. 找到"轻维表推送配置"模块
4. 如果 API 支持，可以点击"获取 Schema"按钮自动获取
5. 或者手动填写 DBSheet ID

## 注意事项

- DBSheet ID 通常是字符串格式
- 如果轻维表中只有一个数据表，通常使用第一个即可
- 如果获取失败，可以暂时留空，系统会在推送时尝试使用默认的第一个数据表

## 更新 DBSheet ID

获取到 DBSheet ID 后，可以通过以下方式更新：

### 方式 1：在配置页面更新
1. 登录 Weave
2. 进入配置页面
3. 找到"轻维表推送配置"
4. 填写 DBSheet ID
5. 保存

### 方式 2：通过 API 更新

```bash
curl -X POST http://localhost:3000/api/admin/update-kdocs \
  -H "Content-Type: application/json" \
  -d '{
    "username": "1159370261@qq.com",
    "kdocsAppId": "AK20260202WZVOLZ",
    "kdocsAppSecret": "c095602f29e116bf514922609bcc6104",
    "kdocsFileToken": "cq6krGBLXZTU",
    "kdocsDBSheetId": "YOUR_DBSHEET_ID_HERE"
  }'
```
