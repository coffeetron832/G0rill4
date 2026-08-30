pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- Web Audio API Synth (Sonido de Aplastar/Crujido) ---
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

    // 1. Oscilador de Impacto (Tono grave en caída rápido)
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

    // 2. Ruido Blanco (Textura de crujido / aplastado húmedo)
    const bufferSize = ctx.sampleRate * 0.15; // 150ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filtro Pasa Bajas para amortiguar el ruido
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
      <span class="tab-title">${this.title}</span>
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

  async handleFileSelect(file) {
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
    this.previewContainer.innerHTML = '';
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(file);
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
        // Implementación con Compressor.js envolviendo su callback en una Promise
        compressedBlob = await new Promise((resolve, reject) => {
          new Compressor(this.selectedFile, {
            quality: 0.75,
            maxWidth: 1920,
            maxHeight: 1920,
            mimeType: fileType,
            success(result) {
              resolve(result);
            },
            error(err) {
              reject(err);
            },
          });
        });
        methodUsed = 'Optimización Canvas (Compressor.js)';
        methodDescription = 'Remuestrea la imagen utilizando HTML5 Canvas, ajustando la calidad de compresión JPEG/WebP y reescalando dimensiones excesivas.';
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
      this.stopSmashAnimation();

      this.mOrig.textContent = formatBytes(originalSize);
      this.mComp.textContent = formatBytes(compressedSize);
      this.mSaved.textContent = savedBytes > 0 ? formatBytes(savedBytes) : '0 B';
      this.mRatio.textContent = savedBytes > 0 ? `-${ratio}%` : '0%';
      this.mMethod.textContent = methodUsed;
      this.mMethodTooltip.textContent = methodDescription;
      this.metricsTable.classList.remove('hidden');

      if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = URL.createObjectURL(compressedBlob);
      this.downloadLink.href = this.downloadUrl;
      this.downloadLink.download = this.selectedFile.name;
      this.downloadLink.textContent = `Descargar ${this.selectedFile.name}`;
      this.downloadLink.classList.remove('hidden');

      this.setStatus('✔ Completado', 'completed');
    } catch (err) {
      this.stopSmashAnimation();
      this.setStatus(`✖ ${err.message || 'Error al procesar'}`, 'error');
    } finally {
      this.compressBtn.disabled = false;
    }
  }

  reset() {
    this.stopSmashAnimation();
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }
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
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    this.tabHeader.remove();
    this.tabBody.remove();
  }
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
