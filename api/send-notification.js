// ╔══════════════════════════════════════════════════╗
// ║  api/send-notification.js                        ║
// ║  FCM v1 API — No Legacy needed!                  ║
// ╚══════════════════════════════════════════════════╝

const { GoogleAuth } = require('google-auth-library');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokens, title, body, tag } = req.body;

  if (!tokens || !tokens.length) {
    return res.status(400).json({ error: 'No tokens provided' });
  }

  try {
    // Google OAuth2 access token generate karo
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const accessToken = await auth.getAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Har token pe notification bhejo
    const results = await Promise.allSettled(
      tokens.map(token =>
        fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: title || '🚗 Mr Car Lover',
                body: body || 'Kuch naya update hai!',
              },
              webpush: {
                headers: { Urgency: 'high' },
                notification: {
                  title: title || '🚗 Mr Car Lover',
                  body: body || 'Kuch naya update hai!',
                  icon: 'https://mrcarlover.vercel.app/icon-192.png',
                  badge: 'https://mrcarlover.vercel.app/icon-192.png',
                  tag: tag || 'mcl-notif',
                  vibrate: [200, 100, 200],
                  requireInteraction: false,
                  actions: [{ action: 'open', title: '📋 Kaam Dekho' }]
                },
                fcm_options: {
                  link: 'https://mrcarlover.vercel.app'
                }
              }
            }
          })
        }).then(r => r.json())
      )
    );

    const sent     = results.filter(r => r.status === 'fulfilled').length;
    const failed   = results.filter(r => r.status === 'rejected').length;

    console.log(`[FCM] Sent: ${sent}, Failed: ${failed}`);
    return res.status(200).json({ success: true, sent, failed, results });

  } catch (err) {
    console.error('[FCM] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
