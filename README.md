# 🧶 Weave - AI 驱动的 RSS 情报聚合系统

> **Read Less, Know More.** 您的私人 AI 情报助理

## 📋 项目简介

Weave 是一款基于 AI 的自动化情报处理系统。它能够自动聚合您关注的 RSS 订阅源，通过大语言模型（Gemini / OpenAI / 智谱 AI）进行深度精读、打分和总结，并在每天早晨为您生成一份结构化的情报简报，直达您的协作机器人（WPS、企业微信、飞书、钉钉等）。

### 核心价值

- **自动化**：无需手动阅读，系统自动抓取、分析、总结
- **智能化**：AI 深度理解内容，自动分类和评分
- **个性化**：支持自定义主题订阅、AI 提示词、推送时间
- **高效性**：多层筛选机制，只推送高价值内容

---

## ✨ 核心功能

### 1. 智能 RSS 聚合
- 支持订阅全球任意高质量 RSS/Atom 资讯源
- 自动抓取 24 小时内的最新内容
- 智能去重（标题语义去重 + URL 去重）
- 支持自定义 RSS 源和预设主题订阅

### 2. AI 深度分析
- **多层筛选机制**：
  - 基础过滤：黑名单关键词、标题长度、时间过滤
  - AI 预筛选：从海量标题中选出最值得分析的 20 条
  - AI 深度分析：单条新闻打分（1-10 分）、分类、摘要
- **Map-Reduce 架构**：
  - Map 阶段：并发分析单条新闻，生成结构化数据
  - Reduce 阶段：按分类聚合，生成深度综述
- **智能分类**：自动归类为 AI Tech、Product、Market、Coding、Other

### 3. 超级订阅功能
- 支持关键词全网检索（Google News + Twitter/X）
- 关键词优先排序，确保相关内容优先展示
- 在已订阅区域可视化展示订阅的关键词

### 4. 结构化简报生成
- 自动生成"今日焦点"（TL;DR）
- 按行业赛道分类生成深度综述
- 自动控制字数（最大 5000 字，超长自动精简）
- 保留所有原文链接，方便追溯

### 5. 多渠道推送
- 支持 WPS 机器人（Markdown 格式）
- 支持企业微信、飞书、钉钉等 Webhook
- 自定义推送时间（默认工作日 8 点）
- 自定义推送日期（默认周一到周五）

### 6. 用户系统
- 用户注册/登录（JWT 认证）
- 用户数据隔离（基于 Redis）
- 个人配置管理
- 推送日志记录

### 7. 极致自定义
- 支持在线编辑 AI 提示词（Analyst、Editor、TL;DR）
- 支持多种 AI 模型（Gemini、OpenAI、智谱 AI）
- 可配置 AI 提供商和模型参数
- 支持自定义项目名称

---

## 🛠️ 技术架构

### 技术栈

| 技术 | 说明 |
|------|------|
| **框架** | Next.js 14 (App Router) + TypeScript |
| **AI 引擎** | Vercel AI SDK (支持 Gemini 1.5 Flash, GPT-4o, 智谱 AI 等) |
| **任务调度** | Inngest (事件驱动的 Serverless 工作流) |
| **存储** | Vercel KV (Redis) - 用户数据、配置、去重记录 |
| **UI 框架** | React + Tailwind CSS + Framer Motion |
| **认证** | JWT (jsonwebtoken) |
| **RSS 解析** | rss-parser |

### 系统架构

```
┌─────────────────┐
│   Next.js App   │
│  (Frontend +    │
│   API Routes)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼────┐      ┌──────▼──────┐
    │  Inngest│      │ Vercel KV  │
    │ Scheduler│     │  (Redis)   │
    └────┬────┘      └────────────┘
         │
    ┌────▼──────────────────┐
    │  Daily Digest Worker  │
    │  1. Fetch RSS         │
    │  2. AI Analysis       │
    │  3. Generate Report   │
    │  4. Push Webhook      │
    └───────────────────────┘
```

### 核心工作流

