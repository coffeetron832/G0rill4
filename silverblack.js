// =============================================================================
// 1. DOM ELEMENTS & STATE / GLOBAL VARIABLES
// 1. Elementos del DOM y Estado / Variables Globales
// =============================================================================

const tabsBar = document.getElementById('tabsBar');
const addTabBtn = document.getElementById('addTabBtn');
const tabContentsContainer = document.getElementById('tabContentsContainer');

let tabs = [];
let activeTabId = null;
let tabCounter = 0;


// =============================================================================
// 2. TAB INSTANCE CLASS (CORE LOGIC)
// 2. Clase TabInstance (Lógica Principal)
// =============================================================================

class TabInstance {
  constructor(id, title) {
    this.id = id;
    this.defaultTitle = title;
    this.title = title;
    this.selectedFile = null;
    this.selectedFiles = []; // Para empaquetado ZIP / For ZIP packaging: [{ file: File, customName: string }]
    this.zipPackageName = 'paquete.zip';
    this.isZipMode = false;
    this.previewUrl = null;
    this.downloadUrl = null;
    this.squishInterval = null;
    this.lastMethodKey = null;

    this.renderTabHeader();
    this.renderTabBody();
    this.bindEvents();
    this.updateLanguage();
  }

  // ---------------------------------------------------------------------------
  // 2.1 DOM Rendering / Renderizado en el DOM
  // ---------------------------------------------------------------------------

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
      <!-- Selector de modo embebido en cada pestaña -->
      <div class="mode-switch-container">
        <div class="switch-option switch-question-zip">
          <span data-i18n="askZipMode">¿Buscas empaquetar varios archivos en un archivo comprimido?</span>
          <button type="button" class="btn-mode-link btn-to-zip" data-i18n="btnToZip">Armar un archivo .ZIP</button>
        </div>

        <div class="switch-option switch-question-compress hidden">
          <span data-i18n="askCompressMode">¿Quieres reducir el tamaño o peso de un archivo individual?</span>
          <button type="button" class="btn-mode-link btn-to-compress" data-i18n="btnToCompress">Reducir peso de archivo</button>
        </div>
      </div>

      <input type="file" class="file-input" hidden>
      <div class="drop-zone">
        <p class="drop-text"><strong>Arrastra un archivo aquí</strong><br>o haz clic para seleccionar</p>
      </div>
      <span class="file-name">Ningún archivo seleccionado</span>

      <!-- Vista e insumos para la gestión de paquete ZIP -->
      <div class="zip-management-container hidden" style="margin-top: 15px; text-align: left;">
        <div class="zip-name-group" style="margin-bottom: 12px;">
          <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;" data-i18n="zipPackageLabel">Nombre del archivo ZIP:</label>
          <input type="text" class="zip-package-input" style="width: 100%; padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box;" placeholder="paquete.zip">
        </div>
        
        <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 6px;" data-i18n="zipContentLabel">Contenido del paquete:</label>
        <div class="zip-file-list" style="max-height: 180px; overflow-y: auto; border: 1px solid #ddd; padding: 8px; border-radius: 6px; background: #f9f9f9;"></div>
      </div>

      <div class="crush-stage">
        <div class="gorilla">🦍</div>
        <div class="file-preview-container">
          <span class="file-icon">📄</span>
        </div>
      </div>

      <button class="compress-btn" disabled style="margin-top: 15px;">Comprimir</button>

      <div class="output">
        <p><span class="status-label">Estado: </span><span class="status-badge idle">● En espera</span></p>

        <!-- Contenedor simple para salida en Modo ZIP -->
        <div class="zip-metrics-info hidden" style="margin-top: 8px;">
          <p><strong><span class="lbl-m-comp-zip">Tamaño final:</span></strong> <span class="m-comp-zip">-</span></p>
        </div>

