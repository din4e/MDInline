"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { getSearchQuery, search } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
  keymap,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view";
import {
  EditorSelection,
  EditorState,
  Prec,
  RangeSetBuilder,
  StateField,
} from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { BackToTopButton, BACK_TO_TOP_THRESHOLD } from "@/components/BackToTopButton";
import { FindReplaceBar } from "@/components/FindReplaceBar";
import { ImageContextMenu, type ImageMenuState } from "@/components/ImageContextMenu";

/**
 * Pasted/dropped images are embedded as `![](data:…)` so they render in the
 * preview straight away. Each image is downscaled and JPEG-encoded through a
 * canvas so a screenshot doesn't bloat localStorage / the copied HTML payload.
 *
 * Caveat (surfaced via a toast): 公众号 re-hosts article images on its own CDN
 * (mmbiz.qpic.cn) and does not reliably keep `data:` URLs when you paste, so
 * for the final publish these embedded images should be swapped for 公众号
 * image URLs. The data URL is for composition/preview only.
 *
 * A base64 data URL can be hundreds of KB on a single line. CodeMirror would
 * both wrap that line (blowing the editor up to thousands of px tall) and lag
 * on any edit/scroll near it. So each `![alt](data:…)` is collapsed to a small
 * **card widget** — the raw data URL is NEVER rendered as editable text. An
 * image alone on its line becomes a block widget (measured precisely, no line
 * wrapping of the base64 at all); an inline image becomes an inline card. The
 * card supports click-to-select, hover-to-delete, and double-click to edit alt.
 */
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;
const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** Matches `![alt](data:…)` so we can pull alt + url out of an Image node. */
const DATA_IMAGE_RE = /^!\[([\s\S]*)\]\((data:[^)\s]+)\)/;

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

/** Downscale + JPEG-encode to keep pastes small; fall back to a raw data URL. */
async function encodeImage(file: File): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }
  if (!bitmap) return fileToDataUrl(file);
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(file);
    // White mat so transparent regions don't render black under JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close?.();
  }
}

function altFromName(name: string): string {
  const base = (name || "image").replace(/\.[^.]+$/, "").trim();
  return base || "image";
}

