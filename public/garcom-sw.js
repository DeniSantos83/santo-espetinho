const CACHE = "espetaria-garcom-v1"
const BASE = "/santo-espetinho/"
const SHELL = [BASE, BASE + "garcom.webmanifest", BASE + "icons/garcom-192.png", BASE + "icons/garcom-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("espetaria-garcom-") && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]))
})
self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return
  if (request.mode !== "navigate" && !/\.(?:js|css|png|webp|svg|ico|webmanifest|woff2?)(?:$|\?)/i.test(url.pathname)) return
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)))
      }
      return response
    }).catch(async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      if (request.mode === "navigate") {
        const shell = await caches.match(BASE)
        if (shell) return shell
      }
      return Response.error()
    })
  )
})
