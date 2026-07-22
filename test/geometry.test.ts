import { test } from "node:test";
import assert from "node:assert/strict";

import { computeLayerPlan, type LayerInput } from "../src/geometry.ts";
import { extractUrl } from "../src/dom.ts";

const base = {
  url: "http://img/x.png",
  positionX: "0%",
  positionY: "0%",
  repeat: { x: "no-repeat", y: "no-repeat" } as const,
  dpr: 1,
};

test("cover with top-left position crops the overflowing right side", () => {
  const plan = computeLayerPlan({
    ...base,
    positioningArea: { x: 0, y: 0, width: 100, height: 100 },
    clipArea: { x: 0, y: 0, width: 100, height: 100 },
    size: "cover",
    natural: { width: 200, height: 100 },
  } satisfies LayerInput);

  assert.ok(plan);
  // rendered 200x100, only the left 100x100 shows.
  assert.deepEqual(plan!.crop, { x: 0, y: 0, width: 100, height: 100 });
  assert.deepEqual(plan!.output, { width: 100, height: 100 });
});

test("cover with center position crops the middle of the image", () => {
  const plan = computeLayerPlan({
    ...base,
    positionX: "50%",
    positionY: "50%",
    positioningArea: { x: 0, y: 0, width: 100, height: 100 },
    clipArea: { x: 0, y: 0, width: 100, height: 100 },
    size: "cover",
    natural: { width: 200, height: 100 },
  } satisfies LayerInput);

  assert.ok(plan);
  assert.deepEqual(plan!.crop, { x: 50, y: 0, width: 100, height: 100 });
});

test("image fully inside the box is delivered whole, just downscaled", () => {
  // Mirrors the demo's section A: padding-box area 190x190, size 50% 100%.
  const plan = computeLayerPlan({
    ...base,
    positioningArea: { x: 5, y: 5, width: 190, height: 190 },
    clipArea: { x: 0, y: 0, width: 200, height: 200 },
    size: "50% 100%",
    natural: { width: 300, height: 300 },
  } satisfies LayerInput);

  assert.ok(plan);
  assert.equal(plan!.crop, null); // whole image
  assert.deepEqual(plan!.output, { width: 95, height: 190 });
});

test("devicePixelRatio scales output up, but never beyond source pixels", () => {
  const plan = computeLayerPlan({
    ...base,
    dpr: 2,
    positioningArea: { x: 0, y: 0, width: 100, height: 100 },
    clipArea: { x: 0, y: 0, width: 100, height: 100 },
    size: "contain", // 100x50 rendered, whole image visible
    natural: { width: 200, height: 100 },
  } satisfies LayerInput);

  assert.ok(plan);
  // Visible 100x50 CSS px * dpr2 = 200x100, exactly the source size (no upscale).
  assert.deepEqual(plan!.output, { width: 200, height: 100 });
  assert.equal(plan!.crop, null);
});

test("a fully clipped image yields no plan", () => {
  const plan = computeLayerPlan({
    ...base,
    positionX: "300px",
    positioningArea: { x: 0, y: 0, width: 100, height: 100 },
    clipArea: { x: 0, y: 0, width: 100, height: 100 },
    size: "50px 50px",
    natural: { width: 100, height: 100 },
  } satisfies LayerInput);

  assert.equal(plan, null);
});

test("repeat shows the whole tile: no crop, output scaled to tile size", () => {
  const plan = computeLayerPlan({
    ...base,
    repeat: { x: "repeat", y: "repeat" },
    positioningArea: { x: 0, y: 0, width: 500, height: 500 },
    clipArea: { x: 0, y: 0, width: 500, height: 500 },
    size: "50px 50px",
    natural: { width: 200, height: 200 },
  } satisfies LayerInput);

  assert.ok(plan);
  assert.equal(plan!.crop, null);
  // One tile is 50x50 CSS px; deliver at that size (downscaled from 200).
  assert.deepEqual(plan!.output, { width: 50, height: 50 });
});

test("unknown natural size: still produces output, but no crop", () => {
  const plan = computeLayerPlan({
    ...base,
    positioningArea: { x: 0, y: 0, width: 100, height: 100 },
    clipArea: { x: 0, y: 0, width: 100, height: 100 },
    size: "cover",
    natural: null,
  } satisfies LayerInput);

  assert.ok(plan);
  assert.equal(plan!.crop, null);
  assert.deepEqual(plan!.output, { width: 100, height: 100 });
});

test("extractUrl unwraps quotes and rejects gradients", () => {
  assert.equal(extractUrl('url("http://a/b.png")'), "http://a/b.png");
  assert.equal(extractUrl("url(http://a/b.png)"), "http://a/b.png");
  assert.equal(extractUrl("url('http://a/b.png')"), "http://a/b.png");
  assert.equal(extractUrl("linear-gradient(red, blue)"), null);
  assert.equal(extractUrl("none"), null);
});
