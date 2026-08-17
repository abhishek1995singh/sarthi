-- =============================================================================
-- V1__initial_schema.sql
-- Grain Merchant & Commission Agent (Pakki Aadhat) Management System
-- Full schema: Users, Masters, Purchase, Sale, Cash Book, Ledger, Stock, Bardana, Audit
-- =============================================================================

-- ===========================
-- SECTION 1: AUTHENTICATION
-- ===========================

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('OWNER', 'STAFF')),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ===========================
-- SECTION 2: PARTY MASTER
-- ===========================

CREATE TABLE party (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    type            VARCHAR(20)  NOT NULL CHECK (type IN ('AADHTI', 'BUYER', 'MILL', 'TRANSPORTER')),
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    address         TEXT,
    gstin           VARCHAR(20),
    opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    -- positive = amount we owe them (payable); negative = they owe us (receivable)
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_party_type ON party(type);
CREATE INDEX idx_party_name ON party(name);

-- ===========================
-- SECTION 3: COMMODITY MASTER
-- ===========================

CREATE TABLE commodity (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    has_varieties BOOLEAN     NOT NULL DEFAULT TRUE,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE commodity_variety (
    id           BIGSERIAL PRIMARY KEY,
    commodity_id BIGINT       NOT NULL REFERENCES commodity(id),
    name         VARCHAR(100) NOT NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (commodity_id, name)
);

CREATE INDEX idx_commodity_variety_commodity ON commodity_variety(commodity_id);

-- ===========================
-- SECTION 4: COMMODITY SETTINGS
-- Configurable rates — no business rule hardcoded in application logic
-- ===========================

CREATE TABLE commodity_settings (
    id                      BIGSERIAL PRIMARY KEY,
    commodity_variety_id    BIGINT       NOT NULL UNIQUE REFERENCES commodity_variety(id),
    -- Gaushala: fixed charge per quintal (default ₹3, configurable per variety)
    gaushala_rate           NUMERIC(8,2) NOT NULL DEFAULT 3.00,
    -- Commission: percentage of gross amount (default 1.5%)
    commission_rate         NUMERIC(5,2) NOT NULL DEFAULT 1.50,
    -- Cash discount options: stored as comma-separated percentages e.g. '0.5,1.0,1.5,2.0'
    allowed_cash_discounts  VARCHAR(50)  NOT NULL DEFAULT '0.5,1.0,1.5,2.0',
    -- Bardana mode per commodity
    bardana_mode            VARCHAR(20)  NOT NULL DEFAULT 'EXCHANGE' CHECK (bardana_mode IN ('EXCHANGE', 'COST_INCLUDED')),
    -- Standard bag weight in kg (used to auto-calculate bags from quintals)
    bag_weight_kg           NUMERIC(6,2) NOT NULL DEFAULT 40.00,
    -- Tax rate for sales (GST / Mandi tax — configurable)
    sale_tax_rate           NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    -- Labour rate basis for sales
    labour_rate_basis       VARCHAR(20)  NOT NULL DEFAULT 'PER_QUINTAL' CHECK (labour_rate_basis IN ('PER_BAG', 'PER_QUINTAL', 'FLAT')),
    labour_rate             NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ===========================
-- SECTION 5: STOCK
-- ===========================

CREATE TABLE stock (
    id                   BIGSERIAL PRIMARY KEY,
    commodity_variety_id BIGINT       NOT NULL UNIQUE REFERENCES commodity_variety(id),
    quantity_quintals    NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    bags                 INTEGER      NOT NULL DEFAULT 0,
    last_updated         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ===========================
-- SECTION 6: PURCHASE
-- ===========================

CREATE TABLE purchase (
    id                   BIGSERIAL PRIMARY KEY,
    purchase_date        DATE         NOT NULL,
    party_id             BIGINT       NOT NULL REFERENCES party(id),
    commodity_variety_id BIGINT       NOT NULL REFERENCES commodity_variety(id),
    weight_quintals      NUMERIC(10,3) NOT NULL,
    bags                 INTEGER      NOT NULL DEFAULT 0,
    rate_per_quintal     NUMERIC(10,2) NOT NULL,

    -- Calculated fields (stored for ledger accuracy — never recalculate from settings)
    gross_amount         NUMERIC(15,2) NOT NULL,
    gaushala_rate        NUMERIC(8,2)  NOT NULL,  -- snapshot from settings at time of purchase
    gaushala_amount      NUMERIC(12,2) NOT NULL,
    commission_rate      NUMERIC(5,2)  NOT NULL,  -- snapshot from settings
    commission_amount    NUMERIC(12,2) NOT NULL,
    cash_discount_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
    cash_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_payable          NUMERIC(15,2) NOT NULL,
    -- Formula: net_payable = gross_amount - gaushala_amount - commission_amount - cash_discount_amount

    amount_paid          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_status       VARCHAR(20)   NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    confirmed            BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Stock only increases when confirmed = true

    remarks              TEXT,
    created_by           BIGINT        REFERENCES users(id),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_date ON purchase(purchase_date);
CREATE INDEX idx_purchase_party ON purchase(party_id);
CREATE INDEX idx_purchase_status ON purchase(payment_status);
CREATE INDEX idx_purchase_commodity ON purchase(commodity_variety_id);

-- ===========================
-- SECTION 7: SALE
-- ===========================

CREATE TABLE sale (
    id                   BIGSERIAL PRIMARY KEY,
    sale_date            DATE         NOT NULL,
    sale_type            VARCHAR(20)  NOT NULL CHECK (sale_type IN ('FOB', 'RATE_BASED')),
    buyer_id             BIGINT       NOT NULL REFERENCES party(id),
    commodity_variety_id BIGINT       NOT NULL REFERENCES commodity_variety(id),
    quantity_quintals    NUMERIC(10,3) NOT NULL,
    rate_per_quintal     NUMERIC(10,2),
    bags                 INTEGER      NOT NULL DEFAULT 0,
    transporter_id       BIGINT       REFERENCES party(id),
    transport_charge     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    labour_charge        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_amount    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount           NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount         NUMERIC(15,2) NOT NULL,

    -- FOB-specific fields (nullable for rate-based sales)
    fob_details          TEXT,

    amount_received      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_status       VARCHAR(20)   NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    confirmed            BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Stock only decreases when confirmed = true

    remarks              TEXT,
    created_by           BIGINT        REFERENCES users(id),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_date ON sale(sale_date);
CREATE INDEX idx_sale_buyer ON sale(buyer_id);
CREATE INDEX idx_sale_status ON sale(payment_status);
CREATE INDEX idx_sale_commodity ON sale(commodity_variety_id);

-- ===========================
-- SECTION 8: CASH BOOK
-- ===========================

CREATE TABLE cash_book_entry (
    id                  BIGSERIAL PRIMARY KEY,
    entry_date          DATE         NOT NULL,
    type                VARCHAR(20)  NOT NULL CHECK (type IN ('RECEIPT', 'PAYMENT', 'OPENING_BALANCE')),
    party_id            BIGINT       REFERENCES party(id),
    linked_purchase_id  BIGINT       REFERENCES purchase(id),
    linked_sale_id      BIGINT       REFERENCES sale(id),
    amount              NUMERIC(15,2) NOT NULL,
    running_balance     NUMERIC(15,2) NOT NULL,
    -- Running cash balance after this entry
    remarks             TEXT,
    created_by          BIGINT       REFERENCES users(id),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_book_date ON cash_book_entry(entry_date);
CREATE INDEX idx_cash_book_party ON cash_book_entry(party_id);
CREATE INDEX idx_cash_book_purchase ON cash_book_entry(linked_purchase_id);
CREATE INDEX idx_cash_book_type ON cash_book_entry(type);

-- ===========================
-- SECTION 9: PARTY LEDGER
-- Auto-posted — never created manually; always created inside LedgerPostingService transaction
-- ===========================

CREATE TABLE party_ledger_entry (
    id                       BIGSERIAL PRIMARY KEY,
    party_id                 BIGINT       NOT NULL REFERENCES party(id),
    entry_date               DATE         NOT NULL,
    cash_book_entry_id       BIGINT       NOT NULL UNIQUE REFERENCES cash_book_entry(id),
    -- UNIQUE enforces 1-to-1: one cash book entry → exactly one ledger entry
    purchase_id              BIGINT       REFERENCES purchase(id),
    sale_id                  BIGINT       REFERENCES sale(id),
    commodity_variety_id     BIGINT       REFERENCES commodity_variety(id),
    amount_paid              NUMERIC(15,2) NOT NULL,
    outstanding_balance_after NUMERIC(15,2) NOT NULL,
    -- Remaining balance for THIS specific purchase/sale after this payment
    narration                TEXT,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_party ON party_ledger_entry(party_id);
CREATE INDEX idx_ledger_date ON party_ledger_entry(entry_date);
CREATE INDEX idx_ledger_purchase ON party_ledger_entry(purchase_id);

-- ===========================
-- SECTION 10: BARDANA
-- ===========================

CREATE TABLE bardana_transaction (
    id                   BIGSERIAL PRIMARY KEY,
    transaction_date     DATE         NOT NULL,
    type                 VARCHAR(20)  NOT NULL CHECK (type IN ('RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTMENT')),
    party_id             BIGINT       NOT NULL REFERENCES party(id),
    commodity_variety_id BIGINT       NOT NULL REFERENCES commodity_variety(id),
    bags                 INTEGER      NOT NULL,
    mode                 VARCHAR(20)  NOT NULL CHECK (mode IN ('EXCHANGE', 'COST_INCLUDED')),
    amount               NUMERIC(12,2),   -- nullable; only for COST_INCLUDED or recovery entries
    linked_purchase_id   BIGINT       REFERENCES purchase(id),
    linked_sale_id       BIGINT       REFERENCES sale(id),
    remarks              TEXT,
    created_by           BIGINT       REFERENCES users(id),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bardana_party ON bardana_transaction(party_id);
CREATE INDEX idx_bardana_date ON bardana_transaction(transaction_date);

-- Bags balance per party per commodity variety
CREATE VIEW bardana_balance AS
SELECT
    party_id,
    commodity_variety_id,
    SUM(CASE
        WHEN type = 'RECEIVED' THEN bags
        WHEN type = 'RETURNED' THEN bags
        WHEN type = 'ISSUED'   THEN -bags
        WHEN type = 'ADJUSTMENT' THEN bags  -- signed: positive = added, negative = removed
        ELSE 0
    END) AS balance_bags
FROM bardana_transaction
GROUP BY party_id, commodity_variety_id;

-- ===========================
-- SECTION 11: AUDIT LOG
-- ===========================

CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    entity_name   VARCHAR(100) NOT NULL,
    entity_id     BIGINT       NOT NULL,
    action        VARCHAR(20)  NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    changed_by    BIGINT       REFERENCES users(id),
    changed_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    old_value     JSONB,
    new_value     JSONB,
    ip_address    VARCHAR(50)
);

CREATE INDEX idx_audit_entity ON audit_log(entity_name, entity_id);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);

-- ===========================
-- SECTION 12: CASH BALANCE TRACKER
-- Tracks daily opening/closing balances for multi-day continuity
-- Opening balance for day D = closing balance of day D-1, auto-carried forward
-- ===========================

CREATE TABLE daily_cash_balance (
    id                  BIGSERIAL PRIMARY KEY,
    balance_date        DATE         NOT NULL UNIQUE,
    opening_balance     NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_receipts      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_payments      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    closing_balance     NUMERIC(15,2) GENERATED ALWAYS AS (opening_balance + total_receipts - total_payments) STORED,
    finalized           BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Once finalized, opening balance cannot be changed
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_balance_date ON daily_cash_balance(balance_date);
