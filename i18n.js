// --- Diccionario i18n ---
const translations = {
  es: {
    tagline: "¡Deja que el gorila aplaste tus archivos!",
    formats: "Formatos soportados: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Máx. 100 MB)",
    tabsGuide: "💡 Puedes abrir varias pestañas usando el botón <strong>+</strong> para procesar diferentes archivos al mismo tiempo.",
    langLabel: "🌐 Idioma / Language:",
    rights: "Todos los derechos reservados.",
    dropText: "<strong>Arrastra un archivo aquí</strong><br>o haz clic para seleccionar",
    noFile: "Ningún archivo seleccionado",
    compressBtn: "Comprimir",
    statusLabel: "Estado: ",
    statusIdle: "● En espera",
    statusReady: "● Listo para procesar",
    statusPreview: "● Cargando vista previa...",
    statusProcessing: "⏳ Aplastando archivo...",
    statusEncodingAudio: "⏳ Codificando audio MP3...",
    statusEncodingVideo: "⏳ Re-codificando video (FFmpeg)...",
    statusDone: "✔ Completado",
    mOrig: "Tamaño original:",
    mComp: "Tamaño final:",
    mSaved: "Espacio ahorrado:",
    mRatio: "Reducción:",
    mMethod: "Método utilizado:",
    downloadPrefix: "Descargar",
    defaultTabTitle: "Archivo",
    newTabTitle: "Nueva pestaña",
    limitError: "✖ El archivo supera el límite de 100MB",
    unsupportedError: "Tipo de archivo no soportado para compresión directa.",
    // Métodos
    imgMethod: "Optimización Visual",
    imgDesc: "Reajusta las dimensiones de la imagen, elimina datos no visibles y equilibra la calidad para reducir peso sin perder detalle.",
    pdfMethod: "Optimización de Estructura",
    pdfDesc: "Reorganiza el contenido interno del PDF y elimina datos duplicados e invisibles manteniendo las páginas intactas.",
    audioMethod: "Compresión de Audio MP3",
    audioDesc: "Ajusta la transmisión de datos del sonido a 128 kbps, reduciendo significativamente el peso sin afectar la audición habitual.",
    videoMethod: "Compresión de Video HD",
    videoDesc: "Adapta la resolución máxima a 720p y optimiza los cuadros por segundo para reducir el tamaño manteniendo buena fluidez.",
    textMethod: "Limpieza de Espacios",
    textDesc: "Elimina espacios en blanco, saltos de línea y tabulaciones innecesarias dentro del archivo sin alterar su contenido."
  },
  en: {
    tagline: "Let the gorilla crush your files!",
    formats: "Supported formats: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Max. 100 MB)",
    tabsGuide: "💡 You can open multiple tabs using the <strong>+</strong> button to process different files simultaneously.",
    langLabel: "🌐 Idioma / Language:",
    rights: "All rights reserved.",
    dropText: "<strong>Drag & drop a file here</strong><br>or click to select",
    noFile: "No file selected",
    compressBtn: "Compress",
    statusLabel: "Status: ",
    statusIdle: "● Idle",
    statusReady: "● Ready to process",
    statusPreview: "● Loading preview...",
    statusProcessing: "⏳ Crushing file...",
    statusEncodingAudio: "⏳ Encoding MP3 audio...",
    statusEncodingVideo: "⏳ Re-encoding video (FFmpeg)...",
    statusDone: "✔ Completed",
    mOrig: "Original size:",
    mComp: "Final size:",
    mSaved: "Space saved:",
    mRatio: "Reduction:",
    mMethod: "Method used:",
    downloadPrefix: "Download",
    defaultTabTitle: "File",
    newTabTitle: "New tab",
    limitError: "✖ File exceeds 100MB limit",
    unsupportedError: "Unsupported file type for direct compression.",
    // Methods
    imgMethod: "Visual Optimization",
    imgDesc: "Resizes dimensions, removes EXIF metadata, and balances quality to shrink file size without losing visible detail.",
    pdfMethod: "Structural Optimization",
    pdfDesc: "Reorganizes internal PDF streams and removes duplicated data while preserving all pages.",
    audioMethod: "MP3 Audio Compression",
    audioDesc: "Adjusts bitrate to 128 kbps, reducing size significantly without noticeable audio degradation.",
    videoMethod: "HD Video Compression",
    videoDesc: "Scales max resolution to 720p and optimizes frame settings to shrink size while keeping smooth playback.",
    textMethod: "Whitespace Minification",
    textDesc: "Strips unnecessary spaces, line breaks, and tabs from the file without affecting actual content."
  }
};

let currentLang = 'es';

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;

  // Actualizar textos estáticos en DOM
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Actualizar tooltip/atributos estáticos
  const addTabBtn = document.getElementById('addTabBtn');
  if (addTabBtn) addTabBtn.title = translations[lang].newTabTitle;

  // Refrescar interfaz de cada pestaña activa
  if (typeof tabs !== 'undefined' && Array.isArray(tabs)) {
    tabs.forEach(tab => {
      if (tab.updateLanguage) tab.updateLanguage();
    });
  }
}

// Event listener para el select de idioma
document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
});
