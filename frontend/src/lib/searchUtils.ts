import type { EditorState } from "@codemirror/state";
import { SearchQuery } from "@codemirror/search";

/** A match range (document offsets). */
export interface Match {
  from: number;
  to: number;
}

/**
 * Hard cap on how many matches we count. A short query ("a", ".") on a large
 * article can produce tens of thousands of matches and make the full-doc scan
 * jank the UI, so we stop early. The on-screen highlights are already capped to
 * the viewport by the search extension; only the N/M counter scans the whole
 * doc, and a precise count past this point isn't worth it.
 */
export const MATCH_CAP = 2000;

export interface MatchResult {
  matches: Match[];
  capped: boolean;
}

/**
 * Collect every match of `query` across the whole document (optionally capped).
 *
 * Uses `SearchQuery.getCursor`, which honours case-sensitive / whole-word /
 * regexp / literal automatically — the same rules the on-screen highlights use,
 * so the count and the highlights always agree on *what* counts as a match.
 * (The highlights only cover the viewport; this scans the entire doc, which is
 * why the two can describe different ranges — that's expected.)
 */
export function findAllMatches(state: EditorState, query: SearchQuery): MatchResult {
  if (!query.valid) return { matches: [], capped: false };
  const matches: Match[] = [];
  const cursor = query.getCursor(state);
  // The cursor's declared type is Iterator (not IterableIterator), so drive it
  // manually rather than with for…of (which the type checker rejects).
  for (;;) {
    const step = cursor.next();
    if (step.done) break;
    matches.push({ from: step.value.from, to: step.value.to });
    if (matches.length >= MATCH_CAP) return { matches, capped: true };
  }
  return { matches, capped: false };
}

/**
 * 0-based index of the match `pos` sits on, or the match just before it. -1
 * when `pos` precedes the first match (no current match). Used to drive the "N"
 * in N/M as the caret / selection moves.
 */
export function indexOfMatch(matches: Match[], pos: number): number {
  let lo = 0;
  let hi = matches.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (matches[mid].to < pos) lo = mid + 1;
    else hi = mid;
  }
  // lo = first match whose `to` is >= pos. If pos is inside it, that's current;
  // otherwise pos sits in a gap and we report the match just passed.
  if (lo < matches.length && matches[lo].from <= pos) return lo;
  return lo - 1;
}
