/**
 * SVCN Bill Reminder Job
 * Triggered by GitHub Actions at 9AM daily
 * Sends reminders to customers with bills due tomorrow
 */
require('dotenv').config();
const { createBot } = require('../bot');
const { getBillsDueTomorrow } = const { getBillsDueTomorrow, toWhatsAppPhone } = require("../db");
const { billReminder } = require('../messages');
const { sendBulkMessages, delay } = require('../handlers/sender');
const { toWhatsAppPhone } = const { getBillsDueTomorrow, toWhatsAppPhone } = require("../db");

async function main() {
  console.log('🕘 Running bill reminder job...');

  // Connect WhatsApp
  const sock = await createBot();

  // Wait for connection
  await waitForConnection(sock);

  // Get today's due bills
  const bills = await getBillsDueTomorrow();
  console.log(`📋 Found ${bills.length} bills due tomorrow`);

  if (bills.length === 0) {
    console.log('✅ No reminders needed today.');
    process.exit(0);
  }

  // Build recipient list
  const recipients = bills
    .filter(bill => bill.customers?.phone) // must have phone
    .map(bill => ({
      jid: toWhatsAppPhone(bill.customers.phone) + '@s.whatsapp.net',
      data: { customer: bill.customers, bill }
    }));

  // Send with randomized delays
  await sendBulkMessages(sock, recipients, ({ customer, bill }) =>
    billReminder(customer, bill)
  );

  console.log(`✅ Sent ${recipients.length} reminders.`);

  // Small wait before exit to ensure messages are delivered
  await delay(3000);
  process.exit(0);
}

function waitForConnection(sock) {
  return new Promise((resolve) => {
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') resolve();
    });
    // If already connected
    setTimeout(resolve, 15000); // timeout fallback
  });
}

main().catch(err => {
  console.error('❌ Reminder job failed:', err);
  process.exit(1);
});
