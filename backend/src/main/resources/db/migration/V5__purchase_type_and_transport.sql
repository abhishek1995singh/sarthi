-- Purchase type: DIRECT (default fees) | INDIRECT (no gaushala/commission/discount)
-- transport_number: optional vehicle/lorry number for indirect purchases

ALTER TABLE purchase
    ADD COLUMN purchase_type VARCHAR(20) NOT NULL DEFAULT 'DIRECT'
        CHECK (purchase_type IN ('DIRECT', 'INDIRECT'));

ALTER TABLE purchase
    ADD COLUMN transport_number VARCHAR(50);
