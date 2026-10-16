/* =========================================================
   فیلترهای تصویری — کاملاً بدون کتابخانه‌ی خارجی
   ========================================================= */

const DEFAULT_FILTERS = {
    brightness: 100,   // 0..200
    contrast: 100,   // 0..200
    saturation: 100,   // 0..200
    hue: 0,     // 0..360
    sharpen: 0,     // 0..100
    grayscale: false
};

/**
 * اعمال فیلترها روی منبع (Image یا Canvas) و برگرداندن یه Canvas جدید
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {Object} settings
 * @param {number} maxSize - بزرگترین ضلع خروجی (برای کارایی)
 * @returns {HTMLCanvasElement}
 */
function applyFilters(source, settings, maxSize = 1400) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;

    const scale = Math.min(maxSize / srcW, maxSize / srcH, 1);
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // ----- فیلترهای ساده با ctx.filter -----
    const parts = [];
    if (settings.brightness !== 100) parts.push(`brightness(${settings.brightness}%)`);
    if (settings.contrast !== 100) parts.push(`contrast(${settings.contrast}%)`);
    if (settings.saturation !== 100) parts.push(`saturate(${settings.saturation}%)`);
    if (settings.hue !== 0) parts.push(`hue-rotate(${settings.hue}deg)`);
    if (settings.grayscale) parts.push(`grayscale(100%)`);

    ctx.filter = parts.length ? parts.join(" ") : "none";
    ctx.drawImage(source, 0, 0, w, h);
    ctx.filter = "none";

    // ----- شارپ‌نس (کانولوشن) -----
    if (settings.sharpen > 0) {
        applySharpen(ctx, w, h, settings.sharpen / 100);
    }

    return canvas;
}

/**
 * شارپ‌نس با کرنل 3x3:
 *   [  0  -a   0 ]
 *   [ -a  1+4a -a ]
 *   [  0  -a   0 ]
 */
function applySharpen(ctx, w, h, amount) {
    const a = amount * 0.6; // حداکثر ~0.6
    const center = 1 + 4 * a;

    const imageData = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4;
            const up = ((y - 1) * w + x) * 4;
            const dn = ((y + 1) * w + x) * 4;
            const lf = (y * w + (x - 1)) * 4;
            const rt = (y * w + (x + 1)) * 4;

            for (let c = 0; c < 3; c++) {
                const val =
                    src[i + c] * center -
                    a * (src[up + c] + src[dn + c] + src[lf + c] + src[rt + c]);

                dst[i + c] = val < 0 ? 0 : val > 255 ? 255 : val;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}