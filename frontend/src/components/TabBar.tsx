"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc } from "@/lib/workspace";

interface Props {
  docs: Doc[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

/**
 * Horizontal, scrollable document tab strip. Purely presentational — close
 * confirmation (dirty check) is handled by the parent's onClose, not here.
 * Dirty tabs show an amber dot; each tab's tooltip is its source path (if any).
 */
export function TabBar({ docs, activeId, onSelect, onClose, onNew }: Props) {
  return (
    <div
      role="tablist"
      aria-label="文档标签"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {docs.map((d) => {
        const active = d.id === activeId;
        return (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(d.id)}
            title={d.path ?? d.title}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="max-w-[12ch] truncate">{d.title}</span>
            {d.dirty && (
              <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-label="未保存" />
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClose(d.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(d.id);
                }
              }}
              aria-label={`关闭 ${d.title}`}
              className="-mr-1 grid size-4 shrink-0 place-items-center rounded text-muted-foreground/70 hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        aria-label="新建标签"
        title="新建未命名标签"
        className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
