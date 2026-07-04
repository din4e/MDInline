/**
 * Picks the native implementation at runtime by detecting the Wails webview
 * (Wails injects `window.go`). One bundle therefore works in both the desktop
 * app and the plain web build — no per-target build flag needed.
 */
import type { Native } from "./types";
import { webNative } from "./web";
import { wailsNative } from "./wails";

export const isWails: boolean =
  typeof window !== "undefined" && Boolean((window as unknown as { go?: unknown }).go);

export const native: Native = isWails ? wailsNative : webNative;

export type { Native } from "./types";
