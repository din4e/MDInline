/**
 * DOCX emitter via the `docx` library (browser-safe; Packer.toBlob -> Uint8Array).
 *
 * Three verified gotchas honored:
 *  1. Background colors use `shading: { type: CLEAR, color: "auto", fill }` —
 *     `TextRun.highlight` only accepts a fixed enum, and `SOLID` renders black.
 *  2. No `heading: HeadingLevel.*` (needs a defined Heading style) — heading
 *     size/bold/color come straight from the already-inlined run styles.
 *  3. No `numbering` config — list markers are literal ("•  " / "N.  ").
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from "docx";
import type { Align, Block, Doc, Paragraph as IRParagraph, Run, Table as IRTable, TableCell as IRCell } from "./ir";
import { parseInlinedHtml } from "./parse";

const ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const pxToTwip = (px: number) => Math.round(px * 15);
const pxToHalfPt = (px: number) => Math.round(px * 2);

export async function docToDocx(doc: Doc): Promise<Uint8Array> {
  const children = doc.blocks.map(blockToDocx);
  const document = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(document);
  return new Uint8Array(await blob.arrayBuffer());
}

function blockToDocx(block: Block): Paragraph | Table {
  if (block.type === "table") return tableToTable(block.data);
  if (block.type === "image") {
    return new Paragraph({
      children: [new TextRun({ text: `[${block.data.alt || "图片"}]`, italics: true, color: "999999" })],
    });
  }
  return paragraphToDocx(block.data);
}

function paragraphToDocx(p: IRParagraph): Paragraph {
  if (p.kind === "hr") {
    return new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } },
      children: [],
    });
  }

  const children: (TextRun | ExternalHyperlink)[] = [];

  // List marker (literal), sized to match content where possible.
  if (p.list && p.runs.length) {
    const baseSize = p.runs.find((r) => r.fontSizePx)?.fontSizePx;
    const marker = p.list.type === "bullet" ? "•  " : `${p.list.number ?? 1}.  `;
    children.push(new TextRun({ text: marker, size: baseSize ? pxToHalfPt(baseSize) : undefined }));
  }
  for (const r of p.runs) children.push(...runToNodes(r));

  const before = p.marginTopPx != null ? pxToTwip(p.marginTopPx) : undefined;
  const after = p.marginBottomPx != null ? pxToTwip(p.marginBottomPx) : undefined;
  const line = p.lineHeight ? Math.round(p.lineHeight * 240) : undefined;
  const spacing =
    p.kind === "pre"
      ? { before: before ?? 120, after: after ?? 120, line }
      : before != null || after != null || line != null
        ? { before, after, line }
        : undefined;

  const indent = p.list
    ? { left: (p.list.level + 1) * 360, hanging: 360 }
    : p.quote
      ? { left: 360 }
      : undefined;

  const border =
    p.quote && p.quote.borderColor
      ? { left: { style: BorderStyle.SINGLE, size: 24, color: p.quote.borderColor.slice(1), space: 8 } }
      : undefined;

  const shading = p.quote?.bg
    ? { type: ShadingType.CLEAR, color: "auto", fill: p.quote.bg.slice(1) }
    : undefined;

  return new Paragraph({
    children,
    alignment: p.align ? ALIGN[p.align] : undefined,
    spacing,
    indent,
    border,
    shading,
  });
}

function runToNodes(r: Run): (TextRun | ExternalHyperlink)[] {
  const opts = runOpts(r);
  const parts = r.text.split("\n");
  const runs: TextRun[] = parts.map((part, i) =>
    new TextRun({ ...opts, text: part, break: i > 0 ? 1 : undefined })
  );
  if (r.link) return [new ExternalHyperlink({ link: r.link.href, children: runs })];
  return runs;
}

function runOpts(r: Run) {
  return {
    bold: r.bold || undefined,
    italics: r.italic || undefined,
    strike: r.strike || undefined,
    underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
    color: r.color ? r.color.slice(1) : undefined,
    size: r.fontSizePx ? pxToHalfPt(r.fontSizePx) : undefined,
    font: r.fontFamily || undefined,
    shading: r.highlight ? { type: ShadingType.CLEAR, color: "auto", fill: r.highlight.slice(1) } : undefined,
  };
}

function tableToTable(table: IRTable): Table {
  const rows = table.rows.map(
    (row) =>
      new TableRow({
        tableHeader: row.cells.some((c) => c.isHeader),
        children: row.cells.map((cell) => cellToTableCell(cell)),
      })
  );
  return new Table({ rows, width: { size: 9000, type: WidthType.DXA } });
}

function cellToTableCell(cell: IRCell): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: cell.runs.flatMap((r) => runToNodes(cell.isHeader ? { ...r, bold: true } : r)),
        alignment: cell.align ? ALIGN[cell.align] : undefined,
      }),
    ],
    shading: cell.bg ? { type: ShadingType.CLEAR, color: "auto", fill: cell.bg.slice(1) } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
    },
  });
}

/**
 * Inlined HTML -> .docx bytes. This module is the `docx` library's only import
 * site, so it is loaded lazily (dynamic import) from useDocActions — keeping the
 * ~900 KB-gzip docx lib out of the initial bundle until the user exports .docx.
 */
export async function inlinedHtmlToDocx(html: string): Promise<Uint8Array> {
  return docToDocx(parseInlinedHtml(html));
}
