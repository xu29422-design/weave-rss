# 🧶 Weave
> **Read Less, Know More.** 您的私人 AI 情报助理。

Weave 是一款基于 AI 的自动化情报处理系统。它能自动聚合您关注的 RSS 订阅源，通过大语言模型（Gemini / OpenAI）进行深度精读、打分和总结，并在每天早晨为您生成一份结构化的情报简报，直达您的邮箱或协作机器人。

---

## ✨ 核心特性

- **🔍 智能聚合**：支持订阅全球任意高质量 RSS/Atom 资讯源。
- **🧠 AI 深度精读**：采用 Map-Reduce 模式，对海量新闻进行单条打分、分类及 100 字核心摘要。
- **📋 结构化简报**：自动识别今日焦点，按行业赛道（AI、产品、技术等）生成精美 Markdown 报告。
- **🤖 多渠道推送**：完美兼容 WPS、企业微信、飞书、钉钉机器人以及电子邮箱。
- **⚙️ 极致自定义**：支持在线编辑 AI 提示词（Prompt），由您定义情报官的“大脑”。
- **🛡️ 隐私安全**：基于 Vercel KV 实现用户隔离，所有配置及阅读记录均加密存储于您的私有数据库。

---

## 🛠️ 技术架构

- **框架**：[Next.js 14 (App Router)](https://nextjs.org/)
- **AI 引擎**：[Vercel AI SDK](https://sdk.vercel.ai/) (支持 Gemini 1.5 Flash, GPT-4o, DeepSeek 等)
- **任务调度**：[Inngest](https://www.inngest.com/) (事件驱动的 Serverless 工作流)
- **存储**：[Vercel KV](https://vercel.com/storage/kv) (Redis)
- **UI 风格**：Radical Minimalism (激进极简主义) + Tailwind CSS

---

## 🚀 快速部署

### 1. 部署到 Vercel
点击下方按钮一键克隆并部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fweave-rss&project-name=weave-rss&repository-name=weave-rss&storage-type=kv)

### 2. 配置环境变量
在 Vercel 项目设置中添加以下变量：
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`: (由 Vercel Storage 自动生成)
- `JWT_SECRET`: 您的账号加密密钥（建议 32 位随机字符串）
- `INNGEST_SIGNING_KEY`: 从 Inngest 控制台获取

### 3. 配置 Inngest
1. 前往 [Inngest Cloud](https://www.inngest.com/) 注册。
2. 连接您的线上 App：`https://your-app.vercel.app/api/inngest`。
3. 工作流将自动按照 `daily-scheduler` 中定义的 Cron 表达式定时运行。

---

## 📝 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 Inngest Dev Server
npx inngest-cli@latest dev
```

---

## 📄 开源协议
MIT License © 2026 Weave.
