-- =============================================================================
-- V2__seed_data.sql
-- Default commodities, varieties, settings, and admin user seed data
-- =============================================================================

-- ---------------------
-- Default Admin User
-- Password: Admin@123 (BCrypt encoded)
-- Change immediately after first login
-- ---------------------
INSERT INTO users (username, password, full_name, role) VALUES
('admin', '$2a$12$ixJZrR7lEWJV7jLxnEBvPOSFQIHGVN4fHGHVaGC5yLr6pNLexQmDy', 'System Administrator', 'OWNER');

-- ---------------------
-- Commodities
-- ---------------------
INSERT INTO commodity (name, has_varieties) VALUES
('Paddy',   TRUE),
('Wheat',   FALSE),
('Maize',   TRUE),
('Mustard', FALSE);

-- ---------------------
-- Varieties
-- ---------------------
-- Paddy varieties
INSERT INTO commodity_variety (commodity_id, name) VALUES
((SELECT id FROM commodity WHERE name = 'Paddy'), '1509 Hand'),
((SELECT id FROM commodity WHERE name = 'Paddy'), '1509 Combine'),
((SELECT id FROM commodity WHERE name = 'Paddy'), 'Sarvati'),
((SELECT id FROM commodity WHERE name = 'Paddy'), 'Sugandha'),
((SELECT id FROM commodity WHERE name = 'Paddy'), 'Taj');

-- Wheat (no variety distinction — single default variety)
INSERT INTO commodity_variety (commodity_id, name) VALUES
((SELECT id FROM commodity WHERE name = 'Wheat'), 'Standard');

-- Maize varieties
INSERT INTO commodity_variety (commodity_id, name) VALUES
((SELECT id FROM commodity WHERE name = 'Maize'), 'First Quality'),
((SELECT id FROM commodity WHERE name = 'Maize'), 'Daagi Quality'),
((SELECT id FROM commodity WHERE name = 'Maize'), 'Gilli Quality');

-- Mustard (single default variety)
INSERT INTO commodity_variety (commodity_id, name) VALUES
((SELECT id FROM commodity WHERE name = 'Mustard'), 'Standard');

-- ---------------------
-- Commodity Settings (all configurable — not hardcoded in application)
-- ---------------------

-- Paddy varieties: commission 1.5%, gaushala ₹3, bag 40kg, bardana EXCHANGE
INSERT INTO commodity_settings (commodity_variety_id, gaushala_rate, commission_rate, allowed_cash_discounts, bardana_mode, bag_weight_kg, sale_tax_rate, labour_rate_basis, labour_rate)
SELECT cv.id, 3.00, 1.50, '0.5,1.0,1.5,2.0', 'EXCHANGE', 40.00, 0.00, 'PER_QUINTAL', 0.00
FROM commodity_variety cv
JOIN commodity c ON cv.commodity_id = c.id
WHERE c.name = 'Paddy';

-- Wheat: commission 1.5%, gaushala ₹3, bag 50kg, bardana EXCHANGE
INSERT INTO commodity_settings (commodity_variety_id, gaushala_rate, commission_rate, allowed_cash_discounts, bardana_mode, bag_weight_kg, sale_tax_rate, labour_rate_basis, labour_rate)
SELECT cv.id, 3.00, 1.50, '0.5,1.0,1.5,2.0', 'EXCHANGE', 50.00, 0.00, 'PER_QUINTAL', 0.00
FROM commodity_variety cv
JOIN commodity c ON cv.commodity_id = c.id
WHERE c.name = 'Wheat';

-- Maize: commission 1.5%, gaushala ₹3, bag 50kg, bardana COST_INCLUDED
INSERT INTO commodity_settings (commodity_variety_id, gaushala_rate, commission_rate, allowed_cash_discounts, bardana_mode, bag_weight_kg, sale_tax_rate, labour_rate_basis, labour_rate)
SELECT cv.id, 3.00, 1.50, '0.5,1.0,1.5', 'COST_INCLUDED', 50.00, 0.00, 'PER_QUINTAL', 0.00
FROM commodity_variety cv
JOIN commodity c ON cv.commodity_id = c.id
WHERE c.name = 'Maize';

-- Mustard: commission 1.5%, gaushala ₹3, bag 40kg, bardana EXCHANGE
INSERT INTO commodity_settings (commodity_variety_id, gaushala_rate, commission_rate, allowed_cash_discounts, bardana_mode, bag_weight_kg, sale_tax_rate, labour_rate_basis, labour_rate)
SELECT cv.id, 3.00, 1.50, '0.5,1.0,1.5,2.0', 'EXCHANGE', 40.00, 0.00, 'PER_QUINTAL', 0.00
FROM commodity_variety cv
JOIN commodity c ON cv.commodity_id = c.id
WHERE c.name = 'Mustard';

-- ---------------------
-- Initial stock records (zero quantity — will grow as purchases are confirmed)
-- ---------------------
INSERT INTO stock (commodity_variety_id, quantity_quintals, bags)
SELECT id, 0.000, 0 FROM commodity_variety WHERE active = TRUE;

-- ---------------------
-- Initial daily balance for today (opening = 0)
-- ---------------------
INSERT INTO daily_cash_balance (balance_date, opening_balance, total_receipts, total_payments)
VALUES (CURRENT_DATE, 0.00, 0.00, 0.00);
