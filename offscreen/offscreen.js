/* =========================================================
   Offscreen — پل ارتباطی بین Service Worker و Sandbox
   ========================================================= */

console.log('[Offscreen] اسکریپت شروع شد 🎬');
console.log('[Offscreen] typeof chrome:', typeof chrome);
console.log('[Offscreen] chrome?.runtime:', typeof chrome?.runtime);

let iframe = null;
let messageId = 0;
const pendingMessages = new Map();

/* ---------- گوش دادن به نتیجه از Sandbox ---------- */
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPSCALE_RESULT') {
        const resolve = pendingMessages.get(event.data.id);
        if (resolve) {
            // 👇 ArrayBuffer رو به آرایه تبدیل کن (چون chrome.runtime.sendMessage سریالایز می‌کنه)
            const data = event.data;
            if (data.success && data.imageData instanceof ArrayBuffer) {
                data.imageData = Array.from(new Uint8Array(data.imageData));
            }
            resolve(data);
            pendingMessages.delete(event.data.id);
        }
    }
});

/* ---------- ارسال درخواست به Sandbox ---------- */
async function processImageViaSandbox(imageData, imageWidth, imageHeight, modelFile) {
    if (!iframe) {
        iframe = document.getElementById('sandboxFrame');
    }
    if (!iframe) throw new Error('Sandbox iframe توی DOM پیدا نشد.');
    if (!iframe.contentWindow) throw new Error('Sandbox iframe هنوز آماده نیست.');

    // ۱. وزن‌ها رو از اینجا لود کن
    const weightsUrl = chrome.runtime.getURL('lib/weights/' + modelFile);
    console.log('[Offscreen] لود وزن‌ها از:', weightsUrl);
    const weights = await (await fetch(weightsUrl)).json();

    // ۲. آرایه‌ی اعداد رو به ArrayBuffer تبدیل کن
    const imageArrayBuffer = new Uint8Array(imageData).buffer;
    console.log('[Offscreen] imageData length:', imageData.length, 'arrayBuffer size:', imageArrayBuffer.byteLength);

    // ۳. به sandbox بفرست (با transferable)
    const id = messageId++;
    return new Promise((resolve) => {
        pendingMessages.set(id, resolve);
        iframe.contentWindow.postMessage({
            type: 'UPSCALE_IMAGE',
            id,
            imageData: imageArrayBuffer,     // 👈 ArrayBuffer واقعی
            imageWidth,
            imageHeight,
            modelFile,
            weights
        }, '*', [imageArrayBuffer]);          // 👈 حالا واقعاً transferable
    });
}

/* ---------- ثبت listener (با چک امنیتی) ---------- */
function setupRuntimeListener() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
        console.error('[Offscreen] ❌ chrome.runtime در دسترس نیست. ۵۰۰ms دیگه تلاش می‌کنم...');
        setTimeout(setupRuntimeListener, 500);
        return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

        if (message.type === 'PING_OFFSCREEN') {
            sendResponse({ ready: true });
            return false;
        }

        if (message.type === 'CHECK_WEBGPU') {
            sendResponse({ supported: !!navigator.gpu });
            return false;
        }

        if (message.type === 'UPSCALE_IMAGE') {
            (async () => {
                try {
                    const result = await processImageViaSandbox(
                        message.imageData,          // 👈 اصلاح شد
                        message.imageWidth,         // 👈 جدید
                        message.imageHeight,        // 👈 جدید
                        message.modelFile || 'cnn-2x-s-rl.json'
                    );
                    sendResponse(result);
                } catch (err) {
                    console.error('[Offscreen] خطا:', err);
                    sendResponse({ success: false, error: err.message });
                }
            })();

            return true;
        }
    });

    console.log('[Offscreen] ✅ Listener با موفقیت ثبت شد');
}

setupRuntimeListener();