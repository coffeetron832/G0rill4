// =============================================================================
// PESTAÑAS E INTERFAZ / TABS & UI
// Requiere uhoh-ah-ah.js (textos), kong-engine.js y compression.js.
// =============================================================================

const tabList = document.getElementById('tabList');
const addTabBtn = document.getElementById('addTabBtn');
const tabContentsContainer = document.getElementById('tabContentsContainer');
const tabTemplate = document.getElementById('tabTemplate');
const formatsLabel = document.getElementById('formatsLabel');
const formatsList = document.getElementById('formatsList');
const formatsMax = document.getElementById('formatsMax');
const skipLink = document.getElementById('skipLink');
const langLabel = document.getElementById('langLabel');
const newTabNote = document.getElementById('newTabNote');

let tabs = [];
let activeTabId = null;
let tabSeq = 0;

const BANANA_DELAY_MS = 250;
const FEED_FINISH_DELAY_MS = 450;
const SMASH_MIN_MS = 1950;

// Circunferencia del anillo (r = 52): 2 × π × 52
const RING_CIRCUMFERENCE = 326.73;

// Enlaces oficiales de compartir (solo se abren al pulsar; no se carga ningún script externo)
const SHARE_URLS = {
  whatsapp: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  x: (text, url) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  facebook: (text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  linkedin: (text, url) => `https://www.linkedin.com/sharing/share-offer/?url=${encodeURIComponent(url)}`
};

const LEVEL_TEXT_KEYS = {
  light: { label: 'levelLight', desc: 'levelLightDesc' },
  balanced: { label: 'levelBalanced', desc: 'levelBalancedDesc' },
  strong: { label: 'levelStrong', desc: 'levelStrongDesc' }
};

class TabInstance {
  constructor(id) {
    this.id = id;
    this.alive = true;
    this.selectedFile = null;
    this.state = 'idle';
    this.busy = false;
    this.analyzing = false;
    this.jobId = 0;
    this.probeId = 0;
    this.feedToken = 0;
    this.isActive = false;
    this.previewUrl = null;
    this.downloadUrl = null;
    this.lastResult = null;
    this.levelMode = 'none';
    this.enabledLevels = [...LEVEL_KEYS];
    this.cachedResults = {};

    this.endSmash = () => {
      this.crushStage.classList.remove('smash-active');
      this.crushStage.removeEventListener('animationiteration', this.endSmash);
    };

    this.renderHeader();
    this.renderBody();
    this.bindEvents();
    this.reset();
  }

  get defaultTitle() {
    const pos = tabs.indexOf(this);
    const number = (pos >= 0 ? pos : tabs.length) + 1;
    return `${i18n('defaultTabTitle') || 'File'} ${number}`;
  }

  renderHeader() {
    this.header = document.createElement('div');
    this.header.className = 'tab-btn';
    this.header.innerHTML = `
      <button type="button" class="tab-title" role="tab" aria-selected="false" tabindex="-1"></button>
      <button type="button" class="tab-close"><i data-lucide="x" aria-hidden="true"></i></button>
    `;
    this.tabBtn = this.header.querySelector('.tab-title');
    this.closeBtn = this.header.querySelector('.tab-close');
    this.tabBtn.id = `${this.id}-tab`;
    tabList.appendChild(this.header);
  }

  renderBody() {
    this.body = tabTemplate.content.firstElementChild.cloneNode(true);
    this.body.id = `${this.id}-panel`;
    this.body.setAttribute('aria-labelledby', this.tabBtn.id);
    tabContentsContainer.appendChild(this.body);

    this.zone = this.body.querySelector('.drop-zone');
    this.fileInput = this.body.querySelector('.file-input');
    this.stateIdle = this.body.querySelector('.state-idle');
    this.stateProcessing = this.body.querySelector('.state-processing');
    this.chooseBtn = this.body.querySelector('.choose-btn');
    this.compressBtn = this.body.querySelector('.compress-btn');
    this.dropTitle = this.body.querySelector('.drop-title');
    this.dropSubtitle = this.body.querySelector('.drop-subtitle');
    this.levelGroup = this.body.querySelector('.level-group');
    this.levelBtns = [...this.body.querySelectorAll('.level-btn')];
    this.errorText = this.body.querySelector('.error-text');
    this.idleGorilla = this.body.querySelector('.idle-gorilla');
    this.crushStage = this.body.querySelector('.crush-stage');
    this.previewContainer = this.body.querySelector('.file-preview-container');
    this.statusText = this.body.querySelector('.processing-text');

    this.progressEl = this.body.querySelector('.progress');
    this.progressTrack = this.body.querySelector('.progress-track');
    this.progressFill = this.body.querySelector('.progress-fill');
    this.progressValue = this.body.querySelector('.progress-value');

    this.resultModal = this.body.querySelector('.result-modal');
    this.resultCard = this.body.querySelector('.result-card');
    this.resultClose = this.body.querySelector('.result-close');
    this.ringFill = this.body.querySelector('.ring-fill');
    this.ringValue = this.body.querySelector('.ring-value');
    this.successText = this.body.querySelector('.success-text');
    this.savingsText = this.body.querySelector('.savings-text');
    this.downloadBtn = this.body.querySelector('.download-btn');
    this.resetBtn = this.body.querySelector('.reset-btn');

    this.shareBlock = this.body.querySelector('.share-block');
    this.shareLabel = this.body.querySelector('.share-label');
    this.shareNative = this.body.querySelector('.share-native');
    this.shareLinks = this.body.querySelector('.share-links');
    this.shareFeedback = this.body.querySelector('.share-feedback');
    this.shareCopy = this.body.querySelector('.share-copy');
    this.shareAnchors = [...this.body.querySelectorAll('.share-links a.share-btn')];

    this.ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    this.ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE;

    this.successText.id = `${this.id}-result-title`;
    this.savingsText.id = `${this.id}-result-desc`;
    this.resultCard.setAttribute('aria-labelledby', this.successText.id);
    this.resultCard.setAttribute('aria-describedby', this.savingsText.id);

    document.body.appendChild(this.resultModal);
  }

  bindEvents() {
    this.tabBtn.addEventListener('click', () => activateTab(this.id, true));
    this.tabBtn.addEventListener('keydown', (e) => onTabKeydown(e, this.id));
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(this.id);
    });

    this.levelBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.enabledLevels.includes(btn.dataset.level)) return;
        selectLevel(btn.dataset.level);
      });
    });
    this.levelGroup.addEventListener('keydown', (e) => this.onLevelKeydown(e));

    this.chooseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.zone.addEventListener('click', (e) => {
      if (this.state === 'idle' && !e.target.closest('button')) {
        this.fileInput.click();
      }
    });

    this.fileInput.addEventListener('change', () => {
      this.handleFile(this.fileInput.files[0]);
      this.fileInput.value = '';
    });

    this.zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.state === 'idle') this.zone.classList.add('is-dragover');
    });

    this.zone.addEventListener('dragleave', () => this.zone.classList.remove('is-dragover'));

    this.zone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.zone.classList.remove('is-dragover');
      if (this.state === 'idle') this.handleFile(e.dataTransfer.files[0]);
    });

    this.zone.addEventListener('keydown', (e) => {
      if (this.state !== 'feeding') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.finishFeeding();
      }
    });

    this.compressBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.processCompression();
    });

    this.resultClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissResult();
    });

    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.reset();
      const tab = createTab();
      tab.enterFeeding();
    });

    this.resultModal.addEventListener('click', (e) => {
      if (e.target === this.resultModal) this.dismissResult();
    });

    this.resultModal.addEventListener('keydown', (e) => this.trapFocus(e));

    this.shareNative.addEventListener('click', (e) => {
      e.stopPropagation();
      this.shareWithSystem();
    });

    this.shareCopy.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyLink();
    });
  }

  onLevelKeydown(e) {
    const moves = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    if (!(e.key in moves)) return;

    e.preventDefault();
    const enabledKeys = LEVEL_KEYS.filter((k) => this.enabledLevels.includes(k));
    if (!enabledKeys.length) return;

    const currentIdx = enabledKeys.indexOf(getLevel());
    const baseIdx = currentIdx >= 0 ? currentIdx : 0;
    const next = enabledKeys[(baseIdx + moves[e.key] + enabledKeys.length) % enabledKeys.length];
    selectLevel(next);
    this.levelBtns.find((btn) => btn.dataset.level === next)?.focus();
  }

  setState(name) {
    this.state = name;
    this.zone.dataset.state = name;
    this.zone.setAttribute('aria-busy', String(name === 'processing'));

    const showIdle = name === 'idle' || name === 'feeding';
    this.stateIdle.hidden = !showIdle;
    this.stateProcessing.hidden = showIdle;

    if (name !== 'processing') this.hideProgress();
    this.syncModal();
  }

  syncModal() {
    const show = this.isActive && this.state === 'done';
    const wasShown = !this.resultModal.hidden;
    this.resultModal.hidden = !show;
    syncOverlay();
    if (show && !wasShown) this.downloadBtn.focus();
  }

  setRing(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);
    this.ringFill.style.strokeDashoffset = offset;
    this.ringValue.textContent = `${clamped}%`;
  }

  // ----- Compartir -----

  shareText() {
    return i18n('shareText');
  }

  shareUrl() {
    return window.location.href.split('#')[0];
  }

  // Rellena enlaces, etiquetas y muestra Web Share si el navegador lo soporta
  renderShare() {
    const text = this.shareText();
    const url = this.shareUrl();

    this.shareLabel.textContent = i18n('shareLabel');
    this.shareNative.textContent = i18n('shareNative');
    this.shareCopy.setAttribute('aria-label', i18n('copyLink'));
    this.shareCopy.dataset.tooltip = i18n('copyLink');

    this.shareAnchors.forEach((a) => {
      const network = a.dataset.share;
      const build = SHARE_URLS[network];
      if (build) a.href = build(text, url);
      a.setAttribute('aria-label', `${i18n('shareOn')} ${a.textContent.trim() || network}`.trim());
      a.dataset.tooltip = a.getAttribute('aria-label');
    });

    const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    this.shareNative.hidden = !canNative;
    this.shareLinks.hidden = canNative;
  }

  async shareWithSystem() {
    try {
      await navigator.share({ title: i18n('ogTitle'), text: this.shareText(), url: this.shareUrl() });
    } catch (err) {
      // El usuario cerró el menú o el sistema lo rechazó: no es un error para mostrar
    }
  }

  async copyLink() {
    const url = this.shareUrl();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      this.shareFeedback.textContent = i18n('linkCopied');
    } catch (err) {
      this.shareFeedback.textContent = i18n('linkCopyError');
    }
    clearTimeout(this.shareFeedbackTimer);
    this.shareFeedbackTimer = setTimeout(() => {
      this.shareFeedback.textContent = '';
    }, 2500);
  }

  refreshHeader() {
    const full = this.selectedFile ? this.selectedFile.name : this.defaultTitle;
    const short = this.selectedFile && full.length > 12 ? `${full.slice(0, 10)}...` : full;
    this.tabBtn.textContent = short;
    this.tabBtn.setAttribute('aria-label', full);
  }

  renderLevel() {
    const current = getLevel();
    const hasFile = Boolean(this.selectedFile);

    this.levelGroup.hidden = !hasFile || this.levelMode === 'none' || this.analyzing;
    this.levelGroup.setAttribute('aria-label', i18n('levelLabel'));

    this.levelBtns.forEach((btn) => {
      const level = btn.dataset.level;
      const keys = LEVEL_TEXT_KEYS[level];
      const enabled = this.enabledLevels.includes(level);
      const on = level === current;

      btn.setAttribute('aria-disabled', String(!enabled));
      btn.classList.toggle('is-unavailable', !enabled);
      btn.textContent = i18n(keys.label);
      btn.dataset.tooltip = enabled ? i18n(keys.desc) : i18n('levelUnavailable');
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });

    this.compressBtn.disabled =
      !hasFile || this.busy || this.analyzing || this.enabledLevels.length === 0;
  }

  renderLabels() {
    if (this.selectedFile) {
      const note = fileNote(this.selectedFile);
      this.dropTitle.textContent = this.selectedFile.name;
      this.dropSubtitle.textContent = [formatBytes(this.selectedFile.size), note].filter(Boolean).join(' · ');
    } else {
      this.dropTitle.innerHTML = i18n('dropText');
      this.dropSubtitle.textContent = '';
    }

    this.chooseBtn.textContent = i18n('chooseFile');
    this.compressBtn.textContent = i18n('compressBtn');
    this.downloadBtn.textContent = i18n('downloadPrefix');
    this.resetBtn.textContent = i18n('again');
    this.resultClose.setAttribute('aria-label', i18n('closeResult'));
    this.resultClose.dataset.tooltip = i18n('closeResult');
    this.closeBtn.setAttribute('aria-label', i18n('closeTab'));
    this.progressTrack.setAttribute('aria-label', i18n('progressLabel'));
    this.renderLevel();

    if (this.state === 'done' && this.lastResult) {
      const r = this.lastResult;
      this.successText.textContent = i18n('successText');
      this.savingsText.textContent = [
        i18n('savedPercent').replace('{p}', r.pct),
        i18n('finalSize').replace('{size}', formatBytes(r.size))
      ].join(' · ');
    }

    this.renderShare();
    refreshIcons();
  }

  updateLanguage() {
    this.renderLabels();
    this.refreshHeader();
    renderShared();
  }

  setStatus(text) {
    this.statusText.textContent = plainText(text);
  }

  enterFeeding() {
    this.setState('feeding');
    this.zone.focus({ preventScroll: true });
    this.feed();
  }

  feed() {
    if (this.state !== 'feeding') return;
    if (bananaSystem.gorillaEl === this.idleGorilla && !bananaSystem.isEaten) return;

    const token = ++this.feedToken;

    setTimeout(() => {
      if (!this.alive || this.state !== 'feeding' || token !== this.feedToken) return;

      bananaSystem.spawn(this.idleGorilla, () => {
        setTimeout(() => this.finishFeeding(token), FEED_FINISH_DELAY_MS);
      });
    }, BANANA_DELAY_MS);
  }

  finishFeeding(token = this.feedToken) {
    if (!this.alive || this.state !== 'feeding' || token !== this.feedToken) return;

    if (bananaSystem.gorillaEl === this.idleGorilla) bananaSystem.cancel();

    this.setState('idle');
    this.chooseBtn.focus();
  }

  showProgress(ratio) {
    this.progressEl.hidden = false;

    if (ratio == null) {
      this.progressEl.classList.add('indeterminate');
      this.progressValue.textContent = '';
      this.progressTrack.removeAttribute('aria-valuenow');
      return;
    }

    const pct = Math.round(ratio * 100);
    this.progressEl.classList.remove('indeterminate');
    this.progressFill.style.width = `${pct}%`;
    this.progressValue.textContent = `${pct}%`;
    this.progressTrack.setAttribute('aria-valuenow', String(pct));
  }

  hideProgress() {
    this.progressEl.hidden = true;
    this.progressEl.classList.remove('indeterminate');
    this.progressFill.style.width = '0%';
    this.progressValue.textContent = '';
    this.progressTrack.removeAttribute('aria-valuenow');
  }

  handleProgress(job, update) {
    if (job !== this.jobId) return;

    const labels = {
      queued: i18n('queued'),
      loading: i18n('loadingEngine'),
      audio: i18n('statusEncodingAudio'),
      video: i18n('statusEncodingVideo')
    };
    if (update.phase && labels[update.phase]) this.setStatus(labels[update.phase]);

    const waiting = update.phase === 'queued' || update.phase === 'loading';
    if (waiting || update.ratio == null) {
      this.showProgress(null);
    } else {
      this.showProgress(update.ratio);
    }
  }

  showError(message) {
    this.errorText.classList.remove('is-info');
    this.errorText.textContent = plainText(message);
  }

  showHint(text) {
    this.errorText.classList.add('is-info');
    this.errorText.textContent = plainText(text);
  }

  clearError() {
    this.errorText.classList.remove('is-info');
    this.errorText.textContent = '';
  }

  async handleFile(file) {
    if (!file || this.busy || this.analyzing || this.state !== 'idle') return;
    this.clearError();

    if (!isSupportedFile(file)) {
      this.showError(i18n('unsupportedError'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.showError(i18n('limitError'));
      return;
    }
    if (detectKind(file) === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
      this.showError(i18n('videoTooLarge'));
      return;
    }

    const probe = ++this.probeId;
    this.selectedFile = file;
    this.levelMode = 'none';
    this.enabledLevels = [...LEVEL_KEYS];
    this.cachedResults = {};

    this.analyzing = true;
    this.renderLabels();

    if (detectKind(file) === 'image') this.showHint(i18n('checkingLevels'));

    const isStale = () => !this.alive || probe !== this.probeId || this.selectedFile !== file;
    let evaluation = null;
    try {
      evaluation = await probeCompressionLevels(file, isStale);
    } finally {
      if (probe === this.probeId) this.analyzing = false;
    }

    if (!evaluation || isStale()) {
      this.renderLevel();
      return;
    }

    this.clearError();
    this.levelMode = evaluation.mode;
    this.enabledLevels = evaluation.enabledLevels;
    this.cachedResults = evaluation.resultsByLevel;

    if (evaluation.mode === 'probed') {
      if (!evaluation.enabledLevels.includes(getLevel()) && evaluation.recommendedLevel) {
        selectLevel(evaluation.recommendedLevel);
      } else if (!evaluation.enabledLevels.length) {
        this.showError(i18n('noCompressionPossible'));
      }
    }

    this.renderLevel();
  }

  async renderPreview(file) {
    this.revokePreviewUrl();
    this.previewContainer.innerHTML = '';

    const name = file.name.toLowerCase();
    const fallback = () => {
      this.previewContainer.innerHTML = `<i data-lucide="${getFileIcon(file)}" aria-hidden="true"></i>`;
      refreshIcons();
    };

    if ((file.type || '').startsWith('image/')) {
      const img = document.createElement('img');
      this.previewUrl = URL.createObjectURL(file);
      img.src = this.previewUrl;
      img.alt = '';
      this.previewContainer.appendChild(img);
    } else if ((file.type || '').toLowerCase() === 'application/pdf' || name.endsWith('.pdf')) {
      try {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        this.previewContainer.appendChild(canvas);
      } catch (err) {
        fallback();
      }
    } else {
      fallback();
    }
  }

  startSmash() {
    this.crushStage.removeEventListener('animationiteration', this.endSmash);
    this.crushStage.classList.add('smash-active');
  }

  stopSmash(immediate = false) {
    if (immediate) {
      this.crushStage.removeEventListener('animationiteration', this.endSmash);
      this.crushStage.classList.remove('smash-active');
      return;
    }

    if (this.crushStage.classList.contains('smash-active')) {
      this.crushStage.addEventListener('animationiteration', this.endSmash);
    }
  }

  async processCompression() {
    if (!this.selectedFile || this.busy || this.analyzing) return;

    const level = getLevel();
    if (!this.enabledLevels.includes(level)) {
      this.showError(i18n('noCompressionPossible'));
      return;
    }

    getAudioContext();

    const job = ++this.jobId;
    const file = this.selectedFile;
    const cached = this.cachedResults[level];
    const onProgress = (update) => this.handleProgress(job, update);

    this.clearError();
    this.busy = true;
    this.compressBtn.disabled = true;
    this.setState('processing');
    this.zone.focus({ preventScroll: true });
    this.setStatus(i18n('statusProcessing'));
    this.startSmash();

    setTimeout(() => {
      if (job === this.jobId) this.renderPreview(file);
    }, 0);

    try {
      const compressionTask = cached
        ? Promise.resolve(cached.blob)
        : compressFile(file, onProgress, level);

      const [result] = await Promise.all([compressionTask, wait(SMASH_MIN_MS)]);
      if (job !== this.jobId) return;

      if (!result || result.size === 0) {
        const err = new Error('empty-result');
        err.code = 'EMPTY_RESULT';
        throw err;
      }

      const pctSaved = cached
        ? cached.pctSaved
        : (file.size > 0 ? Math.round((1 - result.size / file.size) * 100) : 0);

      if (result.size >= file.size || pctSaved < 1) {
        this.enabledLevels = this.enabledLevels.filter((l) => l !== level);
        this.stopSmash(true);
        this.setState('idle');
        this.showError(i18n('noCompressionPossible'));
        this.renderLevel();
        return;
      }

      this.showDone(file, result, level, pctSaved);
    } catch (err) {
      if (job !== this.jobId) return;
      console.error(err);
      this.stopSmash(true);
      this.setState('idle');
      this.showError(friendlyError(err));
    } finally {
      if (job === this.jobId) {
        this.stopSmash(this.state !== 'done');
        this.busy = false;
        this.renderLevel();
        if (this.state === 'idle' && this.selectedFile && !this.compressBtn.disabled) {
          this.compressBtn.focus();
        }
      }
    }
  }

  showDone(file, outBlob, level, pctSaved) {
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    this.downloadUrl = URL.createObjectURL(outBlob);

    const name = downloadName(outputFileName(file.name, outBlob));
    this.downloadBtn.href = this.downloadUrl;
    this.downloadBtn.download = name;
    this.downloadBtn.setAttribute('aria-label', `${i18n('downloadPrefix')} ${name}`);

    this.lastResult = { pct: pctSaved, file, level, size: outBlob.size };
    this.shareFeedback.textContent = '';

    this.statusText.textContent = '';
    this.setState('done');
    this.renderLabels();

    this.setRing(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.state === 'done') this.setRing(pctSaved);
      });
    });
  }

  dismissResult() {
    const wasActive = this.isActive;
    this.reset();
    if (wasActive) {
      this.enterFeeding();
    } else {
      this.chooseBtn.focus();
    }
  }

  trapFocus(e) {
    if (e.key !== 'Tab') return;

    const items = [...this.resultCard.querySelectorAll('a[href], button:not([disabled]):not([hidden])')]
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  revokePreviewUrl() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  revokeUrls() {
    this.revokePreviewUrl();
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }
  }

  reset() {
    this.jobId++;
    this.probeId++;
    this.stopSmash(true);
    this.revokeUrls();
    if (bananaSystem.gorillaEl === this.idleGorilla) bananaSystem.cancel();
    this.selectedFile = null;
    this.lastResult = null;
    this.levelMode = 'none';
    this.enabledLevels = [...LEVEL_KEYS];
    this.cachedResults = {};
    this.busy = false;
    this.analyzing = false;
    this.fileInput.value = '';
    this.previewContainer.innerHTML = '';
    this.statusText.textContent = '';
    this.shareFeedback.textContent = '';
    this.clearError();
    this.compressBtn.disabled = true;
    this.setRing(0);
    this.setState('idle');
    this.refreshHeader();
    this.renderLabels();
  }

  destroy() {
    this.alive = false;
    this.jobId++;
    this.probeId++;
    this.stopSmash(true);
    this.revokeUrls();
    if (bananaSystem.gorillaEl === this.idleGorilla) bananaSystem.cancel();
    clearTimeout(this.shareFeedbackTimer);
    this.header.remove();
    this.body.remove();
    this.resultModal.remove();
    syncOverlay();
  }
}

