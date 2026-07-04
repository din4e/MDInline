"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STYLE_SPECIMEN } from "@/lib/md";
import { buildSpecimenDoc, render } from "@/lib/pipeline";
import type { ThemeConfig } from "@/lib/theme";
import { useDebounced } from "@/hooks/useDebounced";

/**
 * A persistent, live "style specimen" shown at the top of the style panel.
 *
 * It renders a fixed representative sample (STYLE_SPECIMEN) through the *same*
 * render() pipeline as the main preview, so it always reflects the current
 * theme — no matter what's in the editor or which tab you're on. The theme is
 * debounced locally so dragging sliders doesn't thrash the iframe.
 */
export function StylePreview({ theme }: { theme: ThemeConfig }) {
  const [open, setOpen] = useState(true);
  const debTheme = useDebounced(theme, 150);

  const doc = useMemo(() => {
    const { inlined } = render({ markdown: STYLE_SPECIMEN, theme: debTheme });
    return buildSpecimenDoc(inlined);
  }, [debTheme]);

  return (
    <div className={`shrink-0 border-b ${open ? "bg-muted/70" : "bg-background"}`}>
      <Button variant="ghost" className="h-auto w-full justify-between rounded-none px-3 py-2 text-xs font-semibold text-muted-foreground" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="style-specimen-content">
        <span>样式预览（实时）</span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </Button>
      {open && (
        <div className="px-2.5 pb-2.5" id="style-specimen-content">
          <iframe
            className="block h-49 w-full rounded-md border bg-muted"
            title="样式预览"
            srcDoc={doc}
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
