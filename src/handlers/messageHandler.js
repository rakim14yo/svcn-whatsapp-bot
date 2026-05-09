require('dotenv').config();
const {
  getUnpaidBillByPhone,
  getCustomerByPhone,
  markBillPaid,
  logComplaint,
  toLocalPhone,
} = require('../db');
const {
  welcomeMessage,
  billInfoMessage,
  packageInfoMessage,
  speedTroubleMessage,
  complaintReceivedMessage,
  callInfoMessage,
  unknownCommandMessage,
  paymentConfirmedToCustomer,
  paymentAlertToOwner,
} = require('../messages');
const { sendMessage } = require('./sender');

const OWNER_JID = process.env.OWNER_PHONE + '@s.whatsapp.net';

async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid.includes('g.us')) return;

  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim().toUpperCase();

  if (!text) return;

  const senderPhone = jid.replace('@s.whatsapp.net', '');
  const localPhone = toLocalPhone(senderPhone);

  console.log(`📩 Message from ${senderPhone}: "${text}"`);

  if (text === 'PAID' || text === 'পেইড' || text === 'PAYMENT') {
    await handlePaidConfirmation(sock, jid, localPhone, senderPhone);
    return;
  }

  switch (text) {
    case 'HI': case 'HELLO': case 'HELP': case 'START':
    case 'হ্যালো': case 'হেল্প': {
      const customer = await getCustomerByPhone(localPhone);
      await sendMessage(sock, jid, welcomeMessage(customer?.name));
      break;
    }
    case 'BILL': case 'বিল': case 'BALANCE': {
      const result = await getUnpaidBillByPhone(localPhone);
      if (result) {
        await sendMessage(sock, jid, billInfoMessage(result.customer, result.bill));
      } else {
        await sendMessage(sock, jid, `✅ আপনার কোনো বকেয়া বিল নেই!\n\nধন্যবাদ 🙏\nসমস্যা হলে: *01842292646*`);
      }
      break;
    }
    case 'PACKAGE': case 'প্যাকেজ': case 'PACKAGES': case 'PRICE': {
      await sendMessage(sock, jid, packageInfoMessage());
      break;
    }
    case 'SPEED': case 'স্পিড': case 'SLOW': case 'INTERNET': {
      await sendMessage(sock, jid, speedTroubleMessage());
      break;
    }
    case 'PROBLEM': case 'ISSUE': case 'সমস্যা': case 'COMPLAINT': {
      await handleComplaint(sock, jid, localPhone, 'General complaint via WhatsApp');
      break;
    }
    case 'CALL': case 'কল': case 'CONTACT': case 'NUMBER': {
      await sendMessage(sock, jid, callInfoMessage());
      break;
    }
    default: {
      const rawText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
      if (rawText.length > 20) {
        await handleComplaint(sock, jid, localPhone, rawText);
      } else {
        await sendMessage(sock, jid, unknownCommandMessage());
      }
      break;
    }
  }
}

async function handlePaidConfirmation(sock, jid, localPhone, senderPhone) {
  const result = await getUnpaidBillByPhone(localPhone);
  if (!result) {
    await sendMessage(sock, jid, `❓ আপনার কোনো বকেয়া বিল খুঁজে পাইনি।\n\nসমস্যা হলে কল করুন: *01842292646*`);
    return;
  }
  const { customer, bill } = result;
  await markBillPaid(bill.id);
  await sendMessage(sock, jid, paymentConfirmedToCustomer(customer, bill));
  await sendMessage(sock, OWNER_JID, paymentAlertToOwner(customer, bill, localPhone));
  console.log(`✅ Payment confirmed: ${customer.name} ৳${bill.amount}`);
}

async function handleComplaint(sock, jid, localPhone, message) {
  const customer = await getCustomerByPhone(localPhone);
  const ticketRef = Date.now().toString().slice(-6);
  await logComplaint(customer?.id, message, localPhone);
  await sendMessage(sock, jid, complaintReceivedMessage(ticketRef));
  const ownerAlert = `🔧 *নতুন অভিযোগ #${ticketRef}*\n\n👤 ${customer?.name || 'অপরিচিত'}\n📞 ${localPhone}\n💬 ${message.slice(0, 200)}`;
  await sendMessage(sock, OWNER_JID, ownerAlert);
  console.log(`🔧 Complaint logged: ${localPhone} - ${message.slice(0, 50)}`);
}

module.exports = { handleMessage };
