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

// 缂侇偉顕ч悗椋庘偓瑙勭煯缁?
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

// 濡澘瀚鏇熺▔婵犳凹鏆柡浣哄瀹撲線鏁嶇仦绛嬫澔闁告梻濮甸悧鍗烆嚕韫囨稑甯崇紓?const PRESET_THEMES: Theme[] = [
  {
    id: "tech",
    title: "缂佸鍨舵俊褎绋夐幘瀵稿焿",
    desc: "閺夆晛鈧喖鍤嬮柛蹇嬪妿閹棝寮甸埀顒勫礈瀹ュ棝鍎撮柣銊ュ椤牠骞庨埀顒勫礉閵婏腹鍋撴担椋庣憿闁哥喎妫旂粭鐔烘惥鐎ｎ亜鈼?,
    category: "tech",
    icon: <Cpu className="w-5 h-5" />,
    style: "tech", // 缂備礁鐗忛顒侇槹鎼淬垻澹?
    color: "from-blue-400 to-cyan-300",
    sources: [
      "https://techcrunch.com/feed/",
      "https://www.theverge.com/rss/index.xml",
      "https://news.ycombinator.com/rss"
    ],
    preview: [
      { title: "OpenAI 闁告瑦鍨电粩?GPT-5 濡澘瀚～宥夋偋?, meta: "Breaking 鐠?2m ago" },
      { title: "NVIDIA H200 闁间警鍨虫晶鏍ь嚕閳ь剚鎱ㄧ€ｎ亜姣夐悹?, meta: "Hardware 鐠?1h ago" },
      { title: "SpaceX 闁哄嫮鍠曢崺宀€鈧懓鏈崹姘姜閵娾晙澹曟繛鏉戭儓閻?, meta: "Space 鐠?3h ago" },
      { title: "Linux Kernel 6.8 Released", meta: "Software 鐠?5h ago" }
    ]
  },
  {
    id: "finance",
    title: "闁兼祴鈧尙骞?閻犳劑鍨荤划?,
    desc: "閻庡湱鍋炲鍌炲箮婵犲啫缍戦悽顖氬€稿┃鈧柤鏉戭槹閹ɑ绋夋惔锛勬殲閻熸瑥鍊荤划鈥趁规惔銏犵樄闁?,
    category: "tech",
    icon: <LineChart className="w-5 h-5" />,
    style: "finance", // 闁轰胶澧楀畵渚€鎯囩€ｎ偅绶插瀣閻?
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
    title: "闁稿繈鍔庨幃鍡涘棘娴煎瓨顦?,
    desc: "婵絽绻戝Λ鈺呮煂瀹ュ牜娲ｉ柡鍌欏嵆濡炲牆效閸ャ劉鍋撴导娆戠闁烩晜娼欓崵顕€鎮抽弶鎸庣皻",
    category: "tech",
    icon: <Newspaper className="w-5 h-5" />,
    style: "paper", // 闁硅翰鍎抽悞濠冾槹鎼淬垻澹?
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
    title: "AI 閻庡湱鍋ら悰娆戔偓?,
    desc: "婵烇絽宕€瑰磭鍒掗幑鎰靛殺濠㈠爢鍕€渚€宕圭€ｃ劉鍋撴稉鍒nt 濞?AI 閹煎瓨姊婚弫銈嗘交濞戞ê顕?,
    category: "tech",
    icon: <Sparkles className="w-5 h-5" />,
    style: "chat", // 閻庣數顢婇惁钘夘潩閺冣偓閸︾儤顦版惔銏㈠
    color: "from-purple-400 to-pink-300",
    sources: [
      "https://openai.com/blog/rss.xml",
      "https://research.google/blog/rss",
      "https://www.anthropic.com/index.xml"
    ],
    preview: [
      { role: "ai", content: "濞寸姴锕ュΛ?AI 闂佹彃绉堕崑锝夋晬濞嗙epSeek 鐎殿喒鍋撴繝褎鍔掔花锟犲棘妫颁胶顏卞ù?MoE 婵☆垪鈧磭鈧兘鏁嶇仦閿亾瑜戦崗妯兼惥閸涙壆楔 Llama 3..." },
      { role: "user", content: "閻㈩垼鍠楅崹婊堝箑閼姐倗娉㈠☉鎾亾濞戞挸顑呴悾鐘绘儍閸曨剛澹嬮煫鍥у暞閻忥箓寮搁崟顐㈢秮闁告柣鍔婇埀? },
      { role: "ai", content: "闂佹彃娲ㄩ弫銈嗙?160B 闁告瑥鍊归弳鐔兼儍閸曨剝绌块柛姘墔缁楁挾鈧鍩栭悘锕傚几閸曞墎绀夋繝纰樺亾婵炶尪顕у顒勫极妫颁胶鐭?20B闁挎稑鏈敮褰掓偠閸℃稈鍋撻悢宄邦唺闁圭粯鍔曞畷?4 闁稿﹤绉查埀? }
    ]
  },
  {
    id: "anime",
    title: "濞存粌鏈濂稿礂?,
    desc: "闁哄倹澹嗛弳妯兼導閸曨噮鍞甸柕鍡曠劍閺嬩胶鎷犻崟顏嗙憿 ACG 闁革箑鐗嗛崬鎾礉閵婏腹鍋?,
    category: "creative",
    icon: <Gamepad2 className="w-5 h-5" />,
    style: "card", // 闁告绱曟晶鏍槹鎼淬垻澹?
    color: "from-orange-400 to-red-300",
    sources: [
      "https://www.animenewsnetwork.com/news/rss.xml",
      "https://kotaku.com/rss",
      "https://www.siliconera.com/feed/"
    ],
    preview: [
      { title: "闁靛棗锕﹂弫鎼佹煥椤栨瑦鐪介柕鍡楊儏婢т粙宕烽搹鐟邦暭閻庤纰嶉妴?, tag: "闁告挆鍐╃皻闁?, color: "bg-orange-500" },
      { title: "2026 闁告劦鍓欓婊堝棘閹殿喗娈☉鎾亾閻?, tag: "闁哄倹澹嗛弳?, color: "bg-blue-500" },
      { title: "濞寸姾顕ч妵澶愬醇閸屾稒鐓€闁哄牆鎼悗鐑藉箚閸涱喖袚", tag: "婵炴挸鎲￠崹?, color: "bg-red-500" },
      { title: "Comiket 105 闁告瑥鍊搁惈宥囩矆閹勭闁轰焦婢橀崹閬嶅棘娴煎褰?, tag: "閻忕偞娲戠槐?, color: "bg-purple-500" }
    ]
  },
  {
    id: "academic",
    title: "閻庢冻闄勫﹢铏▔閹惧鍩?,
    desc: "濡炪倕澧庢鍥嫉閻斿嘲鐏佸☉鎾抽婢х姴鈻介懗顖ｅ晥闁哄倸娲ㄥ▓鎴﹀疾妤﹀灝鍘撮柟鑺ヮ焾椤?,
    category: "academic",
    icon: <Book className="w-5 h-5" />,
    style: "minimal", // 闁哄鑳堕悾婵堟媼閻戞ɑ鐎瀣閻?
    color: "from-indigo-400 to-blue-300",
    sources: [
      "https://www.nature.com/nature.rss",
      "https://www.science.org/rss/news_current.xml",
      "http://export.arxiv.org/rss/cs.AI"
    ],
    preview: [
      { title: "A New Approach to Brain-Computer Interfaces", author: "Nature 鐠?J. Smith et al." },
      { title: "Quantum Error Correction at Scale", author: "Science 鐠?Team Google" }
    ]
  },
  {
    id: "design",
    title: "閻犱焦宕橀鎼佹倶閸偄濡?,
    desc: "UI/UX 閻℃帒顑呮繛宥夊Υ娴ｇ懓绗撻柣妤€鐗忕欢銊р偓娑崇細缁楀矂宕氬☉娆忓鐎规悶鍎遍崣?,
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
    title: "Web3 闁告挸绉甸柈?,
    desc: "闁告牕鎼锟犳煣閻愵剙螚闁哄牜鍨埀顑跨婵偟鈧潧妫滈幓锝囨暜娴ｉ鐟㈤柛妯款唺閼垫垼绠涢崘銊ヮ嚙閹煎瓨姊婚弫?,
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
    title: "闁绘瑯鍓涢悵娑橆嚕閳ь剟宕?,
    desc: "濞戞挴鍋撳ù婊冩惈閸欐洟宕ｉ幖鐐╁亾娑撶嘲aS 闁哄瀚紓鎾寸▔鎼粹槅鏉婚梻鈧崸妤冩嫧閻?,
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
      { title: "Launch: AI-powered Notion Template", meta: "ProductHunt 鐠?#1" },
      { title: "How I reached $10k MRR in 3 months", meta: "IndieHackers" },
      { title: "Stripe acquires new payment startup", meta: "TechCrunch" }
    ]
  },
  {
    id: "health",
    title: "闁稿鍎遍幃宥夋偨閻斿憡銇?,
    desc: "缂佸鍨甸鐔煎礂閼姐倖鏅搁柕鍡曠娴犳挳鐓锝呯樄闁告銇炵粭宀冪疀閸愵亝鍊為柛瀣ㄥ劚閹?,
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
    title: "閻犱降鍊楅悡陇绠涢崘顏呭€?,
    desc: "闁规亽鍨婚崒銊﹀緞瑜戦崜铏附閵壯屾僵闁靛棔娴囬、鎴炵▔閾忓湱鐥呮繛鏉戦椤掔喐绋夋惔鈶╁亾濠靛牊妯婃俊顖椻偓宕団偓?,
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
  { id: "all", label: "闁稿繈鍔戦崕? },
  { id: "tech", label: "缂佸鍨舵俊褎绋夋惔鈩冩珜濞? },
  { id: "creative", label: "闁告帗绋掗崜鐗堢▔鎼淬値鍟庨悹? },
  { id: "life", label: "闁汇垻鍠愬鎸庣▔鎼粹€叉樊閹? },
  { id: "academic", label: "閻庢冻闄勫﹢铏▔鎼淬垻绠掗幖? }
];

// 婵炴挸寮堕悡瀣▔瀹ュ懏鍊卞瀣閻楁悂鎯冮崟顖ｆ殨閻熸瑥鐗忕划宥嗙?const ThemePreview = ({ theme }: { theme: Theme }) => {
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
                {item.trend === 'up' ? '闁? : '闁?} {item.value}
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

  // 闁瑰吋绮庨崒銊╁椽鐏炶棄鐎荤紒顐ュ吹婵悂骞€?  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 閻犱降鍨藉Σ鍕嚕閸︻厾宕堕柣妯垮煐閳?  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    webhookUrl: "",
    pushTime: "8",
    pushDays: [1, 2, 3, 4, 5] as number[]
  });

  // 婵烇綀顕ф慨鐐烘嚊椤忓嫮鏆板☉鏂款槹缁喖顕ｉ崷顓犲炊闁绘鍩栭埀?  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [addSourceTargetThemeId, setAddSourceTargetThemeId] = useState<string | null>(null);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  // 閻庢稒锚閸嬪秴袙韫囧酣鍤嬪☉鎾愁煼椤ｄ粙鎯冮崟顔兼閻庤鐭粻鐔封攦?  const [customThemeSources, setCustomThemeSources] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function init() {
      try {
        const response = await fetch("/api/auth/me");
        const authData = await response.json();
        if (!authData.authenticated) { router.push("/auth"); return; }
        setAuthenticated(true);
        setUsername(authData.username);

        const config = await fetchCurrentConfig();
        // 閻?rssSources 闁轰焦澹嗙划宥嗘姜椤掍礁搴婂☉鎾虫惈閻⊙呯箔閿旇儻顩鐐舵硾閹酣鐛捄鍝勭厒 settings 濞?        const settingsWithRss = {
          ...(config.settings || {}),
          rssUrls: config.rssSources ? config.rssSources.join("\n") : ""
        };
        setSettings(settingsWithRss);
        // 闁告帗绻傞～鎰板礌閺嵮冨殥閻犱降鍨藉Σ鍕▔婵犳凹鏆柛鎺擃殙閵?
        setSubscribedThemeIds(config.settings?.subscribedThemes || []);
        // 闁告帗绻傞～鎰板礌閺嵮嗗墾缂佹劖顨婇崢銈囩磾?        setModalConfig({
          webhookUrl: config.settings?.webhookUrl || "",
          pushTime: config.settings?.pushTime || "8",
          pushDays: config.settings?.pushDays || [1, 2, 3, 4, 5]
        });

        // 婵☆偀鍋撻柡?URL 闁告瑥鍊归弳?
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
      // 闁规亽鍔戦埀顑胯兌閸嬶絿鎸ч悙鎻掔厒闂傚啯瀵уΛ鎾儍?Webhook
      await fetch("https://365.kdocs.cn/woa/api/v1/webhook/send?key=113a89749298fba10dcae6b7cb60db09", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: `妫ｅ啫鐨?闁规壆鍠曢梼鍧楁⒓閹稿孩锛旈柨娑楄兌閺併倝骞?[${username}] 闁告帗鑹鹃崹鐗堢▔鏉炴壆绋戦柣鎰扳偓娑氬晩濞戞挴鍋撳☉鎿冧海缁傛劙鏁嶇仦鎯уΤ閻犲婢€缂嶆﹢骞撻幇顏嗚繑闁汇劌瀚崢銈囨嫻?API 缂傚洤锕ラ惁娲晬娑?}
        })
      });
      alert("闁绘劗顢婄粋鎰板箣閹邦剙顫犻柨娑楃閸戯繝鏌呭宕囩畺 Webhook 闁告稑锕ㄩ惁鏃堟⒓閹稿孩锛旈柛鐕佹础");
    } catch (e) {
      alert("闁绘劗顢婄粋鎰緞鏉堫偉袝闁挎稑濂旂徊楣冩⒓閹稿孩锛旈柟鎵枎瑜板牓宕氭０浣哄晩濞达絿濮峰▓鎴ｇ疀閸愨晛澹堥柨?);
    } finally {
      setThanksLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    // 閺夆晜鐟╅崳閿嬫償閺冨浂鍤夐柡鍫濐槷缁斿瓨绋?loading 闁绘鍩栭埀顑跨筏缁辨繈寮抽崒娑欘槯闁活亙鑳堕弳?
    try {
      await persistSettings(settings);
      alert("濞戞搩浜欏Ч澶嬬▔椤撶偟濡囬梺鏉跨Ф閻ゅ棗顔忛煫顓犵閻庢稒锕槐?);
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("濞ｅ洦绻傞悺銊﹀緞鏉堫偉袝闁挎稑鐭侀顒勬煂瀹ュ牏妲搁柕?);
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
    // 濠碘€冲€归悘澶婎啅閸欏绠掗梺鏉跨Ф閻ゅ棝鏁嶇仦鐓庘枏闁活潿鍔庨獮鍥嫉婢舵劕甯崇紓鍐惧櫙缁遍亶宕ラ敃鈧崹顖涙媴鐠恒劍鏆忓娑欘焾椤?
    setModalConfig({
      webhookUrl: settings.webhookUrl || "",
      pushTime: settings.pushTime || "8",
      pushDays: settings.pushDays || [1, 2, 3, 4, 5]
    });
    setIsModalOpen(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedTheme) return; // Add guard for selectedTheme

    if (!modalConfig.webhookUrl && !settings.webhookUrl) {
      alert("閻犲洤鍢查敐鐐哄礃?Webhook 闁革附婢樺鍐╃閵夛箑澶嶉柡鈧懜闈涜吂闂?);
      return;
    }

    setLoading(true);
    try {
      // 1. 濞ｅ洦绻傞悺?RSS
      const currentSources = settings.rssUrls ? settings.rssUrls.split("\n").filter(Boolean) : [];
      
      // 闁告艾鐗嗛懟鐔哥▔婵犳凹鏆娑欘焾椤撹鈹冮幇顒佸闁活潿鍔嶉崺娑㈡嚊椤忓嫮鏆板☉鏂款槹閸у﹪宕濋悩鍨暠婵?      const themeCustomSources = customThemeSources[selectedTheme.id] || [];
      const allThemeSources = [...selectedTheme.sources, ...themeCustomSources];

      const newSources = Array.from(new Set([...currentSources, ...allThemeSources]));
      await persistRSS(newSources);

      // 2. 濞ｅ洦绻傞悺銊ф媼閸撗呮瀭 (Webhook & Schedule) - 濞戞挸绉寸€垫﹢宕?rssUrls
      const newSubscribedThemeIds = Array.from(new Set([...subscribedThemeIds, selectedTheme.id]));
      const newSettingsForSave = {
        ...settings,
        webhookUrl: modalConfig.webhookUrl || settings.webhookUrl,
        pushTime: modalConfig.pushTime,
        pushDays: modalConfig.pushDays,
        subscribedThemes: newSubscribedThemeIds, // 濞ｅ洦绻傞悺銊ф媼閵忋倖顫夐柣銊ュ鐎靛本锛愬Δ鐠傞柛鎺擃殙閵?
        // 缁绢収鍠曠换姘跺礂閺堢數閾傞煫鍥ф嚀椤╋妇鈧稒顨嗛宀€鈧稒锚濠€?
        aiProvider: settings.aiProvider || "google",
        configMode: settings.configMode || "simple"
      };
      delete (newSettingsForSave as any).rssUrls; // 闁告帞濞€濞?rssUrls 闂侇剙鐏濋崢銈団偓娑櫭崣?settings
      await persistSettings(newSettingsForSave);
      
      // 3. 闁哄洤鐡ㄩ弻濠囧嫉椤掆偓濠€鎾偐閼哥鍋撴笟濠勭闁告牕鎳庨幆?rssUrls 闁活潿鍔嬬花顒勫礈瀹ュ浂浼傞柡鍕⒔閵囨岸鏁?      const newSettings = {
        ...newSettingsForSave,
        rssUrls: newSources.join("\n")
      };
      setSettings(newSettings);
      setSubscribedThemeIds(newSubscribedThemeIds);
      setIsModalOpen(false);
      alert(`妫ｅ啫绔?閻犱降鍨藉Σ鍕箣閹邦剙顫犻柨娑楃閸戔剝绋夐悜妯轰憾婵烇綀顕ф慨?[${selectedTheme.title}] 闁告帗濯介褰掓⒓閸涱厼鐏欓悶娑栧妸閳ь兛绻?;
      
      // 闁告帡鏀遍弻濠冦亜閻㈠憡妗ㄩ柟瀛樼墳閻戯附娼?      // router.refresh(); // 闁告瑯鍨堕埀?    } catch (error) {
      console.error("Subscription failed:", error);
      alert("閻犱降鍨藉Σ鍕緞鏉堫偉袝闁挎稑鐭侀顒勬煂瀹ュ牏妲?);
    } finally {
      setLoading(false);
    }
  };

  // 閺夆晛娲﹂幎銈嗙▔婵犳凹鏆梺顐ｆ缁?
  const filteredThemes = PRESET_THEMES.filter(theme => {
    const matchesSearch = theme.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          theme.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || theme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden relative">
      {/* 濡炪倕鐖奸崕瀵糕偓浣冨閸?*/}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-[#030712]/60 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/home")}>
          <span className="text-xl font-black tracking-tighter font-serif text-white drop-shadow-md">Weave</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-sm">
            <button onClick={() => setActiveTab('shelf')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'shelf' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/60 hover:text-white'}`}>濞戞挸顭烽。鐣屾嫻瑜庨悘?/button>
            <button onClick={() => setActiveTab('active')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'active' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/60 hover:text-white'}`}>鐎规瓕灏褰掓⒓?/button>
            <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/60 hover:text-white'}`}>濞戞搩浜欏Ч澶嬬▔椤撶偟濡?/button>
          </nav>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
              <User className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-bold text-white">{username}</span>
            </div>
            <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="p-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
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
                        <h3 className="text-2xl font-black text-blue-950">閻犱降鍨藉Σ鍕煀瀹ュ洨鏋?/h3>
                        <p className="text-xs text-blue-900/40 font-bold mt-1 uppercase tracking-widest">濞戞挸顭烽。浠嬫晬濮濈府electedTheme.title}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                      <X className="w-5 h-5 text-blue-900/30" />
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Webhook 闂佹澘绉堕悿?(濞寸姴鎳庣紞瀣嫉椤忓牆甯崇紓鍐惧枟濡炲倿寮伴崜褋浠? */}
                    {!settings.webhookUrl && (
                      <div className="space-y-3">
                        <label className="text-xs font-black text-blue-900/30 uppercase tracking-widest ml-1 block">Webhook 闁革附婢樺?(闊洤鎳庨敐?</label>
                        <input 
                          type="text" 
                          value={modalConfig.webhookUrl}
                          onChange={(e) => setModalConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                          placeholder="閻犲洨鏌夌欢顓㈠礂閵夛附绨氶柛锝冨妺濮?Webhook 闁革附婢樺?
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-blue-950 placeholder:text-blue-900/20"
                        />
                        <p className="text-[10px] text-blue-900/20 ml-1 font-medium">濡絾鐗楅鑲╂媼閵忋倖顫夐梻鍥ｅ亾闂佹澘绉堕悿鍡涘箳閵夛附鏆柛锔芥緲濞煎啴鏁嶇仦鑺ュ€电紓渚囧幖瑜版煡鎯勭€涙ê澶嶅璺虹Ф閺併倝濡?/p>
                      </div>
                    )}

                    {/* 闁规亽鍔戦埀顑跨劍濡炲倿姊?*/}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-blue-900/20 uppercase tracking-widest ml-1 block">婵絽绻戝Λ鈺呭箳閵娾斁鍋撴担瑙勵槯闂?/label>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setModalConfig(prev => ({ ...prev, pushTime: i.toString() }))} 
                            className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${modalConfig.pushTime === i.toString() ? "bg-blue-950 text-white shadow-lg scale-105" : "bg-white/5 text-blue-900/30 border-white/10 hover:border-white/20 hover:bg-white/10"}`}
                          >
                            {i}:00
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 闁规亽鍔戦埀顑跨閹冲棝寮?*/}
                    <div className="space-y-3">
                      <label className="text-xs font-black text-blue-900/20 uppercase tracking-widest ml-1 block">闁规亽鍔戦埀顑跨閹冲棝寮?/label>
                      <div className="flex flex-wrap gap-2">
                        {[{ label: "闁告稏鍔嬬粩?, val: 1 }, { label: "闁告稏鍔嬬花?, val: 2 }, { label: "闁告稏鍔嬬粭?, val: 3 }, { label: "闁告稏鍔屽ú?, val: 4 }, { label: "闁告稏鍔嬬花?, val: 5 }, { label: "闁告稏鍔岄崣?, val: 6 }, { label: "闁告稏鍔嶅Λ?, val: 0 }].map((day) => (
                          <button 
                            key={day.val} 
                            onClick={() => { 
                              const newDays = modalConfig.pushDays.includes(day.val) ? modalConfig.pushDays.filter(d => d !== day.val) : [...modalConfig.pushDays, day.val]; 
                              setModalConfig(prev => ({ ...prev, pushDays: newDays })); 
                            }} 
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${modalConfig.pushDays.includes(day.val) ? "bg-blue-600/10 text-blue-600 border-blue-500/20 shadow-lg shadow-blue-900/5" : "bg-white/5 text-blue-900/20 border-white/10 hover:border-white/20"}`}
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
                        缁绢収鍠涢鑽ゆ媼閵忋倖顫?
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {isAddSourceModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setIsAddSourceModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white border border-white/10 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-blue-950 uppercase tracking-tighter">婵烇綀顕ф慨?RSS 婵?/h3>
                    <button onClick={() => setIsAddSourceModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
                      <X className="w-5 h-5 text-blue-900/30" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-black text-blue-900/30 uppercase tracking-widest ml-1 block">RSS 闂佸墽鍋撶敮?/label>
                    <input 
                      type="text" 
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-blue-950 placeholder:text-blue-900/20"
                    />
                  </div>

                  <button 
                    onClick={handleAddSource}
                    disabled={!newSourceUrl.trim()}
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:bg-gray-100 disabled:shadow-none disabled:text-gray-400"
                  >
                    <Plus className="w-6 h-6" />
                    缁绢収鍠涢璇睬庣拠鎻掝潱
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
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">闂侇偄顦扮€氥劍鎷呴悩鎻掑綘婵炲鍔庡▓鎴炵▔婵犳凹鏆?/h2>
              </div>

              {/* 闁瑰吋绮庨崒銊╁椽鐏炶棄鐎荤紒顐ょ帛閻?*/}
              <div className="space-y-8 bg-white/10 p-8 rounded-[40px] border border-white/10 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 group-focus-within:text-white transition-colors" />
                  <input 
                    type="text" 
                    placeholder="闁瑰吋绮庨崒銊╁箛閻斿嘲褰洪悺鎺炵悼濞堟垶绋夋繝姘兼毌闁挎稑鐗嗛々褔鏁嶅▎鐧愰柕鍡曟祰椤旀洜鎷嬫幊閳ь兛娴囬崒銊х磼?..闁? 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-[24px] pl-16 pr-8 py-6 text-lg outline-none focus:ring-2 focus:ring-blue-400 transition-all font-medium text-white placeholder:text-white/20"
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
                          : "bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredThemes.map((theme, index) => (
                  <motion.div 
                    key={theme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="break-inside-avoid group relative flex flex-col"
                  >
                    <div className="relative bg-white/5 rounded-[40px] p-8 shadow-2xl border border-white/10 hover:border-blue-400/30 hover:-translate-y-2 transition-all duration-500 backdrop-blur-md ring-1 ring-white/5">
                      {/* 濠㈣埖鎸抽崕瀛樼┍閳╁啩绱?*/}
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
                          閻犱降鍨藉Σ?
                        </button>
                      </div>

                      {/* 鐎瑰壊鍠栫槐鎾诲礌閺嶎収鏆曢悷娆忕墢缁秵绂?*/}
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
                            <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">闁告牕鎳庨幆?{theme.sources.length + (customThemeSources[theme.id]?.length || 0)} 濞戞搩浜欐穱濠傗攦?/span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddSourceModal(theme.id);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-black text-blue-300 hover:text-blue-200 bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-widest"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            婵烇綀顕ф慨鐐测攦?                          </button>
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
                
                {/* 闁煎浜為弫閬嶆煀瀹ュ洨鏋傞柛蹇嬪劚瑜?*/}
                <div 
                  onClick={() => router.push("/config")}
                  className="break-inside-avoid cursor-pointer group"
                >
                  <div className="relative bg-white/5 rounded-[40px] p-8 border-2 border-dashed border-white/10 hover:border-blue-400/50 hover:bg-blue-500/10 transition-all duration-500 flex flex-col items-center justify-center text-center h-[280px] space-y-6 backdrop-blur-md">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 shadow-lg flex items-center justify-center text-white/60 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-500">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white font-serif italic">闁煎浜為弫閬嶆煀瀹ュ洨鏋傛俊顖椻偓宕囩</h3>
                      <p className="text-sm text-blue-100/50 mt-2 font-bold uppercase tracking-widest">闁煎浜滈悾鐐▕婢跺浜堕柣銊ュ缁楁挾浠﹂悙鏉戝壈闁硅翰鍎茬粊?/p>
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
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">鐎规瓕灏褰掓⒓閸涱剙鐦滃Λ?/h2>
                <button onClick={() => router.push("/config")} className="flex items-center gap-3 text-blue-600 font-black text-sm uppercase tracking-[0.2em] hover:text-blue-700 transition-colors group">
                  闁哄倹婢橀·鍐嚊椤忓嫮鏆板☉鏂款樀閸樸倗绱?<Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              {subscribedThemeIds.length > 0 || settings.rssUrls ? (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {/* 鐎规瓕灏褰掓⒓閸涱剙鐦滃Λ鐗埫畷閬嶆偋?*/}
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
                          {/* 鐎规瓕灏褰掓⒓閸涱喚鍨肩紒?*/}
                          <div className="absolute top-6 right-6 px-4 py-1.5 bg-green-500/20 text-green-300 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-widest">
                            鐎规瓕灏褰掓⒓?                          </div>
                          
                          {/* 濠㈣埖鎸抽崕瀛樼┍閳╁啩绱?*/}
                          <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-white/10 rounded-2xl text-blue-600 border border-white/10 group-hover:bg-white group-hover:text-blue-950 transition-all duration-500">
                              {theme.icon}
                            </div>
                            <h3 className="text-xl font-black text-white font-serif">{theme.title}</h3>
                          </div>

                          {/* 鐎瑰壊鍠栫槐鎾诲礌閺嶎収鏆曢悷娆忕墢缁秵绂?*/}
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
                                <span className="text-[10px] font-black text-blue-100/50 uppercase tracking-[0.2em]">闁告牕鎳庨幆?{allSources.length} 濞戞搩浜欐穱濠傗攦?/span>
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
                  
                  {/* 闁煎浜滈悾鐐▕?RSS 婵犙勫姧缁辨瑦绋夊鍛剑濞存粌绨奸幑銏℃媴閺囨艾鐦滃Λ鐗堫焽濞堟垿鏁?*/}
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
                              <h3 className="text-xl font-black text-white font-serif">闁煎浜滈悾鐐▕婢跺鐖?/h3>
                              <p className="text-xs text-blue-100/60 font-bold uppercase tracking-widest mt-1">{customRssSources.length} 濞戞搩浜欐穱濠傗攦?/p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {customRssSources.slice(0, 5).map((url: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-blue-100/70 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                                <span className="truncate">{url}</span>
                              </div>
                            ))}
                            {customRssSources.length > 5 && (
                              <p className="text-[10px] text-blue-100/50 font-black uppercase tracking-widest text-center pt-2">閺夆晜蓱濠€?{customRssSources.length - 5} 濞戞搩浜濆ú鎸庡緞濮橆厾鐖?..</p>
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
                  <p className="text-blue-200/70 font-bold text-xl mb-10 uppercase tracking-[0.2em]">闁诡喓鍔忕换鏇炩柦閳╁啯绠掗悹浣靛灲濡插嫭绂掔拋宕囩Э濞戞挸顭烽。?/p>
                  <button onClick={() => setActiveTab('shelf')} className="px-12 py-5 bg-white text-blue-950 rounded-[24px] font-black text-xl shadow-2xl shadow-white/5 hover:scale-105 transition-all">闁告顔婄€靛本锛愬Ο鎸庡經闁哄澧庡﹢鍛存儑?/button>
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
                <h2 className="text-5xl font-black tracking-tight font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200/60">濞戞搩浜欏Ч澶嬬▔椤撶偟濡?/h2>
                <button 
                  onClick={() => document.getElementById('settings-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                  className="px-8 py-3 bg-white text-blue-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                >
                  濞ｅ洦绻傞悺銊ф媼閸撗呮瀭
                </button>
              </div>
              
              <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-10">
                {/* Webhook 闂佹澘绉堕悿?*/}
                <div className="bg-white/10 rounded-[40px] border border-white/10 p-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl text-blue-300 border border-white/10"><Bell className="w-7 h-7" /></div>
                    <h3 className="text-2xl font-black text-white font-serif">闁规亽鍔戦埀顑挎祰椤旀洜绱?/h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Webhook 闁革附婢樺?/label>
                      <input 
                        type="text" 
                        value={settings.webhookUrl || ""} 
                        onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                        placeholder="閻犲洨鏌夌欢顓㈠礂閵夛附绨氶柛锝冨妺濮?Webhook 闁革附婢樺?
                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* API 闁绘鍩栭埀?*/}
                <div className="bg-white/10 rounded-[40px] border border-white/10 p-10 shadow-2xl backdrop-blur-md ring-1 ring-white/5 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-white/10 rounded-2xl text-blue-300 border border-white/10"><Zap className="w-7 h-7" /></div>
                      <h3 className="text-2xl font-black text-white font-serif">AI 鐎殿喗娲橀幖鎼佹煀瀹ュ洨鏋?/h3>
                    </div>
                    {(!settings.geminiApiKey && !settings.openaiApiKey) && (
                      <button 
                        type="button"
                        onClick={handleThanks} disabled={thanksLoading}
                        className="px-5 py-2.5 bg-blue-500/20 text-blue-300 rounded-xl font-black text-[10px] hover:bg-blue-500/30 transition-all flex items-center gap-2 border border-blue-500/30 uppercase tracking-widest"
                      >
                        {thanksLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Heart className="w-3.5 h-3.5 fill-current" />}
                        濞达綀娉曢弫銈夊礂瀹ュ牆鐎?API (闁规壆鍠曢梼鍧楁⒓閹稿孩锛?
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'google'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${settings.aiProvider === 'google' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>Google Gemini</button>
                      <button type="button" onClick={() => setSettings({...settings, aiProvider: 'openai'})} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${settings.aiProvider === 'openai' ? 'bg-white text-blue-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>OpenAI / 闁稿繒鍘ч鎰扮嵁閸愭彃閰?/button>
                    </div>

                    {settings.aiProvider === 'google' ? (
                      <div className="animate-in fade-in duration-500">
                        <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Gemini API Key</label>
                        <input 
                          type="password" 
                          value={settings.geminiApiKey || ""} 
                          onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                          placeholder="闁伙絾鐟ч埞鏍礆濞嗗骸鈻忛柣顫妼閸樸倗鎷硅ぐ鎺濇澓閹?
                          className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-base outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/30"
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
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-black text-white uppercase tracking-widest ml-1 mb-3 block">Model Name</label>
                            <input 
                              type="text" 
                              value={settings.openaiModel || ""} 
                              onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                              placeholder="gpt-4o"
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all font-sans text-white placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 閹煎瓨娲熼崕鎾箰婢舵劖灏︾紒澶婎煼濞呭酣鏁嶇仦钘夊殥缂佸妲掗崵锔姐亜閸洖鍔?*/}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function Dashboard() { return ( <Suspense fallback={<div className=" \min-h-screen flex items-center justify-center bg-transparent\\><Loader2 className=\\w-12 h-12 animate-spin text-white\\ /></div>}><DashboardContent /></Suspense> ); }
