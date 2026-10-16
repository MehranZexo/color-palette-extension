// ---------- گرفتن المان‌ها ----------
const dropZone = document.getElementById("dropZone");
const chooseBtn = document.getElementById("chooseBtn");
const fileInput = document.getElementById("fileInput");
const previewSection = document.getElementById("previewSection");
const previewCanvas = document.getElementById("previewCanvas");
const extractBtn = document.getElementById("extractBtn");
const resetBtn = document.getElementById("resetBtn");
const paletteSection = document.getElementById("paletteSection");
const paletteGrid = document.getElementById("paletteGrid");
const colorCountInput = document.getElementById("colorCount");
const colorCountLabel = document.getElementById("colorCountLabel");
const formatSwitch = document.getElementById("formatSwitch");
const downloadBtn = document.getElementById("downloadBtn");
// ---------- المان‌های فیلتر ----------
const filterBrightness = document.getElementById("filterBrightness");
const filterContrast = document.getElementById("filterContrast");
const filterSaturation = document.getElementById("filterSaturation");
const filterHue = document.getElementById("filterHue");
const filterSharpen = document.getElementById("filterSharpen");
const filterGrayscale = document.getElementById("filterGrayscale");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

const brightnessVal = document.getElementById("brightnessVal");
const contrastVal = document.getElementById("contrastVal");
const saturationVal = document.getElementById("saturationVal");
const hueVal = document.getElementById("hueVal");
const sharpenVal = document.getElementById("sharpenVal");

// ---------- المان‌های تغییر اندازه ----------
const resizeWidth = document.getElementById("resizeWidth");
const resizeHeight = document.getElementById("resizeHeight");
const lockAspect = document.getElementById("lockAspect");
const resizePresets = document.querySelectorAll(".resize-preset");
const downloadImageBtn = document.getElementById("downloadImageBtn");

// ---------- المان‌های Upscale ----------
const upscaleBtn = document.getElementById("upscaleBtn");
const upscaleStatus = document.getElementById("upscaleStatus");
const upscaleType = document.getElementById("upscaleType");


// ---------- وضعیت ----------
let currentPalette = [];       // آرایه‌ی رنگ‌های فعلی
let currentFormat = "hex";    // hex | rgb | hsl

// ---------- حالت فعلی ----------
// ---------- حالت فعلی ----------
let originalImage = null;     // عکس خام
let currentCanvas = null;     // Canvas فیلترشده (برای استخراج پالت)
let filterSettings = { ...DEFAULT_FILTERS };

// ---------- تنظیمات تغییر اندازه ----------
let resizeSettings = {
    width: 0,       // 0 = عرض اصلی
    height: 0,      // 0 = ارتفاع اصلی
    locked: true
};
let originalSize = { width: 0, height: 0 };

// ---------- انتخاب فایل از دکمه ----------
chooseBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // جلوگیری از دوبار باز شدن
    fileInput.click();
});

// کلیک روی کل باکس هم فایل رو باز کنه
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

// ---------- Drag & Drop ----------
["dragenter", "dragover"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
    });
});

["dragleave", "drop"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
    });
});

dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// ---------- پردازش فایل ----------
function handleFile(file) {
    if (!file.type.startsWith("image/")) {
        alert("لطفاً فقط فایل عکس انتخاب کن 🙏");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalSize = { width: img.naturalWidth, height: img.naturalHeight };
            resizeSettings.width = img.naturalWidth;
            resizeSettings.height = img.naturalHeight;
            syncResizeUI();
            resetFilters();       // فیلترها رو ریست کن
            renderFiltered();     // اولین بار پردازش کن
            showPreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ---------- نمایش/مخفی کردن بخش‌ها ----------
function showPreview() {
    dropZone.classList.add("hidden");
    previewSection.classList.remove("hidden");
    paletteSection.classList.add("hidden");
    paletteGrid.innerHTML = "";
}

function resetAll() {
    originalImage = null;
    currentCanvas = null;
    currentPalette = [];
    currentFormat = "hex";
    fileInput.value = "";
    filterSettings = { ...DEFAULT_FILTERS };
    resizeSettings = { width: 0, height: 0, locked: true };
    originalSize = { width: 0, height: 0 };
    syncFilterUI();

    // فرمت رو برگردون به HEX
    document.querySelectorAll(".format-btn").forEach(b => b.classList.remove("is-active"));
    const hexBtn = document.querySelector(".format-btn[data-format='hex']");
    if (hexBtn) hexBtn.classList.add("is-active");

    dropZone.classList.remove("hidden");
    previewSection.classList.add("hidden");
    paletteSection.classList.add("hidden");
    paletteGrid.innerHTML = "";
}

// ---------- دکمه‌ها ----------
// ---------- دکمه‌ها ----------
resetBtn.addEventListener("click", resetAll);

extractBtn.addEventListener("click", () => {
    if (!currentCanvas) return;
    runExtraction();
});

// وقتی اسلایدر تغییر کرد، اگه پالتی هست دوباره استخراج کن
colorCountInput.addEventListener("input", () => {
    colorCountLabel.textContent = colorCountInput.value;
});

colorCountInput.addEventListener("change", () => {
    if (currentCanvas && currentPalette.length > 0) {
        runExtraction();
    }
});

// تعویض فرمت
formatSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest(".format-btn");
    if (!btn) return;

    document.querySelectorAll(".format-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFormat = btn.dataset.format;

    // اگه پالتی نمایش داده شده، دوباره رندرش کن
    if (currentPalette.length > 0) renderPalette(currentPalette);
});

// دانلود
downloadBtn.addEventListener("click", downloadPaletteImage);

// ---------- اجرای استخراج ----------
function runExtraction() {
    if (!currentCanvas) return;

    extractBtn.disabled = true;
    extractBtn.textContent = "⏳ در حال پردازش...";

    setTimeout(() => {
        try {
            const count = parseInt(colorCountInput.value, 10);
            currentPalette = extractPalette(currentCanvas, count);
            renderPalette(currentPalette);
        } catch (err) {
            console.error(err);
            alert("خطا در پردازش عکس: " + err.message);
        } finally {
            extractBtn.disabled = false;
            extractBtn.textContent = "✨ استخراج پالت رنگ";
        }
    }, 30);
}

// ---------- نمایش پالت ----------
// ---------- نمایش پالت ----------
function renderPalette(palette) {
    paletteGrid.innerHTML = "";

    if (!palette || palette.length === 0) {
        paletteGrid.innerHTML = "<p style='color:#9aa3b2'>هیچ رنگی پیدا نشد 😕</p>";
        paletteSection.classList.remove("hidden");
        return;
    }

    palette.forEach((color) => {
        const [r, g, b] = color.rgb;
        const [h, s, l] = rgbToHsl(r, g, b);

        // متن نمایش داده شده بر اساس فرمت فعلی
        const displayText = formatColor(color, currentFormat);

        const card = document.createElement("div");
        card.className = "color-card";
        card.title = "برای کپی کلیک کن";

        const textColor = l > 60 ? "#111" : "#fff";

        card.innerHTML = `
      <div class="color-card__swatch" style="background:${color.hex};">
        <span class="color-card__copy" style="color:${textColor};">کپی</span>
      </div>
      <div class="color-card__info">
        <div class="color-card__hex">${displayText}</div>
        <div class="color-card__hsl">rgb(${r}, ${g}, ${b})</div>
      </div>
    `;

        card.addEventListener("click", () => {
            copyToClipboard(displayText, card);
        });

        paletteGrid.appendChild(card);
    });

    paletteSection.classList.remove("hidden");
}

// ---------- تبدیل فرمت رنگ ----------
function formatColor(color, format) {
    const [r, g, b] = color.rgb;
    const [h, s, l] = rgbToHsl(r, g, b);

    switch (format) {
        case "rgb": return `rgb(${r}, ${g}, ${b})`;
        case "hsl": return `hsl(${h}, ${s}%, ${l}%)`;
        case "hex":
        default: return color.hex.toUpperCase();
    }
}

// ---------- کپی در کلیپ‌بورد ----------
// ---------- کپی در کلیپ‌بورد ----------
async function copyToClipboard(text, cardEl) {
    try {
        await navigator.clipboard.writeText(text);

        const swatch = cardEl.querySelector(".color-card__copy");
        const original = swatch.textContent;
        swatch.textContent = "✓ کپی شد";
        cardEl.classList.add("copied");

        setTimeout(() => {
            swatch.textContent = original;
            cardEl.classList.remove("copied");
        }, 1200);
    } catch (err) {
        console.error("خطا در کپی:", err);
        alert("کپی نشد، دستی انتخاب کن: " + text);
    }
}

// ---------- دانلود پالت به صورت تصویر PNG ----------
function downloadPaletteImage() {
    if (!currentPalette || currentPalette.length === 0) {
        alert("اول پالت رو استخراج کن 🙏");
        return;
    }

    const SWATCH_W = 200;
    const SWATCH_H = 200;
    const INFO_H = 60;
    const PADDING = 20;
    const GAP = 12;
    const COLS = Math.min(currentPalette.length, 4);
    const ROWS = Math.ceil(currentPalette.length / COLS);

    const totalW = PADDING * 2 + COLS * SWATCH_W + (COLS - 1) * GAP;
    const totalH = PADDING * 2 + ROWS * (SWATCH_H + INFO_H) + (ROWS - 1) * GAP;

    const canvas = document.createElement("canvas");
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d");

    // پس‌زمینه
    ctx.fillStyle = "#0f1115";
    ctx.fillRect(0, 0, totalW, totalH);

    currentPalette.forEach((color, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);

        const x = PADDING + col * (SWATCH_W + GAP);
        const y = PADDING + row * (SWATCH_H + INFO_H + GAP);

        // مربع رنگ
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, y, SWATCH_W, SWATCH_H);

        // اطلاعات رنگ
        ctx.fillStyle = "#181b22";
        ctx.fillRect(x, y + SWATCH_H, SWATCH_W, INFO_H);

        const [r, g, b] = color.rgb;
        const [h, s, l] = rgbToHsl(r, g, b);

        ctx.fillStyle = "#e6e9ef";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const text = formatColor(color, currentFormat);
        ctx.fillText(text, x + SWATCH_W / 2, y + SWATCH_H + INFO_H / 2);
    });

    // دانلود
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `palette-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, "image/png");
}

/* =========================================================
   فیلترها
   ========================================================= */

// ---------- رندر عکس با تغییر اندازه + فیلترها ----------
function renderFiltered() {
    if (!originalImage) return;

    // ۱. تغییر اندازه
    const resized = resizeSource(
        originalImage,
        resizeSettings.width || originalSize.width,
        resizeSettings.height || originalSize.height
    );

    // ۲. اعمال فیلترها
    currentCanvas = applyFilters(resized, filterSettings, 4000);

    // ۳. نمایش روی canvas پیش‌نمایش
    previewCanvas.width = currentCanvas.width;
    previewCanvas.height = currentCanvas.height;
    const ctx = previewCanvas.getContext("2d");
    ctx.drawImage(currentCanvas, 0, 0);
}

// ---------- همگام‌سازی UI با state ----------
function syncFilterUI() {
    filterBrightness.value = filterSettings.brightness;
    filterContrast.value = filterSettings.contrast;
    filterSaturation.value = filterSettings.saturation;
    filterHue.value = filterSettings.hue;
    filterSharpen.value = filterSettings.sharpen;
    filterGrayscale.checked = filterSettings.grayscale;

    brightnessVal.textContent = filterSettings.brightness;
    contrastVal.textContent = filterSettings.contrast;
    saturationVal.textContent = filterSettings.saturation;
    hueVal.textContent = filterSettings.hue;
    sharpenVal.textContent = filterSettings.sharpen;
}

// ---------- ریست فیلترها ----------
function resetFilters() {
    filterSettings = { ...DEFAULT_FILTERS };
    syncFilterUI();
}

// ---------- رویدادها ----------
function bindFilterInput(inputEl, key, labelEl, suffix = "") {
    inputEl.addEventListener("input", () => {
        const val = parseInt(inputEl.value, 10) || 0;
        filterSettings[key] = val;
        if (labelEl) labelEl.textContent = val + suffix;
        renderFiltered();
    });
}

bindFilterInput(filterBrightness, "brightness", brightnessVal);
bindFilterInput(filterContrast, "contrast", contrastVal);
bindFilterInput(filterSaturation, "saturation", saturationVal);
bindFilterInput(filterHue, "hue", hueVal);
bindFilterInput(filterSharpen, "sharpen", sharpenVal);

filterGrayscale.addEventListener("change", () => {
    filterSettings.grayscale = filterGrayscale.checked;
    renderFiltered();
});

resetFiltersBtn.addEventListener("click", () => {
    resetFilters();
    renderFiltered();
});

/* =========================================================
   تغییر اندازه
   ========================================================= */

// ---------- همگام‌سازی UI ----------
function syncResizeUI() {
    resizeWidth.value = resizeSettings.width || "";
    resizeHeight.value = resizeSettings.height || "";
    lockAspect.checked = resizeSettings.locked;
}

// ---------- اعتبارسنجی و اعمال تغییر اندازه ----------
function applyResizeFromInputs(changedField) {
    let w = parseInt(resizeWidth.value, 10) || 0;
    let h = parseInt(resizeHeight.value, 10) || 0;

    // اگه قفل نسبت روشنه، اون یکی رو حساب کن
    if (resizeSettings.locked && originalSize.width && originalSize.height) {
        const ratio = originalSize.width / originalSize.height;

        if (changedField === "width" && w > 0) {
            h = Math.round(w / ratio);
            resizeHeight.value = h;
        } else if (changedField === "height" && h > 0) {
            w = Math.round(h * ratio);
            resizeWidth.value = w;
        }
    }

    resizeSettings.width = w || originalSize.width;
    resizeSettings.height = h || originalSize.height;

    renderFiltered();
}

// ---------- رویدادها ----------
resizeWidth.addEventListener("input", () => applyResizeFromInputs("width"));
resizeHeight.addEventListener("input", () => applyResizeFromInputs("height"));

lockAspect.addEventListener("change", () => {
    resizeSettings.locked = lockAspect.checked;
});

// پریست‌های درصدی
resizePresets.forEach(btn => {
    btn.addEventListener("click", () => {
        const scale = parseFloat(btn.dataset.scale);
        if (!originalSize.width || !originalSize.height) return;

        const w = Math.round(originalSize.width * scale);
        const h = Math.round(originalSize.height * scale);

        resizeWidth.value = w;
        resizeHeight.value = h;
        resizeSettings.width = w;
        resizeSettings.height = h;

        renderFiltered();
    });
});

/* =========================================================
   دانلود عکس نهایی
   ========================================================= */

function downloadFinalImage() {
    if (!currentCanvas) {
        alert("اول یه عکس بنداز 🙏");
        return;
    }

    // پیشنهاد فرمت بر اساس وجود شفافیت
    const format = "image/png"; // می‌تونی بعداً JPEG هم اضافه کنی
    const ext = "png";

    currentCanvas.toBlob((blob) => {
        if (!blob) {
            alert("خطا در تولید فایل 😕");
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `image-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }, format, 0.95);
}

