// Demo for background-image-cropper.
//
// Every scenario renders the SAME element twice:
//   • "original"  — the full source image straight from dummyimage.com
//   • "optimized" — rewritten by the library to fetch just the visible region
//                   through the wsrv.nl image proxy (https://wsrv.nl/docs/)
//
// Both look identical; the optimized request downloads fewer pixels. Captions
// are filled live from the crop plan the library computes, so they update on
// resize and match your device's pixel ratio.
import {
    BackgroundCropper,
    weservUrlBuilder,
} from "./dist/index.js";

const realDpr = window.devicePixelRatio || 1;
document.getElementById("dpr").textContent = String(round(realDpr, 2));

// dummyimage.com source, sized W×H with a solid colour + label.
function source(w, h, color, label) {
    return `https://dummyimage.com/${w}x${h}/${color}/ffffff&text=${encodeURIComponent(label)}`;
}

const scenarios = [
    {
        title: "background-size: cover · position: center",
        desc: "A wide photo covering a squarer box — only the central band is ever seen.",
        w: 1400, h: 500, color: "2d6cdf", height: 260,
        style: { backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
    },
    {
        title: "background-size: cover · position: left top",
        desc: "Same source, anchored top-left — the crop moves to the left edge.",
        w: 1400, h: 500, color: "8a3ffc", height: 260,
        style: { backgroundSize: "cover", backgroundPosition: "left top", backgroundRepeat: "no-repeat" },
    },
    {
        title: "background-size: cover · position: right bottom · portrait source",
        desc: "A tall source in a landscape box, anchored bottom-right.",
        w: 500, h: 1400, color: "0f9d58", height: 300,
        style: { backgroundSize: "cover", backgroundPosition: "right bottom", backgroundRepeat: "no-repeat" },
    },
    {
        title: "background-size: contain",
        desc: "The whole image is visible, so nothing is cropped — only downscaled to fit.",
        w: 1400, h: 500, color: "d93025", height: 170,
        style: { backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
    },
    {
        title: "background-size: 260% · position: center",
        desc: "Zoomed past the box: the source is enlarged and cropped to the centre.",
        w: 700, h: 700, color: "e8710a", height: 200,
        style: { backgroundSize: "260%", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
    },
    {
        title: "background-repeat: repeat · 56px tiles",
        desc: "A tiled background: never cropped, but the single tile is downscaled.",
        w: 400, h: 400, color: "1a73e8", height: 170,
        style: { backgroundSize: "56px 56px", backgroundPosition: "left top", backgroundRepeat: "repeat" },
    },
];

const container = document.getElementById("scenarios");
const captionByUrl = new Map(); // source URL -> optimized <figcaption>

for (const s of scenarios) {
    const src = source(s.w, s.h, s.color, `${s.w}×${s.h}`);

    const section = el("section", "scenario");
    section.append(el("h2", "", s.title), el("p", "desc", s.desc));

    const pair = el("div", "pair");
    pair.append(
        figure(src, s, false),
        figure(src, s, true),
    );
    section.append(pair);
    container.append(section);
}

// Wrap the wsrv.nl builder so we can show, live, what each optimized box fetched.
const recordingBuilder = (plan) => {
    const url = weservUrlBuilder(plan);
    const cap = captionByUrl.get(plan.url);
    if (cap) fillOptimizedCaption(cap, plan);
    return url;
};

const cropper = new BackgroundCropper({ urlBuilder: recordingBuilder });
cropper.observe(document.querySelectorAll(".optimized"));
window.__cropper = cropper;

// ---------------------------------------------------------------------------

function figure(src, s, optimized) {
    const fig = document.createElement("figure");

    const box = el("div", "box" + (optimized ? " optimized" : ""));
    box.style.width = "100%";
    box.style.height = s.height + "px";
    box.style.backgroundImage = `url("${src}")`;
    box.style.backgroundSize = s.style.backgroundSize;
    box.style.backgroundPosition = s.style.backgroundPosition;
    box.style.backgroundRepeat = s.style.backgroundRepeat;

    if (optimized) {
        box.setAttribute("data-bg-image-width", String(s.w));
        box.setAttribute("data-bg-image-height", String(s.h));
    }

    const cap = document.createElement("figcaption");
    if (optimized) {
        cap.innerHTML = `<span class="label">Optimized · via wsrv.nl</span><br><span class="measure">measuring…</span>`;
        captionByUrl.set(src, cap);
    } else {
        cap.innerHTML =
            `<span class="label">Original · full image</span><br>` +
            `<span class="measure">downloads the whole ${s.w}×${s.h} source</span>`;
    }

    fig.append(box, cap);
    return fig;
}

function fillOptimizedCaption(cap, plan) {
    const nat = plan.natural;
    const out = plan.output;
    const measure = cap.querySelector(".measure");
    if (!nat || !measure) return;

    const sourcePx = nat.width * nat.height;
    const deliveredPx = out.width * out.height;
    const saved = Math.max(0, Math.round((1 - deliveredPx / sourcePx) * 100));

    const cropText = plan.crop
        ? `crop ${plan.crop.width}×${plan.crop.height} @(${plan.crop.x},${plan.crop.y}) → `
        : "whole image → ";

    measure.innerHTML =
        `${cropText}fetch <span class="stat">${out.width}×${out.height}</span> ` +
        `<span class="saving">~${saved}% fewer pixels</span>`;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function round(n, digits) {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
}
