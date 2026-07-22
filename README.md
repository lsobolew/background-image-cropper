# background-image-cropper

Optimize CSS `background-image` downloads by fetching each layer **cropped and
scaled to exactly the pixels the browser actually paints** — nothing more.

**[▶ Live demo](https://lsobolew.github.io/background-image-cropper/)** ·
[npm](https://www.npmjs.com/package/background-image-cropper)

A CSS background only ever paints a sub-rectangle of its source image (decided by
the element's box, `background-size`, `-position`, `-repeat`, `-origin`, `-clip`
and `-attachment`). Shipping the full-resolution original wastes bandwidth. This
library measures the real painted region from the rendered DOM, then rewrites the
`background-image` URL to point at an image-transform backend (your CDN/proxy)
that returns just that region at just the right size — including for
`devicePixelRatio` / retina.

- **Framework-agnostic**, zero runtime dependencies.
- **Every browser**: ships ESM, CommonJS, and a standalone `<script>` global; the
  geometry relies only on `getComputedStyle` + box metrics.
- **Reactive**: recomputes on element resize (`ResizeObserver`) and DPR changes.
- **Pluggable output**: bring your own URL builder, or use the bundled presets.
- **Handles the full matrix**: all `background-size` forms (`cover`/`contain`/
  `auto`/lengths/percentages), all `background-position` forms (keywords,
  percentages, lengths, `calc()` edge-offset syntax), every `background-repeat`
  mode, all origin/clip boxes, `scroll`/`local`/`fixed` attachment, borders,
  padding, and multiple comma-separated layers (gradients are left untouched).

## Install

```sh
npm install background-image-cropper
```

## Quick start

```js
import { cropBackgrounds, weservUrlBuilder } from "background-image-cropper";

// Optimize every .hero background and keep it correct on resize / DPR change.
const cropper = cropBackgrounds(".hero", { urlBuilder: weservUrlBuilder });

// later, if you need to tear it down:
cropper.disconnect();
```

Plain `<script>` (no bundler) — exposes a `BackgroundImageCropper` global:

```html
<script src="https://unpkg.com/background-image-cropper"></script>
<script>
  BackgroundImageCropper.cropBackgrounds(".hero", {
    urlBuilder: BackgroundImageCropper.weservUrlBuilder,
  });
</script>
```

### Providing the source's natural size

To crop precisely (and to resolve `cover`/`contain`), the library needs the
source image's intrinsic size. It will load the image once to read it, but you
can avoid that round-trip with a size hint on the element:

```html
<div class="hero" data-bg-image-width="1600" data-bg-image-height="900"></div>
```

(The attribute base is configurable via `sizeHintAttribute`.)

## API

### `cropBackgrounds(target, options?) → BackgroundCropper`

Convenience wrapper: constructs a `BackgroundCropper`, starts optimizing
`target`, and returns it. `target` is a CSS selector, an `Element`, or any
iterable of elements.

### `new BackgroundCropper(options?)`

| Option | Default | Description |
| --- | --- | --- |
| `urlBuilder` | `defaultUrlBuilder` | Turns a `CropPlan` into the replacement URL. |
| `dpr` | `true` | `true` → track `devicePixelRatio`; `false` → force `1`; or a fixed number. |
| `observe` | `true` | Watch each element with `ResizeObserver` and react to DPR changes. |
| `sizeHintAttribute` | `"data-bg-image"` | Base name for the `-width`/`-height` size hint. |
| `maxDpr` | `3` | Upper bound on the effective DPR. |

Methods: `.observe(target)`, `.refresh()`, `.unobserve(el)`, `.disconnect()`
(restores originals and tears down all observers/listeners).

### URL builders

An `UrlBuilder` receives a fully-resolved `CropPlan` and returns a string (or a
`Promise<string>`):

```ts
interface CropPlan {
  url: string;                       // the original source URL
  natural: { width; height } | null; // source intrinsic size, if known
  crop: { x; y; width; height } | null; // source-pixel region to take (null = whole image)
  output: { width; height };         // device pixels to deliver it at
  repeat: { x: RepeatMode; y: RepeatMode };
  dpr: number;
}
```

Bundled builders:

- **`defaultUrlBuilder`** / `createProxyUrlBuilder({ base?, quality? })` —
  targets a path-style proxy with the grammar
  `{base}{W}x{H},fit,cw{CW},ch{CH},q{Q}/{sourceUrl}`. Assumes a top-left crop
  (the grammar has no crop offset).
- **`weservUrlBuilder`** / `createWeservUrlBuilder({ base?, quality? })` —
  targets the free, public [wsrv.nl](https://wsrv.nl) proxy (a.k.a.
  images.weserv.nl), using `&precrop` + `cx,cy,cw,ch` for a source-pixel crop and
  `w,h,fit=fill` to resize. Pixel-accurate for **every** combination and needs no
  infrastructure of your own.

Custom builder for, say, imgproxy / Cloudinary / imgix:

```ts
const cloudinary: UrlBuilder = (plan) => {
  const t = [`w_${plan.output.width}`, `h_${plan.output.height}`, "c_fill"];
  if (plan.crop) {
    t.push(`x_${plan.crop.x}`, `y_${plan.crop.y}`,
           `w_${plan.crop.width}`, `h_${plan.crop.height}`, "c_crop");
  }
  return `https://res.cloudinary.com/demo/image/fetch/${t.join(",")}/${encodeURIComponent(plan.url)}`;
};
```

## How the geometry works

For each layer the library computes, in the element's coordinate space:

1. the **positioning area** (from `background-origin` / `-attachment`),
2. the **rendered image size** (from `background-size` against that area),
3. the **image position** (from `background-position`),
4. the **clip/visible window** (from `background-clip`),

intersects the placed image with the visible window, and maps the result back to
source pixels — giving the crop rectangle and the output size (times a clamped
DPR, never upscaled beyond the source). Tiling backgrounds (`repeat`/`round`/
`space`) are never cropped; only the tile is downscaled. `local` backgrounds are
scaled but not cropped, since scrolling can reveal any part of them.

When a genuine **sub-region** is cropped, the delivered image no longer has the
dimensions the original `background-size` was computed against — so the cropper
also sets that layer's `background-size`, `-position` and `-repeat` inline to
paint the smaller image exactly over the visible rect (`CropPlan.paint`). Layers
that deliver the whole image (contain, tiling, `local`, or an image that already
fits) keep their original background properties untouched.

## Demo

Hosted: **<https://lsobolew.github.io/background-image-cropper/>**. Run it locally:

```sh
npm install
npm run build
npm run demo   # http://localhost:5173
```

Each scenario renders the **same** element twice — an *original* that loads the
full source from `dummyimage.com`, and an *optimized* copy rewritten by the
library to fetch only the visible region through the `wsrv.nl` proxy. They render
identically while the optimized request downloads far fewer pixels; captions show
the live crop and savings. Resize the window to watch crops recompute via
`ResizeObserver`.

## Development

```sh
npm run typecheck   # tsc --noEmit
npm test            # node --test (pure geometry / CSS / builder units)
npm run build       # tsup → dist/ (ESM + CJS + IIFE global + .d.ts)
```

## License

MIT
