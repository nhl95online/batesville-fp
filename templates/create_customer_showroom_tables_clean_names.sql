-- ==============================================================================
-- Batesville-FP: Customer Showroom Dimensions & Casket Floor Plan Locations Schema
-- Option B: Clean Column Names (using account_number instead of account_#)
-- ==============================================================================

-- 1. Table: customer_rooms
CREATE TABLE IF NOT EXISTS public.customer_rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number BIGINT NOT NULL,                     -- Clean name without special characters
  account_name TEXT,
  room_name TEXT NOT NULL,
  room_shape TEXT DEFAULT 'Rectangle',
  length_ft NUMERIC(6, 2) NOT NULL,
  width_ft NUMERIC(6, 2) NOT NULL,
  ceiling_height_ft NUMERIC(5, 2) DEFAULT 10.0,
  sq_footage NUMERIC(8, 2) GENERATED ALWAYS AS (length_ft * width_ft) STORED,
  door_wall TEXT DEFAULT 'South',
  door_pos_ft NUMERIC(6, 2) DEFAULT 12.0,
  door_width_ft NUMERIC(5, 2) DEFAULT 6.0,
  max_casket_bays INTEGER DEFAULT 16,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_customer_room_clean UNIQUE (account_number, room_name)
);

-- 2. Table: customer_casket_locations
CREATE TABLE IF NOT EXISTS public.customer_casket_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number BIGINT NOT NULL,                     -- Clean name without special characters
  room_name TEXT NOT NULL,
  bay_number INTEGER NOT NULL,
  bay_label TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT,
  category TEXT,
  display_type TEXT DEFAULT 'Full Casket',
  wall_zone TEXT,
  pos_x_ft NUMERIC(6, 2) NOT NULL,
  pos_y_ft NUMERIC(6, 2) NOT NULL,
  orientation_deg INTEGER DEFAULT 0,
  tier_level TEXT DEFAULT 'Floor',
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_customer_bay_clean UNIQUE (account_number, room_name, bay_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_rooms_clean_acct ON public.customer_rooms(account_number);
CREATE INDEX IF NOT EXISTS idx_casket_locations_clean_acct ON public.customer_casket_locations(account_number, room_name);
CREATE INDEX IF NOT EXISTS idx_casket_locations_clean_prod ON public.customer_casket_locations(product_code);

-- Enable RLS & Public Access
ALTER TABLE public.customer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_casket_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read customer_rooms" ON public.customer_rooms;
DROP POLICY IF EXISTS "Allow public write customer_rooms" ON public.customer_rooms;
DROP POLICY IF EXISTS "Allow public read customer_casket_locations" ON public.customer_casket_locations;
DROP POLICY IF EXISTS "Allow public write customer_casket_locations" ON public.customer_casket_locations;

CREATE POLICY "Allow public read customer_rooms" ON public.customer_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public write customer_rooms" ON public.customer_rooms FOR ALL USING (true);
CREATE POLICY "Allow public read customer_casket_locations" ON public.customer_casket_locations FOR SELECT USING (true);
CREATE POLICY "Allow public write customer_casket_locations" ON public.customer_casket_locations FOR ALL USING (true);