        <!-- Tabla detallada para Modo Compresión individual -->
        <table class="metrics-table hidden">
          <tr><td class="lbl-m-orig">Tamaño original:</td><td class="m-orig">-</td></tr>
          <tr><td class="lbl-m-comp">Tamaño final:</td><td class="m-comp">-</td></tr>
          <tr><td class="lbl-m-saved">Espacio ahorrado:</td><td class="m-saved">-</td></tr>
          <tr><td class="lbl-m-ratio">Reducción:</td><td class="m-ratio">-</td></tr>
          <tr>
            <td class="lbl-m-method">Método utilizado:</td>
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

    // Mapeo de elementos DOM de la pestaña / DOM element mapping for the tab
    this.switchZipBox = this.tabBody.querySelector('.switch-question-zip');
    this.switchCompressBox = this.tabBody.querySelector('.switch-question-compress');
    this.fileInput = this.tabBody.querySelector('.file-input');
    this.dropZone = this.tabBody.querySelector('.drop-zone');
    this.dropText = this.tabBody.querySelector('.drop-text');
    this.fileName = this.tabBody.querySelector('.file-name');
    
    // Elementos de edición ZIP / ZIP editing elements
    this.zipManagementContainer = this.tabBody.querySelector('.zip-management-container');
    this.lblZipPackage = this.tabBody.querySelector('[data-i18n="zipPackageLabel"]');
    this.lblZipContent = this.tabBody.querySelector('[data-i18n="zipContentLabel"]');
    this.zipPackageInput = this.tabBody.querySelector('.zip-package-input');
    this.zipFileList = this.tabBody.querySelector('.zip-file-list');

    this.crushStage = this.tabBody.querySelector('.crush-stage');
    this.previewContainer = this.tabBody.querySelector('.file-preview-container');
    this.compressBtn = this.tabBody.querySelector('.compress-btn');
    this.statusLabel = this.tabBody.querySelector('.status-label');
    this.statusBadge = this.tabBody.querySelector('.status-badge');
    
    // Elementos ZIP reducidos / Reduced ZIP metrics elements
    this.zipMetricsInfo = this.tabBody.querySelector('.zip-metrics-info');
    this.lblMCompZip = this.tabBody.querySelector('.lbl-m-comp-zip');
    this.mCompZip = this.tabBody.querySelector('.m-comp-zip');

