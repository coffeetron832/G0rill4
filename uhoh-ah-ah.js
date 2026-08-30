// --- Diccionario i18n ---
const translations = {
  es: {
    tagline: "¡Deja que el gorila aplaste tus archivos!",
    formats: "Formatos soportados: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Máx. 100 MB)",
    tabsGuide: "💡 Puedes abrir varias pestañas usando el botón <strong>+</strong> para procesar diferentes archivos al mismo tiempo.",
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
    textDesc: "Elimina espacios en blanco, saltos de línea y tabulaciones innecesarias dentro del archivo sin alterar su contenido.",
    // Tooltip
    bananaTooltip: "🍌 ¡Arrástrame hacia el gorila!"
  },
  en: {
    tagline: "Let the gorilla crush your files!",
    formats: "Supported formats: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Max. 100 MB)",
    tabsGuide: "💡 You can open multiple tabs using the <strong>+</strong> button to process different files simultaneously.",
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
    textDesc: "Strips unnecessary spaces, line breaks, and tabs from the file without affecting actual content.",
    // Tooltip
    bananaTooltip: "🍌 Drag me to the gorilla!"
  },
  pt: {
    tagline: "Deixe o gorila esmagar seus arquivos!",
    formats: "Formatos suportados: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Máx. 100 MB)",
    tabsGuide: "💡 Você pode abrir várias abas usando o botão <strong>+</strong> para processar diferentes arquivos ao mesmo tempo.",
    rights: "Todos os direitos reservados.",
    dropText: "<strong>Arraste um arquivo aqui</strong><br>ou clique para selecionar",
    noFile: "Nenhum arquivo selecionado",
    compressBtn: "Compactar",
    statusLabel: "Status: ",
    statusIdle: "● Em espera",
    statusReady: "● Pronto para processar",
    statusPreview: "● Carregando visualização...",
    statusProcessing: "⏳ Esmagando arquivo...",
    statusEncodingAudio: "⏳ Codificando áudio MP3...",
    statusEncodingVideo: "⏳ Re-codificando vídeo (FFmpeg)...",
    statusDone: "✔ Concluído",
    mOrig: "Tamanho original:",
    mComp: "Tamanho final:",
    mSaved: "Espaço economizado:",
    mRatio: "Redução:",
    mMethod: "Método utilizado:",
    downloadPrefix: "Baixar",
    defaultTabTitle: "Arquivo",
    newTabTitle: "Nova aba",
    limitError: "✖ O arquivo excede o limite de 100MB",
    unsupportedError: "Tipo de arquivo não suportado para compactação direta.",
    // Métodos
    imgMethod: "Otimização Visual",
    imgDesc: "Redimensiona imagens, remove metadados EXIF e equilibra a qualidade para reduzir o tamanho sem perder detalhes visíveis.",
    pdfMethod: "Otimização Estrutural",
    pdfDesc: "Reorganiza o fluxo interno do PDF e remove dados duplicados preservando todas as páginas.",
    audioMethod: "Compactação de Áudio MP3",
    audioDesc: "Ajusta a taxa de bits para 128 kbps, reduzindo o tamanho significativamente sem afetar a audição.",
    videoMethod: "Compactação de Vídeo HD",
    videoDesc: "Ajusta a resolução máxima para 720p e otimiza a taxa de quadros para reduzir o tamanho mantendo a fluidez.",
    textMethod: "Limpeza de Espaços",
    textDesc: "Remove espaços desnecessários, quebras de linha e tabulações do arquivo sem alterar o conteúdo.",
    // Tooltip
    bananaTooltip: "🍌 Arraste-me para o gorila!"
  },
  fr: {
    tagline: "Laissez le gorille écraser vos fichiers !",
    formats: "Formats supportés : <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Max. 100 Mo)",
    tabsGuide: "💡 Vous pouvez ouvrir plusieurs onglets avec le bouton <strong>+</strong> pour traiter différents fichiers simultanément.",
    rights: "Tous droits réservés.",
    dropText: "<strong>Glissez-déposez un fichier ici</strong><br>ou cliquez pour sélectionner",
    noFile: "Aucun fichier sélectionné",
    compressBtn: "Compresser",
    statusLabel: "Statut : ",
    statusIdle: "● En attente",
    statusReady: "● Prêt à traiter",
    statusPreview: "● Chargement de l'aperçu...",
    statusProcessing: "⏳ Écrasement du fichier...",
    statusEncodingAudio: "⏳ Encodage de l'audio MP3...",
    statusEncodingVideo: "⏳ Ré-encodage de la vidéo (FFmpeg)...",
    statusDone: "✔ Terminé",
    mOrig: "Taille originale :",
    mComp: "Taille finale :",
    mSaved: "Espace économisé :",
    mRatio: "Réduction :",
    mMethod: "Méthode utilisée :",
    downloadPrefix: "Télécharger",
    defaultTabTitle: "Fichier",
    newTabTitle: "Nouvel onglet",
    limitError: "✖ Le fichier dépasse la limite de 100 Mo",
    unsupportedError: "Type de fichier non pris en charge pour la compression directe.",
    // Métodes
    imgMethod: "Optimisation Visuelle",
    imgDesc: "Redimensionne les images, supprime les métadonnées et équilibre la qualité pour réduire la taille sans perte visible.",
    pdfMethod: "Optimisation Structurelle",
    pdfDesc: "Réorganise le flux interne du PDF et supprime les données doublonnées tout en conservant les pages.",
    audioMethod: "Compression Audio MP3",
    audioDesc: "Ajuste le débit binaire à 128 kbps, réduisant la taille sans dégradation audible de la qualité.",
    videoMethod: "Compression Vidéo HD",
    videoDesc: "Ajuste la résolution maximale à 720p et optimise les images par seconde pour réduire le poids.",
    textMethod: "Nettoyage des Espaces",
    textDesc: "Supprime les espaces inutiles, sauts de ligne et tabulations du fichier sans altérer le contenu.",
    // Tooltip
    bananaTooltip: "🍌 Faites-moi glisser vers le gorille !"
  },
  de: {
    tagline: "Lass den Gorilla deine Dateien zerquetschen!",
    formats: "Unterstützte Formate: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Max. 100 MB)",
    tabsGuide: "💡 Nutze die <strong>+</strong> Schaltfläche, um mehrere Tabs zu öffnen und Dateien gleichzeitig zu verarbeiten.",
    rights: "Alle Rechte vorbehalten.",
    dropText: "<strong>Datei hierher ziehen</strong><br>oder klicken zum Auswählen",
    noFile: "Keine Datei ausgewählt",
    compressBtn: "Komprimieren",
    statusLabel: "Status: ",
    statusIdle: "● Inaktiv",
    statusReady: "● Bereit zur Verarbeitung",
    statusPreview: "● Vorschau wird geladen...",
    statusProcessing: "⏳ Datei wird zerquetscht...",
    statusEncodingAudio: "⏳ MP3-Audio wird kodiert...",
    statusEncodingVideo: "⏳ Video wird kodiert (FFmpeg)...",
    statusDone: "✔ Fertiggestellt",
    mOrig: "Originalgröße:",
    mComp: "Endgröße:",
    mSaved: "Gesparter Speicher:",
    mRatio: "Reduzierung:",
    mMethod: "Angewendete Methode:",
    downloadPrefix: "Herunterladen",
    defaultTabTitle: "Datei",
    newTabTitle: "Neuer Tab",
    limitError: "✖ Datei überschreitet das Limit von 100 MB",
    unsupportedError: "Nicht unterstützter Dateityp für direkte Komprimierung.",
    // Methoden
    imgMethod: "Visuelle Optimierung",
    imgDesc: "Passt Bildabmessungen an, entfernt EXIF-Metadaten und optimiert die Qualität für kleinere Dateigrößen.",
    pdfMethod: "Strukturelle Optimierung",
    pdfDesc: "Ordnet interne PDF-Datenströme neu und entfernt Duplikate unter Beibehaltung aller Seiten.",
    audioMethod: "MP3-Audiokomprimierung",
    audioDesc: "Reduziert die Bitrate auf 128 kbps für eine spürbare Größenreduzierung bei gleichbleibender Qualität.",
    videoMethod: "HD-Videokomprimierung",
    videoDesc: "Skaliert die Auflösung auf maximal 720p und optimiert Bildraten für flüssige Wiedergabe bei geringer Größe.",
    textMethod: "Leerzeichen-Minimierung",
    textDesc: "Entfernt unnötige Leerzeichen, Zeilenumbrüche und Tabs, ohne den eigentlichen Inhalt zu verändern.",
    // Tooltip
    bananaTooltip: "🍌 Zieh mich zum Gorilla!"
  },
  it: {
    tagline: "Lascia che il gorilla schiacci i tuoi file!",
    formats: "Formati supportati: <strong>JPG, PNG, WEBP, PDF, MP3, WAV, MP4, WEBM, SVG, JSON, CSV, TXT</strong> (Max. 100 MB)",
    tabsGuide: "💡 Puoi aprire più schede usando il pulsante <strong>+</strong> per elaborare più file contemporaneamente.",
    rights: "Tutti i diritti riservati.",
    dropText: "<strong>Trascina un file qui</strong><br>o fai clic per selezionare",
    noFile: "Nessun file selezionato",
    compressBtn: "Comprimi",
    statusLabel: "Stato: ",
    statusIdle: "● In attesa",
    statusReady: "● Pronto per l'elaborazione",
    statusPreview: "● Caricamento anteprima...",
    statusProcessing: "⏳ Schiacciando il file...",
    statusEncodingAudio: "⏳ Codifica audio MP3...",
    statusEncodingVideo: "⏳ Ricodifica video (FFmpeg)...",
    statusDone: "✔ Completato",
    mOrig: "Dimensione originale:",
    mComp: "Dimensione finale:",
    mSaved: "Spazio risparmiato:",
    mRatio: "Riduzione:",
    mMethod: "Metodo utilizzato:",
    downloadPrefix: "Scarica",
    defaultTabTitle: "File",
    newTabTitle: "Nuova scheda",
    limitError: "✖ Il file supera il limite di 100 MB",
    unsupportedError: "Tipo di file non supportato per la compressione directa.",
    // Metodi
    imgMethod: "Ottimizzazione Visiva",
    imgDesc: "Ridimensiona le immagini, rimuove i metadati ed equilibra la qualità per ridurre lo spazio occupato.",
    pdfMethod: "Ottimizzazione Strutturale",
    pdfDesc: "Riorganizza la struttura interna del PDF e rimuove dati duplicati mantenendo tutte le pagine.",
    audioMethod: "Compressione Audio MP3",
    audioDesc: "Imposta il bitrate a 128 kbps, riducendo significativamente le dimensioni senza compromettere l'ascolto.",
    videoMethod: "Compressione Video HD",
    videoDesc: "Riduce la risoluzione massima a 720p e ottimizza i fotogrammi per alleggerire il file mantenendo fluidità.",
    textMethod: "Pulizia degli Spazi",
    textDesc: "Rimuove spazi vuoti, interruzioni di riga e tabulazioni non necessarie senza alterare il contenuto.",
    // Tooltip
    bananaTooltip: "🍌 Trascinami verso il gorilla!"
  }
};

let currentLang = 'es';

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;

  // 1. Actualizar elementos estáticos etiquetados con data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // 2. Actualizar atributos explícitos del DOM fuera de las pestañas
  const addTabBtn = document.getElementById('addTabBtn');
  if (addTabBtn) addTabBtn.title = translations[lang].newTabTitle;

  // 3. Actualizar el tooltip del sistema de física de la banana
  if (typeof bananaSystem !== 'undefined' && typeof bananaSystem.updateLanguage === 'function') {
    bananaSystem.updateLanguage(lang);
  }

  // 4. Iterar y actualizar TODAS las instancias de pestañas
  if (typeof tabs !== 'undefined' && Array.isArray(tabs)) {
    tabs.forEach(tab => {
      if (typeof tab.updateLanguage === 'function') {
        tab.updateLanguage();
      }
    });
  }
}

// Event Listeners e Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
  
  // Sincronizar idioma inicial al cargar la página
  setLanguage(currentLang);
});
