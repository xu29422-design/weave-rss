"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, Shield, Activity, Search, 
  Settings2, Database, Globe, ArrowLeft,
  Loader2, CheckCircle2, AlertCircle, RefreshCcw,
  Mail, Lock, LogIn, ExternalLink, Rss
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllUserStats } from "../config/admin-actions";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // 登录表单状态
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: ""
  });
  const [loginLoading, setLoginLoading] = useState(false);

  // 1. 检查是否已经登录且是管理员
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const user = await res.json();
      
      if (user && user.username === "1159370261@qq.com") {
        setIsAuthorized(true);
        fetchStats();
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();

      if (data.success && loginForm.username === "1159370261@qq.com") {
        setIsAuthorized(true);
        fetchStats();
      } else {
        setError(data.error || "账号或密码错误，或您不是管理员");
      }
    } catch (e) {
      setError("登录请求失败");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    const result = await getAllUserStats();
    if (result.success) {
      setStats(result.data || []);
    } else {
      setError(result.error || "获取数据失败");
    }
    setLoading(false);
  };

  // 登录界面
  if (!isAuthorized && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">管理员登录</h1>
          <p className="text-white/40 text-center text-sm mb-8">请输入管理员凭据以访问控制面板</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 ml-1">管理员账号</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              验证并进入
            </button>
          </form>

          <button 
            onClick={() => router.push("/")}
            className="w-full mt-6 text-white/30 hover:text-white/60 text-xs transition-all flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> 返回首页
          </button>
        </motion.div>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-white/40 text-sm font-mono animate-pulse">正在同步全站数据...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-blue-500/30">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Weave Admin</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">System Monitor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchStats}
              className="p-2 hover:bg-white/5 rounded-full transition-all text-white/60 hover:text-white"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <div className="h-4 w-px bg-white/10" />
            <button 
              onClick={() => router.push("/dashboard")}
              className="text-xs font-medium text-white/60 hover:text-white transition-all flex items-center gap-2"
            >
              返回后台 <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
        {/* 数据概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "总用户数", value: stats.length, icon: Users, color: "text-blue-400" },
            { label: "活跃订阅", value: stats.reduce((acc, curr) => acc + (curr.settings?.subscribedThemes?.length || 0), 0), icon: Activity, color: "text-green-400" },
            { label: "RSS 源总数", value: stats.reduce((acc, curr) => acc + (curr.rssSources?.length || 0), 0), icon: Rss, color: "text-orange-400" },
            { label: "系统状态", value: "正常", icon: CheckCircle2, color: "text-emerald-400" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Live</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
              <div className="text-xs text-white/40">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* 用户详细列表 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" /> 用户订阅明细
            </h2>
            <div className="text-xs text-white/40 font-mono">
              Last sync: {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {stats.map((user, i) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/10 text-xl font-bold text-white/80">
                      {user.userId.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white flex items-center gap-2">
                        {user.userId}
                        {user.userId === "1159370261@qq.com" && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-tighter">Admin</span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 font-mono">{user.settings?.webhookUrl || "未配置 Webhook"}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-8">
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">已订阅主题</div>
                      <div className="flex gap-1.5">
                        {user.settings?.subscribedThemes?.length > 0 ? (
                          user.settings.subscribedThemes.map((theme: string) => (
                            <span key={theme} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-white/80">
                              {theme}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-white/20 italic">无订阅</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">推送配置</div>
                      <div className="text-xs text-white/80 flex items-center gap-2">
                        <Globe className="w-3 h-3 text-blue-400" />
                        {user.settings?.aiProvider || "未设置"} · {user.settings?.pushTime || "8"}:00
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">RSS 源</div>
                      <div className="text-xs text-white/80 font-mono">
                        {user.rssSources?.length || 0} 个来源
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {stats.length === 0 && (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/40">暂无用户数据</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 底部装饰 */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
