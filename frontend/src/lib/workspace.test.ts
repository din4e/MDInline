import { describe, it, expect } from "vitest";
import {
  addDocs,
  addUntitled,
  closeDoc,
  switchTo,
  updateContent,
  markSaved,
  renameTitle,
  nextUntitledTitle,
  titleFromFilename,
  singleUntitledWorkspace,
  deserializeWorkspace,
  getActiveDoc,
  type IncomingDoc,
} from "./workspace";

describe("titleFromFilename", () => {
  it("strips the last extension", () => {
    expect(titleFromFilename("a.md")).toBe("a");
    expect(titleFromFilename("a.b.markdown")).toBe("a.b");
  });
  it("keeps names without extension", () => {
    expect(titleFromFilename("README")).toBe("README");
  });
  it("handles a full path", () => {
    expect(titleFromFilename("C:\\dir\\sub\\y.md")).toBe("y");
    expect(titleFromFilename("dir/sub/z.markdown")).toBe("z");
  });
});

describe("nextUntitledTitle", () => {
  it("starts at 未命名", () => {
    expect(nextUntitledTitle([])).toBe("未命名");
  });
  it("increments past taken numbers", () => {
    expect(nextUntitledTitle([{ title: "未命名" } as any])).toBe("未命名 2");
    expect(
      nextUntitledTitle([{ title: "未命名" } as any, { title: "未命名 2" } as any]),
    ).toBe("未命名 3");
  });
});

describe("addDocs", () => {
  it("appends pathless docs and activates the last", () => {
    const start = singleUntitledWorkspace("seed");
    const next = addDocs(start, [
      { name: "a.md", content: "A" },
      { name: "b.md", content: "B" },
    ] as IncomingDoc[]);
    expect(next.docs.length).toBe(3);
    const active = getActiveDoc(next)!;
    expect(active.content).toBe("B");
  });

  it("dedups by path: switches to existing instead of re-opening", () => {
    const start = addDocs(singleUntitledWorkspace(""), [
      { name: "a.md", path: "/abs/a.md", content: "A" },
    ] as IncomingDoc[]);
    const before = start.docs.length;
    const next = addDocs(start, [
      { name: "a.md", path: "/abs/a.md", content: "CHANGED" },
    ] as IncomingDoc[]);
    expect(next.docs.length).toBe(before); // not re-added
    const active = getActiveDoc(next)!;
    expect(active.path).toBe("/abs/a.md");
    expect(active.content).toBe("A"); // existing content preserved
  });
});

describe("closeDoc", () => {
  it("removes the doc and keeps a sibling active", () => {
    const ws = addDocs(singleUntitledWorkspace(""), [
      { name: "a.md", content: "A" },
      { name: "b.md", content: "B" },
    ] as IncomingDoc[]);
    const aId = ws.docs[1].id;
    const next = closeDoc(ws, aId);
    expect(next.docs.find((d) => d.id === aId)).toBeUndefined();
    expect(getActiveDoc(next)).toBeDefined();
  });
  it("reseeds an untitled doc when the last one closes", () => {
    const ws = singleUntitledWorkspace("only");
    const id = ws.docs[0].id;
    const next = closeDoc(ws, id);
    expect(next.docs.length).toBe(1);
    expect(next.docs[0].dirty).toBe(false);
  });
});

describe("updateContent / markSaved", () => {
  it("updateContent marks dirty only when content changes", () => {
    const ws = addDocs(singleUntitledWorkspace(""), [{ name: "a.md", content: "A" }] as IncomingDoc[]);
    const id = ws.docs[1].id;
    expect(updateContent(ws, id, "A").docs[1].dirty).toBe(false); // same -> stays clean
    expect(updateContent(ws, id, "A2").docs[1].dirty).toBe(true); // changed -> dirty
  });
  it("markSaved clears dirty and records path", () => {
    let ws = addDocs(singleUntitledWorkspace(""), [{ name: "a.md", content: "A" }] as IncomingDoc[]);
    const id = ws.docs[1].id;
    ws = updateContent(ws, id, "A2");
    ws = markSaved(ws, id, "/abs/a.md");
    expect(ws.docs[1].dirty).toBe(false);
    expect(ws.docs[1].path).toBe("/abs/a.md");
  });
});

describe("deserializeWorkspace", () => {
  const seed = "SAMPLE";
  it("parses a valid persisted workspace", () => {
    const valid = JSON.stringify({
      docs: [{ id: "x", title: "t", path: null, content: "c", dirty: false }],
      activeId: "x",
    });
    const ws = deserializeWorkspace(valid, null, seed);
    expect(ws.docs[0].id).toBe("x");
  });
  it("migrates from the legacy single-doc key", () => {
    const ws = deserializeWorkspace(null, "LEGACY", seed);
    expect(ws.docs.length).toBe(1);
    expect(ws.docs[0].content).toBe("LEGACY");
    expect(ws.docs[0].path).toBeNull();
  });
  it("falls back to the seed for a brand-new user", () => {
    const ws = deserializeWorkspace(null, null, seed);
    expect(ws.docs[0].content).toBe(seed);
  });
});

describe("switchTo / renameTitle / addUntitled", () => {
  it("switchTo only changes activeId when the id exists", () => {
    const ws = addDocs(singleUntitledWorkspace(""), [{ name: "a.md", content: "A" }] as IncomingDoc[]);
    const aId = ws.docs[1].id;
    expect(switchTo(ws, aId).activeId).toBe(aId);
    expect(switchTo(ws, "nope")).toBe(ws);
  });
  it("renameTitle updates the title", () => {
    const ws = singleUntitledWorkspace("x");
    const id = ws.docs[0].id;
    expect(renameTitle(ws, id, "renamed").docs[0].title).toBe("renamed");
  });
  it("addUntitled creates an empty doc with a fresh name", () => {
    const ws = addUntitled(singleUntitledWorkspace("x"));
    expect(ws.docs.length).toBe(2);
    expect(getActiveDoc(ws)!.content).toBe("");
  });
});
