"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, FileType2, LoaderCircle, Store } from "lucide-react";
import { WeChatIcon, XiaohongshuIcon } from "@/components/brand-icons";
import { toast } from "sonner";
import { Editor } from "@/components/Editor";
import { Preview } from "@/components/Preview";
import { SplitHandle } from "@/components/SplitHandle";
import { StylePanel } from "@/components/StylePanel";
import { TemplateMarket } from "@/components/TemplateMarket";
import { Toolbar } from "@/components/Toolbar";
import { ThemeBar } from "@/components/ThemeBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collapseIconBtn, HIDE_LABEL_960 } from "@/components/ui/responsive";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { useDebounced } from "@/hooks/useDebounced";
import { useDocActions } from "@/hooks/useDocActions";
import { useHotkey } from "@/hooks/useHotkey";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePaneLayout } from "@/hooks/usePaneLayout";
import { SAMPLE_MARKDOWN } from "@/lib/md";
import { buildPreviewDoc, render } from "@/lib/pipeline";
import {
  DEFAULT_THEME,
  cloneTheme,
  deepMerge,
  mergeTheme,
  type DeepPartial,
  type ThemeConfig,
} from "@/lib/theme";
import { isWails } from "@/native";
import { cn } from "@/lib/utils";

const paneClass = "flex min-h-0 min-w-0 flex-col overflow-hidden bg-background";
const paneHeaderClass =
  "flex min-h-10.5 items-center justify-between border-b px-3.5 py-1.5 text-xs text-muted-foreground";
const paneTitleClass = "flex items-center gap-2";
const paneIndexClass = "font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400";
const paneMetaClass = "flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground";

type MobileTab = "editor" | "preview" | "style";
const MOBILE_TABS: { key: MobileTab; label: string }[] = [
  { key: "editor", label: "编辑" },
  { key: "preview", label: "预览" },
  { key: "style", label: "样式" },
];

