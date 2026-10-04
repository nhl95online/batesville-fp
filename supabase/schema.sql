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

-- 3. Sales Table (Exact 13 Columns from Supabase)
CREATE TABLE IF NOT EXISTS public.sales (
    sales_id BIGINT PRIMARY KEY,
    year TEXT NOT NULL,
    month TEXT NOT NULL,
    day TEXT,
    program TEXT,
    account_name TEXT,
    "account_#" BIGINT,
    product_code BIGINT,
    category TEXT,
    subcategory TEXT,
    description TEXT,
    qty BIGINT DEFAULT 1,
    cost NUMERIC NOT NULL
);

-- 4. Indexes for Fast Analytics & YoY Queries
CREATE INDEX IF NOT EXISTS idx_sales_year_month ON public.sales(year, month);
CREATE INDEX IF NOT EXISTS idx_sales_account_num ON public.sales("account_#");
CREATE INDEX IF NOT EXISTS idx_sales_product_code ON public.sales(product_code);
CREATE INDEX IF NOT EXISTS idx_sales_category ON public.sales(category);
CREATE INDEX IF NOT EXISTS idx_sales_subcategory ON public.sales(subcategory);

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

-- 6. Sales Quotas Table (Annual & Monthly Targets by Fiscal Year)
CREATE TABLE IF NOT EXISTS public.sales_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year TEXT NOT NULL,                                           -- e.g. '2024-25', '2025-26'
    fiscal_month INTEGER NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12), -- 1=Oct, 2=Nov, ..., 12=Sep
    month_name TEXT NOT NULL,                                            -- 'OCT', 'NOV', 'DEC', etc.
    quota_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,                      -- Target quota dollar amount for the month
    working_days INTEGER NOT NULL DEFAULT 21,                            -- Number of working/selling business days in month
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotas_fy_fm ON public.sales_quotas(fiscal_year, fiscal_month);
ALTER TABLE public.sales_quotas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Sales Quotas' AND tablename = 'sales_quotas'
    ) THEN
        CREATE POLICY "Public Access Sales Quotas" ON public.sales_quotas FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Real-Time View: v_annual_quota_pacing
