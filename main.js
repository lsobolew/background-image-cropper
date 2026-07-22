// Demo for background-image-cropper.
//
// This page has no image-transform backend, so it uses a *client-side* URL
// builder: it downloads the source once, crops & scales the exact region the
// crop plan describes onto a <canvas>, and hands back a data: URL. Because the
// element keeps its original background-size / -position / -repeat, the baked
// image reproduces the original view pixel-for-pixel — hover any cell to check.
//
// In production you would instead pass `weservUrlBuilder` (or your own proxy
// builder) so the *server* returns the smaller image and you actually save
// bandwidth. See README.md.
import { BackgroundCropper } from "./dist/index.js";

const imageCache = new Map();

function loadImage(url) {
    let promise = imageCache.get(url);
    if (!promise) {
        promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
        imageCache.set(url, promise);
    }
    return promise;
}

/** A URL builder that bakes the crop plan into a canvas data URL (no backend). */
async function canvasBakeBuilder(plan) {
    if (!plan.natural) return plan.url;
    const img = await loadImage(plan.url);

    const crop = plan.crop ?? {
        x: 0,
        y: 0,
        width: plan.natural.width,
        height: plan.natural.height,
    };

    const canvas = document.createElement("canvas");
    canvas.width = plan.output.width;
    canvas.height = plan.output.height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, canvas.width, canvas.height,
    );
    return canvas.toDataURL("image/png");
}

const cropper = new BackgroundCropper({ urlBuilder: canvasBakeBuilder });
cropper.observe(document.querySelectorAll("section > div"));

// Expose for tinkering from the console.
window.__cropper = cropper;
