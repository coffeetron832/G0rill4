// Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Constantes globales de configuración
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Mapa de traducciones para el tooltip
const BANANA_I18N = {
  es: '¡Arrástrame hacia el gorila!',
  en: 'Drag me to the gorilla!',
  pt: 'Arraste-me para o gorila!',
  fr: 'Faites-moi glisser vers le gorille!',
  de: 'Zieh mich zum Gorilla!'
};

// --- Web Audio API Synth ---
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSquishSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Oscilador de Impacto
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.12);

    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);

    // Ruido Blanco para crujido
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.15);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);

  } catch (e) {
    console.warn('Audio Context error:', e);
  }
}

function playEatSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn('Audio Context error:', e);
  }
}

// --- Helpers para compresión y procesamiento ---

async function compressAudioFile(file, targetBitrate = 128) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, targetBitrate);

  const sampleLength = audioBuffer.length;
  const leftSamples = audioBuffer.getChannelData(0);
  const rightSamples = numChannels > 1 ? audioBuffer.getChannelData(1) : leftSamples;

  const leftInt16 = new Int16Array(sampleLength);
  const rightInt16 = new Int16Array(sampleLength);

  for (let i = 0; i < sampleLength; i++) {
    let sL = leftSamples[i];
    leftInt16[i] = sL < 0 ? sL * 32768 : sL * 32767;

    if (numChannels > 1) {
      let sR = rightSamples[i];
      rightInt16[i] = sR < 0 ? sR * 32768 : sR * 32767;
    }
  }

  const mp3Data = [];
  const chunkSize = 1152;
  const yieldInterval = 100;
  let chunksProcessed = 0;

  for (let i = 0; i < sampleLength; i += chunkSize) {
    const leftChunk = leftInt16.subarray(i, i + chunkSize);
    let mp3buf;

    if (numChannels > 1) {
      const rightChunk = rightInt16.subarray(i, i + chunkSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    chunksProcessed++;
    if (chunksProcessed % yieldInterval === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) mp3Data.push(endBuf);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

let ffmpegInstance = null;

async function compressVideoFile(file) {
  const { createFFmpeg, fetchFile } = FFmpeg;
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({ log: false });
    await ffmpegInstance.load();
  }

  const inputName = 'input_' + Date.now() + '_' + file.name;
  const outputName = 'compressed_' + Date.now() + '.mp4';

  ffmpegInstance.FS('writeFile', inputName, await fetchFile(file));

  await ffmpegInstance.run(
    '-i', inputName,
    '-vf', "scale='min(720,iw)':-2",
    '-crf', '28',
    '-preset', 'ultrafast',
    outputName
  );

  const data = ffmpegInstance.FS('readFile', outputName);

  ffmpegInstance.FS('unlink', inputName);
  ffmpegInstance.FS('unlink', outputName);

  return new Blob([data.buffer], { type: 'video/mp4' });
}

async function compressImageFile(file, quality = 0.75, maxWidth = 1920) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al comprimir la imagen.'));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen.'));
    };

    img.src = url;
  });
}

// --- Clase Motor de Físicas del Banano ---
class BananaPhysics {
  constructor(canvasId, lang = 'es') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9998';

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    this.currentLang = lang;
    this.x = 0;
    this.y = -50;
    this.vx = 0;
    this.vy = 0;
    this.radius = 24;
    this.gravity = 0.6;
    this.bounce = -0.55;
    this.friction = 0.98;

    this.isDragging = false;
    this.isEaten = true;
    this.animId = null;
    this.gorillaEl = null;
    this.lastTime = 0;

    this.createTooltip();

