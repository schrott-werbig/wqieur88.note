/* Notizen – Service Worker. Cacht nur die App-Hülle (kein Notizinhalt; der liegt verschlüsselt in IndexedDB). */
const CACHE = "notizen-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];
// Optional: nur cachen, falls vorhanden (z.B. pdfjs/, Tesseract). Fehlende Dateien dürfen die Installation nicht blockieren.
const OPTIONAL_ASSETS = [
  "./pdfjs/pdf.min.js",
  "./pdfjs/pdf.worker.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(CORE_ASSETS);
      await Promise.all(OPTIONAL_ASSETS.map(u => fetch(u).then(r => r.ok ? c.put(u, r) : null).catch(() => null)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Optionale OCR-Engine-Dateien: Netzwerk zuerst, sonst Cache
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
