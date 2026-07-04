"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark app-appearance toggle. `resolvedTheme` is undefined until
 * next-themes mounts on the client, so we gate the icon on `mounted` to avoid a
 * hydration mismatch (the actual class is still applied pre-paint by the
 * provider's inline script). The preview iframe is intentionally unaffected —
 * it renders the article's own bgColor, not the app chrome's.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "切换到亮色" : "切换到暗色"}
      aria-label={isDark ? "切换到亮色" : "切换到暗色"}
      className="text-muted-foreground"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
