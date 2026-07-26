/**
 * Multi-tab document model — pure types + state-transition helpers with NO React
 * and NO native/IO, so the branching logic (dedup, close-neighbor, migration) is
 * fully unit-testable. The useWorkspace hook (../hooks/useWorkspace.ts) is a thin
 * React wrapper that holds one Workspace in state and calls these helpers.
 */

export type Doc = {
  id: string;
  title: string;
  /** Disk-absolute path so Ctrl+S can save back to the source; null for untitled / imported docs. */
  path: string | null;
  content: string;
  /** True when content changed since the last load/save. */
  dirty: boolean;
};

export type Workspace = { docs: Doc[]; activeId: string };

/** A file to open as a tab. `path` is null for imports (docx/html) and untitled docs. */
export type IncomingDoc = { name: string; path?: string | null; content: string };

export const WORKSPACE_KEY = "mdcss.workspace.v1";
export const LEGACY_MARKDOWN_KEY = "mdcss.markdown";

let counter = 0;
function newId(): string {
  // crypto.randomUUID needs a secure context (localhost + the Wails webview both
  // qualify). Fall back to a monotonic counter elsewhere / during prerender.
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  counter += 1;
  return `doc-${Date.now()}-${counter}`;
}

/** "a.b.md" -> "a.b"; handles full paths; extension-less names pass through. */
export function titleFromFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export function makeDoc(input: {
  title: string;
  content: string;
  path?: string | null;
}): Doc {
  return {
    id: newId(),
    title: input.title,
    path: input.path ?? null,
    content: input.content,
    dirty: false,
  };
}

/** "未命名", then "未命名 2", "未命名 3", … skipping taken titles. */
export function nextUntitledTitle(docs: Doc[]): string {
  const taken = new Set(docs.map((d) => d.title));
  if (!taken.has("未命名")) return "未命名";
  let n = 2;
  while (taken.has(`未命名 ${n}`)) n += 1;
  return `未命名 ${n}`;
}

export function singleUntitledWorkspace(content: string): Workspace {
  const doc = makeDoc({ title: "未命名", content });
  return { docs: [doc], activeId: doc.id };
}

/**
 * Append incoming docs, deduping by absolute path (a pathless doc is always added).
 * The last newly-opened (or switched-to) doc becomes active.
 */
export function addDocs(ws: Workspace, incoming: IncomingDoc[]): Workspace {
  const docs = [...ws.docs];
  let lastId = ws.activeId;
  for (const f of incoming) {
    if (f.path) {
      const existing = docs.find((d) => d.path === f.path);
      if (existing) {
        lastId = existing.id;
        continue;
      }
    }
    const doc = makeDoc({
      title: titleFromFilename(f.name),
      content: f.content,
      path: f.path ?? null,
    });
    docs.push(doc);
    lastId = doc.id;
  }
  return { docs, activeId: lastId };
}

/** New empty untitled tab (becomes active). */
export function addUntitled(ws: Workspace, content = ""): Workspace {
  const doc = makeDoc({ title: nextUntitledTitle(ws.docs), content });
  return { docs: [...ws.docs, doc], activeId: doc.id };
}

/** Remove a doc; pick a neighbor as active; reseed if that was the last one. */
export function closeDoc(ws: Workspace, id: string): Workspace {
  const idx = ws.docs.findIndex((d) => d.id === id);
  if (idx === -1) return ws;
  const docs = ws.docs.filter((d) => d.id !== id);
  if (docs.length === 0) return singleUntitledWorkspace("");
  const activeId =
    id === ws.activeId ? docs[Math.min(idx, docs.length - 1)].id : ws.activeId;
  return { docs, activeId };
}

export function switchTo(ws: Workspace, id: string): Workspace {
  return ws.docs.some((d) => d.id === id) ? { ...ws, activeId: id } : ws;
}

/** Set content; mark dirty only when it actually changed. */
export function updateContent(ws: Workspace, id: string, content: string): Workspace {
  return {
    ...ws,
    docs: ws.docs.map((d) =>
      d.id === id ? { ...d, content, dirty: content !== d.content ? true : d.dirty } : d,
    ),
  };
}

/** Clear dirty; optionally record a path (first save-as of an untitled doc). */
export function markSaved(ws: Workspace, id: string, path?: string): Workspace {
  return {
    ...ws,
    docs: ws.docs.map((d) =>
      d.id === id ? { ...d, dirty: false, path: path ?? d.path } : d,
    ),
  };
}

export function renameTitle(ws: Workspace, id: string, title: string): Workspace {
  return {
    ...ws,
    docs: ws.docs.map((d) => (d.id === id ? { ...d, title } : d)),
  };
}

export function getActiveDoc(ws: Workspace): Doc | undefined {
  return ws.docs.find((d) => d.id === ws.activeId);
}

// --- persistence ---

export function serializeWorkspace(ws: Workspace): string {
  return JSON.stringify(ws);
}

/**
 * Restore a workspace from localStorage. Preference: a valid `mdcss.workspace.v1`
 * blob; else migrate the legacy single-doc `mdcss.markdown` into one untitled tab;
 * else a single untitled tab seeded with `seed` (SAMPLE_MARKDOWN) for new users.
 */
export function deserializeWorkspace(
  raw: string | null,
  legacyMarkdown: string | null,
  seed: string,
): Workspace {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Workspace;
      if (
        parsed &&
        Array.isArray(parsed.docs) &&
        parsed.docs.length > 0 &&
        typeof parsed.activeId === "string"
      ) {
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }
  if (legacyMarkdown != null && legacyMarkdown !== "") {
    return singleUntitledWorkspace(legacyMarkdown);
  }
  return singleUntitledWorkspace(seed);
}
