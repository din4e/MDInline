declare module "turndown-plugin-gfm" {
  // turndown-plugin-gfm ships no typings; mirror the named plugin exports.
  import type { TurndownService } from "turndown";
  type Plugin = TurndownService.Plugin;
  export const gfm: Plugin;
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
}
