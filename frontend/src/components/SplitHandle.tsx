"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Fired once on pointer-down, before any move. Use to snapshot start sizes. */
  onDragStart?: () => void;
  /** Fired on every pointer-move with the horizontal delta (px) from start. */
  onDrag: (deltaPx: number) => void;
  /** Fired on pointer-up / cancel. Use to persist the final size. */
  onDragEnd?: () => void;
  label: string;
}

/**
 * A 1px vertical splitter with an enlarged invisible hit area. Uses pointer
 * capture so the drag keeps tracking even if the cursor leaves the handle.
 * Reports only the horizontal delta; the owner turns that into a size change.
 */
export function SplitHandle({ onDragStart, onDrag, onDragEnd, label }: Props) {
  const startX = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const stop = () => {
    if (startX.current == null) return;
    startX.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    onDragEnd?.();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    onDragStart?.();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    onDrag(e.clientX - startX.current);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      className={cn(
        "relative z-10 w-px shrink-0 cursor-col-resize bg-border transition-colors",
        dragging ? "bg-primary" : "hover:bg-primary/50"
      )}
    >
      {/* Enlarged invisible hit area centered on the 1px line. */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