/** Collect image files from a paste (DataTransferItemList) or drop (FileList). */
function imageFilesFromTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  if (dt.items && dt.items.length) {
    for (const it of Array.from(dt.items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
    if (out.length) return out; // paste path: items are authoritative
  }
  if (dt.files && dt.files.length) {
    for (const f of Array.from(dt.files)) if (f.type.startsWith("image/")) out.push(f);
  }
  return out;
}

/** Encode every image file and return the `![alt](url)` block to insert. */
async function imagesToMarkdown(files: File[]): Promise<string> {
  const imgs = files.filter((f) => f.type.startsWith("image/"));
  const parts: string[] = [];
  for (const f of imgs) {
    try {
      parts.push(`![${altFromName(f.name)}](${await encodeImage(f)})`);
    } catch {
      /* skip a single unreadable image, keep the rest */
    }
  }
  return parts.length ? `\n\n${parts.join("\n\n")}\n\n` : "";
}

/** Insert `md` at every selection range and leave the caret after it. */
function insertAtCarets(view: EditorView, md: string) {
  view.dispatch(
    view.state.changeByRange((range) => ({
      changes: { from: range.from, to: range.to, insert: md },
      range: EditorSelection.cursor(range.from + md.length),
    })),
  );
}

async function ingestImages(
  view: EditorView,
  files: File[],
  onToast?: (msg: string) => void,
) {
  const md = await imagesToMarkdown(files);
  if (!md) return;
  insertAtCarets(view, md);
  onToast?.(
    "图片已插入（仅预览用）。发布到公众号请改用公众号图床链接，否则图片不会保留。",
  );
}

/** Rough decoded size of a data URL, for the card badge ("~42 KB"). */
function dataUrlSizeLabel(url: string): string {
  const comma = url.indexOf(",");
  const b64 = comma >= 0 ? url.length - comma - 1 : url.length;
  const kb = Math.max(1, Math.round((b64 * 0.75) / 1024));
  return `${kb} KB`;
}

/* ── Image card widget ─────────────────────────────────────────────────────
   Replaces a `![alt](data:…)` range with a small card. `block` widgets own
   their whole line so CodeMirror never wraps the underlying base64. The
   widget stores only the doc positions (cheap to rebuild on every change);
   it reads url/alt lazily in toDOM.                                       */

class ImageCardWidget extends WidgetType {
  constructor(
    readonly imgFrom: number,
    readonly imgTo: number,
    readonly block: boolean,
  ) {
    super();
  }
  eq(other: ImageCardWidget) {
    return (
      other.imgFrom === this.imgFrom &&
      other.imgTo === this.imgTo &&
      other.block === this.block
    );
  }
  toDOM(view: EditorView): HTMLElement {
    const raw = view.state.doc.sliceString(this.imgFrom, this.imgTo);
    const m = DATA_IMAGE_RE.exec(raw);
    const alt = m?.[1]?.trim() || "图片";
    const url = m?.[2] || "";

    const wrap = document.createElement(this.block ? "div" : "span");
    wrap.className = "cm-mdimg-card" + (this.block ? " is-block" : "");
    wrap.setAttribute("role", "button");
    wrap.setAttribute("aria-label", `图片：${alt}（点击选中，双击改 alt）`);
    wrap.title = "点击选中 · 双击修改替代文本 · 悬停可删除";

    const img = document.createElement("img");
    img.className = "cm-mdimg-thumb";
    img.src = url;
    img.alt = alt;
    img.draggable = false;
    img.loading = "lazy";

    const text = document.createElement("span");
    text.className = "cm-mdimg-body";
    const cap = document.createElement("span");
    cap.className = "cm-mdimg-cap";
    cap.textContent = alt;
    const meta = document.createElement("span");
    meta.className = "cm-mdimg-meta";
    meta.textContent = `图片 · ${dataUrlSizeLabel(url)}`;
    text.append(cap, meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "cm-mdimg-del";
    del.setAttribute("aria-label", "删除图片");
    del.textContent = "×";
    del.title = "删除图片";
    del.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({ changes: { from: this.imgFrom, to: this.imgTo, insert: "" } });
    });

    // Single click → select the whole image (so Delete/typing replaces it).
    wrap.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest(".cm-mdimg-del")) return;
      e.preventDefault();
      e.stopPropagation();
      view.focus();
      view.dispatch({
        selection: EditorSelection.range(this.imgFrom, this.imgTo),
      });
    });
    // Double click → edit alt text without ever exposing the base64.
    wrap.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = window.prompt("图片替代文本（alt）", alt);
      if (next !== null) {
        view.dispatch({
          changes: { from: this.imgFrom, to: this.imgTo, insert: `![${next}](${url})` },
        });
      }
    });

    wrap.append(img, text, del);
    return wrap;
  }
  // We handle all interaction ourselves; tell CodeMirror to ignore DOM events
  // on the card so they don't also move the caret.
  ignoreEvent() {
    return true;
  }
}

interface ImgRange {
  from: number; // decoration range start (line start if block)
  to: number; // decoration range end (line end if block)
  imgFrom: number; // actual ![..](..) range
  imgTo: number;
  block: boolean;
}

/** Pure scan of the parsed tree → the data-URL image ranges in this doc. */
function scanImageRanges(state: EditorState): ImgRange[] {
  const ranges: ImgRange[] = [];
  syntaxTree(state).iterate({
    enter: (ref) => {
      if (ref.name !== "Image") return;
      const node = ref.node;
      // Peek the first 5 chars of the URL child to decide it's a data URL,
      // without slicing the (possibly huge) whole node.
      const urlNode = node.getChild("URL");
      if (!urlNode || state.doc.sliceString(urlNode.from, urlNode.from + 5) !== "data:") {
        return false;
      }
      // Block widget only when the image sits alone on its line — that's the
      // case that matters (a base64 line would otherwise wrap to ~thousands
      // of px). Inline images get a compact inline card instead.
      const line = state.doc.lineAt(ref.from);
      const before = line.text.slice(0, ref.from - line.from).trim();
      const after = line.text.slice(ref.to - line.from).trim();
      const block = before === "" && after === "";
      ranges.push({
        from: block ? line.from : ref.from,
        to: block ? line.to : ref.to,
        imgFrom: ref.from,
        imgTo: ref.to,
        block,
      });
      return false; // don't descend into the image
    },
  });
  return ranges;
}

