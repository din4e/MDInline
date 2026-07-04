"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Download, Ellipsis, FileUp, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { collapseIconBtn, HIDE_LABEL_960 } from "@/components/ui/responsive";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRESETS, cloneTheme, mergeTheme, type ThemeConfig } from "@/lib/theme";
import {
  addLibraryTheme,
  loadLibrary,
  removeLibraryTheme,
  renameLibraryTheme,
  updateLibraryTheme,
  type LibraryTheme,
} from "@/lib/themeStore";
import { native } from "@/native";

interface Props {
  theme: ThemeConfig;
  onApplyTheme: (theme: ThemeConfig) => void;
  onToast: (message: string) => void;
  /** Optional node rendered between the selects and the "更多主题操作" menu —
   *  lets the header place 模板市场 ahead of that menu without forking state. */
  children?: React.ReactNode;
}

export function ThemeBar({ theme, onApplyTheme, onToast, children }: Props) {
  const [library, setLibrary] = useState<LibraryTheme[]>([]);
  /** 当前下拉选中值:""(无/外部主题) | `p:${presetKey}` | `l:${libraryId}`。 */
  const [selected, setSelected] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [themeName, setThemeName] = useState("");

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  // 统一处理下拉选择:`p:` 前缀 → 预设,`l:` 前缀 → 主题库。
  const pickTheme = (val: string) => {
    setSelected(val);
    if (val.startsWith("p:")) {
      const preset = PRESETS.find((item) => item.key === val.slice(2));
      if (preset) onApplyTheme(cloneTheme(preset.theme));
    } else if (val.startsWith("l:")) {
      const item = library.find((entry) => entry.id === val.slice(2));
      if (item) onApplyTheme(cloneTheme(item.theme));
    }
  };

  const openSaveDialog = () => {
    setThemeName(theme.meta.name || "我的主题");
    setSaveOpen(true);
  };

  const saveCurrent = () => {
    const name = themeName.trim();
    if (!name) return;
    const nextTheme = cloneTheme(theme);
    nextTheme.meta = { ...nextTheme.meta, name };
    setLibrary(addLibraryTheme(nextTheme));
    setSaveOpen(false);
    onToast(`已保存主题「${name}」到主题库`);
  };

  const exportTheme = async () => {
    const fileName = `${(theme.meta.name || "theme").replace(/[\\/:*?"<>|]/g, "_")}.mdcss-theme.json`;
    await native.saveText(JSON.stringify(theme, null, 2), fileName, "application/json");
    onToast("主题已导出");
  };

  const importTheme = async () => {
    const result = await native.openText(".json,application/json");
    if (!result) return;
    try {
      const parsed = JSON.parse(result.content) as Partial<ThemeConfig>;
      const merged = mergeTheme(parsed);
      merged.meta = { ...merged.meta, name: parsed.meta?.name || result.name.replace(/\.json$/i, "") };
      onApplyTheme(merged);
      setLibrary(addLibraryTheme(merged));
      onToast("主题已导入并应用");
    } catch {
      onToast("导入失败：文件不是有效的主题 JSON");
    }
  };

  const deleteSelected = () => {
    if (!selected.startsWith("l:")) return;
    const id = selected.slice(2);
    setLibrary(removeLibraryTheme(id));
    setSelected("");
    setDeleteOpen(false);
    onToast("已从主题库删除");
  };

  const openRenameDialog = () => {
    if (!selected.startsWith("l:")) return;
    const item = library.find((entry) => entry.id === selected.slice(2));
    setThemeName(item?.theme.meta.name || "我的主题");
    setRenameOpen(true);
  };

  const renameSelected = () => {
    if (!selected.startsWith("l:")) return;
    const name = themeName.trim();
    if (!name) return;
    setLibrary(renameLibraryTheme(selected.slice(2), name));
    setRenameOpen(false);
    onToast(`已重命名为「${name}」`);
  };

  const overwriteSelected = () => {
    if (!selected.startsWith("l:")) return;
    setLibrary(updateLibraryTheme(selected.slice(2), cloneTheme(theme)));
    onToast("已用当前样式覆盖所选主题");
  };

  const librarySelected = selected.startsWith("l:");

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5" aria-label="主题操作">
        <span className="text-[11px] font-semibold text-muted-foreground max-[720px]:hidden">主题</span>
        <Select value={selected || undefined} onValueChange={pickTheme}>
          <SelectTrigger className="w-[150px]" aria-label="选择主题">
            <SelectValue placeholder={theme.meta.name || "选择主题"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>预设主题</SelectLabel>
              {PRESETS.map((preset) => (
                <SelectItem key={preset.key} value={`p:${preset.key}`}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>我的主题{library.length > 0 ? ` (${library.length})` : ""}</SelectLabel>
              {library.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">暂无，点右侧「保存主题」</p>
              ) : (
                library.map((item) => (
                  <SelectItem key={item.id} value={`l:${item.id}`}>
                    {item.theme.meta.name || "未命名"}
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>

        {children}

        <Button variant="outline" className={collapseIconBtn.default} onClick={openSaveDialog} title="保存当前主题到主题库">
          <BookmarkPlus />
          <span className={HIDE_LABEL_960}>保存主题</span>
        </Button>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="更多主题操作">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>更多主题操作</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={importTheme}>
              <FileUp />
              导入主题
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={exportTheme}>
              <Download />
              导出主题
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!librarySelected} onSelect={openRenameDialog}>
              <Pencil />
              重命名所选主题
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!librarySelected} onSelect={overwriteSelected}>
              <RefreshCw />
              用当前主题覆盖
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={!librarySelected}
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 />
              删除所选主题
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存当前主题</DialogTitle>
            <DialogDescription>保存后可从“我的主题”中快速重新应用。</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveCurrent();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="theme-name">主题名称</Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>取消</Button>
              <Button type="submit" disabled={!themeName.trim()}>保存主题</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名主题</DialogTitle>
            <DialogDescription>修改主题库中该主题的名称，内容不变。</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              renameSelected();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="theme-rename">主题名称</Label>
              <Input
                id="theme-rename"
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>取消</Button>
              <Button type="submit" disabled={!themeName.trim()}>重命名</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除所选主题？</AlertDialogTitle>
            <AlertDialogDescription>该操作只会删除主题库中的副本，无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteSelected}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
