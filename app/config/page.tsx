"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { testConfigs } from "./test-action";
import { fetchCurrentConfig, persistSettings, persistRSS, triggerDigest, markConfigAsCompleted } from "./actions";
import { 
  Database, Bot, Webhook, CheckCircle2, AlertCircle,
  Loader2, ExternalLink, BookOpen, ArrowRight, Sparkles,
  Rss, Link2, Cpu, Globe, Settings2, LogOut, User,
  Play, Edit3, ChevronRight, Clock, Calendar, Zap, LayoutDashboard
} from "lucide-react";

type ConfigModule = 'ai' | 'schedule' | 'webhook' | 'rss' | 'prompts';

const helpContent: Record<string, any> = {
  ai: {
    title: "AI 引擎配置指南",
    desc: "支持 Google Gemini 原生接入或任何兼容 OpenAI 协议的平台（如 DeepSeek, Groq）。",
    steps: [
      { t: "选择平台", d: "推荐 Gemini 1.5 Flash (免费) 或 DeepSeek (高性价比)。" },
      { t: "Base URL", d: "如果使用非 OpenAI 官方服务，请填写中转或私有地址。" },
      { t: "模型匹配", d: "请确保填写的 Model ID 与平台提供的一致。" }
    ],
    color: "from-indigo-600 to-purple-500"
  },
  schedule: {
    title: "定时推送设置",
    desc: "您可以自由设定每天接收简报的时间点。系统将按此时间准时送达。",
    steps: [
      { t: "选择时间点", d: "点击下方的小时按钮进行选择。" },
      { t: "选择日期", d: "勾选您希望接收推送的星期。" },
      { t: "时区说明", d: "目前统一使用北京时间 (UTC+8)。" }
    ],
    color: "from-blue-600 to-cyan-500"
  },
  prompts: {
    title: "AI 提示词自定义",
    desc: "您可以完全掌控 AI 如何分析、分类和汇总您的信息流。支持自定义 Prompt。",
    steps: [
      { t: "分析阶段", d: "Analyst Agent 负责单条内容的打分、总结和分类。" },
      { t: "汇总阶段", d: "Editor Agent 负责将分类内容撰写成优美的日报段落。" },
      { t: "TL;DR", d: "全局总结 Agent 负责生成最顶部的“今日焦点”。" }
    ],
    color: "from-fuchsia-600 to-pink-500"
  },
  webhook: {
    title: "Webhook 推送配置",
    desc: "Webhook 负责将生成的每日简报发送到您的通讯软件（如企业微信、飞书）。",
    steps: [
      { t: "添加机器人", d: "在群组设置中添加一个自定义机器人。" },
      { t: "获取链接", d: "复制机器人提供的 Webhook URL。" },
      { t: "验证联通", d: "点击测试按钮，确认您的机器人能收到推送。" }
    ],
    color: "from-emerald-600 to-teal-500"
  },
  rss: {
    title: "RSS 订阅源设置",
    desc: "订阅源是情报的“原材料”，您可以添加多个高质量科技媒体的 RSS 链接。",
    steps: [
      { t: "寻找源地址", d: "通常在网站底部会有 RSS 图标或链接。" },
      { t: "批量录入", d: "每行输入一个 URL，支持标准 RSS/Atom 格式。" },
      { t: "时效过滤", d: "系统会自动过滤 24h 内的新闻，避免信息过载。" }
    ],
    color: "from-orange-500 to-amber-500"
  }
};

