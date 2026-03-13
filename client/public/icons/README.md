# PWA / app icons

For the best “Add to Home Screen” and app icon experience, add PNG versions here:

- **icon-512x512.png** — 512×512 px (required; the manifest uses this for all icon sizes)

Add this file here so the PWA manifest and “Add to Home Screen” work without 404s. You can export from `../logo.svg` in a design tool or with an SVG-to-PNG converter. Without it, the browser will log a manifest icon error (harmless but noisy).
