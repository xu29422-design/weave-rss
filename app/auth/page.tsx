"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, Check, Rss, Zap, Activity, Globe, Cpu, FileText, Sparkles, Folder, Terminal, Layers, ArrowRight, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- 高级组件：3D 全息雷达 (增强饱和度与粒子版) ---
function AdvancedRadar() {
  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-1000">
      {/* 3D 倾斜平面 */}
      <motion.div 
        initial={{ rotateX: 65, rotateZ: 0 }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="relative w-[450px] h-[450px] rounded-full border border-blue-500/40 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* 多层圆环 - 增强对比度 */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
        <div className="absolute inset-12 rounded-full border border-blue-400/30 border-dashed" />
        <div className="absolute inset-24 rounded-full border-2 border-blue-500/30" />
        <div className="absolute inset-36 rounded-full border border-blue-400/20" />
        <div className="absolute w-16 h-16 rounded-full border-2 border-blue-600/60 shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
        
        {/* 坐标轴 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[1px] bg-blue-500/30" />
          <div className="h-full w-[1px] bg-blue-500/30 absolute" />
        </div>

        {/* 扫描扇形光束 - 增强饱和度 */}
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(59,130,246,0.1)_60deg,rgba(59,130,246,0.4)_90deg,transparent_90.1deg)]" />

        {/* 动态信号点 - 粒子数量翻倍 */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              opacity: [0, 1, 0.5, 1, 0],
              scale: [0.4, 1.5, 0.8, 1.2, 0.4],
              y: [0, -20, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: Math.random() * 8,
            }}
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,1),0_0_20px_rgba(59,130,246,0.4)]" />
            <div className="absolute top-1/2 left-1/2 w-12 h-[1px] bg-gradient-to-r from-blue-400/60 to-transparent -translate-y-1/2 origin-left -rotate-45 blur-[0.5px]" />
          </motion.div>
        ))}
      </motion.div>

      {/* 装饰底座光晕 - 增强 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_60%)] pointer-events-none" />
    </div>
  );
}

// --- 高级组件：3D 简约处理核心 (高饱和度淡棕粒子版) ---
function MinimalProcessor() {
  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-1000">
      {/* 背景柔光 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.1)_0%,transparent_70%)]" />

      {/* 3D 倾斜平面 */}
      <motion.div 
        initial={{ rotateX: 65, rotateZ: 0 }}
        animate={{ rotateZ: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="relative w-[400px] h-[400px] rounded-full border border-amber-600/20 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-amber-600/10" />
        <div className="absolute inset-16 rounded-full border border-amber-500/20 border-dashed" />
        <div className="absolute inset-32 rounded-full border-2 border-amber-600/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]" />
        
        {/* 中心精细结构 - 增强 */}
        <div className="absolute w-28 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-amber-500/40 rounded-2xl rotate-45 shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
          <div className="absolute inset-3 border border-amber-400/30 rounded-xl -rotate-12" />
          <div className="w-10 h-10 bg-amber-500/20 rounded-full border-2 border-amber-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Cpu className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* 轨道上的高亮流光数据点 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,1)]"
            style={{
              top: '50%',
              left: '50%',
              offsetPath: `circle(${70 + i * 25}px at 50% 50%)`,
            }}
            animate={{
              offsetDistance: ["0%", "100%"],
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </motion.div>

      {/* 飞入飞出流光 - 线条更亮更宽 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 左侧飞入线 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`in-${i}`}
            className="absolute h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_rgba(245,158,11,0.4)]"
            style={{ 
              top: `${20 + i * 10}%`, 
              left: '-15%', 
              width: '180px',
              rotate: '-10deg'
            }}
            animate={{ 
              left: ['-15%', '45%'],
              opacity: [0, 1, 0],
              scaleX: [1, 1.5, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              delay: i * 0.3,
              ease: "circOut"
            }}
          />
        ))}

        {/* 右侧飞出线 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`out-${i}`}
            className="absolute h-[1px] bg-gradient-to-r from-amber-400 via-blue-400 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.4)]"
            style={{ 
              top: `${25 + i * 10}%`, 
              left: '50%', 
              width: '220px',
              rotate: '5deg'
            }}
            animate={{ 
              left: ['50%', '115%'],
              opacity: [0, 1, 0],
              scaleX: [1, 1.8, 1]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              delay: 0.5 + i * 0.3,
              ease: "circIn"
            }}
          />
        ))}
      </div>

      {/* 悬浮卡片 - 增加发光感 */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-8 scale-110">
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="bg-white p-4 rounded-2xl border-2 border-amber-500/10 shadow-[0_10px_30px_rgba(180,130,80,0.1)] flex items-center gap-4 ring-1 ring-amber-500/5"
        >
          <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shadow-inner">
            <Folder className="w-5 h-5" />
          </div>
          <div className="text-[11px] font-black text-amber-900/60 uppercase tracking-[0.25em]">Storage_System</div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="bg-white p-6 rounded-[2rem] border-2 border-amber-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-60 space-y-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-200">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="w-24 h-2 bg-amber-900/10 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-1.5 bg-amber-900/5 rounded-full" />
            <div className="w-full h-1.5 bg-amber-900/5 rounded-full" />
            <div className="w-2/3 h-1.5 bg-blue-500/20 rounded-full" />
          </div>
          <div className="pt-2 flex justify-end">
            <div className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-md">COMPLETE</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 2);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setError("");
    setFormData({ username: "", password: "" });
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "操作失败");
        setLoading(false);
        return;
      }

      router.push("/config");
      router.refresh();
    } catch (err: any) {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-orange-200 selection:text-orange-900 overflow-hidden">
      <div className="hidden lg:flex lg:w-[30%] relative overflow-hidden bg-[#fbfbfd] items-center justify-center border-r border-gray-100">
        {/* 背景装饰 - 增加网格对比度 */}
        <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1.2px,transparent_1.2px)] [background-size:30px_30px] opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/80 pointer-events-none" />

        {/* 核心视觉展示 - 缩小比例 */}
        <div className="relative z-10 w-full h-[400px] flex items-center justify-center scale-75">
           <AnimatePresence mode="wait">
             {activeSlide === 0 ? (
               <motion.div
                 key="radar"
                 className="w-full h-full"
                 initial={{ opacity: 0, filter: "blur(15px)", scale: 0.9 }}
                 animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                 exit={{ opacity: 0, filter: "blur(15px)", scale: 1.1 }}
                 transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
               >
                 <AdvancedRadar />
               </motion.div>
             ) : (
               <motion.div
                 key="processor"
                 className="w-full h-full"
                 initial={{ opacity: 0, filter: "blur(15px)", scale: 0.9 }}
                 animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                 exit={{ opacity: 0, filter: "blur(15px)", scale: 1.1 }}
                 transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
               >
                 <MinimalProcessor />
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="absolute bottom-12 left-10 z-20">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight uppercase flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${activeSlide === 0 ? 'bg-blue-500' : 'bg-amber-500'}`} />
              {activeSlide === 0 ? "信号扫描中" : "情报处理中"}
            </h3>
            <p className="text-gray-400 max-w-[200px] text-[10px] font-bold uppercase tracking-wider leading-relaxed">
              {activeSlide === 0 
                ? "正在聚合全球 500+ 实时信源" 
                : "AI 正在提取核心价值与深度洞察"}
            </p>
          </motion.div>
          
          <div className="flex gap-2 mt-6">
            <div className={`h-1 rounded-full transition-all duration-700 ${activeSlide === 0 ? 'w-8 bg-black' : 'w-2 bg-gray-200'}`} />
            <div className={`h-1 rounded-full transition-all duration-700 ${activeSlide === 1 ? 'w-8 bg-black' : 'w-2 bg-gray-200'}`} />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[70%] flex items-center justify-center p-8 lg:p-24 relative bg-white">
        <button 
          onClick={() => router.push("/")}
          className="absolute top-8 right-8 text-xs font-bold text-gray-400 hover:text-black transition-colors px-4 py-2 border border-gray-100 rounded-full hover:border-gray-200"
        >
          返回首页
        </button>

        <div className="w-full max-w-md space-y-16" style={{ fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}>
          <div className="text-left space-y-6">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] mb-10">
              AI
            </div>
            <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase leading-[0.9]">
              {mode === "login" ? "登录" : "注册"}
            </h1>
            <p className="text-lg text-gray-400 font-bold">
              {mode === "login" 
                ? "欢迎回来，请登录您的账号" 
                : "创建一个账号以开始使用"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-10">
              <div className="space-y-2 group">
                <label className="text-lg font-medium text-gray-400 uppercase tracking-[0.3em] group-focus-within:text-black transition-colors">用户账号</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-0 py-4 bg-transparent border-b-2 border-gray-100 focus:border-black outline-none transition-all placeholder:text-gray-200 text-base tracking-widest font-serif"
                  placeholder="请输入用户名"
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-lg font-medium text-gray-400 uppercase tracking-[0.3em] group-focus-within:text-black transition-colors">安全密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-gray-100 focus:border-black outline-none transition-all placeholder:text-gray-200 text-base tracking-widest font-serif"
                    placeholder="请输入密码"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black transition-colors scale-125"
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            {mode === "register" && (
              <label className="flex items-center gap-5 cursor-pointer group select-none">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-6 h-6 border-2 border-gray-200 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                  <Check className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-black transition-colors">
                  我已阅读并同意服务协议
                </span>
              </label>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest border-l-4 border-red-500 shadow-sm"
              >
                错误: {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white h-20 rounded-2xl font-black text-lg uppercase tracking-[0.3em] hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-5 shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                <>
                  {mode === "login" ? "立即登录" : "立即注册"}
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-8">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-xs font-black text-gray-400 uppercase tracking-[0.25em] hover:text-black transition-all border-b border-transparent hover:border-black pb-2"
            >
              {mode === "login" ? "没有账号？立即注册" : "已有账号？返回登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}