// =============================================================================
// 3. ELEMENTOS COMPARTIDOS Y NAVEGACIÓN / SHARED ELEMENTS & TAB NAVIGATION
// =============================================================================

function selectLevel(level) {
  setLevel(level);
  tabs.forEach((tab) => tab.renderLevel());
}

function syncOverlay() {
  const open = tabs.some((t) => t.resultModal && !t.resultModal.hidden);
  ['.container', '.sticky-footer', '.lang-selector-container'].forEach((selector) => {
    const el = document.querySelector(selector);
    if (el) el.inert = open;
  });
}

function renderPageMeta() {
  document.title = `${i18n('ogTitle')} - ${i18n('tagline')}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n('metaDescription'));
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', i18n('ogTitle'));
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', i18n('ogDescription'));
}

function renderShared() {
  formatsLabel.textContent = i18n('formatsLabel');
  formatsList.innerHTML = SUPPORTED_FORMATS
    .map((f) => `<li><i data-lucide="${FORMAT_ICONS[f]}" aria-hidden="true"></i><span>${f}</span></li>`)
    .join('');
  formatsMax.textContent = i18n('maxSize').replace('{mb}', MAX_FILE_SIZE_MB);

  skipLink.textContent = i18n('skipLink');
  langLabel.textContent = i18n('langLabel');
  newTabNote.textContent = i18n('opensNewTab');
  tabList.setAttribute('aria-label', i18n('tabsLabel'));
  addTabBtn.dataset.tooltip = i18n('newTabTitle');
  addTabBtn.setAttribute('aria-label', i18n('newTabTitle'));

  renderPageMeta();
  refreshIcons();
}

function createTab() {
  const tab = new TabInstance(`tab-${++tabSeq}`);
  tabs.push(tab);
  activateTab(tab.id);
  refreshIcons();
  return tab;
}

function activateTab(id, focusTab = false) {
  activeTabId = id;

  tabs.forEach((tab) => {
    const active = tab.id === id;
    tab.isActive = active;
    tab.header.classList.toggle('active', active);
    tab.tabBtn.setAttribute('aria-selected', String(active));
    tab.tabBtn.tabIndex = active ? 0 : -1;
    tab.body.hidden = !active;
    tab.syncModal();
  });

  const current = tabs.find((t) => t.id === id);
  if (current && current.state === 'feeding') current.feed();

  if (focusTab && current && current.resultModal.hidden) {
    current.tabBtn.focus();
  }
}

function onTabKeydown(e, id) {
  const index = tabs.findIndex((t) => t.id === id);
  let next = null;

  if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
  else if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
  else if (e.key === 'Home') next = tabs[0];
  else if (e.key === 'End') next = tabs[tabs.length - 1];

  if (!next) return;
  e.preventDefault();
  activateTab(next.id, true);
}

function closeTab(id) {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return;

  if (tabs.length === 1) {
    tabs[0].reset();
    tabs[0].chooseBtn.focus();
    return;
  }

  const wasActive = activeTabId === id;
  const [tab] = tabs.splice(index, 1);
  tab.destroy();

  if (wasActive) {
    activateTab((tabs[index] || tabs[index - 1]).id, true);
  }

  reindexTabTitles();
}

function reindexTabTitles() {
  tabs.forEach((tab) => tab.refreshHeader());
}

// =============================================================================
// 4. INICIALIZACIÓN / INITIALIZATION
// =============================================================================

function init() {
  addTabBtn.addEventListener('click', () => createTab().chooseBtn.focus());

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const active = tabs.find((t) => t.id === activeTabId);
    if (active && active.state === 'done' && !active.resultModal.hidden) {
      active.dismissResult();
    }
  });

  renderShared();
  createTab();
}

document.addEventListener('DOMContentLoaded', init);