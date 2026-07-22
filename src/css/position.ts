import { parseLength, type LinearLength } from "./length.ts";

/**
 * Resolve one axis of `background-position` to the offset, in CSS pixels, of the
 * image's top/left edge from the positioning area's top/left edge.
 *
 * A percentage in background-position resolves against `(area - image)` — it
 * aligns the same relative point of the image and the area — while a length is a
 * raw offset. The `calc(100% - 10px)` form emitted by the 3-/4-value edge
 * syntax combines both, so the general formula is `percent·(area−image) + px`.
 */
export function resolvePositionAxis(
  token: string,
  areaSize: number,
  imageSize: number,
): number {
  const len = keywordToLength(token) ?? parseLength(token);
  if (!len) return 0;
  return len.percent * (areaSize - imageSize) + len.px;
}

function keywordToLength(token: string): LinearLength | null {
  switch (token.trim().toLowerCase()) {
    case "left":
    case "top":
      return { px: 0, percent: 0 };
    case "center":
      return { px: 0, percent: 0.5 };
    case "right":
    case "bottom":
      return { px: 0, percent: 1 };
    default:
      return null;
  }
}
