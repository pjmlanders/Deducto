# PWA / app icons

For the best “Add to Home Screen” and app icon experience, add PNG versions here:

- **icon-512x512.png** — 512×512 px (used by the PWA manifest)
- **icon-192x192.png** — 192×192 px (optional; manifest can fall back to 512)

You can export these from `logo.svg` (e.g. in a design tool or with an SVG-to-PNG converter). The repo’s logo is `public/logo.svg` (emerald “D” + minus mark).

If these files are missing, the PWA will still work; the manifest will request them and some environments may show a default icon.
