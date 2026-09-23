-- ==============================================================================
-- Batesville Product Reference Guide (Effective 10/1/2024): SQL Insert Script
-- Target Table: public.products
-- ==============================================================================

INSERT INTO public.products (
  category, subcategory, material, product_code, price,
  description, interior, lifestories, lifeview, lifesymbols,
  dual_disposition, top, finish, oversize, ext_width,
  ext_height, ext_length, int_width, capacity, year
) VALUES
-- Bronze
('Burial Solutions - Metal', 'Bronze', 'Bronze', 147959, 16840.00, 'Z64 824 DH Classic Gold, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 29.00, NULL, 84.00, 26.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Bronze', 'Bronze', 280178, 9928.00, 'Z65 8J3 D DaVinci Bronze, Champagne Velvet', 'Champagne Velvet', TRUE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 29.00, NULL, 84.00, 26.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Bronze', 'Bronze', 147862, 8681.00, 'O39 884 IDH Aegean Bronze, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),

-- Copper
('Burial Solutions - Metal', 'Copper', 'Copper', 147929, 8477.00, 'Y35 625 DH Mediterranean Copper, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, 'Full Top (Full Couch)', 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Copper', 'Copper', 147930, 8477.00, 'Y35 825 DH Mediterranean Copper, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Copper', 'Copper', 147935, 8054.00, 'Y39 884 IDH Aegean Copper, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),

-- Stainless Steel
('Burial Solutions - Metal', 'Stainless Steel', 'Stainless Steel', 185491, 5055.00, 'UG1 828 CDH Silver Sapphire, Silver Velvet-Charpente', 'Silver Velvet-Charpente', FALSE, FALSE, TRUE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Stainless Steel', 'Stainless Steel', 185493, 5055.00, 'UG1 828 CDH Golden Sand, Champagne Velvet-Charpente', 'Champagne Velvet-Charpente', FALSE, FALSE, TRUE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Stainless Steel', 'Stainless Steel', 147901, 4841.00, 'U46 844 NDH Tapestry Rose, Moss Pink Velvet', 'Moss Pink Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', 'Stainless Steel', 'Stainless Steel', 147905, 4841.00, 'U23 833 IDH Onyx, Silver Velvet', 'Silver Velvet', FALSE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),

-- 18 Gauge Steel
('Burial Solutions - Metal', '18 Gauge Steel', '18 Gauge Steel', 185487, 4386.00, 'JF9 825 CDH Golden Midnight, Champagne Velvet-Charpente', 'Champagne Velvet-Charpente', FALSE, FALSE, TRUE, FALSE, NULL, 'Brushed Finish', FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', '18 Gauge Steel', '18 Gauge Steel', 185489, 4386.00, 'JF9 825 CDH Golden Pearl, Eggshell Velvet-Charpente', 'Eggshell Velvet-Charpente', FALSE, FALSE, TRUE, FALSE, NULL, NULL, FALSE, 28.50, NULL, 83.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', '18 Gauge Steel', '18 Gauge Steel', 147733, 4057.00, 'A37 833 D Sierra, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 28.13, NULL, 83.13, 24.00, NULL, '2024-25'),
('Burial Solutions - Metal', '18 Gauge Steel', '18 Gauge Steel', 239696, 4005.00, 'OE1 8J3 DH Golden Granite, Champagne Velvet', 'Champagne Velvet', TRUE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 29.00, NULL, 84.00, 26.00, NULL, '2024-25'),
('Burial Solutions - Metal', '18 Gauge Steel', '18 Gauge Steel', 239699, 4005.00, 'OE1 8J3 DH Golden Midnight, Champagne Velvet', 'Champagne Velvet', TRUE, FALSE, FALSE, FALSE, NULL, 'Brushed Finish', FALSE, 29.00, NULL, 84.00, 26.00, NULL, '2024-25'),

-- Pecan & Oak
('Burial Solutions - Wood', 'Pecan', 'Pecan', 146799, 4305.00, '20A 880 HD Woodbridge Pecan, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, TRUE, FALSE, NULL, 'Satin Finish', FALSE, 28.50, NULL, 82.50, 24.00, NULL, '2024-25'),
('Burial Solutions - Wood', 'Pecan', 'Pecan', 209786, 3591.00, '2V1 880 HD Woodhaven Pecan 28, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, TRUE, FALSE, NULL, 'Veneer-Satin Finish', TRUE, 32.50, NULL, 87.00, 28.00, NULL, '2024-25'),
('Burial Solutions - Wood', 'Oak', 'Oak', 148213, 7821.00, '5PM 865 HD Bexley Oak, Champagne Velvet-Wood Bed', 'Champagne Velvet-Wood Bed', FALSE, FALSE, FALSE, FALSE, NULL, 'Full Rub / High Gloss', FALSE, 29.00, NULL, 84.25, 24.00, NULL, '2024-25'),
('Burial Solutions - Wood', 'Oak', 'Oak', 146876, 5149.00, '5ZZ 865 HD Barkley Oak, Champagne Velvet', 'Champagne Velvet', FALSE, FALSE, TRUE, FALSE, NULL, 'Satin Finish', FALSE, 28.75, NULL, 82.25, 24.00, NULL, '2024-25'),
('Burial Solutions - Wood', 'Oak', 'Oak', 239372, 4723.00, '521 8J3 CHD Warren Oak, Champagne Velvet-Charpente', 'Champagne Velvet-Charpente', TRUE, FALSE, FALSE, FALSE, NULL, 'Satin Finish', FALSE, 28.50, NULL, 82.50, 24.00, NULL, '2024-25'),

-- Full Size Urns
('Cremation Options - Full Size Urns', 'Wood', 'Wood', 100126, 987.00, 'Jefferson', '', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 8.50, 10.06, 8.50, NULL, 230, '2024-25'),
('Cremation Options - Full Size Urns', 'Wood', 'Wood', 100095, 948.00, 'Fredericksburg Dual Capacity', '', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 10.38, 9.63, 10.38, NULL, 430, '2024-25'),
('Cremation Options - Full Size Urns', 'Marble', 'Marble', 100060, 443.00, 'Cameo Bell Jar', '', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 8.25, 11.00, 8.25, NULL, 220, '2024-25'),
('Cremation Options - Full Size Urns', 'Marble', 'Marble', 238323, 413.00, 'Companion Meadow Green Synthetic Marble Urn', '', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 15.00, 6.25, 8.00, NULL, 420, '2024-25'),
('Cremation Options - Full Size Urns', 'Sheet Bronze', 'Sheet Bronze', 148358, 577.00, 'Unity', '', FALSE, FALSE, FALSE, FALSE, NULL, NULL, FALSE, 9.75, 8.06, 6.13, NULL, 450, '2024-25'),
('Cremation Options - Full Size Urns', 'Sheet Bronze', 'Sheet Bronze', 235554, 424.00, 'Brushed Bronze Vertical Urn', '', TRUE, FALSE, TRUE, FALSE, NULL, NULL, FALSE, 4.44, 9.06, 8.50, NULL, 220, '2024-25');
