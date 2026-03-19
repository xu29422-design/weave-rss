"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Mail, Calendar, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; userId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push("/m/auth");
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/m/auth");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/m/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-6 flex flex-col pt-12">
        <div className="h-40 bg-slate-100 animate-pulse rounded-3xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      <header className="pt-12 pb-6 px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-500" />
            个人中心
          </h1>
          <p className="text-slate-500 text-sm mt-1">管理你的账号信息</p>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* 资料卡 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-blue-50">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{user?.username || "未知用户"}</h2>
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                已认证身份
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> 账号ID</span>
              <span className="text-sm font-medium text-slate-700 truncate">{user?.userId || "N/A"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> 状态</span>
              <span className="text-sm font-medium text-slate-700">正常服务中</span>
            </div>
          </div>
        </motion.div>

        {/* 退出登录 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button
            onClick={handleLogout}
            className="w-full bg-white text-red-500 font-bold text-lg py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </button>
        </motion.div>
        
        <div className="text-center pt-8">
          <p className="text-xs text-slate-400">Weave RSS v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
