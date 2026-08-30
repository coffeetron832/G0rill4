// Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Constantes globales de configuración
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

// --- Helpers para compresión ---

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

// --- Clase Motor de Físicas del Banano ---
class BananaPhysics {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

    // Configuración para no interceptar la interfaz de usuario
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9998';

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

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

    // Crear elemento del Tooltip
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
    this.tooltip.innerHTML = '🍌 ¡Arrástrame hacia el gorila!';
    document.body.appendChild(this.tooltip);
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

    // Mantener oculto al aparecer en la parte superior
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
      }
    };

    const moveDrag = (e) => {
      if (this.isDragging) {
        const pos = getPos(e);
        this.vx = (pos.x - this.dragOffsetX - this.x) * 0.3;
        this.vy = (pos.y - this.dragOffsetY - this.y) * 0.3;
        this.x = pos.x - this.dragOffsetX;
        this.y = pos.y - this.dragOffsetY;
      }
    };

    const stopDrag = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    window.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', moveDrag, { passive: true });
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

        // Mostrar el tooltip solo cuando toque el suelo por primera vez
        if (this.tooltip) this.tooltip.style.opacity = '1';
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
      this.ctx.font = '36px sans-serif';
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
const bananaSystem = new BananaPhysics('physicsCanvas');

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
