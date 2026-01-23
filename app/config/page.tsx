"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { testConfigs } from "./test-action";
import { fetchCurrentConfig, persistSettings, persistRSS, triggerDigest, markConfigAsCompleted } from "./actions";
import { pushToAdminBot } from "./admin-actions";
import { 
  CheckCircle2, AlertCircle, Loader2, ExternalLink, BookOpen, ArrowRight, Sparkles,
  Link2, Settings2, LogOut, User, Play, Edit3, ChevronRight, Clock, Calendar, Zap, LayoutDashboard,
  MessageSquare, Send, Plus, Check, Info
} from "lucide-react";
import { CpuIcon, GlobeIcon, RssIcon, WebhookIcon } from "@/components/AnimatedIcons";

type ConfigModule = 'basic' | 'rss' | 'prompts';

const HELP_CONTENT: Record<ConfigModule, any> = {
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
  }
};

// 使用 React.memo 优化子组件，防止不必要的重渲染
const SummaryCard = memo(({ icon, title, value }: any) => {
  return (
    <div className="bg-white p-6 rounded-[24px] border-2 border-gray-50 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-gray-50 rounded-xl">{icon}</div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-lg font-black text-gray-900 truncate">{value}</div>
    </div>
  );
});
SummaryCard.displayName = "SummaryCard";

