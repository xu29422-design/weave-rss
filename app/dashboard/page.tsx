"use client";

import { useState, useEffect } from "react";
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

// 预设主题数据，增加样式配置
const PRESET_THEMES = [
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
const ThemePreview = ({ theme }: { theme: any }) => {
  switch (theme.style) {
    case "tech":
      return (
        <div className="bg-[#1e1e1e] rounded-xl p-4 font-mono text-xs text-green-400 shadow-inner border border-gray-800">
          <div className="flex gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="space-y-2 opacity-90">
            {theme.preview.map((item: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500 shrink-0">$</span>
                <span className="truncate">
                  <span className="text-white font-bold">{item.title}</span>
                  <span className="text-gray-600 ml-2">--{item.meta}</span>
                </span>
              </div>
            ))}
            <div className="animate-pulse">_</div>
          </div>
        </div>
      );
    case "finance":
      return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2">
          {theme.preview.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-700 text-xs">{item.title}</span>
              <span className={`text-xs font-mono font-bold ${item.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                {item.trend === 'up' ? '▲' : '▼'} {item.value}
              </span>
            </div>
          ))}
        </div>
      );
    case "paper":
      return (
        <div className="bg-[#fdfbf7] rounded-xl p-4 border border-[#eaddcf] shadow-sm font-serif">
          <div className="border-b-2 border-black pb-2 mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">The Daily Brief</div>
          </div>
          <div className="space-y-3">
            {theme.preview.map((item: any, i: number) => (
              <div key={i}>
                <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.title}</h4>
                <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "chat":
      return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-white/50 shadow-sm space-y-3">
          {theme.preview.map((item: any, i: number) => (
            <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-2.5 rounded-2xl text-[10px] leading-relaxed ${
                item.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-700 shadow-sm rounded-bl-none'
              }`}>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      );
    case "card":
      return (
        <div className="grid grid-cols-1 gap-2">
          {theme.preview.map((item: any, i: number) => (
            <div key={i} className="group/card relative overflow-hidden rounded-xl bg-gray-900 p-3 text-white">
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent blur-xl rounded-full -mr-8 -mt-8`} />
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-bold text-xs truncate mr-2">{item.title}</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${item.color} text-white`}>{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      );
    case "minimal":
      return (
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
          <div className="space-y-4">
            {theme.preview.map((item: any, i: number) => (
              <div key={i} className="pl-3 border-l-2 border-gray-200">
                <h4 className="font-bold text-gray-900 text-xs mb-0.5">{item.title}</h4>
                <p className="text-[10px] text-gray-400 italic">{item.author}</p>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [activeTab, setActiveTab] = useState<"shelf" | "settings" | "active">("shelf");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [thanksLoading, setThanksLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);

  // 搜索和分类状态
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
        setSettings(config.settings || {});
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

  const handleThanks = async () => {
    setThanksLoading(true);
    try {
      // 推送点赞到阿旭的 Webhook
      await fetch("https://365.kdocs.cn/woa/api/v1/webhook/send?key=113a89749298fba10dcae6b7cb60db09", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: `🌟 感谢阿旭！用户 [${username}] 刚刚为你点了一个赞，感谢你提供的免费 API 羊毛！` }
        })
      });
      alert("点赞成功！已通过 Webhook 告诉阿旭啦~");
    } catch (e) {
      alert("点赞失败，但阿旭感受到了你的心意！");
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

  const handleConfirmSubscription = async () => {
    if (!modalConfig.webhookUrl && !settings.webhookUrl) {
      alert("请填写 Webhook 地址以接收推送");
      return;
    }

    setLoading(true);
    try {
      // 1. 保存 RSS
      const currentSources = settings.rssUrls ? settings.rssUrls.split("\n") : [];
      
      // 合并主题默认源和用户自定义添加的源
      const themeCustomSources = customThemeSources[selectedTheme.id] || [];
      const allThemeSources = [...selectedTheme.sources, ...themeCustomSources];

      const newSources = Array.from(new Set([...currentSources, ...allThemeSources]));
      await persistRSS(newSources);

      // 2. 保存设置 (Webhook & Schedule)
      const newSettings = {
        ...settings,
        webhookUrl: modalConfig.webhookUrl || settings.webhookUrl,
        pushTime: modalConfig.pushTime,
        pushDays: modalConfig.pushDays,
        // 确保其他必要字段存在
        aiProvider: settings.aiProvider || "google",
        configMode: settings.configMode || "simple"
      };
      await persistSettings(newSettings);
      
      // 更新本地状态
      setSettings(newSettings);
      setIsModalOpen(false);
      alert(`🎉 订阅成功！已为您添加 [${selectedTheme.title}] 到订阅列表。`);
      
      // 刷新页面或跳转
      // router.refresh(); // 可选
    } catch (error) {
      console.error("Subscription failed:", error);
      alert("订阅失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 过滤主题逻辑
  const filteredThemes = PRESET_THEMES.filter(theme => {
    const matchesSearch = theme.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          theme.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || theme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-serif italic text-base">W</span>
          </div>
          <span className="text-xl font-black tracking-tighter font-serif">Weave <span className="ml-2 text-gray-400 font-normal text-lg">RSS</span></span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('shelf')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'shelf' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>主题货架</button>
            <button onClick={() => setActiveTab('active')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>已订阅</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>个人中心</button>
          </nav>
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-700">{username}</span>
            </div>
            <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12">

        <AnimatePresence>
          {isModalOpen && selectedTheme && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gray-50 rounded-2xl text-gray-900">
                        {selectedTheme.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">订阅配置</h3>
                        <p className="text-xs text-gray-500 font-bold mt-0.5">主题：{selectedTheme.title}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Webhook 配置 (仅当未配置时显示) */}
                    {!settings.webhookUrl && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Webhook 地址 (必填)</label>
                        <input 
                          type="text" 
                          value={modalConfig.webhookUrl}
                          onChange={(e) => setModalConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                          placeholder="请输入机器人 Webhook 地址"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                        />
                        <p className="text-[10px] text-gray-400 ml-1">首次订阅需配置接收地址，后续可直接复用。</p>
                      </div>
                    )}

                    {/* 推送时间 */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">每日推送时间</label>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setModalConfig(prev => ({ ...prev, pushTime: i.toString() }))} 
                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${modalConfig.pushTime === i.toString() ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105" : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"}`}
                          >
                            {i}:00
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 推送周期 */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">推送周期</label>
                      <div className="flex flex-wrap gap-2">
                        {[{ label: "周一", val: 1 }, { label: "周二", val: 2 }, { label: "周三", val: 3 }, { label: "周四", val: 4 }, { label: "周五", val: 5 }, { label: "周六", val: 6 }, { label: "周日", val: 0 }].map((day) => (
                          <button 
                            key={day.val} 
                            onClick={() => { 
                              const newDays = modalConfig.pushDays.includes(day.val) ? modalConfig.pushDays.filter(d => d !== day.val) : [...modalConfig.pushDays, day.val]; 
                              setModalConfig(prev => ({ ...prev, pushDays: newDays })); 
                            }} 
                            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${modalConfig.pushDays.includes(day.val) ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"}`}
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
                    className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "确认订阅"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {isAddSourceModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setIsAddSourceModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900">添加 RSS 源</h3>
                    <button onClick={() => setIsAddSourceModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">RSS 链接</label>
                    <input 
                      type="text" 
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                    />
                  </div>

                  <button 
                    onClick={handleAddSource}
                    disabled={!newSourceUrl.trim()}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                  >
                    <Plus className="w-5 h-5" />
                    确认添加
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
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tight">选择你关注的主题</h2>
              </div>

              {/* 搜索和分类栏 */}
              <div className="space-y-6 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜索感兴趣的主题（如：AI、设计、财经...）" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-5 text-base outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                        selectedCategory === cat.id 
                          ? "bg-black text-white shadow-lg shadow-gray-200 scale-105" 
                          : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredThemes.map((theme) => (
                  <div 
                    key={theme.id}
                    className="break-inside-avoid group relative flex flex-col"
                  >
                    <div className="relative bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      {/* 头部信息 */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gray-50 rounded-xl text-gray-900 group-hover:bg-black group-hover:text-white transition-colors">
                            {theme.icon}
                          </div>
                          <h3 className="text-lg font-black text-gray-900">{theme.title}</h3>
                        </div>
                        <button 
                          onClick={() => openSubscribeModal(theme)}
                          className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                        >
                          订阅
                        </button>
                      </div>

                      {/* 差异化预览组件 */}
                      <div className="mb-6">
                        <ThemePreview theme={theme} />
                      </div>

                      <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        {theme.desc}
                      </p>

                      <div className="mt-5 pt-5 border-t border-gray-100/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Rss className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">包含 {theme.sources.length + (customThemeSources[theme.id]?.length || 0)} 个信源</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddSourceModal(theme.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            添加源
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {theme.sources.map((source: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100/80 text-[10px] text-gray-500 font-medium transition-colors hover:bg-gray-100 hover:text-gray-700">
                              <div className={`w-1 h-1 rounded-full bg-gradient-to-br ${theme.color}`} />
                              <span className="truncate max-w-[140px]">{source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                            </div>
                          ))}
                          {customThemeSources[theme.id]?.map((source: string, idx: number) => (
                            <div key={`custom-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100/80 text-[10px] text-blue-600 font-medium transition-colors hover:bg-blue-100">
                              <div className="w-1 h-1 rounded-full bg-blue-500" />
                              <span className="truncate max-w-[140px]">{source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 自由配置入口 */}
                <div 
                  onClick={() => router.push("/config")}
                  className="break-inside-avoid cursor-pointer"
                >
                  <div className="relative bg-gray-50 rounded-[32px] p-6 border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300 flex flex-col items-center justify-center text-center h-[200px] space-y-4">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-600">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900">自由配置模式</h3>
                      <p className="text-[10px] text-gray-400 mt-1">自定义您的专属情报流</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div 
              key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tight">已订阅主题</h2>
                <button onClick={() => router.push("/config")} className="flex items-center gap-2 text-blue-600 font-bold hover:underline">
                  管理所有配置 <Settings2 className="w-4 h-4" />
                </button>
              </div>

              {settings.rssUrls ? (
                <div className="bg-white rounded-[32px] border-2 border-gray-100 p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-green-50 rounded-2xl text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black">当前订阅流已激活</h3>
                      <p className="text-sm text-gray-400 font-medium">包含 {settings.rssUrls.split('\n').filter(Boolean).length} 个活跃信源</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings.rssUrls.split('\n').filter(Boolean).map((url: string, i: number) => (
                      <div key={url} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium text-gray-600 truncate">{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-medium mb-6">您还没有订阅任何主题</p>
                  <button onClick={() => setActiveTab('shelf')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:scale-105 transition-all">去主题货架看看</button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <h2 className="text-3xl font-black tracking-tight">个人中心</h2>
              
              <form onSubmit={handleSaveSettings} className="space-y-8">
                {/* Webhook 配置 */}
                <div className="bg-white rounded-[32px] border-2 border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Bell className="w-6 h-6" /></div>
                    <h3 className="text-xl font-black">推送设置</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Webhook 地址</label>
                      <input 
                        type="text" 
                        value={settings.webhookUrl || ""} 
                        onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                        placeholder="请输入机器人 Webhook 地址"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* API 状态 */}
                <div className="bg-white rounded-[32px] border-2 border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Zap className="w-6 h-6" /></div>
                      <h3 className="text-xl font-black">AI 引擎配置</h3>
                    </div>
                    {(!settings.geminiApiKey && !settings.openaiApiKey) && (
                      <button 
                        type="button"
                        onClick={handleThanks} disabled={thanksLoading}
                        className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-100 transition-all flex items-center gap-2"
                      >
                        {thanksLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3 fill-current" />}
                        使用免费 API (感谢阿旭)
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'google'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.aiProvider === 'google' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Google Gemini</button>
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'openai'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.aiProvider === 'openai' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>OpenAI / 兼容平台</button>
                    </div>

                    {settings.aiProvider === 'google' ? (
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Gemini API Key</label>
                        <input 
                          type="password" 
                          value={settings.geminiApiKey || ""} 
                          onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                          placeholder="留空则使用免费额度"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">OpenAI API Key</label>
                          <input 
                            type="password" 
                            value={settings.openaiApiKey || ""} 
                            onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Base URL (可选)</label>
                          <input 
                            type="text" 
                            value={settings.openaiBaseUrl || ""} 
                            onChange={(e) => setSettings({...settings, openaiBaseUrl: e.target.value})}
                            placeholder="https://api.openai.com/v1"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Model Name</label>
                          <input 
                            type="text" 
                            value={settings.openaiModel || ""} 
                            onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                            placeholder="gpt-4o"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-gray-200">
                    保存设置
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
