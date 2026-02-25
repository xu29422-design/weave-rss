"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rss, Link2, Edit3, Play, Clock, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Sparkles, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCurrentConfig, persistSettings, persistRSS, testWebhook, markOnboardingCompleted } from "../config/actions";
import { pushToAdminBot } from "../config/admin-actions";

const STEPS = [
  { id: 1, title: "选择订阅的 RSS", icon: Rss },
  { id: 2, title: "配置 AI 解析", icon: Sparkles },
  { id: 3, title: "输入 Webhook 地址", icon: Link2 },
  { id: 4, title: "给订阅命名", icon: Edit3 },
  { id: 5, title: "调试", icon: Play },
  { id: 6, title: "每日推送时间", icon: Clock },
];

// 推荐 AI 相关 RSS（名称 + URL）
const RECOMMENDED_RSS = [
  { id: "openai", label: "OpenAI Blog", url: "https://openai.com/blog/rss.xml" },
  { id: "anthropic", label: "Anthropic News", url: "https://www.anthropic.com/news/rss" },
  { id: "google-ai", label: "Google AI Blog", url: "https://ai.googleblog.com/feeds/posts/default" },
  { id: "techcrunch", label: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { id: "hn", label: "Hacker News", url: "https://news.ycombinator.com/rss" },
  { id: "verge", label: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // Step 1: 选中的推荐 RSS id 列表 + 自定义 URL 多行
  const [selectedRssIds, setSelectedRssIds] = useState<string[]>([]);
  const [customRssUrls, setCustomRssUrls] = useState("");

  // Step 2: AI 解析配置
  const [aiProvider, setAiProvider] = useState<"google" | "openai">("google");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [thanksLoading, setThanksLoading] = useState(false);

  // Step 3
  const [webhookUrl, setWebhookUrl] = useState("");

  // Step 4
  const [projectName, setProjectName] = useState("我的 AI 资讯");

  // Step 5: 调试结果
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState("");

  // Step 6
  const [pushTime, setPushTime] = useState("8");
  const [pushDays, setPushDays] = useState<number[]>([1, 2, 3, 4, 5]);
  // 初始配置，用于合并保存，避免覆盖已有字段（如 AI Key）
  const [initialSettings, setInitialSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const data = await fetchCurrentConfig();
      setAuthenticated(data.authenticated);
      if (data.authenticated && data.settings) {
        const s = data.settings;
        setInitialSettings(s as Record<string, any>);
        setAiProvider(s.aiProvider || "google");
        setGeminiApiKey(s.geminiApiKey || "");
        setOpenaiApiKey(s.openaiApiKey || "");
        setOpenaiBaseUrl(s.openaiBaseUrl || "");
        setOpenaiModel(s.openaiModel || "");
        setWebhookUrl(s.webhookUrl || "");
        setProjectName(s.projectName || "我的 AI 资讯");
        setPushTime(s.pushTime ?? "8");
        setPushDays(s.pushDays ?? [1, 2, 3, 4, 5]);
      }
      if (data.rssSources?.length) {
        const ids = RECOMMENDED_RSS.filter((r) => data.rssSources!.includes(r.url)).map((r) => r.id);
        setSelectedRssIds(ids);
        const custom = data.rssSources.filter((u) => !RECOMMENDED_RSS.some((r) => r.url === u)).join("\n");
        setCustomRssUrls(custom);
      } else {
        setSelectedRssIds(["openai", "anthropic", "techcrunch"]);
      }
      setAuthChecking(false);
    })();
  }, []);

  const toggleRss = (id: string) => {
    setSelectedRssIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getSelectedRssUrls = (): string[] => {
    const fromRecommended = RECOMMENDED_RSS.filter((r) => selectedRssIds.includes(r.id)).map(
      (r) => r.url
    );
    const fromCustom = customRssUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    return Array.from(new Set([...fromRecommended, ...fromCustom]));
  };

  const handleUseFreeApi = async () => {
    const PRESET_FREE_API = {
      aiProvider: "openai" as const,
      openaiApiKey: "fcd9114b61ff49259c8770eba426f6e5.eiMdQXWwcOi6SAu7",
      openaiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      openaiModel: "glm-4.5-flash",
    };
    setAiProvider("openai");
    setOpenaiApiKey(PRESET_FREE_API.openaiApiKey);
    setOpenaiBaseUrl(PRESET_FREE_API.openaiBaseUrl);
    setOpenaiModel(PRESET_FREE_API.openaiModel);
    setThanksLoading(true);
    try {
      await pushToAdminBot("feedback", {
        type: "use_free_api",
        message: "用户在新手引导中使用了免费 API",
      });
    } catch (_) {}
    setThanksLoading(false);
  };

  const handleNext = async () => {
    if (step === 1) {
      const urls = getSelectedRssUrls();
      if (urls.length === 0) {
        alert("请至少选择或添加一个 RSS 源");
        return;
      }
      setLoading(true);
      try {
        await persistRSS(urls);
        setStep(2);
      } catch (e) {
        alert("保存失败，请重试");
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      const hasKey =
        (aiProvider === "google" && geminiApiKey.trim()) ||
        (aiProvider === "openai" && openaiApiKey.trim());
      if (!hasKey) {
        alert("请选择「使用免费 API」或填写自己的 API Key");
        return;
      }
      setLoading(true);
      try {
        await persistSettings({
          ...initialSettings,
          aiProvider,
          geminiApiKey: aiProvider === "google" ? geminiApiKey.trim() : "",
          openaiApiKey: aiProvider === "openai" ? openaiApiKey.trim() : "",
          openaiBaseUrl: aiProvider === "openai" ? openaiBaseUrl.trim() : "",
          openaiModel: aiProvider === "openai" ? openaiModel.trim() : "",
          webhookUrl: webhookUrl.trim(),
          projectName: projectName || "我的 AI 资讯",
          pushTime,
          pushDays,
        } as any);
        setStep(3);
      } catch (e) {
        alert("保存失败，请重试");
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      if (!webhookUrl.trim()) {
        alert("请输入 Webhook 地址");
        return;
      }
      setLoading(true);
      try {
        await persistSettings({
          ...initialSettings,
          aiProvider,
          geminiApiKey: aiProvider === "google" ? geminiApiKey : "",
          openaiApiKey: aiProvider === "openai" ? openaiApiKey : "",
          openaiBaseUrl: aiProvider === "openai" ? openaiBaseUrl : "",
          openaiModel: aiProvider === "openai" ? openaiModel : "",
          webhookUrl: webhookUrl.trim(),
          projectName: projectName || "我的 AI 资讯",
          pushTime,
          pushDays,
        } as any);
        setStep(4);
      } catch (e) {
        alert("保存失败，请重试");
      } finally {
        setLoading(false);
      }
    } else if (step === 4) {
      if (!projectName.trim()) {
        alert("请输入订阅名称");
        return;
      }
      setLoading(true);
      try {
        await persistSettings({
          ...initialSettings,
          aiProvider,
          geminiApiKey: aiProvider === "google" ? geminiApiKey : "",
          openaiApiKey: aiProvider === "openai" ? openaiApiKey : "",
          openaiBaseUrl: aiProvider === "openai" ? openaiBaseUrl : "",
          openaiModel: aiProvider === "openai" ? openaiModel : "",
          webhookUrl: webhookUrl.trim(),
          projectName: projectName.trim(),
          pushTime,
          pushDays,
        } as any);
        setStep(5);
      } catch (e) {
        alert("保存失败，请重试");
      } finally {
        setLoading(false);
      }
    } else if (step === 5) {
      if (!testSuccess) return;
      setStep(6);
    } else if (step === 6) {
      setLoading(true);
      try {
        await persistSettings({
          ...initialSettings,
          aiProvider,
          geminiApiKey: aiProvider === "google" ? geminiApiKey : "",
          openaiApiKey: aiProvider === "openai" ? openaiApiKey : "",
          openaiBaseUrl: aiProvider === "openai" ? openaiBaseUrl : "",
          openaiModel: aiProvider === "openai" ? openaiModel : "",
          webhookUrl: webhookUrl.trim(),
          projectName: projectName.trim(),
          pushTime,
          pushDays,
          onboardingCompleted: true,
        } as any);
        await markOnboardingCompleted();
        router.push("/dashboard?tab=active");
      } catch (e) {
        alert("保存失败，请重试");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setTestError("请先填写 Webhook 地址");
      return;
    }
    setTestError("");
    setLoading(true);
    try {
      const result = await testWebhook(webhookUrl.trim());
      if (result.success) {
        setTestSuccess(true);
      } else {
        setTestError(result.error || "发送失败");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authChecking || authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }
  if (!authenticated) {
    router.push("/auth?redirect=/onboarding");
    return null;
  }

  const canNext =
    (step === 1 && getSelectedRssUrls().length > 0) ||
    (step === 2 && ((aiProvider === "google" && geminiApiKey.trim()) || (aiProvider === "openai" && openaiApiKey.trim()))) ||
    (step === 3 && webhookUrl.trim()) ||
    (step === 4 && projectName.trim()) ||
    (step === 5 && testSuccess) ||
    step === 6;

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans flex flex-col">
      <header className="shrink-0 border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-bold text-white/80 hover:text-white flex flex-col items-start gap-1"
        >
          <span className="font-serif font-black text-white">Weave</span>
          <span className="text-2xl font-black text-white font-serif">
            新手引导 {step}/5
          </span>
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          {/* 进度条 */}
          <div className="flex gap-2 mb-10">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s.id <= step ? "bg-blue-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Rss className="w-8 h-8 text-blue-400" />
                  {STEPS[0].title}
                </h2>
                <p className="text-blue-100 text-sm">
                  勾选你感兴趣的 AI 相关资讯源，也可在下方添加自定义 RSS 地址（每行一个）。
                </p>
                <div className="space-y-2">
                  {RECOMMENDED_RSS.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRssIds.includes(r.id)}
                        onChange={() => toggleRss(r.id)}
                        className="w-4 h-4 rounded border-white/30 text-blue-500"
                      />
                      <span className="font-medium text-white">{r.label}</span>
                      <span className="text-xs text-white/50 truncate flex-1 max-w-[200px]">{r.url}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">
                    自定义 RSS 地址（可选，每行一个）
                  </label>
                  <textarea
                    value={customRssUrls}
                    onChange={(e) => setCustomRssUrls(e.target.value)}
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="https://example.com/feed.xml"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                  {STEPS[1].title}
                </h2>
                <p className="text-blue-100 text-sm">
                  配置 AI 用于解析你抓取的 RSS 内容；未配置则无法生成并推送简报。可选用免费 API 或填写自己的 Key，配置会同步到个人中心。
                </p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white font-medium">配置你的 AI API</span>
                  <button
                    type="button"
                    onClick={handleUseFreeApi}
                    disabled={thanksLoading}
                    className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl font-bold text-xs hover:bg-blue-500/30 transition-all flex items-center gap-2 border border-blue-500/30"
                  >
                    {thanksLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 fill-current" />}
                    使用免费 API (感谢阿旭)
                  </button>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAiProvider("google")}
                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${aiProvider === "google" ? "bg-white text-[#030712]" : "text-white/70 hover:text-white"}`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider("openai")}
                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${aiProvider === "openai" ? "bg-white text-[#030712]" : "text-white/70 hover:text-white"}`}
                  >
                    OpenAI / 兼容
                  </button>
                </div>
                {aiProvider === "google" ? (
                  <div>
                    <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="输入apikey"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">API Key</label>
                      <input
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="OpenAI 或兼容接口的 Key"
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">Base URL</label>
                        <input
                          type="text"
                          value={openaiBaseUrl}
                          onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">Model</label>
                        <input
                          type="text"
                          value={openaiModel}
                          onChange={(e) => setOpenaiModel(e.target.value)}
                          placeholder="如 gpt-4o-mini"
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Link2 className="w-8 h-8 text-blue-400" />
                  {STEPS[2].title}
                </h2>
                <p className="text-blue-100 text-sm">
                  RSS 分析并抓取后，结果会推送到这个地址。请填写你的 WPS 协作机器人 Webhook 地址。
                </p>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Edit3 className="w-8 h-8 text-blue-400" />
                  {STEPS[3].title}
                </h2>
                <p className="text-blue-100 text-sm">为这条订阅起一个名字，便于之后识别。</p>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例如：我的 AI 资讯日报"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Play className="w-8 h-8 text-blue-400" />
                  {STEPS[4].title}
                </h2>
                <p className="text-blue-100 text-sm">
                  向你的 Webhook 发送一条测试消息，请在 WPS 协作中确认是否收到。
                </p>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 break-all">
                  {webhookUrl || "（未填写）"}
                </div>
                {testError && (
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <span>{testError}</span>
                  </p>
                )}
                {testSuccess && (
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> 调试成功，请在 WPS 协作中查看测试消息
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={loading || testSuccess}
                  className="w-full py-4 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : testSuccess ? "已成功" : "发送测试消息"}
                </button>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black text-white font-serif flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-400" />
                  {STEPS[5].title}
                </h2>
                <p className="text-blue-100 text-sm">选择每天接收简报的时间（24 小时制）。</p>
                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">
                    推送时间
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPushTime(String(i))}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          pushTime === String(i)
                            ? "bg-white text-[#030712] border-white"
                            : "bg-white/5 text-white/80 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {i}:00
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest block mb-2">
                    推送日期
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "周一", val: 1 },
                      { label: "周二", val: 2 },
                      { label: "周三", val: 3 },
                      { label: "周四", val: 4 },
                      { label: "周五", val: 5 },
                      { label: "周六", val: 6 },
                      { label: "周日", val: 0 },
                    ].map((d) => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() =>
                          setPushDays((prev) =>
                            prev.includes(d.val) ? prev.filter((x) => x !== d.val) : [...prev, d.val]
                          )
                        }
                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                          pushDays.includes(d.val) ? "bg-blue-500 text-white border-blue-400" : "bg-white/5 text-white/60 border-white/10"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部按钮 */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> 上一步
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext || loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#030712] font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === 6 ? (
                "完成"
              ) : (
                <>
                  下一步 <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {step < 6 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await markOnboardingCompleted();
                } catch (_) {}
                router.push("/dashboard?tab=active");
              }}
              className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80"
            >
              暂时跳过
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
