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
const logger = pino({ level: 'silent' });

let sock = null;
let currentQR = null;

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
    printQRInTerminal: false,
    browser: ['SVCN Bot', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', function(update) {
    var connection = update.connection;
    var lastDisconnect = update.lastDisconnect;
    var qr = update.qr;

    if (qr) {
      currentQR = qr;
      console.log('QR code ready. Open this URL to scan:');
      console.log('https://' + (process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app') + '/qr');
    }

    if (connection === 'close') {
      var code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output ? lastDisconnect.error.output.statusCode : 0;
      var shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('Connection closed, code: ' + code);
      if (shouldReconnect) {
        setTimeout(createBot, 5000);
      } else {
        console.log('Logged out. Delete session folder and restart.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      currentQR = null;
      console.log('SVCN Bot connected to WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async function(update) {
    var messages = update.messages;
    var type = update.type;
    if (type !== 'notify') return;
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      try {
        await handleMessage(sock, msg);
      } catch (err) {
        console.error('Error handling message:', err);
      }
    }
  });

  return sock;
}

function getSocket() { return sock; }
function getCurrentQR() { return currentQR; }

module.exports = { createBot, getSocket, getCurrentQR };
