"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Zap, Target, Clock, Shield, Rss, Brain, Bell, Menu, X, ChevronRight, Mail, MessageSquare, Bot, User } from "lucide-react";
import { siGithub, siProducthunt, siMedium, siTechcrunch, siArstechnica, siNewyorktimes, siVercel } from "simple-icons/icons";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
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

  const openAuth = (mode: "login" | "register") => {
    const target = authenticated ? "/config" : `/auth?mode=${mode}`;
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
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      {/* 动态流动背景 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-orange-300/30 to-rose-300/30 rounded-full blur-[120px] animate-blob mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-blue-200/30 to-indigo-200/30 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] bg-gradient-to-tr from-purple-200/30 to-pink-200/30 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply" />
      </div>

      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/20 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              {/* 极简 Icon: W */}
              <span className="text-white font-serif italic text-lg select-none">W</span>
            </div>
            <span className="text-2xl font-black tracking-tighter group-hover:text-blue-600 transition-colors font-serif">Weave <span className="ml-4 text-gray-400 font-normal">RSS</span></span>
          </div>
          <div className="flex items-center gap-6">
            {authenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-2.5 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  进入后台
                </button>
                <div 
                  onClick={() => router.push("/dashboard?tab=settings")}
                  className="w-10 h-10 bg-blue-50 rounded-full border border-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-all group"
                  title={username}
                >
                  <User className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => openAuth("login")}
                className="px-6 py-2.5 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6 min-h-[95vh] flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-mono tracking-tight">AI-POWERED INTELLIGENCE</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-gray-900">
              <span className="font-display italic tracking-[0.02em]">Read Less,</span><br />
              <span className="font-display italic tracking-[0.02em] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x">Know More.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-xl leading-relaxed font-medium">
              RSS 自动聚合，AI 深度精读。每日高价值情报，直达您的 <span className="text-blue-600 font-bold">邮箱</span> 或 <span className="text-blue-600 font-bold">WPS协作群聊机器人</span>。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => openAuth("register")}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-black text-white rounded-full text-lg font-bold hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                立即使用
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-400">支持全平台接收：</span>
              <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-1.5 grayscale opacity-70 hover:opacity-100 transition-opacity">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">Email</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-70 hover:opacity-100 transition-opacity">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">WPS</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-70 hover:opacity-100 transition-opacity">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter text-[10px]">Feishu</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 右侧视觉图：激进极简主义推送演示 */}
          <motion.div 
            style={{ y: y2 }}
            className="relative hidden lg:block h-[600px] w-full perspective-1000"
          >
            {/* Layer 1: 极简邮件客户端 (底座) */}
            <div className="absolute top-20 right-0 w-[90%] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform -rotate-1">
              <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                </div>
                <div className="ml-4 w-32 h-2 bg-gray-200 rounded-full" />
              </div>
              <div className="p-2 space-y-2">
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Inbox · Unread</span>
                    <span className="text-[10px] font-mono text-gray-400">09:00 AM</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">[日报] 今日 AI 趋势：GPT-5 预测与 Agent 架构...</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    点击查看今日为您精选的 15 条高价值情报...
                  </p>
                </div>
                <div className="p-5 bg-white rounded-xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Daily · Digest</div>
                  <div className="font-semibold text-gray-900 mb-1">[日报] AI 生成式应用：产品化拐点与落地案例...</div>
                  <div className="text-sm text-gray-500">摘要：5 分钟读懂今日关键动向。</div>
                </div>
                <div className="p-5 bg-white rounded-xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Briefing</div>
                  <div className="font-semibold text-gray-900 mb-1">[简报] Agent 生态：工具链、模型与增长...</div>
                  <div className="text-sm text-gray-500">摘要：精选 12 条趋势与洞察。</div>
                </div>
                <div className="p-5 bg-white rounded-xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Update</div>
                  <div className="font-semibold text-gray-900 mb-1">[更新] 开源模型周报：性能、成本与评测...</div>
                  <div className="text-sm text-gray-500">摘要：本周最值得关注的 8 条变化。</div>
                </div>
              </div>
            </div>

            {/* Layer 2: 聊天气泡通知 (悬浮) */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 -left-6 w-80 bg-white/80 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-white/50 ring-1 ring-black/5"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 truncate">AI 助理</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">LIVE</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    🤖 早安！您的今日简报已生成完毕，点击阅读。
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 信源背书条幅 */}
      <section className="relative z-10 w-full py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-center text-sm md:text-base font-black text-gray-400 uppercase tracking-[0.25em] mb-12">
            每日实时追踪分析 500+ 优质信源
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-10 opacity-35 grayscale contrast-125">
            {brandLogos.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white/70">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-700" aria-hidden="true">
                    <path d={item.icon.path} fill="currentColor" />
                  </svg>
                </div>
                <span className="text-xl font-black tracking-tight">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特性介绍 - 滚动视差 */}
      <section className="py-32 px-6 bg-white relative z-10 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">流程极简，价值直达</h2>
            <p className="text-xl text-gray-600 font-medium">
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
                color: "bg-orange-50 text-orange-600"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI 深度分析",
                desc: "AI 模型自动阅读、评分、总结每一篇内容。",
                step: "02",
                color: "bg-purple-50 text-purple-600"
              },
              {
                icon: <Bell className="w-8 h-8" />,
                title: "智能推送",
                desc: "每天定时把精选简报推送到你的常用工具。",
                step: "03",
                color: "bg-blue-50 text-blue-600"
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="group relative p-10 rounded-[2.5rem] bg-gray-50 border border-gray-100 hover:border-black/5 hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute top-8 right-8 text-6xl font-black text-gray-200/50 font-mono">
                  {feature.step}
                </div>
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mb-8 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center text-sm font-bold text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  了解更多 <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-black text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight">
            Ready to reclaim your time?
          </h2>
          <p className="text-xl text-gray-400 mb-12 font-medium max-w-2xl mx-auto">
            Join thousands of professionals who use Weave RSS to stay ahead of the curve without the noise.
          </p>
          <button
            onClick={() => openAuth("register")}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Start Free Trial
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold text-sm">
              AI
            </div>
            <span className="font-bold font-serif">Weave RSS</span>
          </div>
          <p className="text-sm text-gray-500 font-mono">
            © 2026 Weave RSS. Designed by Cursor.
          </p>
        </div>
      </footer>
    </div>
  );
}
