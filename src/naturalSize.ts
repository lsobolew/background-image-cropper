import type { Size } from "./types.ts";

const cache = new Map<string, Promise<Size | null>>();

/**
 * Resolve the intrinsic pixel size of an image URL.
 *
 * Prefers an explicit size hint from the element (`data-bg-image-width` /
 * `data-bg-image-height` by default) to avoid a network round-trip; otherwise
 * loads the image once and caches the result (or `null` on failure) per URL.
 */
export function getNaturalSize(
  el: Element,
  url: string,
  hintAttribute: string,
): Promise<Size | null> {
  const hint = readHint(el, hintAttribute);
  if (hint) return Promise.resolve(hint);

  const cached = cache.get(url);
  if (cached) return cached;

  const promise = loadNaturalSize(url);
  cache.set(url, promise);
  return promise;
}

function readHint(el: Element, attribute: string): Size | null {
  const w = el.getAttribute(`${attribute}-width`);
  const h = el.getAttribute(`${attribute}-height`);
  if (w === null || h === null) return null;
  const width = parseFloat(w);
  const height = parseFloat(h);
  if (width > 0 && height > 0) return { width, height };
  return null;
}

function loadNaturalSize(url: string): Promise<Size | null> {
  if (typeof Image === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Clear the natural-size cache (mainly for tests). */
export function clearNaturalSizeCache(): void {
  cache.clear();
}