/**
 * Resolve the markdown `Image` node whose range contains `pos`, returning its
 * URL span + alt text. Powers right-click save on REMOTE-URL images, which
 * render as plain `![alt](url)` text (no <img>). Data-URL images render as card
 * widgets exposing a real <img>, so the editor's contextmenu handler reads
 * those straight off the DOM and only falls back to this for the text case.
 */
function imageNodeAt(
  state: EditorState,
  pos: number,
): { urlFrom: number; urlTo: number; alt: string } | null {
  let found: { urlFrom: number; urlTo: number; alt: string } | null = null;
  syntaxTree(state).iterate({
    from: pos,
    to: pos,
    enter: (ref) => {
      if (ref.name !== "Image") return;
      const urlNode = ref.node.getChild("URL");
      if (!urlNode) return;
      const full = state.doc.sliceString(ref.from, ref.to);
      const altMatch = /^!\[([\s\S]*)\]\(/.exec(full);
      found = {
        urlFrom: urlNode.from,
        urlTo: urlNode.to,
        alt: altMatch ? altMatch[1] : "",
      };
      return false; // found it — no need to descend into the image's children
    },
  });
  return found;
}

/** Build the decoration set. Block decorations MUST come from a state field,
 *  not a view plugin (CodeMirror throws otherwise), so this is exposed via
 *  `EditorView.decorations.from(imageDecorations)`. */
function buildImageDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of scanImageRanges(state)) {
    builder.add(
      r.from,
      r.to,
      Decoration.replace({
        widget: new ImageCardWidget(r.imgFrom, r.imgTo, r.block),
        block: r.block,
      }),
    );
  }
  return builder.finish();
}

const imageDecorations = StateField.define({
  create(state: EditorState) {
    return buildImageDecorations(state);
  },
  update(value, tr) {
    // Recompute when the text changed or when the lazy syntax parse advanced
    // (reaching previously-unparsed image lines). Pure cursor moves reuse the
    // cached set — viewportChanged lives on ViewUpdate, not Transaction, so we
    // detect parse progress by the tree reference changing instead.
    if (tr.docChanged || syntaxTree(tr.startState) !== syntaxTree(tr.state)) {
      return buildImageDecorations(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/* ── Theme + highlight (token-driven, auto light/dark) ─────────────────── */

const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "var(--foreground)",
      fontSize: "13px",
    },
    "&.cm-editor": { backgroundColor: "transparent" },
    "&.cm-focused": {
      outline: "none",
      // Match the old textarea's focus accent: a 3px primary inset on the left.
      boxShadow: "inset 3px 0 0 var(--primary)",
    },
    ".cm-scroller": { fontFamily: MONO_FONT, lineHeight: "1.7", overflow: "auto" },
    ".cm-content": {
      padding: "18px 22px",
      caretColor: "var(--primary)",
      maxWidth: "100%",
    },
    ".cm-line": { padding: "0" },
    ".cm-gutters": { display: "none" },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--foreground) 4%, transparent)",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklch, var(--primary) 22%, transparent) !important",
    },
    ".cm-foldPlaceholder": {
      color: "var(--muted-foreground)",
      background: "var(--muted)",
      border: "1px solid var(--border)",
      borderRadius: "4px",
      padding: "0 4px",
    },
    ".cm-placeholder": { color: "var(--muted-foreground)", fontStyle: "italic" },
  },
  { dark: false },
);

const mdHighlight = HighlightStyle.define([
  {
    tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    color: "var(--cm-heading)",
    fontWeight: "700",
  },
  { tag: tags.strong, fontWeight: "700", color: "var(--cm-strong)" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--cm-meta)" },
  { tag: tags.link, color: "var(--cm-link)" },
  { tag: tags.url, color: "var(--cm-url)" },
  { tag: tags.monospace, color: "var(--cm-code)" },
  { tag: tags.quote, color: "var(--cm-quote)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--cm-list)" },
  {
    tag: [tags.meta, tags.processingInstruction, tags.contentSeparator],
    color: "var(--cm-meta)",
  },
]);

