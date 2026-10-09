// Le service worker de « Lire ensemble » : produit par src/pwa.py, ne pas retoucher.
// La page passe d'abord par le réseau, pour que les mises à jour arrivent ; sans réseau, le cache.
// Polices, icônes et PDF sont gardés au premier usage. Rien n'est envoyé nulle part.
// Les sons de la voix enregistrée ont leur cache à eux, qui survit aux publications : leur adresse porte la
// version de la voix (?v=…), et ils sont demandés entiers (sans « Range ») pour pouvoir être gardés.
const VERSION = "lire-b7ded4b530";
const SOCLE = ["./", "assets/polices/andika-400-latin.woff2", "assets/polices/andika-700-latin.woff2",
  "assets/polices/playwrite-fr-trad.woff2", "assets/icones/icone-192.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SOCLE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k.startsWith("lire-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.url.includes("/assets/voix/")) {
    e.respondWith(caches.open("voix-lire").then(c => c.match(r.url).then(t => t || fetch(r.url).then(rep => {
      if (rep.status === 200) c.put(r.url, rep.clone());
      return rep;
    }))));
    return;
  }
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(rep => { const c = rep.clone(); caches.open(VERSION).then(x => x.put("./", c)); return rep; })
      .catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(r).then(trouve => trouve || fetch(r).then(rep => {
    if (rep.ok) { const c = rep.clone(); caches.open(VERSION).then(x => x.put(r, c)); }
    return rep;
  })));
});
