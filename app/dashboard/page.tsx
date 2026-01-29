"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, Cpu, Newspaper, Book, Gamepad2, LineChart, 
  Clock, CheckCircle2, Plus, User, LogOut, Settings2, 
  Heart, Zap, LayoutGrid, Bell, ArrowRight, Loader2, Rss,
  Palette, Bitcoin, Code2, Activity, BrainCircuit, Search, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCurrentConfig, persistSettings, persistRSS } from "../config/actions";
import { pushToAdminBot } from "../config/admin-actions";

// 类型定义
type ThemeStyle = 'tech' | 'finance' | 'paper' | 'chat' | 'card' | 'minimal';

interface ThemePreviewItem {
  title?: string;
  meta?: string;
  value?: string;
  trend?: 'up' | 'down';
  snippet?: string;
  role?: 'user' | 'ai';
  content?: string;
  tag?: string;
  color?: string;
  author?: string;
}

interface Theme {
  id: string;
  title: string;
  desc: string;
  category: string;
  icon: React.ReactNode;
  style: ThemeStyle;
  color: string;
  sources: string[];
  preview: ThemePreviewItem[];
}

// 预设主题数据，增加样式配置
const PRESET_THEMES: Theme[] = [
  {
    id: "tech",
    title: "科技专栏",
    desc: "追踪全球最前沿的科技动态与商业趋势",
    category: "tech",
    icon: <Cpu className="w-5 h-5" />,
    style: "tech", // 终端风格
    color: "from-blue-400 to-cyan-300",
    sources: [
      "https://techcrunch.com/feed/",
      "https://www.theverge.com/rss/index.xml",
      "https://news.ycombinator.com/rss"
    ],
    preview: [
      { title: "OpenAI 发布 GPT-5 预览版", meta: "Breaking · 2m ago" },
      { title: "NVIDIA H200 芯片开始出货", meta: "Hardware · 1h ago" },
      { title: "SpaceX 星舰完成轨道测试", meta: "Space · 3h ago" },
      { title: "Linux Kernel 6.8 Released", meta: "Software · 5h ago" }
    ]
  },
  {
    id: "finance",
    title: "股价/财经",
    desc: "实时把握市场脉搏与宏观经济指标",
    category: "tech",
    icon: <LineChart className="w-5 h-5" />,
    style: "finance", // 数据看板风格
    color: "from-green-400 to-emerald-300",
    sources: [
      "https://www.cnbc.com/id/100003114/device/rss/rss.html",
      "https://feeds.bloomberg.com/markets/news.rss",
      "https://www.wsj.com/xml/rss/3_7014.xml"
    ],
    preview: [
      { title: "NASDAQ", value: "+2.4%", trend: "up" },
      { title: "BTC/USD", value: "$98,000", trend: "up" },
      { title: "TSLA", value: "-1.2%", trend: "down" },
      { title: "AAPL", value: "+0.5%", trend: "up" },
      { title: "GOLD", value: "$2,150", trend: "up" }
    ]
  },
  {
    id: "news",
    title: "全球新闻",
    desc: "每日重要新闻汇总，直击现场",
    category: "tech",
    icon: <Newspaper className="w-5 h-5" />,
    style: "paper", // 报纸风格
    color: "from-gray-400 to-slate-300",
    sources: [
      "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "http://feeds.bbci.co.uk/news/rss.xml",
      "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best"
    ],
    preview: [
      { title: "Global Climate Summit Reaches Historic Agreement", snippet: "Nations agree to phase out coal by 2030 in a landmark decision signed by 190 countries..." },
      { title: "2026 World Cup Hosts Announced", snippet: "FIFA reveals final selection of host cities across North America, with the final match set for New York..." }
    ]
  },
  {
    id: "ai",
    title: "AI 实验室",
    desc: "深度精读大模型、Agent 与 AI 应用进化",
    category: "tech",
    icon: <Sparkles className="w-5 h-5" />,
    style: "chat", // 对话气泡风格
    color: "from-purple-400 to-pink-300",
    sources: [
      "https://openai.com/blog/rss.xml",
      "https://research.google/blog/rss",
      "https://www.anthropic.com/index.xml"
    ],
    preview: [
      { role: "ai", content: "今日 AI 重点：DeepSeek 开源了新一代 MoE 模型，性能超越 Llama 3..." },
      { role: "user", content: "帮我总结一下它的核心架构变动。" },
      { role: "ai", content: "采用了 160B 参数的混合专家架构，激活参数仅 20B，推理速度提升 4 倍。" }
    ]
  },
  {
    id: "anime",
    title: "二次元",
    desc: "新番资讯、漫评与 ACG 圈内动态",
    category: "creative",
    icon: <Gamepad2 className="w-5 h-5" />,
    style: "card", // 卡片风格
    color: "from-orange-400 to-red-300",
    sources: [
      "https://www.animenewsnetwork.com/news/rss.xml",
      "https://kotaku.com/rss",
      "https://www.siliconera.com/feed/"
    ],
    preview: [
      { title: "《电锯人》剧场版定档", tag: "剧场版", color: "bg-orange-500" },
      { title: "2026 冬季新番一览", tag: "新番", color: "bg-blue-500" },
      { title: "任天堂新机型情报", tag: "游戏", color: "bg-red-500" },
      { title: "Comiket 105 参展社团数创新高", tag: "展会", color: "bg-purple-500" }
    ]
  },
  {
    id: "academic",
    title: "学术专栏",
    desc: "顶级期刊与前沿论文的智能摘要",
    category: "academic",
    icon: <Book className="w-5 h-5" />,
    style: "minimal", // 极简论文风格
    color: "from-indigo-400 to-blue-300",
    sources: [
      "https://www.nature.com/nature.rss",
      "https://www.science.org/rss/news_current.xml",
      "http://export.arxiv.org/rss/cs.AI"
    ],
    preview: [
      { title: "A New Approach to Brain-Computer Interfaces", author: "Nature · J. Smith et al." },
      { title: "Quantum Error Correction at Scale", author: "Science · Team Google" }
    ]
  },
  {
    id: "design",
    title: "设计灵感",
    desc: "UI/UX 趋势、排版美学与创意工具",
    category: "creative",
    icon: <Palette className="w-5 h-5" />,
    style: "minimal", 
    color: "from-pink-400 to-rose-300",
    sources: [
      "https://sidebar.io/feed.xml",
      "https://uxdesign.cc/feed",
      "https://www.smashingmagazine.com/feed"
    ],
    preview: [
      { title: "2026 Design Trends: Neomorphism Returns", author: "UX Collective" },
      { title: "The Psychology of Color in Branding", author: "Smashing Mag" }
    ]
  },
  {
    id: "crypto",
    title: "Web3 前沿",
    desc: "区块链技术、加密货币与去中心化应用",
    category: "tech",
    icon: <Bitcoin className="w-5 h-5" />,
    style: "finance",
    color: "from-yellow-400 to-orange-300",
    sources: [
      "https://cointelegraph.com/rss",
      "https://decrypt.co/feed",
      "https://www.coindesk.com/arc/outboundfeeds/rss/"
    ],
    preview: [
      { title: "ETH/USD", value: "$4,200", trend: "up" },
      { title: "SOL/USD", value: "$185", trend: "up" },
      { title: "DeFi TVL", value: "$85B", trend: "up" },
      { title: "NFT Vol", value: "-15%", trend: "down" }
    ]
  },
  {
    id: "indie",
    title: "独立开发",
    desc: "一人公司、SaaS 构建与增长黑客",
    category: "tech",
    icon: <Code2 className="w-5 h-5" />,
    style: "tech",
    color: "from-teal-400 to-emerald-300",
    sources: [
      "https://www.indiehackers.com/feed",
      "https://news.ycombinator.com/rss",
      "https://producthunt.com/feed"
    ],
    preview: [
      { title: "Launch: AI-powered Notion Template", meta: "ProductHunt · #1" },
      { title: "How I reached $10k MRR in 3 months", meta: "IndieHackers" },
      { title: "Stripe acquires new payment startup", meta: "TechCrunch" }
    ]
  },
  {
    id: "health",
    title: "健康生活",
    desc: "科学养生、健身指南与心理健康",
    category: "life",
    icon: <Activity className="w-5 h-5" />,
    style: "paper",
    color: "from-green-400 to-lime-300",
    sources: [
      "https://www.healthline.com/rss",
      "https://www.psychologytoday.com/us/feed",
      "https://tim.blog/feed/"
    ],
    preview: [
      { title: "The Science of Sleep: New Findings", snippet: "Researchers discover a new link between deep sleep cycles and long-term memory retention..." },
      { title: "Meditation vs. Medication for Anxiety", snippet: "A comparative study published in JAMA Psychiatry suggests mindfulness may be as effective as..." }
    ]
  },
  {
    id: "psychology",
    title: "认知心理",
    desc: "探索大脑奥秘、行为经济学与思维模型",
    category: "academic",
    icon: <BrainCircuit className="w-5 h-5" />,
    style: "minimal",
    color: "from-violet-400 to-purple-300",
    sources: [
      "https://fs.blog/feed/",
      "https://waitbutwhy.com/feed",
      "https://www.scientificamerican.com/rss/mind-and-brain.xml"
    ],
    preview: [
      { title: "The Dunning-Kruger Effect Revisited", author: "Scientific American" },
      { title: "Mental Models for Decision Making", author: "Farnam Street" }
    ]
  }
];

