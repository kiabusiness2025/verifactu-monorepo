-- ============================================
-- Esquema inicial VeriFactu Business (Postgres)
-- BBDD: verifactu_app
-- ============================================

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1) TENANTS (clientes)
-- =========================
CREATE TABLE IF NOT EXISTS tenants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    legal_name  text,
    nif         text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 2) USERS (usuarios app)
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id          text PRIMARY KEY,
    email       text NOT NULL UNIQUE,
    name        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 3) MEMBERSHIPS (pertenencia user-tenant con rol)
-- =========================
CREATE TABLE IF NOT EXISTS memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'member', -- 'owner','admin','member','asesor'
    status      text NOT NULL DEFAULT 'active', -- 'active','invited','revoked'
    invited_by  text REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
    ON memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id
    ON memberships (tenant_id);

-- =========================
-- 4) USER PREFERENCES (tenant preferido, etc)
-- =========================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id             text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 5) PLANS (tarifas)
-- =========================
CREATE TABLE IF NOT EXISTS plans (
    id                      serial PRIMARY KEY,
    code                    text UNIQUE NOT NULL,  -- 'freelance','starter','pro','business','enterprise'
    name                    text NOT NULL,
    fixed_monthly           numeric(10,2) NOT NULL DEFAULT 0,   -- cuota fija
    variable_rate           numeric(5,3)  NOT NULL DEFAULT 0,   -- 0.005 = 0.5 %
    max_invoices_per_month  integer,
    max_revenue_per_month   numeric(14,2),
    created_at              timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 6) SUBSCRIPTIONS
-- =========================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id               integer NOT NULL REFERENCES plans(id),
    status                text NOT NULL DEFAULT 'active', -- 'active','trial','cancelled','past_due'
    trial_ends_at         timestamptz,
    current_period_start  timestamptz,
    current_period_end    timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status
    ON subscriptions (tenant_id, status);

-- =========================
-- 7) INVOICES (facturas)
-- =========================
CREATE TABLE IF NOT EXISTS invoices (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    number           text NOT NULL,
    issue_date       date NOT NULL,
    customer_name    text NOT NULL,
    customer_nif     text,
    currency         char(3) NOT NULL DEFAULT 'EUR',
    subtotal         numeric(14,2) NOT NULL,
    tax_total        numeric(14,2) NOT NULL DEFAULT 0,
    total            numeric(14,2) NOT NULL,
    status           text NOT NULL DEFAULT 'draft', -- 'draft','sent','paid','cancelled'
    verifactu_status text,      -- 'pending','sent','validated','error'
    verifactu_qr     text,
    verifactu_hash   text,
    paid_at          timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_issue_date
    ON invoices (tenant_id, issue_date);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
    ON invoices (tenant_id, status);

-- =========================
-- 8) INVOICE ITEMS (líneas)
-- =========================
CREATE TABLE IF NOT EXISTS invoice_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description  text NOT NULL,
    quantity     numeric(12,3) NOT NULL DEFAULT 1,
    unit_price   numeric(14,4) NOT NULL,
    tax_rate     numeric(5,2)  NOT NULL DEFAULT 21,
    line_total   numeric(14,2) NOT NULL
);

-- =========================
-- 9) EXPENSE CATEGORIES
-- =========================
CREATE TABLE IF NOT EXISTS expense_categories (
    id            serial PRIMARY KEY,
    code          text UNIQUE NOT NULL,
    name          text NOT NULL,
    is_deductible boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- 10) EXPENSES (gastos)
-- =========================
CREATE TABLE IF NOT EXISTS expenses (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id      integer REFERENCES expense_categories(id),
    supplier_name    text,
    supplier_nif     text,
    invoice_number   text,
    issue_date       date,
    currency         char(3) NOT NULL DEFAULT 'EUR',
    amount_gross     numeric(14,2) NOT NULL,
    amount_tax       numeric(14,2) NOT NULL DEFAULT 0,
    amount_net       numeric(14,2) NOT NULL,
    status           text NOT NULL DEFAULT 'received',
    source           text,        -- 'upload','email','isaak-scan', etc.
    is_deductible    boolean,
    deduction_reason text,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_issue_date
    ON expenses (tenant_id, issue_date);

-- =========================
-- 11) USAGE COUNTERS (control límites plan)
-- =========================
CREATE TABLE IF NOT EXISTS usage_counters (
    id               bigserial PRIMARY KEY,
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_start     date NOT NULL,
    period_end       date NOT NULL,
    invoices_count   integer      NOT NULL DEFAULT 0,
    invoices_amount  numeric(14,2) NOT NULL DEFAULT 0,
    expenses_count   integer      NOT NULL DEFAULT 0,
    expenses_amount  numeric(14,2) NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period_start, period_end)
);
