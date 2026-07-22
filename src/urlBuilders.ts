import type { CropPlan, UrlBuilder } from "./types.ts";

/**
 * Build URLs for the repository's transform proxy, whose grammar is
 * `{base}{W}x{H},fit,cw{CW},ch{CH},q{Q}/{sourceUrl}`.
 *
 * - `{W}x{H}` is the delivered (visible) size in device pixels.
 * - `cw`/`ch` is the crop taken from the *source*, in source pixels (the whole
 *   image when nothing is cropped away).
 * - `{base}` prefixes the proxy origin, e.g. `"https://img.example.com/"`.
 *
 * The grammar has no crop *offset*, so this builder assumes a top-left crop.
 * For images positioned away from the top-left, supply a builder that uses
 * `plan.crop.x` / `plan.crop.y` (see {@link createWeservUrlBuilder}).
 */
export function createProxyUrlBuilder(
  options: { base?: string; quality?: number } = {},
): UrlBuilder {
  const base = options.base ?? "";
  const quality = options.quality ?? 100;
  return (plan) => {
    const { output } = plan;
    const cropW = plan.crop?.width ?? plan.natural?.width ?? output.width;
    const cropH = plan.crop?.height ?? plan.natural?.height ?? output.height;
    return (
      `${base}${output.width}x${output.height}` +
      `,fit,cw${Math.round(cropW)},ch${Math.round(cropH)},q${quality}` +
      `/${plan.url}`
    );
  };
}

/** The default builder: the repository proxy grammar, same-origin, quality 100. */
export const defaultUrlBuilder: UrlBuilder = createProxyUrlBuilder();

/**
 * Build URLs for the free, public [wsrv.nl](https://wsrv.nl) proxy (a.k.a.
 * images.weserv.nl), which supports rectangle cropping (`&precrop` + `cx`,`cy`,
 * `cw`,`ch`, in source pixels) and resizing (`w`,`h`). This yields pixel-accurate
 * output for *every* combination and works on any website with no infrastructure
 * of your own — a good drop-in default for production.
 *
 * `fit=fill` stretches to the exact output size: the crop already has the output
 * aspect ratio, and for the whole-image case the element's own `background-size`
 * re-derives the display, so stretching is always correct here.
 *
 * Requires the source natural size to be known (via a size hint or image load);
 * layers with an unknown natural size are left unchanged.
 */
export function createWeservUrlBuilder(
  options: { base?: string; quality?: number } = {},
): UrlBuilder {
  const base = options.base ?? "https://wsrv.nl/";
  const quality = options.quality ?? 90;
  return (plan) => {
    if (!plan.natural) return plan.url;
    const params = new URLSearchParams();
    params.set("url", weservSource(plan.url));
    if (plan.crop) {
      // `precrop` crops the source *before* resizing (in source pixels).
      params.set("precrop", "true");
      params.set("cx", String(plan.crop.x));
      params.set("cy", String(plan.crop.y));
      params.set("cw", String(plan.crop.width));
      params.set("ch", String(plan.crop.height));
    }
    params.set("w", String(plan.output.width));
    params.set("h", String(plan.output.height));
    params.set("fit", "fill");
    params.set("q", String(quality));
    return `${base}?${params.toString()}`;
  };
}

/** The wsrv.nl builder with default settings. */
export const weservUrlBuilder: UrlBuilder = createWeservUrlBuilder();

/**
 * weserv takes the source without a scheme, using an `ssl:` prefix for https.
 * Relative and data URLs are passed through unchanged (weserv cannot fetch
 * them, but the caller's own builder can be used for those cases).
 */
function weservSource(url: string): string {
  if (url.startsWith("https://")) return `ssl:${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return url.slice("http://".length);
  return url;
}

/** Re-export the plan type for convenience when writing custom builders. */
export type { CropPlan, UrlBuilder };
