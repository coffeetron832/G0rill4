# 1.4.2 (2026-11-26)
- Video removed: MP4 and WEBM files are no longer accepted, since the in-browser video engine (FFmpeg) was not reliable.
- FFmpeg is no longer loaded by the page, so `unpkg.com` is no longer needed for video, and the content security policy is stricter.

## 1.4.1 (2026-11-25)
- Corrección: la compresión de video no funcionaba por la política de contenido (CSP), que bloqueaba la carga del núcleo de FFmpeg.
- El núcleo de FFmpeg se carga desde unpkg.com.

# 1.4.0 (2026-11-25)
- Compression level selector with per-file analysis (only levels that reduce file size).
- PNG compression in Web Worker with SHA-384 verification of the libraries.
- Limits on video size (60 MB) and image pixel count, plus specific error messages.
- Percentage ring and final size displayed in the results.
- Share on WhatsApp, X, Facebook, LinkedIn, and copy link.
- Interface translated into 7 languages and privacy notice.
- SRI hashes and Content Security Policy.