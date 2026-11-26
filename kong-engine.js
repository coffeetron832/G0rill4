// =============================================================================
// 1. CONFIGURACIÓN INICIAL / INITIAL CONFIG
// =============================================================================

// Worker de PDF.js / PDF.js Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Constantes globales de configuración / Global configuration constants
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Parámetros de cada nivel de compresión (los usan imágenes y audio)
const LEVEL_PARAMS = {
  light:    { imgQuality: 0.85, imgMaxSide: 2560, audioKbps: 192 },
  balanced: { imgQuality: 0.7,  imgMaxSide: 1920, audioKbps: 128 },
  strong:   { imgQuality: 0.5,  imgMaxSide: 1280, audioKbps: 96 }
};

const BANANA_I18N = {
  en: 'Drag me to the gorilla!',
  es: '¡Arrástrame hacia el gorila!',
  pt: 'Arraste-me para o gorila!',
  fr: 'Faites-moi glisser vers le gorille!',
  de: 'Zieh mich zum Gorilla!',
  it: 'Trascinami verso il gorilla!',
  vi: 'Kéo tôi đến chỗ chú khỉ đột!'
};

// =============================================================================
// 2. SINTETIZADOR DE AUDIO / WEB AUDIO API SYNTH (SINGLETON)
// Solo se usa el sonido al comer el plátano.
// =============================================================================

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

// =============================================================================
// 3. COMPRESIÓN DE AUDIO / AUDIO COMPRESSION HELPERS
// =============================================================================

// onProgress recibe un número de 0 a 1 mientras codifica
async function compressAudioFile(file, targetBitrate = 128, onProgress = () => {}) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, targetBitrate);

  const sampleLength = audioBuffer.length;
  const leftSamples = audioBuffer.getChannelData(0);
  const rightSamples = numChannels > 1 ? audioBuffer.getChannelData(1) : leftSamples;

  const mp3Data = [];
  const chunkSize = 1152;
  const leftChunkInt = new Int16Array(chunkSize);
  const rightChunkInt = new Int16Array(chunkSize);

  let yieldCounter = 0;

  for (let i = 0; i < sampleLength; i += chunkSize) {
    const currentBlockSize = Math.min(chunkSize, sampleLength - i);

    for (let j = 0; j < currentBlockSize; j++) {
      const sL = leftSamples[i + j];
      leftChunkInt[j] = sL < 0 ? sL * 32768 : sL * 32767;

      if (numChannels > 1) {
        const sR = rightSamples[i + j];
        rightChunkInt[j] = sR < 0 ? sR * 32768 : sR * 32767;
      }
    }

    const lSub = currentBlockSize === chunkSize ? leftChunkInt : leftChunkInt.subarray(0, currentBlockSize);
    const rSub = currentBlockSize === chunkSize ? rightChunkInt : rightChunkInt.subarray(0, currentBlockSize);

    const mp3buf = numChannels > 1
      ? mp3encoder.encodeBuffer(lSub, rSub)
      : mp3encoder.encodeBuffer(lSub);

    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    yieldCounter++;
    if (yieldCounter % 100 === 0) {
      onProgress(i / sampleLength);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) mp3Data.push(endBuf);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

// =============================================================================
// 4. MOTOR DE FÍSICAS DEL PLÁTANO / BANANA PHYSICS ENGINE CLASS
// =============================================================================

class BananaPhysics {
  constructor(canvasId, lang = 'en') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '9998'
    });

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
    this.onEaten = null; // se ejecuta una sola vez cuando el gorila se come el plátano
    this.lastTime = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.createTooltip();

    window.addEventListener('resize', () => this.resizeCanvas());
    this.bindGlobalEvents();
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'bananaTooltip';
    Object.assign(this.tooltip.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      background: 'rgba(0, 0, 0, 0.75)',
      color: '#fff',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      opacity: '0',
      transition: 'opacity 0.2s ease'
    });

    this.updateLanguage(this.currentLang);
    document.body.appendChild(this.tooltip);
  }

  updateLanguage(lang) {
    this.currentLang = lang;
    if (this.tooltip) {
      this.tooltip.textContent = BANANA_I18N[lang] || BANANA_I18N.en;
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Cada plátano cae desde arriba en una posición aleatoria. El gorila es el objetivo:
  // al tocarlo se lo come y se ejecuta onEaten. Si ya había un plátano en vuelo, este lo reemplaza.
  spawn(gorillaElement, onEaten = null) {
    this.gorillaEl = gorillaElement;
    this.onEaten = onEaten;
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

  // Retira el plátano en vuelo sin que el gorila lo coma (por ejemplo, si se cierra la pestaña)
  cancel() {
    this.isEaten = true;
    this.onEaten = null;
    this.gorillaEl = null;
    if (this.tooltip) this.tooltip.style.opacity = '0';
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

    // Avisa a quien estaba esperando este plátano (solo una vez)
    const done = this.onEaten;
    this.onEaten = null;
    if (done) done();
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

// Instancia global del sistema de física / Global physics instance
const bananaSystem = new BananaPhysics('physicsCanvas', 'en');

// =============================================================================
// 5. FUNCIONES UTILITARIAS / UTILITY FUNCTIONS
// =============================================================================

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function formatBytes(bytes) {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}