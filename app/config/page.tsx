"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { testConfigs } from "./test-action";
import { fetchCurrentConfig, persistSettings, persistRSS } from "./actions";
import { 
  Database, Bot, Webhook, CheckCircle2, AlertCircle,
  Loader2, ExternalLink, BookOpen, ArrowRight, Sparkles,
  Rss, Link2, Cpu, Globe, Settings2, LogOut, User
} from "lucide-react";

type ConfigModule = 'kv' | 'ai' | 'webhook' | 'rss' | 'prompts';

const helpContent: any = {
  ai: {
    title: "AI 引擎配置指南",
    desc: "支持 Google Gemini 原生接入或任何兼容 OpenAI 协议的平台（如 DeepSeek, Groq）。",
    steps: [
      { t: "选择平台", d: "推荐 Gemini 1.5 Flash (免费) 或 DeepSeek (高性价比)。" },
      { t: "Base URL", d: "如果使用非 OpenAI 官方服务，请填写中转或私有地址。" },
      { t: "模型匹配", d: "请确保填写的 Model ID 与平台提供的一致。" }
    ],
    link: "https://aistudio.google.com/",
    color: "from-indigo-600 to-purple-500"
  },
  prompts: {
    title: "AI 提示词自定义",
    desc: "您可以完全掌控 AI 如何分析、分类和汇总您的信息流。支持自定义 Prompt。",
    steps: [
      { t: "分析阶段", d: "Analyst Agent 负责单条内容的打分、总结和分类。" },
      { t: "汇总阶段", d: "Editor Agent 负责将分类内容撰写成优美的日报段落。" },
      { t: "TL;DR", d: "全局总结 Agent 负责生成最顶部的“今日焦点”。" }
    ],
    link: "#",
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
    link: "#",
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
    link: "https://github.com/AboutRSS/ALL-about-RSS",
    color: "from-orange-500 to-amber-500"
  }
};

