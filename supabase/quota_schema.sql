-- ==============================================================================
-- Batesville-FP: Annual Quota Tracking & Pacing Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure public.sales Table exists with exact 13 columns
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

CREATE INDEX IF NOT EXISTS idx_sales_year_month ON public.sales(year, month);

-- 2. Create the sales_quotas Table
-- Stores annual & monthly quota targets and working business days per fiscal month
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

-- 2. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_sales_quotas_fy_fm ON public.sales_quotas(fiscal_year, fiscal_month);

-- 3. Row Level Security (RLS) - Allow Read & Write with Supabase Anon Key
ALTER TABLE public.sales_quotas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Sales Quotas' AND tablename = 'sales_quotas'
    ) THEN
        CREATE POLICY "Public Access Sales Quotas" ON public.sales_quotas FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Real-Time View: v_annual_quota_pacing
-- Automatically aggregates actual sales from public.sales and calculates:
-- - Quota (Monthly target)
-- - Total (Cumulative quota)
-- - Actual (Cumulative sales)
-- - (+/-) Cumulative Variance
-- - Sales (Monthly actual sales)
-- - (+/-) Monthly Variance
-- - Daily (Actual daily pace)
-- - Req'd (Required daily pace)
-- - % (Attainment % to date)
-- - Annual % (% of total annual quota)
-- THIS VIEW AUTOMATICALLY RECALCULATES REAL-TIME AS SOON AS ANY NEW RECORD IS ADDED TO SALES!
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
        -- Cumulative Running Quota (Total)
        SUM(q.quota_amount) OVER (
            PARTITION BY q.fiscal_year 
            ORDER BY q.fiscal_month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_quota,
        -- Cumulative Running Actual Sales (Actual)
        SUM(COALESCE(ma.total_sales, 0)) OVER (
            PARTITION BY q.fiscal_year 
            ORDER BY q.fiscal_month
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_sales,
        -- Full Year Annual Quota Target
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
    -- 1. Quota
    ROUND(monthly_quota, 2) AS quota,
    -- 2. Total (Cumulative Quota)
    ROUND(cumulative_quota, 2) AS total,
    -- 3. Actual (Cumulative Sales)
    ROUND(cumulative_sales, 2) AS actual,
    -- 4. (+/-) Cumulative Variance
    ROUND(cumulative_sales - cumulative_quota, 2) AS cumulative_variance,
    -- 5. Sales (Monthly Sales)
    ROUND(monthly_sales, 2) AS sales,
    -- 6. (+/-) Monthly Variance
    ROUND(monthly_sales - monthly_quota, 2) AS monthly_variance,
    -- 7. Daily Actual Pace
    ROUND(monthly_sales / NULLIF(working_days, 0), 2) AS daily_actual,
    -- 8. Req'd Daily Pace
    ROUND(monthly_quota / NULLIF(working_days, 0), 2) AS required_daily,
    -- 9. Attainment % to Date
    ROUND((cumulative_sales / NULLIF(cumulative_quota, 0)) * 100, 2) AS attainment_percent,
    -- 10. Annual % Progress
    ROUND((cumulative_sales / NULLIF(full_year_quota, 0)) * 100, 2) AS annual_percent
FROM joined_pacing
ORDER BY fiscal_year, fiscal_month;

-- 5. Helper Function: Calculate Exact Billing Days in a Month (Excluding Weekends & Corporate Holidays)
CREATE OR REPLACE FUNCTION public.get_billing_days(cal_year INT, cal_month INT)
RETURNS INT AS $$
DECLARE
    start_date DATE := make_date(cal_year, cal_month, 1);
    end_date DATE := (start_date + INTERVAL '1 month - 1 day')::DATE;
    d DATE;
    billing_days INT := 0;
    dow INT;
    is_holiday BOOLEAN;
    
    -- Recognized US Corporate / Commercial Holidays
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
    IF EXTRACT(DOW FROM ny) = 0 THEN ny := ny + 1; -- Sun -> Mon
    ELSIF EXTRACT(DOW FROM ny) = 6 THEN ny := ny - 1; -- Sat -> Fri
    END IF;

    -- 2. Martin Luther King Jr. Day (3rd Monday in Jan)
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
    thx_fri := thx + 1; -- Day after Thanksgiving

    -- 8. Christmas Day (Dec 25, observed)
    xmas := make_date(cal_year, 12, 25);
    IF EXTRACT(DOW FROM xmas) = 0 THEN xmas := xmas + 1;
    ELSIF EXTRACT(DOW FROM xmas) = 6 THEN xmas := xmas - 1;
    END IF;

    -- Iterate through each day of the month
    FOR d IN SELECT generate_series(start_date, end_date, '1 day'::INTERVAL)::DATE LOOP
        dow := EXTRACT(ISODOW FROM d);
        -- Exclude Saturdays (6) and Sundays (7)
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

-- 6. Function to Auto-Seed Quotas & Exact Dynamic Billing Days for Any Fiscal Year
CREATE OR REPLACE FUNCTION public.seed_fiscal_year_quotas(
    target_year TEXT,
    annual_target NUMERIC DEFAULT 5920915
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
BEGIN
    IF position('-' in target_year) > 0 THEN
        base_year := split_part(target_year, '-', 1)::INT;
    ELSE
        base_year := target_year::INT;
    END IF;

    FOR i IN 1..12 LOOP
        -- Q1 (Oct, Nov, Dec) is in base_year; Q2-Q4 (Jan-Sep) is in base_year + 1
        IF i <= 3 THEN
            m_year := base_year;
        ELSE
            m_year := base_year + 1;
        END IF;

        -- Automatically calculate billing days for this specific calendar year & month, excluding holidays!
        b_days := public.get_billing_days(m_year, cal_months[i]);
        m_quota := ROUND(annual_target * weights[i], 0);

        INSERT INTO public.sales_quotas (fiscal_year, fiscal_month, month_name, quota_amount, working_days)
        VALUES (target_year, i, months[i], m_quota, b_days)
        ON CONFLICT (fiscal_year, fiscal_month) DO UPDATE 
        SET quota_amount = EXCLUDED.quota_amount,
            working_days = EXCLUDED.working_days,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger: Auto-Seed Quotas for Any Newly Added Fiscal Year
CREATE OR REPLACE FUNCTION public.trg_auto_seed_quotas_for_sales()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.year IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.sales_quotas WHERE fiscal_year = NEW.year
    ) THEN
        PERFORM public.seed_fiscal_year_quotas(NEW.year, 5920915);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_insert_auto_seed_quotas ON public.sales;
CREATE TRIGGER trg_sales_insert_auto_seed_quotas
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_seed_quotas_for_sales();

-- 7. Seed Baseline Data for All Fiscal Years (2016-17 to Present & Future)
DO $$
DECLARE
    yr TEXT;
    years TEXT[] := ARRAY[
        '2016-17', '2017-18', '2018-19', '2019-20', '2020-21',
        '2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27'
    ];
BEGIN
    FOREACH yr IN ARRAY years LOOP
        PERFORM public.seed_fiscal_year_quotas(yr, 5920915);
    END LOOP;
END $$;

-- Explicitly ensure baseline values match your exact spreadsheet for active years:
INSERT INTO public.sales_quotas (fiscal_year, fiscal_month, month_name, quota_amount, working_days)
VALUES 
    ('2024-25', 1,  'OCT', 478228, 23),
    ('2024-25', 2,  'NOV', 415280, 20),
    ('2024-25', 3,  'DEC', 519711, 23),
    ('2024-25', 4,  'JAN', 538549, 22),
    ('2024-25', 5,  'FEB', 513022, 20),
    ('2024-25', 6,  'MAR', 534499, 22),
    ('2024-25', 7,  'APR', 488927, 22),
    ('2024-25', 8,  'MAY', 457074, 21),
    ('2024-25', 9,  'JUN', 473910, 22),
    ('2024-25', 10, 'JUL', 516100, 23),
    ('2024-25', 11, 'AUG', 484574, 21),
    ('2024-25', 12, 'SEP', 501041, 22)
ON CONFLICT (fiscal_year, fiscal_month) DO UPDATE 
SET quota_amount = EXCLUDED.quota_amount,
    working_days = EXCLUDED.working_days,
    updated_at = NOW();

