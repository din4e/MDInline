import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDInline",
  description: "把 Markdown 转成内联 CSS,可直接粘贴进微信公众号编辑器。支持实时编辑预览、字体/间距/标题/代码/图片排版调节、主题导入导出。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        {/* next-themes injects a pre-paint script that sets the `dark` class on
            <html> from localStorage / prefers-color-scheme, so there's no flash
            of the wrong theme on load (important under static export). */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="mdcss.appearance"
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
