/* =========================================================
   تغییر اندازه‌ی عکس — بدون کتابخانه‌ی خارجی
   ========================================================= */

/**
 * تغییر اندازه‌ی یه منبع تصویری (Image یا Canvas)
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {number} targetW - عرض دلخواه
 * @param {number} targetH - ارتفاع دلخواه
 * @returns {HTMLCanvasElement}
 */
function resizeSource(source, targetW, targetH) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;

    const w = Math.max(1, Math.round(targetW || srcW));
    const h = Math.max(1, Math.round(targetH || srcH));

    // اگه تغییری لازم نیست، همون منبع رو برگردون (بهینه)
    if (w === srcW && h === srcH) {
        if (source instanceof HTMLCanvasElement) return source;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
}

/**
 * گرفتن ابعاد اصلی یه منبع
 */
function getSourceSize(source) {
    return {
        width: source.naturalWidth || source.width,
        height: source.naturalHeight || source.height
    };
}