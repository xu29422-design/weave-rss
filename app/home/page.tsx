"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Zap, Target, Clock, Shield, Rss, Brain, Bell, Menu, X, ChevronRight, Mail, MessageSquare, Bot, User, Globe, Cpu, Send, Paperclip, MoreHorizontal, Inbox, Star, FileText } from "lucide-react";
import { siGithub, siProducthunt, siMedium, siTechcrunch, siArstechnica, siNewyorktimes, siVercel } from "simple-icons/icons";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

// --- 场景组件 1: 手机群聊 (Mobile Chat) ---
const MobileScene = () => {
  return (
    <div className="relative w-[280px] h-[560px] mx-auto">
      {/* 手机外壳 */}
      <div className="absolute inset-0 bg-[#111827] rounded-[3rem] border-[8px] border-[#374151] shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10">
        {/* 灵动岛/刘海 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1f2937] rounded-b-2xl z-20 flex justify-center items-center gap-2">
          <div className="w-10 h-1 rounded-full bg-black/50" />
        </div>
        
        {/* 屏幕内容 */}
        <div className="w-full h-full bg-[#1f2937] flex flex-col font-sans">
          {/* 顶部栏 */}
          <div className="h-24 bg-[#374151] border-b border-white/5 flex items-end pb-3 px-5 justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                W
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-none mb-1">Weave 协作群</div>
                <div className="text-[10px] text-white/80">1,240 成员</div>
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-white/80" />
          </div>

          {/* 聊天区域 */}
          <div className="flex-1 p-4 space-y-5 overflow-hidden relative">
            {/* 背景水印 */}
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* 时间戳 */}
            <div className="text-center">
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/80">09:00 AM</span>
            </div>

            {/* 消息 1: 机器人推送 */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-2 max-w-[85%]">
                <div className="text-[10px] text-white/80 ml-1">AI 情报助理</div>
                <div className="bg-[#374151] p-3 rounded-2xl rounded-tl-none border border-white/10 text-xs text-blue-50 leading-relaxed shadow-md">
                  早上好！☀️ 今日为您聚合了 <span className="text-blue-300 font-bold">15 条</span> 高价值情报。
                </div>
                {/* 简报卡片 */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="bg-white rounded-xl overflow-hidden shadow-lg group cursor-pointer"
                >
                  <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 p-3 flex flex-col justify-end relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                    <div className="text-[10px] font-bold text-white/90 mb-0.5 uppercase tracking-wider">Daily Digest</div>
                    <div className="text-sm font-bold text-white">AI 行业深度观察</div>
                  </div>
                  <div className="p-3 bg-[#374151] border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded">GPT-5</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded">Agent</span>
                    </div>
                    <div className="text-[11px] text-white/90 line-clamp-2 leading-relaxed">
                      DeepSeek 开源新一代 MoE 架构；OpenAI 首席科学家谈 AGI 路线图...
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-white/60">刚刚</span>
                      <span className="text-[10px] text-blue-300 font-bold flex items-center gap-1">阅读全文 <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* 消息 2: 用户回复 (模拟互动) */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 2.5 }}
              className="flex gap-3 flex-row-reverse"
            >
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center shrink-0 border border-white/10">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="bg-blue-600 p-3 rounded-2xl rounded-tr-none text-xs text-white shadow-md">
                收到，质量很高！👍
              </div>
            </motion.div>
          </div>

          {/* 底部输入框 */}
          <div className="h-14 bg-[#374151] border-t border-white/5 px-4 flex items-center gap-3">
            <Paperclip className="w-5 h-5 text-white/80" />
            <div className="flex-1 h-8 bg-black/40 rounded-full border border-white/5" />
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 场景组件 2: PC 邮件 (Desktop Email) ---
const DesktopScene = () => {
  return (
    <div className="relative w-full max-w-[600px] h-[420px] mx-auto mt-20 md:mt-0">
      {/* 窗口外壳 */}
      <div className="w-full h-full bg-[#111827] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/50">
        {/* 标题栏 */}
        <div className="h-9 bg-[#1f2937] border-b border-white/5 flex items-center px-4 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
          </div>
          <div className="flex-1 text-center text-[10px] font-bold text-white/70">Mail - Inbox</div>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧列表 */}
          <div className="w-1/3 bg-[#1f2937] border-r border-white/5 flex flex-col">
            <div className="p-3 border-b border-white/5">
              <div className="text-[10px] font-bold text-white/80 mb-2 uppercase tracking-wider">Inbox</div>
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-blue-600/20 border border-blue-500/20 p-2 rounded-lg"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-white">Weave</span>
                  <span className="text-[9px] text-blue-300">09:00</span>
                </div>
                <div className="text-[10px] text-blue-50 truncate">Today's AI Digest...</div>
              </motion.div>
              
              {[1, 2, 3].map((i) => (
                <div key={i} className="mt-2 p-2 rounded-lg opacity-40 hover:bg-white/5 transition-colors">
                  <div className="w-2/3 h-2 bg-white/20 rounded mb-1.5" />
                  <div className="w-full h-1.5 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="flex-1 bg-[#111827] p-6 relative overflow-hidden">
             {/* 邮件头 */}
             <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Weave Intelligence</div>
                    <div className="text-[10px] text-white/80">to: me@example.com</div>
                  </div>
                </div>
                <div className="flex gap-2 text-white/50">
                  <Star className="w-4 h-4" />
                  <MoreHorizontal className="w-4 h-4" />
                </div>
             </div>

             {/* 邮件正文 (打字机效果) */}
             <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-bold text-white font-serif"
                >
                  Your Daily Briefing
                </motion.div>
                
                <div className="space-y-2">
                  {[
                    "Here's what happened in AI today:",
                    "• DeepSeek v2 outperforms GPT-4 in coding tasks.",
                    "• NVIDIA announces new H200 chips for inference.",
                    "• Apple integrates LLM into Xcode 16."
                  ].map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.3 }}
                      className="text-xs text-blue-50 leading-relaxed pl-3 border-l-2 border-blue-500/30"
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>

                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 2.2 }}
                   className="pt-4"
                >
                  <button className="text-[10px] font-bold text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-md hover:bg-blue-500/10 transition-colors">
                    View Full Report
                  </button>
                </motion.div>
             </div>
          </div>
        </div>
      </div>

      {/* 装饰元素 */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none"
      />
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  
  // 轮播状态
  const [activeScene, setActiveScene] = useState<"mobile" | "desktop">("mobile");
  
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScene(prev => prev === "mobile" ? "desktop" : "mobile");
    }, 5000); // 5秒切换一次
    return () => clearInterval(timer);
  }, []);

  const brandLogos = [
    { name: "TechCrunch", icon: siTechcrunch },
    { name: "Ars Technica", icon: siArstechnica },
    { name: "New York Times", icon: siNewyorktimes },
    { name: "GitHub", icon: siGithub },
    { name: "Product Hunt", icon: siProducthunt },
    { name: "Medium", icon: siMedium },
    { name: "Vercel", icon: siVercel },
  ];

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          setUsername(data.username);
        }
      } catch {
        setAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const openAuth = (mode: "login" | "register", redirectTo?: string) => {
    const redirectParam = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : "";
    const target = authenticated
      ? "/dashboard"
      : `/auth?mode=${mode}${redirectParam}`;
    router.push(target);
    router.refresh();
    // 兜底：若路由未生效，强制跳转
    setTimeout(() => {
      if (window.location.pathname + window.location.search !== target) {
        window.location.href = target;
      }
    }, 100);
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-[#030712]/60">
        <div className="w-full px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="text-2xl font-black tracking-tighter group-hover:text-blue-200 transition-colors font-serif text-white drop-shadow-md">Weave</span>
          </div>
          <div className="flex items-center gap-6">
            {authenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-full font-bold hover:bg-white/20 transition-all shadow-lg hover:shadow-blue-500/10"
                >
                  进入后台
                </button>
                <div 
                  onClick={() => router.push("/dashboard?tab=settings")}
                  className="w-10 h-10 bg-white/10 rounded-full border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all group"
                  title={username}
                >
                  <User className="w-5 h-5 text-blue-300 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => openAuth("login")}
                className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-full font-bold hover:bg-white/20 transition-all shadow-lg hover:shadow-blue-500/10"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-40 px-6 min-h-[85vh] flex flex-col justify-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-blue-200 rounded-full text-sm font-bold border border-white/20 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-mono tracking-tight">AI-POWERED INTELLIGENCE</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[1.1] tracking-tighter text-white drop-shadow-[0_0_50px_rgba(0,200,255,0.2)] font-serif">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="italic tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-blue-100 block drop-shadow-lg"
              >
                Read Less,
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="italic tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-cyan-200 to-indigo-200 animate-gradient-x block drop-shadow-lg"
              >
                Know More.
              </motion.span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-50 max-w-xl leading-relaxed font-medium drop-shadow-md">
              RSS 自动聚合，AI 深度精读。每日高价值情报，直达您的 <span className="text-cyan-200 font-bold border-b border-cyan-200/50 pb-0.5 shadow-cyan-500/50">邮箱</span> 或 <span className="text-cyan-200 font-bold border-b border-cyan-200/50 pb-0.5 shadow-cyan-500/50">WPS协作群聊机器人</span>。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => openAuth("register", "/config")}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-blue-950 rounded-full text-lg font-bold hover:bg-blue-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:-translate-y-1"
              >
                立即使用
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-white/10">
              <span className="text-sm font-bold text-blue-50">支持全平台接收：</span>
              <div className="flex items-center gap-4 text-blue-50">
                <div className="flex items-center gap-1.5 hover:text-cyan-200 transition-colors">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">Email</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-cyan-200 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">WPS</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-cyan-200 transition-colors">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">Feishu</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 右侧视觉图：多维视界轮播台 (Multi-Dimension Carousel) */}
          <motion.div 
            style={{ y: y2 }}
            className="relative hidden lg:flex h-[600px] w-full flex-col items-center justify-center mt-32"
          >
            {/* 场景切换容器 */}
            <div className="relative w-full h-[500px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {activeScene === "mobile" ? (
                  <motion.div
                    key="mobile"
                    initial={{ opacity: 0, x: 50, rotateY: 10 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    exit={{ opacity: 0, x: -50, rotateY: -10 }}
                    transition={{ duration: 0.6, ease: "backOut" }}
                    className="absolute z-20"
                  >
                    <MobileScene />
                  </motion.div>
                ) : (
                  <motion.div
                    key="desktop"
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    transition={{ duration: 0.6, ease: "backOut" }}
                    className="absolute z-20 w-full flex justify-center"
                  >
                    <DesktopScene />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 背景光晕 (随场景变化) */}
              <motion.div 
                animate={{ 
                  background: activeScene === "mobile" 
                    ? "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" 
                    : "radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)"
                }}
                className="absolute inset-0 z-0 transition-colors duration-1000"
              />
            </div>

            {/* 底部场景指示文案 */}
            <div className="mt-32 text-center space-y-4 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScene}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center"
                >
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    {activeScene === "mobile" ? (
                      <><MessageSquare className="w-5 h-5 text-blue-400" /> 群聊机器人 · 实时触达</>
                    ) : (
                      <><Mail className="w-5 h-5 text-purple-400" /> 沉浸式日报 · 深度阅读</>
                    )}
                  </h3>
                  <p className="text-sm text-blue-50 font-medium">
                    {activeScene === "mobile" 
                      ? "WPS / 微信 / 飞书，团队信息零时差同步" 
                      : "像阅读晨报一样，享受 AI 为你定制的知识盛宴"
                    }
                  </p>
                </motion.div>
              </AnimatePresence>
              
              {/* 进度条指示器 */}
              <div className="flex justify-center gap-2 mt-4">
                <div className={`h-1 rounded-full transition-all duration-500 ${activeScene === "mobile" ? "w-8 bg-blue-500" : "w-2 bg-white/10"}`} />
                <div className={`h-1 rounded-full transition-all duration-500 ${activeScene === "desktop" ? "w-8 bg-purple-500" : "w-2 bg-white/10"}`} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 信源背书条幅 */}
      <section className="relative z-10 w-full py-24 border-y border-white/10 bg-[#030712]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-center text-sm md:text-base font-black text-blue-50 uppercase tracking-[0.25em] mb-12">
            每日实时追踪分析 500+ 优质信源
          </h3>
          <div className="flex flex-nowrap overflow-x-auto md:justify-between items-center gap-8 md:gap-4 pb-4 md:pb-0 scrollbar-hide mask-image-gradient">
            {brandLogos.map((item) => (
              <div key={item.name} className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                    <path d={item.icon.path} fill="currentColor" />
                  </svg>
                </div>
                <span className="text-xl font-black tracking-tight text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特性介绍 - 滚动视差 */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white font-serif">流程极简，价值直达</h2>
            <p className="text-xl text-blue-50 font-medium">
              三步完成信息流改造，无需复杂配置，高效即刻生效。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Rss className="w-8 h-8" />,
                title: "添加订阅源",
                desc: "订阅你关注的科技博客、行业媒体与资讯邮件。",
                step: "01",
                color: "bg-orange-500/10 text-orange-400 border-orange-500/20"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI 深度分析",
                desc: "AI 模型自动阅读、评分、总结每一篇内容。",
                step: "02",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
              },
              {
                icon: <Bell className="w-8 h-8" />,
                title: "智能推送",
                desc: "每天定时把精选简报推送到你的常用工具。",
                step: "03",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="group relative p-10 rounded-[2.5rem] bg-[#111827]/80 border border-white/10 hover:border-blue-400/30 hover:bg-[#1f2937]/90 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 backdrop-blur-xl"
              >
                <div className="absolute top-8 right-8 text-6xl font-black text-white/30 font-mono group-hover:text-white/40 transition-colors">
                  {feature.step}
                </div>
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-8 border ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white font-serif">{feature.title}</h3>
                  <p className="text-blue-50 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center text-sm font-bold text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  了解更多 <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight text-white font-serif drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            内测阶段，欢迎使用
          </h2>
          <p className="text-xl text-blue-50 mb-12 font-medium max-w-2xl mx-auto">
            让 Weave 帮你过滤噪音、聚焦价值，每天只读最重要的那几条。
          </p>
          <button
            onClick={() => openAuth("register")}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-950 rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
          >
            免费开始使用
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20 text-white rounded-lg flex items-center justify-center font-bold text-sm">
              AI
            </div>
            <span className="font-bold font-serif text-white">Weave</span>
          </div>
          <p className="text-sm text-blue-50/80 font-mono">
            © 2026 Weave. Designed by Axu and Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
