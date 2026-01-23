"use client";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8">
        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight font-serif">404 - 找不到页面</h2>
      <p className="text-gray-500 mb-10 max-w-md leading-relaxed font-medium">
        您访问的页面可能已被移动、删除或从未存在过。
      </p>
      <button
        onClick={() => window.location.href = "/"}
        className="px-10 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-xl"
      >
        返回首页
      </button>
    </div>
  );
}