1. **定时触发**：Inngest 每小时检查用户推送时间
2. **RSS 抓取**：并行抓取所有订阅源，过滤 24 小时内内容
3. **去重处理**：标题语义去重 + URL 去重（Redis 记录）
4. **AI 预筛选**：从海量标题中选出最值得分析的 20 条
5. **AI 深度分析**：单条新闻打分、分类、摘要（串行处理，避免并发超限）
6. **内容生成**：生成 TL;DR + 分类综述（串行生成，避免并发超限）
7. **推送交付**：发送到配置的 Webhook URL

---

## 📁 项目结构

```
rss抓取/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证相关（登录、注册、登出）
│   │   └── inngest/              # Inngest 服务端点
│   ├── admin/                    # 管理员页面
│   ├── auth/                     # 登录/注册页面
│   ├── config/                   # 配置页面
│   │   ├── actions.ts            # 配置相关 Server Actions
│   │   └── admin-actions.ts      # 管理员操作
│   ├── dashboard/                # 仪表板（主题订阅、已订阅）
│   ├── home/                     # 首页
│   └── layout.tsx                # 根布局
├── components/                   # React 组件
│   ├── AnimatedIcons.tsx         # 动画图标
│   └── GlobalBackground.tsx     # 全局背景
├── inngest/                      # Inngest 工作流
│   ├── client.ts                 # Inngest 客户端配置
│   └── functions/
│       └── daily-digest.ts       # 每日简报生成工作流
├── lib/                          # 核心库
│   ├── ai-prompts.ts             # AI 提示词定义
│   ├── ai-service.ts             # AI 服务（分析、生成、筛选）
│   ├── auth.ts                   # 认证工具函数
│   ├── redis.ts                  # Redis/KV 操作（配置、RSS 源、日志）
│   └── rss-utils.ts              # RSS 抓取和去重工具
├── package.json                  # 项目依赖
├── README.md                     # 项目说明
├── 产品方案.md                    # 产品需求文档
├── 技术架构.md                    # 技术架构文档
└── 项目说明.md                    # 项目说明（中文，本文档）
```

---

## 🔄 核心流程详解

### RSS 订阅与筛选流程

#### 第一层：基础抓取与预过滤
1. **抓取限制**：
   - 每个 RSS 源最多抓取 50 条
   - 所有源合并后最多 100 条
   - 只保留 24 小时内的内容

2. **基础过滤**：
   - 黑名单关键词：推广、广告、招聘等
   - 标题长度：少于 4 字的标题被过滤
   - 超级订阅关键词：如果设置了关键词，相关文章优先排序

3. **去重机制**：
   - 标题语义去重：使用余弦相似度（阈值 0.75）去除相似标题
   - URL 去重：使用 Redis 记录已推送的 URL（7 天有效期）

#### 第二层：AI 预筛选
- 从所有新文章中选出最多 20 条进行深度分析
- 使用 AI 模型（glm-4-flash）进行语义去重和质量筛选
- 如果设置了超级订阅关键词，优先保留相关内容

#### 第三层：AI 深度分析
- 对每条新闻进行：
  - **分类**：AI Tech、Product、Market、Coding、Other
  - **评分**：1-10 分（衡量对行业从业者的参考价值）
  - **摘要**：提炼核心内容（100 字以内）
- 串行处理，避免并发超限
- 当前实现：已移除评分过滤，所有文章都会进入最终简报

#### 第四层：内容生成与组装
- 生成"今日焦点"（TL;DR）
- 按分类生成详细综述
- 如果超过 4800 字，进行 AI 精简（最多尝试 2 次）
- 如果依然超长，进行硬截断（保底方案）

### 定时推送流程

1. **调度器**（`dailyScheduler`）：
   - 每小时整点执行（Cron: `0 * * * *`）
   - 获取所有活跃用户
   - 检查每个用户的推送时间和推送日期
   - 如果匹配，发送 `digest/generate` 事件

2. **工作器**（`digestWorker`）：
   - 监听 `digest/generate` 事件
   - 获取用户配置和 RSS 源
   - 执行完整的 RSS 抓取、分析、生成流程
   - 推送到用户的 Webhook URL

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Vercel 账号（用于部署）
- Inngest 账号（用于任务调度）
- Vercel KV（Redis 存储）

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd rss抓取

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 创建 .env.local 文件，添加以下变量：
# KV_REST_API_URL=your_kv_url
# KV_REST_API_TOKEN=your_kv_token
# JWT_SECRET=your_jwt_secret
# INNGEST_EVENT_KEY=your_inngest_event_key
# INNGEST_SIGNING_KEY=your_inngest_signing_key

