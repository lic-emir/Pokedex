const assets = [
    './',
    './index.html',
    './manifest.json',
    './src/style.css',
    './src/anime.js',
    './src/script.js',
    './assets/menu.svg',
    './assets/close.svg',
    './assets/home.svg',
    './assets/heart.svg',
    './assets/search.svg',
    './assets/arrow-down-a-z.svg',
    './assets/down.svg',
    './assets/email.svg',
    './assets/help.svg',
    './assets/projects.svg',
    './assets/favicon.ico'
];

const nameCache = 'pokedex-v4';

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(nameCache).then(cache => cache.addAll(assets))
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => {
                console.log(keys);
                return Promise.all(
                    keys.filter(key => key !== nameCache).map(key => caches.delete(key))
                )
            })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        (async () => {
            const cached = await caches.match(e.request);
            if (cached) return cached;

            try {
                const respuestaRed = await fetch(e.request);
                const cache = await caches.open(nameCache);
                cache.put(e.request, respuestaRed.clone());
                return respuestaRed;
            } catch {
                // Sin caché y sin red: Response válido con error
                return new Response(JSON.stringify({ error: 'Sin conexión' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        })()
    );
});