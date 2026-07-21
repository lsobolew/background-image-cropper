/**
 * Split a CSS value on a separator that appears at the top level only, i.e.
 * ignoring separators nested inside parentheses. Handles the two cases we need:
 * splitting a comma-separated layer list (where `url(a,b)` / `rgba(...)` /
 * `linear-gradient(...)` may contain commas) and splitting a single layer's
 * value into space-separated tokens (where `calc(100% - 10px)` contains spaces).
 */
export function splitTopLevel(value: string, separator: "," | " "): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;

    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);

    const isSep =
      depth === 0 &&
      (separator === "," ? ch === "," : ch === " " || ch === "\t" || ch === "\n");

    if (isSep) {
      if (separator === ",") {
        out.push(current.trim());
        current = "";
      } else if (current.trim() !== "") {
        out.push(current.trim());
        current = "";
      }
      continue;
    }
    current += ch;
  }

  if (current.trim() !== "" || separator === ",") out.push(current.trim());
  return out;
}

/**
 * Per-layer values of the background longhands are comma-separated lists that
 * cycle to match the number of `background-image` layers (CSS background layer
 * rules). This resolves the value for layer `index`.
 */
export function layerValue(list: string[], index: number): string {
  if (list.length === 0) return "";
  return list[index % list.length]!;
}
