"use client";

import { useCallback, useState } from "react";
import { buildExportDoc, render } from "@/lib/pipeline";
import type { ThemeConfig } from "@/lib/theme";
import { buildWordDoc, inlinedHtmlToRtf } from "@/lib/word";
import { native } from "@/native";

interface Args {
  markdown: string;
  theme: ThemeConfig;
  onImportMd: (content: string, name: string) => void;
  onToast: (msg: string) => void;
}

export interface DocActions {
  busy: boolean;
  copyHtml: () => void;
  copyWord: () => void;
  exportHtml: () => void;
  exportDocx: () => void;
  exportDoc: () => void;
  exportMd: () => void;
  importFile: () => void;
}

/**
 * The toolbar document actions, factored out so they can be triggered both by
 * buttons (Toolbar) and by global keyboard shortcuts (page). Re-renders the
 * markdown → inlined HTML on demand, so it always reflects the latest content.
 */
export function useDocActions({ markdown, theme, onImportMd, onToast }: Args): DocActions {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } catch (e) {
        onToast(`操作失败:${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [onToast]
  );

  const copyHtml = useCallback(() => {
    void run(async () => {
      // Inlined HTML: every element already carries its inline styles, so it
      // pastes directly into the 公众号 editor with fonts/colors intact.
      const { inlined } = render({ markdown, theme });
      await native.copyWeChatHTML(inlined);
      onToast("已复制,可直接粘贴到公众号编辑器");
    });
  }, [run, markdown, theme, onToast]);

  const copyWord = useCallback(() => {
    void run(async () => {
      // RTF gives the highest fidelity into Word/WPS. The inlined HTML rides
      // along as a web fallback (browsers can't reliably write text/rtf).
      const { inlined } = render({ markdown, theme });
      const rtf = inlinedHtmlToRtf(inlined);
      await native.copyRTF(rtf, inlined);
      onToast("已复制,可粘贴到 Word / WPS");
    });
  }, [run, markdown, theme, onToast]);

  const exportHtml = useCallback(() => {
    void run(async () => {
      const inlined = render({ markdown, theme }).inlined;
      await native.saveText(buildExportDoc(inlined, "导出"), "article.html", "text/html");
      onToast("HTML 已导出");
    });
  }, [run, markdown, theme, onToast]);

  const exportDocx = useCallback(() => {
    void run(async () => {
      const inlined = render({ markdown, theme }).inlined;
      // Dynamic import: the `docx` library (~900 KB gzip) is only fetched when
      // the user actually exports .docx, keeping the initial page load light.
      const { inlinedHtmlToDocx } = await import("@/lib/word/docx");
      const bytes = await inlinedHtmlToDocx(inlined);
      await native.saveBytes(bytes, "article.docx");
      onToast("Word(.docx)已导出");
    });
  }, [run, markdown, theme, onToast]);

  const exportDoc = useCallback(() => {
    void run(async () => {
      const inlined = render({ markdown, theme }).inlined;
      // Word-HTML saved with a .doc extension; Word/WPS open it as a document.
      await native.saveText(buildWordDoc(inlined), "article.doc", "application/msword");
      onToast("Word(.doc)已导出(个别 Word 首次打开会提示格式,点「是」即可)");
    });
  }, [run, markdown, theme, onToast]);

  const exportMd = useCallback(() => {
    void run(async () => {
      await native.saveText(markdown, "article.md", "text/markdown");
      onToast("Markdown 已导出");
    });
  }, [run, markdown, onToast]);

  const importFile = useCallback(() => {
    void run(async () => {
      const res = await native.openBytes(".md,.markdown,.docx,.doc,.html,.htm,.txt,text/markdown,text/html");
      if (!res) return; // cancelled
      // Lazy-load the import module so turndown/mammoth stay out of the bundle
      // until the user actually imports something.
      const { fileToMarkdown } = await import("@/lib/import");
      const md = await fileToMarkdown(res.name, res.bytes);
      if (!md.trim()) {
        onToast("未识别到可导入的内容");
        return;
      }
      onImportMd(md, res.name);
      onToast(`已导入 ${res.name}`);
    });
  }, [run, onImportMd, onToast]);

  return { busy, copyHtml, copyWord, exportHtml, exportDocx, exportDoc, exportMd, importFile };
}
