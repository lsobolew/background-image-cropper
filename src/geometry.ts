import type { CropPlan, Rect, RepeatMode, Size } from "./types.ts";
import { resolveBackgroundSize } from "./css/size.ts";
import { resolvePositionAxis } from "./css/position.ts";

/** Everything the geometry engine needs about one background layer. Pure data. */
export interface LayerInput {
  url: string;
  /** Background positioning area, in element (border-box) coordinates. */
  positioningArea: Rect;
  /**
   * The visible window the image is clipped to (background-clip), in element
   * coordinates. For scrolling backgrounds this is smaller than the image; for
   * `local` backgrounds pass the full positioning area so nothing is cropped.
   */
  clipArea: Rect;
  /** Computed `background-size` value for the layer. */
  size: string;
  /** Computed `background-position-x` token for the layer. */
  positionX: string;
  /** Computed `background-position-y` token for the layer. */
  positionY: string;
  repeat: { x: RepeatMode; y: RepeatMode };
  natural: Size | null;
  /** Effective device pixel ratio (already clamped by maxDpr). */
  dpr: number;
}

interface AxisResult {
  /** Source-pixel start of the visible region, or `null` for the whole axis. */
  cropStart: number | null;
  /** Source-pixel length of the visible region, or `null` for the whole axis. */
  cropSize: number | null;
  /** Device pixels to deliver this axis at. `<= 0` means nothing is visible. */
  output: number;
}

/**
 * Compute the crop plan for a single background layer, or `null` when the layer
 * contributes no visible pixels (fully clipped, zero-sized, or degenerate).
 */
export function computeLayerPlan(input: LayerInput): CropPlan | null {
  const { positioningArea: p, clipArea: c, natural, dpr } = input;

  const rendered = resolveBackgroundSize(
    input.size,
    { width: p.width, height: p.height },
    natural,
  );
  if (rendered.width <= 0 || rendered.height <= 0) return null;

  const imageLeft = p.x + resolvePositionAxis(input.positionX, p.width, rendered.width);
  const imageTop = p.y + resolvePositionAxis(input.positionY, p.height, rendered.height);

  const x = resolveAxis(
    input.repeat.x,
    imageLeft,
    rendered.width,
    c.x,
    c.width,
    natural?.width ?? null,
    dpr,
  );
  const y = resolveAxis(
    input.repeat.y,
    imageTop,
    rendered.height,
    c.y,
    c.height,
    natural?.height ?? null,
    dpr,
  );

  if (x.output <= 0 || y.output <= 0) return null;

  let crop: Rect | null = null;
  if (natural) {
    // A `null` per-axis crop means "the whole source dimension".
    const cropX = x.cropStart ?? 0;
    const cropY = y.cropStart ?? 0;
    const cropW = x.cropSize ?? natural.width;
    const cropH = y.cropSize ?? natural.height;
    crop = clampCrop({ x: cropX, y: cropY, width: cropW, height: cropH }, natural);
    // If the crop covers the whole image, signal "no crop" so builders can skip it.
    if (isWholeImage(crop, natural)) crop = null;
  }

  const output: Size = {
    width: Math.max(1, Math.ceil(x.output)),
    height: Math.max(1, Math.ceil(y.output)),
  };

  return {
    url: input.url,
    natural,
    crop,
    output,
    repeat: input.repeat,
    dpr,
  };
}

function resolveAxis(
  mode: RepeatMode,
  imageStart: number,
  rendered: number,
  clipStart: number,
  clipSize: number,
  natural: number | null,
  dpr: number,
): AxisResult {
  if (mode === "no-repeat") {
    const visibleStart = Math.max(imageStart, clipStart);
    const visibleEnd = Math.min(imageStart + rendered, clipStart + clipSize);
    const visible = visibleEnd - visibleStart;
    if (visible <= 0) return { cropStart: null, cropSize: null, output: 0 };

    if (natural === null) {
      return { cropStart: null, cropSize: null, output: visible * dpr };
    }
    const scale = natural / rendered;
    const cropStart = (visibleStart - imageStart) * scale;
    const cropSize = visible * scale;
    // Never request more output pixels than the source region can supply.
    const output = Math.min(visible * dpr, cropSize);
    return { cropStart, cropSize, output };
  }

  // Tiling axes: the whole source is shown, so only the tile size matters.
  let tile = rendered;
  if (mode === "round") {
    const tiles = Math.max(1, Math.round(clipSize / rendered));
    tile = clipSize / tiles;
  }
  if (natural === null) {
    return { cropStart: null, cropSize: null, output: tile * dpr };
  }
  const output = Math.min(tile * dpr, natural);
  return { cropStart: null, cropSize: null, output };
}

function clampCrop(crop: Rect, natural: Size): Rect {
  const x = clamp(crop.x, 0, natural.width);
  const y = clamp(crop.y, 0, natural.height);
  const width = clamp(crop.width, 0, natural.width - x);
  const height = clamp(crop.height, 0, natural.height - y);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function isWholeImage(crop: Rect, natural: Size): boolean {
  return (
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width >= natural.width &&
    crop.height >= natural.height
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
