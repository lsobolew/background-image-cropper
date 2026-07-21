import { test } from "node:test";
import assert from "node:assert/strict";

import { parseLength, resolveLength } from "../src/css/length.ts";
import { resolvePositionAxis } from "../src/css/position.ts";
import { resolveBackgroundSize } from "../src/css/size.ts";
import { parseRepeat } from "../src/css/repeat.ts";
import { splitTopLevel, layerValue } from "../src/css/split.ts";

test("parseLength: lengths, percentages, zero, calc", () => {
  assert.deepEqual(parseLength("10px"), { px: 10, percent: 0 });
  assert.deepEqual(parseLength("50%"), { px: 0, percent: 0.5 });
  assert.deepEqual(parseLength("0"), { px: 0, percent: 0 });
  assert.deepEqual(parseLength("calc(100% - 10px)"), { px: -10, percent: 1 });
  assert.deepEqual(parseLength("calc(50% + 12px)"), { px: 12, percent: 0.5 });
  assert.equal(parseLength("auto"), null);
});

test("resolveLength combines px and percent against a reference", () => {
  assert.equal(resolveLength({ px: 10, percent: 0.5 }, 200), 110);
});

test("resolvePositionAxis: percent aligns image within area, length is an offset", () => {
  // 50% of a 200px image in a 100px area centers it: -50px.
  assert.equal(resolvePositionAxis("50%", 100, 200), -50);
  assert.equal(resolvePositionAxis("10px", 100, 50), 10);
  assert.equal(resolvePositionAxis("center", 100, 200), -50);
  assert.equal(resolvePositionAxis("right", 100, 200), -100);
  // "right 10px" -> calc(100% - 10px): right edge 10px from area's right edge.
  assert.equal(resolvePositionAxis("calc(100% - 10px)", 100, 50), 40);
});

test("resolveBackgroundSize: cover and contain preserve aspect ratio", () => {
  const area = { width: 100, height: 100 };
  const landscape = { width: 200, height: 100 }; // ratio 2:1
  assert.deepEqual(resolveBackgroundSize("cover", area, landscape), {
    width: 200,
    height: 100,
  });
  assert.deepEqual(resolveBackgroundSize("contain", area, landscape), {
    width: 100,
    height: 50,
  });
});

test("resolveBackgroundSize: explicit values, auto, and single value", () => {
  const area = { width: 190, height: 190 };
  const square = { width: 300, height: 300 };
  assert.deepEqual(resolveBackgroundSize("50% 100%", area, square), {
    width: 95,
    height: 190,
  });
  // single value -> width set, height auto -> derived from ratio (1:1).
  assert.deepEqual(resolveBackgroundSize("50%", area, square), {
    width: 95,
    height: 95,
  });
  // both auto -> intrinsic size.
  assert.deepEqual(resolveBackgroundSize("auto", area, square), {
    width: 300,
    height: 300,
  });
  // "200px auto" with a 2:1 image -> height derived.
  assert.deepEqual(
    resolveBackgroundSize("200px auto", area, { width: 200, height: 100 }),
    { width: 200, height: 100 },
  );
});

test("resolveBackgroundSize: falls back to the area when natural size is unknown", () => {
  assert.deepEqual(
    resolveBackgroundSize("cover", { width: 80, height: 40 }, null),
    { width: 80, height: 40 },
  );
});

test("parseRepeat: keywords, shorthands, and two-value form", () => {
  assert.deepEqual(parseRepeat("repeat"), { x: "repeat", y: "repeat" });
  assert.deepEqual(parseRepeat("no-repeat"), { x: "no-repeat", y: "no-repeat" });
  assert.deepEqual(parseRepeat("repeat-x"), { x: "repeat", y: "no-repeat" });
  assert.deepEqual(parseRepeat("repeat-y"), { x: "no-repeat", y: "repeat" });
  assert.deepEqual(parseRepeat("round space"), { x: "round", y: "space" });
});

test("splitTopLevel: respects parentheses and quotes", () => {
  assert.deepEqual(
    splitTopLevel("url(a.png), linear-gradient(red, blue)", ","),
    ["url(a.png)", "linear-gradient(red, blue)"],
  );
  assert.deepEqual(splitTopLevel("calc(100% - 10px) 50%", " "), [
    "calc(100% - 10px)",
    "50%",
  ]);
  assert.deepEqual(
    splitTopLevel('url("a,b.png") 0% 0%', " "),
    ['url("a,b.png")', "0%", "0%"],
  );
});

test("layerValue cycles background longhands to match layer count", () => {
  assert.equal(layerValue(["no-repeat"], 3), "no-repeat");
  assert.equal(layerValue(["repeat", "no-repeat"], 1), "no-repeat");
  assert.equal(layerValue(["a", "b"], 2), "a");
});