function PaneHeader({
  index,
  title,
  meta,
  titleId,
  collapseDir,
  onCollapse,
}: {
  index: string;
  title: string;
  meta: React.ReactNode;
  titleId?: string;
  collapseDir?: "left" | "right";
  onCollapse?: () => void;
}) {
  return (
    <div className={paneHeaderClass}>
      <div className={paneTitleClass}>
        <span className={paneIndexClass}>{index}</span>
        <h2 id={titleId} className="font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className={paneMetaClass}>
        {meta}
        {collapseDir && onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={onCollapse}
            aria-label={`收起${title}`}
            title={`收起${title}`}
          >
            {collapseDir === "left" ? <ChevronLeft /> : <ChevronRight />}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Floating tab pinned to the main-area edge that reopens a fully-collapsed side
 * pane. Absolutely positioned (so it costs 0 flex space — the pane is truly
 * gone and the preview takes the full width); a higher z-index keeps it above
 * the preview iframe and clickable.
 */
function SideEdgeTab({
  index,
  title,
  side,
  onExpand,
}: {
  index: string;
  title: string;
  side: "left" | "right";
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`展开${title}`}
      title={`展开${title}`}
      className={cn(
        // Anchored slightly above the main area's vertical center (closer to the
        // header / top content) so it's an easier reach than dead-center.
        "absolute top-[42%] z-30 flex w-7 -translate-y-1/2 flex-col items-center gap-1 py-2 shadow-sm backdrop-blur transition-colors",
        side === "left"
          ? "left-0 rounded-r-md border-r bg-background/95 hover:bg-background"
          : "right-0 rounded-l-md border-l bg-background/95 hover:bg-background",
      )}
    >
      {side === "left" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      <span className={paneIndexClass}>{index}</span>
      <span className="text-[10px] text-muted-foreground" style={{ writingMode: "vertical-rl" }}>
        {title}
      </span>
    </button>
  );
}

// External promotional links shown on the header's right side.
const LINK_XIAOHONGSHU = "https://www.xiaohongshu.com/user/profile/66f7ffef000000001d023066";
/** Project repository — the header brand (logo + "MDInline") links here. */
const LINK_REPO = "https://github.com/din4e/MDInline";

/** Compact external link: icon always, text hides on narrow widths. */
function HeaderLink({ href, label, text, children }: { href: string; label: string; text: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
      <span className="max-[860px]:hidden">{text}</span>
    </a>
  );
}

/** Same look as HeaderLink, but a button that triggers an action (e.g. opens a dialog). */
function HeaderButton({ onClick, label, text, children }: { onClick: () => void; label: string; text: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
      <span className="max-[860px]:hidden">{text}</span>
    </button>
  );
}

export default function Page() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [hydrated, setHydrated] = useState(false);
  const [wails, setWails] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [marketOpen, setMarketOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 1100px)");
  const isMobile = useMediaQuery("(max-width: 720px)");
  // The viewport can't be read during prerender or the first client render
  // (useMediaQuery returns false until mount). Default to the desktop 3-column
  // layout for that first paint — otherwise a wide screen flashes the 2-column
  // tablet layout (style panel drops to the bottom) before snapping to 3 cols.
  const isDesktopView = hydrated ? isDesktop : true;
  const isMobileView = hydrated && isMobile;
  const layout = usePaneLayout(isDesktopView);

  // Load persisted markdown + theme on mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const m = localStorage.getItem("mdcss.markdown");
      const t = localStorage.getItem("mdcss.theme");
      if (m) setMarkdown(m);
      if (t) setTheme(mergeTheme(JSON.parse(t)));
    } catch {
      /* ignore */
    }
    setHydrated(true);
    setWails(isWails);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("mdcss.markdown", markdown);
    } catch {
      /* ignore */
    }
  }, [markdown, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("mdcss.theme", JSON.stringify(theme));
    } catch {
      /* ignore */
    }
  }, [theme, hydrated]);

  const debouncedMd = useDebounced(markdown, 150);
  const debouncedTheme = useDebounced(theme, 150);

  const inlined = useMemo(
    () => render({ markdown: debouncedMd, theme: debouncedTheme }).inlined,
    [debouncedMd, debouncedTheme]
  );
  const previewDoc = useMemo(() => buildPreviewDoc(inlined), [inlined]);

  const update = (p: DeepPartial<ThemeConfig>) => setTheme((t) => deepMerge(t, p));
  const applyTheme = (t: ThemeConfig) => setTheme(cloneTheme(t));

  const notify = (msg: string) => toast(msg);

  const actions = useDocActions({
    markdown,
    theme,
    onImportMd: (content) => setMarkdown(content),
    onToast: notify,
  });

  // Global keyboard shortcuts (disabled while an action is in flight).
  useHotkey({ key: "s" }, actions.exportMd, !actions.busy);
  useHotkey({ key: "e" }, actions.exportHtml, !actions.busy);
  useHotkey({ key: "o" }, actions.importFile, !actions.busy);
  useHotkey({ key: "d" }, actions.exportDocx, !actions.busy);

  const chars = markdown.length.toLocaleString("zh-CN");
  const liveMeta = (
    <>
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      实时渲染
    </>
  );
  const previewMeta = (
    <>
      {liveMeta}
      <Button
        variant="ghost"
        size="xs"
        onClick={actions.copyHtml}
        disabled={actions.busy}
        title="复制内联样式的正文 HTML,可直接粘贴到公众号编辑器"
        className={cn(collapseIconBtn.xs, "text-muted-foreground")}
      >
        {actions.busy ? <LoaderCircle className="animate-spin" /> : <Copy />}
        <span className={HIDE_LABEL_960}>复制 HTML</span>
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={actions.copyWord}
        disabled={actions.busy}
        title="复制为 RTF,可粘贴到 Word / WPS 保留样式"
        className={cn(collapseIconBtn.xs, "text-muted-foreground")}
      >
        {actions.busy ? <LoaderCircle className="animate-spin" /> : <FileType2 />}
        <span className={HIDE_LABEL_960}>复制到 Word</span>
      </Button>
    </>
  );

  // Pane bodies — defined once, reused across desktop / tablet / mobile layouts.
  const editorCell = <Editor value={markdown} onChange={setMarkdown} onToast={notify} />;
  const previewCell = <Preview doc={previewDoc} />;
  const styleCell = <StylePanel theme={theme} update={update} />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/70">
      <header className="relative z-20 flex min-h-13 items-center justify-between gap-4 border-b bg-background px-4 py-1.5 max-[1100px]:items-start max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-2.5 max-[720px]:px-3 max-[720px]:py-2.5">
        {/* Left: brand + 主题预设 / 我的主題 / 模板市场 */}
        <div className="flex min-w-0 items-center gap-2.5 max-[720px]:w-full max-[720px]:overflow-x-auto max-[720px]:pb-0.5 max-[720px]:[scrollbar-width:none] max-[720px]:[&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <a
              href={LINK_REPO}
              target="_blank"
              rel="noopener noreferrer"
              title="在 GitHub 上查看 MDInline"
              className="flex items-center gap-2 rounded-md transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.png"
                alt=""
                aria-hidden="true"
                className="size-8.5 shrink-0 rounded-lg object-cover max-[390px]:size-7.5"
              />
              <h1 className="text-sm leading-tight font-bold tracking-tight max-[390px]:text-[13px]">
                MDInline
              </h1>
            </a>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] font-normal text-muted-foreground max-[390px]:hidden",
              wails &&
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            <span
              className={cn("size-1.5 rounded-full bg-muted-foreground", wails && "bg-emerald-500")}
              aria-hidden="true"
            />
            {wails ? "桌面端" : "Web 端"}
          </Badge>
          <Separator orientation="vertical" className="hidden h-6 shrink-0 sm:block" />
          <ThemeBar theme={theme} onApplyTheme={applyTheme} onToast={notify}>
            <Button variant="outline" className={collapseIconBtn.default} onClick={() => setMarketOpen(true)} title="浏览并套用模板">
              <Store />
              <span className={HIDE_LABEL_960}>模板市场</span>
            </Button>
          </ThemeBar>
        </div>
        {/* Right: 微信公众号 / 小红书 链接 + 其他按钮 */}
        <div className="flex min-w-0 items-center justify-end gap-2.5 max-[1100px]:flex-wrap max-[720px]:w-full max-[720px]:flex-nowrap max-[720px]:justify-start max-[720px]:overflow-x-auto max-[720px]:pb-0.5 max-[720px]:[scrollbar-width:none] max-[720px]:[&::-webkit-scrollbar]:hidden">
          <HeaderButton onClick={() => setWechatOpen(true)} label="微信公众号" text="公众号">
            <WeChatIcon className="size-3.5" />
          </HeaderButton>
          <HeaderLink href={LINK_XIAOHONGSHU} label="小红书" text="小红书">
            <XiaohongshuIcon className="size-3.5" />
          </HeaderLink>
          <Separator orientation="vertical" className="hidden h-6 shrink-0 sm:block" />
          <Toolbar actions={actions} />
          <ThemeToggle />
        </div>
      </header>

      {isMobileView ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div role="tablist" aria-label="移动端面板切换" className="flex shrink-0 gap-px bg-border">
            {MOBILE_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={mobileTab === t.key}
                onClick={() => setMobileTab(t.key)}
                className={cn(
                  "flex-1 border-b-2 bg-background py-2.5 text-[13px] font-medium transition-colors",
                  mobileTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <section className={cn(paneClass, "flex-1")}>
            {mobileTab === "editor" && (
              <>
                <PaneHeader index="01" title="Markdown 编辑" meta={`${chars} 字符`} />
                {editorCell}
              </>
            )}
            {mobileTab === "preview" && (
              <>
                <PaneHeader index="02" title="公众号预览" meta={previewMeta} />
                {previewCell}
              </>
            )}
            {mobileTab === "style" && (
              <>
                <PaneHeader index="03" title="样式调节" meta="自动保存" />
                {styleCell}
              </>
            )}
          </section>
        </main>
      ) : isDesktopView ? (
        <main ref={layout.containerRef} className="relative flex min-h-0 flex-1 overflow-hidden bg-border">
          {layout.collapse.editor ? (
            <SideEdgeTab index="01" title="Markdown 编辑" side="left" onExpand={() => layout.toggle("editor")} />
          ) : (
            <>
              <section
                style={{ flexBasis: `${layout.editor * 100}%` }}
                className={cn(paneClass, "shrink-0 grow-0")}
                aria-labelledby="editor-title"
              >
                <PaneHeader
                  index="01"
                  title="Markdown 编辑"
                  titleId="editor-title"
                  meta={`${chars} 字符`}
                  collapseDir="left"
                  onCollapse={() => layout.toggle("editor")}
                />
                {editorCell}
              </section>
              <SplitHandle
                label="调整编辑与预览的宽度"
                onDragStart={layout.beginDrag}
                onDrag={layout.onEditorDrag}
                onDragEnd={layout.endDrag}
              />
            </>
          )}

          <section className={cn(paneClass, "min-w-0 grow basis-0")} aria-labelledby="preview-title">
            <PaneHeader index="02" title="公众号预览" titleId="preview-title" meta={previewMeta} />
            {previewCell}
          </section>

          {layout.collapse.style ? (
            <SideEdgeTab index="03" title="样式调节" side="right" onExpand={() => layout.toggle("style")} />
          ) : (
            <>
              <SplitHandle
                label="调整预览与样式的宽度"
                onDragStart={layout.beginDrag}
                onDrag={layout.onStyleDrag}
                onDragEnd={layout.endDrag}
              />
              <section
                style={{ flexBasis: `${layout.style * 100}%` }}
                className={cn(paneClass, "shrink-0 grow-0")}
                aria-labelledby="style-title"
              >
                <PaneHeader
                  index="03"
                  title="样式调节"
                  titleId="style-title"
                  meta="自动保存"
                  collapseDir="right"
                  onCollapse={() => layout.toggle("style")}
                />
                {styleCell}
              </section>
            </>
          )}
        </main>
      ) : (
        // Tablet (720–1100px): 2-col grid, style spans the full second row.
        <main className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-px overflow-hidden bg-border">
          <section className={paneClass} aria-labelledby="editor-title">
            <PaneHeader index="01" title="Markdown 编辑" titleId="editor-title" meta={`${chars} 字符`} />
            {editorCell}
          </section>
          <section className={paneClass} aria-labelledby="preview-title">
            <PaneHeader index="02" title="公众号预览" titleId="preview-title" meta={previewMeta} />
            {previewCell}
          </section>
          <section className={cn(paneClass, "col-span-full")} aria-labelledby="style-title">
            <PaneHeader index="03" title="样式调节" titleId="style-title" meta="自动保存" />
            {styleCell}
          </section>
        </main>
      )}

      <TemplateMarket open={marketOpen} onOpenChange={setMarketOpen} onApply={applyTheme} onToast={notify} likeable={!wails} />

      <Dialog open={wechatOpen} onOpenChange={setWechatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>微信公众号</DialogTitle>
            <DialogDescription>微信搜一搜「阿東的AI飞轮」,或扫码关注。</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- 静态导出无需 next/image,单张本地图直接用 img */}
          <img
            src="/wechat.png"
            alt="微信公众号「阿東的AI飞轮」二维码"
            className="block h-auto w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}
