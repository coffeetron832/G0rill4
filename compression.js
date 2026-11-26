// =============================================================================
// COMPRESIÓN Y LÓGICA DE TIPOS / COMPRESSION & FILE TYPES
// Los textos viven en uhoh-ah-ah.js (translations) y se leen con i18n().
// Audio (compressAudioFile) y LEVEL_PARAMS están en kong-engine.js.
// PNG se codifica en image-worker.js (fuera del hilo principal) y tiene respaldo local.
// Orden de carga: uhoh-ah-ah.js → kong-engine.js → compression.js → silverblack.js
// =============================================================================

const SUPPORTED_FORMATS = ['JPG', 'PNG', 'WEBP', 'PDF', 'MP3', 'WAV', 'SVG', 'JSON', 'CSV', 'TXT'];

const FORMAT_ICONS = {
  JPG: 'image',
  PNG: 'image',
  WEBP: 'image',
  PDF: 'file-text',
  MP3: 'music',
  WAV: 'music',
  SVG: 'file-code',
  JSON: 'file-json',
  CSV: 'file-spreadsheet',
  TXT: 'file-text'
};

const EXT_BY_TYPE = {
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'application/json': 'json',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'image/svg+xml': 'svg'
};

// Límite de píxeles: imágenes más grandes pueden agotar la memoria del navegador
const MAX_IMAGE_PIXELS = 50000000; // ~50 megapíxeles

// =============================================================================
// NIVELES DE COMPRESIÓN / COMPRESSION LEVELS
// =============================================================================

const LEVEL_KEYS = ['light', 'balanced', 'strong'];
const DEFAULT_LEVEL = 'balanced';
const LEVEL_STORAGE_KEY = 'gorilla-level';

// Tipos donde el nivel sí cambia el resultado: se prueban los tres y solo se habilitan los que reducen
const LEVEL_AWARE_KINDS = ['image'];
// Tipos donde probar los tres niveles sería muy costoso: se comprime solo al pulsar el botón
const DEFERRED_KINDS = ['audio'];

function getLevel() {
  try {
    const saved = localStorage.getItem(LEVEL_STORAGE_KEY);
    return LEVEL_KEYS.includes(saved) ? saved : DEFAULT_LEVEL;
  } catch (e) {
    return DEFAULT_LEVEL;
  }
}

function setLevel(level) {
  if (!LEVEL_KEYS.includes(level)) return;
  try {
    localStorage.setItem(LEVEL_STORAGE_KEY, level);
  } catch (e) {
    /* almacenamiento bloqueado */
  }
}

const i18n = (key) => (translations[currentLang] || translations.en)[key] || translations.en[key] || '';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const plainText = (text) => text.replace(/^[^\p{L}\p{N}¿¡]+/u, '').trim();

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function normalizeFormatToken(token) {
  if (!token) return '';
  const clean = token.toLowerCase().trim();
  if (clean === 'jpeg') return 'jpg';
  return clean;
}

function fileExt(name = '') {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return normalizeFormatToken(name.slice(dot + 1));
}

function resolveFileFormat(file) {
  if (!file) return '';
  const supportedLower = SUPPORTED_FORMATS.map((f) => f.toLowerCase());

  const ext = fileExt(file.name);
  if (supportedLower.includes(ext)) return ext;

  const byMime = normalizeFormatToken(EXT_BY_TYPE[(file.type || '').toLowerCase()]);
  if (byMime && supportedLower.includes(byMime)) return byMime;

  return '';
}

function isSupportedFile(file) {
  return Boolean(resolveFileFormat(file));
}

function isPngFile(file) {
  const fmt = resolveFileFormat(file);
  return fmt === 'png' || (file && (file.type || '').toLowerCase() === 'image/png');
}

