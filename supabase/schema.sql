-- ==============================================================================
-- Batesville-FP: Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contactPerson TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    tier TEXT DEFAULT 'Standard',
    defaultMarkupPercent NUMERIC DEFAULT 140,
    logoUrl TEXT,
    notes TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table (Batesville Caskets, Urns, Vaults, Keepsakes)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    material TEXT,
    interior TEXT,
    exteriorFinish TEXT,
    dimensions TEXT,
    weightLbs NUMERIC,
    features JSONB DEFAULT '[]'::jsonb,
    wholesalePrice NUMERIC NOT NULL DEFAULT 0,
    msrp NUMERIC NOT NULL DEFAULT 0,
    imageUrl TEXT,
    additionalImages JSONB DEFAULT '[]'::jsonb,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    orderNumber TEXT NOT NULL,
    customerId TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    productId TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    unitPrice NUMERIC NOT NULL,
    totalAmount NUMERIC NOT NULL,
    saleDate DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    notes TEXT
);

-- 4. Indexes for Fast Analytics & YoY Queries
CREATE INDEX IF NOT EXISTS idx_sales_year_month ON public.sales(year, month);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customerId);
CREATE INDEX IF NOT EXISTS idx_sales_product ON public.sales(productId);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON public.customers(tier);

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access with Supabase anon key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Customers' AND tablename = 'customers'
    ) THEN
        CREATE POLICY "Public Access Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Products' AND tablename = 'products'
    ) THEN
        CREATE POLICY "Public Access Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Sales' AND tablename = 'sales'
    ) THEN
        CREATE POLICY "Public Access Sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