-- Automatically updates in real time whenever new records are added to public.sales
CREATE OR REPLACE VIEW public.v_annual_quota_pacing AS
WITH monthly_actuals AS (
    SELECT 
        s.year AS fiscal_year,
        UPPER(TRIM(s.month)) AS month_abbr,
        CASE UPPER(TRIM(s.month))
            WHEN 'OCT' THEN 1
            WHEN 'NOV' THEN 2
            WHEN 'DEC' THEN 3
            WHEN 'JAN' THEN 4
            WHEN 'FEB' THEN 5
            WHEN 'MAR' THEN 6
            WHEN 'APR' THEN 7
            WHEN 'MAY' THEN 8
            WHEN 'JUN' THEN 9
            WHEN 'JUL' THEN 10
            WHEN 'AUG' THEN 11
            WHEN 'SEP' THEN 12
            ELSE 1
        END AS fiscal_month,
        COALESCE(SUM(s.cost), 0) AS total_sales
    FROM public.sales s
    GROUP BY s.year, UPPER(TRIM(s.month))
),
joined_pacing AS (
    SELECT 
        q.fiscal_year,
        q.fiscal_month,
        q.month_name,
        q.working_days,
        q.quota_amount AS monthly_quota,
        COALESCE(ma.total_sales, 0) AS monthly_sales,
        SUM(q.quota_amount) OVER (
            PARTITION BY q.fiscal_year 
            ORDER BY q.fiscal_month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_quota,
        SUM(COALESCE(ma.total_sales, 0)) OVER (
            PARTITION BY q.fiscal_year 
            ORDER BY q.fiscal_month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_sales,
        SUM(q.quota_amount) OVER (
            PARTITION BY q.fiscal_year
        ) AS full_year_quota
    FROM public.sales_quotas q
    LEFT JOIN monthly_actuals ma 
        ON ma.fiscal_year = q.fiscal_year 
       AND (ma.month_abbr = UPPER(q.month_name) OR ma.fiscal_month = q.fiscal_month)
)
SELECT 
    fiscal_year,
    fiscal_month,
    month_name,
    working_days,
    ROUND(monthly_quota, 2) AS quota,
    ROUND(cumulative_quota, 2) AS total,
    ROUND(cumulative_sales, 2) AS actual,
    ROUND(cumulative_sales - cumulative_quota, 2) AS cumulative_variance,
    ROUND(monthly_sales, 2) AS sales,
    ROUND(monthly_sales - monthly_quota, 2) AS monthly_variance,
    ROUND(monthly_sales / NULLIF(working_days, 0), 2) AS daily_actual,
    ROUND(monthly_quota / NULLIF(working_days, 0), 2) AS required_daily,
    ROUND((cumulative_sales / NULLIF(cumulative_quota, 0)) * 100, 2) AS attainment_percent,
    ROUND((cumulative_sales / NULLIF(full_year_quota, 0)) * 100, 2) AS annual_percent
FROM joined_pacing
ORDER BY fiscal_year, fiscal_month;

-- 8. Calculate Exact Billing Days in a Month (Excluding Weekends & Corporate Holidays)
CREATE OR REPLACE FUNCTION public.get_billing_days(cal_year INT, cal_month INT)
RETURNS INT AS $$
DECLARE
    start_date DATE := make_date(cal_year, cal_month, 1);
    end_date DATE := (start_date + INTERVAL '1 month - 1 day')::DATE;
    d DATE;
    billing_days INT := 0;
    dow INT;
    is_holiday BOOLEAN;
    
    -- Recognized US Corporate Holidays
    ny DATE;
    mlk DATE;
    mem DATE;
    jt DATE;
    ind DATE;
    lab DATE;
    thx DATE;
    thx_fri DATE;
    xmas DATE;
BEGIN
    -- 1. New Year's Day (Jan 1, observed)
    ny := make_date(cal_year, 1, 1);
    IF EXTRACT(DOW FROM ny) = 0 THEN ny := ny + 1;
    ELSIF EXTRACT(DOW FROM ny) = 6 THEN ny := ny - 1;
    END IF;

    -- 2. MLK Day (3rd Monday in Jan)
    SELECT (make_date(cal_year, 1, 1) + ((8 - EXTRACT(ISODOW FROM make_date(cal_year, 1, 1))::INT) % 7 + 14)::INT)::DATE INTO mlk;

    -- 3. Memorial Day (Last Monday in May)
    SELECT (make_date(cal_year, 5, 31) - ((EXTRACT(ISODOW FROM make_date(cal_year, 5, 31))::INT - 1 + 7) % 7)::INT)::DATE INTO mem;

    -- 4. Juneteenth (June 19, observed for >= 2021)
    IF cal_year >= 2021 THEN
        jt := make_date(cal_year, 6, 19);
        IF EXTRACT(DOW FROM jt) = 0 THEN jt := jt + 1;
        ELSIF EXTRACT(DOW FROM jt) = 6 THEN jt := jt - 1;
        END IF;
    ELSE
        jt := NULL;
    END IF;

    -- 5. Independence Day (July 4, observed)
    ind := make_date(cal_year, 7, 4);
    IF EXTRACT(DOW FROM ind) = 0 THEN ind := ind + 1;
    ELSIF EXTRACT(DOW FROM ind) = 6 THEN ind := ind - 1;
    END IF;

    -- 6. Labor Day (1st Monday in Sep)
    SELECT (make_date(cal_year, 9, 1) + ((8 - EXTRACT(ISODOW FROM make_date(cal_year, 9, 1))::INT) % 7)::INT)::DATE INTO lab;

    -- 7. Thanksgiving (4th Thursday in Nov)
    SELECT (make_date(cal_year, 11, 1) + ((11 - EXTRACT(ISODOW FROM make_date(cal_year, 11, 1))::INT) % 7 + 21)::INT)::DATE INTO thx;
    thx_fri := thx + 1;

    -- 8. Christmas Day (Dec 25, observed)
    xmas := make_date(cal_year, 12, 25);
    IF EXTRACT(DOW FROM xmas) = 0 THEN xmas := xmas + 1;
    ELSIF EXTRACT(DOW FROM xmas) = 6 THEN xmas := xmas - 1;
    END IF;

    FOR d IN SELECT generate_series(start_date, end_date, '1 day'::INTERVAL)::DATE LOOP
        dow := EXTRACT(ISODOW FROM d);
        IF dow < 6 THEN
            is_holiday := (d = ny OR d = mlk OR d = mem OR (jt IS NOT NULL AND d = jt) OR d = ind OR d = lab OR d = thx OR d = thx_fri OR d = xmas);
            IF NOT is_holiday THEN
                billing_days := billing_days + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN billing_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Helper Function: Get Year-Specific Default Annual Quota
CREATE OR REPLACE FUNCTION public.get_default_annual_quota(target_year TEXT)
RETURNS NUMERIC AS $$
DECLARE
    base_yr INT;
BEGIN
    IF position('-' in target_year) > 0 THEN
        base_yr := split_part(target_year, '-', 1)::INT;
    ELSE
        base_yr := target_year::INT;
    END IF;

    CASE base_yr
        WHEN 2016 THEN RETURN 3300000;
        WHEN 2017 THEN RETURN 3420000;
        WHEN 2018 THEN RETURN 3580000;
        WHEN 2019 THEN RETURN 3750000;
        WHEN 2020 THEN RETURN 3920000;
        WHEN 2021 THEN RETURN 4100000;
        WHEN 2022 THEN RETURN 4281810;
        WHEN 2023 THEN RETURN 4680827;
        WHEN 2024 THEN RETURN 5060563;
        WHEN 2025 THEN RETURN 5920915;
        WHEN 2026 THEN RETURN 0; -- TBD pending assignment
        ELSE 
            RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to Auto-Seed Quotas with Exact Dynamic Billing Days
CREATE OR REPLACE FUNCTION public.seed_fiscal_year_quotas(
    target_year TEXT,
    annual_target NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    base_year INT;
    months TEXT[] := ARRAY['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
    cal_months INT[] := ARRAY[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    m_year INT;
    b_days INT;
    weights NUMERIC[] := ARRAY[
        0.080769, 0.070138, 0.087775, 0.090957, 0.086646, 0.090273,
        0.082576, 0.077197, 0.080040, 0.087166, 0.081841, 0.084622
    ];
    m_quota NUMERIC;
    running_sum NUMERIC := 0;
    actual_target NUMERIC;
BEGIN
    IF annual_target IS NULL THEN
        actual_target := public.get_default_annual_quota(target_year);
    ELSE
        actual_target := annual_target;
    END IF;

    IF position('-' in target_year) > 0 THEN
        base_year := split_part(target_year, '-', 1)::INT;
    ELSE
        base_year := target_year::INT;
    END IF;

    FOR i IN 1..12 LOOP
        IF i <= 3 THEN
            m_year := base_year;
        ELSE
            m_year := base_year + 1;
        END IF;

        b_days := public.get_billing_days(m_year, cal_months[i]);
        
        IF actual_target = 0 THEN
            m_quota := 0;
        ELSIF i = 12 THEN
            -- Reconcile rounding in 12th month so sum of 12 months exactly equals annual target
            m_quota := actual_target - running_sum;
        ELSE
            m_quota := ROUND(actual_target * weights[i], 0);
            running_sum := running_sum + m_quota;
        END IF;

        INSERT INTO public.sales_quotas (fiscal_year, fiscal_month, month_name, quota_amount, working_days)
        VALUES (target_year, i, months[i], m_quota, b_days)
        ON CONFLICT (fiscal_year, fiscal_month) DO UPDATE 
        SET quota_amount = EXCLUDED.quota_amount,
            working_days = EXCLUDED.working_days,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger: Auto-Seed Quotas for Any Newly Added Fiscal Year
CREATE OR REPLACE FUNCTION public.trg_auto_seed_quotas_for_sales()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.year IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.sales_quotas WHERE fiscal_year = NEW.year
    ) THEN
        PERFORM public.seed_fiscal_year_quotas(NEW.year, public.get_default_annual_quota(NEW.year));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_insert_auto_seed_quotas ON public.sales;
CREATE TRIGGER trg_sales_insert_auto_seed_quotas
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_seed_quotas_for_sales();

-- 12. Seed Baseline Data for All Fiscal Years (2016-17 to Present & Future)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT * FROM (VALUES
            ('2016-17', 3300000),
            ('2017-18', 3420000),
            ('2018-19', 3580000),
            ('2019-20', 3750000),
            ('2020-21', 3920000),
            ('2021-22', 4100000),
            ('2022-23', 4281810),
            ('2023-24', 4680827),
            ('2024-25', 5060563),
            ('2025-26', 5920915),
            ('2026-27', 0)
        ) AS t(yr, target)
    LOOP
        PERFORM public.seed_fiscal_year_quotas(rec.yr, rec.target);
    END LOOP;
END $$;

-- Explicitly ensure baseline values match your exact spreadsheet for active year FY 2025-26:
INSERT INTO public.sales_quotas (fiscal_year, fiscal_month, month_name, quota_amount, working_days)
VALUES 
    ('2025-26', 1,  'OCT', 478228, 23),
    ('2025-26', 2,  'NOV', 415280, 20),
    ('2025-26', 3,  'DEC', 519711, 23),
    ('2025-26', 4,  'JAN', 538549, 22),
    ('2025-26', 5,  'FEB', 513022, 20),
    ('2025-26', 6,  'MAR', 534499, 22),
    ('2025-26', 7,  'APR', 488927, 22),
    ('2025-26', 8,  'MAY', 457074, 21),
    ('2025-26', 9,  'JUN', 473910, 22),
    ('2025-26', 10, 'JUL', 516100, 23),
    ('2025-26', 11, 'AUG', 484574, 21),
    ('2025-26', 12, 'SEP', 501041, 22)
ON CONFLICT (fiscal_year, fiscal_month) DO UPDATE 
SET quota_amount = EXCLUDED.quota_amount,
    working_days = EXCLUDED.working_days,
    updated_at = NOW();


