importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 1. Firebase initialize karo (Wahi config use karo jo index.html mein hai)
firebase.initializeApp({
 apiKey: "AIzaSyBETbUKtqBi6R9h4Z5GoB_-IiVF-vtW6zY",
  authDomain: "private-chat-app-e6078.firebaseapp.com",
  databaseURL: "https://private-chat-app-e6078-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "private-chat-app-e6078",
  storageBucket: "private-chat-app-e6078.firebasestorage.app",
  messagingSenderId: "84565477501",
  appId: "1:84565477501:web:b776ce04fd8fc5f0b80914"
});

const messaging = firebase.messaging();

// 2. Background Notification Handle karo
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', // Tumhara app icon
    badge: '/icon-192.png',
    data: {
      url: payload.data ? payload.data.url : '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. Notification click par app kholne ke liye
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});