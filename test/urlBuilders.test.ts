import { test } from "node:test";
import assert from "node:assert/strict";

import type { CropPlan } from "../src/types.ts";
import {
  createProxyUrlBuilder,
  defaultUrlBuilder,
  createWeservUrlBuilder,
} from "../src/urlBuilders.ts";

const cropped: CropPlan = {
  url: "https://cdn.example.com/photo.jpg",
  natural: { width: 1600, height: 900 },
  crop: { x: 200, y: 100, width: 800, height: 600 },
  output: { width: 400, height: 300 },
  repeat: { x: "no-repeat", y: "no-repeat" },
  dpr: 2,
  paint: { size: { width: 400, height: 300 }, position: { x: 0, y: 0 } },
};

const whole: CropPlan = { ...cropped, crop: null, paint: null };

test("default proxy builder encodes output size and source crop size", () => {
  assert.equal(
    defaultUrlBuilder(cropped),
    "400x300,fit,cw800,ch600,q100/https://cdn.example.com/photo.jpg",
  );
});

test("proxy builder: no crop falls back to natural size, with base + quality", () => {
  const build = createProxyUrlBuilder({ base: "https://img/", quality: 80 });
  assert.equal(
    build(whole),
    "https://img/400x300,fit,cw1600,ch900,q80/https://cdn.example.com/photo.jpg",
  );
});

test("weserv builder emits precrop + rectangle crop + resize and ssl-prefixes https", () => {
  const url = new URL(createWeservUrlBuilder()(cropped) as string);
  assert.equal(url.origin + url.pathname, "https://wsrv.nl/");
  assert.equal(url.searchParams.get("url"), "ssl:cdn.example.com/photo.jpg");
  assert.equal(url.searchParams.get("precrop"), "true");
  assert.equal(url.searchParams.get("cx"), "200");
  assert.equal(url.searchParams.get("cy"), "100");
  assert.equal(url.searchParams.get("cw"), "800");
  assert.equal(url.searchParams.get("ch"), "600");
  assert.equal(url.searchParams.get("w"), "400");
  assert.equal(url.searchParams.get("h"), "300");
  assert.equal(url.searchParams.get("fit"), "fill");
});

test("weserv builder omits crop params when nothing is cropped", () => {
  const url = new URL(createWeservUrlBuilder()(whole) as string);
  assert.equal(url.searchParams.get("cx"), null);
  assert.equal(url.searchParams.get("precrop"), null);
  assert.equal(url.searchParams.get("w"), "400");
  assert.equal(url.searchParams.get("fit"), "fill");
});

test("weserv builder leaves the URL untouched when natural size is unknown", () => {
  const unknown: CropPlan = { ...whole, natural: null };
  assert.equal(createWeservUrlBuilder()(unknown), unknown.url);
});
