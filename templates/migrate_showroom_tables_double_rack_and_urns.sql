-- ==============================================================================
-- Migration: Upgrade customer_casket_locations for Double Racks & Multi-Level Urns
-- Run this in your Supabase SQL Editor if you already created the tables previously.
-- Safe & idempotent: will not delete or overwrite any existing showroom data.
-- ==============================================================================

-- 1. Add new columns for double racks and multi-level urn shelves
ALTER TABLE public.customer_casket_locations
  ADD COLUMN IF NOT EXISTS is_double_rack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rack_type TEXT DEFAULT 'Single Rack',
  ADD COLUMN IF NOT EXISTS level_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS shelf_slot_position INTEGER DEFAULT 1;

-- 2. Drop the old unique constraint (uq_customer_bay) that only allowed 1 casket per bay
ALTER TABLE public.customer_casket_locations 
  DROP CONSTRAINT IF EXISTS uq_customer_bay;

-- 3. Drop existing level constraint if re-running
ALTER TABLE public.customer_casket_locations 
  DROP CONSTRAINT IF EXISTS uq_customer_bay_level;

-- 4. Apply the new composite unique constraint allowing stacked double racks & multi-tier urns
ALTER TABLE public.customer_casket_locations 
  ADD CONSTRAINT uq_customer_bay_level 
  UNIQUE ("account_#", room_name, bay_number, level_number, shelf_slot_position);

-- 5. Optional clean names table migration (if using clean names version)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_casket_locations' AND table_schema = 'public') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_casket_locations' AND column_name = 'account_number') THEN
      ALTER TABLE public.customer_casket_locations
        ADD COLUMN IF NOT EXISTS is_double_rack BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rack_type TEXT DEFAULT 'Single Rack',
        ADD COLUMN IF NOT EXISTS level_number INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS shelf_slot_position INTEGER DEFAULT 1;

      ALTER TABLE public.customer_casket_locations 
        DROP CONSTRAINT IF EXISTS uq_customer_bay_clean;

      ALTER TABLE public.customer_casket_locations 
        DROP CONSTRAINT IF EXISTS uq_customer_bay_clean_level;

      ALTER TABLE public.customer_casket_locations 
        ADD CONSTRAINT uq_customer_bay_clean_level 
        UNIQUE (account_number, room_name, bay_number, level_number, shelf_slot_position);
    END IF;
  END IF;
END $$;
