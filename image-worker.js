// =============================================================================
// WORKER DE IMÁGENES / IMAGE WORKER
// Codifica PNG (UPNG) fuera del hilo principal.
// Verifica el SHA-384 de cada librería antes de ejecutarla (importScripts no admite SRI).
// =============================================================================

self.window = self;

const WORKER_LIBS = [
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
    sha384: 'rNlaE5fs9dGIjmxWDALQh/RBAaGRYT5ChrzHo6tRfgrZ36iRFAiquP5g41Jsv+0j'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/upng-js/2.1.0/UPNG.min.js',
    sha384: 'ZL3zm2yr6WhKklr+limPN2KaWCW0x8rd9QIg3jabcFyrF6wB/h7VgythzrDTAI2O'
  }
];

async function loadVerifiedScript({ url, sha384 }) {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error(`No se pudo descargar ${url}`);

  const buffer = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-384', buffer);
  const actual = btoa(String.fromCharCode(...new Uint8Array(digest)));

  if (actual !== sha384) {
    throw new Error(`Hash no coincide para ${url}`);
  }

  // Ejecuta el código ya verificado
  const code = new TextDecoder().decode(buffer);
  (0, eval)(code);
}

let libsReady = null;
function ensureLibs() {
  if (!libsReady) {
    libsReady = (async () => {
      for (const lib of WORKER_LIBS) {
        await loadVerifiedScript(lib);
      }
      if (typeof self.UPNG === 'undefined' || typeof self.UPNG.encode !== 'function') {
        throw new Error('UPNG no quedó disponible tras verificar');
      }
    })();
    // Si falla, el siguiente intento vuelve a comprobar
    libsReady.catch(() => { libsReady = null; });
  }
  return libsReady;
}

function scaleSize(width, height, maxSide) {
  if (!maxSide || Math.max(width, height) <= maxSide) return { w: width, h: height };
  const s = maxSide / Math.max(width, height);
  return {
    w: Math.max(1, Math.round(width * s)),
    h: Math.max(1, Math.round(height * s))
  };
}

self.onmessage = async (event) => {
  const { id, file, level, params } = event.data;

  try {
    await ensureLibs();

    const bitmap = await createImageBitmap(file);
    const { w, h } = scaleSize(bitmap.width, bitmap.height, params.imgMaxSide);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const cnum = level === 'light' ? 0 : level === 'balanced' ? 256 : 128;
    const imageData = ctx.getImageData(0, 0, w, h);
    const encoded = self.UPNG.encode([imageData.data.buffer], w, h, cnum);

    self.postMessage({ id, blob: new Blob([encoded], { type: 'image/png' }) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};