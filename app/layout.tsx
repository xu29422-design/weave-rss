import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

// 英文/正文无衬线字体 (等线)
const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

// 数字/代码等宽字体 (科技感)
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-mono',
  display: 'swap',
});

// 标题保留衬线体，用于营造反差感 (可选，如果用户想全等线也可以改)
// 用户说“英文和数字改成等线”，中文标题其实用衬线更有质感，
// 但为了“干练”，我们统一用 Inter 也是一种选择。
// 这里保留 Playfair 仅作装饰性大标题备选，主力转为 Inter。
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Weave RSS | 您的智能情报官",
  description: "AI 驱动的每日行业情报聚合服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={`${inter.variable} ${jetbrains.variable} ${playfair.variable} font-sans antialiased selection:bg-orange-500 selection:text-white`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
