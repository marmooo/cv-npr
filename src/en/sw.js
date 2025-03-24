const CACHE_NAME = "2025-02-24 00:00";
const urlsToCache = [
  "/cv-npr/",
  "/cv-npr/en/",
  "/cv-npr/coi-serviceworker.js",
  "/cv-npr/index.js",
  "/cv-npr/img/before.webp",
  "/cv-npr/img/after.webp",
  "/cv-npr/img/anime-64.webp",
  "/cv-npr/img/car-64.webp",
  "/cv-npr/img/cat-64.webp",
  "/cv-npr/img/castle-64.webp",
  "/cv-npr/favicon/favicon.svg",
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js",
];

importScripts(
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js",
);

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/cv-npr/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/cv-npr/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/cv-npr/opencv/threads/opencv_js.js";
  } else {
    return "/cv-npr/opencv/wasm/opencv_js.js";
  }
}

async function addOpenCVPaths() {
  const opencvPath = await getOpenCVPath();
  urlsToCache.push(opencvPath);
  urlsToCache.push(opencvPath.slice(0, -3) + ".wasm");
}

addOpenCVPaths();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});
