# Vercel 部署指南

## 🚀 快速部署步骤

### 第1步：访问 Vercel

打开浏览器，访问：https://vercel.com

### 第2步：登录/注册

使用 GitHub 账号登录（推荐）

### 第3步：导入项目

1. 点击 **【New Project】** 或 **【Add New...】→【Project】**
2. 在 "Import Git Repository" 中，找到您的仓库：`xu29422-design/weave-rss`
3. 点击 **【Import】**

### 第4步：配置项目

在项目配置页面：

#### Framework Preset（框架预设）
- 自动检测为：**Next.js**

#### Root Directory（根目录）
- 保持默认：`./`

#### Build and Output Settings（构建设置）
- 保持默认即可

### 第5步：配置环境变量（重要！）

点击 **【Environment Variables】**，添加以下环境变量：

#### 必需的环境变量

```
# Vercel KV 数据库（自动配置，无需手动添加）
KV_REST_API_URL=<自动配置>
KV_REST_API_TOKEN=<自动配置>

# AI 服务配置
GOOGLE_GENERATIVE_AI_API_KEY=<您的 Google API Key>
```

#### 可选的环境变量

```
# 如果使用 OpenAI
OPENAI_API_KEY=<您的 OpenAI API Key>
OPENAI_BASE_URL=<自定义 OpenAI Base URL>
```

**注意**：
- 如果您没有配置 Vercel KV，需要先在 Vercel 项目中添加 KV Storage
- 具体步骤见下方"添加 Vercel KV"部分

### 第6步：部署

1. 点击 **【Deploy】** 按钮
2. 等待部署完成（通常需要 2-3 分钟）
3. 部署成功后，您会看到项目域名，例如：
   ```
   https://weave-rss.vercel.app
   ```

---

## 📦 添加 Vercel KV（数据存储）

### 方法1：在部署时添加

1. 在项目配置页面，找到 **【Storage】** 或 **【Add-ons】**
2. 点击 **【Create】**
3. 选择 **【KV】**
4. 输入数据库名称，例如：`weave-rss-kv`
5. 点击 **【Create】**
6. Vercel 会自动添加环境变量

### 方法2：部署后添加

1. 进入项目 Dashboard
2. 点击 **【Storage】** 标签
3. 点击 **【Create Database】**
4. 选择 **【KV】**
5. 创建后，点击 **【Connect】**
6. 选择您的项目
7. 环境变量会自动添加

---

## 🔧 部署后配置

### 1. 获取您的线上 API 地址

部署成功后，您的 API 地址为：
```
https://your-project-name.vercel.app/api/digest/latest
```

例如：
```
https://weave-rss.vercel.app/api/digest/latest
```

### 2. 测试 API

在浏览器中访问：
```
https://your-domain.vercel.app/api/digest/latest?userId=1159370261@qq.com&apiKey=wps_1770173096274_b4pz5s&days=1
```

应该返回：
```json
{
  "success": true,
  "data": {
    "totalItems": 0,
    "items": [],
    "message": "暂无数据"
  }
}
```

### 3. 更新 AirScript 配置

修改 `RSS简报自动导入.js` 的配置：

```javascript
// 修改前（本地）
var API_URL = 'http://localhost:3000';

// 修改后（线上）
var API_URL = 'https://weave-rss.vercel.app';  // 改为您的实际域名
```

---

## 🔄 更新部署

### 自动部署（推荐）

Vercel 已经配置了自动部署：
1. 本地修改代码
2. 提交到 Git：`git add . && git commit -m "更新"`
3. 推送到 GitHub：`git push`
4. Vercel 会自动检测并部署

### 手动重新部署

1. 进入 Vercel 项目 Dashboard
2. 点击 **【Deployments】** 标签
3. 找到最新的部署
4. 点击右侧的三个点
5. 选择 **【Redeploy】**

---

## ⚙️ 环境变量配置位置

在 Vercel 项目中：
1. 进入项目 Dashboard
2. 点击 **【Settings】** 标签
3. 点击左侧 **【Environment Variables】**
4. 添加/修改环境变量
5. 点击 **【Save】**
6. 重新部署项目以应用更改

---

## 🌐 自定义域名（可选）

### 添加自定义域名

1. 进入项目 Dashboard
2. 点击 **【Settings】** 标签
3. 点击左侧 **【Domains】**
4. 输入您的域名，例如：`rss.yourdomain.com`
5. 按照提示配置 DNS
6. 等待 DNS 生效（通常 5-30 分钟）

配置完成后，您可以使用自定义域名访问：
```
https://rss.yourdomain.com/api/digest/latest
```

---

## 🐛 常见问题

### 问题1：部署失败 - 环境变量缺失

**错误信息**：
```
Error: Missing required environment variables
```

**解决方案**：
1. 检查是否配置了所有必需的环境变量
2. 确保添加了 Vercel KV Storage
3. 重新部署

### 问题2：KV 连接失败

**错误信息**：
```
Error: @vercel/kv: Missing required environment variables
```

**解决方案**：
1. 在项目中添加 KV Storage
2. 确保 KV 已连接到当前项目
3. 检查环境变量 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 是否存在

### 问题3：API 返回 404

**可能原因**：
- 部署未完成
- 路由配置错误

**解决方案**：
1. 等待部署完全完成
2. 检查 API 路径是否正确：`/api/digest/latest`
3. 查看 Vercel 部署日志

### 问题4：CORS 错误

**解决方案**：
API 已经配置为允许所有域名访问，不应该有 CORS 问题。

---

## 📊 监控和日志

### 查看部署日志

1. 进入项目 Dashboard
2. 点击 **【Deployments】** 标签
3. 点击具体的部署
4. 查看 **【Building】** 和 **【Function Logs】**

### 查看运行时日志

1. 进入项目 Dashboard
2. 点击 **【Functions】** 标签
3. 选择具体的函数
4. 查看实时日志

---

## ✅ 部署检查清单

部署前确认：
- [ ] 代码已提交到 GitHub
- [ ] GitHub 仓库可以访问
- [ ] 有 Google Gemini API Key（或 OpenAI API Key）

部署时配置：
- [ ] 添加了 Vercel KV Storage
- [ ] 配置了环境变量（AI API Key）
- [ ] 项目框架正确识别为 Next.js

部署后验证：
- [ ] 访问主页正常：`https://your-domain.vercel.app`
- [ ] 测试 API 正常：`https://your-domain.vercel.app/api/digest/latest?userId=xxx`
- [ ] 更新了 AirScript 中的 API_URL

---

## 🎯 部署完成后的步骤

1. ✅ 获取 Vercel 提供的域名
2. ✅ 测试 API 是否可以访问
3. ✅ 更新 `RSS简报自动导入.js` 中的 `API_URL`
4. ✅ 在 WPS 中重新运行 AirScript
5. ✅ 验证数据导入成功

---

**准备好了就开始部署吧！** 🚀

有任何问题随时告诉我！
