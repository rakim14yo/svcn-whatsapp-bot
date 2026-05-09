/**
 * SVCN Overdue Bill Job
 * Triggered by GitHub Actions at 10AM daily
 * Sends overdue alerts to customers past their due date
 */
require('dotenv').config();
const { createBot } = require('../bot');
const { getOverdueBills } = const { getOverdueBills, toWhatsAppPhone } = require("../db");
const { overdueBillReminder } = require('../messages');
const { sendBulkMessages, delay } = require('../handlers/sender');
const { toWhatsAppPhone } = const { getOverdueBills, toWhatsAppPhone } = require("../db");

async function main() {
  console.log('🕙 Running overdue bill job...');

  const sock = await createBot();
  await waitForConnection(sock);

  const bills = await getOverdueBills();
  console.log(`⚠️ Found ${bills.length} overdue bills`);

  if (bills.length === 0) {
    console.log('✅ No overdue bills today.');
    process.exit(0);
  }

  const recipients = bills
    .filter(bill => bill.customers?.phone)
    .map(bill => ({
      jid: toWhatsAppPhone(bill.customers.phone) + '@s.whatsapp.net',
      data: { customer: bill.customers, bill }
    }));

  await sendBulkMessages(sock, recipients, ({ customer, bill }) =>
    overdueBillReminder(customer, bill)
  );

  console.log(`✅ Sent ${recipients.length} overdue alerts.`);
  await delay(3000);
  process.exit(0);
}

function waitForConnection(sock) {
  return new Promise((resolve) => {
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') resolve();
    });
    setTimeout(resolve, 15000);
  });
}

main().catch(err => {
  console.error('❌ Overdue job failed:', err);
  process.exit(1);
});
