/**
 * Send a WhatsApp message with optional typing simulation
 */
async function sendMessage(sock, jid, text, options = {}) {
  try {
    // Simulate typing for natural feel (optional, disable if causing issues)
    if (options.typing !== false) {
      await sock.sendPresenceUpdate('composing', jid);
      await delay(1000 + Math.random() * 1500); // 1–2.5s typing
      await sock.sendPresenceUpdate('paused', jid);
    }

    await sock.sendMessage(jid, { text });
    console.log(`📤 Sent to ${jid.split('@')[0]}: "${text.slice(0, 60)}..."`);
  } catch (err) {
    console.error(`❌ Failed to send to ${jid}:`, err.message);
  }
}

/**
 * Send a message to multiple JIDs with randomized delay between each
 */
async function sendBulkMessages(sock, recipients, messageBuilder) {
  const minDelay = parseInt(process.env.DELAY_MIN_MS) || 30000;
  const maxDelay = parseInt(process.env.DELAY_MAX_MS) || 90000;

  for (let i = 0; i < recipients.length; i++) {
    const { jid, data } = recipients[i];

    try {
      const text = messageBuilder(data);
      await sendMessage(sock, jid, text, { typing: false });
    } catch (err) {
      console.error(`❌ Failed for ${jid}:`, err.message);
    }

    // Add randomized delay between messages (skip after last one)
    if (i < recipients.length - 1) {
      const waitMs = minDelay + Math.random() * (maxDelay - minDelay);
      console.log(`⏳ Waiting ${Math.round(waitMs / 1000)}s before next message...`);
      await delay(waitMs);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { sendMessage, sendBulkMessages, delay };
