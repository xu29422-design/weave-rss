"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function MobileAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

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

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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

      router.push("/m");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-slate-900 px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-8 font-sans">
      <header className="flex items-center gap-3 py-2 mb-6">
        <Link
          href="/m"
          className="p-2 -ml-2 rounded-full text-slate-400 active:bg-slate-100 transition-colors"
          aria-label="返回"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </header>

      <div className="flex-1 flex flex-col pt-4 max-w-sm mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="text-[15px] text-slate-500">
            {mode === "login" ? "登录 Weave 账号继续阅读" : "注册 Weave 账号，开启智能情报体验"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                用户账号
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                placeholder="请输入用户名"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                安全密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-5 py-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                  placeholder="请输入密码"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600 p-1"
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
              >
                <div className="mt-5">
                  <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">
                    确认密码
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="w-full px-5 py-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                      placeholder="请再次输入密码"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600 p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 text-[13px] font-medium rounded-xl text-center border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-transform shadow-lg shadow-slate-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "login" ? (
              "登录"
            ) : (
              "注册"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-[14px] font-medium text-slate-500 active:text-slate-800 transition-colors px-4 py-2"
          >
            {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MobileAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <MobileAuthContent />
    </Suspense>
  );
}
