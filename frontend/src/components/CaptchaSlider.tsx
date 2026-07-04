"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** 验证通过时回调(滑到底且耗时 ≥ MIN_DRAG_MS)。 */
  onSuccess: () => void;
  className?: string;
}

type Status = "idle" | "dragging" | "success";

const HANDLE_PX = 44; // 滑块手柄宽高(px),与下方 size-11 对应
const MIN_DRAG_MS = 450; // 拒绝快于此的「滑到底」(防脚本瞬时触发)

/**
 * 自托管滑块验证码 —— 纯前端,无第三方、无 key。向右拖动手柄到底即通过,
 * 但若整个过程快于 MIN_DRAG_MS(非人类速度)则判失败并回弹。只做轻量拦截,
 * 真接后端时可换成 Turnstile / 腾讯防水墙等。
 */
export function CaptchaSlider({ onSuccess, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const [pct, setPct] = useState(0); // 手柄位置 0..100
  const [status, setStatus] = useState<Status>("idle");

  // 指针拖拽用的 ref(避免 pointerup 闭包里读到 stale state)
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startPctRef = useRef(0);
  const downAtRef = useRef(0);
  const pctRef = useRef(0);
  const maxXRef = useRef(1);

  // 量轨道宽(响应式)。
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      setTrackW(el.clientWidth);
      maxXRef.current = Math.max(1, el.clientWidth - HANDLE_PX);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ESC 无关:这里不需要键盘关闭(由外层弹层处理)。

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (status === "success") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startPctRef.current = pctRef.current;
    downAtRef.current = performance.now();
    setStatus("dragging");
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const deltaPct = ((e.clientX - startXRef.current) / maxXRef.current) * 100;
    const next = Math.max(0, Math.min(100, startPctRef.current + deltaPct));
    pctRef.current = next;
    setPct(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const reached = pctRef.current >= 99.5;
    const humanish = performance.now() - downAtRef.current >= MIN_DRAG_MS;
    if (reached && humanish) {
      pctRef.current = 100;
      setPct(100);
      setStatus("success");
      onSuccess();
    } else {
      pctRef.current = 0;
      setPct(0);
      setStatus("idle");
    }
  };

  const offset = (pct / 100) * Math.max(0, trackW - HANDLE_PX);
  const done = status === "success";
  const smooth = status !== "dragging"; // 拖拽时跟手(无过渡),回弹/到位时带过渡

  return (
    <div className={cn("w-full select-none", className)}>
      <div
        ref={trackRef}
        className={cn(
          "relative h-11 w-full overflow-hidden rounded-lg border",
          done ? "border-emerald-500/40 bg-emerald-500/10" : "bg-muted border-border",
        )}
      >
        {/* 已滑过的填充 */}
        <div
          className={cn("absolute inset-y-0 left-0", done ? "bg-emerald-500/25" : "bg-primary/15", smooth && "transition-[width] duration-150 ease-out")}
          style={{ width: `${offset}px` }}
        />

        {/* 提示文字 */}
        {!done && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
            style={{ opacity: Math.max(0, 1 - pct / 120) }}
          >
            向右拖动滑块完成验证
          </div>
        )}
        {done && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" /> 验证成功
          </div>
        )}

        {/* 手柄 */}
        <button
          type="button"
          aria-label="拖动滑块完成验证"
          disabled={done}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            draggingRef.current = false;
            pctRef.current = 0;
            setPct(0);
            setStatus("idle");
          }}
          className={cn(
            "absolute inset-y-0 left-0 grid size-11 place-items-center rounded-md border bg-background shadow-sm",
            smooth && "transition-[left] duration-150 ease-out",
            done
              ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
              : "cursor-grab border-border hover:bg-accent active:cursor-grabbing",
          )}
          style={{ left: `${offset}px`, touchAction: "none" }}
        >
          {done ? <Check className="size-4" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {done ? "验证通过,正在记录点赞…" : "拖动以证明你不是机器人"}
      </p>
    </div>
  );
}
