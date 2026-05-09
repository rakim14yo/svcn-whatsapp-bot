require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');`nconst ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: require('ws') } }
);

// ─── Schema reference (from svcn-tracker Supabase) ───────────────────────────
// customers: id (uuid), customer_id (text), name, phone (01XXXXXXXXX), address, area, package_mbps (int)
// bills:     id (uuid), customer_id (text FK), bill_month (text YYYY-MM), amount (int4),
//            due_date (date), issued_date (date), status (text: 'unpaid'|'paid'), notes

// ─── Bill Queries ─────────────────────────────────────────────────────────────

/**
 * Get bills due tomorrow with customer info joined
 */
async function getBillsDueTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select(`
      id,
      customer_id,
      bill_month,
      amount,
      due_date,
      status,
      notes,
      customers!bills_customer_id_fkey (
        id,
        customer_id,
        name,
        phone,
        area,
        package_mbps,
        package_price,
        connection_type,
        status
      )
    `)
    .eq('due_date', dateStr)
    .eq('status', 'unpaid');

  if (error) throw error;

  // Skip suspended customers — they know their connection is off
  return (data || []).filter(bill => bill.customers?.status === 'active');
}

/**
 * Get overdue unpaid bills (due_date in the past, still unpaid)
 */
async function getOverdueBills() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bills')
    .select(`
      id,
      customer_id,
      bill_month,
      amount,
      due_date,
      status,
      notes,
      customers!bills_customer_id_fkey (
        id,
        customer_id,
        name,
        phone,
        area,
        package_mbps,
        package_price,
        connection_type,
        status
      )
    `)
    .lt('due_date', today)
    .eq('status', 'unpaid');

  if (error) throw error;

  // Skip suspended customers
  return (data || []).filter(bill => bill.customers?.status === 'active');
}

/**
 * Mark a bill as paid (sets status = 'paid', logs method in notes)
 */
async function markBillPaid(billId) {
  const { error } = await supabase
    .from('bills')
    .update({
      status: 'paid',
      notes: `whatsapp_confirmed_${new Date().toISOString()}`
    })
    .eq('id', billId);

  if (error) throw error;
}

/**
 * Get a customer's latest unpaid bill by their WhatsApp phone number
 * Phone in DB is stored as 01XXXXXXXXX (local format)
 */
async function getUnpaidBillByPhone(phone) {
  const localPhone = toLocalPhone(phone);

  // Find customer by phone
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, customer_id, name, phone, area, package_mbps, package_price, connection_type, status')
    .eq('phone', localPhone)
    .single();

  if (custErr || !customer) return null;

  // Find their oldest unpaid bill
  const { data: bills, error: billErr } = await supabase
    .from('bills')
    .select('id, customer_id, bill_month, amount, due_date, status, notes')
    .eq('customer_id', customer.customer_id)
    .eq('status', 'unpaid')
    .order('due_date', { ascending: true })
    .limit(1);

  if (billErr || !bills?.length) return null;

  return { customer, bill: bills[0] };
}

/**
 * Get customer by WhatsApp phone number
 */
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

/**
 * Log complaint to alert_log table (already exists in your DB)
 */
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

// ─── Phone Helpers ────────────────────────────────────────────────────────────

/**
 * Convert WhatsApp JID phone (8801XXXXXXXXX) → local DB format (01XXXXXXXXX)
 */
function toLocalPhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('880')) p = '0' + p.slice(3);
  if (!p.startsWith('0')) p = '0' + p;
  return p;
}

/**
 * Convert local phone (01XXXXXXXXX) → WhatsApp JID format (8801XXXXXXXXX)
 */
function toWhatsAppPhone(phone) {
  let p = phone.replace(/\D/g, '');
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
  toWhatsAppPhone,
};
