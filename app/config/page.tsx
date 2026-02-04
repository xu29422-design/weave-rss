"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { testConfigs } from "./test-action";
import { fetchCurrentConfig, persistSettings, persistRSS, triggerDigest, markConfigAsCompleted } from "./actions";
import { pushToAdminBot } from "./admin-actions";
import { 
  CheckCircle2, AlertCircle, Loader2, ExternalLink, BookOpen, ArrowRight, Sparkles,
  Link2, Settings2, LogOut, User, Play, Edit3, ChevronRight, Clock, Calendar, Zap, LayoutDashboard,
  MessageSquare, Send, Plus, Check, Info, Heart
} from "lucide-react";
import { RssIcon } from "@/components/AnimatedIcons";
import { motion } from "framer-motion";

type ConfigModule = 'basic' | 'rss' | 'prompts';

interface HelpStep {
  t: string;
  d: string;
}

interface HelpContent {
  title: string;
  desc: string;
  color: string;
  steps: HelpStep[];
}

const HELP_CONTENT: Record<ConfigModule, HelpContent> = {
  basic: {
    title: "基础信息配置",
    desc: "设置您的订阅项目名称及推送时间。",
    color: "from-blue-600 to-cyan-500",
    steps: [
      { t: "项目名称", d: "为您的订阅流起一个好听的名字。" },
      { t: "推送时间", d: "选择每天发送简报的具体时间点。" },
      { t: "推送周期", d: "灵活设置工作日或全周推送。" }
    ]
  },
  rss: {
    title: "订阅源配置",
    desc: "手动添加您关注的 RSS 订阅源。",
    color: "from-orange-500 to-red-600",
    steps: [
      { t: "获取链接", d: "复制目标网站的 RSS/Atom Feed 地址。" },
      { t: "批量添加", d: "每行输入一个 URL，支持批量粘贴。" },
      { t: "验证保存", d: "系统将自动验证源的有效性并保存。" }
    ]
  },
  prompts: {
    title: "AI 提示词自定义",
    desc: "定义 AI 的分析逻辑、写作风格及总结方式。",
    color: "from-purple-600 to-pink-600",
    steps: [
      { t: "分析阶段", d: "控制 AI 如何对单条新闻进行分类、打分和提炼。" },
      { t: "汇总阶段", d: "控制 AI 如何将多条新闻组合成易读的日报段落。" },
      { t: "今日焦点", d: "控制 AI 如何撰写每日最核心的 100 字精华摘要。" }
    ]
  },
  kdocs: {
    title: "轻维表推送配置",
    desc: "将简报数据同步到金山文档轻维表，方便后续查阅和分析。",
    color: "from-green-600 to-emerald-600",
    steps: [
      { t: "获取凭证", d: "在金山文档开放平台注册应用，获取 App ID 和 App Secret。" },
      { t: "创建轻维表", d: "在金山文档中创建轻维表，获取 File Token 和 DBSheet ID。" },
      { t: "配置字段", d: "确保轻维表包含必要的字段：日期、今日焦点、分类数量等。" }
    ]
  }
};

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}

// 使用 React.memo 优化子组件，防止不必要的重渲染
const SummaryCard = memo(({ icon, title, value }: SummaryCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="bg-white/5 p-6 rounded-[28px] border border-white/5 shadow-2xl backdrop-blur-md hover:border-white/20 transition-all group ring-1 ring-white/5"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white group-hover:text-[#030712] transition-all duration-500 shadow-lg">{icon}</div>
        <span className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="text-xl font-black text-white truncate font-serif italic drop-shadow-sm">{value}</div>
    </motion.div>
  );
});
SummaryCard.displayName = "SummaryCard";

interface ModuleCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  active: boolean;
  result?: { status: 'success' | 'error'; message: string };
  loading?: boolean;
  onActive: () => void;
  onTest: () => void;
  children: React.ReactNode;
  hideTestButton?: boolean;
}