    window.addEventListener('resize', () => this.resizeCanvas());
    this.bindGlobalEvents();
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'bananaTooltip';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '9999';
    this.tooltip.style.background = 'rgba(0, 0, 0, 0.75)';
    this.tooltip.style.color = '#fff';
    this.tooltip.style.padding = '4px 8px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.fontWeight = 'bold';
    this.tooltip.style.whiteSpace = 'nowrap';
    this.tooltip.style.opacity = '0';
    this.tooltip.style.transition = 'opacity 0.2s ease';
    this.updateLanguage(this.currentLang);
    document.body.appendChild(this.tooltip);
  }

  updateLanguage(lang) {
    this.currentLang = lang;
    if (this.tooltip) {
      this.tooltip.innerHTML = BANANA_I18N[lang] || BANANA_I18N['es'];
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawn(gorillaElement) {
    this.gorillaEl = gorillaElement;
    this.x = Math.random() * (this.canvas.width - 120) + 60;
    this.y = -40;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = 2;
    this.isEaten = false;
    this.isDragging = false;
    this.lastTime = performance.now();

    if (this.tooltip) this.tooltip.style.opacity = '0';

    if (!this.animId) this.loop(performance.now());
  }

  bindGlobalEvents() {
    const getPos = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX, y: clientY };
    };

    const startDrag = (e) => {
      if (this.isEaten) return;
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - this.x, pos.y - this.y);
      if (dist < this.radius + 15) {
        this.isDragging = true;
        this.dragOffsetX = pos.x - this.x;
        this.dragOffsetY = pos.y - this.y;

        if (this.tooltip) this.tooltip.style.opacity = '0';

        if (e.cancelable) e.preventDefault();
        if (window.getSelection) window.getSelection().removeAllRanges();
      }
    };

    const moveDrag = (e) => {
      if (this.isDragging) {
        const pos = getPos(e);
        this.vx = (pos.x - this.dragOffsetX - this.x) * 0.3;
        this.vy = (pos.y - this.dragOffsetY - this.y) * 0.3;
        this.x = pos.x - this.dragOffsetX;
        this.y = pos.y - this.dragOffsetY;

        if (e.cancelable) e.preventDefault();
      }
    };

    const stopDrag = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    window.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
  }

  checkGorillaCollision() {
    if (!this.gorillaEl || this.isEaten) return;

    const rect = this.gorillaEl.getBoundingClientRect();
    if (
      this.x > rect.left - 10 &&
      this.x < rect.right + 10 &&
      this.y > rect.top - 10 &&
      this.y < rect.bottom + 10
    ) {
      this.isEaten = true;
      this.triggerGorillaEatEffect();
    }
  }

  triggerGorillaEatEffect() {
    playEatSound();

    if (this.tooltip) this.tooltip.style.opacity = '0';

    if (this.gorillaEl) {
      this.gorillaEl.style.transform = 'scale(1.4)';
      this.gorillaEl.style.transition = 'transform 0.2s ease';
    }

    setTimeout(() => {
      if (this.gorillaEl) this.gorillaEl.style.transform = 'scale(1)';
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }, 400);
  }

  update(dt) {
    if (this.isEaten) return;

    const factor = Math.min(dt / 16.66, 2.0);

    if (!this.isDragging) {
      this.vy += this.gravity * factor;
      this.vx *= Math.pow(this.friction, factor);
      this.vy *= Math.pow(this.friction, factor);

      this.x += this.vx * factor;
      this.y += this.vy * factor;

      const floor = this.canvas.height - this.radius - 10;
      if (this.y >= floor) {
        this.y = floor;
        this.vy *= this.bounce;

        if (this.tooltip && !this.isDragging) this.tooltip.style.opacity = '1';
      }

      if (this.x < this.radius || this.x > this.canvas.width - this.radius) {
        this.vx *= -1;
      }
    }

    if (this.tooltip) {
      this.tooltip.style.left = `${this.x}px`;
      this.tooltip.style.top = `${this.y - 45}px`;
      this.tooltip.style.transform = 'translateX(-50%)';
    }

    this.checkGorillaCollision();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.isEaten) {
      this.ctx.font = '30px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🍌', this.x, this.y);
    }
  }

  loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt || 16.66);
    this.draw();

    if (!this.isEaten) {
      this.animId = requestAnimationFrame((t) => this.loop(t));
    } else {
      this.animId = null;
    }
  }
}

// Instancia global de la física
const bananaSystem = new BananaPhysics('physicsCanvas', 'es');

// --- Helper Utilities ---
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function getFileEmoji(file) {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return '📕';
  if (
    type.startsWith('text/') || name.endsWith('.json') ||
    name.endsWith('.csv') || name.endsWith('.svg') ||
    name.endsWith('.xml') || name.endsWith('.js') || name.endsWith('.py')
  ) return '📝';
  if (type.startsWith('audio/')) return '🎵';
  if (type.startsWith('video/')) return '🎬';
  if (
    name.endsWith('.zip') || name.endsWith('.tar') ||
    name.endsWith('.gz') || name.endsWith('.rar') || name.endsWith('.7z')
  ) return '📦';

  return '📄';
}

