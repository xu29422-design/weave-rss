"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Mail, MessageSquare, Bot, User, ChevronRight, Code, Database, BookOpen, Search, Plus, Folder, Phone, Menu, MoreHorizontal, Smile, Scissors, AtSign, Rss, ChevronDown } from "lucide-react";
import { siGithub, siProducthunt, siMedium, siTechcrunch, siArstechnica, siNewyorktimes, siVercel } from "simple-icons/icons";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

// --- 产品形态图例：聊天内容（供 iPhone 内嵌）---
const ChatMock = () => (
  <div className="h-full flex flex-col bg-[#1f2937] font-sans">
    <div className="h-16 bg-[#374151] border-b border-white/5 flex items-end pb-3 px-5 gap-2 shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-green-500 mb-1" />
      <span className="text-[15px] font-bold text-white/90">Weave 协作群</span>
    </div>
    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-2 max-w-[85%]">
          <div className="text-[12px] text-white/60 ml-1">AI 情报助理</div>
          <div className="bg-[#374151] p-3.5 rounded-2xl rounded-tl-none border border-white/10 text-[14px] text-blue-50 leading-relaxed shadow-sm">
            今日为您聚合了 <span className="text-blue-300 font-bold">12 条</span> 高价值情报，已同步到多维表格。
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-md border border-white/20 mt-1">
            <div className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 p-3 flex flex-col justify-end">
              <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-0.5">Daily Digest</div>
              <div className="text-[15px] font-bold text-white leading-tight">AI 行业深度观察</div>
            </div>
            <div className="p-3 bg-[#1f2937] border-t border-white/5">
              <div className="text-[13px] text-white/70 line-clamp-2 leading-relaxed">DeepSeek MoE 架构更新；OpenAI AGI 路线图内部备忘录泄露；苹果发布新一代 M 系列芯片...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- iPhone 设备框（超精细拟真）---
function IPhoneFrame() {
  return (
    <div className="relative w-[280px] h-[580px] rounded-[3.5rem] p-3 bg-gradient-to-br from-[#d9d9d9] via-[#8a8a8a] to-[#3a3a3a] shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.4)] flex-shrink-0">
      <div className="w-full h-full rounded-[3rem] bg-black p-2 relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
        {/* 灵动岛 */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20 flex items-center justify-between px-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#111] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#111] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]"></div>
        </div>
        {/* 屏幕内容：按照真实的 iPhone 逻辑分辨率 390x844 渲染，并缩小 */}
        <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-[390px] h-[844px] origin-top-left" style={{ transform: "scale(0.61538)" }}>
            <ChatMock />
          </div>
        </div>
      </div>
    </div>
  );
}

const DesktopChatMock = () => (
  <div className="h-full flex bg-[#f5f5f5] text-[#333] font-sans overflow-hidden">
    {/* 最左侧细导航栏 */}
    <div className="w-[64px] bg-[#ebebeb] border-r border-[#d6d6d6] flex flex-col items-center py-5 shrink-0 justify-between">
      <div className="flex flex-col items-center gap-7">
        <div className="w-11 h-11 rounded bg-blue-500 overflow-hidden shadow-sm">
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-[15px]">我</div>
        </div>
        <div className="relative cursor-pointer group">
          <MessageSquare className="w-[26px] h-[26px] text-blue-500" />
          <div className="absolute -top-1 -right-1.5 w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-[#ebebeb] flex items-center justify-center text-white text-[10px] font-bold">3</div>
        </div>
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors">
          <AtSign className="w-[26px] h-[26px]" />
        </div>
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors">
          <User className="w-[26px] h-[26px]" />
        </div>
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors">
          <Folder className="w-[26px] h-[26px]" />
        </div>
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors font-bold text-xl leading-none mt-2">
          ...
        </div>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors">
          <Phone className="w-[26px] h-[26px]" />
        </div>
        <div className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors">
          <Menu className="w-[26px] h-[26px]" />
        </div>
      </div>
    </div>

    {/* 中间会话列表 */}
    <div className="w-[240px] lg:w-[280px] bg-[#f7f7f7] border-r border-[#d6d6d6] flex flex-col shrink-0">
      <div className="h-16 flex items-center px-4 gap-3 shrink-0">
        <div className="flex-1 h-8 bg-[#e2e2e2] rounded flex items-center px-3 text-[13px] text-gray-500 cursor-text">
          <Search className="w-4 h-4 mr-2 opacity-70" /> 搜索
        </div>
        <div className="w-8 h-8 bg-[#e2e2e2] rounded flex items-center justify-center text-gray-600 cursor-pointer hover:bg-[#d8d8d8] transition-colors">
          <Plus className="w-4 h-4" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2 space-y-1">
        <div className="flex items-center gap-3 p-3 bg-[#c4c4c4] rounded-lg cursor-pointer">
          <div className="w-11 h-11 rounded bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[20px] shrink-0">🤖</div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[14px] font-medium text-gray-900 truncate">AI 前沿资讯速递(28)</div>
              <div className="text-[11px] text-gray-500 shrink-0 ml-2">昨天</div>
            </div>
            <div className="text-[13px] text-gray-500 truncate">Weave助手: 🌟 今日焦点 春节...</div>
          </div>
        </div>
        {[
          { name: "产品与研发交流群", msg: "李梅: 最新原型图已上传", time: "14:37", color: "bg-red-400", tag: "内部", badge: 7 },
          { name: "市场运营同步群", msg: "[文件] 活动复盘.pptx", time: "14:36", color: "bg-blue-400", tag: "外部" },
          { name: "官方全员大群", msg: "张伟 加入群聊", time: "14:35", color: "bg-orange-500", tag: "全员" },
          { name: "内部闲聊摸鱼群", msg: "王强: 哈哈哈确实", time: "14:35", color: "bg-green-500", badge: 2 },
          { name: "运动打卡小分队", msg: "周末去爬山吗？", time: "14:33", color: "bg-purple-500" },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 hover:bg-[#e4e4e4] rounded-lg transition-colors cursor-pointer relative">
             <div className={`w-11 h-11 rounded text-white flex items-center justify-center text-[18px] font-bold shrink-0 ${c.color} relative`}>
                {c.name[0]}
                {c.badge && (
                  <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-[#f7f7f7] shadow-sm z-10">{c.badge}</div>
                )}
             </div>
             <div className="flex-1 overflow-hidden">
               <div className="flex justify-between items-center mb-1">
                 <div className="flex items-center gap-1.5 overflow-hidden">
                   <div className="text-[14px] text-gray-800 truncate">{c.name}</div>
                   {c.tag && (
                     <span className={`text-[10px] px-1.5 py-0.5 rounded-sm shrink-0 ${c.tag === '外部' ? 'text-orange-500 border border-orange-500/50' : 'text-blue-500 border border-blue-500/50'}`}>{c.tag}</span>
                   )}
                 </div>
                 <div className="text-[11px] text-gray-400 shrink-0 ml-2">{c.time}</div>
               </div>
               <div className="text-[13px] text-gray-400 truncate">{c.msg}</div>
             </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* 右侧主聊天区 */}
    <div className="flex-1 flex flex-col bg-[#f5f5f5]">
      {/* 顶部标题栏 */}
      <div className="h-16 border-b border-[#e6e6e6] flex items-center px-6 shrink-0 justify-between">
        <div className="text-[18px] font-medium text-gray-900">AI 前沿资讯速递(28)</div>
        <div className="flex gap-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
           <MoreHorizontal className="w-6 h-6" />
        </div>
      </div>
      
      {/* 聊天内容区 */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="text-center">
          <span className="text-[12px] text-gray-400">昨天 21:52</span>
        </div>
        <div className="flex gap-4">
          <div className="w-11 h-11 rounded-md bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 max-w-[90%] lg:max-w-[85%]">
            <div className="text-[13px] text-gray-500 mb-1.5 ml-1">Weave智能助理</div>
            <div className="bg-white p-6 rounded-2xl rounded-tl-none border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="text-[15px] text-gray-800 leading-relaxed mb-5">
                <span className="text-yellow-500 text-base">🌟</span> <span className="font-bold">今日焦点</span> 春节AI营销大战落幕，三大厂总投入超百亿，豆包霸榜8日，元宝重回App Store前十。
              </div>
              
              <div className="w-full h-px bg-gray-100 mb-5"></div>

              <div className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                1. 📱 竞品动态
              </div>
              
              <div className="space-y-5">
                <div>
                  <div className="text-[14px] font-bold text-gray-800 mb-3 inline-block">CN 移动 AI 赛道</div>
                  <ul className="list-disc pl-6 text-[14px] text-gray-700 space-y-3 leading-relaxed marker:text-gray-400">
                    <li><span className="font-bold">从“红包狂欢”到“办公利器” 腾讯元宝重回苹果应用商店榜单前10</span> 腾讯元宝从红包功能转型为办公工具，重回苹果应用商店榜单前十。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">三大AI春节烧掉近百亿后：豆包霸榜8日，千问第二，元宝重回前十</span> 春节期间AI应用竞争激烈，豆包、千问、元宝表现突出，总投入超百亿。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">元宝、千问、豆包：烧完40亿后，留下了什么？</span> 分析三大AI应用投入巨资后的成果与市场表现。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">DeepSeek V4即将发布</span> DeepSeek即将发布新版本模型，引发行业关注。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">国产厂商团结对外！DeepSeek已向华为等提供V4模型测试：无视英伟达、AMD</span> DeepSeek与国内厂商合作，提供V4模型测试，推动国产AI生态发展。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">春节AI营销战落幕：三大厂总花费超百亿跻身MAU亿级俱乐部 元宝重回App Store榜单前十</span> 春节期间AI营销投入巨大，三大厂跻身MAU亿级俱乐部，元宝重回榜单前十。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                  </ul>
                </div>
                
                <div>
                  <div className="text-[14px] font-bold text-gray-800 mb-3 mt-5 inline-block">🖨️ 扫描竞品</div>
                  <ul className="list-disc pl-6 text-[14px] text-gray-700 space-y-3 leading-relaxed marker:text-gray-400">
                    <li><span className="font-bold">腾讯元宝“骂人”再上热搜 AI情绪失控为哪般？</span> 腾讯元宝出现情绪控制问题，引发用户关注。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">腾讯元宝致歉拜年海报出现“脏话”：模型异常输出导致，已紧急校正并优化</span> 元宝出现异常输出，已紧急校正并优化模型。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                    <li><span className="font-bold">阶跃星辰杀入季后赛，强势跻身AI“新六小虎”第一梯队</span> 阶跃星辰在AI领域表现突出，跻身第一梯队。 <span className="text-blue-500 cursor-pointer hover:underline">链接</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部输入框 */}
      <div className="h-[160px] bg-white border-t border-[#e6e6e6] flex flex-col shrink-0">
        <div className="h-12 flex items-center px-5 gap-6 text-gray-500">
          <Smile className="w-[20px] h-[20px] cursor-pointer hover:text-gray-700 transition-colors" />
          <Folder className="w-[20px] h-[20px] cursor-pointer hover:text-gray-700 transition-colors" />
          <Scissors className="w-[20px] h-[20px] cursor-pointer hover:text-gray-700 transition-colors" />
          <MessageSquare className="w-[20px] h-[20px] cursor-pointer hover:text-gray-700 transition-colors" />
        </div>
        <div className="flex-1 px-5 outline-none text-[14px] text-gray-400">
          输入关键字或问题...
        </div>
      </div>
    </div>
  </div>
);

// --- MacBook 设备框（超精细拟真）---
function MacBookFrame() {
  return (
    <div className="relative flex flex-col items-center flex-shrink-0">
      {/* 屏幕上半部 */}
      <div className="relative w-[720px] md:w-[860px] rounded-t-2xl rounded-b-none border-t border-x border-[#444] bg-[#111] p-3 pb-4 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-10">
        {/* 刘海 */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#111] rounded-b-xl flex justify-center items-center z-20 shadow-[0_1px_1px_rgba(255,255,255,0.05)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#050505] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-white/5"></div>
        </div>
        {/* 屏幕内容区：保持 16:10 比例 */}
        <div className="relative rounded-lg overflow-hidden bg-white w-full aspect-[16/10] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]">
          {/* 按 1680x1050 渲染，然后精确缩放以填满内屏 */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media (min-width: 768px) {
              .mac-screen-content { transform: scale(0.496428) !important; }
            }
            .mac-screen-content { transform: scale(0.413095); }
          `}} />
          <div className="mac-screen-content absolute top-0 left-0 w-[1680px] h-[1050px] origin-top-left bg-[#f5f5f5]">
            <DesktopChatMock />
          </div>
        </div>
      </div>
      {/* 键盘底座下半部 */}
      <div className="relative w-[800px] md:w-[960px] h-5 bg-gradient-to-b from-[#b3b4b6] to-[#7f8183] rounded-b-3xl rounded-t-sm shadow-[0_30px_50px_rgba(0,0,0,0.8)] flex justify-center z-20 overflow-hidden before:absolute before:inset-0 before:rounded-b-3xl before:shadow-[inset_0_-2px_4px_rgba(255,255,255,0.4)]">
        {/* 开盖凹槽 */}
        <div className="absolute top-0 w-32 h-1.5 bg-[#666] rounded-b-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"></div>
        <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ddd] to-transparent opacity-50"></div>
      </div>
    </div>
  );
}

// --- 产品形态图例 Section：Mac 左 + iPhone 右（flex 布局保证两者都可见）---
function ProductShapeSection({ style }: { style?: React.CSSProperties | { y?: MotionValue<number> } }) {
  return (
    <section className="relative z-10 pt-4 pb-20 md:pt-10 md:pb-32 -mt-8 md:-mt-16">
      <div className="max-w-[1200px] mx-auto relative z-10 px-4">
        <motion.div
          style={style}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="relative w-full flex flex-col sm:flex-row items-end justify-center gap-0 min-h-[520px] md:min-h-[580px] pt-8 pb-8"
        >
          {/* MacBook：左侧 */}
          <div className="relative z-10 flex-shrink-0 order-1 origin-bottom">
            <div className="scale-[0.85] md:scale-100 origin-bottom">
              <MacBookFrame />
            </div>
          </div>
          {/* iPhone：右侧、叠在前层，用负 margin 与 MacBook 重叠 */}
          <div className="relative z-20 flex-shrink-0 order-2 -rotate-2 ml-[-60px] sm:ml-[-80px] md:ml-[-100px] mb-2 sm:mb-0">
            <div className="scale-[0.75] sm:scale-90 md:scale-95 origin-bottom">
              <IPhoneFrame />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const { scrollY } = useScroll();
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
            <span className="text-xl font-bold tracking-tight group-hover:text-blue-200 transition-colors font-sans text-white drop-shadow-md">Weave</span>
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
                onClick={() => openAuth("register")}
                className="px-6 py-2.5 bg-white/10 border border-white/20 text-white rounded-full font-bold hover:bg-white/20 transition-all shadow-lg hover:shadow-blue-500/10"
              >
                注册
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section：参考 Cubox 字体、文案与间距 */}
      <section className="relative z-10 pt-24 pb-20 md:pt-28 md:pb-24 px-6 min-h-[75vh] flex flex-col justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
        <motion.div
          style={{ y: y2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-3xl mx-auto w-full text-center"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight text-white drop-shadow-lg mb-6">
            新一代 AI 信息聚合助手
          </h1>

          {/* 副标题：中等字重、略小、留足与按钮间距 */}
          <p className="text-lg md:text-xl text-blue-100/95 max-w-xl mx-auto leading-relaxed font-normal mb-12 md:mb-14">
            Weave 是你的 RSS 信息助手，让订阅读得完、记得住、用得上。
          </p>

          {/* 双按钮/单按钮逻辑：根据登录状态切换 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            {authenticated ? (
              <>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-950 rounded-full text-base font-semibold hover:bg-blue-50 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  进入后台
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/config")}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-transparent text-white border border-white/30 rounded-full text-base font-medium hover:bg-white/10 transition-all"
                >
                  进入配置
                </button>
              </>
            ) : (
              <button
                onClick={() => openAuth("login", "/dashboard")}
                className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-950 rounded-full text-base font-semibold hover:bg-blue-50 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                登录去使用
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* 平台入口：小字、弱化，类似「获取更多 App >」 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-blue-200/80">
            <span className="text-sm font-medium">支持接收：</span>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 hover:text-cyan-200 transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-sm">Email</span>
              </div>
              <div className="flex items-center gap-2 hover:text-cyan-200 transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">WPS</span>
              </div>
              <div className="flex items-center gap-2 hover:text-cyan-200 transition-colors">
                <Bot className="w-4 h-4" />
                <span className="text-sm">Feishu</span>
              </div>
            </div>
            <span className="text-sm text-blue-300/90">获取更多渠道 →</span>
          </div>
        </motion.div>
      </section>

      {/* 2. 产品形态图例：聊天 + 多维表格 */}
      <ProductShapeSection style={{ y: y2 }} />

      {/* 3. 支持的 RSS 链接源 */}
      <section className="relative z-10 w-full py-24 border-y border-white/10 bg-[#030712]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-3xl md:text-4xl font-black text-white font-sans mb-5">支持的 RSS 链接源</h2>
          <p className="text-center text-blue-50 font-normal text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            支持任意 RSS 链接、OPML 导入，以及常见科技媒体与 Newsletter。每日实时追踪分析 500+ 优质信源。
          </p>
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
          <p className="text-center text-sm text-blue-200/80 mt-8 pb-2">手机端也能收到推送</p>
        </div>
      </section>

      {/* 4. 配置说明：选择源 - 配置 - 等待推送 */}
      <section className="py-24 px-6 relative z-10 overflow-hidden">
        <div className="absolute left-0 bottom-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-5 tracking-tight text-white font-sans">极简配置，三步开启</h2>
            <p className="text-lg text-blue-50 font-normal leading-relaxed max-w-2xl mx-auto">只需简单几步，即可打造专属于你的自动化信息流。</p>
          </motion.div>
          
            <div className="grid md:grid-cols-3 gap-6 lg:gap-10 relative">
            {/* 连接线 (仅在桌面端显示) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 -z-10"></div>
            
            {[
              {
                step: "01",
                title: "选择 RSS 源",
                desc: "添加 RSS，支持海量优质信源。",
                icon: <Database className="w-8 h-8 text-blue-400" />,
                illustration: (
                  <div className="w-full bg-[#0a0a0a] rounded-xl border border-[#333] p-0 text-left shadow-2xl relative overflow-hidden group-hover:border-blue-500/50 transition-all duration-500 transform group-hover:-translate-y-1">
                    {/* Mac 窗口顶部控制栏 */}
                    <div className="h-5 bg-[#1a1a1a] border-b border-[#333] flex items-center px-2 gap-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                    </div>
                    {/* 窗口内容 */}
                    <div className="p-4 relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full blur-2xl"></div>
                      <div className="flex gap-2 mb-4 relative z-10">
                        <div className="flex-1 bg-[#111] rounded border border-[#333] px-3 py-2 text-xs text-gray-400 flex items-center overflow-hidden shadow-inner">
                          <span className="truncate">https://example.com/rss...</span>
                        </div>
                        <div className="bg-blue-600 rounded px-3 py-2 flex items-center justify-center shadow-[0_2px_10px_rgba(37,99,235,0.3)] cursor-pointer hover:bg-blue-500 transition-colors">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="space-y-2.5 relative z-10">
                        <div className="flex items-center gap-3 bg-[#111] rounded-lg px-3 py-2 border border-[#333] hover:border-gray-600 transition-colors cursor-pointer">
                          <div className="w-6 h-6 rounded bg-[#ff6600]/20 flex items-center justify-center shrink-0 border border-[#ff6600]/30"><Rss className="w-3.5 h-3.5 text-[#ff6600]"/></div>
                          <div className="text-xs text-gray-200 font-medium truncate">Hacker News</div>
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">已连接</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-[#111] rounded-lg px-3 py-2 border border-[#333] hover:border-gray-600 transition-colors cursor-pointer">
                          <div className="w-6 h-6 rounded bg-[#00a651]/20 flex items-center justify-center shrink-0 border border-[#00a651]/30"><Rss className="w-3.5 h-3.5 text-[#00a651]"/></div>
                          <div className="text-xs text-gray-200 font-medium truncate">TechCrunch</div>
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">已连接</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                step: "02",
                title: "配置 Webhook",
                desc: "填入接收渠道地址，定制你的专属推送。",
                icon: <Code className="w-8 h-8 text-cyan-400" />,
                illustration: (
                  <div className="w-full bg-[#0a0a0a] rounded-xl border border-[#333] p-0 text-left shadow-2xl relative overflow-hidden group-hover:border-cyan-500/50 transition-all duration-500 transform group-hover:-translate-y-1">
                    {/* Mac 窗口顶部控制栏 */}
                    <div className="h-5 bg-[#1a1a1a] border-b border-[#333] flex items-center px-2 gap-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                    </div>
                    {/* 窗口内容 */}
                    <div className="p-4 relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full blur-2xl"></div>
                      <div className="space-y-4 relative z-10">
                        <div>
                          <div className="text-[11px] text-gray-500 mb-2 font-medium flex items-center gap-1.5"><Bot className="w-3 h-3"/> 推送渠道</div>
                          <div className="bg-[#111] rounded-lg border border-[#333] px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-gray-500 transition-colors shadow-inner">
                            <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded bg-[#00d6b9]/20 flex items-center justify-center shrink-0 border border-[#00d6b9]/30">
                                <MessageSquare className="w-3 h-3 text-[#00d6b9]" />
                              </div>
                              <span className="text-[13px] text-gray-200 font-medium">飞书群机器人</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500 mb-2 font-medium flex items-center gap-1.5"><Code className="w-3 h-3"/> Webhook URL</div>
                          <div className="bg-[#111] rounded-lg border border-[#333] px-3 py-2.5 flex items-center shadow-inner group-hover:border-cyan-500/30 transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                            <span className="text-[11px] text-gray-400 truncate font-mono">https://open.feishu.cn/open-apis/bot/v2/hook/...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                step: "03",
                title: "等待每日推送",
                desc: "自动汇总生成，深度信息简报准时送达。",
                icon: <Sparkles className="w-8 h-8 text-indigo-400" />,
                illustration: (
                  <div className="w-full bg-[#0a0a0a] rounded-xl border border-[#333] p-0 text-left shadow-2xl relative overflow-hidden group-hover:border-indigo-500/50 transition-all duration-500 transform group-hover:-translate-y-1">
                    {/* Mac 窗口顶部控制栏 */}
                    <div className="h-5 bg-[#1a1a1a] border-b border-[#333] flex items-center px-2 gap-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                    </div>
                    {/* 窗口内容 */}
                    <div className="p-4 relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full blur-2xl"></div>
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#333] relative z-10">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_2px_10px_rgba(99,102,241,0.4)]">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-gray-200 leading-tight mb-0.5">Your Daily Briefing</div>
                          <div className="text-[10px] text-gray-500">每天定时推送，无需手动</div>
                        </div>
                      </div>
                      <div className="space-y-3 relative z-10">
                        <div className="flex gap-2.5 items-start bg-[#111] p-2.5 rounded-lg border border-[#333] hover:border-gray-600 transition-colors shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></div>
                          <div className="text-[12px] text-gray-400 leading-relaxed line-clamp-2">今日 AI 焦点：DeepSeek 发布新一代推理模型，多项指标超越 GPT-4。</div>
                        </div>
                        <div className="flex gap-2.5 items-start bg-[#111] p-2.5 rounded-lg border border-[#333] hover:border-gray-600 transition-colors shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></div>
                          <div className="text-[12px] text-gray-400 leading-relaxed line-clamp-2">苹果开发者大会(WWDC)前瞻：iOS 将迎来史诗级 AI 升级。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[#111827]/80 border border-white/10 backdrop-blur-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:border-blue-500/30 group-hover:shadow-blue-500/20 transition-all duration-300">
                  {item.icon}
                </div>
                <div className="text-blue-400 font-black text-sm mb-2 tracking-widest uppercase">STEP {item.step}</div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">{item.title}</h3>
                <p className="text-blue-50/80 text-xs md:text-sm leading-relaxed max-w-[260px] h-10 md:h-auto">{item.desc}</p>
                
                {/* 插入图例 */}
                <div className="mt-6 md:mt-8 w-full max-w-[320px] md:max-w-full lg:max-w-[340px]">
                  {item.illustration}
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
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 border border-white/20 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                W
              </div>
              <span className="font-bold font-sans text-white">Weave</span>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <div className="font-bold text-white/90 mb-2 uppercase tracking-wider">产品</div>
                <Link href="/dashboard" className="text-blue-50/80 hover:text-cyan-200 transition-colors">后台</Link>
                <span className="mx-2 text-white/40">·</span>
                <Link href="/config" className="text-blue-50/80 hover:text-cyan-200 transition-colors">配置</Link>
              </div>
              <div>
                <div className="font-bold text-white/90 mb-2 uppercase tracking-wider">公司</div>
                <span className="text-blue-50/80">© 2026 Weave</span>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-blue-50/60 font-mono">
            Designed by Axu and Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
