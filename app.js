pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Constantes de configuración
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// --- Web Audio API Synth (Sonido de Aplastar/Crujido y Mascado) ---
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

    // Sonido sintético de mascado/ñam
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

// --- Clase Motor de Físicas del Banano ---
class BananaPhysics {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

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

    window.addEventListener('resize', () => this.resizeCanvas());
    this.bindMouseEvents();
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

    this.canvas.style.pointerEvents = 'auto';
    if (!this.animId) this.loop();
  }

  bindMouseEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
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

    this.canvas.addEventListener('mousedown', startDrag);
    this.canvas.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    this.canvas.addEventListener('touchstart', startDrag, { passive: true });
    this.canvas.addEventListener('touchmove', moveDrag, { passive: true });
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
    this.gorillaEl.style.transform = 'scale(1.4)';
    this.gorillaEl.style.transition = 'transform 0.2s ease';

    setTimeout(() => {
      this.gorillaEl.style.transform = 'scale(1)';
      this.canvas.style.pointerEvents = 'none';
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }, 400);
  }

  update() {
    if (this.isEaten) return;

    if (!this.isDragging) {
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;

      this.x += this.vx;
      this.y += this.vy;

      const floor = this.canvas.height - this.radius - 10;
      if (this.y > floor) {
        this.y = floor;
        this.vy *= this.bounce;
      }

      if (this.x < this.radius || this.x > this.canvas.width - this.radius) {
        this.vx *= -1;
      }
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

  loop() {
    this.update();
    this.draw();
    if (!this.isEaten) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
    }
  }
}

const bananaSystem = new BananaPhysics('physicsCanvas');

// --- Pestañas y Gestión de Archivos ---
const tabsBar = document.getElementById('tabsBar');
const addTabBtn = document.getElementById('addTabBtn');
const tabContentsContainer = document.getElementById('tabContentsContainer');

let tabs = [];
let activeTabId = null;
let tabCounter = 0;

class TabInstance {
  constructor(id, title) {
    this.id = id;
    this.defaultTitle = title;
    this.title = title;
    this.selectedFile = null;
    this.previewUrl = null;
    this.downloadUrl = null;
    this.squishInterval = null;

    this.renderTabHeader();
    this.renderTabBody();
    this.bindEvents();
  }

  renderTabHeader() {
    this.tabHeader = document.createElement('div');
    this.tabHeader.className = 'tab-btn';
    this.tabHeader.innerHTML = `
      <span class="tab-title">${escapeHTML(this.title)}</span>
      <span class="tab-close">✕</span>
    `;
    tabsBar.insertBefore(this.tabHeader, addTabBtn);
  }

  renderTabBody() {
    this.tabBody = document.createElement('div');
    this.tabBody.className = 'box hidden';
    this.tabBody.innerHTML = `
      <input type="file" class="file-input" hidden>
      <div class="drop-zone">
        <p><strong>Arrastra un archivo aquí</strong><br>o haz clic para seleccionar</p>
      </div>
      <span class="file-name">Ningún archivo seleccionado</span>

      <div class="crush-stage">
        <div class="gorilla">🦍</div>
        <div class="file-preview-container">
          <span class="file-icon">📄</span>
        </div>
      </div>

      <button class="compress-btn" disabled>Comprimir</button>

      <div class="output">
        <p>Estado: <span class="status-badge idle">● En espera</span></p>

        <table class="metrics-table hidden">
          <tr><td>Tamaño original:</td><td class="m-orig">-</td></tr>
          <tr><td>Tamaño final:</td><td class="m-comp">-</td></tr>
          <tr><td>Espacio ahorrado:</td><td class="m-saved">-</td></tr>
          <tr><td>Reducción:</td><td class="m-ratio">-</td></tr>
          <tr>
            <td>Método utilizado:</td>
            <td>
              <span class="tooltip-container" tabindex="0">
                <span class="m-method">-</span>
                <span class="info-icon">i</span>
                <span class="tooltip-text">Información sobre la técnica empleada.</span>
              </span>
            </td>
          </tr>
        </table>

        <a class="btn-link download-link hidden" style="margin-top: 12px;">Descargar archivo</a>
      </div>
    `;
    tabContentsContainer.appendChild(this.tabBody);

    this.fileInput = this.tabBody.querySelector('.file-input');
    this.dropZone = this.tabBody.querySelector('.drop-zone');
    this.fileName = this.tabBody.querySelector('.file-name');
    this.crushStage = this.tabBody.querySelector('.crush-stage');
    this.previewContainer = this.tabBody.querySelector('.file-preview-container');
    this.compressBtn = this.tabBody.querySelector('.compress-btn');
    this.statusBadge = this.tabBody.querySelector('.status-badge');
    this.metricsTable = this.tabBody.querySelector('.metrics-table');
    this.mOrig = this.tabBody.querySelector('.m-orig');
    this.mComp = this.tabBody.querySelector('.m-comp');
    this.mSaved = this.tabBody.querySelector('.m-saved');
    this.mRatio = this.tabBody.querySelector('.m-ratio');
    this.mMethod = this.tabBody.querySelector('.m-method');
    this.mMethodTooltip = this.tabBody.querySelector('.tooltip-text');
    this.downloadLink = this.tabBody.querySelector('.download-link');
  }