function formatBytes(bytes) {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// --- Controlador Principal (KongEngine) ---
class KongEngine {
  constructor() {
    this.filesList = [];
    this.generatedZipBlob = null;
    this.isZipMode = false;

    this.initElements();
    this.bindEvents();
    this.updateModeUI();
  }

  initElements() {
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('fileInput');
    this.fileListContainer = document.getElementById('fileList');
    this.gorillaIcon = document.getElementById('gorillaIcon');

    // Vistas y Contenedores
    this.initialView = document.getElementById('initialView');
    this.processView = document.getElementById('processView');
    this.downloadView = document.getElementById('downloadView');

    // Elementos dinámicos de texto dentro de las vistas
    this.dropzoneTitle = document.querySelector('#dropzone [data-i18n="dragDropTitle"]') || document.querySelector('#dropzone h3');
    this.dropzoneSubtitle = document.querySelector('#dropzone [data-i18n="dragDropSubtitle"]') || document.querySelector('#dropzone p');
    this.dropzoneIcon = document.querySelector('#dropzone .dropzone-icon');
    this.processTitle = document.querySelector('#processView h2');

    // Opciones de Modo
    this.switchQuestionZip = document.getElementById('switchQuestionZip');
    this.switchQuestionCompress = document.getElementById('switchQuestionCompress');
    this.switchToZipBtn = document.getElementById('switchToZipBtn');
    this.switchToCompressBtn = document.getElementById('switchToCompressBtn');

    // Botones de Acción
    this.btnAddMore = document.getElementById('btnAddMore'); // Botón opcional para añadir más archivos desde la lista
    this.btnCompress = document.getElementById('btnCompress');
    this.btnDownload = document.getElementById('btnDownload');
    this.btnReset = document.getElementById('btnReset');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    this.zipStats = document.getElementById('zipStats');
  }

  bindEvents() {
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileSelect(e.target.files);
          e.target.value = ''; // Se limpia el valor del input para detectar nuevas elecciones continuas
        }
      });
    }

    if (this.dropzone) {
      this.dropzone.addEventListener('click', () => this.fileInput.click());

      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('dragover');
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileSelect(e.dataTransfer.files);
        }
      });
    }

    if (this.btnAddMore) {
      this.btnAddMore.addEventListener('click', () => this.fileInput.click());
    }

    // Eventos para cambiar de modo
    if (this.switchToZipBtn) {
      this.switchToZipBtn.addEventListener('click', () => {
        this.isZipMode = true;
        this.updateModeUI();
      });
    }

    if (this.switchToCompressBtn) {
      this.switchToCompressBtn.addEventListener('click', () => {
        this.isZipMode = false;
        this.updateModeUI();
      });
    }

    if (this.btnCompress) {
      this.btnCompress.addEventListener('click', () => this.processAndZipFiles());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.triggerDownload());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.resetUI());
    }
  }

  updateModeUI() {
    // 1. Configurar selección de archivos múltiples o individual
    if (this.fileInput) {
      if (this.isZipMode) {
        this.fileInput.setAttribute('multiple', 'true');
      } else {
        this.fileInput.removeAttribute('multiple');
      }
    }

    // 2. Alternar la pregunta del selector de modo
    if (this.switchQuestionZip && this.switchQuestionCompress) {
      if (this.isZipMode) {
        this.switchQuestionZip.classList.add('hidden');
        this.switchQuestionCompress.classList.remove('hidden');
      } else {
        this.switchQuestionZip.classList.remove('hidden');
        this.switchQuestionCompress.classList.add('hidden');
      }
    }

    // 3. Adaptar la interfaz y textos de las vistas según el modo activo
    if (this.isZipMode) {
      if (this.dropzone) {
        this.dropzone.classList.add('mode-zip');
        this.dropzone.classList.remove('mode-compress');
      }
      if (this.dropzoneTitle) {
        this.dropzoneTitle.textContent = 'Arrastra tus archivos para empaquetarlos';
      }
      if (this.dropzoneSubtitle) {
        this.dropzoneSubtitle.textContent = 'Selecciona múltiples archivos para unir en un comprimido .ZIP';
      }
      if (this.btnCompress) {
        this.btnCompress.textContent = 'Crear archivo .ZIP';
      }
      if (this.processTitle) {
        this.processTitle.textContent = 'Archivos seleccionados para el paquete';
      }
      if (this.dropzoneIcon) {
        this.dropzoneIcon.textContent = '📦';
      }
    } else {
      if (this.dropzone) {
        this.dropzone.classList.add('mode-compress');
        this.dropzone.classList.remove('mode-zip');
      }
      if (this.dropzoneTitle) {
        this.dropzoneTitle.textContent = 'Arrastra tu archivo aquí';
      }
      if (this.dropzoneSubtitle) {
        this.dropzoneSubtitle.textContent = 'Selecciona un archivo individual para reducir su peso';
      }
      if (this.btnCompress) {
        this.btnCompress.textContent = 'Reducir peso';
      }
      if (this.processTitle) {
        this.processTitle.textContent = 'Archivo a procesar';
      }
      if (this.dropzoneIcon) {
        this.dropzoneIcon.textContent = '📁';
      }
    }
  }

  handleFileSelect(files) {
    const rawFiles = this.isZipMode ? Array.from(files) : [files[0]];

    const validFiles = rawFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`El archivo "${file.name}" supera el límite permitido de ${MAX_FILE_SIZE_MB}MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (this.isZipMode) {
      this.filesList = [...this.filesList, ...validFiles];
    } else {
      this.filesList = [validFiles[0]];
    }

    playSquishSound();
    bananaSystem.spawn(this.gorillaIcon);

    this.renderFileList();
    this.switchView('process');
  }

  removeFile(index) {
    this.filesList.splice(index, 1);
    if (this.filesList.length === 0) {
      this.resetUI();
    } else {
      this.renderFileList();
    }
  }

  renderFileList() {
    if (!this.fileListContainer) return;
    this.fileListContainer.innerHTML = '';

    this.filesList.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="file-icon">${getFileEmoji(file)}</span>
        <div class="file-info">
          <div class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</div>
          <div class="file-size">${formatBytes(file.size)}</div>
        </div>
        <button class="btn-remove" data-index="${index}">&times;</button>
      `;

      item.querySelector('.btn-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFile(parseInt(e.target.getAttribute('data-index'), 10));
      });

      this.fileListContainer.appendChild(item);
    });
  }

  switchView(viewName) {
    if (this.initialView) this.initialView.style.display = viewName === 'initial' ? 'block' : 'none';
    if (this.processView) this.processView.style.display = viewName === 'process' ? 'block' : 'none';
    if (this.downloadView) this.downloadView.style.display = viewName === 'download' ? 'block' : 'none';
  }

  async processAndZipFiles() {
    if (this.filesList.length === 0) return;

    this.btnCompress.disabled = true;
    if (this.progressContainer) this.progressContainer.style.display = 'block';

    const zip = new JSZip();
    const totalFiles = this.filesList.length;
    let originalTotalSize = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = this.filesList[i];
      originalTotalSize += file.size;

      const progress = Math.round(((i) / totalFiles) * 70);
      this.updateProgress(progress, `Procesando (${i + 1}/${totalFiles}): ${file.name}`);

      let processedBlob = file;
      const sanitizedName = sanitizeFilename(file.name);

      try {
        if (file.type.startsWith('image/')) {
          processedBlob = await compressImageFile(file);
        } else if (file.type.startsWith('audio/')) {
          processedBlob = await compressAudioFile(file);
        } else if (file.type.startsWith('video/')) {
          processedBlob = await compressVideoFile(file);
        }
      } catch (err) {
        console.warn(`Fallback al archivo original para ${file.name}:`, err);
      }

      zip.file(sanitizedName, processedBlob);
    }

    this.updateProgress(75, 'Generando paquete .ZIP...');

    try {
      this.generatedZipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        const zipProgress = 75 + Math.round((metadata.percent * 0.25));
        this.updateProgress(zipProgress, `Empacando... ${Math.round(metadata.percent)}%`);
      });

      const compressedSize = this.generatedZipBlob.size;
      const savings = Math.max(0, originalTotalSize - compressedSize);
      const savingsPercent = originalTotalSize > 0 ? ((savings / originalTotalSize) * 100).toFixed(1) : 0;

      if (this.zipStats) {
        this.zipStats.innerHTML = `
          <p><strong>Tamaño original:</strong> ${formatBytes(originalTotalSize)}</p>
          <p><strong>Tamaño final ZIP:</strong> ${formatBytes(compressedSize)}</p>
          <p><strong>Ahorro total:</strong> ${formatBytes(savings)} (${savingsPercent}%)</p>
        `;
      }

      playSquishSound();
      this.switchView('download');
    } catch (error) {
      console.error('Error al generar el ZIP:', error);
      alert('Ocurrió un error inesperado al comprimir los archivos.');
    } finally {
      this.btnCompress.disabled = false;
      if (this.progressContainer) this.progressContainer.style.display = 'none';
    }
  }

  updateProgress(percentage, text) {
    if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
    if (this.progressText) this.progressText.innerText = text;
  }

  triggerDownload() {
    if (!this.generatedZipBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.generatedZipBlob);
    link.download = `kong_compressed_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  resetUI() {
    this.filesList = [];
    this.generatedZipBlob = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.fileListContainer) this.fileListContainer.innerHTML = '';
    if (this.progressContainer) this.progressContainer.style.display = 'none';
    if (this.progressBar) this.progressBar.style.width = '0%';

    this.switchView('initial');
    this.updateModeUI();
  }
}

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.kongEngine = new KongEngine();
});
