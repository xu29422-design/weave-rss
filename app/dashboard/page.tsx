"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, Cpu, Newspaper, Book, Gamepad2, LineChart, 
  Clock, CheckCircle2, Plus, User, LogOut, Settings2, 
  Heart, Zap, LayoutGrid, Bell, ArrowRight, Loader2, Rss,
  Palette, Bitcoin, Code2, Activity, BrainCircuit, Search, X, Globe, AlertCircle, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCurrentConfig, persistSettings, persistRSS, triggerDigest } from "../config/actions";
import { pushToAdminBot } from "../config/admin-actions";
import { ANALYST_PROMPT, EDITOR_PROMPT, TLDR_PROMPT } from "../../lib/ai-prompts";

// 用于界面展示的默认提示词（未自定义时显示，用户可查看或修改）
const DEFAULT_ANALYST_DISPLAY = ANALYST_PROMPT.trim();
const DEFAULT_EDITOR_DISPLAY = EDITOR_PROMPT("类别", 10).trim();
const DEFAULT_TLDR_DISPLAY = TLDR_PROMPT.trim();

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
  const [promptTab, setPromptTab] = useState<'analyst' | 'editor' | 'tldr'>('analyst');
  const [thanksLoading, setThanksLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [subscribedThemeIds, setSubscribedThemeIds] = useState<string[]>([]);
  
  // 配置中心模式
  const [configMode, setConfigMode] = useState<'global' | 'flexible'>('global');
  // 当前正在编辑独立配置的主题 ID
  const [editingThemeConfigId, setEditingThemeConfigId] = useState<string | null>(null);
  const [isThemeConfigModalOpen, setIsThemeConfigModalOpen] = useState(false);
  const [editingThemeConfig, setEditingThemeConfig] = useState<any>({
    webhookUrl: "",
    aiProvider: "openai",
    geminiApiKey: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: "",
    analystPrompt: "",
    editorPrompt: "",
    tldrPrompt: "",
  });

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
  // 每个主题下用户新增的源（持久化在 settings.themeCustomSources）
  const [customThemeSources, setCustomThemeSources] = useState<Record<string, string[]>>({});
  // 每个主题下用户从预设中移除的源（持久化在 settings.themeRemovedSources）
  const [themeRemovedSources, setThemeRemovedSources] = useState<Record<string, string[]>>({});
  // 当前展开管理源的主题卡（themeId），null 表示未展开
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [newRssUrlForTheme, setNewRssUrlForTheme] = useState("");

  // 立即发送简报：运行状态与轮询；digestSendingFrom 表示当前是哪张卡片在发送（仅该卡显示 loading）
  const [digestRunStatus, setDigestRunStatus] = useState<{ status: string; progress: number; message?: string } | null>(null);
  const [digestSending, setDigestSending] = useState(false);
  const [digestSendingFrom, setDigestSendingFrom] = useState<string | null>(null);
  const [digestRunStartAt, setDigestRunStartAt] = useState<number | null>(null);

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
        setLastSavedSettings({
          webhookUrl: settingsWithRss.webhookUrl ?? "",
          aiProvider: settingsWithRss.aiProvider ?? "openai",
          geminiApiKey: settingsWithRss.geminiApiKey ?? "",
          openaiApiKey: settingsWithRss.openaiApiKey ?? "",
          openaiBaseUrl: settingsWithRss.openaiBaseUrl ?? "",
          openaiModel: settingsWithRss.openaiModel ?? "",
          analystPrompt: settingsWithRss.analystPrompt ?? "",
          editorPrompt: settingsWithRss.editorPrompt ?? "",
          tldrPrompt: settingsWithRss.tldrPrompt ?? "",
        });
        // 初始化已订阅主题列表
        setSubscribedThemeIds(config.settings?.subscribedThemes || []);
        setCustomThemeSources(config.settings?.themeCustomSources || {});
        setThemeRemovedSources(config.settings?.themeRemovedSources || {});
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
  const [saveLoading, setSaveLoading] = useState<{ webhook: boolean; api: boolean; prompts: boolean }>({ webhook: false, api: false, prompts: false });

  // 上次已保存的配置（用于判断是否有未保存修改）
  const [lastSavedSettings, setLastSavedSettings] = useState<{
    webhookUrl?: string; aiProvider?: string; geminiApiKey?: string; openaiApiKey?: string; openaiBaseUrl?: string; openaiModel?: string;
    analystPrompt?: string; editorPrompt?: string; tldrPrompt?: string;
  }>({});
  // 未保存修改确认弹窗：离开时若有修改则询问保存或放弃
  const [confirmUnsaved, setConfirmUnsaved] = useState<{
    open: boolean;
    message: string;
    onSave: () => Promise<void>;
    onDiscard: () => void;
  }>({ open: false, message: "", onSave: async () => {}, onDiscard: () => {} });

  const showSaveToast = (message: string) => {
    setToastMsg(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  /** 切换配置模式后的提示：说明两种模式互斥及各自生效范围 */
  const showModeSwitchTip = (newMode: "global" | "flexible") => {
    const modeName = newMode === "flexible" ? "灵活配置模式" : "全局统一配置";
    setToastMsg(`已切换至${modeName}。两种模式互斥：全局对所有卡片生效，灵活可对单卡单独配置。`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4500);
  };

  const handleSaveWebhook = async () => {
    setSaveLoading((prev) => ({ ...prev, webhook: true }));
    try {
      await persistSettings(settings);
      setLastSavedSettings((prev) => ({ ...prev, webhookUrl: settings.webhookUrl ?? "" }));
      showSaveToast("Webhook 地址已保存");
    } catch (error) {
      console.error("Failed to save webhook:", error);
      showSaveToast("保存失败，请重试");
    } finally {
      setSaveLoading((prev) => ({ ...prev, webhook: false }));
    }
  };

  const handleSaveApi = async () => {
    setSaveLoading((prev) => ({ ...prev, api: true }));
    try {
      const settingsToSave = { ...settings, aiProvider: "openai" };
      await persistSettings(settingsToSave);
      setSettings(settingsToSave);
      setLastSavedSettings((prev) => ({
        ...prev,
        aiProvider: "openai",
        geminiApiKey: "",
        openaiApiKey: settingsToSave.openaiApiKey ?? "",
        openaiBaseUrl: settingsToSave.openaiBaseUrl ?? "",
        openaiModel: settingsToSave.openaiModel ?? "",
      }));
      showSaveToast("API 配置已保存");
    } catch (error) {
      console.error("Failed to save API:", error);
      showSaveToast("保存失败，请重试");
    } finally {
      setSaveLoading((prev) => ({ ...prev, api: false }));
    }
  };

  const handleSavePrompts = async () => {
    setSaveLoading((prev) => ({ ...prev, prompts: true }));
    try {
      await persistSettings(settings);
      setLastSavedSettings((prev) => ({
        ...prev,
        analystPrompt: settings.analystPrompt ?? "",
        editorPrompt: settings.editorPrompt ?? "",
        tldrPrompt: settings.tldrPrompt ?? "",
      }));
      showSaveToast("AI 提示词已保存");
    } catch (error) {
      console.error("Failed to save prompts:", error);
      showSaveToast("保存失败，请重试");
    } finally {
      setSaveLoading((prev) => ({ ...prev, prompts: false }));
    }
  };

  // 全局配置是否有未保存修改（用于显示保存按钮与离开确认）
  const dirtyWebhook = (settings.webhookUrl ?? "") !== (lastSavedSettings.webhookUrl ?? "");
  const dirtyApi =
    (settings.aiProvider ?? "openai") !== (lastSavedSettings.aiProvider ?? "openai") ||
    (settings.geminiApiKey ?? "") !== (lastSavedSettings.geminiApiKey ?? "") ||
    (settings.openaiApiKey ?? "") !== (lastSavedSettings.openaiApiKey ?? "") ||
    (settings.openaiBaseUrl ?? "") !== (lastSavedSettings.openaiBaseUrl ?? "") ||
    (settings.openaiModel ?? "") !== (lastSavedSettings.openaiModel ?? "");
  const dirtyPrompts =
    (settings.analystPrompt ?? "") !== (lastSavedSettings.analystPrompt ?? "") ||
    (settings.editorPrompt ?? "") !== (lastSavedSettings.editorPrompt ?? "") ||
    (settings.tldrPrompt ?? "") !== (lastSavedSettings.tldrPrompt ?? "");
  const hasAnyGlobalDirty = dirtyWebhook || dirtyApi || dirtyPrompts;

  // 卡片独立配置弹窗内是否有未保存修改
  const emptyThemeConfig = {
    webhookUrl: "", aiProvider: "openai", geminiApiKey: "", openaiApiKey: "", openaiBaseUrl: "", openaiModel: "",
    analystPrompt: "", editorPrompt: "", tldrPrompt: "",
  };
  const savedThemeConfig = editingThemeConfigId ? (settings.themeConfigs?.[editingThemeConfigId] || emptyThemeConfig) : null;
  const themeConfigDirty = editingThemeConfigId && savedThemeConfig
    ? (
        (editingThemeConfig.webhookUrl ?? "") !== (savedThemeConfig.webhookUrl ?? "") ||
        (editingThemeConfig.aiProvider ?? "openai") !== (savedThemeConfig.aiProvider ?? "openai") ||
        (editingThemeConfig.geminiApiKey ?? "") !== (savedThemeConfig.geminiApiKey ?? "") ||
        (editingThemeConfig.openaiApiKey ?? "") !== (savedThemeConfig.openaiApiKey ?? "") ||
        (editingThemeConfig.openaiBaseUrl ?? "") !== (savedThemeConfig.openaiBaseUrl ?? "") ||
        (editingThemeConfig.openaiModel ?? "") !== (savedThemeConfig.openaiModel ?? "") ||
        (editingThemeConfig.analystPrompt ?? "") !== (savedThemeConfig.analystPrompt ?? "") ||
        (editingThemeConfig.editorPrompt ?? "") !== (savedThemeConfig.editorPrompt ?? "") ||
        (editingThemeConfig.tldrPrompt ?? "") !== (savedThemeConfig.tldrPrompt ?? "")
      )
    : false;

  const revertGlobalSettings = () => {
    setSettings((prev: any) => ({
      ...prev,
      webhookUrl: lastSavedSettings.webhookUrl ?? "",
      aiProvider: lastSavedSettings.aiProvider ?? "openai",
      geminiApiKey: lastSavedSettings.geminiApiKey ?? "",
      openaiApiKey: lastSavedSettings.openaiApiKey ?? "",
      openaiBaseUrl: lastSavedSettings.openaiBaseUrl ?? "",
      openaiModel: lastSavedSettings.openaiModel ?? "",
      analystPrompt: lastSavedSettings.analystPrompt ?? "",
      editorPrompt: lastSavedSettings.editorPrompt ?? "",
      tldrPrompt: lastSavedSettings.tldrPrompt ?? "",
    }));
  };

  const handleSaveAllGlobal = async () => {
    await persistSettings(settings);
    setLastSavedSettings((prev) => ({
      ...prev,
      webhookUrl: settings.webhookUrl ?? "",
      aiProvider: settings.aiProvider ?? "openai",
      geminiApiKey: settings.geminiApiKey ?? "",
      openaiApiKey: settings.openaiApiKey ?? "",
      openaiBaseUrl: settings.openaiBaseUrl ?? "",
      openaiModel: settings.openaiModel ?? "",
      analystPrompt: settings.analystPrompt ?? "",
      editorPrompt: settings.editorPrompt ?? "",
      tldrPrompt: settings.tldrPrompt ?? "",
    }));
  };

  const requestTabSwitch = (newTab: "shelf" | "settings" | "active") => {
    if (activeTab === "settings" && hasAnyGlobalDirty) {
      const labels: string[] = [];
      if (dirtyWebhook) labels.push("Webhook 地址");
      if (dirtyApi) labels.push("API 配置");
      if (dirtyPrompts) labels.push("AI 提示词");
      setConfirmUnsaved({
        open: true,
        message: `已进行${labels.join("、")}的修改，是否保存？执意不保存则之前的修改内容不会生效。`,
        onSave: async () => {
          await handleSaveAllGlobal();
          showSaveToast("已保存");
          setConfirmUnsaved((c) => ({ ...c, open: false }));
          setActiveTab(newTab);
        },
        onDiscard: () => {
          revertGlobalSettings();
          setConfirmUnsaved((c) => ({ ...c, open: false }));
          setActiveTab(newTab);
        },
      });
    } else {
      setActiveTab(newTab);
    }
  };

  const requestConfigModeSwitch = (newMode: "global" | "flexible") => {
    if (hasAnyGlobalDirty) {
      const labels: string[] = [];
      if (dirtyWebhook) labels.push("Webhook 地址");
      if (dirtyApi) labels.push("API 配置");
      if (dirtyPrompts) labels.push("AI 提示词");
      setConfirmUnsaved({
        open: true,
        message: `已进行${labels.join("、")}的修改，是否保存？执意不保存则之前的修改内容不会生效。`,
        onSave: async () => {
          await handleSaveAllGlobal();
          showSaveToast("已保存");
          setConfirmUnsaved((c) => ({ ...c, open: false }));
          setConfigMode(newMode);
          setTimeout(() => showModeSwitchTip(newMode), 2100);
        },
        onDiscard: () => {
          revertGlobalSettings();
          setConfirmUnsaved((c) => ({ ...c, open: false }));
          setConfigMode(newMode);
          showModeSwitchTip(newMode);
        },
      });
    } else {
      setConfigMode(newMode);
      showModeSwitchTip(newMode);
    }
  };

  const requestThemeModalClose = () => {
    if (themeConfigDirty) {
      setConfirmUnsaved({
        open: true,
        message: "已进行卡片独立配置的修改，是否保存？执意不保存则之前的修改内容不会生效。",
        onSave: async () => {
          await handleSaveThemeConfig();
          setConfirmUnsaved((c) => ({ ...c, open: false }));
        },
        onDiscard: () => {
          setConfirmUnsaved((c) => ({ ...c, open: false }));
          setIsThemeConfigModalOpen(false);
        },
      });
    } else {
      setIsThemeConfigModalOpen(false);
    }
  };

  // --- 按卡片独立配置相关逻辑 ---
  const handleOpenThemeConfigModal = (themeId: string) => {
    setEditingThemeConfigId(themeId);
    const existingConfig = settings.themeConfigs?.[themeId];
    if (existingConfig) {
      setEditingThemeConfig({
        webhookUrl: existingConfig.webhookUrl || "",
        aiProvider: existingConfig.aiProvider || "openai",
        geminiApiKey: existingConfig.geminiApiKey || "",
        openaiApiKey: existingConfig.openaiApiKey || "",
        openaiBaseUrl: existingConfig.openaiBaseUrl || "",
        openaiModel: existingConfig.openaiModel || "",
        analystPrompt: existingConfig.analystPrompt || "",
        editorPrompt: existingConfig.editorPrompt || "",
        tldrPrompt: existingConfig.tldrPrompt || "",
      });
    } else {
      setEditingThemeConfig({
        webhookUrl: "",
        aiProvider: "openai",
        geminiApiKey: "",
        openaiApiKey: "",
        openaiBaseUrl: "",
        openaiModel: "",
        analystPrompt: "",
        editorPrompt: "",
        tldrPrompt: "",
      });
    }
    setIsThemeConfigModalOpen(true);
  };

  const handleSaveThemeConfig = async () => {
    if (!editingThemeConfigId) return;
    
    setSaveLoading((prev) => ({ ...prev, prompts: true })); // 复用 loading 状态
    try {
      const currentThemeConfigs = settings.themeConfigs || {};
      const newThemeConfigs = {
        ...currentThemeConfigs,
        [editingThemeConfigId]: editingThemeConfig
      };

      const newSettings = { ...settings, themeConfigs: newThemeConfigs };
      await persistSettings(newSettings);
      setSettings(newSettings);
      showSaveToast("卡片独立配置保存成功");
      setIsThemeConfigModalOpen(false);
    } catch (error) {
      console.error("Failed to save theme config:", error);
      showSaveToast("保存失败，请重试");
    } finally {
      setSaveLoading((prev) => ({ ...prev, prompts: false }));
    }
  };

  const handleDeleteThemeConfig = async (themeId: string) => {
    if (!confirm("确定要删除该卡片的独立配置，恢复使用全局配置吗？")) return;
    try {
      const currentThemeConfigs = settings.themeConfigs || {};
      const newThemeConfigs = { ...currentThemeConfigs };
      delete newThemeConfigs[themeId];
      
      const newSettings = { ...settings, themeConfigs: newThemeConfigs };
      await persistSettings(newSettings);
      setSettings(newSettings);
      showSaveToast("已恢复全局配置");
    } catch (error) {
      console.error("Failed to delete theme config:", error);
      showSaveToast("删除失败，请重试");
    }
  };
  // ---------------------------------

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

  /** 取消订阅：从已订阅列表中移除该主题并持久化 */
  const handleUnsubscribeTheme = async (themeId: string) => {
    if (!confirm("确定要取消订阅该主题吗？")) return;
    const newSubscribedThemes = subscribedThemeIds.filter((id) => id !== themeId);
    try {
      const newSettings = { ...settings, subscribedThemes: newSubscribedThemes };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);
      setSubscribedThemeIds(newSubscribedThemes);
      setToastMsg("已取消订阅");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      setToastMsg("取消订阅失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  /** 取消超级订阅：清除关键词并持久化 */
  const handleUnsubscribeSuperSub = async () => {
    if (!confirm("确定要取消超级订阅吗？")) return;
    try {
      const newSettings = { ...settings, superSubKeyword: "" };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);
      setSettings((prev: any) => ({ ...prev, superSubKeyword: "" }));
      setToastMsg("已取消超级订阅");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      setToastMsg("取消失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  /** 获取某主题当前展示的源列表（预设 - 已移除 + 自定义） */
  const getSourcesForTheme = (themeId: string): string[] => {
    const theme = PRESET_THEMES.find((t) => t.id === themeId);
    if (!theme) return [];
    const removed = themeRemovedSources[themeId] || [];
    const preset = theme.sources.filter((u) => !removed.includes(u));
    const custom = customThemeSources[themeId] || [];
    return [...preset, ...custom];
  };

  /** 清空自定义源（只保留各主题下的源） */
  const handleClearCustomSources = async () => {
    if (!confirm("确定要清空自定义源吗？将只保留各主题内的信源。")) return;
    try {
      const themeUrls = subscribedThemeIds.flatMap((id) => getSourcesForTheme(id));
      const newRss = Array.from(new Set(themeUrls));
      await persistRSS(newRss);
      setSettings((prev: any) => ({ ...prev, rssUrls: newRss.join("\n") }));
      setToastMsg("已清空自定义源");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      setToastMsg("操作失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  /** 从某主题中移除一条源（预设则记入 removed，自定义则从 custom 删）并持久化 */
  const handleRemoveSourceFromTheme = async (themeId: string, url: string) => {
    const theme = PRESET_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const custom = customThemeSources[themeId] || [];
    if (custom.includes(url)) {
      const next = { ...customThemeSources, [themeId]: custom.filter((u) => u !== url) };
      setCustomThemeSources(next);
      const newSettings = { ...settings, themeCustomSources: next };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);
      const full = buildFullRssListFromState(next, themeRemovedSources);
      await persistRSS(full);
      setSettings((prev: any) => ({ ...prev, rssUrls: full.join("\n") }));
    } else {
      const removed = themeRemovedSources[themeId] || [];
      if (removed.includes(url)) return;
      const next = { ...themeRemovedSources, [themeId]: [...removed, url] };
      setThemeRemovedSources(next);
      const newSettings = { ...settings, themeRemovedSources: next };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);
      const full = buildFullRssListFromState(customThemeSources, next);
      await persistRSS(full);
      setSettings((prev: any) => ({ ...prev, rssUrls: full.join("\n") }));
    }
    setToastMsg("已移除该源");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  /** 根据 custom + removed 计算完整 rss 列表（供 persist 用，不依赖 state） */
  function buildFullRssListFromState(
    custom: Record<string, string[]>,
    removed: Record<string, string[]>
  ): string[] {
    const themeUrls = subscribedThemeIds.flatMap((id) => {
      const t = PRESET_THEMES.find((x) => x.id === id);
      if (!t) return [];
      const r = removed[id] || [];
      const preset = t.sources.filter((u) => !r.includes(u));
      const add = custom[id] || [];
      return [...preset, ...add];
    });
    const currentRss = settings.rssUrls ? settings.rssUrls.split("\n").filter((u: string) => u.trim()) : [];
    const customOnly = currentRss.filter((u: string) => !themeUrls.includes(u));
    return Array.from(new Set([...themeUrls, ...customOnly]));
  }

  /** 向某主题新增一条源并持久化 */
  const handleAddSourceToTheme = async (themeId: string, url: string) => {
    const u = url.trim();
    if (!u) return;
    const custom = customThemeSources[themeId] || [];
    if (custom.includes(u)) {
      setToastMsg("该源已存在");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      return;
    }
    const next = { ...customThemeSources, [themeId]: [...custom, u] };
    setCustomThemeSources(next);
    setNewRssUrlForTheme("");
    const newSettings = { ...settings, themeCustomSources: next };
    delete (newSettings as any).rssUrls;
    await persistSettings(newSettings);
    const full = buildFullRssListFromState(next, themeRemovedSources);
    await persistRSS(full);
    setSettings((prev: any) => ({ ...prev, rssUrls: full.join("\n") }));
    setToastMsg("已添加源");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  /** 立即发送：不传则用全部订阅；传则仅用该卡片的 RSS 源。cardKey 用于仅在该卡片上显示 loading */
  const handleTriggerDigest = async (cardRssUrls?: string[], cardKey?: string) => {
    if (digestSending) return;
    setDigestSending(true);
    setDigestSendingFrom(cardKey ?? null);
    setDigestRunStartAt(Date.now());
    setDigestRunStatus({ status: "running", progress: 0, message: "正在提交…" });
    try {
      await triggerDigest(cardRssUrls?.length ? cardRssUrls : undefined, cardKey);
    } catch (e) {
      setDigestSending(false);
      setDigestSendingFrom(null);
      setDigestRunStartAt(null);
      setDigestRunStatus({ status: "failed", progress: 0, message: "提交失败" });
      setTimeout(() => setDigestRunStatus(null), 3000);
      return;
    }
  };

  useEffect(() => {
    if (!digestSending || digestRunStatus?.status === "success" || digestRunStatus?.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/digest-run-status");
        const data = await res.json();
        setDigestRunStatus((prev) => {
          if (data.status === "idle" && prev?.status === "running") return prev;
          return data;
        });
        if (data.status === "success" || data.status === "failed") {
          setDigestSending(false);
          setDigestSendingFrom(null);
          setDigestRunStartAt(null);
          setTimeout(() => setDigestRunStatus(null), 4000);
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(t);
  }, [digestSending, digestRunStatus?.status]);


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
    if (!selectedTheme) return;

    // 检查 webhook 地址
    const webhookUrl = modalConfig.webhookUrl || settings.webhookUrl;
    if (!webhookUrl) {
      alert("请输入 Webhook 地址");
      return;
    }

    setLoading(true);
    try {
      // 1. 收集该主题的 RSS 源（主题自带 + 用户自定义）
      const themeSources = selectedTheme.sources || [];
      const customSources = customThemeSources[selectedTheme.id] || [];
      const allThemeSources = [...themeSources, ...customSources];

      // 2. 合并到用户 RSS 列表（去重）
      const currentSources = settings.rssUrls ? settings.rssUrls.split("\n").filter(Boolean) : [];
      const newSources = Array.from(new Set([...currentSources, ...allThemeSources]));
      await persistRSS(newSources);

      // 3. 更新订阅主题列表
      const newSubscribedThemes = Array.from(new Set([...subscribedThemeIds, selectedTheme.id]));

      // 4. 保存设置
      const newSettings = {
        ...settings,
        webhookUrl: webhookUrl,
        pushTime: modalConfig.pushTime,
        pushDays: modalConfig.pushDays,
        subscribedThemes: newSubscribedThemes,
        configCompleted: true,
      };
      delete (newSettings as any).rssUrls;
      await persistSettings(newSettings);

      // 5. 更新本地状态
      setSettings({ ...newSettings, rssUrls: newSources.join("\n") });
      setSubscribedThemeIds(newSubscribedThemes);
      setIsModalOpen(false);

      // 6. 显示成功提示
      setToastMsg("✅ 订阅成功！「" + selectedTheme.title + "」已加入您的订阅列表");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error("Subscribe failed:", e);
      setToastMsg("订阅失败，请重试");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoading(false);
    }
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
          <button onClick={() => requestTabSwitch('shelf')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'shelf' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>主题货架</button>
          <button onClick={() => requestTabSwitch('active')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'active' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>已订阅</button>
          <button onClick={() => requestTabSwitch('settings')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/80 hover:text-white'}`}>配置中心</button>
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
          {isThemeConfigModalOpen && editingThemeConfigId && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => requestThemeModalClose()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#0f172a] border border-white/10 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden ring-1 ring-white/5 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-blue-400 border border-white/10">
                      <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white font-serif">独立配置</h3>
                      <p className="text-xs text-white/50 font-bold mt-1 uppercase tracking-widest">
                        主题：{PRESET_THEMES.find(t => t.id === editingThemeConfigId)?.title}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => requestThemeModalClose()} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                    <X className="w-5 h-5 text-white/50" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8">
                  {/* Webhook */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" /> Webhook 地址
                    </h4>
                    <input 
                      type="text" 
                      value={editingThemeConfig.webhookUrl} 
                      onChange={(e) => setEditingThemeConfig({...editingThemeConfig, webhookUrl: e.target.value})}
                      placeholder="留空则使用全局配置"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-white placeholder:text-white/30"
                    />
                  </div>

                  {/* API */}
                  <div className="space-y-6 pt-6 border-t border-white/10">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" /> API 配置
                    </h4>
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      <button type="button" onClick={() => setEditingThemeConfig({...editingThemeConfig, aiProvider: 'google'})} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${editingThemeConfig.aiProvider === 'google' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Google Gemini</button>
                      <button type="button" onClick={() => setEditingThemeConfig({...editingThemeConfig, aiProvider: 'openai'})} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${editingThemeConfig.aiProvider === 'openai' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>OpenAI / 兼容平台</button>
                    </div>

                    {editingThemeConfig.aiProvider === 'google' ? (
                      <div>
                        <input 
                          type="password" 
                          value={editingThemeConfig.geminiApiKey} 
                          onChange={(e) => setEditingThemeConfig({...editingThemeConfig, geminiApiKey: e.target.value})}
                          placeholder="Gemini API Key (留空则使用全局配置)"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-white placeholder:text-white/30"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <input 
                          type="password" 
                          value={editingThemeConfig.openaiApiKey} 
                          onChange={(e) => setEditingThemeConfig({...editingThemeConfig, openaiApiKey: e.target.value})}
                          placeholder="OpenAI API Key (留空则使用全局配置)"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-white placeholder:text-white/30"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            value={editingThemeConfig.openaiBaseUrl} 
                            onChange={(e) => setEditingThemeConfig({...editingThemeConfig, openaiBaseUrl: e.target.value})}
                            placeholder="Base URL (留空使用全局)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-white placeholder:text-white/30"
                          />
                          <input 
                            type="text" 
                            value={editingThemeConfig.openaiModel} 
                            onChange={(e) => setEditingThemeConfig({...editingThemeConfig, openaiModel: e.target.value})}
                            placeholder="Model Name (留空使用全局)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-white placeholder:text-white/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prompts */}
                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-blue-400" /> AI 提示词
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1 mb-1 block">分析阶段 (Analyst)</label>
                        <textarea 
                          rows={3} 
                          value={editingThemeConfig.analystPrompt} 
                          onChange={(e) => setEditingThemeConfig({...editingThemeConfig, analystPrompt: e.target.value})} 
                          placeholder="留空则使用全局配置..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-sans focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder:text-white/30" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1 mb-1 block">汇总阶段 (Editor)</label>
                        <textarea 
                          rows={3} 
                          value={editingThemeConfig.editorPrompt} 
                          onChange={(e) => setEditingThemeConfig({...editingThemeConfig, editorPrompt: e.target.value})} 
                          placeholder="留空则使用全局配置..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-sans focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder:text-white/30" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1 mb-1 block">今日焦点 (TL;DR)</label>
                        <textarea 
                          rows={3} 
                          value={editingThemeConfig.tldrPrompt} 
                          onChange={(e) => setEditingThemeConfig({...editingThemeConfig, tldrPrompt: e.target.value})} 
                          placeholder="留空则使用全局配置..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-sans focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder:text-white/30" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-white/10 shrink-0 flex items-center justify-between bg-white/5">
                  {settings.themeConfigs?.[editingThemeConfigId] ? (
                    <button 
                      onClick={() => handleDeleteThemeConfig(editingThemeConfigId)}
                      className="px-6 py-3 bg-red-500/10 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> 删除独立配置
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => requestThemeModalClose()}
                      className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
                    >
                      取消
                    </button>
                    {themeConfigDirty && (
                      <button 
                        onClick={handleSaveThemeConfig}
                        disabled={saveLoading.prompts}
                        className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 flex items-center gap-2"
                      >
                        {saveLoading.prompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        保存独立配置
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                        <div className="flex items-center gap-2 mb-4">
                          <Rss className="w-4 h-4 text-blue-100/50" />
                          <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">包含 {theme.sources.length + (customThemeSources[theme.id]?.length || 0)} 个信源</span>
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
              <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">已订阅主题</h2>

              {subscribedThemeIds.length > 0 || settings.rssUrls || settings.superSubKeyword ? (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {/* 已订阅主题卡片 */}
                  {subscribedThemeIds.map((themeId) => {
                    const theme = PRESET_THEMES.find(t => t.id === themeId);
                    if (!theme) return null;
                    const allSources = getSourcesForTheme(themeId);
                    const isExpanded = expandedThemeId === themeId;
                    
                    return (
                      <div 
                        key={themeId}
                        className="break-inside-avoid group relative flex flex-col"
                      >
                        <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-500/20 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5 overflow-hidden">
                          {/* 左上角绿色微光表示已订阅 */}
                          <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-green-500/25 blur-2xl pointer-events-none" aria-hidden />
                          
                          {/* 右上角：新增源（内嵌加号/减号，点击展开或收起）+ 取消订阅 */}
                          <div className="absolute top-6 right-6 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewRssUrlForTheme("");
                                setExpandedThemeId(isExpanded ? null : themeId);
                              }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-green-300 bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 hover:border-green-400/50 transition-all shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                              title={isExpanded ? "收起" : "展开管理 RSS 源"}
                            >
                              新增源
                              {isExpanded ? <span className="text-sm font-light leading-none">−</span> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUnsubscribeTheme(themeId); }}
                              className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="取消订阅"
                              aria-label="取消订阅"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* 头部信息（不再整行点击展开/收起） */}
                          <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-white/10 rounded-2xl text-blue-600 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                              {theme.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-black text-white font-serif">{theme.title}</h3>
                              <p className="text-[10px] text-blue-100/60 mt-0.5">{isExpanded ? "点击「新增源」收起" : "点击「新增源」管理本卡片 RSS 源"}</p>
                            </div>
                          </div>

                          {!isExpanded && (
                            <>
                              <div className="mb-8">
                                <ThemePreview theme={theme} />
                              </div>
                              <p className="text-sm text-blue-100/80 font-medium leading-relaxed">
                                {theme.desc}
                              </p>
                            </>
                          )}

                          {/* 展开：该卡片下的 RSS 列表，可删可增 */}
                          {isExpanded && (
                            <div className="mb-6 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">本卡片共 {allSources.length} 个信源</span>
                              </div>
                              <ul className="space-y-2 max-h-64 overflow-y-auto">
                                {allSources.map((url, idx) => (
                                  <li key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[11px] text-blue-100/80 group/item">
                                    <span className="truncate flex-1">{url}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveSourceFromTheme(themeId, url); }}
                                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                      title="移除该源"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <div className="flex gap-2 pt-2">
                                <input
                                  type="url"
                                  value={expandedThemeId === themeId ? newRssUrlForTheme : ""}
                                  onChange={(e) => setNewRssUrlForTheme(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSourceToTheme(themeId, newRssUrlForTheme); }}
                                  placeholder="新增 RSS 地址"
                                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSourceToTheme(themeId, newRssUrlForTheme)}
                                  className="px-4 py-2 rounded-xl bg-blue-500/80 text-white text-sm font-bold hover:bg-blue-500"
                                >
                                  新增
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                            {!isExpanded && (
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Rss className="w-4 h-4 text-blue-100/50" />
                                  <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">包含 {allSources.length} 个信源</span>
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleTriggerDigest(allSources, theme.id)}
                              disabled={digestSending}
                              className="mt-4 w-full py-3 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                            >
                              {digestSending && digestSendingFrom === theme.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              立即发送
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 超级订阅关键词卡片 */}
                  {settings.superSubKeyword && (
                    <div className="break-inside-avoid relative flex flex-col">
                      <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-500/20 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                        {/* 已订阅标签 + 取消订阅 */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                          <span className="px-4 py-1.5 bg-green-500/20 text-green-300 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-widest">
                            已订阅
                          </span>
                          <button
                            type="button"
                            onClick={handleUnsubscribeSuperSub}
                            className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="取消超级订阅"
                            aria-label="取消超级订阅"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

                        <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                          <div className="flex items-center gap-2">
                            <Rss className="w-4 h-4 text-blue-100/50" />
                            <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">全网检索中</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTriggerDigest(undefined, "super")}
                            disabled={digestSending}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                          >
                            {digestSending && digestSendingFrom === "super" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            立即发送
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 自定义 RSS 源（不属于任何主题的） */}
                  {(() => {
                    const allThemesSources = subscribedThemeIds.flatMap(id => getSourcesForTheme(id)).map(u => u.trim());
                    const customRssSources = settings.rssUrls
                      ? settings.rssUrls.split('\n').map((u: string) => u.trim()).filter((url: string) => url && !allThemesSources.includes(url))
                      : [];
                    
                    if (customRssSources.length === 0) return null;
                    
                    return (
                      <div className="break-inside-avoid relative flex flex-col">
                        <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-white/30 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <div className="p-3.5 bg-white/10 rounded-2xl text-blue-300 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                                <Plus className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-white font-serif">{settings.projectName?.trim() || "自定义源"}</h3>
                                <p className="text-xs text-blue-100/80 font-bold uppercase tracking-widest mt-1">{customRssSources.length} 个信源</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearCustomSources}
                              className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="清空自定义源"
                              aria-label="清空自定义源"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                            <button
                              type="button"
                              onClick={() => { handleTriggerDigest(customRssSources, "custom"); }}
                              disabled={digestSending}
                              className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                            >
                              {digestSending && digestSendingFrom === "custom" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              立即发送
                            </button>
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
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">配置中心</h2>
                {/* 右侧：当前为全局时显示「灵活配置」按钮，当前为灵活时显示「全局统一配置」按钮；点击后切换并提示互斥与生效范围 */}
                <button
                  type="button"
                  onClick={() => requestConfigModeSwitch(configMode === "global" ? "flexible" : "global")}
                  className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-black uppercase tracking-widest text-white transition-all shadow-inner backdrop-blur-sm"
                >
                  {configMode === "global" ? "灵活配置" : "全局统一配置"}
                </button>
              </div>

              {configMode === 'global' ? (
                <p className="text-sm text-white/60 leading-relaxed">
                  以下为<strong className="text-white/80">全局统一配置</strong>，适用于所有已订阅的主题卡片。如需为某张卡片单独设置 Webhook、API 或 AI 提示词，请点击右侧「<strong className="text-white/80">灵活配置</strong>」按钮切换为灵活配置模式，再点击对应卡片进行配置。
                </p>
              ) : (
                <p className="text-sm text-white/60 leading-relaxed">
                  当前为<strong className="text-white/80">灵活配置模式</strong>。点击下方卡片可为其配置独立的 Webhook、API 和 AI 提示词；未独立配置的卡片将默认使用全局统一配置。点击右侧「<strong className="text-white/80">全局统一配置</strong>」按钮可返回全局模式。
                </p>
              )}
              
              <div className="space-y-10">
                {configMode === 'global' ? (
                  <div className="space-y-10 animate-in fade-in duration-500">
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
                      {dirtyWebhook && (
                        <div className="pt-2">
                          <button type="button" onClick={handleSaveWebhook} disabled={saveLoading.webhook} className="px-8 py-3 bg-white text-blue-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-60 flex items-center gap-2">
                            {saveLoading.webhook ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            保存
                          </button>
                        </div>
                      )}
                    </div>

                    {/* API 状态：仅展示兼容 OpenAI API 的平台配置 */}
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

                      <p className="text-xs text-white/50">支持 OpenAI 及兼容其 API 的第三方服务（如国内大模型平台），填写 API Key、Base URL 与模型名即可。</p>

                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">API Key</label>
                          <input 
                            type="password" 
                            value={settings.openaiApiKey || ""} 
                            onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                            placeholder="输入 API Key"
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/50"
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
                      {dirtyApi && (
                        <div className="pt-2">
                          <button type="button" onClick={handleSaveApi} disabled={saveLoading.api} className="px-8 py-3 bg-white text-blue-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-60 flex items-center gap-2">
                            {saveLoading.api ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            保存
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 高级设置 - AI 提示词配置 */}
                    <div className="bg-white/10 rounded-[40px] border border-white/10 p-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 space-y-8">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-2xl text-blue-300 border border-white/10"><BrainCircuit className="w-7 h-7" /></div>
                        <h3 className="text-2xl font-black text-white font-serif">自定义 AI 提示词</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                          <button type="button" onClick={() => setPromptTab('analyst')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'analyst' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>分析阶段</button>
                          <button type="button" onClick={() => setPromptTab('editor')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'editor' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>汇总阶段</button>
                          <button type="button" onClick={() => setPromptTab('tldr')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'tldr' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>今日焦点</button>
                        </div>
                        <div className="animate-in fade-in duration-500">
                          {promptTab === 'analyst' && (
                            <p className="text-xs text-white/50 mb-2">分析阶段：AI 对每条抓取的新闻进行解析与分类，提炼核心内容、打标签并评分，输出结构化结果供后续汇总使用。</p>
                          )}
                          {promptTab === 'editor' && (
                            <p className="text-xs text-white/50 mb-2">汇总阶段：AI 根据已分类的多条新闻，按主题或赛道分组撰写「今日动态」，生成带链接的 Markdown 简报正文。</p>
                          )}
                          {promptTab === 'tldr' && (
                            <p className="text-xs text-white/50 mb-2">今日焦点：AI 从当日全部动态中提炼最值得关注的 1～3 件事，用简短「今日焦点」呈现，便于快速浏览。</p>
                          )}
                          <textarea 
                            name={promptTab === 'analyst' ? 'analystPrompt' : promptTab === 'editor' ? 'editorPrompt' : 'tldrPrompt'} 
                            rows={12} 
                            value={promptTab === 'analyst' ? (settings.analystPrompt !== undefined && settings.analystPrompt !== "" ? settings.analystPrompt : DEFAULT_ANALYST_DISPLAY) : promptTab === 'editor' ? (settings.editorPrompt !== undefined && settings.editorPrompt !== "" ? settings.editorPrompt : DEFAULT_EDITOR_DISPLAY) : (settings.tldrPrompt !== undefined && settings.tldrPrompt !== "" ? settings.tldrPrompt : DEFAULT_TLDR_DISPLAY)} 
                            onChange={(e) => {
                              if (promptTab === 'analyst') setSettings({...settings, analystPrompt: e.target.value});
                              else if (promptTab === 'editor') setSettings({...settings, editorPrompt: e.target.value});
                              else setSettings({...settings, tldrPrompt: e.target.value});
                            }} 
                            placeholder=""
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm font-sans focus:ring-2 focus:ring-blue-400 outline-none transition-all resize-none text-white placeholder:text-white/30" 
                          />
                        </div>
                      </div>
                      {dirtyPrompts && (
                        <div className="pt-2">
                          <button type="button" onClick={handleSavePrompts} disabled={saveLoading.prompts} className="px-8 py-3 bg-white text-blue-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-60 flex items-center gap-2">
                            {saveLoading.prompts ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            保存
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                      <h3 className="text-xl font-black text-white mb-2">已订阅主题卡片</h3>
                      <p className="text-sm text-white/50 mb-8">点击卡片可为其配置独立的 Webhook、API 和 AI 提示词。未独立配置的卡片将默认使用全局统一配置。</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subscribedThemeIds.length === 0 ? (
                          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                            <p className="text-white/40 font-bold text-sm">暂无订阅卡片，请先前往主题货架订阅</p>
                          </div>
                        ) : (
                          subscribedThemeIds.map(themeId => {
                            const theme = PRESET_THEMES.find(t => t.id === themeId);
                            if (!theme) return null;
                            const hasCustomConfig = !!settings.themeConfigs?.[themeId];
                            
                            return (
                              <div 
                                key={themeId}
                                onClick={() => handleOpenThemeConfigModal(themeId)}
                                className={`group cursor-pointer relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${hasCustomConfig ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400/50' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${hasCustomConfig ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/70'}`}>
                                      {theme.icon}
                                    </div>
                                    <h4 className="font-bold text-white text-lg">{theme.title}</h4>
                                  </div>
                                  {hasCustomConfig && (
                                    <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-black rounded-md uppercase tracking-widest">已独立配置</span>
                                  )}
                                </div>
                                <p className="text-xs text-white/50 line-clamp-1">{theme.desc}</p>
                                
                                {/* Hover 提示 */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm flex items-center gap-2">
                                    <Settings2 className="w-4 h-4" /> {hasCustomConfig ? '修改独立配置' : '开启独立配置'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 未保存修改确认弹窗 */}
        <AnimatePresence>
          {confirmUnsaved.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0f172a] border border-white/20 rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6"
              >
                <p className="text-white font-medium leading-relaxed">{confirmUnsaved.message}</p>
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      confirmUnsaved.onDiscard();
                    }}
                    className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
                  >
                    不保存
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await confirmUnsaved.onSave();
                    }}
                    className="px-6 py-3 bg-white text-blue-950 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 立即发送进度条 - 右下角 */}
        <AnimatePresence>
          {digestRunStatus != null && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="fixed bottom-8 right-8 z-[180] w-full max-w-sm px-5 py-4 bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl"
            >
              <button
                type="button"
                onClick={() => {
                  setDigestRunStatus(null);
                  setDigestSending(false);
                  setDigestSendingFrom(null);
                  setDigestRunStartAt(null);
                }}
                className="absolute top-3 right-3 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="pr-8">
                <span className="text-sm font-bold text-white">
                  {digestRunStatus.status === "running" && "简报生成中，预计需要 3～5 分钟，请稍候。"}
                  {digestRunStatus.status === "success" && "✅ 简报生成完成"}
                  {digestRunStatus.status === "failed" && `❌ ${digestRunStatus.message || "失败"}`}
                </span>
              </div>
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