  bindEvents() {
    this.tabHeader.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        closeTab(this.id);
      } else {
        activateTab(this.id);
      }
    });

    this.dropZone.addEventListener('click', () => this.fileInput.click());
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend'].forEach(evt => {
      this.dropZone.addEventListener(evt, () => this.dropZone.classList.remove('dragover'));
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.handleFileSelect(e.dataTransfer.files[0]);
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleFileSelect(e.target.files[0]);
    });

    this.compressBtn.addEventListener('click', () => this.processCompression());
  }

  setStatus(text, type) {
    this.statusBadge.textContent = text;
    this.statusBadge.className = `status-badge ${type}`;
  }

  revokePreviewUrl() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  revokeDownloadUrl() {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }
  }

  async handleFileSelect(file) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.setStatus(`✖ El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB`, 'error');
      return;
    }

    this.selectedFile = file;
    this.fileName.textContent = `${file.name} (${formatBytes(file.size)})`;
    
    const shortName = file.name.length > 12 ? file.name.slice(0, 10) + '...' : file.name;
    this.tabHeader.querySelector('.tab-title').textContent = shortName;

    this.compressBtn.disabled = false;
    this.downloadLink.classList.add('hidden');
    this.metricsTable.classList.add('hidden');
    this.setStatus('● Cargando vista previa...', 'ready');

    await this.updatePreview(file);
    this.setStatus('● Listo para procesar', 'ready');
  }

  async updatePreview(file) {
    this.revokePreviewUrl();
    this.previewContainer.innerHTML = '';
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      this.previewUrl = URL.createObjectURL(file);
      img.src = this.previewUrl;
      this.previewContainer.appendChild(img);
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 0.3 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        this.previewContainer.appendChild(canvas);
      } catch (err) {
        this.renderEmojiFallback(file);
      }
    } else {
      this.renderEmojiFallback(file);
    }
  }

  renderEmojiFallback(file) {
    this.previewContainer.innerHTML = `<span class="file-icon">${getFileEmoji(file)}</span>`;
  }

  startSmashAnimation() {
    this.crushStage.classList.add('smash-active');
    setTimeout(() => playSquishSound(), 290);

    this.squishInterval = setInterval(() => {
      playSquishSound();
    }, 650);
  }

  stopSmashAnimation() {
    this.crushStage.classList.remove('smash-active');
    if (this.squishInterval) {
      clearInterval(this.squishInterval);
      this.squishInterval = null;
    }
  }

  async processCompression() {
    if (!this.selectedFile) return;

    try {
      this.setStatus('⏳ Aplastando archivo...', 'processing');
      this.compressBtn.disabled = true;
      this.downloadLink.classList.add('hidden');
      this.metricsTable.classList.add('hidden');
      
      this.startSmashAnimation();

      let compressedBlob = null;
      let methodUsed = '';
      let methodDescription = '';
      const fileType = this.selectedFile.type;
      const fileNameLower = this.selectedFile.name.toLowerCase();

      if (fileType.startsWith('image/')) {
        compressedBlob = await new Promise((resolve, reject) => {
          new Compressor(this.selectedFile, {
            quality: 0.75,
            maxWidth: 1920,
            maxHeight: 1920,
            mimeType: fileType === 'image/png' ? 'image/png' : 'image/jpeg',
            success(result) {
              resolve(result);
            },
            error(err) {
              reject(err);
            },
          });
        });
        methodUsed = 'Optimización Canvas (Compressor.js)';
        methodDescription = 'Remuestrea la imagen utilizando HTML5 Canvas, ajustando la calidad de compresión e identificando transparencias.';
      } else if (fileType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
        const arrayBuffer = await this.selectedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        compressedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        methodUsed = 'Re-estructuración PDF';
        methodDescription = 'Agrupa y comprime la estructura interna de objetos del PDF mediante Object Streams, eliminando metadatos redundantes.';
      } else if (
        fileType.startsWith('text/') || fileNameLower.endsWith('.json') || 
        fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.svg')
      ) {
        const text = await this.selectedFile.text();
        const minifiedText = text.replace(/\s+/g, ' ').trim();
        compressedBlob = new Blob([minifiedText], { type: fileType || 'text/plain' });
        methodUsed = 'Minificación de Código';
        methodDescription = 'Elimina saltos de línea, tabulaciones y espacios innecesarios sin alterar el contenido ni el funcionamiento del archivo.';
      } else {
        throw new Error('Tipo de archivo no soportado para compresión directa.');
      }

      const originalSize = this.selectedFile.size;
      const compressedSize = compressedBlob.size;
      const savedBytes = originalSize - compressedSize;
      const ratio = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

      await new Promise((resolve) => setTimeout(resolve, 1300));

      this.mOrig.textContent = formatBytes(originalSize);
      this.mComp.textContent = formatBytes(compressedSize);
      this.mSaved.textContent = savedBytes > 0 ? formatBytes(savedBytes) : '0 B';
      this.mRatio.textContent = savedBytes > 0 ? `-${ratio}%` : '0%';
      this.mMethod.textContent = methodUsed;
      this.mMethodTooltip.textContent = methodDescription;
      this.metricsTable.classList.remove('hidden');

      this.revokeDownloadUrl();
      this.downloadUrl = URL.createObjectURL(compressedBlob);
      
      const safeName = sanitizeFilename(this.selectedFile.name);
      this.downloadLink.href = this.downloadUrl;
      this.downloadLink.download = safeName;
      this.downloadLink.textContent = `Descargar ${safeName}`;
      this.downloadLink.classList.remove('hidden');

      this.setStatus('✔ Completado', 'completed');

      // Soltar banano con físicas al gorila de la pestaña activa
      const activeGorilla = this.tabBody.querySelector('.gorilla');
      bananaSystem.spawn(activeGorilla);

    } catch (err) {
      this.setStatus(`✖ ${err.message || 'Error al procesar'}`, 'error');
    } finally {
      this.stopSmashAnimation();
      this.compressBtn.disabled = false;
    }
  }

  reset() {
    this.stopSmashAnimation();
    this.revokePreviewUrl();
    this.revokeDownloadUrl();
    this.selectedFile = null;
    this.fileInput.value = '';
    this.fileName.textContent = 'Ningún archivo seleccionado';
    this.tabHeader.querySelector('.tab-title').textContent = this.defaultTitle;
    this.previewContainer.innerHTML = '<span class="file-icon">📄</span>';
    this.compressBtn.disabled = true;
    this.downloadLink.classList.add('hidden');
    this.metricsTable.classList.add('hidden');
    this.setStatus('● En espera', 'idle');
  }

  destroy() {
    this.stopSmashAnimation();
    this.revokePreviewUrl();
    this.revokeDownloadUrl();
    this.tabHeader.remove();
    this.tabBody.remove();
  }
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function createTab() {
  tabCounter++;
  const id = 'tab-' + Date.now();
  const newTab = new TabInstance(id, `Archivo ${tabCounter}`);
  tabs.push(newTab);
  activateTab(id);
}

function activateTab(id) {
  activeTabId = id;
  tabs.forEach(tab => {
    if (tab.id === id) {
      tab.tabHeader.classList.add('active');
      tab.tabBody.classList.remove('hidden');
    } else {
      tab.tabHeader.classList.remove('active');
      tab.tabBody.classList.add('hidden');
    }
  });
}

function closeTab(id) {
  if (tabs.length === 1) {
    tabs[0].reset();
    return;
  }

  const index = tabs.findIndex(t => t.id === id);
  if (index !== -1) {
    tabs[index].destroy();
    tabs.splice(index, 1);

    if (activeTabId === id) {
      const nextTab = tabs[index] || tabs[index - 1];
      activateTab(nextTab.id);
    }
  }
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

addTabBtn.addEventListener('click', createTab);

// Inicializar la primera pestaña
createTab();
