/**
 * Inlines all HTTP/HTTPS images in the given HTML string as base64 data URIs.
 * This guarantees the browser prints images even if cross-origin or on first load.
 */
async function inlineImages(html) {
  const urls = [
    ...new Set(
      [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((u) => /^https?:\/\//i.test(u))
    ),
  ];
  if (!urls.length) return html;
  let out = html;
  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      out = out.split(url).join(dataUri);
    } catch (e) {
      console.warn('[pdfHelper] failed to inline image', url, e);
    }
  }
  return out;
}

/**
 * Ensures images in the print window are fully loaded and decoded before triggering window.print().
 */
async function waitForImagesAndPrint(win) {
  try {
    await new Promise((r) => setTimeout(r, 200));
    let imgs = win.document.images;
    for (let i = 0; i < 5 && (!imgs || imgs.length === 0); i++) {
      await new Promise((r) => setTimeout(r, 80));
      imgs = win.document.images;
    }
    if (!imgs || imgs.length === 0) {
      win.focus();
      win.print();
      return;
    }
    await Promise.race([
      Promise.all(
        Array.from(imgs).map((img) => {
          if (img.complete && img.naturalWidth > 0) {
            return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
          }
          return new Promise((resolve) => {
            const done = () => {
              if (img.decode) img.decode().then(resolve).catch(resolve);
              else resolve();
            };
            img.onload = done;
            img.onerror = done;
            if (img.complete) done();
          });
        })
      ),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    win.focus();
    await new Promise((r) => setTimeout(r, 150));
    win.print();
  } catch {
    try {
      win.focus();
      win.print();
    } catch {}
  }
}

/**
 * Downloads / prints a receipt by opening a print window with inlined base64 images.
 */
export async function printReceiptHtml(html) {
  try {
    const inlined = await inlineImages(html);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(inlined);
      win.document.close();
      await waitForImagesAndPrint(win);
    }
  } catch (e) {
    console.error('[pdfHelper] printReceiptHtml error:', e);
  }
}
