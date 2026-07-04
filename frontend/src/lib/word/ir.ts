/**
 * Intermediate representation shared by the RTF and DOCX emitters.
 *
 * It is built once from the *already-style-inlined* HTML that `render()`
 * returns (every element carries a concrete `style="…"`), so there is no CSS
 * inheritance to resolve at emit time — each run's style is fully resolved.
 *
 * See `parse.ts` for the DOM-walk that produces a `Doc`.
 */

/** A styled text run. `text` may contain "\n" (from <br> or code newlines). */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  color?: string; // "#RRGGBB"
  highlight?: string; // background-color -> "#RRGGBB"
  fontFamily?: string; // first family name only
  fontSizePx?: number;
  link?: { href: string };
}

export type Align = "left" | "center" | "right" | "justify";

export type ParagraphKind = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "pre" | "hr";

export interface ListInfo {
  type: "bullet" | "ordered";
  level: number;
  number?: number; // 1-based item index for ordered lists
}

export interface QuoteInfo {
  borderColor?: string;
  bg?: string;
  paddingLeftPx?: number;
}

export interface Paragraph {
  kind: ParagraphKind;
  runs: Run[];
  align?: Align;
  marginTopPx?: number;
  marginBottomPx?: number;
  lineHeight?: number;
  list?: ListInfo;
  quote?: QuoteInfo;
}

export interface TableCell {
  runs: Run[];
  align?: Align;
  isHeader?: boolean;
  bg?: string;
}

export interface TableRow {
  cells: TableCell[];
}

export interface Table {
  rows: TableRow[];
}

export interface Image {
  src: string;
  alt?: string;
}

export type Block =
  | { type: "paragraph"; data: Paragraph }
  | { type: "table"; data: Table }
  | { type: "image"; data: Image };

export interface Doc {
  blocks: Block[];
}
