"use client";

import { useEffect, useRef } from "react";

export interface KeyCombo {
  /** Lowercase key, e.g. "s", "c", "e", "o", "/" (use "key", not "code"). */
  key: string;
  /** Require Ctrl (Win/Linux) or Cmd (Mac). Defaults to true. */
  mod?: boolean;
  /** Require Shift. Defaults to false. */
  shift?: boolean;
}

/**
 * Register a global keyboard shortcut. `handler` is read through a ref so the
 * listener is attached once per combo and always sees the latest closure
 * (no stale state, no re-subscribes on every render).
 *
 * The browser default is suppressed only when the combo actually matches, so
 * unrelated key presses are unaffected.
 */
export function useHotkey(combo: KeyCombo, handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;

  const wantMod = combo.mod ?? true;
  const wantShift = !!combo.shift;
  const key = combo.key.toLowerCase();

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const hasMod = e.ctrlKey || e.metaKey;
      if (wantMod !== hasMod) return;
      if (wantShift !== e.shiftKey) return;
      if (e.key.toLowerCase() !== key) return;
      e.preventDefault();
      ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, wantMod, wantShift, key]);
}
