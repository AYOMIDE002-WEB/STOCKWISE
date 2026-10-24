-- =========================================================
-- SAMPLE DATA: Phone and Electronics Shop (demo only)
-- Prices and quantities are illustrative - replace with real figures.
-- Run on a NEW or TEST project, not on a shop's real records.
-- (To clear first: truncate table invoices, sale_items, sales, customers, products cascade;)
-- Note: some items are sold by the metre, so decimal quantities (e.g. 2.5 m) work.
-- =========================================================
insert into products (product_name, category, unit, quantity_in_stock, unit_price) values
('Phone Charger 20W (fast)', 'Chargers and Cables', 'piece', 40, 4500.00),
('USB-C Cable (1m)', 'Chargers and Cables', 'piece', 80, 1500.00),
('Lightning Cable (1m)', 'Chargers and Cables', 'piece', 50, 2000.00),
('Power Bank 10,000mAh', 'Power', 'piece', 22, 12000.00),
('Wired Earphones', 'Audio', 'piece', 90, 1200.00),
('Wireless Earbuds', 'Audio', 'piece', 18, 9500.00),
('Bluetooth Speaker (small)', 'Audio', 'piece', 12, 11000.00),
('Phone Case (universal)', 'Accessories', 'piece', 75, 1000.00),
('Tempered Screen Protector', 'Accessories', 'piece', 120, 800.00),
('Memory Card 32GB', 'Storage', 'piece', 30, 4500.00),
('USB Flash Drive 64GB', 'Storage', 'piece', 26, 5500.00),
('LED Bulb 12W', 'Lighting', 'piece', 100, 900.00),
('Extension Socket (4-way)', 'Power', 'piece', 24, 4500.00),
('Electrical Cable 2.5mm', 'Wiring', 'metre', 150, 450.00),
('AA Batteries (pack of 4)', 'Power', 'pack', 60, 1000.00),
('Selfie Ring Light', 'Accessories', 'piece', 14, 6500.00),
('Phone Stand (adjustable)', 'Accessories', 'piece', 35, 1800.00),
('Laptop Charger (universal)', 'Chargers and Cables', 'piece', 10, 13500.00),
('Wireless Mouse', 'Computer Accessories', 'piece', 28, 3500.00),
('HDMI Cable (1.5m)', 'Chargers and Cables', 'piece', 20, 2500.00)
on conflict do nothing;

insert into customers (customer_name, phone_number, address) values
('Emeka Nwosu', '0800 000 0011', 'Computer Village, Ikeja'),
('Miss Zainab Musa', '0800 000 0012', 'Oba Akran Avenue, Ikeja'),
('Mr. Segun Ajayi', '0800 000 0013', 'Obafemi Awolowo Way, Ikeja')
on conflict do nothing;
