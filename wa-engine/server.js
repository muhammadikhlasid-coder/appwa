/**
 * Safe WA Engine — Baileys HTTP Wrapper
 * ========================================
 * HTTP server yang menerima request dari FastAPI backend
 * lalu mengirim ke WhatsApp via Baileys (gratis, tanpa Evolution).
 *
 * Endpoints:
 *   GET  /status   — cek koneksi WA
 *   GET  /qr       — ambil QR code (base64 PNG)
 *   POST /send     — kirim pesan (sudah ter-anti-ban dari backend)
 *   POST /presence — kirim typing indicator
 *   POST /logout   — logout sesi
 *
 * Port: 3001 (FastAPI backend akan call ke sini)
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const AUTH_DIR = './auth_info'; // QR session disimpan di sini

// Helper function untuk membersihkan cache auth yang error
function clearAuth() {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log('🧹 Auth cache cleared due to error (405/401).');
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
let sock = null;
let qrCodeBase64 = null;
let connectionState = 'disconnected'; // disconnected | connecting | connected
let connectionInfo = {};

// ── Logger ────────────────────────────────────────────────────────────────────
const logger = pino({ level: 'silent' }); // silent agar log bersih

// ── Baileys Connection ─────────────────────────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    browser: ['Safe WA Gateway', 'Chrome', '2.0.0'],
    // Delay alami untuk menghindari deteksi bot
    connectTimeoutMs: 30000,
    defaultQueryTimeoutMs: 30000,
  });

  // ── Event: QR Code ─────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionState = 'connecting';
      qrCodeBase64 = await qrcode.toDataURL(qr);
      console.log('📱 QR Code ready — scan via /qr endpoint atau terminal');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      connectionState = 'disconnected';
      qrCodeBase64 = null;
      console.log(`❌ Connection closed (code: ${code}) — reconnect: ${shouldReconnect}`);
      
      // Jika nyangkut di 405 atau 401, bersihkan cache agar bisa scan ulang
      if (code === 405 || code === 401) {
        clearAuth();
        console.log('Restarting node process to apply clean auth state...');
        process.exit(1); // biarkan user/PM2 me-restart agar state memory benar-benar bersih
      }

      if (shouldReconnect && code !== 405 && code !== 401) {
        setTimeout(connectToWhatsApp, 3000);
      }
    }

    if (connection === 'open') {
      connectionState = 'connected';
      qrCodeBase64 = null;
      connectionInfo = {
        jid: sock.user?.id,
        name: sock.user?.name,
        phone: sock.user?.id?.split(':')[0],
      };
      console.log(`✅ WhatsApp Connected! Number: ${connectionInfo.phone}`);
    }
  });

  // ── Event: Save Credentials ────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  // +62 812-3456-7890 → 628123456789@s.whatsapp.net
  const cleaned = phone.replace(/[^0-9]/g, '');
  const normalized = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
  return `${normalized}@s.whatsapp.net`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── API Endpoints ──────────────────────────────────────────────────────────────

// Health check
app.get('/status', (req, res) => {
  res.json({
    state: connectionState,
    connected: connectionState === 'connected',
    phone: connectionInfo.phone || null,
    name: connectionInfo.name || null,
    has_qr: !!qrCodeBase64,
  });
});

// QR Code untuk scan
app.get('/qr', (req, res) => {
  if (connectionState === 'connected') {
    return res.json({ connected: true, message: 'Already connected, no QR needed' });
  }
  if (!qrCodeBase64) {
    return res.status(503).json({ error: 'QR not ready yet, wait a few seconds...' });
  }
  // Return HTML dengan QR image
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Safe WA Gateway — Scan QR</title>
      <meta http-equiv="refresh" content="15">
      <style>
        body { background: #0d0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; color: white; }
        img { border-radius: 16px; border: 4px solid #00d68f; }
        h2 { color: #00d68f; margin-bottom: 8px; }
        p { color: #888; font-size: 13px; }
      </style>
    </head>
    <body>
      <h2>Scan QR Code</h2>
      <img src="${qrCodeBase64}" width="280" />
      <p>Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat</p>
      <p style="color:#555">Halaman auto-refresh setiap 15 detik</p>
    </body>
    </html>
  `);
});

// Send message (dipanggil oleh FastAPI backend)
// Body: { phone, text, delay_ms (opsional) }
app.post('/send', async (req, res) => {
  const { phone, text, delay_ms = 2000 } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ error: 'phone and text are required' });
  }

  if (connectionState !== 'connected') {
    return res.status(503).json({
      error: 'WhatsApp not connected',
      state: connectionState,
      qr_url: 'http://localhost:3001/qr',
    });
  }

  const jid = normalizePhone(phone);

  try {
    // 1. Kirim typing indicator (composing)
    await sock.sendPresenceUpdate('composing', jid);

    // 2. Tunggu sesuai delay (simulasi manusia mengetik)
    await sleep(delay_ms);

    // 3. Pause typing
    await sock.sendPresenceUpdate('paused', jid);

    // 4. Kirim pesan
    const result = await sock.sendMessage(jid, { text });

    console.log(`📤 Sent to ${phone}: "${text.substring(0, 40)}..." [${result.key.id}]`);
    res.json({
      success: true,
      message_id: result.key.id,
      to: phone,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error(`❌ Send error to ${phone}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Presence update (typing indicator standalone)
app.post('/presence', async (req, res) => {
  const { phone, status = 'composing' } = req.body;
  if (connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  try {
    await sock.sendPresenceUpdate(status, normalizePhone(phone));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  try {
    await sock?.logout();
    connectionState = 'disconnected';
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       Safe WA Engine — Baileys v6        ║
║  HTTP API ready at http://localhost:${PORT}  ║
║  QR Code: http://localhost:${PORT}/qr       ║
╚══════════════════════════════════════════╝
  `);
  connectToWhatsApp();
});