downloadImageBtn.addEventListener("click", downloadFinalImage);


/* =========================================================
   Upscale با WebGPU + WebSR
   ========================================================= */

async function runUpscale() {
    if (!currentCanvas) {
        alert("اول یه عکس بنداز 🙏");
        return;
    }

    upscaleBtn.disabled = true;
    upscaleStatus.textContent = "⏳ در حال ارتقا...";
    upscaleStatus.className = "upscale__status is-loading";

    try {
        // ۱. Canvas رو به ArrayBuffer تبدیل کن (چون ImageBitmap قابل ارسال نیست)
        const blob = await new Promise(resolve => {
            currentCanvas.toBlob(resolve, "image/png");
        });
        const arrayBuffer = await blob.arrayBuffer();

        // ۲. انتخاب مدل
        const modelFileName =
            upscaleType.value === "an" ? "cnn-2x-s-an.json" : "cnn-2x-s-rl.json";

        // ۳. ارسال به Service Worker
        const response = await chrome.runtime.sendMessage({
            type: "UPSCALE_REQUEST",
            imageData: Array.from(new Uint8Array(arrayBuffer)),   // 👈 آرایه‌ی اعداد            imageWidth: currentCanvas.width,
            imageHeight: currentCanvas.height,
            scale: 2,
            modelFile: modelFileName
        });

        if (!response || !response.success) {
            throw new Error(response?.error || "پاسخ نامعتبر از Offscreen");
        }

        // ۴. نتیجه (ArrayBuffer) رو به Canvas تبدیل کن
        const uint8 = new Uint8Array(response.imageData);
        const resultBlob = new Blob([uint8], { type: response.mimeType || "image/png" });
        const resultBitmap = await createImageBitmap(resultBlob);

        const newCanvas = document.createElement("canvas");
        newCanvas.width = resultBitmap.width;
        newCanvas.height = resultBitmap.height;
        newCanvas.getContext("2d").drawImage(resultBitmap, 0, 0);

        currentCanvas = newCanvas;

        // ۵. پیش‌نمایش رو آپدیت کن
        previewCanvas.width = currentCanvas.width;
        previewCanvas.height = currentCanvas.height;
        previewCanvas.getContext("2d").drawImage(currentCanvas, 0, 0);

        originalSize = {
            width: currentCanvas.width,
            height: currentCanvas.height
        };
        resizeSettings.width = currentCanvas.width;
        resizeSettings.height = currentCanvas.height;
        syncResizeUI();

        upscaleStatus.textContent = `✅ شد! (${currentCanvas.width}×${currentCanvas.height})`;
        upscaleStatus.className = "upscale__status is-success";

        setTimeout(() => {
            upscaleStatus.textContent = "";
            upscaleStatus.className = "upscale__status";
        }, 3000);

    } catch (err) {
        console.error("[Upscale] خطا:", err);
        upscaleStatus.textContent = "❌ " + err.message;
        upscaleStatus.className = "upscale__status is-error";
    } finally {
        upscaleBtn.disabled = false;
    }
}
upscaleBtn.addEventListener("click", runUpscale);