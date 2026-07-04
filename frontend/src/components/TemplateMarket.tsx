"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STYLE_SPECIMEN } from "@/lib/md";
import { buildSpecimenDoc, render } from "@/lib/pipeline";
import { cloneTheme, type ThemeConfig } from "@/lib/theme";
import {
  MARKET_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type MarketTemplate,
  type TemplateCategory,
} from "@/lib/templates";
import { LikeButton } from "./LikeButton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (theme: ThemeConfig) => void;
  onToast: (message: string) => void;
  /** 显示点赞入口(Web 端为 true;桌面端不渲染)。 */
  likeable?: boolean;
}

type Filter = "全部" | TemplateCategory;
const FILTERS: Filter[] = ["全部", ...TEMPLATE_CATEGORIES];

/** Render the specimen through the live pipeline once per (stable) theme. */
function useSpecimenDoc(theme: ThemeConfig) {
  return useMemo(
    () => buildSpecimenDoc(render({ markdown: STYLE_SPECIMEN, theme }).inlined),
    [theme]
  );
}

function paletteOf(t: ThemeConfig) {
  return [
    { label: "文字", color: t.base.fontColor },
    { label: "背景", color: t.base.bgColor },
    { label: "标题", color: t.headings.h1.color },
    { label: "链接", color: t.link.color },
    { label: "强调", color: t.code.inlineColor },
  ];
}

/**
 * One template card: the whole card is a button that applies the template
 * (preserving the one-click "套用" path). A sibling zoom button — overlaid on
 * the frame, revealed on hover — opens the detail view. It's a sibling, not a
 * child, so there's no nested-button DOM.
 */
function TemplateCard({
  tpl,
  likeable,
  onApply,
  onZoom,
}: {
  tpl: MarketTemplate;
  likeable: boolean;
  onApply: () => void;
  onZoom: () => void;
}) {
  const doc = useSpecimenDoc(tpl.theme);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onApply}
        title={`一键套用「${tpl.name}」`}
        className="tm-card block w-full text-left focus-visible:outline-none"
      >
        <div className="tm-frame">
          <iframe
            srcDoc={doc}
            title={`${tpl.name} 预览`}
            aria-hidden="true"
            tabIndex={-1}
            sandbox="allow-same-origin"
            className="pointer-events-none block h-56 w-full"
          />
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
        <span className="truncate tm-serif text-[17px] leading-none">{tpl.name}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          {likeable && <LikeButton tplKey={tpl.key} />}
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase tm-faint">
            {tpl.category}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onZoom}
        aria-label="放大预览"
        title="放大查看"
        className="tm-zoom absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Maximize2 className="size-3.5" />
      </button>
    </div>
  );
}

