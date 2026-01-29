"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const redirectParam = searchParams.get("redirect");
  const safeRedirect = redirectParam && redirectParam.startsWith("/") ? redirectParam : null;
  
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setError("");
    setFormData({ username: "", password: "", confirmPassword: "" });
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register" && formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      // 注册时不需要发 confirmPassword 给后端（假设后端API不接受这个字段，或者忽略它）
      const { confirmPassword, ...submitData } = formData;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? submitData : formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "操作失败");
        setLoading(false);
        return;
      }

      router.push(safeRedirect || data.redirectTo || "/dashboard");
      router.refresh();
    } catch (err: any) {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans selection:bg-blue-500/30 selection:text-white overflow-hidden text-white relative">
      
      {/* 居中表单容器 */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[480px] p-10 relative z-10 bg-[#030712]/80 backdrop-blur-2xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] rounded-[40px]"
      >
        <button 
          onClick={() => router.push("/home")}
          className="absolute -top-20 left-1/2 -translate-x-1/2 text-[10px] font-black text-white hover:text-white/80 transition-colors px-6 py-3 border border-white/20 rounded-full hover:border-white/40 hover:bg-white/10 backdrop-blur-sm uppercase tracking-[0.2em] shadow-lg"
        >
          Back Home
        </button>

        <div className="text-center space-y-4 mb-10">
          <div className="mx-auto w-fit px-8 py-2.5 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center justify-center font-black text-xl italic font-serif shadow-2xl shadow-blue-500/20 backdrop-blur-md">
            Weave
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none font-serif italic drop-shadow-lg">
            {mode === "login" ? "登录" : "注册"}
          </h1>
          <p className="text-xs text-white/60 font-bold uppercase tracking-[0.2em]">
            {mode === "login" ? "Welcome back" : "Create account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-xs font-black text-white uppercase tracking-widest ml-1 group-focus-within:text-blue-300 transition-colors">用户账号</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-6 py-5 bg-[#1f2937]/80 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-white/40 text-base font-bold text-white backdrop-blur-xl"
                placeholder="Username"
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-xs font-black text-white uppercase tracking-widest ml-1 group-focus-within:text-blue-300 transition-colors">安全密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-5 bg-[#1f2937]/80 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-white/40 text-base font-bold text-white backdrop-blur-xl"
                  placeholder="Password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 group"
              >
                <label className="text-xs font-black text-white uppercase tracking-widest ml-1 group-focus-within:text-blue-300 transition-colors">确认密码</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-6 py-5 bg-[#1f2937]/80 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-white/40 text-base font-bold text-white backdrop-blur-xl"
                    placeholder="Confirm Password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20 rounded-xl text-center"
            >
              错误: {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-blue-950 h-16 rounded-2xl font-black text-lg uppercase tracking-[0.15em] hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              mode === "login" ? "立即登录" : "立即注册"
            )}
          </button>
        </form>

        <div className="text-center pt-8">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/20 transition-all shadow-lg"
          >
            {mode === "login" ? "没有账号？注册" : "已有账号？登录"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-[#030712]" /></div>}>
      <AuthContent />
    </Suspense>
  );
}