export default function ConfigWizard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>("");
  const [activeModule, setActiveModule] = useState<ConfigModule>('ai');
  const [promptTab, setPromptTab] = useState<'analyst' | 'editor' | 'tldr'>('analyst');
  const [webhookTab, setWebhookTab] = useState<'webhook' | 'email'>('webhook');
  const [aiProvider, setAiProvider] = useState<'google' | 'openai'>('google');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  
  const [formState, setFormState] = useState({
    kvUrl: "",
    kvToken: "",
    aiProvider: "google" as "google" | "openai",
    geminiApiKey: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: "",
    webhookUrl: "",
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
        
        if (!data.authenticated) {
          router.push("/auth");
          return;
        }
        
        setAuthenticated(true);
        setUsername(data.username);
      } catch (error) {
        router.push("/auth");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function init() {
      if (!authenticated) return;
      const data = await fetchCurrentConfig();
      if (data.settings || data.rssSources) {
        const newState = {
          kvUrl: "", // KV 通常通过环境变量注入，不建议回显至状态机除非是测试
          kvToken: "",
          aiProvider: data.settings?.aiProvider || "google",
          geminiApiKey: data.settings?.geminiApiKey || "",
          openaiApiKey: data.settings?.openaiApiKey || "",
          openaiBaseUrl: data.settings?.openaiBaseUrl || "",
          openaiModel: data.settings?.openaiModel || "",
          webhookUrl: data.settings?.webhookUrl || "",
          rssUrls: data.rssSources?.join("\n") || "",
          analystPrompt: data.settings?.analystPrompt || "",
          editorPrompt: data.settings?.editorPrompt || "",
          tldrPrompt: data.settings?.tldrPrompt || ""
        };
        setFormState(newState);
        if (data.settings?.aiProvider) setAiProvider(data.settings.aiProvider);
      }
    }
    init();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  // 针对大型文本域的防抖处理（可选，目前表单项不多，直接更新尚可，但为了质量建议对 RSS 列表进行防抖）
  const handleRSSChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormState(prev => ({ ...prev, rssUrls: value }));
  };

  async function testAndSave(module: ConfigModule) {
    setLoading(prev => ({ ...prev, [module]: true }));
    
    const formData = new FormData();
    Object.entries(formState).forEach(([k, v]) => formData.append(k, v));
    formData.set("aiProvider", aiProvider); // 强制同步当前选择的 Provider

    try {
      const allResults = await testConfigs(formData);
      setResults(prev => ({ ...prev, [module]: allResults[module] }));
      
      if (allResults[module].status === 'success') {
        if (module === 'rss') {
          const urls = formState.rssUrls.split("\n").map(u => u.trim()).filter(Boolean);
          await persistRSS(urls);
        } else {
          await persistSettings({
            aiProvider: aiProvider,
            geminiApiKey: formState.geminiApiKey,
            openaiApiKey: formState.openaiApiKey,
            openaiBaseUrl: formState.openaiBaseUrl,
            openaiModel: formState.openaiModel,
            webhookUrl: formState.webhookUrl,
            analystPrompt: formState.analystPrompt,
            editorPrompt: formState.editorPrompt,
            tldrPrompt: formState.tldrPrompt
          });
        }
        if (module === 'ai') setTimeout(() => setActiveModule('prompts'), 500);
        else if (module === 'prompts') setTimeout(() => setActiveModule('webhook'), 500);
        else if (module === 'webhook') setTimeout(() => setActiveModule('rss'), 500);
      }
    } catch (e) {
      setResults(prev => ({ ...prev, [module]: { status: 'error', message: '校验或保存失败' } }));
    } finally {
      setLoading(prev => ({ ...prev, [module]: false }));
    }
  }

  const allPassed = results.ai?.status === 'success' && results.prompts?.status === 'success' && results.webhook?.status === 'success' && results.rss?.status === 'success';

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {/* 顶部导航栏 */}
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            退出登录
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
              您的私人情报助理。聚合全球信源，AI 深度精读。
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
              id="prompts" title="02. AI 提示词自定义 (高级)" active={activeModule === 'prompts'} result={results.prompts} loading={loading.prompts}
              onActive={() => setActiveModule('prompts')} onTest={() => testAndSave('prompts')} icon={<Sparkles className="w-6 h-6" />}
            >
              <div className="pt-4 text-left">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button type="button" onClick={() => setPromptTab('analyst')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'analyst' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>分析阶段</button>
                  <button type="button" onClick={() => setPromptTab('editor')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'editor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>汇总阶段</button>
                  <button type="button" onClick={() => setPromptTab('tldr')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${promptTab === 'tldr' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>今日焦点</button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {promptTab === 'analyst' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">内容分析 Prompt (Analyst)</label>
                      <textarea name="analystPrompt" rows={8} value={formState.analystPrompt} onChange={handleChange} placeholder="留空使用默认值..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />
                      <p className="text-xs text-gray-400 mt-1 ml-1">※ 负责单条内容的打分、总结 and 分类。</p>
                    </div>
                  )}
                  {promptTab === 'editor' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">汇总撰写 Prompt (Editor)</label>
                      <textarea name="editorPrompt" rows={8} value={formState.editorPrompt} onChange={handleChange} placeholder="支持 ${category} 和 ${count} 变量..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />
                      <p className="text-xs text-gray-400 mt-1 ml-1">※ 负责将分类内容撰写成日报段落。支持变量：{"${category}"}, {"${count}"}</p>
                    </div>
                  )}
                  {promptTab === 'tldr' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">今日焦点 Prompt (TL;DR)</label>
                      <textarea name="tldrPrompt" rows={8} value={formState.tldrPrompt} onChange={handleChange} placeholder="留空使用默认值..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none" />
                      <p className="text-xs text-gray-400 mt-1 ml-1">※ 负责生成最顶部的“今日焦点”总结。</p>
                    </div>
                  )}
                </div>
              </div>
            </ModuleCard>

            <ModuleCard 
              id="webhook" title="03. 推送渠道" active={activeModule === 'webhook'} result={results.webhook} loading={loading.webhook}
              onActive={() => setActiveModule('webhook')} onTest={() => testAndSave('webhook')} icon={<Webhook className="w-6 h-6" />}
            >
              <div className="pt-4 text-left">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button type="button" onClick={() => setWebhookTab('webhook')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${webhookTab === 'webhook' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Webhook 机器人</button>
                  <button type="button" onClick={() => setWebhookTab('email')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${webhookTab === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>电子邮件 (可选)</button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {webhookTab === 'webhook' ? (
                    <div className="space-y-4">
                      <Input label="Webhook URL" name="webhookUrl" value={formState.webhookUrl} onChange={handleChange} placeholder="机器人 Webhook 地址" />
                      <p className="text-xs text-gray-400 ml-1">※ 支持 WPS、企业微信、飞书、钉钉等标准 Webhook。</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Input label="接收邮箱" name="emailAddress" value={(formState as any).emailAddress || ""} onChange={handleChange} placeholder="yourname@example.com" />
                      <p className="text-xs text-gray-400 ml-1">※ 简报将每天定时发送至您的电子邮箱（即将上线）。</p>
                    </div>
                  )}
                </div>
              </div>
            </ModuleCard>

            <ModuleCard 
              id="rss" title="04. 订阅源配置" active={activeModule === 'rss'} result={results.rss} loading={loading.rss}
              onActive={() => setActiveModule('rss')} onTest={() => testAndSave('rss')} icon={<Rss className="w-6 h-6" />}
            >
              <div className="pt-4 text-left">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">RSS 链接列表 (每行一个)</label>
                <textarea name="rssUrls" rows={6} value={formState.rssUrls} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base font-sans focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none mt-1.5" />
              </div>
            </ModuleCard>
          </div>
        </div>
      </div>

      <div className="lg:w-[30%] bg-gray-900 text-white p-8 lg:p-12 xl:p-16 flex flex-col justify-center relative overflow-hidden min-h-screen">
        <div className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${helpContent[activeModule].color} opacity-20 blur-[100px] transition-all duration-700`} />
        
        <div className="relative z-10 w-full" id="guide-section">
          <header className="mb-10">
            <Settings2 className="w-12 h-12 text-gray-500 mb-6" />
            <h3 className="text-2xl xl:text-3xl font-black mb-4 tracking-tight">{helpContent[activeModule].title}</h3>
            <p className="text-base text-gray-400 leading-relaxed font-medium">{helpContent[activeModule].desc}</p>
          </header>

          <div className="space-y-8 text-left">
            {helpContent[activeModule].steps.map((step: any, idx: number) => (
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

          {allPassed && (
            <div className="mt-12 p-6 bg-blue-600/20 border border-blue-500/50 rounded-2xl animate-in zoom-in">
               <h4 className="text-blue-400 font-black mb-4 flex items-center gap-2"><Globe className="w-4 h-4" /> 下一步：启动工作流</h4>
               <code className="block bg-black/50 p-3 rounded-lg text-[10px] text-blue-300 font-mono mb-4 text-left">npm run inngest</code>
               <p className="text-xs text-gray-400 italic font-medium leading-relaxed text-left">配置已保存。刷新页面即可看到数据回填。</p>
            </div>
          )}
        </div>
      </div>

      {allPassed && (
        <div onClick={() => document.getElementById('guide-section')?.scrollIntoView({ behavior: 'smooth' })} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-10 py-6 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 flex items-center gap-6 hover:scale-105 transition-transform cursor-pointer border-4 border-white/20">
          <div className="flex flex-col text-left"><span className="text-xs font-black opacity-80 uppercase tracking-widest leading-none">All Persisted</span><span className="text-xl font-black">配置已就绪，查看下一步</span></div>
          <ArrowRight className="w-8 h-8" />
        </div>
      )}
      </div>
    </div>
  );
}

function ModuleCard({ id, title, icon, active, result, loading, onActive, onTest, children }: any) {
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
        <button type="button" onClick={onTest} disabled={loading} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "验证并保存"}
        </button>
        {result && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${result.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, mono, ...props }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-blue-600 outline-none transition-all font-sans`} {...props} />
    </div>
  );
}
