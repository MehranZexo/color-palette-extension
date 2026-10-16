/* =========================================================
   استخراج پالت رنگ با الگوریتم Median Cut
   بدون کتابخانه‌ی خارجی — فقط Canvas API خالص
   ========================================================= */

/**
 * استخراج پالت رنگ از یه HTMLImageElement
 * @param {HTMLImageElement} img - عکس ورودی
 * @param {number} colorCount - تعداد رنگ‌های خروجی (پیش‌فرض ۸)
 * @returns {Array<{hex: string, rgb: [number,number,number], count: number}>}
 */
function extractPalette(img, colorCount = 8) {
    // ۱. عکس رو روی یه canvas کوچیک می‌کشیم (برای سرعت)
    const MAX_SIZE = 200;
    const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);
    const w = Math.max(1, Math.floor(img.width * scale));
    const h = Math.max(1, Math.floor(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;

    // ۲. پیکسل‌ها رو جمع می‌کنیم و پیکسل‌های شفاف یا خیلی نزدیک به سفید/سیاه رو نادیده می‌گیریم
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 125) continue; // شفاف رو رد کن

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // سفید خالص و سیاه خالص رو نادیده بگیر (معمولاً پس‌زمینه‌ان)
        if (r > 250 && g > 250 && b > 250) continue;
        if (r < 5 && g < 5 && b < 5) continue;

        pixels.push([r, g, b]);
    }

    if (pixels.length === 0) return [];

    // ۳. الگوریتم Median Cut
    const boxes = [createBox(pixels)];
    while (boxes.length < colorCount) {
        // بزرگ‌ترین باکس رو انتخاب کن (بیشترین حجم رنگ)
        boxes.sort((a, b) => boxVolume(b) - boxVolume(a));
        const box = boxes.shift();
        if (!box || box.pixels.length < 2) break;

        const [boxA, boxB] = splitBox(box);
        if (boxA && boxB) {
            boxes.push(boxA, boxB);
        } else {
            boxes.push(box);
            break;
        }
    }

    // ۴. میانگین هر باکس = یه رنگ نماینده
    const palette = boxes
        .map(box => averageColor(box.pixels))
        .filter(Boolean)
        .map(rgb => ({
            rgb,
            hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
            count: 0
        }));

    // ۵. مرتب‌سازی بر اساس روشنایی (از تیره به روشن) برای زیبایی
    palette.sort((a, b) => luminance(a.rgb) - luminance(b.rgb));

    return palette;
}

/* ---------------- توابع کمکی ---------------- */

function createBox(pixels) {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const [r, g, b] of pixels) {
        if (r < rMin) rMin = r;
        if (r > rMax) rMax = r;
        if (g < gMin) gMin = g;
        if (g > gMax) gMax = g;
        if (b < bMin) bMin = b;
        if (b > bMax) bMax = b;
    }
    return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function boxVolume(box) {
    return (box.rMax - box.rMin) * (box.gMax - box.gMin) * (box.bMax - box.bMin);
}

function splitBox(box) {
    // کانالی که بیشترین بازه رو داره پیدا کن
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;

    let channel;
    if (rRange >= gRange && rRange >= bRange) channel = 0;
    else if (gRange >= bRange) channel = 1;
    else channel = 2;

    // پیکسل‌ها رو بر اساس اون کانال مرتب کن
    const sorted = [...box.pixels].sort((a, b) => a[channel] - b[channel]);

    const mid = Math.floor(sorted.length / 2);
    const left = sorted.slice(0, mid);
    const right = sorted.slice(mid);

    if (left.length === 0 || right.length === 0) return [null, null];

    return [createBox(left), createBox(right)];
}

function averageColor(pixels) {
    if (!pixels || pixels.length === 0) return null;
    let r = 0, g = 0, b = 0;
    for (const p of pixels) {
        r += p[0];
        g += p[1];
        b += p[2];
    }
    const n = pixels.length;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function rgbToHex(r, g, b) {
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
}

function luminance(rgb) {
    // فرمول استاندارد روشنایی
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/* ---------------- تبدیل‌های اضافی (برای نمایش) ---------------- */

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [
        Math.round(h * 360),
        Math.round(s * 100),
        Math.round(l * 100)
    ];
}