// =============================================================================
// MODO CLARO / OSCURO / LIGHT & DARK THEME
// El tema inicial se aplica en <head> (index.html) para evitar parpadeos.
// =============================================================================

(() => {
  const STORAGE_KEY = 'gorilla-theme';
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const langSelect = document.getElementById('langSelect');
  if (!toggle || !langSelect) return;

  // Texto de la acción del botón, según el idioma seleccionado
  const SWITCH_LABELS = {
    en: { dark: 'Switch to dark mode', light: 'Switch to light mode' },
    es: { dark: 'Cambiar a modo oscuro', light: 'Cambiar a modo claro' },
    pt: { dark: 'Mudar para modo escuro', light: 'Mudar para modo claro' },
    fr: { dark: 'Passer en mode sombre', light: 'Passer en mode clair' },
    de: { dark: 'Zum Dunkelmodus wechseln', light: 'Zum Hellmodus wechseln' },
    it: { dark: 'Passa alla modalità scura', light: 'Passa alla modalità chiara' },
    vi: { dark: 'Chuyển sang chế độ tối', light: 'Chuyển sang chế độ sáng' }
  };

  const savedTheme = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch (e) {
      return null;
    }
  };

  const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  // La etiqueta describe la acción: "Cambiar a modo oscuro" cuando el tema es claro.
  // Se usa aria-label para lectores de pantalla y data-tooltip para el tooltip visual.
  function updateLabel() {
    const lang = SWITCH_LABELS[langSelect.value] ? langSelect.value : 'en';
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const text = SWITCH_LABELS[lang][next];
    toggle.setAttribute('aria-label', text);
    toggle.dataset.tooltip = text;
  }

  function setTheme(theme, save) {
    root.dataset.theme = theme;
    if (save) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* almacenamiento bloqueado */ }
    }
    updateLabel();
  }

  toggle.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  // Cambiar el idioma traduce la etiqueta del botón
  langSelect.addEventListener('change', updateLabel);

  // Si el usuario no eligió un tema, sigue al sistema cuando este cambia
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = (e) => {
    if (!savedTheme()) setTheme(e.matches ? 'dark' : 'light', false);
  };
  if (media.addEventListener) media.addEventListener('change', onSystemChange);

  // Respaldo por si el script de <head> no pudo aplicar el tema
  if (!root.dataset.theme) {
    setTheme(savedTheme() || (media.matches ? 'dark' : 'light'), false);
  }

  updateLabel();
})();