    // Métricas para compresión estándar / Standard compression metrics
    this.metricsTable = this.tabBody.querySelector('.metrics-table');
    this.lblMOrig = this.tabBody.querySelector('.lbl-m-orig');
    this.lblMComp = this.tabBody.querySelector('.lbl-m-comp');
    this.lblMSaved = this.tabBody.querySelector('.lbl-m-saved');
    this.lblMRatio = this.tabBody.querySelector('.lbl-m-ratio');
    this.lblMMethod = this.tabBody.querySelector('.lbl-m-method');
    this.mOrig = this.tabBody.querySelector('.m-orig');
    this.mComp = this.tabBody.querySelector('.m-comp');
    this.mSaved = this.tabBody.querySelector('.m-saved');
    this.mRatio = this.tabBody.querySelector('.m-ratio');
    this.mMethod = this.tabBody.querySelector('.m-method');
    this.mMethodTooltip = this.tabBody.querySelector('.tooltip-text');
    this.downloadLink = this.tabBody.querySelector('.download-link');
  }

  // ---------------------------------------------------------------------------
  // 2.2 Event Listeners & Binding / Vinculación de Eventos
  // ---------------------------------------------------------------------------

  bindEvents() {
    if (this.switchZipBox) {
      this.switchZipBox.addEventListener('click', () => this.setMode(true));
    }
    if (this.switchCompressBox) {
      this.switchCompressBox.addEventListener('click', () => this.setMode(false));
    }

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
      if (e.dataTransfer.files.length) {
        if (this.isZipMode) {
          this.handleMultipleFilesSelect(e.dataTransfer.files);
        } else {
          this.handleFileSelect(e.dataTransfer.files[0]);
        }
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        if (this.isZipMode) {
          this.handleMultipleFilesSelect(e.target.files);
        } else {
          this.handleFileSelect(e.target.files[0]);
        }
      }
    });

    // Control del input para el nombre del paquete ZIP / Control for ZIP package name input
    this.zipPackageInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      this.zipPackageName = val.length > 0 ? val : 'paquete.zip';
    });

    // Eventos delegados dentro de la lista ZIP / Delegated events inside ZIP file list
    this.zipFileList.addEventListener('input', (e) => {
      if (e.target.classList.contains('zip-item-rename')) {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        const ext = e.target.getAttribute('data-ext') || '';
        
        if (this.selectedFiles[index]) {
          this.selectedFiles[index].customName = e.target.value + ext;
        }
      }
    });

    this.zipFileList.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-zip-item')) {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        this.removeZipFileItem(index);
      }
    });

    this.compressBtn.addEventListener('click', () => this.processCompression());
  }

  // ---------------------------------------------------------------------------
  // 2.3 Mode & i18n Handlers / Gestión de Modos e Internacionalización
  // ---------------------------------------------------------------------------

  setMode(isZip) {
    this.isZipMode = isZip;
    this.reset();

    if (this.isZipMode) {
      this.switchZipBox.classList.add('hidden');
      this.switchCompressBox.classList.remove('hidden');
      this.fileInput.setAttribute('multiple', 'true');
    } else {
      this.switchZipBox.classList.remove('hidden');
      this.switchCompressBox.classList.add('hidden');
      this.fileInput.removeAttribute('multiple');
      this.zipManagementContainer.classList.add('hidden');
    }
    this.updateLanguage();
  }

  updateLanguage() {
    if (typeof translations === 'undefined' || !translations[currentLang]) return;
    const t = translations[currentLang];

    const askZip = this.tabBody.querySelector('[data-i18n="askZipMode"]');
    const btnZip = this.tabBody.querySelector('[data-i18n="btnToZip"]');
    const askComp = this.tabBody.querySelector('[data-i18n="askCompressMode"]');
    const btnComp = this.tabBody.querySelector('[data-i18n="btnToCompress"]');

    if (askZip && t.askZipMode) askZip.textContent = t.askZipMode;
    if (btnZip && t.btnToZip) btnZip.textContent = t.btnToZip;
    if (askComp && t.askCompressMode) askComp.textContent = t.askCompressMode;
    if (btnComp && t.btnToCompress) btnComp.textContent = t.btnToCompress;

    if (this.lblZipPackage && t.zipPackageLabel) this.lblZipPackage.textContent = t.zipPackageLabel;
    if (this.lblZipContent && t.zipContentLabel) this.lblZipContent.textContent = t.zipContentLabel;

    if (this.isZipMode) {
      if (!this.selectedFiles.length) {
        this.dropText.innerHTML = t.dropTextZip || '<strong>Arrastra tus archivos aquí</strong><br>para armar un paquete .ZIP';
        this.fileName.textContent = t.noFile || 'Ningún archivo seleccionado';
      } else {
        const totalSize = this.selectedFiles.reduce((acc, item) => acc + item.file.size, 0);
        const filesLabel = t.filesSelected || 'archivos seleccionados';
        this.fileName.textContent = `${this.selectedFiles.length} ${filesLabel} (${formatBytes(totalSize)})`;
      }
      this.compressBtn.textContent = t.createZipBtn || 'Crear paquete .ZIP';
    } else {
      if (!this.selectedFile) {
        this.dropText.innerHTML = t.dropText || '<strong>Arrastra un archivo aquí</strong><br>o haz clic para seleccionar';
        this.fileName.textContent = t.noFile || 'Ningún archivo seleccionado';
      }
      this.compressBtn.textContent = t.compressBtn || 'Comprimir';
    }

    if (!this.selectedFile && !this.selectedFiles.length) {
      const tabNumber = this.defaultTitle.match(/\d+/);
      const suffix = tabNumber ? ` ${tabNumber[0]}` : '';
      this.defaultTitle = `${t.defaultTabTitle || 'Archivo'}${suffix}`;
      this.tabHeader.querySelector('.tab-title').textContent = this.defaultTitle;
    }

    if (this.statusLabel) this.statusLabel.textContent = t.statusLabel;

    if (this.statusBadge.classList.contains('idle')) {
      this.statusBadge.textContent = t.statusIdle;
    } else if (this.statusBadge.classList.contains('ready')) {
      this.statusBadge.textContent = this.isZipMode ? (t.statusZipReady || t.statusReady) : t.statusReady;
    } else if (this.statusBadge.classList.contains('completed')) {
      this.statusBadge.textContent = t.statusDone;
    }

    if (this.lblMCompZip) this.lblMCompZip.textContent = t.mComp || 'Tamaño final:';
    if (this.lblMOrig) this.lblMOrig.textContent = t.mOrig;
    if (this.lblMComp) this.lblMComp.textContent = t.mComp;
    if (this.lblMSaved) this.lblMSaved.textContent = t.mSaved;
    if (this.lblMRatio) this.lblMRatio.textContent = t.mRatio;
    if (this.lblMMethod) this.lblMMethod.textContent = t.mMethod;

    if (this.lastMethodKey) {
      this.mMethod.textContent = t[`${this.lastMethodKey}Method`] || '';
      this.mMethodTooltip.textContent = t[`${this.lastMethodKey}Desc`] || '';
    }

    if (!this.downloadLink.classList.contains('hidden')) {
      const name = this.isZipMode ? this.getFinalZipName() : (this.selectedFile ? this.selectedFile.name : '');
      const safeName = sanitizeFilename(name);
      this.downloadLink.textContent = `${t.downloadPrefix} ${safeName}`;
    }
  }

  setStatus(text, type) {
    this.statusBadge.textContent = text;
    this.statusBadge.className = `status-badge ${type}`;
  }

  getFinalZipName() {
    let name = this.zipPackageName.trim();
    if (!name.toLowerCase().endsWith('.zip')) {
      name += '.zip';
    }
    return name;
  }

  // ---------------------------------------------------------------------------
  // 2.4 ZIP Mode Logic & Management / Lógica y Gestión de Modo ZIP
  // ---------------------------------------------------------------------------

  handleMultipleFilesSelect(fileList) {
    const t = typeof translations !== 'undefined' ? translations[currentLang] : {};
    const files = Array.from(fileList);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const errText = t.limitError || `✖ Un archivo supera el límite de ${MAX_FILE_SIZE_MB}MB`;
        this.setStatus(errText, 'error');
        return;
      }
    }

    const mappedFiles = files.map(f => ({
      file: f,
      customName: f.name
    }));

    this.selectedFiles = [...this.selectedFiles, ...mappedFiles];
    this.zipPackageInput.value = this.zipPackageName;
    this.renderZipFileList();

    this.compressBtn.disabled = false;
    this.downloadLink.classList.add('hidden');
    this.zipMetricsInfo.classList.add('hidden');
    this.metricsTable.classList.add('hidden');
    this.setStatus(t.statusZipReady || t.statusReady || '● Listo para empaquetar', 'ready');
  }

  async renderZipFileList() {
    this.zipFileList.innerHTML = '';
    let totalSize = 0;
    const t = typeof translations !== 'undefined' ? translations[currentLang] : {};

    if (this.selectedFiles.length === 0) {
      this.zipManagementContainer.classList.add('hidden');
      this.fileName.textContent = t.noFile || 'Ningún archivo seleccionado';
      this.compressBtn.disabled = true;
      return;
    }

    this.selectedFiles.forEach((item, idx) => {
      totalSize += item.file.size;

      // Extraer nombre base y extensión / Extract base name and extension
      const fullCustomName = item.customName || item.file.name;
      const lastDotIndex = fullCustomName.lastIndexOf('.');
      let baseName = fullCustomName;
      let ext = '';

      if (lastDotIndex > 0) {
        baseName = fullCustomName.substring(0, lastDotIndex);
        ext = fullCustomName.substring(lastDotIndex);
      }

      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;';
      
      // Contenedor de vista previa / Preview container thumbnail
      const previewThumb = document.createElement('div');
      previewThumb.style.cssText = 'width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; background: #eee; border: 1px solid #ccc; font-size: 14px;';
      row.appendChild(previewThumb);

      // Input de edición (solo el nombre sin la extensión) / Rename input (base name only)
      const inputGroup = document.createElement('div');
      inputGroup.style.cssText = 'flex: 1; display: flex; align-items: center; background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; overflow: hidden;';
      inputGroup.innerHTML = `
        <input type="text" class="zip-item-rename" data-index="${idx}" data-ext="${escapeHTML(ext)}" value="${escapeHTML(baseName)}" style="flex: 1; border: none; outline: none; padding: 4px; font-size: 12px; background: transparent;">
        <span style="font-size: 12px; color: #777; font-weight: bold; padding-right: 4px; user-select: none;">${escapeHTML(ext)}</span>
      `;
      row.appendChild(inputGroup);

      // Tamaño y acción de eliminar / Size and delete action
      const sizeAndAction = document.createElement('div');
      sizeAndAction.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      sizeAndAction.innerHTML = `
        <span style="font-size: 11px; color: #666; white-space: nowrap;">${formatBytes(item.file.size)}</span>
        <button type="button" class="btn-remove-zip-item" data-index="${idx}" style="background: none; border: none; color: #ff4d4d; cursor: pointer; font-weight: bold; font-size: 14px;">✕</button>
      `;
      row.appendChild(sizeAndAction);

      this.zipFileList.appendChild(row);

      // Renderizado dinámico de la miniatura de vista previa / Dynamic thumbnail rendering
      this.generateThumbnail(item.file, previewThumb);
    });

    const filesLabel = t.filesSelected || 'archivos seleccionados';
    this.fileName.textContent = `${this.selectedFiles.length} ${filesLabel} (${formatBytes(totalSize)})`;
    this.tabHeader.querySelector('.tab-title').textContent = `ZIP (${this.selectedFiles.length})`;
    this.previewContainer.innerHTML = `<span class="file-icon">📦</span>`;
    this.zipManagementContainer.classList.remove('hidden');
  }

  async generateThumbnail(file, container) {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      const thumbUrl = URL.createObjectURL(file);
      img.src = thumbUrl;
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      img.onload = () => URL.revokeObjectURL(thumbUrl);
      container.appendChild(img);
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 0.1 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        container.appendChild(canvas);
      } catch (err) {
        container.innerHTML = '📄';
      }
    } else if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.webm')) {
      container.innerHTML = '🎬';
    } else if (type.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg')) {
      container.innerHTML = '🎵';
    } else {
      container.innerHTML = '📄';
    }
  }

  removeZipFileItem(index) {
    this.selectedFiles.splice(index, 1);
    this.renderZipFileList();
  }

  // ---------------------------------------------------------------------------
  // 2.5 Single File Logic & Previews / Selección de Archivo Único y Vistas Previas
  // ---------------------------------------------------------------------------

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
    const t = typeof translations !== 'undefined' ? translations[currentLang] : {};

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errText = t.limitError || `✖ El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB`;
      this.setStatus(errText, 'error');
      return;
    }

    this.selectedFile = file;
    this.fileName.textContent = `${file.name} (${formatBytes(file.size)})`;

    const shortName = file.name.length > 12 ? file.name.slice(0, 10) + '...' : file.name;
    this.tabHeader.querySelector('.tab-title').textContent = shortName;

    this.compressBtn.disabled = false;
    this.downloadLink.classList.add('hidden');
    this.zipMetricsInfo.classList.add('hidden');
    this.metricsTable.classList.add('hidden');
    this.setStatus(t.statusPreview || '● Cargando vista previa...', 'ready');

    await this.updatePreview(file);
    this.setStatus(t.statusReady || '● Listo para procesar', 'ready');
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

  // ---------------------------------------------------------------------------
  // 2.6 Animations & Compression Processing / Animaciones y Procesamiento
  // ---------------------------------------------------------------------------

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
    const t = typeof translations !== 'undefined' ? translations[currentLang] : {};

    try {
      this.compressBtn.disabled = true;
      this.downloadLink.classList.add('hidden');
      this.zipMetricsInfo.classList.add('hidden');
      this.metricsTable.classList.add('hidden');
      this.startSmashAnimation();

      let compressedBlob = null;
      let methodKey = '';
      let originalSize = 0;

      if (this.isZipMode) {
        if (!this.selectedFiles.length) return;
        this.setStatus(t.statusZipBuilding || '⏳ Armando paquete .ZIP...', 'processing');

        const zip = new JSZip();
        this.selectedFiles.forEach(item => {
          const finalName = sanitizeFilename(item.customName || item.file.name);
          zip.file(finalName, item.file);
          originalSize += item.file.size;
        });

        compressedBlob = await zip.generateAsync({ type: 'blob' });
        methodKey = 'zip';

      } else {
        if (!this.selectedFile) return;
        this.setStatus(t.statusProcessing || '⏳ Aplastando archivo...', 'processing');

        originalSize = this.selectedFile.size;
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
              success(result) { resolve(result); },
              error(err) { reject(err); },
            });
          });
          methodKey = 'img';
        } else if (fileType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
          const arrayBuffer = await this.selectedFile.arrayBuffer();
          const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
          const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
          compressedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
          methodKey = 'pdf';
        } else if (fileType.startsWith('audio/') || fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.ogg')) {
          this.setStatus(t.statusEncodingAudio || '⏳ Codificando audio MP3...', 'processing');
          compressedBlob = await compressAudioFile(this.selectedFile, 128);
          methodKey = 'audio';
        } else if (fileType.startsWith('video/') || fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.webm')) {
          this.setStatus(t.statusEncodingVideo || '⏳ Re-codificando video (FFmpeg)...', 'processing');
          compressedBlob = await compressVideoFile(this.selectedFile);
          methodKey = 'video';
        } else if (
          fileType.startsWith('text/') || fileNameLower.endsWith('.json') ||
          fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.svg')
        ) {
          const text = await this.selectedFile.text();
          const minifiedText = text.replace(/\s+/g, ' ').trim();
          compressedBlob = new Blob([minifiedText], { type: fileType || 'text/plain' });
          methodKey = 'text';
        } else {
          throw new Error(t.unsupportedError || 'Tipo de archivo no soportado para compresión directa.');
        }
      }

      this.lastMethodKey = methodKey;

      const compressedSize = compressedBlob.size;
      const savedBytes = originalSize - compressedSize;
      const ratio = originalSize > 0 ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(2) : 0;

      await new Promise((resolve) => setTimeout(resolve, 1300));

      if (this.isZipMode) {
        this.mCompZip.textContent = formatBytes(compressedSize);
        this.zipMetricsInfo.classList.remove('hidden');
        this.metricsTable.classList.add('hidden');
      } else {
        this.mOrig.textContent = formatBytes(originalSize);
        this.mComp.textContent = formatBytes(compressedSize);
        this.mSaved.textContent = savedBytes > 0 ? formatBytes(savedBytes) : '0 B';
        this.mRatio.textContent = savedBytes > 0 ? `-${ratio}%` : '0%';
        this.mMethod.textContent = t[`${methodKey}Method`] || methodKey.toUpperCase();
        this.mMethodTooltip.textContent = t[`${methodKey}Desc`] || '';
        this.metricsTable.classList.remove('hidden');
        this.zipMetricsInfo.classList.add('hidden');
      }

      this.revokeDownloadUrl();
      this.downloadUrl = URL.createObjectURL(compressedBlob);

      const targetFileName = this.isZipMode ? this.getFinalZipName() : this.selectedFile.name;
      const safeName = sanitizeFilename(targetFileName);
      const downloadPrefix = t.downloadPrefix || 'Descargar';

      this.downloadLink.href = this.downloadUrl;
      this.downloadLink.download = safeName;
      this.downloadLink.textContent = `${downloadPrefix} ${safeName}`;
      this.downloadLink.classList.remove('hidden');

      this.setStatus(t.statusDone || '✔ Completado', 'completed');

      const activeGorilla = this.tabBody.querySelector('.gorilla');
      bananaSystem.spawn(activeGorilla);

    } catch (err) {
      this.setStatus(`✖ ${err.message || 'Error al procesar'}`, 'error');
    } finally {
      this.stopSmashAnimation();
      this.compressBtn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 2.7 Lifecycle Cleanup / Limpieza y Destrucción de la Instancia
  // ---------------------------------------------------------------------------

  reset() {
    const t = typeof translations !== 'undefined' ? translations[currentLang] : {};
    this.stopSmashAnimation();
    this.revokePreviewUrl();
    this.revokeDownloadUrl();
    this.selectedFile = null;
    this.selectedFiles = [];
    this.zipPackageName = 'paquete.zip';
    this.lastMethodKey = null;
    this.fileInput.value = '';
    this.fileName.textContent = t.noFile || 'Ningún archivo seleccionado';
    this.tabHeader.querySelector('.tab-title').textContent = this.defaultTitle;
    this.previewContainer.innerHTML = '<span class="file-icon">📄</span>';
    this.zipManagementContainer.classList.add('hidden');
    this.zipFileList.innerHTML = '';
    this.compressBtn.disabled = true;
    this.downloadLink.classList.add('hidden');
    this.zipMetricsInfo.classList.add('hidden');
    this.metricsTable.classList.add('hidden');
    this.setStatus(t.statusIdle || '● En espera', 'idle');
  }

  destroy() {
    this.stopSmashAnimation();
    this.revokePreviewUrl();
    this.revokeDownloadUrl();
    this.tabHeader.remove();
    this.tabBody.remove();
  }
}


// =============================================================================
// 3. TAB NAVIGATION FUNCTIONS & INITIALIZATION
// 3. Funciones de Navegación de Pestañas e Inicialización
// =============================================================================

function createTab() {
  tabCounter++;
  const t = typeof translations !== 'undefined' && translations[currentLang] ? translations[currentLang] : {};
  const baseTitle = t.defaultTabTitle || 'Archivo';
  const id = 'tab-' + Date.now();
  const newTab = new TabInstance(id, `${baseTitle} ${tabCounter}`);
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

    reindexTabTitles();
  }
}

function reindexTabTitles() {
  const t = typeof translations !== 'undefined' && translations[currentLang] ? translations[currentLang] : {};
  const baseTitle = t.defaultTabTitle || 'Archivo';

  tabs.forEach((tab, i) => {
    if (!tab.selectedFile && !tab.selectedFiles.length) {
      tab.defaultTitle = `${baseTitle} ${i + 1}`;
      tab.tabHeader.querySelector('.tab-title').textContent = tab.defaultTitle;
    }
  });

  tabCounter = tabs.length;
}

// Attach listener to add button & trigger initial tab create
// Asignar escuchador al botón de añadir e inicializar la primera pestaña
addTabBtn.addEventListener('click', createTab);
createTab();