/** Zoomed-in detail view: large preview + palette + key stats + apply. */
function Detail({
  tpl,
  likeable,
  onBack,
  onApply,
}: {
  tpl: MarketTemplate;
  likeable: boolean;
  onBack: () => void;
  onApply: () => void;
}) {
  const doc = useSpecimenDoc(tpl.theme);
  const palette = paletteOf(tpl.theme);
  const b = tpl.theme.base;
  const stats = [
    { label: "正文字号", value: `${b.fontSize}px` },
    { label: "行高", value: b.lineHeight.toFixed(2) },
    { label: "字间距", value: `${b.letterSpacing}px` },
    { label: "段落间距", value: `${b.paragraphSpacing}px` },
  ];
  return (
    <div className="tm-fade">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="tm-frame">
          <iframe
            srcDoc={doc}
            title={`${tpl.name} 放大预览`}
            aria-hidden="true"
            tabIndex={-1}
            sandbox="allow-same-origin"
            className="block h-[58vh] min-h-[320px] w-full"
          />
        </div>
        <aside className="flex flex-col">
          <span className="tm-overline">{tpl.category}</span>
          <h3 className="tm-serif mt-2 text-[30px] leading-none">{tpl.name}</h3>
          <p className="tm-muted mt-3 text-[13px] leading-relaxed">{tpl.description}</p>

          <div className="tm-rule my-5" />
          <div className="mb-2.5 text-[11px] font-medium tracking-wide tm-faint">配色</div>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {palette.map((p) => (
              <div key={p.label} className="flex items-center gap-2">
                <span className="tm-swatch" style={{ backgroundColor: p.color }} />
                <div className="leading-tight">
                  <div className="text-[11px]">{p.label}</div>
                  <div className="font-mono text-[10px] tm-faint">{p.color}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="tm-rule my-5" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[11px] tm-faint">{s.label}</div>
                <div className="tm-serif text-lg leading-tight">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={onApply}>
              套用此模板
            </Button>
            {likeable && (
              <LikeButton
                tplKey={tpl.key}
                className="h-7 gap-1.5 rounded-lg border px-3.5 text-xs tm-hair-b"
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Template Market — a dark, editorial specimen gallery. Click a card to apply
 * (same path as the preset dropdown); hover & hit the magnifier to zoom into a
 * detail view with palette + stats. Applies go through `onApply`, so the
 * paste-into-公众号 pipeline is unchanged.
 */
export function TemplateMarket({ open, onOpenChange, onApply, onToast, likeable = false }: Props) {
  const [filter, setFilter] = useState<Filter>("全部");
  const [zoomed, setZoomed] = useState<MarketTemplate | null>(null);
  const list = filter === "全部" ? MARKET_TEMPLATES : MARKET_TEMPLATES.filter((t) => t.category === filter);

  const close = () => onOpenChange(false);
  const apply = (tpl: MarketTemplate) => {
    onApply(cloneTheme(tpl.theme));
    onOpenChange(false);
    onToast(`已套用「${tpl.name}」`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setZoomed(null);
        onOpenChange(o);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="tm-scope flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 text-[var(--tm-text)] ring-1 ring-black/5 dark:ring-white/10 sm:max-w-6xl"
      >
        {/* Masthead */}
        <DialogHeader className="shrink-0 gap-0 border-b tm-hair-b px-7 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="tm-overline">Template Market · 排版精选</div>
              <DialogTitle className="tm-serif mt-2 text-[32px] leading-none tracking-tight">
                模板市场
              </DialogTitle>
              <DialogDescription className="tm-muted mt-2.5 text-[12.5px]">
                {zoomed
                  ? "查看大图预览与配色细节，确认后一键套用。"
                  : "点击卡片即可套用，或悬停后放大查看排版细节。"}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {!zoomed && (
                <div className="hidden text-right sm:block">
                  <div className="tm-overline">收录</div>
                  <div className="tm-serif mt-1 text-[26px] leading-none">
                    {list.length}
                    <span className="tm-faint text-base"> 套</span>
                  </div>
                </div>
              )}
              {zoomed && (
                <button
                  type="button"
                  onClick={() => setZoomed(null)}
                  className="tm-muted inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors hover:bg-black/5 hover:text-[var(--tm-text)] dark:hover:bg-white/5"
                >
                  <ArrowLeft className="size-3.5" /> 返回
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="关闭"
                className="tm-faint grid size-8 place-items-center rounded-lg transition-colors hover:bg-black/5 hover:text-[var(--tm-text)] dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Filters — gallery mode only */}
          {!zoomed && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-b tm-hair-b pb-2.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className="tm-filter"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6 [scrollbar-gutter:stable]">
          {zoomed ? (
            <Detail tpl={zoomed} likeable={likeable} onBack={() => setZoomed(null)} onApply={() => apply(zoomed)} />
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((tpl, i) => (
                <div
                  key={tpl.key}
                  className="tm-rise"
                  style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                >
                  <TemplateCard tpl={tpl} likeable={likeable} onApply={() => apply(tpl)} onZoom={() => setZoomed(tpl)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
