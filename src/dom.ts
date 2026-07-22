import type { Rect } from "./types.ts";
import type { LayerInput } from "./geometry.ts";
import { layerValue, splitTopLevel } from "./css/split.ts";
import { parseRepeat } from "./css/repeat.ts";

/** Geometry for one layer, minus the parts resolved later (natural size, DPR). */
export type LayerGeometry = Omit<LayerInput, "natural" | "dpr">;

/** One entry of an element's `background-image` list. */
export type ResolvedLayer =
  | { kind: "url"; geometry: LayerGeometry }
  | { kind: "raw"; image: string };

/**
/**
 * The element's *original* background paint properties. These must be captured
 * before the cropper writes any overrides, because `background-size` /
 * `-position` / `-repeat` get rewritten for cropped layers — reading them back
 * live would feed the cropper its own output. `-origin`/`-clip`/`-attachment`
 * are never overridden, so those are read from the live computed style.
 */
export interface OriginalBackground {
  image: string;
  size: string;
  position: string;
  repeat: string;
}

/**
 * Read an element's background layers and box geometry, returning one
 * {@link ResolvedLayer} per `background-image` layer, in paint order. Layers
 * that are not croppable `url()`s (gradients, `image-set()`, `none`, or
 * `background-clip: text`) are returned as `raw` so they can be preserved.
 *
 * Paint properties come from `original` (see {@link OriginalBackground}); box
 * geometry and origin/clip/attachment come from the live computed style.
 */
export function resolveElement(el: Element, original: OriginalBackground): ResolvedLayer[] {
  const style = getComputedStyle(el);
  const images = splitTopLevel(original.image, ",");

  const sizes = splitTopLevel(original.size, ",");
  const positions = splitTopLevel(original.position, ",");
  const repeats = splitTopLevel(original.repeat, ",");
  const origins = splitTopLevel(style.backgroundOrigin, ",");
  const clips = splitTopLevel(style.backgroundClip, ",");
  const attachments = splitTopLevel(style.backgroundAttachment, ",");

  const boxes = readBoxes(el as HTMLElement, style);

  return images.map((image, i): ResolvedLayer => {
    const url = extractUrl(image);
    const clip = layerValue(clips, i);
    if (url === null || clip === "text") return { kind: "raw", image };

    const origin = layerValue(origins, i);
    const attachment = layerValue(attachments, i);
    const { positioningArea, clipArea } = resolveAreas(
      el as HTMLElement,
      boxes,
      origin,
      clip,
      attachment,
    );

    const [posX, posY] = splitPosition(layerValue(positions, i));

    return {
      kind: "url",
      geometry: {
        url,
        positioningArea,
        clipArea,
        size: layerValue(sizes, i) || "auto",
        positionX: posX,
        positionY: posY,
        repeat: parseRepeat(layerValue(repeats, i) || "repeat"),
      },
    };
  });
}

/** Split one layer's `background-position` ("x y") into its two axis tokens. */
function splitPosition(value: string): [string, string] {
  const tokens = splitTopLevel(value, " ");
  return [tokens[0] || "0%", tokens[1] || "50%"];
}

interface Boxes {
  border: Rect;
  padding: Rect;
  content: Rect;
}

function readBoxes(el: HTMLElement, style: CSSStyleDeclaration): Boxes {
  const bl = px(style.borderLeftWidth);
  const bt = px(style.borderTopWidth);
  const br = px(style.borderRightWidth);
  const bb = px(style.borderBottomWidth);
  const pl = px(style.paddingLeft);
  const pt = px(style.paddingTop);
  const pr = px(style.paddingRight);
  const pb = px(style.paddingBottom);

  const border: Rect = { x: 0, y: 0, width: el.offsetWidth, height: el.offsetHeight };
  const padding: Rect = {
    x: bl,
    y: bt,
    width: border.width - bl - br,
    height: border.height - bt - bb,
  };
  const content: Rect = {
    x: bl + pl,
    y: bt + pt,
    width: padding.width - pl - pr,
    height: padding.height - pt - pb,
  };
  return { border, padding, content };
}

function resolveAreas(
  el: HTMLElement,
  boxes: Boxes,
  origin: string,
  clip: string,
  attachment: string,
): { positioningArea: Rect; clipArea: Rect } {
  const originBox = pickBox(boxes, origin);
  const clipBox = pickBox(boxes, clip);

  if (attachment === "local") {
    // The image scrolls with the content, so over the full scroll range every
    // part of the positioning area becomes visible: size it to the scrollable
    // content and clip to the same rect (scale only, never crop).
    const area: Rect = {
      x: originBox.x,
      y: originBox.y,
      width: Math.max(originBox.width, el.scrollWidth),
      height: Math.max(originBox.height, el.scrollHeight),
    };
    return { positioningArea: area, clipArea: area };
  }

  // `scroll` (default) and `fixed`: the painted region is stable and can be
  // cropped to the clip box. (`fixed` is approximated by the element's own box.)
  return { positioningArea: originBox, clipArea: clipBox };
}

function pickBox(boxes: Boxes, box: string): Rect {
  switch (box) {
    case "border-box":
      return boxes.border;
    case "content-box":
      return boxes.content;
    case "padding-box":
    default:
      return boxes.padding;
  }
}

/** Extract the URL from a `url(...)` layer, or `null` for non-url layers. */
export function extractUrl(image: string): string | null {
  const m = /^url\(\s*(.*?)\s*\)$/is.exec(image.trim());
  if (!m) return null;
  let inner = m[1]!.trim();
  if (
    (inner.startsWith('"') && inner.endsWith('"')) ||
    (inner.startsWith("'") && inner.endsWith("'"))
  ) {
    inner = inner.slice(1, -1);
  }
  return inner.length > 0 ? inner : null;
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
