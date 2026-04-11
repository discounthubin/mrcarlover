// ╔══════════════════════════════════════════════╗
// ║   Mr Car Lover — Service Worker  sw.js       ║
// ║   Handles: Cache, Local Push Notifications   ║
// ╚══════════════════════════════════════════════╝

const CACHE_NAME = 'mcl-cache-v3';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Nunito:wght@400;600;700;800&display=swap'
];

// ── Install: pre-cache assets ──────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('[SW] Cache partial fail (ok):', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ─────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for app, network-first for Firebase ─
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network for Firebase / Google APIs
  if (url.includes('firebasedatabase') || url.includes('googleapis') ||
      url.includes('gstatic') || url.includes('fcm.googleapis')) {
    return; // let browser handle
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          // POST requests cache nahi hote — sirf GET cache karo
if (e.request.method === 'GET') {
  caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
}
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// ── Push Notification Handler ──────────────────
self.addEventListener('push', e => {
  let data = { title: '🚗 Mr Car Lover', body: 'Kuch naya update hai!' };
  try {
    if (e.data) data = e.data.json();
  } catch (_) {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title || '🚗 Mr Car Lover', {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      tag: data.tag || 'mcl-notif',
      data: data.url || '/',
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [
        { action: 'open', title: '📋 Kaam Dekho' }
      ]
    })
  );
});

// ── Notification Click ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data || '/index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/index.html');
    })
  );
});

// ── Message Handler (from main app) ───────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleLocalNotifications(e.data.payload);
  }
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Local Scheduled Notification Scheduler ────
function scheduleLocalNotifications(payload) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const schedule = [
    {
      hour: 9, minute: 0,
      title: '🌅 Good Morning! Mr Car Lover',
      body: 'Aaj ka video kaam shuru karo! Pehle topic research karo 🎬',
      tag: 'mcl-morning'
    },
    {
      hour: 14, minute: 0,
      title: '⏰ Dopahar Ho Gayi!',
      body: 'Kaam kaisa chal raha hai? Ab tak kya complete hua? 📊',
      tag: 'mcl-noon'
    },
    {
      hour: 20, minute: 0,
      title: '🌙 Raat 8 Baje!',
      body: 'Video publish time! Kya publish hua aaj? 📢',
      tag: 'mcl-evening'
    }
  ];

  // Add deadline warning if video is overdue
  if (payload && payload.daysSinceStart >= 2 && !payload.completed) {
    schedule.push({
      hour: now.getHours(),
      minute: now.getMinutes() + 1, // immediate
      title: '⚠️ DEADLINE WARNING!',
      body: `Video ${payload.daysSinceStart} din se pending hai! Aaj zaroor complete karo!`,
      tag: 'mcl-deadline',
      requireInteraction: true
    });
  }

  schedule.forEach(item => {
    const target = new Date();
    target.setHours(item.hour, item.minute, 0, 0);

    // Skip if already past
    if (target <= now) return;

    const delay = target - now;
    setTimeout(() => {
      self.registration.showNotification(item.title, {
        body: item.body,
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        tag: item.tag,
        vibrate: [150, 75, 150],
        requireInteraction: item.requireInteraction || false,
        data: '/index.html',
        actions: [{ action: 'open', title: '📋 App Kholo' }]
      });
    }, delay);
  });
}
