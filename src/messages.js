// ─── Billing Messages ─────────────────────────────────────────────────────────

/**
 * Bill due tomorrow reminder
 */
function billReminder(customer, bill) {
  const dueDate = formatDate(bill.due_date);
  return `🛰️ *Satellite Vision Cable Network*

আসসালামু আলাইকুম ${customer.name} ভাই/আপু,

আপনার মাসিক বিল কাল (${dueDate}) বাকি আছে।

📦 প্যাকেজ: ${customer.package_mbps + 'Mbps (' + customer.connection_type + ')'}
💰 বিল: *৳${bill.amount}*
📅 শেষ তারিখ: ${dueDate}

বিকাশে পাঠান: *01842292646* (Personal)

পেমেন্ট করার পর শুধু *PAID* লিখে পাঠান।

ধন্যবাদ! 🙏`;
}

/**
 * Overdue bill reminder (stricter tone)
 */
function overdueBillReminder(customer, bill) {
  const dueDate = formatDate(bill.due_date);
  const daysOverdue = Math.floor(
    (new Date() - new Date(bill.due_date)) / (1000 * 60 * 60 * 24)
  );

  return `⚠️ *Satellite Vision Cable Network*

${customer.name} ভাই/আপু,

আপনার বিল *${daysOverdue} দিন* বাকি আছে।

📦 প্যাকেজ: ${customer.package_mbps + 'Mbps (' + customer.connection_type + ')'}
💰 বকেয়া বিল: *৳${bill.amount}*
📅 শেষ তারিখ ছিল: ${dueDate}

দ্রুত বিকাশে পাঠান: *01842292646* (Personal)

পেমেন্টের পর *PAID* লিখুন।

অন্যথায় সংযোগ বিচ্ছিন্ন হতে পারে। 🙏`;
}

/**
 * Payment confirmed (to customer)
 */
function paymentConfirmedToCustomer(customer, bill) {
  return `✅ *Payment Received!*

ধন্যবাদ ${customer.name} ভাই/আপু!

আপনার ৳${bill.amount} পেমেন্ট নিশ্চিত হয়েছে।
আমরা শীঘ্রই যাচাই করব।

*Satellite Vision Cable Network* 🛰️
📞 01842292646 | 01634348602`;
}

/**
 * Payment alert to owner
 */
function paymentAlertToOwner(customer, bill, senderPhone) {
  return `✅ *পেমেন্ট নিশ্চিতকরণ*

👤 নাম: ${customer.name}
📍 এলাকা: ${customer.area || 'নাসিরাবাদ'}
📞 ফোন: ${senderPhone}
📦 প্যাকেজ: ${customer.package_mbps + 'Mbps (' + customer.connection_type + ')'}
💰 পরিমাণ: ৳${bill.amount}
📅 বিল তারিখ: ${formatDate(bill.due_date)}

⚡ বিকাশ রেফারেন্স যাচাই করুন।`;
}

// ─── Support Messages ─────────────────────────────────────────────────────────

function welcomeMessage(customerName) {
  return `🛰️ *Satellite Vision Cable Network*

আসসালামু আলাইকুম${customerName ? ' ' + customerName : ''}!

আমি SVCN-র স্বয়ংক্রিয় সহায়তা বট।

নিচের যেকোনো কমান্ড পাঠান:

💰 *BILL* — বর্তমান বিল দেখুন
✅ *PAID* — পেমেন্ট নিশ্চিত করুন
📶 *SPEED* — স্পিড টেস্ট সাহায্য
🔧 *PROBLEM* — সমস্যা রিপোর্ট করুন
📦 *PACKAGE* — প্যাকেজ তথ্য
📞 *CALL* — আমাদের কল করুন

সরাসরি সাহায্যের জন্য: *01842292646*`;
}

function billInfoMessage(customer, bill) {
  const isPaid = bill.status === 'paid';
  const statusText = isPaid ? '✅ পরিশোধিত' : '❌ বাকি';
  return `📋 *আপনার বিল তথ্য*

👤 নাম: ${customer.name} (${customer.customer_id})
📦 প্যাকেজ: ${customer.package_mbps}Mbps ${customer.connection_type}
💰 বিল: ৳${bill.amount}
📅 তারিখ: ${formatDate(bill.due_date)}
🗓️ মাস: ${bill.bill_month}
📊 অবস্থা: ${statusText}

${!isPaid ? 'পেমেন্টের পর *PAID* লিখুন।\nবিকাশ: *01842292646*' : 'আপনার বিল পরিশোধিত। ধন্যবাদ! 🙏'}`;
}

function packageInfoMessage() {
  return `📦 *SVCN WiFi প্যাকেজসমূহ*

| গতি | মাসিক মূল্য |
|-----|------------|
| 20 Mbps | ৳500 |
| 35 Mbps | ৳650 |
| 50 Mbps | ৳800 |
| 65 Mbps | ৳950 |
| 80 Mbps | ৳1100 |

📺 *ডিশ টিভি*
• কেবল: ৳350/মাস
• সেট-টপ বক্স: ৳500/মাস
• কম্বো (WiFi+ডিশ): ৳1050/মাস

সকল প্যাকেজে: Facebook, YouTube, BDIX, FTP আনলিমিটেড ✅

আগ্রহী? কল করুন: *01842292646*`;
}

function speedTroubleMessage() {
  return `📶 *স্পিড সমস্যা সমাধান*

প্রথমে এগুলো চেষ্টা করুন:

1️⃣ রাউটার রিস্টার্ট দিন (10 সেকেন্ড বন্ধ রাখুন)
2️⃣ একটু পর fast.com বা speedtest.net-এ টেস্ট করুন
3️⃣ সরাসরি ক্যাবলে কানেক্ট করে টেস্ট করুন

সমস্যা থাকলে স্ক্রিনশট তুলে পাঠান।

তখনও সমস্যা? কল করুন: *01842292646* 📞`;
}

function complaintReceivedMessage(ticketRef) {
  return `🔧 *সমস্যা রিপোর্ট পেয়েছি*

আপনার অভিযোগ নথিভুক্ত হয়েছে।
রেফারেন্স: *#${ticketRef}*

আমাদের টিম শীঘ্রই যোগাযোগ করবে।
জরুরি হলে কল করুন: *01842292646* 📞

ধন্যবাদ! 🙏`;
}

function callInfoMessage() {
  return `📞 *যোগাযোগ করুন*

*Satellite Vision Cable Network*
📍 নাসিরাবাদ হাউজিং সোসাইটি, চট্টগ্রাম

📱 01842292646
📱 01634348602
📧 satellitevisioncablenetwork@gmail.com

সকাল ৯টা — রাত ১০টা`;
}

function unknownCommandMessage() {
  return `❓ বুঝতে পারিনি।

*HELP* লিখুন সব কমান্ড দেখতে।
অথবা কল করুন: *01842292646* 📞`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

module.exports = {
  billReminder,
  overdueBillReminder,
  paymentConfirmedToCustomer,
  paymentAlertToOwner,
  welcomeMessage,
  billInfoMessage,
  packageInfoMessage,
  speedTroubleMessage,
  complaintReceivedMessage,
  callInfoMessage,
  unknownCommandMessage,
};
