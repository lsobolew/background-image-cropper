import type { Size } from "../types.ts";
import { parseLength, resolveLength } from "./length.ts";
import { splitTopLevel } from "./split.ts";

/**
 * Resolve `background-size` for one layer into the rendered image size in CSS
 * pixels, following the CSS Backgrounds sizing algorithm.
 *
 * @param value    Computed `background-size` for the layer (e.g. `"cover"`,
 *                 `"50% 100%"`, `"200px auto"`).
 * @param area     The background positioning area size.
 * @param natural  Intrinsic image size, or `null` when unknown.
 */
export function resolveBackgroundSize(
  value: string,
  area: Size,
  natural: Size | null,
): Size {
  const v = value.trim().toLowerCase();
  const ratio = natural && natural.width > 0 && natural.height > 0
    ? natural.width / natural.height
    : null;

  if (v === "cover" || v === "contain") {
    if (!ratio) return { width: area.width, height: area.height };
    const areaRatio = area.width / area.height;
    // `clampHeight` = the image height is pinned to the area and the width is
    // derived (so the width overflows for cover / underflows for contain).
    const clampHeight = v === "cover" ? areaRatio <= ratio : areaRatio > ratio;
    return clampHeight
      ? { width: area.height * ratio, height: area.height }
      : { width: area.width, height: area.width / ratio };
  }

  const tokens = splitTopLevel(value, " ");
  const rawX = tokens[0] ?? "auto";
  const rawY = tokens[1] ?? "auto";

  const xAuto = rawX.toLowerCase() === "auto";
  const yAuto = rawY.toLowerCase() === "auto";

  let width = xAuto ? null : lengthTo(rawX, area.width);
  let height = yAuto ? null : lengthTo(rawY, area.height);

  // A token that failed to parse is treated as auto.
  if (width === null && !xAuto) width = null;
  if (height === null && !yAuto) height = null;

  if (width !== null && height !== null) return { width, height };

  if (width !== null && height === null) {
    return { width, height: ratio ? width / ratio : (natural?.height ?? area.height) };
  }
  if (height !== null && width === null) {
    return { width: ratio ? height * ratio : (natural?.width ?? area.width), height };
  }

  // Both auto: intrinsic size, falling back to the area when unknown.
  return {
    width: natural?.width ?? area.width,
    height: natural?.height ?? area.height,
  };
}

function lengthTo(token: string, reference: number): number | null {
  const len = parseLength(token);
  if (!len) return null;
  const px = resolveLength(len, reference);
  return px >= 0 ? px : 0;
}
