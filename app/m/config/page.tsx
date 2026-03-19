"use client";

import { useEffect, useState } from "react";
import { fetchCurrentConfig } from "@/app/config/actions";
import { Layers, Bot, Webhook, Clock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentConfig().then((res) => {
      if (res.settings) {
        setConfig(res.settings);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      <header className="pt-12 pb-6 px-6 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-500" />
          配置中心
        </h1>
        <p className="text-slate-500 text-sm mt-1">查看你的系统及推送配置</p>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-slate-100 animate-pulse rounded-3xl"></div>
            <div className="h-32 bg-slate-100 animate-pulse rounded-3xl"></div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* AI 模型配置 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI 引擎</h3>
                  <p className="text-xs text-slate-500">当前使用的大模型分析驱动</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="text-sm font-medium text-slate-700">供应商</div>
                <div className="text-lg font-bold text-indigo-600 mt-1 uppercase">
                  {config?.aiProvider || "未配置"}
                </div>
              </div>
            </motion.div>

            {/* 推送渠道配置 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">推送服务</h3>
                  <p className="text-xs text-slate-500">接收简报的机器人或通道</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 overflow-hidden text-ellipsis whitespace-nowrap">
                <div className="text-sm font-medium text-slate-700">Webhook URL</div>
                <div className="text-sm text-slate-500 mt-1 truncate">
                  {config?.webhookUrl ? config.webhookUrl.replace(/^https?:\/\//, '') : "未配置"}
                </div>
              </div>
            </motion.div>

            {/* 推送时间 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">定时策略</h3>
                  <p className="text-xs text-slate-500">自动抓取与发送频率</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-slate-50 rounded-2xl p-4">
                  <div className="text-xs text-slate-500">时间</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {config?.pushTime || "08:00"}
                  </div>
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl p-4">
                  <div className="text-xs text-slate-500">时区</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {config?.timezone || "UTC+8"}
                  </div>
                </div>
              </div>
            </motion.div>
            
            <div className="text-center mt-8 pb-4">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                如需修改配置，请登录 PC 端进行操作
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
