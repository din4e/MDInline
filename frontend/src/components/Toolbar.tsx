"use client";

import { ChevronDown, Download, FileDown, FileText, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collapseIconBtn, HIDE_LABEL_960 } from "@/components/ui/responsive";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocActions } from "@/hooks/useDocActions";

interface Props {
  actions: DocActions;
}

export function Toolbar({ actions }: Props) {
  const { busy, importFile, exportHtml, exportDocx, exportDoc, exportMd } = actions;

  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-label="文档操作">
      <Button variant="outline" className={collapseIconBtn.default} onClick={importFile} disabled={busy} title="导入 Markdown / Word / HTML（Ctrl/⌘+O）">
        <FileUp />
        <span className={HIDE_LABEL_960}>导入</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={collapseIconBtn.default} disabled={busy} title="导出文档">
            <Download />
            <span className={HIDE_LABEL_960}>导出</span>
            <ChevronDown className="max-[960px]:hidden" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportMd} disabled={busy}>
            <FileDown />
            Markdown（.md）
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportHtml} disabled={busy}>
            HTML（.html）
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportDocx} disabled={busy}>
            <FileText />
            Word（.docx）
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportDoc} disabled={busy}>
            <FileDown />
            Word 97-2003（.doc）
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
