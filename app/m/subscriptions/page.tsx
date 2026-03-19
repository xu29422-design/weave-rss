"use client";

import { useEffect, useState } from "react";
import { fetchCurrentConfig } from "@/app/config/actions";
import { Cpu, LineChart, Newspaper, Sparkles, Gamepad2, Compass } from "lucide-react";
import { motion } from "framer-motion";

const PRESET_THEMES = [
  { id: "tech", title: "科技专栏", desc: "追踪全球最前沿的科技动态与商业趋势", icon: <Cpu className="w-6 h-6" />, color: "from-blue-500 to-cyan-400" },
  { id: "finance", title: "股价/财经", desc: "实时把握市场脉搏与宏观经济指标", icon: <LineChart className="w-6 h-6" />, color: "from-green-500 to-emerald-400" },
  { id: "news", title: "全球新闻", desc: "每日重要新闻汇总，直击现场", icon: <Newspaper className="w-6 h-6" />, color: "from-slate-500 to-slate-400" },
  { id: "ai", title: "AI 实验室", desc: "深度精读大模型、Agent 与 AI 应用进化", icon: <Sparkles className="w-6 h-6" />, color: "from-purple-500 to-pink-400" },
  { id: "anime", title: "二次元", desc: "新番资讯、漫评与 ACG 圈内动态", icon: <Gamepad2 className="w-6 h-6" />, color: "from-orange-500 to-red-400" },
];

export default function SubscriptionsPage() {
  const [subscribedIds, setSubscribedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentConfig().then((res) => {
      if (res.settings?.subscribedThemes) {
        setSubscribedIds(res.settings.subscribedThemes);
      }
      setLoading(false);
    });
  }, []);

  const activeThemes = PRESET_THEMES.filter(t => subscribedIds.includes(t.id));

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      <header className="pt-12 pb-6 px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Compass className="w-6 h-6 text-blue-500" />
          已订阅
        </h1>
        <p className="text-slate-500 text-sm mt-1">你订阅的 RSS 主题和内容源</p>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : activeThemes.length > 0 ? (
          <div className="space-y-4">
            {activeThemes.map((theme, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={theme.id}
                className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex items-start gap-4"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.color} flex items-center justify-center text-white shadow-inner shrink-0`}>
                  {theme.icon}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{theme.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{theme.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <Compass className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>暂无订阅内容</p>
            <p className="text-sm mt-2">请前往 PC 端配置你的专属订阅</p>
          </div>
        )}
      </main>
    </div>
  );
}