const ModuleCard = memo(({ id, title, icon, active, result, loading, onActive, onTest, children, hideTestButton }: ModuleCardProps) => {
  return (
    <div onClick={onActive} className={`group p-6 rounded-[32px] border-2 transition-all duration-500 bg-white/5 shadow-2xl backdrop-blur-md cursor-pointer ring-1 ring-white/5 ${active ? 'border-blue-500 bg-white/10' : 'border-transparent hover:border-white/10 hover:bg-white/10'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5 text-left">
          <div className={`p-4 rounded-2xl transition-all duration-500 ${active ? 'bg-white text-[#030712]' : 'bg-white/5 text-blue-200/70 border border-white/5'}`}>
             {/* 统一缩小 Icon 尺寸 */}
             <div className="w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
          </div>
          <div><h2 className={`text-lg font-black tracking-tight transition-colors ${active ? 'text-white' : 'text-white/90'}`}>{title}</h2></div>
        </div>
        {result?.status === 'success' ? <CheckCircle2 className="text-green-400 w-7 h-7" /> : null}
      </div>
      <div className={`${active ? 'block' : 'hidden'} mt-8 space-y-6`} onClick={(e) => e.stopPropagation()}>
        {children}
        {!hideTestButton ? (
          <button type="button" onClick={onTest} disabled={loading} className="w-full py-4 bg-white text-[#030712] rounded-[20px] font-black text-base hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "验证并保存"}
          </button>
        ) : null}
        {result && !hideTestButton ? (
          <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border ${result.status === 'success' ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
            {result.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {result.message}
          </div>
        ) : null}
      </div>
    </div>
  );
});
ModuleCard.displayName = "ModuleCard";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input = memo(({ label, ...props }: InputProps) => {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em] ml-1">{label}</label>
      <input className={`w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-sans text-white placeholder:text-white/30`} {...props} />
    </div>
  );
});
Input.displayName = "Input";

export default function ConfigWizard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isDashboard, setIsDashboard] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ConfigModule | null>(null);
  const [promptTab, setPromptTab] = useState<'analyst' | 'editor' | 'tldr'>('analyst');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  
  const [taskStatus, setTaskStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [taskProgress, setTaskStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [feedback, setFeedback] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [thanksLoading, setThanksLoading] = useState(false);

  const handleUseFreeApi = () => {
    // 预设免费 API 配置
    const PRESET_FREE_API = {
      aiProvider: "openai" as const,
      openaiApiKey: "fcd9114b61ff49259c8770eba426f6e5.eiMdQXWwcOi6SAu7",
      openaiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      openaiModel: "glm-4.5-flash"
    };

    setFormState(prev => ({
      ...prev,
      ...PRESET_FREE_API
    }));
    setAiProvider("openai");
    
    // 自动切换到 AI 模块并展开
    setActiveModule("prompts");
    setPromptTab("analyst");
    
    // 异步通知管理员
    pushToAdminBot('feedback', { 
      type: 'use_free_api',
      username,
      message: "用户在配置页使用了免费 API" 
    });
  };

  const [formState, setFormState] = useState({
    projectName: "我的每日简报",
    aiProvider: "google" as "google" | "openai",
    geminiApiKey: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: "",
    webhookUrl: "",
    pushTime: "8",
    pushDays: [1, 2, 3, 4, 5] as number[],
    rssUrls: "",
    // 轻维表配置
    analystPrompt: `你是一位专业的科技情报分析师。请对提供的单条新闻条目进行分析并分类。
要求：
1. 提炼核心内容，控制在 100 字以内。
2. 按照以下类别进行分类：'AI Tech', 'Product', 'Market', 'Coding', 'Other'。
3. 给出 1-10 的评分，衡量其对行业从业者的参考价值。
4. 输出必须是 JSON 格式。`,
    editorPrompt: `你是一位资深科技媒体主编。请根据提供的 \${count} 条关于 [\${category}] 领域的新闻，撰写今日动态。

要求：
1. 按照具体的二级子赛道或技术主题进行分组（如：【大模型演进】、[智能硬件] 等）。
2. 每条新闻以列表项形式呈现。
3. 格式：**标题** 简短描述。[链接](url)
4. 将 URL 放在“[链接]”文字中。
5. 保持专业、简洁。
6. 使用 Markdown 格式。`,
    tldrPrompt: `作为主编，请根据今日所有的行业动态，撰写一个“今日焦点”。
要求：
1. 提炼今日最震撼或最重要的 1-3 件事。
2. 总字数在 100 字以内。
3. 格式：🌟 今日焦点 内容内容...`
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (!data.authenticated) { router.push("/auth"); return; }
        setAuthenticated(true);
        setUsername(data.username);
      } catch (error) { 
        console.error("Auth check failed:", error);
        router.push("/auth"); 
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function init() {
      if (!authenticated) return;
      
      try {
        // 使用 Promise.all 并行获取数据，消除瀑布流
        const [configData] = await Promise.all([
          fetchCurrentConfig(),
          // 如果未来有其他初始化请求，可以放在这里并行执行
        ]);

        if (configData.settings || configData.rssSources) {
          const newState = {
            projectName: configData.settings?.projectName || "我的每日简报",
            aiProvider: configData.settings?.aiProvider || "google",
            geminiApiKey: configData.settings?.geminiApiKey || "",
            openaiApiKey: configData.settings?.openaiApiKey || "",
            openaiBaseUrl: configData.settings?.openaiBaseUrl || "",
            openaiModel: configData.settings?.openaiModel || "",
            webhookUrl: configData.settings?.webhookUrl || "",
            pushTime: configData.settings?.pushTime || "8",
            pushDays: configData.settings?.pushDays || [1, 2, 3, 4, 5],
            rssUrls: configData.rssSources?.join("\n") || "",
            analystPrompt: configData.settings?.analystPrompt || "",
            editorPrompt: configData.settings?.editorPrompt || "",
            tldrPrompt: configData.settings?.tldrPrompt || "",
          };
          setFormState(newState);
          if (configData.settings?.aiProvider) setAiProvider(configData.settings.aiProvider);
          if (configData.settings?.configCompleted) setIsDashboard(true);
          
          const initialResults: any = {};
          if (configData.settings?.geminiApiKey || configData.settings?.openaiApiKey) initialResults.ai = { status: 'success', message: '已保存' };
          if (configData.settings?.webhookUrl) initialResults.webhook = { status: 'success', message: '已保存' };
          if (configData.rssSources?.length > 0) initialResults.rss = { status: 'success', message: '已保存' };
          initialResults.prompts = { status: 'success', message: '已保存' };
          initialResults.basic = { status: 'success', message: '已保存' };
          setResults(initialResults);
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    }
    init();
  }, [authenticated]);

  const [aiProvider, setAiProvider] = useState<"google" | "openai">("google");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormState(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  async function testAndSave(module: ConfigModule) {
    setLoading(prev => ({ ...prev, [module]: true }));
    const formData = new FormData();
    Object.entries(formState).forEach(([k, v]) => {
      if (Array.isArray(v)) formData.append(k, JSON.stringify(v));
      else formData.append(k, String(v));
    });
    formData.set("aiProvider", aiProvider); 

    try {
      // 极简模式下跳过 AI 校验
      let moduleResult = { status: 'success', message: '已保存' };
      // 只有 rss 需要后端校验，其他直接保存
      if (module === 'rss') {
        const allResults = await testConfigs(formData) as any;
        moduleResult = allResults[module] || { status: 'success', message: '已保存' };
      }
      
      setResults(prev => ({ ...prev, [module]: moduleResult }));
      
      if (moduleResult.status === 'success') {
        if (module === 'rss') {
          const urls = formState.rssUrls.split("\n").map(u => u.trim()).filter(Boolean);
          await persistRSS(urls);
        } else {
          await persistSettings({
            ...formState,
            aiProvider: aiProvider,
          } as any);
        }
        
        // 异步推送到管理员机器人
        pushToAdminBot('config_update', { module, formState });

        if (module === 'basic') setActiveModule('rss');
        else if (module === 'rss') setActiveModule('prompts');
        else if (module === 'prompts') setActiveModule(null);
      }
    } catch (e) {
      setResults(prev => ({ ...prev, [module]: { status: 'error', message: '校验或保存失败' } }));
    } finally {
      setLoading(prev => ({ ...prev, [module]: false }));
    }
  }

  const allPassed = results.basic?.status === 'success' && results.rss?.status === 'success' && results.prompts?.status === 'success';

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (authenticated === null) return <div className="min-h-screen flex items-center justify-center bg-[#030712]"><Loader2 className="w-12 h-12 animate-spin text-blue-400" /></div>;

  return (
    <div className="h-screen text-white flex flex-col w-full overflow-hidden font-sans relative">
      <header className="shrink-0 z-50 bg-[#030712]/60 backdrop-blur-xl border-b border-white/5 supports-[backdrop-filter]:bg-[#030712]/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> 返回货架
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            <span className="text-lg font-black text-white tracking-tighter font-serif">Weave</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-400/20 backdrop-blur-sm">
            <User className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-xs font-bold text-blue-200">{username}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row w-full justify-between flex-1 overflow-hidden relative z-10">
        <div className="lg:w-[60%] h-full overflow-y-auto p-8 lg:p-12 flex flex-col items-center">
          <div className="w-full max-w-2xl">
              <div className="mb-10">
                <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight font-serif mb-4 italic">
                  自定义<span className="text-blue-400">配置模式</span>
                </h1>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-widest leading-relaxed">
                  打造完全属于您的专属情报工作流
                </p>
              </div>

            <div className="space-y-4">
              <ModuleCard id="basic" title="01. 基础信息配置" active={activeModule === 'basic'} result={results.basic} loading={loading.basic} onActive={() => setActiveModule(activeModule === 'basic' ? null : 'basic')} onTest={() => testAndSave('basic')} icon={<Settings2 />}>
                <div className="pt-2 text-left space-y-6">
                  <Input label="订阅项目名称" name="projectName" value={formState.projectName} onChange={handleChange} placeholder="例如：我的每日科技简报" />
                  
                  <div>
                    <label className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em] ml-1 mb-3 block">推送日期</label>
                    <div className="flex flex-wrap gap-2.5">
                      {[{ label: "周一", val: 1 }, { label: "周二", val: 2 }, { label: "周三", val: 3 }, { label: "周四", val: 4 }, { label: "周五", val: 5 }, { label: "周六", val: 6 }, { label: "周日", val: 0 }].map((day) => (
                        <button key={day.val} type="button" onClick={() => { const newDays = formState.pushDays.includes(day.val) ? formState.pushDays.filter(d => d !== day.val) : [...formState.pushDays, day.val]; setFormState(prev => ({ ...prev, pushDays: newDays })); }} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-all ${formState.pushDays.includes(day.val) ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 text-blue-200/60 border-white/5 hover:border-white/20"}`}>{day.label}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em] ml-1 mb-3 block">每日推送时间 (24小时制)</label>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setFormState(prev => ({ ...prev, pushTime: i.toString() }))} className={`py-2 text-xs font-black rounded-xl border transition-all ${formState.pushTime === i.toString() ? "bg-white text-[#1e1b4b] border-white shadow-xl scale-105" : "bg-white/5 text-blue-200/60 border-white/5 hover:border-white/20"}`}>{i}:00</button>
                      ))}
                    </div>
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard id="rss" title="02. 订阅源配置" active={activeModule === 'rss'} result={results.rss} loading={loading.rss} onActive={() => setActiveModule(activeModule === 'rss' ? null : 'rss')} onTest={() => testAndSave('rss')} icon={<RssIcon />}>
                <div className="pt-2 text-left space-y-3">
                  <label className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em] ml-1 block">手动添加订阅源 (每行一个 URL)</label>
                  <textarea name="rssUrls" rows={8} value={formState.rssUrls} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 text-sm font-sans focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder:text-white/30" placeholder="https://example.com/feed" />
                </div>
              </ModuleCard>

              <ModuleCard id="prompts" title="03. 配置你的AI-APIkey" active={activeModule === 'prompts'} result={results.prompts} loading={loading.prompts} onActive={() => setActiveModule(activeModule === 'prompts' ? null : 'prompts')} onTest={() => testAndSave('prompts')} icon={<Sparkles />}>
                <div className="pt-2 text-left space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em] ml-1">配置你的AI-APIkey</div>
                    <button 
                      type="button"
                      onClick={handleUseFreeApi} disabled={thanksLoading}
                      className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl font-black text-[9px] hover:bg-blue-500/30 transition-all flex items-center gap-2 border border-blue-500/30 uppercase tracking-widest"
                    >
                      {thanksLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3 fill-current" />}
                      使用免费 API (感谢阿旭)
                    </button>
                  </div>
                  <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/10">
                    <button type="button" onClick={() => setPromptTab('analyst')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'analyst' ? 'bg-white text-[#1e1b4b] shadow-lg' : 'text-blue-200/60 hover:text-white'}`}>分析阶段</button>
                    <button type="button" onClick={() => setPromptTab('editor')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'editor' ? 'bg-white text-[#1e1b4b] shadow-lg' : 'text-blue-200/60 hover:text-white'}`}>汇总阶段</button>
                    <button type="button" onClick={() => setPromptTab('tldr')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${promptTab === 'tldr' ? 'bg-white text-[#1e1b4b] shadow-lg' : 'text-blue-200/60 hover:text-white'}`}>今日焦点</button>
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <textarea 
                      name={promptTab === 'analyst' ? 'analystPrompt' : promptTab === 'editor' ? 'editorPrompt' : 'tldrPrompt'} 
                      rows={10} 
                      value={promptTab === 'analyst' ? formState.analystPrompt : promptTab === 'editor' ? formState.editorPrompt : formState.tldrPrompt} 
                      onChange={handleChange} 
                      className="w-full bg-black/20 border border-white/10 rounded-2xl p-5 text-sm font-sans focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white" 
                    />
                  </div>
                </div>
              </ModuleCard>
            </div>

            {allPassed && (
              <div className="mt-12 flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-6 duration-1000">
                <button 
                  onClick={async () => {
                    setLoading(prev => ({ ...prev, globalSave: true }));
                    try {
                      await markConfigAsCompleted(true);
                      alert("🎉 订阅已生成！您的专属情报流已开始工作。");
                    } catch (e) {
                      alert("保存失败，请重试");
                    } finally {
                      setLoading(prev => ({ ...prev, globalSave: false }));
                    }
                  }}
                  disabled={loading.globalSave}
                  className="flex-1 py-5 bg-white text-[#030712] rounded-[28px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/5 flex items-center justify-center gap-4 disabled:bg-white/20"
                >
                  {loading.globalSave ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                  保存配置生成订阅
                </button>
                <button 
                  onClick={async () => { 
                    await markConfigAsCompleted(true);
                    router.push("/dashboard?tab=active");
                  }} 
                  className="flex-1 py-5 bg-blue-500 text-white rounded-[28px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-4"
                >
                  <LayoutDashboard className="w-6 h-6" /> 进入我的仪表盘
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-[35%] bg-black/20 text-white p-10 lg:p-12 flex flex-col relative overflow-hidden h-full border-l border-white/5 backdrop-blur-md shadow-2xl">
          <div className={`absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br ${activeModule && HELP_CONTENT[activeModule] ? HELP_CONTENT[activeModule].color : 'from-blue-600/30 to-purple-600/30'} opacity-30 blur-[120px] transition-all duration-1000`} />
          <div className="relative z-10 w-full">
            {activeModule && HELP_CONTENT[activeModule] ? (
              <>
                <header className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h3 className="text-3xl font-black mb-4 tracking-tighter font-serif italic text-white">{HELP_CONTENT[activeModule]?.title}</h3>
                  <p className="text-base text-blue-50 leading-relaxed font-bold uppercase tracking-widest">{HELP_CONTENT[activeModule]?.desc}</p>
                </header>
                <div className="space-y-10 text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-100">
                  {HELP_CONTENT[activeModule]?.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-8 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-blue-200/60 group-hover:bg-white group-hover:text-[#030712] group-hover:scale-110 transition-all duration-500`}>{idx + 1}</div>
                        {idx !== HELP_CONTENT[activeModule].steps.length - 1 ? <div className="w-px h-12 bg-white/5 mt-3" /> : null}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white mb-2 font-serif">{step.t}</h4>
                        <p className="text-sm text-blue-50 font-medium leading-relaxed">{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-1000">
                <header className="mb-12">
                  <h3 className="text-4xl font-black mb-6 tracking-tighter text-white font-serif italic">开始您的配置之旅</h3>
                  <p className="text-base text-white/80 leading-relaxed font-normal tracking-wide">
                    请在左侧选择一个模块开始配置。我们将引导您完成所有步骤，打造完全属于您的 AI 情报流。
                  </p>
                </header>
                <div className="space-y-0">
                  <div className="flex items-center gap-6 p-6 rounded-[32px] hover:bg-white/5 transition-all duration-500">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/30">1</div>
                    <span className="text-lg font-bold text-white">设置基础信息</span>
                  </div>
                  
                  <div className="w-0.5 h-8 bg-white/20 ml-12" />
                  
                  <div className="flex items-center gap-6 p-6 rounded-[32px] hover:bg-white/5 transition-all duration-500">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-sm backdrop-blur-md">2</div>
                    <span className="text-lg font-bold text-white">添加订阅源</span>
                  </div>
                  
                  <div className="w-0.5 h-8 bg-white/20 ml-12" />
                  
                  <div className="flex items-center gap-6 p-6 rounded-[32px] hover:bg-white/5 transition-all duration-500">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-sm backdrop-blur-md">3</div>
                    <span className="text-lg font-bold text-white">自定义 AI</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
