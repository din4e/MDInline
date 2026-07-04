/**
 * Minimal ambient declarations for the globals Wails injects at runtime.
 * The full generated bindings live under frontend/wailsjs at build time.
 */
export {};

declare global {
  interface Window {
    /** Wails injects `window.go` with the Go method bindings. */
    go?: unknown;
    /** Wails runtime helpers. */
    runtime?: unknown;
  }
}
