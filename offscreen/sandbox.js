/* =========================================================
   Sandbox — اجرای WebSR در محیط ایزوله
   ========================================================= */

console.log('[Sandbox] WebSR type:', typeof WebSR);
console.log('[Sandbox] WebSR keys:', Object.keys(WebSR || {}));

const canvas = document.getElementById('sandboxCanvas');

let websr = null;
let gpu = null;
let currentModel = null;

/* ---------- مقداردهی اولیه WebSR ---------- */
async function initWebSR(modelFileName, weights) {
    if (!navigator.gpu) {
        throw new Error('WebGPU در دسترس نیست. از Chrome 113+ استفاده کن.');
    }

    if (!gpu) {
        gpu = await WebSR.initWebGPU();
        if (!gpu) throw new Error('GPU adapter پیدا نشد.');
    }

    websr = new WebSR({
        network_name: 'anime4k/cnn-2x-s',
        weights,
        gpu,
        canvas
    });

    currentModel = modelFileName;
    console.log('[Sandbox] WebSR آماده شد با مدل:', modelFileName, '✅');
    return true;
}

/* ---------- پردازش عکس ---------- */
async function processImage(imageBitmap, modelFile, weights) {
    // ۱. canvas رو با ابعاد عکس جدید تنظیم کن
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    // ۲. همه‌چیز رو ریست کن (مهم!)
    websr = null;
    currentModel = null;
    gpu = null;

    // ۳. WebSR جدید بساز
    await initWebSR(modelFile, weights);

    // ۴. پردازش
    await websr.render(imageBitmap);

    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
    });

    return blob;
}

/* ---------- گوش دادن به پیام‌های Offscreen ---------- */
window.addEventListener('message', async (event) => {
    if (event.data.type === 'UPSCALE_IMAGE') {
        try {
            // ArrayBuffer → Blob → ImageBitmap
            const blob = new Blob([event.data.imageData], { type: 'image/png' });
            const imageBitmap = await createImageBitmap(blob);

            const resultBlob = await processImage(
                imageBitmap,
                event.data.modelFile,
                event.data.weights
            );

            const resultArrayBuffer = await resultBlob.arrayBuffer();

            event.source.postMessage({
                type: 'UPSCALE_RESULT',
                id: event.data.id,
                success: true,
                imageData: resultArrayBuffer,
                mimeType: 'image/png'
            }, '*', [resultArrayBuffer]);

        } catch (err) {
            console.error('[Sandbox] خطا:', err);
            event.source.postMessage({
                type: 'UPSCALE_RESULT',
                id: event.data.id,
                success: false,
                error: err.message
            }, '*');
        }
    }
});

console.log('[Sandbox] Sandbox لود شد 🎬');