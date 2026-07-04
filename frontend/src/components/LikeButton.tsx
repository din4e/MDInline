"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { CaptchaSlider } from "./CaptchaSlider";
import { formatCount, getLikeStore } from "@/lib/likes";
import { cn } from "@/lib/utils";

interface Props {
  tplKey: string;
  className?: string;
}

/**
 * 模板点赞按钮(仅 Web 端渲染)。点击未点赞时弹出滑块验证码,通过后才计数。
 * 数据走 `@/lib/likes` 的可替换存储(默认本地)。已点赞则幂等。
 *
 * 验证用自托管轻量弹层(fixed overlay),而不是再开一层 Radix Dialog —— 避免
 * 在模板市场 Dialog 内嵌套 Dialog 带来的焦点/层叠问题。
 */
export function LikeButton({ tplKey, className }: Props) {
  const store = getLikeStore();
  const [count, setCount] = useState(() => store.getCount(tplKey));
  const [liked, setLiked] = useState(() => store.isLiked(tplKey));
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!verifying) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVerifying(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [verifying]);

  const onClick = () => {
    if (liked) {
      toast("已经点过赞啦");
      return;
    }
    setVerifying(true);
  };

  const onVerified = () => {
    const next = store.like(tplKey);
    setCount(next);
    setLiked(true);
    setVerifying(false);
    toast("点赞成功,感谢支持");
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={liked}
        aria-label={liked ? "已点赞" : "点赞"}
        title={liked ? "已点赞" : "点赞(需验证)"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full text-[11px] tabular-nums transition-colors",
          "text-[var(--tm-faint)] hover:text-[var(--tm-text)]",
          liked && "text-[var(--tm-gold)] hover:text-[var(--tm-gold)]",
          className,
        )}
      >
        <Heart className={cn("size-3.5 transition-transform", liked ? "fill-current" : "hover:scale-110")} />
        <span>{formatCount(count)}</span>
      </button>

      {verifying && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setVerifying(false)}
        >
          <div
            className="w-full max-w-xs rounded-xl border bg-[var(--tm-panel)] p-5 text-[var(--tm-text)] shadow-2xl tm-hair-b-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">安全验证</div>
            <div className="mt-1 text-xs text-[var(--tm-muted)]">完成滑块验证后即可点赞该模板。</div>
            <div className="mt-4">
              <CaptchaSlider onSuccess={onVerified} />
            </div>
            <button
              type="button"
              onClick={() => setVerifying(false)}
              className="mt-3 w-full rounded-md py-1.5 text-xs text-[var(--tm-faint)] transition-colors hover:text-[var(--tm-text)]"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </>
  );
}
