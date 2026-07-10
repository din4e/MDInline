"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import {
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import {
  ArrowDown,
  ArrowUp,
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  Regex,
  Replace,
  Search,
  WholeWord,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { findAllMatches, indexOfMatch, type Match } from "@/lib/searchUtils";

/** A CodeMirror command: run against a view, return whether it did anything. */
type CMCommand = (view: EditorView) => boolean;

/**
 * A custom find/replace bar that replaces CodeMirror's built-in (English) panel.
 *
 * The query lives here as React state and is pushed into the editor via
 * `setSearchQuery`, which drives the in-viewport match highlighting. We re-scan
 * the whole document ourselves to get an N/M count (the search extension only
 * highlights the viewport and exposes no total). All actions call the standard
 * search commands, which never fall back to the built-in panel because every
 * action is disabled / guarded while the query is empty (`!query.valid`).
 */
export function FindReplaceBar({
  viewRef,
  mode,
  onClose,
  registerOnUpdate,
}: {
  viewRef: React.RefObject<EditorView | null>;
  /** Editor-controlled focus hint: "replace" expands the replace row + focuses it. */
  mode: "find" | "replace";
  onClose: () => void;
  /** Register/clear a callback fired on every editor update (live N tracking). */
  registerOnUpdate: (fn: ((u: ViewUpdate) => void) | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatchesState] = useState<Match[]>([]);
  const [capped, setCapped] = useState(false);
  const [current, setCurrent] = useState(-1);

  // Latest matches, reachable from the (stable) update callback without re-binding.
  const matchesRef = useRef<Match[]>([]);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  /** Recompute the match list, cap flag, and current index from a doc position. */
  const commitMatches = useCallback((m: Match[], cap: boolean, head: number) => {
    matchesRef.current = m;
    setMatchesState(m);
    setCapped(cap);
    setCurrent(indexOfMatch(m, head));
  }, []);

  // Push the query into the editor (→ highlights) and re-count, debounced.
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const query = new SearchQuery({ search, caseSensitive, regexp, wholeWord, replace });
    v.dispatch({ effects: setSearchQuery.of(query) });
    const t = window.setTimeout(() => {
      const { matches: m, capped } = findAllMatches(v.state, query);
      commitMatches(m, capped, v.state.selection.main.head);
    }, 120);
    return () => window.clearTimeout(t);
  }, [search, caseSensitive, regexp, wholeWord, replace, viewRef, commitMatches]);

  // Live updates from the editor: a doc edit re-scans; a cursor move updates N.
  const onUpdate = useCallback(
    (u: ViewUpdate) => {
      const v = viewRef.current;
      if (!v) return;
      if (u.docChanged) {
        const { matches: m, capped } = findAllMatches(v.state, getSearchQuery(v.state));
        commitMatches(m, capped, v.state.selection.main.head);
      } else if (u.selectionSet) {
        setCurrent(indexOfMatch(matchesRef.current, u.state.selection.main.head));
      }
    },
    [viewRef, commitMatches],
  );

  useEffect(() => {
    registerOnUpdate(onUpdate);
    return () => registerOnUpdate(undefined);
  }, [onUpdate, registerOnUpdate]);

  // Focus the right field on open and when the mode flips (Ctrl+R while open).
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      if (mode === "replace") {
        setShowReplace(true);
        replaceInputRef.current?.focus();
      } else {
        findInputRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(t);
  }, [mode]);

  /** Run a search command, but only when the query is valid (never the panel). */
  const runCmd = (cmd: CMCommand) => {
    const v = viewRef.current;
    if (!v || !getSearchQuery(v.state).valid) return;
    cmd(v);
  };

  const onFindKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCmd(e.shiftKey ? findPrevious : findNext);
    }
  };
  const onReplaceKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCmd(replaceNext);
    }
  };

  // Ctrl/Cmd+F and Ctrl/Cmd+R inside the bar (focus is in our inputs, so the
  // editor's keymap doesn't see them). Intercept so Ctrl+R never reloads the
  // page: F re-focuses find, R expands + focuses the replace field.
  const onRootKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k !== "f" && k !== "r") return;
    e.preventDefault();
    if (k === "r") {
      setShowReplace(true);
      requestAnimationFrame(() => replaceInputRef.current?.focus());
    } else {
      findInputRef.current?.focus();
    }
  };

  const hasQuery = search.length > 0;
  const total = matches.length;
  const n = current >= 0 ? current + 1 : 0;
  let countText: string;
  let countTone: string;
  if (!hasQuery) {
    countText = "查找";
    countTone = "text-muted-foreground/60";
  } else if (total === 0) {
    countText = "无结果";
    countTone = "text-destructive";
  } else {
    countText = capped ? `${n} />2000` : `${n}/${total}`;
    countTone = "text-muted-foreground";
  }

  return (
    <TooltipProvider>
      <div className="fr-bar shrink-0 border-b border-border bg-background text-sm" onKeyDown={onRootKey}>
        {/* Find row */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Toggle
            size="sm"
            pressed={showReplace}
            onPressedChange={setShowReplace}
            aria-label={showReplace ? "收起替换" : "展开替换"}
            className="text-muted-foreground"
          >
            {showReplace ? <ChevronDown /> : <ChevronUp />}
          </Toggle>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={findInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onFindKey}
              placeholder="查找"
              aria-label="查找"
              className="h-7 rounded-md border-transparent bg-muted/60 pl-7 pr-2 focus-visible:bg-background"
            />
          </div>

          <OptToggle pressed={caseSensitive} onPressedChange={setCaseSensitive} label="区分大小写 (Alt+C)">
            <CaseSensitive />
          </OptToggle>
          <OptToggle pressed={regexp} onPressedChange={setRegexp} label="正则表达式 (.*)">
            <Regex />
          </OptToggle>
          <OptToggle pressed={wholeWord} onPressedChange={setWholeWord} label="全词匹配 (Alt+W)">
            <WholeWord />
          </OptToggle>

          <span className={cn("min-w-[3rem] shrink-0 text-center text-xs tabular-nums", countTone)}>
            {countText}
          </span>

          <IconBtn label="上一个 (Shift+Enter)" onClick={() => runCmd(findPrevious)} disabled={!hasQuery || total === 0}>
            <ArrowUp />
          </IconBtn>
          <IconBtn label="下一个 (Enter)" onClick={() => runCmd(findNext)} disabled={!hasQuery || total === 0}>
            <ArrowDown />
          </IconBtn>
          <IconBtn label="关闭 (Esc)" onClick={onClose}>
            <X />
          </IconBtn>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5">
            <span className="size-7 shrink-0" aria-hidden />
            <div className="relative min-w-0 flex-1">
              <Replace className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={replaceInputRef}
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                onKeyDown={onReplaceKey}
                placeholder="替换为"
                aria-label="替换为"
                className="h-7 rounded-md border-transparent bg-muted/60 pl-7 pr-2 focus-visible:bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasQuery || total === 0}
              onClick={() => runCmd(replaceNext)}
              title="替换当前匹配 (Enter)"
            >
              替换
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasQuery || total === 0}
              onClick={() => runCmd(replaceAll)}
              title="替换全部匹配"
            >
              全部替换
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/** A search-option toggle (Aa / .* / W) with a tooltip and primary "on" tint. */
function OptToggle({
  pressed,
  onPressedChange,
  label,
  children,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={pressed}
          onPressedChange={onPressedChange}
          aria-label={label}
          className="text-muted-foreground data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** A small icon-only ghost button with a tooltip. */
function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
