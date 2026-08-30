// --- Elementos del DOM ---
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
    } else if (type.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg')) {
      const audio = document.createElement('audio');
      audio.controls = true;
      this.previewUrl = URL.createObjectURL(file);
      audio.src = this.previewUrl;
      audio.style.maxWidth = '100%';
      this.previewContainer.appendChild(audio);
    } else if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.webm')) {
      const video = document.createElement('video');
      video.controls = true;
      this.previewUrl = URL.createObjectURL(file);
      video.src = this.previewUrl;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '180px';
      this.previewContainer.appendChild(video);
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
            quality: 0.6,
            maxWidth: 1600,
            maxHeight: 1600,
            convertSize: 1000000,
            retainExif: false,
            strict: false,
            mimeType: fileType === 'image/png' ? 'image/png' : 'image/jpeg',
            success(result) {
              resolve(result);
            },
            error(err) {
              reject(err);
            },
          });
        });
        methodUsed = 'Optimización Visual';
        methodDescription = 'Reajusta las dimensiones de la imagen, elimina datos no visibles (como la cámara o ubicación) y equilibra la calidad para reducir peso sin perder detalle.';
      } else if (fileType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
        const arrayBuffer = await this.selectedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        compressedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        methodUsed = 'Optimización de Estructura';
        methodDescription = 'Reorganiza el contenido interno del PDF y elimina datos duplicados e invisibles para que ocupe menos espacio manteniendo las páginas intactas.';
      } else if (fileType.startsWith('audio/') || fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.ogg')) {
        this.setStatus('⏳ Codificando audio MP3...', 'processing');
        compressedBlob = await compressAudioFile(this.selectedFile, 128);
        methodUsed = 'Compresión de Audio MP3';
        methodDescription = 'Ajusta la transmisión de datos del sonido a un nivel equilibrado (128 kbps), reduciendo significativamente el peso sin afectar la audición habitual.';
      } else if (fileType.startsWith('video/') || fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.webm')) {
        this.setStatus('⏳ Re-codificando video (FFmpeg)...', 'processing');
        compressedBlob = await compressVideoFile(this.selectedFile);
        methodUsed = 'Compresión de Video HD';
        methodDescription = 'Adapta la resolución máxima a 720p y optimiza los cuadros por segundo para reducir el tamaño manteniendo una buena fluidez.';
      } else if (
        fileType.startsWith('text/') || fileNameLower.endsWith('.json') ||
        fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.svg')
      ) {
        const text = await this.selectedFile.text();
        const minifiedText = text.replace(/\s+/g, ' ').trim();
        compressedBlob = new Blob([minifiedText], { type: fileType || 'text/plain' });
        methodUsed = 'Limpieza de Espacios';
        methodDescription = 'Elimina espacios en blanco, saltos de línea y tabulaciones innecesarias dentro del archivo sin alterar en nada su contenido o datos.';
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

// --- Funciones de navegación de Pestañas ---
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

addTabBtn.addEventListener('click', createTab);

// Inicializar la primera pestaña
createTab();