const ModuleCard = memo(({ id, title, icon, active, result, loading, onActive, onTest, children, hideTestButton }: any) => {
  return (
    <div onClick={onActive} className={`group p-5 rounded-3xl border-2 transition-all duration-300 bg-white shadow-sm cursor-pointer ${active ? 'border-blue-600 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-left">
          <div className={`p-3 rounded-2xl transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{icon}</div>
          <div><h2 className="text-base font-bold text-gray-900 leading-none">{title}</h2></div>
        </div>
        {result?.status === 'success' ? <CheckCircle2 className="text-green-500 w-6 h-6" /> : null}
      </div>
      <div className={`${active ? 'block' : 'hidden'} mt-4 space-y-4`} onClick={(e) => e.stopPropagation()}>
        {children}
        {!hideTestButton ? (
          <button type="button" onClick={onTest} disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "验证并保存"}
          </button>
        ) : null}
        {result && !hideTestButton ? (
          <div className={`p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 ${result.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {result.message}
          </div>
        ) : null}
      </div>
    </div>
  );
});
ModuleCard.displayName = "ModuleCard";

const Input = memo(({ label, ...props }: any) => {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all font-sans`} {...props} />
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
            tldrPrompt: configData.settings?.tldrPrompt || ""
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
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
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

  if (authenticated === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col w-full overflow-hidden font-sans">
      <header className="shrink-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> 返回货架
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-serif italic text-sm select-none">W</span>
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tighter font-serif">Weave <span className="ml-2 text-gray-400 font-normal text-base">RSS</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
            <User className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs font-bold text-gray-700">{username}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row w-full justify-between flex-1 overflow-hidden">
        <div className="lg:w-[60%] h-full overflow-y-auto p-6 lg:p-8 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight font-serif mb-2">
                自定义<span className="text-blue-600">配置模式</span>
              </h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                打造完全属于您的专属情报工作流。
              </p>
            </div>

            <div className="space-y-3">
              <ModuleCard id="basic" title="01. 基础信息配置" active={activeModule === 'basic'} result={results.basic} loading={loading.basic} onActive={() => setActiveModule(activeModule === 'basic' ? null : 'basic')} onTest={() => testAndSave('basic')} icon={<Settings2 />}>
                <div className="pt-3 text-left space-y-4">
                  <Input label="订阅项目名称" name="projectName" value={formState.projectName} onChange={handleChange} placeholder="例如：我的每日科技简报" />
                  
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">推送日期</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[{ label: "周一", val: 1 }, { label: "周二", val: 2 }, { label: "周三", val: 3 }, { label: "周四", val: 4 }, { label: "周五", val: 5 }, { label: "周六", val: 6 }, { label: "周日", val: 0 }].map((day) => (
                        <button key={day.val} type="button" onClick={() => { const newDays = formState.pushDays.includes(day.val) ? formState.pushDays.filter(d => d !== day.val) : [...formState.pushDays, day.val]; setFormState(prev => ({ ...prev, pushDays: newDays })); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formState.pushDays.includes(day.val) ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-400 border-gray-100"}`}>{day.label}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">每日推送时间 (24小时制)</label>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setFormState(prev => ({ ...prev, pushTime: i.toString() }))} className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${formState.pushTime === i.toString() ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105" : "bg-gray-50 text-gray-400 border-gray-100"}`}>{i}:00</button>
                      ))}
                    </div>
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard id="rss" title="02. 订阅源配置" active={activeModule === 'rss'} result={results.rss} loading={loading.rss} onActive={() => setActiveModule(activeModule === 'rss' ? null : 'rss')} onTest={() => testAndSave('rss')} icon={<RssIcon />}>
                <div className="pt-3 text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">手动添加订阅源 (每行一个 URL)</label>
                  <textarea name="rssUrls" rows={6} value={formState.rssUrls} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" placeholder="https://example.com/feed" />
                </div>
              </ModuleCard>

              <ModuleCard id="prompts" title="03. AI 提示词自定义" active={activeModule === 'prompts'} result={results.prompts} loading={loading.prompts} onActive={() => setActiveModule(activeModule === 'prompts' ? null : 'prompts')} onTest={() => testAndSave('prompts')} icon={<Sparkles className="w-6 h-6" />}>
                <div className="pt-3 text-left">
                  <div className="flex bg-gray-100 p-1 rounded-xl mb-4"><button type="button" onClick={() => setPromptTab('analyst')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${promptTab === 'analyst' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>分析阶段</button><button type="button" onClick={() => setPromptTab('editor')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${promptTab === 'editor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>汇总阶段</button><button type="button" onClick={() => setPromptTab('tldr')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${promptTab === 'tldr' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>今日焦点</button></div>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {promptTab === 'analyst' && <textarea name="analystPrompt" rows={6} value={formState.analystPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                    {promptTab === 'editor' && <textarea name="editorPrompt" rows={6} value={formState.editorPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                    {promptTab === 'tldr' && <textarea name="tldrPrompt" rows={6} value={formState.tldrPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                  </div>
                </div>
              </ModuleCard>
            </div>

            {allPassed && (
              <div className="mt-8 flex gap-4 animate-in slide-in-from-bottom-4 duration-700">
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
                  className="flex-1 py-4 bg-blue-600 text-white rounded-[24px] font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:bg-gray-400"
                >
                  {loading.globalSave ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  保存配置生成订阅
                </button>
                <button 
                  onClick={async () => { 
                    await markConfigAsCompleted(true);
                    router.push("/dashboard?tab=active");
                  }} 
                  className="flex-1 py-4 bg-black text-white rounded-[24px] font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3"
                >
                  <LayoutDashboard className="w-5 h-5" /> 进入我的仪表盘
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-[35%] bg-gray-900 text-white p-8 lg:p-10 flex flex-col justify-center relative overflow-hidden h-full">
          <div className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${activeModule && HELP_CONTENT[activeModule] ? HELP_CONTENT[activeModule].color : 'from-blue-600 to-purple-500'} opacity-20 blur-[100px] transition-all duration-700`} />
          <div className="relative z-10 w-full">
            {activeModule && HELP_CONTENT[activeModule] ? (
              <>
                <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Settings2 className="w-12 h-12 text-gray-500 mb-6" />
                  <h3 className="text-xl lg:text-2xl font-black mb-4 tracking-tight">{HELP_CONTENT[activeModule]?.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">{HELP_CONTENT[activeModule]?.desc}</p>
                </header>
                <div className="space-y-8 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                  {HELP_CONTENT[activeModule]?.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>{idx + 1}</div>
                        {idx !== HELP_CONTENT[activeModule].steps.length - 1 ? <div className="w-px h-10 bg-gray-800 mt-2" /> : null}
                      </div>
                      <div><h4 className="text-sm font-bold text-gray-200 mb-1">{step.t}</h4><p className="text-xs text-gray-500 font-medium leading-relaxed">{step.d}</p></div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-700">
                <header className="mb-10">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-black mb-4 tracking-tight text-white">开始您的配置之旅</h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">
                    请在左侧选择一个模块开始配置。我们将引导您完成所有步骤，打造完全属于您的 AI 情报流。
                  </p>
                </header>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">1</div>
                    <span className="text-sm font-bold text-gray-300">设置基础信息</span>
                  </div>
                  <div className="w-0.5 h-4 bg-gray-800 ml-8" />
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">2</div>
                    <span className="text-sm font-bold text-gray-300">添加订阅源</span>
                  </div>
                  <div className="w-0.5 h-4 bg-gray-800 ml-8" />
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">3</div>
                    <span className="text-sm font-bold text-gray-300">自定义 AI</span>
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
