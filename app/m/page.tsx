"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink, BookOpen, LogIn, UserPlus } from "lucide-react";

const PAGE_SIZE = 20;

interface PushedArticle {
  title: string;
  summary?: string;
  link: string;
  category?: string;
  score?: number;
  pushedAt: string;
}

function MobileHome() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12 bg-white">
      <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-8 shadow-[0_8px_30px_rgba(59,130,246,0.3)]">
        <BookOpen className="w-10 h-10 text-white" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-3 font-serif italic">Weave</h1>
      <p className="text-slate-500 text-center text-[15px] mb-12 max-w-[280px] leading-relaxed">
        登录后即可在手机上<br />阅读已推送的订阅内容
      </p>
      <div className="w-full max-w-[280px] space-y-4">
        <Link
          href="/m/auth?mode=login"
          className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
        >
          <LogIn className="w-5 h-5" />
          登录
        </Link>
        <Link
          href="/m/auth?mode=register"
          className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-semibold text-[15px] active:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          注册
        </Link>
      </div>
    </div>
  );
}

function MobileFeedContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PushedArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const res = await fetch(
        `/api/feed/pushed?page=${pageNum}&pageSize=${PAGE_SIZE}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 401) router.replace("/m");
        return null;
      }
      const { items: nextItems, total: nextTotal, hasMore: nextHasMore } = json.data;
      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setTotal(nextTotal);
      setHasMore(nextHasMore);
      return nextItems;
    },
    [router]
  );

  useEffect(() => {
    (async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      await fetchPage(page, page > 1);
      setLoading(false);
      setLoadingMore(false);
    })();
  }, [page, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, false);
    setPage(1);
    setRefreshing(false);
  }, [fetchPage]);

  const loadMore = () => setPage((p) => p + 1);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="pb-6 bg-[#f8f9fa] min-h-full">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">已推送文章</h1>
              <p className="text-[11px] text-slate-500 font-medium">优先展示简报中的内容</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-[16px] font-semibold text-slate-800 mb-1">暂无已推送文章</p>
            <p className="text-[13px] text-slate-500 mb-8">完成简报推送后，这里会展示文章列表</p>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-[14px] active:bg-slate-50 transition-colors shadow-sm"
            >
              去配置中心
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[12px] font-medium text-slate-400 mb-3 px-1 uppercase tracking-wider">共 {total} 篇</p>
            <ul className="space-y-4">
              {items.map((article, idx) => (
                <li key={`${article.link}-${article.pushedAt}-${idx}`}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-slate-100 rounded-[20px] p-5 active:bg-slate-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[16px] font-bold text-slate-900 line-clamp-2 leading-[1.4] mb-2">
                          {article.title}
                        </h2>
                        {article.summary && (
                          <p className="text-[14px] text-slate-500 line-clamp-3 leading-relaxed mb-4">
                            {article.summary}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {article.category && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {article.category}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDate(article.pushedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-8 flex justify-center pb-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full max-w-[200px] py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-[14px] active:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : (
                    "加载更多"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="px-4 mt-6 flex justify-center">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 py-2 px-4 rounded-full bg-slate-200/50 text-[13px] font-medium text-slate-500 active:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {refreshing ? "刷新中…" : "下拉刷新"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MobilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);

  const checkAuth = useCallback(async () => {
    const me = await fetch("/api/auth/me", { credentials: "include" });
    if (!me.ok) return false;
    return true;
  }, []);

  useEffect(() => {
    checkAuth().then((ok) => {
      setAuthOk(!!ok);
      setLoading(false);
    });
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!authOk) {
    return <MobileHome />;
  }

  return <MobileFeedContent />;
}
