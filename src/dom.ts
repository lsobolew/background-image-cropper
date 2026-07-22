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
 * Read an element's computed background properties and box geometry, returning
 * one {@link ResolvedLayer} per `background-image` layer, in paint order. Layers
 * that are not croppable `url()`s (gradients, `image-set()`, `none`, or
 * `background-clip: text`) are returned as `raw` so they can be preserved.
 */
export function resolveElement(el: Element, originalImage: string): ResolvedLayer[] {
  const style = getComputedStyle(el);
  const images = splitTopLevel(originalImage, ",");

  const sizes = splitTopLevel(style.backgroundSize, ",");
  const posX = splitTopLevel(readPositionX(style), ",");
  const posY = splitTopLevel(readPositionY(style), ",");
  const repeats = splitTopLevel(style.backgroundRepeat, ",");
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

    return {
      kind: "url",
      geometry: {
        url,
        positioningArea,
        clipArea,
        size: layerValue(sizes, i) || "auto",
        positionX: layerValue(posX, i) || "0%",
        positionY: layerValue(posY, i) || "0%",
        repeat: parseRepeat(layerValue(repeats, i) || "repeat"),
      },
    };
  });
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

function readPositionX(style: CSSStyleDeclaration): string {
  const x = style.backgroundPositionX;
  if (x) return x;
  return firstAxis(style.backgroundPosition, 0);
}

function readPositionY(style: CSSStyleDeclaration): string {
  const y = style.backgroundPositionY;
  if (y) return y;
  return firstAxis(style.backgroundPosition, 1);
}

/** Fallback for browsers not exposing background-position-x/y: split each layer. */
function firstAxis(backgroundPosition: string, axis: 0 | 1): string {
  return splitTopLevel(backgroundPosition, ",")
    .map((layer) => splitTopLevel(layer, " ")[axis] ?? "0%")
    .join(", ");
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
