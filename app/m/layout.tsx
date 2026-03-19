import type { Metadata } from "next";
import MobileNav from "./MobileNav";

export const metadata: Metadata = {
  title: "Weave 阅读 | 移动端",
  description: "已推送文章，手机阅读",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-[#f8f9fa] text-slate-900 font-sans selection:bg-blue-500/30">
      <div className="flex-1 overflow-auto">{children}</div>
      <MobileNav />
    </div>
  );
}
