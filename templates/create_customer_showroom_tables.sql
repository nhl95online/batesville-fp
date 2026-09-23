-- ==============================================================================
-- Batesville-FP: Customer Showroom Dimensions & Casket Floor Plan Locations Schema
-- Compatible with Supabase (PostgreSQL) and Relational Database Loading
-- NOTE: In PostgreSQL, column names with '#' must be enclosed in double quotes: "account_#"
-- ==============================================================================

-- 1. Table: customer_rooms (Dimensions & physical room specifications)
CREATE TABLE IF NOT EXISTS public.customer_rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_#" BIGINT NOT NULL,                         -- Double quotes required for '#' in PostgreSQL
  account_name TEXT,                                  -- Customer name (for human reference)
  room_name TEXT NOT NULL,                            -- e.g. "Main Selection Room", "Urn Gallery"
  room_shape TEXT DEFAULT 'Rectangle',                -- "Rectangle", "Square", "L-Shaped", "Oval", "Custom"
  length_ft NUMERIC(6, 2) NOT NULL,                   -- Room Length in feet (e.g. 32.0)
  width_ft NUMERIC(6, 2) NOT NULL,                    -- Room Width in feet (e.g. 24.0)
  ceiling_height_ft NUMERIC(5, 2) DEFAULT 10.0,       -- Ceiling Height in feet
  sq_footage NUMERIC(8, 2) GENERATED ALWAYS AS (length_ft * width_ft) STORED,
  door_wall TEXT DEFAULT 'South',                     -- Wall with main entrance ("North", "South", "East", "West")
  door_pos_ft NUMERIC(6, 2) DEFAULT 12.0,             -- Distance of door from corner in feet
  door_width_ft NUMERIC(5, 2) DEFAULT 6.0,            -- Door opening width in feet
  max_casket_bays INTEGER DEFAULT 16,                 -- Total casket capacity of the room
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_customer_room UNIQUE ("account_#", room_name)
);

-- 2. Table: customer_casket_locations (Specific casket & urn placements in room)
CREATE TABLE IF NOT EXISTS public.customer_casket_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_#" BIGINT NOT NULL,                         -- Double quotes required for '#' in PostgreSQL
  room_name TEXT NOT NULL,                            -- Room matching customer_rooms(room_name)
  bay_number INTEGER NOT NULL,                        -- Slot / Bay index (1, 2, 3...)
  bay_label TEXT NOT NULL,                            -- e.g. "Bay 1 - Entrance Feature", "North Wall 2"
  product_code TEXT NOT NULL,                         -- Batesville SKU (matches products.product_code)
  product_name TEXT,                                  -- Batesville model name (e.g. "Classic Gold")
  category TEXT,                                      -- "Metal", "Wood", "Urn", etc.
  display_type TEXT DEFAULT 'Full Casket',            -- "Full Casket", "Quarter Couch", "Urn Pedestal"
  wall_zone TEXT,                                     -- "North Wall", "South Wall", "Center Island"
  pos_x_ft NUMERIC(6, 2) NOT NULL,                    -- X Coordinate in feet from room origin
  pos_y_ft NUMERIC(6, 2) NOT NULL,                    -- Y Coordinate in feet from room origin
  orientation_deg INTEGER DEFAULT 0,                  -- Rotation (0, 90, 180, 270 degrees)
  tier_level TEXT DEFAULT 'Floor',                    -- "Floor", "Raised Platform", "Tier 2", "Pedestal"
  status TEXT DEFAULT 'Active',                       -- "Active", "Reserved", "Seasonal"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_customer_bay UNIQUE ("account_#", room_name, bay_number)
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_customer_rooms_acct ON public.customer_rooms("account_#");
CREATE INDEX IF NOT EXISTS idx_casket_locations_acct ON public.customer_casket_locations("account_#", room_name);
CREATE INDEX IF NOT EXISTS idx_casket_locations_prod ON public.customer_casket_locations(product_code);

-- Enable Row Level Security (RLS) & Public Access for Antigravity / Batesville-FP App
ALTER TABLE public.customer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_casket_locations ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running to avoid duplicate policy error
DROP POLICY IF EXISTS "Allow public read customer_rooms" ON public.customer_rooms;
DROP POLICY IF EXISTS "Allow public write customer_rooms" ON public.customer_rooms;
DROP POLICY IF EXISTS "Allow public read customer_casket_locations" ON public.customer_casket_locations;
DROP POLICY IF EXISTS "Allow public write customer_casket_locations" ON public.customer_casket_locations;

CREATE POLICY "Allow public read customer_rooms" ON public.customer_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public write customer_rooms" ON public.customer_rooms FOR ALL USING (true);

CREATE POLICY "Allow public read customer_casket_locations" ON public.customer_casket_locations FOR SELECT USING (true);
CREATE POLICY "Allow public write customer_casket_locations" ON public.customer_casket_locations FOR ALL USING (true);
