export { BackgroundCropper } from "./cropper.ts";
export type {
  CropperOptions,
  CropPlan,
  UrlBuilder,
  Rect,
  Size,
  RepeatMode,
} from "./types.ts";

export {
  defaultUrlBuilder,
  createProxyUrlBuilder,
  weservUrlBuilder,
  createWeservUrlBuilder,
} from "./urlBuilders.ts";

import { BackgroundCropper } from "./cropper.ts";
import type { CropperOptions } from "./types.ts";

/**
 * Convenience one-liner: create a {@link BackgroundCropper}, start optimizing the
 * given target(s), and return the instance so you can `refresh()` or
 * `disconnect()` it later.
 *
 * @example
 * ```ts
 * import { cropBackgrounds, weservUrlBuilder } from "background-image-cropper";
 * const cropper = cropBackgrounds(".hero", { urlBuilder: weservUrlBuilder });
 * // later: cropper.disconnect();
 * ```
 */
export function cropBackgrounds(
  target: string | Element | Iterable<Element>,
  options?: CropperOptions,
): BackgroundCropper {
  return new BackgroundCropper(options).observe(target);
}

// Advanced / testable building blocks.
export { computeLayerPlan, type LayerInput } from "./geometry.ts";
export {
  resolveElement,
  extractUrl,
  type ResolvedLayer,
  type LayerGeometry,
  type OriginalBackground,
} from "./dom.ts";
export { getNaturalSize, clearNaturalSizeCache } from "./naturalSize.ts";
