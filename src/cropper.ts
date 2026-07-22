import type { CropperOptions, UrlBuilder } from "./types.ts";
import { resolveElement, type ResolvedLayer } from "./dom.ts";
import { computeLayerPlan } from "./geometry.ts";
import { getNaturalSize } from "./naturalSize.ts";
import { defaultUrlBuilder } from "./urlBuilders.ts";

interface ElementState {
  /** The element's `background-image` before we ever touched it. */
  originalImage: string;
  /** Monotonic token to discard stale async recomputes. */
  token: number;
}

/**
 * Rewrites the `background-image` of one or more elements so each layer is
 * fetched cropped and scaled to exactly the pixels the browser paints. Keeps the
 * result correct as elements resize and the device pixel ratio changes.
 */
export class BackgroundCropper {
  private readonly urlBuilder: UrlBuilder;
  private readonly dprOption: boolean | number;
  private readonly shouldObserve: boolean;
  private readonly hintAttribute: string;
  private readonly maxDpr: number;

  private readonly states = new WeakMap<Element, ElementState>();
  private readonly observed = new Set<Element>();
  private readonly pending = new Set<Element>();

  private resizeObserver: ResizeObserver | null = null;
  private dprQuery: MediaQueryList | null = null;
  private rafHandle: number | null = null;
  private disposed = false;

  constructor(options: CropperOptions = {}) {
    this.urlBuilder = options.urlBuilder ?? defaultUrlBuilder;
    this.dprOption = options.dpr ?? true;
    this.shouldObserve = options.observe ?? true;
    this.hintAttribute = options.sizeHintAttribute ?? "data-bg-image";
    this.maxDpr = options.maxDpr ?? 3;
  }

  /**
   * Optimize the background(s) of the given target(s). Accepts a CSS selector,
   * an element, or any iterable of elements. Safe to call repeatedly; already
   * observed elements are simply recomputed.
   */
  observe(target: string | Element | Iterable<Element> | null | undefined): this {
    if (!isBrowser()) return this;
    for (const el of toElements(target)) {
      if (!this.observed.has(el)) {
        this.observed.add(el);
        this.ensureResizeObserver()?.observe(el);
      }
      void this.process(el);
    }
    if (this.shouldObserve) this.ensureDprListener();
    return this;
  }

  /** Recompute every observed element (e.g. after a layout change you caused). */
  refresh(): this {
    for (const el of this.observed) void this.process(el);
    return this;
  }

  /** Stop observing `el` and restore its original `background-image`. */
  unobserve(el: Element): this {
    if (!this.observed.has(el)) return this;
    this.observed.delete(el);
    this.pending.delete(el);
    this.resizeObserver?.unobserve(el);
    this.restoreElement(el);
    return this;
  }

  /** Restore every element and tear down all observers and listeners. */
  disconnect(): this {
    this.disposed = true;
    for (const el of this.observed) this.restoreElement(el);
    this.observed.clear();
    this.pending.clear();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.removeDprListener();
    if (this.rafHandle !== null) cancelRaf(this.rafHandle);
    this.rafHandle = null;
    return this;
  }

  private async process(el: Element): Promise<void> {
    if (this.disposed) return;
    const state = this.getState(el);
    const token = ++state.token;

    const layers = resolveElement(el, state.originalImage);
    if (!layers.some((l) => l.kind === "url")) return;

    const dpr = this.effectiveDpr();
    const built = await Promise.all(
      layers.map((layer) => this.buildLayer(el, layer, dpr)),
    );

    // A newer recompute (resize / DPR change) started meanwhile: drop this one.
    if (this.disposed || state.token !== token) return;
    if (!this.observed.has(el) && this.shouldObserve) return;

    (el as HTMLElement).style.backgroundImage = built.join(", ");
  }

  private async buildLayer(
    el: Element,
    layer: ResolvedLayer,
    dpr: number,
  ): Promise<string> {
    if (layer.kind === "raw") return layer.image;

    const natural = await getNaturalSize(el, layer.geometry.url, this.hintAttribute);
    const plan = computeLayerPlan({ ...layer.geometry, natural, dpr });
    if (!plan) return cssUrl(layer.geometry.url);

    const url = await this.urlBuilder(plan);
    return cssUrl(url);
  }

  private getState(el: Element): ElementState {
    let state = this.states.get(el);
    if (!state) {
      const originalImage = getComputedStyle(el).backgroundImage;
      state = { originalImage, token: 0 };
      this.states.set(el, state);
    }
    return state;
  }

  private restoreElement(el: Element): void {
    const state = this.states.get(el);
    if (!state) return;
    state.token++;
    (el as HTMLElement).style.backgroundImage = "";
  }

  private effectiveDpr(): number {
    let dpr: number;
    if (this.dprOption === false) dpr = 1;
    else if (this.dprOption === true) dpr = getDevicePixelRatio();
    else dpr = this.dprOption;
    return clampDpr(dpr, this.maxDpr);
  }

  private ensureResizeObserver(): ResizeObserver | null {
    if (!this.shouldObserve) return null;
    if (this.resizeObserver) return this.resizeObserver;
    if (typeof ResizeObserver === "undefined") return null;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) this.schedule(entry.target);
    });
    return this.resizeObserver;
  }

  private schedule(el: Element): void {
    this.pending.add(el);
    if (this.rafHandle !== null) return;
    this.rafHandle = requestRaf(() => {
      this.rafHandle = null;
      const batch = [...this.pending];
      this.pending.clear();
      for (const el of batch) void this.process(el);
    });
  }

  private ensureDprListener(): void {
    if (this.dprOption === false || this.dprQuery || typeof matchMedia === "undefined") {
      return;
    }
    const dpr = getDevicePixelRatio();
    this.dprQuery = matchMedia(`(resolution: ${dpr}dppx)`);
    this.dprQuery.addEventListener("change", this.onDprChange);
  }

  private removeDprListener(): void {
    this.dprQuery?.removeEventListener("change", this.onDprChange);
    this.dprQuery = null;
  }

  private readonly onDprChange = (): void => {
    this.removeDprListener();
    this.ensureDprListener();
    this.refresh();
  };
}

function isBrowser(): boolean {
  return typeof document !== "undefined" && typeof getComputedStyle !== "undefined";
}

function toElements(
  target: string | Element | Iterable<Element> | null | undefined,
): Element[] {
  if (target == null) return [];
  if (typeof target === "string") return [...document.querySelectorAll(target)];
  if (target instanceof Element) return [target];
  return [...target];
}

/** Wrap a URL in a CSS `url("…")` token, escaping quotes and backslashes. */
export function cssUrl(url: string): string {
  const escaped = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

function getDevicePixelRatio(): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  return dpr > 0 ? dpr : 1;
}

function clampDpr(dpr: number, max: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(dpr, max);
}

function requestRaf(cb: () => void): number {
  if (typeof requestAnimationFrame !== "undefined") return requestAnimationFrame(cb);
  return setTimeout(cb, 16) as unknown as number;
}

function cancelRaf(handle: number): void {
  if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(handle);
  else clearTimeout(handle);
}
