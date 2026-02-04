"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, Cpu, Newspaper, Book, Gamepad2, LineChart, 
  Clock, CheckCircle2, Plus, User, LogOut, Settings2, 
  Heart, Zap, LayoutGrid, Bell, ArrowRight, Loader2, Rss,
  Palette, Bitcoin, Code2, Activity, BrainCircuit, Search, X, Globe, AlertCircle
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [activeTab, setActiveTab] = useState<"shelf" | "settings" | "active">("shelf");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [thanksLoading, setThanksLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [subscribedThemeIds, setSubscribedThemeIds] = useState<string[]>([]);

  // 反馈弹窗状态
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<1 | 2 | 3 | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // 搜索和分类状态
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 超级订阅（Google News）状态
  const [isSuperSubModalOpen, setIsSuperSubModalOpen] = useState(false);
  const [superSubKeyword, setSuperSubKeyword] = useState("");

  // 订阅弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    webhookUrl: "",
    pushTime: "8",
    pushDays: [1, 2, 3, 4, 5] as number[]
  });

  // 添加自定义源弹窗状态
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [addSourceTargetThemeId, setAddSourceTargetThemeId] = useState<string | null>(null);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  // 存储每个主题的自定义源
  const [customThemeSources, setCustomThemeSources] = useState<Record<string, string[]>>({});
  

  useEffect(() => {
    async function init() {
      try {
        const response = await fetch("/api/auth/me");
        const authData = await response.json();
        if (!authData.authenticated) { router.push("/auth"); return; }
        setAuthenticated(true);
        setUsername(authData.username);

        const config = await fetchCurrentConfig();
        // 将 rssSources 数组转换为字符串并合并到 settings 中
        const settingsWithRss = {
          ...(config.settings || {}),
          rssUrls: config.rssSources ? config.rssSources.join("\n") : ""
        };
        setSettings(settingsWithRss);
        // 初始化已订阅主题列表
        setSubscribedThemeIds(config.settings?.subscribedThemes || []);
        // 初始化弹窗配置
        setModalConfig({
          webhookUrl: config.settings?.webhookUrl || "",
          pushTime: config.settings?.pushTime || "8",
          pushDays: config.settings?.pushDays || [1, 2, 3, 4, 5]
        });

        // 检查 URL 参数
        const tabParam = searchParams.get('tab');
        if (tabParam === 'active') {
          setActiveTab('active');
        }

      } catch (e) {
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, searchParams]);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleThanks = async () => {
    // 预设免费 API 配置
    const PRESET_FREE_API = {
      aiProvider: 'openai' as const,
      openaiApiKey: "fcd9114b61ff49259c8770eba426f6e5.eiMdQXWwcOi6SAu7",
      openaiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      openaiModel: "glm-4.5-flash"
    };

    setSettings({
      ...settings,
      ...PRESET_FREE_API
    });

    setThanksLoading(true);
    try {
      // 通过 Server Action 转发请求，解决跨域问题
      const result = await pushToAdminBot('feedback', { 
        text: `🌟 感谢阿旭！用户 [${username}] 刚刚为你点了一个赞，并使用了免费 API 羊毛！` 
      });
      
      if (result.success) {
        setToastMsg("点赞成功！已为您填入预设 API 😄");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        throw new Error("Submission failed");
      }
    } catch (e) {
      setToastMsg("操作失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setThanksLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    // 这里应该有一个 loading 状态，暂时省略
    try {
      await persistSettings(settings);
      alert("个人中心配置已保存！");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存失败，请重试。");
    }
  };

  const openAddSourceModal = (themeId: string) => {
    setAddSourceTargetThemeId(themeId);
    setNewSourceUrl("");
    setIsAddSourceModalOpen(true);
  };

  const handleAddSource = () => {
    if (!newSourceUrl.trim() || !addSourceTargetThemeId) return;
    
    setCustomThemeSources(prev => ({
      ...prev,
      [addSourceTargetThemeId]: [...(prev[addSourceTargetThemeId] || []), newSourceUrl.trim()]
    }));
    
    setIsAddSourceModalOpen(false);
    setNewSourceUrl("");
  };

  const openSubscribeModal = (theme: any) => {
    setSelectedTheme(theme);
    // 如果已有配置，使用现有配置；否则使用默认
    setModalConfig({
      webhookUrl: settings.webhookUrl || "",
      pushTime: settings.pushTime || "8",
      pushDays: settings.pushDays || [1, 2, 3, 4, 5]
    });
    setIsModalOpen(true);
  };

  const handleConfirmSuperSub = async () => {
    if (!superSubKeyword.trim()) {
      alert("请输入您想看的主题关键词");
      return;
    }

    setLoading(true);
    try {
      // 生成 Google News RSS URL
      const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(superSubKeyword.trim())}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
      
      // 生成 Twitter/X RSS URL (通过 nitter.net 代理，这是目前最通用的 RSS 方式)
      const twitterRssUrl = `https://nitter.net/search/rss?q=${encodeURIComponent(superSubKeyword.trim())}`;
      
      // 1. 保存到 RSS 列表
      const currentSources = settings.rssUrls ? settings.rssUrls.split("\n").filter(Boolean) : [];
      const newSources = Array.from(new Set([...currentSources, googleNewsUrl, twitterRssUrl]));
      await persistRSS(newSources);

      // 2. 保存设置，记录关键词
      const newSettings = {
        ...settings,
        superSubKeyword: superSubKeyword.trim(),
        webhookUrl: settings.webhookUrl || modalConfig.webhookUrl,
      };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);

      // 3. 更新本地状态
      setSettings({ ...newSettings, rssUrls: newSources.join("\n") });
      setIsSuperSubModalOpen(false);
      setToastMsg(`🚀 超级订阅成功！已开启对 [${superSubKeyword}] 的全网检索。`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error("Super sub failed:", e);
      alert("订阅失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubscription = async () => {
    // ... existing subscription logic ...
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackType) return;
    
    // 如果是类型 1，直接处理
    if (feedbackType === 1) {
      setSubmittingFeedback(true);
      try {
        await pushToAdminBot('feedback', {
          type: 'like',
          username,
          message: "太好用了，点赞！"
        });
        setToastMsg("感谢喜欢 ❤️ 阿旭坐在应韧旁边，可以请他喝咖啡（无糖、不加奶的美式）");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        setIsFeedbackModalOpen(false);
        setFeedbackType(null);
      } catch (e) {
        setToastMsg("反馈发送失败，请重试");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } finally {
        setSubmittingFeedback(false);
      }
      return;
    }

    // 类型 2 和 3 需要检查文本
    if (!feedbackText.trim()) {
      // 用户没填内容直接切换或关闭，不需要 alert 提示
      setIsFeedbackModalOpen(false);
      setFeedbackType(null);
      setFeedbackText("");
      return;
    }

    setSubmittingFeedback(true);
    try {
      await pushToAdminBot('feedback', {
        type: feedbackType === 2 ? 'suggestion' : 'complaint',
        username,
        message: feedbackText
      });
      setToastMsg("反馈已收到，我们会认真查看的！");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setIsFeedbackModalOpen(false);
      setFeedbackType(null);
      setFeedbackText("");
    } catch (e) {
      setToastMsg("反馈发送失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // 过滤主题逻辑
  const filteredThemes = PRESET_THEMES.filter(theme => {
    const matchesSearch = theme.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          theme.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || theme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden relative">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-[#030712]/60 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/home")}>
          <span className="text-xl font-black tracking-tighter font-serif text-white drop-shadow-md">Weave</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-sm">
          <button onClick={() => setActiveTab('shelf')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'shelf' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>主题货架</button>
          <button onClick={() => setActiveTab('active')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'active' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>已订阅</button>
          <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>个人中心</button>
          </nav>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
              <User className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-bold text-white">{username}</span>
            </div>
            <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="p-2.5 text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12 relative z-10">

        <AnimatePresence>
          {isModalOpen && selectedTheme && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white border border-white/10 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/10 rounded-2xl text-blue-600 border border-white/10">
                        {selectedTheme.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-blue-950">输入推送的机器人地址</h3>
                        <p className="text-xs text-blue-900/40 font-bold mt-1 uppercase tracking-widest">主题：{selectedTheme.title}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                      <X className="w-5 h-5 text-blue-900/30" />
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Webhook 配置 */}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-blue-900/40 uppercase tracking-widest ml-1 block">Webhook 地址 (必填)</label>
                      <input 
                        type="text" 
                        value={modalConfig.webhookUrl}
                        onChange={(e) => setModalConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        placeholder="请输入机器人 Webhook 地址"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-blue-950 placeholder:text-blue-900/40"
                        autoFocus
                      />
                      <p className="text-[10px] text-blue-900/40 ml-1 font-medium">首次订阅需配置接收地址，后续可直接复用。</p>
                    </div>

                    {/* 推送时间 */}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-blue-900/40 uppercase tracking-widest ml-1 block">每日推送时间</label>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setModalConfig(prev => ({ ...prev, pushTime: i.toString() }))} 
                            className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${modalConfig.pushTime === i.toString() ? "bg-blue-950 text-white shadow-lg scale-105" : "bg-white/5 text-blue-900/40 border-white/10 hover:border-white/20 hover:bg-white/10"}`}
                          >
                            {i}:00
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 推送周期 */}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-blue-900/40 uppercase tracking-widest ml-1 block">推送周期</label>
                      <div className="flex flex-wrap gap-2">
                        {[{ label: "周一", val: 1 }, { label: "周二", val: 2 }, { label: "周三", val: 3 }, { label: "周四", val: 4 }, { label: "周五", val: 5 }, { label: "周六", val: 6 }, { label: "周日", val: 0 }].map((day) => (
                          <button 
                            key={day.val} 
                            onClick={() => { 
                              const newDays = modalConfig.pushDays.includes(day.val) ? modalConfig.pushDays.filter(d => d !== day.val) : [...modalConfig.pushDays, day.val]; 
                              setModalConfig(prev => ({ ...prev, pushDays: newDays })); 
                            }} 
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${modalConfig.pushDays.includes(day.val) ? "bg-blue-600/10 text-blue-600 border-blue-500/20 shadow-lg shadow-blue-900/5" : "bg-white/5 text-blue-900/40 border-white/10 hover:border-white/20"}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmSubscription}
                    disabled={loading}
                    className="w-full py-5 bg-blue-950 text-white rounded-[24px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-950/10 flex items-center justify-center gap-3 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        确认订阅
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {isFeedbackModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => { setIsFeedbackModalOpen(false); setFeedbackType(null); setFeedbackText(""); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white border border-white/10 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-blue-950 uppercase tracking-tighter">我要反馈</h3>
                    <button onClick={() => { setIsFeedbackModalOpen(false); setFeedbackType(null); setFeedbackText(""); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                      <X className="w-5 h-5 text-blue-900/30" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 1, label: "点赞", icon: "❤️", color: "from-pink-500 to-rose-500", full: "太好用了，点赞" },
                      { id: 2, label: null, icon: null, color: "from-blue-500 to-cyan-500", full: "非常好用，但是我有建议" },
                      { id: 3, label: null, icon: null, color: "from-slate-600 to-slate-800", full: "有点难用，我有想法" }
                    ].map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => { 
                          setFeedbackType(item.id as 1|2|3); 
                        }}
                        className={`w-full group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                          feedbackType === item.id 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-slate-700 group-hover:text-blue-950 transition-colors">{item.full}</span>
                        {item.label && (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-br ${item.color} shadow-sm group-hover:scale-105 transition-transform`}>
                            {item.icon && <span className="text-sm">{item.icon}</span>}
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {feedbackType === 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-4"
                      >
                        <button 
                          onClick={handleFeedbackSubmit}
                          disabled={submittingFeedback}
                          className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                        >
                          {submittingFeedback ? <Loader2 className="w-6 h-6 animate-spin" /> : "确认点赞"}
                        </button>
                      </motion.div>
                    )}
                    {(feedbackType === 2 || feedbackType === 3) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4"
                      >
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder={feedbackType === 2 ? "欢迎建议" : "叼你😈"}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-blue-950 placeholder:text-blue-900/40 resize-none"
                          rows={4}
                        />
                        <button 
                          onClick={handleFeedbackSubmit}
                          disabled={submittingFeedback}
                          className="w-full py-5 bg-blue-950 text-white rounded-[24px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-950/10 flex items-center justify-center gap-3 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          {submittingFeedback ? <Loader2 className="w-6 h-6 animate-spin" /> : "提交反馈"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isSuperSubModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setIsSuperSubModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white border border-white/10 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-black text-blue-950 uppercase tracking-tighter">超级订阅</h3>
                    </div>
                    <button onClick={() => setIsSuperSubModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                      <X className="w-5 h-5 text-blue-900/30" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      输入你想关注的主题
                    </p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={superSubKeyword}
                        onChange={(e) => setSuperSubKeyword(e.target.value)}
                        placeholder="例如：低空经济、大模型融资"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-blue-950 placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmSuperSub}
                    disabled={loading || !superSubKeyword.trim()}
                    className="w-full py-5 bg-blue-950 text-white rounded-[24px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-950/10 flex items-center justify-center gap-3 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "确认订阅"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'shelf' && (
            <motion.div 
              key="shelf" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">选择你关注的主题</h2>
                <button 
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="px-6 py-2.5 bg-blue-500/10 border-2 border-blue-400 rounded-2xl text-sm font-black text-white hover:bg-blue-500/20 hover:border-blue-300 hover:shadow-[0_0_20px_rgba(96,165,250,0.4)] transition-all shadow-lg"
                >
                  我要反馈
                </button>
              </div>

              {/* 搜索和分类栏 */}
              <div className="space-y-8 bg-white/10 p-8 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 group-focus-within:text-white transition-colors" />
                  <input 
                    type="text" 
                    placeholder="搜索感兴趣的主题（如：AI、设计、财经...）" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-[24px] pl-16 pr-8 py-6 text-lg outline-none focus:ring-2 focus:ring-blue-400 transition-all font-medium text-white placeholder:text-white/50"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                        selectedCategory === cat.id 
                          ? "bg-white text-blue-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105" 
                          : "bg-white/5 text-white/80 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {/* 超级订阅入口：Google News 检索 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="break-inside-avoid group relative flex flex-col"
                >
                  <div 
                    onClick={() => setIsSuperSubModalOpen(true)}
                    className="relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-[40px] p-8 shadow-2xl border-2 border-blue-400/30 hover:border-blue-400 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/10 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Globe className="w-32 h-32 rotate-12" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                          <Search className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black text-white font-serif italic">超级订阅</h3>
                      </div>
                      <p className="text-lg font-bold text-white mb-4">输入你最想看的内容</p>
                      <p className="text-sm text-blue-100/60 leading-relaxed mb-8">
                        告诉我们您最想关注的主题，我们将围绕这个主题帮你额外搜集信息
                      </p>
                      <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                        立即开启专属检索 <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {filteredThemes.map((theme, index) => (
                  <motion.div 
                    key={theme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="break-inside-avoid group relative flex flex-col"
                  >
                    <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-400/30 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                      {/* 头部信息 */}
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`p-3.5 bg-white/10 rounded-2xl text-blue-300 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500`}>
                            {theme.icon}
                          </div>
                          <h3 className="text-xl font-black text-white font-serif">{theme.title}</h3>
                        </div>
                        <button 
                          onClick={() => openSubscribeModal(theme)}
                          className="px-5 py-2.5 bg-white text-blue-950 text-sm font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 shadow-lg hover:scale-105"
                        >
                          订阅
                        </button>
                      </div>

                      {/* 差异化预览组件 */}
                      <div className="mb-8">
                        <ThemePreview theme={theme} />
                      </div>

                      <p className="text-sm text-blue-100/80 font-medium leading-relaxed">
                        {theme.desc}
                      </p>

                      <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Rss className="w-4 h-4 text-blue-100/50" />
                            <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">包含 {theme.sources.length + (customThemeSources[theme.id]?.length || 0)} 个信源</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddSourceModal(theme.id);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-black text-blue-300 hover:text-blue-200 bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-widest"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            添加源
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {theme.sources.slice(0, 3).map((source: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-blue-100/70 font-bold transition-all hover:bg-white/10 hover:text-white">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${theme.color}`} />
                              <span className="truncate max-w-[120px] uppercase tracking-wider">{source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* 自由配置入口 */}
                <div 
                  onClick={() => router.push("/config")}
                  className="break-inside-avoid cursor-pointer group"
                >
                  <div className="relative bg-white/5 rounded-[40px] p-8 border-2 border-dashed border-white/10 hover:border-blue-400/50 hover:bg-blue-500/10 transition-all duration-500 flex flex-col items-center justify-center text-center h-[280px] space-y-6 backdrop-blur-md">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 shadow-lg flex items-center justify-center text-white/60 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-500">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white font-serif italic">自由配置模式</h3>
                      <p className="text-sm text-blue-100/50 mt-2 font-bold uppercase tracking-widest">自定义您的专属情报流</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div 
              key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">已订阅主题</h2>
                <button onClick={() => router.push("/config")} className="flex items-center gap-3 text-blue-600 font-black text-sm uppercase tracking-[0.2em] hover:text-blue-700 transition-colors group">
                  新增自定义配置 <Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              {subscribedThemeIds.length > 0 || settings.rssUrls || settings.superSubKeyword ? (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {/* 已订阅主题卡片 */}
                  {subscribedThemeIds.map((themeId) => {
                    const theme = PRESET_THEMES.find(t => t.id === themeId);
                    if (!theme) return null;
                    
                    const themeCustomSources = customThemeSources[themeId] || [];
                    const allSources = [...theme.sources, ...themeCustomSources];
                    
                    return (
                      <div 
                        key={themeId}
                        className="break-inside-avoid group relative flex flex-col"
                      >
                        <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-500/20 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                          {/* 已订阅标签 */}
                          <div className="absolute top-6 right-6 px-4 py-1.5 bg-green-500/20 text-green-300 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-widest">
                            已订阅
                          </div>
                          
                          {/* 头部信息 */}
                          <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-white/10 rounded-2xl text-blue-600 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                              {theme.icon}
                            </div>
                            <h3 className="text-xl font-black text-white font-serif">{theme.title}</h3>
                          </div>

                          {/* 差异化预览组件 */}
                          <div className="mb-8">
                            <ThemePreview theme={theme} />
                          </div>

                          <p className="text-sm text-blue-100/80 font-medium leading-relaxed">
                            {theme.desc}
                          </p>

                          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Rss className="w-4 h-4 text-blue-100/50" />
                                <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">包含 {allSources.length} 个信源</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {theme.sources.slice(0, 3).map((source: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-blue-100/70 font-bold">
                                  <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${theme.color}`} />
                                  <span className="truncate max-w-[120px] uppercase tracking-wider">{source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 超级订阅关键词卡片 */}
                  {settings.superSubKeyword && (
                    <div className="break-inside-avoid relative flex flex-col">
                      <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-500/20 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                        {/* 已订阅标签 */}
                        <div className="absolute top-6 right-6 px-4 py-1.5 bg-green-500/20 text-green-300 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-widest">
                          已订阅
                        </div>
                        
                        {/* 头部信息 */}
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3.5 bg-white/10 rounded-2xl text-blue-600 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                            <Search className="w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-black text-white font-serif">超级订阅</h3>
                        </div>

                        {/* 关键词显示 */}
                        <div className="mb-8">
                          <p className="text-sm text-blue-100/80 font-medium leading-relaxed mb-4">
                            正在追踪以下关键词的实时动态
                          </p>
                          <div className="px-4 py-3 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-lg font-black text-white">{settings.superSubKeyword}</p>
                          </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <Rss className="w-4 h-4 text-blue-100/50" />
                            <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">全网检索中</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 自定义 RSS 源（不属于任何主题的） */}
                  {(() => {
                    const allThemesSources = subscribedThemeIds.flatMap(id => {
                      const theme = PRESET_THEMES.find(t => t.id === id);
                      if (!theme) return [];
                      return [...theme.sources, ...(customThemeSources[id] || [])];
                    });
                    const customRssSources = settings.rssUrls
                      ? settings.rssUrls.split('\n').filter((url: string) => url && !allThemesSources.includes(url))
                      : [];
                    
                    if (customRssSources.length === 0) return null;
                    
                    return (
                      <div className="break-inside-avoid relative flex flex-col">
                        <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-white/30 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-white/10 rounded-2xl text-blue-300 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                              <Plus className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white font-serif">自定义源</h3>
                              <p className="text-xs text-blue-100/80 font-bold uppercase tracking-widest mt-1">{customRssSources.length} 个信源</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {customRssSources.slice(0, 5).map((url: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-blue-100/80 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                                <span className="truncate">{url}</span>
                              </div>
                            ))}
                            {customRssSources.length > 5 && (
                              <p className="text-[10px] text-blue-100/80 font-black uppercase tracking-widest text-center pt-2">还有 {customRssSources.length - 5} 个更多源...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-32 bg-white/5 rounded-[50px] border-2 border-dashed border-white/10 backdrop-blur-md">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                    <Rss className="w-10 h-10 text-blue-200/20" />
                  </div>
                  <p className="text-blue-200/70 font-bold text-xl mb-10 uppercase tracking-[0.2em]">您还没有订阅任何主题</p>
                  <button onClick={() => setActiveTab('shelf')} className="px-12 py-5 bg-white text-blue-950 rounded-[24px] font-black text-xl shadow-2xl shadow-white/5 hover:scale-105 transition-all">去主题货架看看</button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">个人中心</h2>
                <button 
                  onClick={() => document.getElementById('settings-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                  className="px-8 py-3 bg-white text-blue-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                >
                  保存设置
                </button>
              </div>
              
              <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-10">
                {/* Webhook 配置 */}
                <div className="bg-white/10 rounded-[40px] border border-white/10 p-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl text-blue-300 border border-white/10"><Bell className="w-7 h-7" /></div>
                    <h3 className="text-2xl font-black text-white font-serif">输入推送的机器人地址</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Webhook 地址</label>
                      <input 
                        type="text" 
                        value={settings.webhookUrl || ""} 
                        onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                        placeholder="请输入机器人 Webhook 地址"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* API 状态 */}
                <div className="bg-white/10 rounded-[40px] border border-white/10 p-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-2xl text-blue-300 border border-white/10"><Zap className="w-7 h-7" /></div>
                        <h3 className="text-2xl font-black text-white font-serif">配置你的AI-APIkey</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={handleThanks} disabled={thanksLoading}
                        className="px-5 py-2.5 bg-blue-500/20 text-blue-300 rounded-xl font-black text-[10px] hover:bg-blue-500/30 transition-all flex items-center gap-2 border border-blue-500/30 uppercase tracking-widest"
                      >
                        {thanksLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Heart className="w-3.5 h-3.5 fill-current" />}
                        使用免费 API (感谢阿旭)
                      </button>
                    </div>

                  <div className="space-y-6">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'google'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${settings.aiProvider === 'google' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>Google Gemini</button>
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'openai'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${settings.aiProvider === 'openai' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>OpenAI / 兼容平台</button>
                    </div>

                    {settings.aiProvider === 'google' ? (
                      <div className="animate-in fade-in duration-500">
                        <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Gemini API Key</label>
                        <input 
                          type="password" 
                          value={settings.geminiApiKey || ""} 
                          onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                          placeholder="留空则使用免费额度"
                          className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/50"
                        />
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in duration-500">
                        <div>
                          <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">OpenAI API Key</label>
                          <input 
                            type="password" 
                            value={settings.openaiApiKey || ""} 
                            onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Base URL</label>
                            <input 
                              type="text" 
                              value={settings.openaiBaseUrl || ""} 
                              onChange={(e) => setSettings({...settings, openaiBaseUrl: e.target.value})}
                              placeholder="https://api.openai.com/v1"
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/50"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Model Name</label>
                            <input 
                              type="text" 
                              value={settings.openaiModel || ""} 
                              onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                              placeholder="gpt-4o"
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/50"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* 底部按钮移除，已移至顶部 */}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast 提示 */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-12 left-1/2 z-[200] px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <Heart className="w-4 h-4 text-blue-400 fill-current" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
