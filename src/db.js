require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: require('ws') } }
);

async function getBillsDueTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select('id, customer_id, bill_month, amount, due_date, status, notes, customers ( id, customer_id, name, phone, area, package_mbps, package_price, connection_type, status )')
    .eq('due_date', dateStr)
    .eq('status', 'unpaid');

  if (error) throw error;
  return (data || []).filter(function(bill) { return bill.customers && bill.customers.status === 'active'; });
}

async function getOverdueBills() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select('id, customer_id, bill_month, amount, due_date, status, notes, customers ( id, customer_id, name, phone, area, package_mbps, package_price, connection_type, status )')
    .lt('due_date', today)
    .eq('status', 'unpaid');

  if (error) throw error;
  return (data || []).filter(function(bill) { return bill.customers && bill.customers.status === 'active'; });
}

async function markBillPaid(billId) {
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from('bills')
    .update({
      status: 'paid',
      notes: 'whatsapp_confirmed_' + timestamp
    })
    .eq('id', billId);

  if (error) throw error;
}

async function getUnpaidBillByPhone(phone) {
  const localPhone = toLocalPhone(phone);

  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, customer_id, name, phone, area, package_mbps, package_price, connection_type, status')
    .eq('phone', localPhone)
    .single();

  if (custErr || !customer) return null;

  const { data: bills, error: billErr } = await supabase
    .from('bills')
    .select('id, customer_id, bill_month, amount, due_date, status, notes')
    .eq('customer_id', customer.customer_id)
    .eq('status', 'unpaid')
    .order('due_date', { ascending: true })
    .limit(1);

  if (billErr || !bills || !bills.length) return null;

  return { customer: customer, bill: bills[0] };
}

async function getCustomerByPhone(phone) {
  const localPhone = toLocalPhone(phone);

  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_id, name, phone, area, package_mbps, package_price, connection_type, status')
    .eq('phone', localPhone)
    .single();

  if (error) return null;
  return data;
}

async function logComplaint(customerId, message, phone) {
  const { error } = await supabase
    .from('alert_log')
    .insert({
      customer_id: customerId || null,
      alert_type: 'complaint',
      message: message.slice(0, 500),
      phone: phone,
      created_at: new Date().toISOString()
    });

  if (error) console.error('Failed to log complaint:', error.message);
}

function toLocalPhone(phone) {
  var p = phone.replace(/\D/g, '');
  if (p.startsWith('880')) p = '0' + p.slice(3);
  if (!p.startsWith('0')) p = '0' + p;
  return p;
}

function toWhatsAppPhone(phone) {
  var p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '880' + p.slice(1);
  return p;
}

module.exports = {
  supabase,
  getBillsDueTomorrow,
  getOverdueBills,
  markBillPaid,
  getUnpaidBillByPhone,
  getCustomerByPhone,
  logComplaint,
  toLocalPhone,
  toWhatsAppPhone
};
