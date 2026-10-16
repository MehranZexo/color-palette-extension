/* =========================================================
   Service Worker — مدیریت Offscreen Document
   ========================================================= */

const OFFSCREEN_PATH = "offscreen/offscreen.html";
let creatingOffscreen = null;

/* ---------- باز کردن صفحه‌ی اصلی ---------- */
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("palette/palette.html")
    });
});

/* ---------- صبر کن Offscreen آماده بشه ---------- */
async function waitForOffscreenReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const res = await chrome.runtime.sendMessage({ type: "PING_OFFSCREEN" });
            if (res && res.ready) {
                console.log("[Background] Offscreen آماده شد بعد از", i * 100, "ms ✅");
                return true;
            }
        } catch (e) {
            // هنوز آماده نیست، ادامه بده
        }
        await new Promise(r => setTimeout(r, 100));
    }
    console.warn("[Background] Offscreen بعد از ۳ ثانیه آماده نشد ⚠️");
    return false;
}

/* ---------- ساخت/گرفتن Offscreen Document ---------- */
async function ensureOffscreenDocument() {
    // اگه از قبل هست، فقط صبر کن آماده بشه
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
    });

    if (existingContexts.length > 0) {
        await waitForOffscreenReady(10);
        return;
    }

    // اگه یه بار در حال ساخت هست، صبر کن
    if (creatingOffscreen) {
        await creatingOffscreen;
        await waitForOffscreenReady();
        return;
    }

    creatingOffscreen = chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ["WORKERS"],
        justification: "پردازش تصویر با WebGPU برای Upscale"
    });

    try {
        await creatingOffscreen;
        // 👇 این خط حیاتیه
        await waitForOffscreenReady();
    } finally {
        creatingOffscreen = null;
    }
}

/* ---------- گوش دادن به پیام‌های UI ---------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPSCALE_REQUEST") {
        (async () => {
            try {
                await ensureOffscreenDocument();

                // پیام رو به Offscreen بفرست
                const response = await chrome.runtime.sendMessage({
                    type: "UPSCALE_IMAGE",
                    imageData: message.imageData,        // 👈
                    imageWidth: message.imageWidth,      // 👈
                    imageHeight: message.imageHeight,    // 👈
                    scale: message.scale,
                    modelFile: message.modelFile
                });

                sendResponse(response);

            } catch (err) {
                console.error("[Background] خطا:", err);
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true;
    }
});

console.log("[Background] Service Worker لود شد 🚀");