-- Expense tracking + payment-gateway fee settings for the admin finance analytics page.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    amount_egp NUMERIC(10,2) NOT NULL CHECK (amount_egp >= 0),
    expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vendor VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- No public policies: this table is only ever accessed via the admin API using the
-- service-role key, which bypasses RLS. Intentionally locked down for all other roles.

-- Singleton row holding the Kashier gateway fee model used to estimate net earnings.
-- Defaults seeded from a real Kashier transaction receipt: 299 EGP -> 9.47 EGP fee (3.17%)
-- -> 10.80 EGP after 14% VAT. Editable from the admin analytics page.
CREATE TABLE IF NOT EXISTS finance_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    fee_percent NUMERIC(6,3) NOT NULL DEFAULT 3.17,
    vat_percent NUMERIC(6,3) NOT NULL DEFAULT 14,
    fixed_fee_egp NUMERIC(10,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;
-- No public policies: admin-only via service-role key, same as `expenses` above.

INSERT INTO finance_settings (id, fee_percent, vat_percent, fixed_fee_egp)
VALUES (1, 3.17, 14, 0)
ON CONFLICT (id) DO NOTHING;
