/** A rectangle in CSS pixels. `x`/`y` are top-left relative to the element's border box. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A size in pixels. */
export interface Size {
  width: number;
  height: number;
}

/** How the background tiles on a single axis. */
export type RepeatMode = "no-repeat" | "repeat" | "round" | "space";

/**
 * A pixel-accurate description of how one background-image layer should be
 * fetched so the download matches exactly what the browser paints.
 *
 * This is the proxy-agnostic contract every {@link UrlBuilder} receives. All
 * numbers are already rounded to whole, positive device pixels.
 */
export interface CropPlan {
  /** The original source URL, with any surrounding quotes stripped. */
  readonly url: string;
  /**
   * Intrinsic size of the source image in pixels, or `null` when it could not
   * be determined (e.g. an SVG without an intrinsic size and no size hint).
   */
  readonly natural: Size | null;
  /**
   * The sub-region of the *source* image that is actually visible, in source
   * pixels. `null` means "use the whole image" (the image tiles, or nothing is
   * cropped away). Only meaningful when {@link natural} is known.
   */
  readonly crop: Rect | null;
  /**
   * The size, in device pixels, that the (possibly cropped) region should be
   * delivered at. Already multiplied by the effective device pixel ratio.
   */
  readonly output: Size;
  /** The resolved tiling mode per axis. */
  readonly repeat: { x: RepeatMode; y: RepeatMode };
  /** The device pixel ratio that {@link output} was scaled by. */
  readonly dpr: number;
  /**
   * Advisory placement for the host element. When a genuine sub-region is
   * cropped ({@link crop} is non-null), the delivered image must be painted at
   * this `size` (CSS px) and `position` (CSS px, relative to the background
   * positioning area's top-left) with `no-repeat`, because the original
   * `background-size`/`-position` no longer apply to the smaller image.
   * `null` means keep the element's original background properties.
   *
   * URL builders can ignore this field; it is consumed by the cropper.
   */
  readonly paint:
    | { size: Size; position: { x: number; y: number } }
    | null;
}

/**
 * Turns a {@link CropPlan} into the URL that should replace the layer's source.
 * Return the original `plan.url` to leave a layer untouched. May be async (e.g.
 * a builder that produces a client-side cropped blob/data URL).
 */
export type UrlBuilder = (plan: CropPlan) => string | Promise<string>;

export interface CropperOptions {
  /**
   * Builds the optimized URL for each layer. Defaults to {@link defaultUrlBuilder},
   * which targets the repository's `{resize},fit,cw..,ch..,q..` proxy format.
   */
  urlBuilder?: UrlBuilder;
  /**
   * Device pixel ratio handling.
   * - `true` (default): use `window.devicePixelRatio`, tracked live when observing.
   * - `false`: force `1`.
   * - a number: use that fixed ratio.
   */
  dpr?: boolean | number;
  /**
   * When `true` (default) each element is watched with a `ResizeObserver` and
   * the crop is recomputed on resize and on device-pixel-ratio changes.
   */
  observe?: boolean;
  /**
   * Base name of the data attribute that provides an intrinsic size hint,
   * e.g. `data-bg-image-width` / `data-bg-image-height`. Defaults to
   * `"data-bg-image"`. Hints avoid a network round-trip to read natural size.
   */
  sizeHintAttribute?: string;
  /**
   * Upper bound for the effective DPR, so huge ratios don't request absurd
   * images. Defaults to `3`.
   */
  maxDpr?: number;
}
