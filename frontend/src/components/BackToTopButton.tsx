"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * How far (px) a scroll container must be scrolled before its back-to-top
 * button fades in. Shared by the editor and the preview so both panes agree.
 */
export const BACK_TO_TOP_THRESHOLD = 120;

/**
 * Floating "back to top" button, pinned to the bottom-right of its nearest
 * `position: relative` ancestor. Rendered unconditionally so it can fade
 * smoothly, but kept invisible + non-interactive (opacity-0,
 * pointer-events-none, tabIndex -1, aria-hidden) until `visible`.
 *
 * Owns no scroll logic — the parent tracks the container's scroll position and
 * passes `visible` + `onClick`. Styled to match the codebase's other floating
 * affordances (see `SideEdgeTab`): translucent background, backdrop blur, hairline
 * border, soft shadow.
 */
export function BackToTopButton({
  visible,
  onClick,
  label = "返回顶部",
}: {
  visible: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "absolute bottom-3 left-3 z-20 flex size-8 items-center justify-center rounded-full border bg-background/95 text-muted-foreground shadow-sm backdrop-blur transition-opacity duration-200 hover:bg-background hover:text-foreground",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