const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "tech", label: "科技与商业" },
  { id: "creative", label: "创意与设计" },
  { id: "life", label: "生活与健康" },
  { id: "academic", label: "学术与深度" }
];

// 渲染不同风格的预览组件
const ThemePreview = ({ theme }: { theme: Theme }) => {
  switch (theme.style) {
    case "tech":
      return (
        <div className="bg-white/10 rounded-2xl p-5 font-mono text-xs text-blue-50 shadow-inner border border-white/10 backdrop-blur-sm">
          <div className="flex gap-1.5 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
          </div>
          <div className="space-y-2.5 opacity-90">
            {theme.preview.map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-blue-300 shrink-0">$</span>
                <span className="truncate">
                  <span className="text-white font-bold">{item.title}</span>
                  <span className="text-white/90 ml-3">--{item.meta}</span>
                </span>
              </div>
            ))}
            <div className="animate-pulse text-blue-300">_</div>
          </div>
        </div>
      );
    case "finance":
      return (
        <div className="bg-white/10 rounded-2xl p-5 border border-white/10 shadow-inner backdrop-blur-sm space-y-2.5">
          {theme.preview.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="font-bold text-white text-xs">{item.title}</span>
              <span className={`text-xs font-mono font-black ${item.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {item.trend === 'up' ? '▲' : '▼'} {item.value}
              </span>
            </div>
          ))}
        </div>
      );
    case "paper":
      return (
        <div className="bg-white/10 rounded-2xl p-5 border border-white/10 shadow-inner backdrop-blur-sm font-serif">
          <div className="border-b border-white/10 pb-3 mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">The Daily Brief</div>
          </div>
          <div className="space-y-4">
            {theme.preview.map((item, i) => (
              <div key={i}>
                <h4 className="font-bold text-white text-sm leading-tight mb-1.5">{item.title}</h4>
                <p className="text-[10px] text-white/90 leading-relaxed line-clamp-2 italic">{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "chat":
      return (
        <div className="bg-white/10 rounded-2xl p-5 border border-white/10 shadow-inner backdrop-blur-sm space-y-4">
          {theme.preview.map((item, i) => (
            <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-[10px] font-medium leading-relaxed ${
                item.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 text-white border border-white/10 rounded-bl-none'
              }`}>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      );
    case "card":
      return (
        <div className="grid grid-cols-1 gap-2.5">
          {theme.preview.map((item, i) => (
            <div key={i} className="group/card relative overflow-hidden rounded-2xl bg-white/10 p-4 text-white border border-white/10 hover:border-blue-400/30 transition-all">
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent blur-2xl rounded-full -mr-10 -mt-10`} />
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-bold text-xs truncate mr-3 text-white">{item.title}</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${item.color} text-white shadow-lg`}>{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      );
    case "minimal":
      return (
        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 shadow-inner backdrop-blur-sm">
          <div className="space-y-5">
            {theme.preview.map((item, i) => (
              <div key={i} className="pl-4 border-l-2 border-white/20">
                <h4 className="font-bold text-white text-xs mb-1 tracking-tight">{item.title}</h4>
                <p className="text-[10px] text-white/90 italic font-medium">{item.author}</p>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
