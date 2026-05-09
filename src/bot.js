require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const { handleMessage } = require('./handlers/messageHandler');

const SESSION_DIR = path.join(__dirname, '..', 'session');
const logger = pino({ level: 'silent' }); // suppress Baileys noise

let sock = null;

async function createBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    browser: ['SVCN Bot', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false, // less detectable
  });

  // Save credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Connection state handler
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan the QR code above with your WhatsApp bot number\n');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log(`❌ Connection closed (code ${code}). Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 5 seconds...');
        setTimeout(createBot, 5000);
      } else {
        console.log('🚫 Logged out. Delete session folder and restart to re-scan QR.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      console.log('✅ SVCN Bot connected to WhatsApp!');
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // ignore own messages

      try {
        await handleMessage(sock, msg);
      } catch (err) {
        console.error('Error handling message:', err);
      }
    }
  });

  return sock;
}

function getSocket() {
  return sock;
}

module.exports = { createBot, getSocket };
