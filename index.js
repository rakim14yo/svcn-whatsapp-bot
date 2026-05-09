const { createBot } = require('./src/bot');
const { startKeepAlive } = require('./src/keepalive');

async function main() {
  console.log('🛰️ SVCN WhatsApp Bot starting...');
  await createBot();
  startKeepAlive();
}

main().catch(console.error);