/** Tab inserts two spaces (matches the old textarea; no tab char / focus jump). */
const insertTwoSpaces = (view: EditorView): boolean => {
  view.dispatch(view.state.replaceSelection("  "));
  return true;
};

/* ── Find/replace match highlighting ──────────────────────────────────────
   CodeMirror's built-in search highlighter only runs while its panel is open
   (`if (!panel …) return Decoration.none`). We replaced the panel with our own
   FindReplaceBar, so that highlighter stays dormant. This ViewPlugin reads the
   live query from the search state and marks matches in the viewport instead,
   using the .cm-searchMatch / .cm-searchMatch-selected styles in globals.css. */
const matchMark = Decoration.mark({ class: "cm-searchMatch" });
const selectedMatchMark = Decoration.mark({ class: "cm-searchMatch-selected" });

const matchHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    constructor(view: EditorView) {
      this.decorations = this.compute(view);
    }
    update(u: ViewUpdate) {
      if (
        getSearchQuery(u.startState) !== getSearchQuery(u.state) ||
        u.docChanged ||
        u.viewportChanged ||
        u.selectionSet
      ) {
        this.decorations = this.compute(u.view);
      }
    }
    compute(view: EditorView): DecorationSet {
      const query = getSearchQuery(view.state);
      if (!query.valid) return Decoration.none;
      const builder = new RangeSetBuilder<Decoration>();
      for (const range of view.visibleRanges) {
        const cursor = query.getCursor(view.state, range.from, range.to);
        for (;;) {
          const step = cursor.next();
          if (step.done) break;
          const selected = view.state.selection.ranges.some(
            (r) => r.from === step.value.from && r.to === step.value.to,
          );
          builder.add(step.value.from, step.value.to, selected ? selectedMatchMark : matchMark);
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations },
);

export function Editor({
  value,
  onChange,
  onToast,
  editorRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onToast?: (msg: string) => void;
  /** Exposes the underlying CodeMirror view (for scroll-sync: `view.scrollDOM`). */
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
}) {
  // Keep the latest callbacks reachable from the (memoized, stable) extension
  // closures without re-creating the editor config on every keystroke.
  const callbacks = useRef({ onChange, onToast });
  callbacks.current = { onChange, onToast };

  // The editor's own view, for the find/replace bar. (`editorRef` still exposes
  // the @uiw wrapper to the page for scroll-sync; this one is Editor-internal.)
  const viewRef = useRef<EditorView | null>(null);
  const [fr, setFr] = useState<{ open: boolean; mode: "find" | "replace" }>({
    open: false,
    mode: "find",
  });
  // Reachable from the (memoized, []) keymap closure without re-creating it.
  const openFindReplace = useRef<(mode: "find" | "replace") => void>(() => {});
  openFindReplace.current = (mode) => setFr({ open: true, mode });
  // The find/replace bar registers its live-update handler here.
  const frCallbacks = useRef<{ onUpdate?: (u: ViewUpdate) => void }>({});

  // Right-click image → shared save menu (same one the preview uses). Card
  // (data-URL) images expose a real <img>; remote-URL images are plain text and
  // are resolved through the syntax tree. Plain browser listener on the wrapper
  // so it fires for both the rendered cards and the text tokens.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [imgMenu, setImgMenu] = useState<ImageMenuState | null>(null);
  const closeImgMenu = useCallback(() => setImgMenu(null), []);
  /** Whether the editor is near the top (controls the back-to-top button). */
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onContextmenu = (e: MouseEvent) => {
      // 1) data-URL image → card widget with a real <img> (.cm-mdimg-thumb)
      const cardImg = (e.target as HTMLElement | null)?.closest?.(
        ".cm-mdimg-thumb",
      ) as HTMLImageElement | null;
      if (cardImg && cardImg.src) {
        e.preventDefault();
        setImgMenu({
          src: cardImg.currentSrc || cardImg.src,
          alt: cardImg.alt || "",
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }
      // 2) remote-URL image → plain text token; resolve the Image node at pos
      const view = viewRef.current;
      if (!view) return;
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos == null) {
        setImgMenu(null);
        return;
      }
      const img = imageNodeAt(view.state, pos);
      if (!img) {
        setImgMenu(null); // not on an image → native menu
        return;
      }
      e.preventDefault();
      setImgMenu({
        src: view.state.doc.sliceString(img.urlFrom, img.urlTo),
        alt: img.alt,
        x: e.clientX,
        y: e.clientY,
      });
    };
    el.addEventListener("contextmenu", onContextmenu);
    return () => el.removeEventListener("contextmenu", onContextmenu);
  }, []);

  // Back-to-top: the scroller is CodeMirror's `.cm-scroller`, a descendant of
  // this wrapper. `scroll` doesn't bubble, but it propagates in the capture
  // phase, so a capture listener on the wrapper catches it — no need to wait
  // for the (async-created) view. The handler reads `view.scrollDOM.scrollTop`
  // at event time, so it works as soon as the view exists; before that it just
  // reports "at top".
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const scroller = viewRef.current?.scrollDOM;
      setAtTop((scroller?.scrollTop ?? 0) < BACK_TO_TOP_THRESHOLD);
    };
    el.addEventListener("scroll", update, true);
    return () => el.removeEventListener("scroll", update, true);
  }, []);
  const scrollToTop = useCallback(() => {
    viewRef.current?.scrollDOM?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const extensions = useMemo(
    () => [
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage }),
      Prec.highest(keymap.of([{ key: "Tab", run: insertTwoSpaces }])),
      // search(): the query state (setSearchQuery/getSearchQuery) + the
      // find/replace commands. Its built-in viewport highlighter is dormant
      // (it only runs while the panel is open, which we never open), so
      // matchHighlighter below does the on-screen highlighting instead.
      // basicSetup's searchKeymap is disabled (it opens the built-in English
      // panel); our keymap drives the custom FindReplaceBar.
      search(),
      matchHighlighter,
      // Forward every editor update to the bar so it can track N live.
      EditorView.updateListener.of((u) => frCallbacks.current.onUpdate?.(u)),
      Prec.highest(
        keymap.of([
          { key: "Mod-f", run: () => { openFindReplace.current("find"); return true; }, preventDefault: true },
          // preventDefault so the browser's reload never fires on Ctrl+R.
          { key: "Mod-r", run: () => { openFindReplace.current("replace"); return true; }, preventDefault: true },
        ]),
      ),
      EditorView.contentAttributes.of({
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Markdown 编辑器",
      }),
      editorTheme,
      syntaxHighlighting(mdHighlight),
      imageDecorations,
      EditorView.domEventHandlers({
        paste: (event, view) => {
          const files = imageFilesFromTransfer(event.clipboardData);
          if (!files.length) return false; // let normal text paste through
          event.preventDefault();
          void ingestImages(view, files, callbacks.current.onToast);
          return true;
        },
        drop: (event, view) => {
          const files = imageFilesFromTransfer(event.dataTransfer);
          if (!files.length) return false;
          event.preventDefault();
          void ingestImages(view, files, callbacks.current.onToast);
          return true;
        },
        dragover: (event) => {
          // preventDefault is required for the subsequent drop to fire.
          if (event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files")) {
            event.preventDefault();
            return true;
          }
          return false;
        },
      }),
    ],
    [],
  );

  return (
    <div
      ref={wrapRef}
      className="cm-app-editor relative min-h-0 flex-1 overflow-hidden bg-background"
    >
      {fr.open && (
        <FindReplaceBar
          viewRef={viewRef}
          mode={fr.mode}
          onClose={() => {
            setFr((f) => ({ ...f, open: false }));
            viewRef.current?.focus();
          }}
          registerOnUpdate={(fn) => {
            frCallbacks.current.onUpdate = fn;
          }}
        />
      )}
      <CodeMirror
        ref={editorRef}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        value={value}
        onChange={(v) => callbacks.current.onChange(v)}
        extensions={extensions}
        theme="none"
        placeholder="在此输入 Markdown，可粘贴或拖入图片…"
        height="100%"
        indentWithTab={false}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLineGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
          // Our FindReplaceBar owns search; drop the built-in panel keymap.
          searchKeymap: false,
          bracketMatching: true,
          closeBrackets: true,
          tabSize: 2,
        }}
        spellCheck={false}
      />
      <ImageContextMenu menu={imgMenu} onClose={closeImgMenu} />
      <BackToTopButton visible={!atTop} onClick={scrollToTop} label="返回编辑器顶部" />
    </div>
  );
}
