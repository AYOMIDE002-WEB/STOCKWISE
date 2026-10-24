-- =========================================================
-- SAMPLE DATA: Neighbourhood Pharmacy (demo only)
-- Over-the-counter medicines and health supplies. Prices and
-- quantities are illustrative - replace with real figures.
-- Run on a NEW or TEST project, not on a shop's real records.
-- (To clear first: truncate table invoices, sale_items, sales, customers, products cascade;)
-- =========================================================
insert into products (product_name, category, unit, quantity_in_stock, unit_price) values
('Paracetamol 500mg (strip of 10)', 'Pain and Fever', 'strip', 120, 300.00),
('Paracetamol 500mg (loose tablet)', 'Pain and Fever', 'tablet', 400, 40.00),
('Ibuprofen 200mg (strip of 10)', 'Pain and Fever', 'strip', 60, 500.00),
('Vitamin C 1000mg (tube of 10)', 'Vitamins', 'tube', 45, 1800.00),
('Multivitamin (bottle of 30)', 'Vitamins', 'bottle', 25, 3500.00),
('Oral Rehydration Salts (sachet)', 'First Aid', 'sachet', 150, 250.00),
('Antacid Chewable (strip of 12)', 'Digestive', 'strip', 80, 400.00),
('Cough Syrup (100ml)', 'Cough and Cold', 'bottle', 35, 1500.00),
('Throat Lozenges (pack of 16)', 'Cough and Cold', 'pack', 50, 600.00),
('Antiseptic Liquid (250ml)', 'First Aid', 'bottle', 30, 1800.00),
('Adhesive Plasters (box of 20)', 'First Aid', 'box', 40, 700.00),
('Cotton Wool (100g)', 'First Aid', 'pack', 28, 900.00),
('Hand Sanitiser (100ml)', 'Hygiene', 'bottle', 55, 1000.00),
('Digital Thermometer', 'Devices', 'piece', 15, 3500.00),
('Blood Pressure Monitor (arm)', 'Devices', 'piece', 6, 28000.00),
('Condoms (pack of 3)', 'Family Health', 'pack', 90, 500.00),
('Sanitary Pads (pack of 8)', 'Family Health', 'pack', 70, 800.00),
('Baby Diapers (pack of 10)', 'Baby Care', 'pack', 32, 2800.00),
('Mosquito Repellent Lotion (100ml)', 'Malaria Prevention', 'bottle', 38, 1700.00),
('Face Masks (box of 50)', 'Hygiene', 'box', 20, 2500.00)
on conflict do nothing;

insert into customers (customer_name, phone_number, address) values
('Adaeze Okonkwo', '0800 000 0001', 'Allen Avenue, Ikeja'),
('Mr. Bello Lawal', '0800 000 0002', 'Opebi Road, Ikeja'),
('Mrs. Folake Adeyemi', '0800 000 0003', 'Toyin Street, Ikeja')
on conflict do nothing;
