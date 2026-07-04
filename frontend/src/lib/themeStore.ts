"use client";

import type { ThemeConfig } from "./theme";

/**
 * Pluggable theme library — saved themes live in localStorage and can be
 * exported/imported as `.mdcss-theme.json` files (the "plugin" format).
 */
const LIB_KEY = "mdcss.themeLibrary.v1";

export interface LibraryTheme {
  id: string;
  theme: ThemeConfig;
}

export function loadLibrary(): LibraryTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIB_KEY);
    return raw ? (JSON.parse(raw) as LibraryTheme[]) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(lib: LibraryTheme[]): void {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

export function addLibraryTheme(theme: ThemeConfig): LibraryTheme[] {
  const lib = loadLibrary();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  lib.unshift({ id, theme });
  saveLibrary(lib);
  return lib;
}

export function removeLibraryTheme(id: string): LibraryTheme[] {
  const lib = loadLibrary().filter((t) => t.id !== id);
  saveLibrary(lib);
  return lib;
}

/** Rename a saved theme in place (keeps its content, changes meta.name). */
export function renameLibraryTheme(id: string, name: string): LibraryTheme[] {
  const lib = loadLibrary();
  const item = lib.find((t) => t.id === id);
  if (item) {
    item.theme.meta = { ...item.theme.meta, name };
    saveLibrary(lib);
  }
  return lib;
}

/** Overwrite a saved theme's content with the given theme (keeps its id). */
export function updateLibraryTheme(id: string, theme: ThemeConfig): LibraryTheme[] {
  const lib = loadLibrary();
  const item = lib.find((t) => t.id === id);
  if (item) {
    item.theme = theme;
    saveLibrary(lib);
  }
  return lib;
}
