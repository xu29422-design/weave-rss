"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight font-serif">抱歉，出错了</h2>
      <p className="text-gray-500 mb-10 max-w-md leading-relaxed font-medium">
        系统在运行过程中遇到了一个意外错误。别担心，您的数据是安全的。
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-lg"
        >
          重试一下
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="px-8 py-3 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200 transition-all"
        >
          返回首页
        </button>
      </div>
      {error.digest && (
        <p className="mt-8 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
