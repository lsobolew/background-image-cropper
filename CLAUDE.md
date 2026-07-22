# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`background-image-cropper` is a framework-agnostic, zero-runtime-dependency
library that **optimizes CSS `background-image` downloads**. A CSS background
only ever paints a sub-rectangle of its source image (determined by the
element's box, `background-size`/`-position`/`-repeat`/`-origin`/`-clip`/
`-attachment`). The library measures that painted region from the rendered DOM
and rewrites the `background-image` URL to point at an image-transform backend
that returns just that region, at just the right size, scaled for
`devicePixelRatio`.

The design invariant: the element keeps its original background longhands, so a
correctly cropped+scaled image reproduces the original view pixel-for-pixel with
a smaller download.

## Commands

```sh
npm install          # then approve esbuild's install script if prompted:
                     #   npm install-scripts approve esbuild   (needed for tsup)
npm run typecheck    # tsc --noEmit  (src + test)
npm test             # node --test with native TS type-stripping; pure units
npm run build        # tsup -> dist/: ESM, CJS, IIFE global, and .d.ts
npm run demo         # zero-dep static server on http://localhost:5173
```

Run a single test file: `node --test --experimental-strip-types test/geometry.test.ts`.
Tests use only `node:test` + `node:assert` (no test framework) and run the
TypeScript sources directly via Node's type stripping.

## Architecture

The pipeline is split so the hard part — the geometry — is a set of **pure
functions testable without a DOM**. Data flows:

`element → dom.ts → geometry.ts → CropPlan → urlBuilder → new background-image`

- **`src/css/`** — pure CSS parsers/resolvers, each independently unit-tested:
  - `length.ts` resolves a token to `{px, percent}`, including linear `calc()`
    (the `calc(100% - 10px)` form that `getComputedStyle` emits for edge-offset
    positions). `split.ts` splits layer lists and token lists while respecting
    parentheses/quotes. `size.ts`, `position.ts`, `repeat.ts` implement the CSS
    Backgrounds sizing/positioning/repeat algorithms.
- **`src/geometry.ts`** — `computeLayerPlan(LayerInput)`, the core. Given a
  layer's positioning area, clip window, size/position/repeat, natural size and
  DPR (all plain data), it returns a `CropPlan` (source crop rect in source px +
  output size in device px) or `null` when nothing is visible. **No DOM here** —
  this is where correctness lives, so keep it pure and covered by tests.
- **`src/dom.ts`** — `resolveElement(el, originalImage)`: the only place that
  reads `getComputedStyle` and box metrics. It computes the three boxes
  (border/padding/content), derives each layer's positioning area and clip window
  from `background-origin`/`-clip`/`-attachment`, and emits one `ResolvedLayer`
  per layer (`url` layers carry geometry; gradients / `image-set` / `background-clip:text`
  become `raw` and are preserved verbatim).
- **`src/naturalSize.ts`** — resolves intrinsic source size from a
  `data-bg-image-width/height` hint, else loads the image once (cached per URL).
- **`src/urlBuilders.ts`** — `defaultUrlBuilder` (repo proxy grammar
  `{base}{W}x{H},fit,cw..,ch..,q../{url}`) and `weservUrlBuilder` (images.weserv.nl,
  full crop+resize). A `UrlBuilder` may be sync or async.
- **`src/cropper.ts`** — `BackgroundCropper`, the orchestrator: stores each
  element's ORIGINAL `background-image` in a `WeakMap` (always recompute from the
  original, never from an already-rewritten URL), batches recomputes on rAF, and
  owns the `ResizeObserver` + a `matchMedia` DPR listener. A monotonic per-element
  token discards stale async recomputes.
- **`src/index.ts`** — public API (`BackgroundCropper`, `cropBackgrounds`, the
  builders, and the advanced building blocks).

### Coordinate model (important when editing geometry)

All rects are in the element's **border-box coordinate space** (top-left =
`(0,0)`). The image is placed within the *positioning area*, then intersected
with the *clip window*. For `attachment: local` the positioning area is the
scrollable content size and the clip window equals it (so `local` scales but
never crops, since scrolling can reveal any part). Tiling axes
(`repeat`/`round`/`space`) are never cropped — only the tile is downscaled.
Output is multiplied by a clamped DPR and never upscaled beyond source pixels.

## Demo

`index.html` + `style.css` + the sample PNGs are the demo, driven by `main.js`
(an ES module that imports the built `dist/index.js`). It has **no backend**: it
uses a client-side canvas `urlBuilder` that bakes each crop into a `data:` URL,
so hovering a cell (which restores the original via CSS `:hover`) must not move
the picture. `style.css` rows A–F are a deliberate test matrix of
`background-attachment` × `background-origin`. Serve via `npm run demo` (paths
are relative, so page + PNGs are same-origin and the canvas stays untainted).

## Conventions

- Keep DOM access confined to `dom.ts`, `naturalSize.ts`, and `cropper.ts`; new
  geometry logic belongs in `geometry.ts`/`css/` as pure functions with tests.
- No parameter-properties or `enum`s in source — tests run under Node's
  type-stripping, which only erases types.
- Some legacy comments in git history are in Polish; new code is documented in
  English.