# 4. 启动开发服务器
npm run dev

# 5. 启动 Inngest 开发服务器（另一个终端）
npm run inngest
```

### 部署到 Vercel

1. **连接 GitHub 仓库**
   - 在 Vercel 中导入项目
   - 自动检测 Next.js 配置

2. **配置环境变量**
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`：从 Vercel KV 获取
   - `JWT_SECRET`：32 位随机字符串
   - `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`：从 Inngest 控制台获取

3. **配置 Inngest**
   - 在 Inngest 控制台连接应用：`https://your-app.vercel.app/api/inngest`
   - 工作流将自动注册并开始运行

---

## 📝 配置说明

### 用户配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `aiProvider` | AI 提供商 | `google` 或 `openai` |
| `geminiApiKey` | Gemini API Key | - |
| `openaiApiKey` | OpenAI API Key | - |
| `openaiBaseUrl` | OpenAI Base URL | - |
| `openaiModel` | OpenAI 模型 | - |
| `webhookUrl` | Webhook 推送地址 | - |
| `pushTime` | 推送时间（0-23） | `8` |
| `pushDays` | 推送日期（0-6，0=周日） | `[1,2,3,4,5]` |
| `superSubKeyword` | 超级订阅关键词 | - |
| `analystPrompt` | 分析员提示词 | 默认提示词 |
| `editorPrompt` | 编辑提示词 | 默认提示词 |
| `tldrPrompt` | TL;DR 提示词 | 默认提示词 |

### RSS 源配置

- 支持标准 RSS 2.0 和 Atom 格式
- 每行一个 URL
- 支持预设主题订阅（科技专栏、股价/财经、全球新闻等）
- 支持自定义 RSS 源
- 支持超级订阅（关键词全网检索）

---

## 🔐 安全特性

- **用户隔离**：基于 Redis 的用户数据隔离
- **JWT 认证**：安全的用户认证机制
- **密码加密**：使用 bcryptjs 加密密码
- **API Key 保护**：用户 API Key 存储在私有数据库

---

## 📊 性能优化

1. **并发控制**：
   - AI 分析串行处理，避免并发超限
   - 分类综述串行生成，避免并发超限
   - 智能延迟机制（智谱 300ms，Gemini 100ms）

2. **去重优化**：
   - 使用 Redis Pipeline 批量查询
   - 标题语义去重（内存中完成）
   - URL 去重（Redis 记录，7 天有效期）

3. **成本控制**：
   - 使用廉价模型进行预筛选
   - 限制分析数量（最多 20 条）
   - 限制抓取数量（单源 50 条，总量 100 条）

4. **容错机制**：
   - AI 请求重试（指数退避）
   - RSS 抓取失败不影响整体流程
   - 内容超长自动精简

---

## 🎯 使用场景

1. **行业情报收集**：自动追踪行业动态，生成每日简报
2. **竞品监控**：订阅竞品相关 RSS 源，及时了解动态
3. **技术趋势追踪**：关注技术博客和新闻，掌握最新趋势
4. **市场分析**：聚合财经新闻，生成市场分析报告
5. **个性化资讯**：通过超级订阅功能，追踪特定关键词

---

## 🔧 故障排查

### 常见问题

1. **Inngest 工作流未触发**
   - 检查 Inngest 控制台连接状态
   - 确认 Cron 表达式配置正确
   - 检查用户推送时间设置

2. **RSS 抓取失败**
   - 检查 RSS 源 URL 是否有效
   - 确认网络连接正常
   - 查看日志了解具体错误

3. **AI 分析失败**
   - 检查 API Key 是否有效
   - 确认 API 配额未超限
   - 查看错误日志了解详情

4. **推送失败**
   - 检查 Webhook URL 是否正确
   - 确认 Webhook 格式符合要求（WPS 需要 Markdown 格式）
   - 查看推送日志了解错误信息

---

## 📄 许可证

MIT License © 2026 Weave

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📮 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 项目管理员

---

**最后更新**：2026-01-30