export default function ConfigWizard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isDashboard, setIsDashboard] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ConfigModule>('ai');
  const [promptTab, setPromptTab] = useState<'analyst' | 'editor' | 'tldr'>('analyst');
  const [webhookTab, setWebhookTab] = useState<'webhook' | 'email'>('webhook');
  const [aiProvider, setAiProvider] = useState<'google' | 'openai'>('google');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  
  // 任务执行状态
  const [taskStatus, setTaskStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [taskProgress, setTaskStatusMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [formState, setFormState] = useState({
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

  // 检查登录状态
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (!data.authenticated) { router.push("/auth"); return; }
        setAuthenticated(true);
        setUsername(data.username);
      } catch (error) { router.push("/auth"); }
    }
    checkAuth();
  }, [router]);

  // 初始化数据
  useEffect(() => {
    async function init() {
      if (!authenticated) return;
      const data = await fetchCurrentConfig();
      if (data.settings || data.rssSources) {
        const newState = {
          aiProvider: data.settings?.aiProvider || "google",
          geminiApiKey: data.settings?.geminiApiKey || "",
          openaiApiKey: data.settings?.openaiApiKey || "",
          openaiBaseUrl: data.settings?.openaiBaseUrl || "",
          openaiModel: data.settings?.openaiModel || "",
          webhookUrl: data.settings?.webhookUrl || "",
          pushTime: data.settings?.pushTime || "8",
          pushDays: data.settings?.pushDays || [1, 2, 3, 4, 5],
          rssUrls: data.rssSources?.join("\n") || "",
          analystPrompt: data.settings?.analystPrompt || "",
          editorPrompt: data.settings?.editorPrompt || "",
          tldrPrompt: data.settings?.tldrPrompt || ""
        };
        setFormState(newState);
        if (data.settings?.aiProvider) setAiProvider(data.settings.aiProvider);
        if (data.settings?.configCompleted) setIsDashboard(true);
        
        // 标记所有已保存的模块为成功
        const initialResults: any = {};
        if (data.settings?.geminiApiKey || data.settings?.openaiApiKey) initialResults.ai = { status: 'success', message: '已保存' };
        if (data.settings?.webhookUrl) initialResults.webhook = { status: 'success', message: '已保存' };
        if (data.rssSources?.length > 0) initialResults.rss = { status: 'success', message: '已保存' };
        initialResults.prompts = { status: 'success', message: '已保存' };
        setResults(initialResults);
      }
    }
    init();
  }, [authenticated]);

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
      const allResults = await testConfigs(formData) as any;
      const moduleResult = allResults[module] || { status: 'success', message: '已保存' };
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
        // 自动跳转
        if (module === 'ai') setActiveModule('schedule');
        else if (module === 'schedule') setActiveModule('prompts');
        else if (module === 'prompts') setActiveModule('webhook');
        else if (module === 'webhook') setActiveModule('rss');
      }
    } catch (e) {
      setResults(prev => ({ ...prev, [module]: { status: 'error', message: '校验或保存失败' } }));
    } finally {
      setLoading(prev => ({ ...prev, [module]: false }));
    }
  }

  const allPassed = results.ai?.status === 'success' && results.prompts?.status === 'success' && results.webhook?.status === 'success' && results.rss?.status === 'success';

  const handleRunTask = async () => {
    setTaskStatus('running');
    setTaskStatusMessage("正在初始化任务...");
    setProgressPercent(10);
    
    try {
      // 模拟进度
      setTimeout(() => { setTaskStatusMessage("正在抓取 RSS 订阅源..."); setProgressPercent(30); }, 1000);
      setTimeout(() => { setTaskStatusMessage("AI 正在深度分析内容..."); setProgressPercent(60); }, 3000);
      setTimeout(() => { setTaskStatusMessage("正在组装并推送简报..."); setProgressPercent(90); }, 6000);

      const res = await triggerDigest();
      if (res.success) {
        setTimeout(() => {
          setTaskStatus('success');
          setTaskStatusMessage("任务启动成功！请在 1-3 分钟后检查您的机器人。");
          setProgressPercent(100);
        }, 8000);
      } else {
        throw new Error("启动失败");
      }
    } catch (e) {
      setTaskStatus('error');
      setTaskStatusMessage("任务启动失败，请检查 Inngest 服务配置。");
      setProgressPercent(0);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // 仪表盘模式
  if (isDashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden font-sans">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-serif italic text-base select-none">W</span>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tighter font-serif">Weave <span className="ml-3 text-gray-400 font-normal text-lg">RSS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">{username}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors font-bold text-sm">
              <LogOut className="w-4 h-4" /> 退出登录
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-8 lg:p-16">
          {/* 上部：操作区 */}
          <div className="bg-white rounded-[40px] border-2 border-gray-100 p-10 shadow-xl shadow-blue-900/5 mb-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-black text-gray-900 mb-3 flex items-center justify-center md:justify-start gap-3">
                  <Zap className="w-8 h-8 text-blue-600 fill-blue-600" /> 任务控制中心
                </h2>
                <p className="text-gray-500 font-medium">配置已就绪。您可以立即执行一次全量任务，或修改您的配置。</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={() => { setIsDashboard(false); markConfigAsCompleted(false); }}
                  className="flex-1 md:flex-none px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-5 h-5" /> 修改配置
                </button>
                <button 
                  onClick={handleRunTask}
                  disabled={taskStatus === 'running'}
                  className="flex-1 md:flex-none px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                >
                  {taskStatus === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  立即测试并推送
                </button>
              </div>
            </div>

            {/* 进度条 */}
            {taskStatus !== 'idle' && (
              <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-end mb-4">
                  <span className={`text-sm font-black uppercase tracking-widest ${taskStatus === 'error' ? 'text-red-500' : 'text-blue-600'}`}>
                    {taskProgress}
                  </span>
                  <span className="text-2xl font-black text-gray-900">{progressPercent}%</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className={`h-full transition-all duration-700 ease-out rounded-full ${taskStatus === 'error' ? 'bg-red-500' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {taskStatus === 'success' && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 font-bold animate-in zoom-in">
                    <CheckCircle2 className="w-5 h-5" /> 任务已成功发送到云端处理队列
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 下部：配置展示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SummaryCard icon={<Cpu className="text-indigo-500" />} title="AI 引擎" value={formState.aiProvider === 'google' ? "Google Gemini" : `OpenAI (${formState.openaiModel})`} />
            <SummaryCard icon={<Clock className="text-blue-500" />} title="推送时间" value={`每天 ${formState.pushTime}:00`} />
            <SummaryCard icon={<Calendar className="text-purple-500" />} title="推送周期" value={formState.pushDays.length === 7 ? "每天" : formState.pushDays.length === 5 ? "工作日" : "自定义"} />
            <SummaryCard icon={<Webhook className="text-emerald-500" />} title="推送渠道" value={formState.webhookUrl ? "Webhook 机器人" : "未配置"} />
            <SummaryCard icon={<Rss className="text-orange-500" />} title="订阅源" value={`${formState.rssUrls.split('\n').filter(Boolean).length} 个活跃信源`} />
            <SummaryCard icon={<Sparkles className="text-pink-500" />} title="提示词" value="已自定义" />
          </div>
        </main>
      </div>
    );
  }

  // 配置模式
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-serif italic text-base select-none">W</span>
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tighter font-serif">Weave <span className="ml-3 text-gray-400 font-normal text-lg">RSS</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-bold text-gray-700">{username}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors font-bold text-sm">
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row w-full justify-between">
        <div className="lg:w-[60%] p-8 lg:p-16 xl:p-24 flex flex-col justify-center min-h-screen">
          <div className="w-full max-w-3xl">
            <div className="mb-12">
              <h1 className="text-4xl xl:text-5xl font-black text-gray-900 tracking-tight font-serif">
                Weave <span className="ml-4 text-blue-600 font-normal">RSS</span>
              </h1>
              <p className="text-gray-500 mt-4 text-lg font-medium leading-relaxed">
                完成以下 5 步配置，开启您的智能情报之旅。
              </p>
            </div>

            <div className="space-y-4">
              <ModuleCard 
                id="ai" title="01. AI 引擎配置" active={activeModule === 'ai'} result={results.ai} loading={loading.ai}
                onActive={() => setActiveModule('ai')} onTest={() => testAndSave('ai')} icon={<Cpu className="w-6 h-6" />}
              >
                <div className="space-y-4 pt-4 text-left">
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button type="button" onClick={() => setAiProvider('google')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${aiProvider === 'google' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Google Gemini</button>
                    <button type="button" onClick={() => setAiProvider('openai')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${aiProvider === 'openai' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>OpenAI / 兼容平台</button>
                  </div>
                  {aiProvider === 'google' ? (
                    <Input label="Gemini API Key" name="geminiApiKey" type="password" value={formState.geminiApiKey} onChange={handleChange} />
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <Input label="OpenAI API Key" name="openaiApiKey" type="password" value={formState.openaiApiKey} onChange={handleChange} />
                      <Input label="Base URL (可选)" name="openaiBaseUrl" value={formState.openaiBaseUrl} onChange={handleChange} placeholder="https://api.openai.com/v1" />
                      <Input label="Model Name" name="openaiModel" value={formState.openaiModel} onChange={handleChange} placeholder="gpt-4o" />
                    </div>
                  )}
                </div>
              </ModuleCard>

              <ModuleCard 
                id="schedule" title="02. 定时推送设置" active={activeModule === 'schedule'} result={{status: 'success', message: '已保存'}} loading={loading.schedule}
                onActive={() => setActiveModule('schedule')} onTest={() => testAndSave('schedule')} icon={<Globe className="w-6 h-6" />}
              >
                <div className="pt-4 text-left">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">推送日期</label>
                  <div className="flex flex-wrap gap-2 mt-3 mb-6">
                    {[
                      { label: "周一", val: 1 }, { label: "周二", val: 2 }, { label: "周三", val: 3 },
                      { label: "周四", val: 4 }, { label: "周五", val: 5 }, { label: "周六", val: 6 }, { label: "周日", val: 0 }
                    ].map((day) => (
                      <button
                        key={day.val}
                        type="button"
                        onClick={() => {
                          const newDays = formState.pushDays.includes(day.val)
                            ? formState.pushDays.filter(d => d !== day.val)
                            : [...formState.pushDays, day.val];
                          setFormState(prev => ({ ...prev, pushDays: newDays }));
                        }}
                        className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${
                          formState.pushDays.includes(day.val)
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-gray-50 text-gray-400 border-gray-100 hover:border-blue-200"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>

                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">每日推送时间 (24小时制)</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormState(prev => ({ ...prev, pushTime: i.toString() }))}
                        className={`py-2 text-sm font-bold rounded-xl border transition-all ${
                          formState.pushTime === i.toString()
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                            : "bg-gray-50 text-gray-400 border-gray-100 hover:border-blue-200"
                        }`}
                      >
                        {i}:00
                      </button>
                    ))}
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard 
                id="prompts" title="03. AI 提示词自定义 (高级)" active={activeModule === 'prompts'} result={results.prompts} loading={loading.prompts}
                onActive={() => setActiveModule('prompts')} onTest={() => testAndSave('prompts')} icon={<Sparkles className="w-6 h-6" />}
              >
                <div className="pt-4 text-left">
                  <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button type="button" onClick={() => setPromptTab('analyst')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'analyst' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>分析阶段</button>
                    <button type="button" onClick={() => setPromptTab('editor')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'editor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>汇总阶段</button>
                    <button type="button" onClick={() => setPromptTab('tldr')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'tldr' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>今日焦点</button>
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {promptTab === 'analyst' && <textarea name="analystPrompt" rows={8} value={formState.analystPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                    {promptTab === 'editor' && <textarea name="editorPrompt" rows={8} value={formState.editorPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                    {promptTab === 'tldr' && <textarea name="tldrPrompt" rows={8} value={formState.tldrPrompt} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />}
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard 
                id="webhook" title="04. 推送渠道" active={activeModule === 'webhook'} result={results.webhook} loading={loading.webhook}
                onActive={() => setActiveModule('webhook')} onTest={() => testAndSave('webhook')} icon={<Webhook className="w-6 h-6" />}
              >
                <div className="pt-4 text-left">
                  <Input label="Webhook URL" name="webhookUrl" value={formState.webhookUrl} onChange={handleChange} placeholder="机器人 Webhook 地址" />
                </div>
              </ModuleCard>

              <ModuleCard 
                id="rss" title="05. 订阅源配置" active={activeModule === 'rss'} result={results.rss} loading={loading.rss}
                onActive={() => setActiveModule('rss')} onTest={() => testAndSave('rss')} icon={<Rss className="w-6 h-6" />}
              >
                <div className="pt-4 text-left">
                  <textarea name="rssUrls" rows={6} value={formState.rssUrls} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none mt-1.5" />
                </div>
              </ModuleCard>
            </div>

            {allPassed && (
              <div className="mt-12 animate-in slide-in-from-bottom-8 duration-700">
                <button 
                  onClick={() => { setIsDashboard(true); markConfigAsCompleted(true); }}
                  className="w-full py-6 bg-black text-white rounded-[30px] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4"
                >
                  <LayoutDashboard className="w-6 h-6" /> 进入我的仪表盘
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-[30%] bg-gray-900 text-white p-8 lg:p-12 xl:p-16 flex flex-col justify-center relative overflow-hidden min-h-screen">
          <div className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${helpContent[activeModule]?.color || 'from-blue-600 to-purple-500'} opacity-20 blur-[100px] transition-all duration-700`} />
          <div className="relative z-10 w-full">
            <header className="mb-10">
              <Settings2 className="w-12 h-12 text-gray-500 mb-6" />
              <h3 className="text-2xl xl:text-3xl font-black mb-4 tracking-tight">{helpContent[activeModule]?.title}</h3>
              <p className="text-base text-gray-400 leading-relaxed font-medium">{helpContent[activeModule]?.desc}</p>
            </header>
            <div className="space-y-8 text-left">
              {helpContent[activeModule]?.steps.map((step: any, idx: number) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>{idx + 1}</div>
                    {idx !== helpContent[activeModule].steps.length - 1 && <div className="w-px h-10 bg-gray-800 mt-2" />}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-200 mb-1">{step.t}</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
    </div>
  );
}

function ModuleCard({ id, title, icon, active, result, loading, onActive, onTest, children, hideTestButton }: any) {
  return (
    <div onClick={onActive} className={`group p-6 rounded-3xl border-2 transition-all duration-300 bg-white shadow-sm cursor-pointer ${active ? 'border-blue-600 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5 text-left">
          <div className={`p-4 rounded-2xl transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{icon}</div>
          <div><h2 className="text-lg font-bold text-gray-900 leading-none">{title}</h2></div>
        </div>
        {result?.status === 'success' && <CheckCircle2 className="text-green-500 w-7 h-7" />}
      </div>
      <div className={`${active ? 'block' : 'hidden'} mt-4 space-y-4`} onClick={(e) => e.stopPropagation()}>
        {children}
        {!hideTestButton && (
          <button type="button" onClick={onTest} disabled={loading} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "验证并保存"}
          </button>
        )}
        {result && !hideTestButton && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${result.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-blue-600 outline-none transition-all font-sans`} {...props} />
    </div>
  );
}
