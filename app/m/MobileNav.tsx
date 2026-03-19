"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Layers, User } from "lucide-react";
import clsx from "clsx";

export default function MobileNav() {
  const pathname = usePathname();
  if (pathname === "/m/auth") return null;

  return (
    <nav className="fixed bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-50 px-6 pb-6 pointer-events-none flex justify-between items-center">
      {/* 左侧：今日、已订阅、配置 */}
      <div className="bg-white/95 backdrop-blur-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-full p-1 flex items-center gap-0.5 pointer-events-auto border border-slate-100/50 h-[44px]">
        <NavItem href="/m" icon={<Home className="w-[16px] h-[16px]" strokeWidth={1.25} />} label="今日" active={pathname === "/m"} />
        <NavItem href="/m/subscriptions" icon={<Compass className="w-[16px] h-[16px]" strokeWidth={1.25} />} label="已订阅" active={pathname === "/m/subscriptions"} />
        <NavItem href="/m/config" icon={<Layers className="w-[16px] h-[16px]" strokeWidth={1.25} />} label="配置" active={pathname === "/m/config"} />
      </div>

      {/* 右侧：个人中心 */}
      <div className="pointer-events-auto h-[44px] flex items-center">
        <Link
          href="/m/profile"
          className={clsx(
            "w-[44px] h-[44px] bg-white/95 backdrop-blur-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100/50 rounded-full flex items-center justify-center transition-all active:scale-95",
            pathname === "/m/profile" ? "text-slate-900 bg-slate-50" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <User className="w-[16px] h-[16px]" strokeWidth={1.25} />
        </Link>
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex flex-col items-center justify-center gap-[3px] w-[42px] h-[36px] rounded-full transition-all active:scale-95",
        active ? "bg-slate-50/80 text-slate-900" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </Link>
  );
}