function detectKind(file) {
  const fmt = resolveFileFormat(file);
  const type = (file && file.type ? file.type : '').toLowerCase();

  if (fmt === 'svg' || type === 'image/svg+xml') return 'svg';
  if (['jpg', 'png', 'webp'].includes(fmt) || type.startsWith('image/')) return 'image';
  if (fmt === 'pdf' || type === 'application/pdf') return 'pdf';
  if (['mp3', 'wav'].includes(fmt) || type.startsWith('audio/')) return 'audio';
  if (fmt === 'json' || type === 'application/json') return 'json';
  if (['csv', 'txt'].includes(fmt) || type.startsWith('text/')) return 'text';
  return null;
}

// Imágenes: "Equilibrado" es la recomendación; "Fuerte" solo si los demás no reducen
function preferredLevelOrder(file) {
  if (detectKind(file) === 'image') return ['balanced', 'light', 'strong'];
  return ['balanced', 'strong', 'light'];
}

function outputFileName(originalName, blob) {
  const newExt = EXT_BY_TYPE[(blob && blob.type ? blob.type : '').toLowerCase()];
  if (!newExt) return originalName;
  if (fileExt(originalName) === newExt) return originalName;

  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${base}.${newExt}`;
}

function downloadName(name) {
  return name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || 'file';
}

function getFileIcon(file) {
  const kind = detectKind(file);
  const fmt = resolveFileFormat(file);

  if (kind === 'image') return 'image';
  if (kind === 'pdf') return 'file-text';
  if (fmt === 'json') return 'file-json';
  if (fmt === 'csv') return 'file-spreadsheet';
  if (fmt === 'svg') return 'file-code';
  if (kind === 'text') return 'file-text';
  if (kind === 'audio') return 'music';

  return 'file';
}

function friendlyError(err) {
  if (err && err.code === 'UNSUPPORTED') return i18n('unsupportedError');
  if (err && err.code === 'TOO_LARGE_IMAGE') return i18n('imageTooLarge');
  if (err && err.code === 'EMPTY_RESULT') return i18n('emptyResult');
  if (/encrypted/i.test(String(err && err.message))) return i18n('encryptedPdf');
  return i18n('genericError');
}

function fileNote(file) {
  switch (detectKind(file)) {
    case 'image': return isPngFile(file) ? i18n('noteLossless') : i18n('noteLossy');
    case 'pdf': return i18n('notePdf');
    case 'audio': return i18n('noteMedia');
    case 'json':
    case 'svg':
    case 'text': return i18n('noteText');
    default: return '';
  }
}

// =============================================================================
// COMPRESIÓN POR TIPO / COMPRESSION BY TYPE
// =============================================================================

let upngWarned = false;
function warnUpngMissing() {
  if (upngWarned) return;
  upngWarned = true;
  console.warn('UPNG o pako no están disponibles: los PNG usan el método de respaldo. Revisa que pako y UPNG estén cargados en index.html.');
}

// Lee las dimensiones sin decodificar la imagen completa en el hilo principal
async function readImageSize(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { w: bitmap.width, h: bitmap.height };
    bitmap.close();
    return size;
  } catch (err) {
    return null;
  }
}

// ----- Worker de imágenes (solo PNG) -----
let imageWorker = null;
let imageWorkerFailed = false;
let imageWorkerSeq = 0;
const imageWorkerPending = new Map();

function getImageWorker() {
  if (imageWorkerFailed) return null;
  if (imageWorker) return imageWorker;
  if (typeof Worker === 'undefined') {
    imageWorkerFailed = true;
    return null;
  }
  try {
    imageWorker = new Worker('image-worker.js');
    imageWorker.onmessage = (event) => {
      const { id, blob, error } = event.data;
      const pending = imageWorkerPending.get(id);
      if (!pending) return;
      imageWorkerPending.delete(id);
      if (error) pending.reject(new Error(error));
      else pending.resolve(blob);
    };
    imageWorker.onerror = () => {
      // Si el worker se cae, se rechazan las tareas pendientes y se usa el hilo principal
      imageWorkerFailed = true;
      imageWorker.terminate();
      imageWorker = null;
      for (const pending of imageWorkerPending.values()) {
        pending.reject(new Error('image worker failed'));
      }
      imageWorkerPending.clear();
    };
    return imageWorker;
  } catch (err) {
    imageWorkerFailed = true;
    return null;
  }
}

// Devuelve una promesa con el PNG codificado, o null si el worker no está disponible
function runPngInWorker(file, level) {
  const worker = getImageWorker();
  if (!worker) return null;

  const id = ++imageWorkerSeq;
  const params = LEVEL_PARAMS[level] || LEVEL_PARAMS[DEFAULT_LEVEL];

  return new Promise((resolve, reject) => {
    imageWorkerPending.set(id, { resolve, reject });
    worker.postMessage({ id, file, level, params, mimeType: 'image/png' });
  });
}

// ----- Respaldo en el hilo principal (solo si el worker no existe o falló) -----
async function compressPngOnMainThread(file, level) {
  if (!window.UPNG || !window.pako || typeof window.UPNG.encode !== 'function') {
    warnUpngMissing();
    return null;
  }

  const p = LEVEL_PARAMS[level] || LEVEL_PARAMS[DEFAULT_LEVEL];
  const bitmap = await createImageBitmap(file);

  try {
    let targetW = bitmap.width;
    let targetH = bitmap.height;
    const maxSide = p.imgMaxSide;

    if (maxSide && Math.max(targetW, targetH) > maxSide) {
      const scale = maxSide / Math.max(targetW, targetH);
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    // 0 = sin cuantizar (sin pérdida); 256 y 128 colores reducen mucho más
    const cnum = level === 'light' ? 0 : level === 'balanced' ? 256 : 128;
    const encodedBuffer = window.UPNG.encode([imageData.data.buffer], targetW, targetH, cnum);

    return new Blob([encodedBuffer], { type: 'image/png' });
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

// PNG: worker → hilo principal → Compressor sin cuantizar (este último se marca como tal)
async function compressPng(file, level) {
  // 1) Worker: la codificación no bloquea la interfaz
  try {
    const fromWorker = runPngInWorker(file, level);
    if (fromWorker) {
      const blob = await fromWorker;
      if (blob && blob.size > 0 && blob.size < file.size) {
        blob.usedQuantization = level !== 'light';
        return blob;
      }
    }
  } catch (err) {
    console.warn('Image worker fallback:', err);
  }

  // 2) Hilo principal con UPNG
  try {
    const blob = await compressPngOnMainThread(file, level);
    if (blob && blob.size > 0 && blob.size < file.size) {
      blob.usedQuantization = level !== 'light';
      return blob;
    }
  } catch (err) {
    console.warn('UPNG fallback to Compressor:', err);
  }

  // 3) Último recurso: sin cuantización, marcado para que el selector no lo presente como reducción por nivel
  const fallback = await runCompressorJs(file, 'image/png', level);
  fallback.usedQuantization = false;
  return fallback;
}

function runCompressorJs(file, mimeType, level) {
  const p = LEVEL_PARAMS[level] || LEVEL_PARAMS[DEFAULT_LEVEL];

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: p.imgQuality,
      maxWidth: p.imgMaxSide,
      maxHeight: p.imgMaxSide,
      convertSize: Infinity,
      retainExif: false,
      strict: false,
      mimeType,
      success: resolve,
      error: reject,
    });
  });
}

// JPG y WEBP siguen en el hilo principal con Compressor.js
async function compressImage(file, level) {
  const dims = await readImageSize(file);
  if (dims && dims.w * dims.h > MAX_IMAGE_PIXELS) {
    throw Object.assign(new Error('too-many-pixels'), { code: 'TOO_LARGE_IMAGE' });
  }

  if (isPngFile(file)) return compressPng(file, level);

  const ext = resolveFileFormat(file);
  const mimeType = (ext === 'webp' || (file.type || '').toLowerCase() === 'image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  return runCompressorJs(file, mimeType, level);
}

async function compressPdf(file) {
  const doc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([bytes], { type: 'application/pdf' });
}

async function readUtf8(file) {
  const text = await file.text();
  if (text.includes('\uFFFD')) return null;
  return text.replace(/^\uFEFF/, '');
}

async function hasUtf8Bom(file) {
  const bytes = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

async function compressJson(file) {
  const text = await readUtf8(file);
  if (text === null) return file;

  try {
    return new Blob([JSON.stringify(JSON.parse(text))], { type: 'application/json' });
  } catch (err) {
    return file;
  }
}

async function compressSvg(file) {
  const text = await readUtf8(file);
  if (text === null) return file;

  const minified = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s*\n\s*</g, '><')
    .trim();

  return new Blob([minified], { type: 'image/svg+xml' });
}

function cleanTxt(text) {
  const out = [];
  let lastBlank = true;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[ \t]+$/, '');
    const blank = line === '';
    if (blank && lastBlank) continue;
    out.push(line);
    lastBlank = blank;
  }

  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

function cleanCsv(text) {
  const out = [];
  let inQuotes = false;

  for (const line of text.split(/\r?\n/)) {
    if (!inQuotes && line.trim() === '') continue;
    out.push(line);
    if ((line.match(/"/g) || []).length % 2 === 1) inQuotes = !inQuotes;
  }

  return out.join('\n');
}

async function compressText(file) {
  const text = await readUtf8(file);
  if (text === null) return file;

  const cleaned = resolveFileFormat(file) === 'csv' ? cleanCsv(text) : cleanTxt(text);
  const prefix = (await hasUtf8Bom(file)) ? '\uFEFF' : '';

  return new Blob([prefix + cleaned], { type: 'text/plain' });
}

async function compressFile(file, onProgress = () => {}, level = getLevel()) {
  const p = LEVEL_PARAMS[level] || LEVEL_PARAMS[DEFAULT_LEVEL];

  switch (detectKind(file)) {
    case 'image': return compressImage(file, level);
    case 'pdf': return compressPdf(file);
    case 'audio':
      onProgress({ phase: 'audio' });
      return compressAudioFile(file, p.audioKbps, (ratio) => onProgress({ ratio }));
    case 'json': return compressJson(file);
    case 'svg': return compressSvg(file);
    case 'text': return compressText(file);
    default: {
      const err = new Error('unsupported');
      err.code = 'UNSUPPORTED';
      throw err;
    }
  }
}

// Decide qué niveles mostrar según el tipo de archivo:
// - 'probed': imagen; se prueba cada nivel y solo se habilitan los que reducen de verdad.
// - 'deferred': audio; se habilitan los tres y se comprime al pulsar el botón.
// - 'none': PDF, JSON, SVG, TXT, CSV; el nivel no cambia nada, así que no hay selector.
async function probeCompressionLevels(file, isCancelled = () => false) {
  const kind = detectKind(file);

  if (!LEVEL_AWARE_KINDS.includes(kind)) {
    return { mode: DEFERRED_KINDS.includes(kind) ? 'deferred' : 'none', enabledLevels: [...LEVEL_KEYS], recommendedLevel: null, resultsByLevel: {} };
  }

  const enabledLevels = [];
  const resultsByLevel = {};
  const isPng = isPngFile(file);

  for (const level of LEVEL_KEYS) {
    if (isCancelled()) return null;
    try {
      const blob = await compressFile(file, () => {}, level);
      if (isCancelled()) return null;

      // Un resultado vacío nunca cuenta como reducción
      if (!blob || blob.size === 0) continue;

      const pctSaved = file.size > 0 ? Math.round((1 - blob.size / file.size) * 100) : 0;
      // En PNG, un nivel solo cuenta si cuantizó: si no, no es una diferencia real entre niveles
      const honest = !isPng || blob.usedQuantization === true || level === 'light';

      if (blob.size < file.size && pctSaved >= 1 && honest) {
        enabledLevels.push(level);
        resultsByLevel[level] = { blob, pctSaved };
      }
    } catch (_) {
      // Si un nivel falla o no reduce, simplemente no se habilita
    }
  }

  const recommendedLevel = preferredLevelOrder(file).find((l) => enabledLevels.includes(l)) || null;
  return { mode: 'probed', enabledLevels, recommendedLevel, resultsByLevel };
}