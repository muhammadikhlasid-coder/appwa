/**
 * Safe WA Engine — Baileys HTTP Wrapper (Multi-Tenant)
 * ========================================
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const BASE_AUTH_DIR = './auth_info';

// ── State ─────────────────────────────────────────────────────────────────────
const sessions = new Map();
const logger = pino({ level: 'silent' });

// Helper function untuk membersihkan cache auth yang error
function clearAuth(sessionId) {
  const dir = path.join(BASE_AUTH_DIR, sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🧹 Auth cache cleared for session: ${sessionId}`);
  }
}

// ── Baileys Connection ─────────────────────────────────────────────────────────
async function connectToWhatsApp(sessionId, sessionObj) {
  const authDir = path.join(BASE_AUTH_DIR, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  sessionObj.sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    browser: ['Safe WA Gateway', 'Chrome', '2.0.0'],
    connectTimeoutMs: 30000,
    defaultQueryTimeoutMs: 30000,
  });

  sessionObj.sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionObj.connectionState = 'connecting';
      sessionObj.qrCodeBase64 = await qrcode.toDataURL(qr);
      console.log(`📱 QR Code ready for ${sessionId}`);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      sessionObj.connectionState = 'disconnected';
      sessionObj.qrCodeBase64 = null;
      console.log(`❌ Connection closed for ${sessionId} (code: ${code})`);
      
      if (code === 405 || code === 401) {
        clearAuth(sessionId);
      } else if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(sessionId, sessionObj), 3000);
      }
    }

    if (connection === 'open') {
      sessionObj.connectionState = 'connected';
      sessionObj.qrCodeBase64 = null;
      sessionObj.connectionInfo = {
        jid: sessionObj.sock.user?.id,
        name: sessionObj.sock.user?.name,
        phone: sessionObj.sock.user?.id?.split(':')[0],
      };
      console.log(`✅ WhatsApp Connected! Session: ${sessionId}, Number: ${sessionObj.connectionInfo.phone}`);
    }
  });

  sessionObj.sock.ev.on('creds.update', saveCreds);
}

function getOrCreateSession(sessionId) {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  const sessionObj = {
    sock: null,
    qrCodeBase64: null,
    connectionState: 'disconnected',
    connectionInfo: {}
  };
  sessions.set(sessionId, sessionObj);
  connectToWhatsApp(sessionId, sessionObj);
  return sessionObj;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalizePhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const normalized = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
  return `${normalized}@s.whatsapp.net`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── API Endpoints ──────────────────────────────────────────────────────────────

app.post('/sessions/:id/connect', (req, res) => {
  const sessionId = req.params.id;
  const sessionObj = getOrCreateSession(sessionId);
  res.json({ success: true, state: sessionObj.connectionState });
});

app.get('/sessions/:id/status', (req, res) => {
  const sessionId = req.params.id;
  const sessionObj = sessions.get(sessionId);
  if (!sessionObj) return res.status(404).json({ error: 'Session not found' });
  
  res.json({
    state: sessionObj.connectionState,
    connected: sessionObj.connectionState === 'connected',
    phone: sessionObj.connectionInfo.phone || null,
    name: sessionObj.connectionInfo.name || null,
    has_qr: !!sessionObj.qrCodeBase64,
  });
});

app.get('/sessions/:id/qr', (req, res) => {
  const sessionId = req.params.id;
  const sessionObj = sessions.get(sessionId);
  if (!sessionObj) return res.status(404).send('Session not found. Call /connect first.');
  
  if (sessionObj.connectionState === 'connected') {
    return res.json({ connected: true, message: 'Already connected' });
  }
  if (!sessionObj.qrCodeBase64) {
    return res.status(503).json({ error: 'QR not ready yet' });
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Safe WA Gateway — Scan QR</title>
      <meta http-equiv="refresh" content="15">
      <style>
        body { background: #0d0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; color: white; }
        img { border-radius: 16px; border: 4px solid #00d68f; }
      </style>
    </head>
    <body>
      <h2>Scan QR Code for Session: ${sessionId}</h2>
      <img src="${sessionObj.qrCodeBase64}" width="280" />
    </body>
    </html>
  `);
});

app.post('/sessions/:id/send', async (req, res) => {
  const sessionId = req.params.id;
  const sessionObj = sessions.get(sessionId);
  if (!sessionObj || sessionObj.connectionState !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }

  const { phone, text, delay_ms = 2000 } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone and text required' });

  const jid = normalizePhone(phone);
  try {
    await sessionObj.sock.sendPresenceUpdate('composing', jid);
    await sleep(delay_ms);
    await sessionObj.sock.sendPresenceUpdate('paused', jid);
    const result = await sessionObj.sock.sendMessage(jid, { text });
    res.json({ success: true, message_id: result.key.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/sessions/:id/logout', async (req, res) => {
  const sessionId = req.params.id;
  const sessionObj = sessions.get(sessionId);
  if (sessionObj && sessionObj.sock) {
    try {
      await sessionObj.sock.logout();
    } catch(e) {}
    sessions.delete(sessionId);
    clearAuth(sessionId);
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Safe WA Engine (Multi-Tenant) ready at port ${PORT}`);
});
