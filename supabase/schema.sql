-- ============================================================
-- SVCN WhatsApp Bot - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL, -- format: 8801XXXXXXXXX
  area TEXT DEFAULT 'নাসিরাবাদ',
  package_speed INTEGER, -- in Mbps: 20, 35, 50, 65, 80
  package_name TEXT, -- e.g. "20Mbps WiFi", "Combo"
  package_type TEXT DEFAULT 'wifi', -- wifi | dish_cable | dish_stb | combo
  monthly_amount INTEGER NOT NULL,
  bill_day INTEGER DEFAULT 1, -- day of month bill is due (1-28)
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT, -- 'customer_whatsapp' | 'owner_manual'
  payment_method TEXT, -- 'bkash' | 'cash' | 'nagad'
  bkash_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open | in_progress | resolved
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills(paid);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ── Row Level Security ───────────────────────────────────────
-- The bot uses the service key so RLS won't block it.
-- But enable RLS anyway for safety.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses this)
CREATE POLICY "service_role_all" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON bills
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON complaints
  FOR ALL USING (auth.role() = 'service_role');

-- ── Auto-generate monthly bills function ─────────────────────
-- Call this on the 1st of each month via GitHub Actions or Supabase cron
CREATE OR REPLACE FUNCTION generate_monthly_bills()
RETURNS void AS $$
DECLARE
  customer RECORD;
  next_due DATE;
BEGIN
  FOR customer IN
    SELECT * FROM customers WHERE active = true
  LOOP
    -- Calculate next due date based on bill_day
    next_due := DATE_TRUNC('month', NOW()) + (customer.bill_day - 1) * INTERVAL '1 day';

    -- Only insert if bill for this month doesn't exist yet
    INSERT INTO bills (customer_id, amount, due_date)
    SELECT customer.id, customer.monthly_amount, next_due
    WHERE NOT EXISTS (
      SELECT 1 FROM bills
      WHERE customer_id = customer.id
        AND due_date = next_due
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ── Sample data (remove before production) ───────────────────
/*
INSERT INTO customers (name, phone, area, package_speed, package_name, monthly_amount, bill_day)
VALUES
  ('রাকিম আহমেদ', '8801812345678', 'নাসিরাবাদ', 50, '50Mbps WiFi', 800, 15),
  ('করিম সাহেব', '8801987654321', 'নাসিরাবাদ', 20, '20Mbps WiFi', 500, 10),
  ('রহিম ভাই', '8801711223344', 'নাসিরাবাদ', 35, '35Mbps WiFi', 650, 20);

INSERT INTO bills (customer_id, amount, due_date)
SELECT id, monthly_amount, CURRENT_DATE + INTERVAL '1 day'
FROM customers;
*/
