-- =====================================================================
-- Link public.sales."account_#"  ->  public.customers."Account Number"
-- Run once in the Supabase SQL Editor.
--
-- Funeral homes removed from your territory are KEPT in customers with
-- in_territory = false so their historical (and any future) sales still
-- count in the sales figures, but they are hidden from customer lists.
-- =====================================================================

-- 0. Territory flag (true = active in my territory)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS in_territory BOOLEAN NOT NULL DEFAULT TRUE;

-- 1. Add the funeral homes that appear in sales but are missing from customers,
--    flagged as out of territory (name from most recent sale, ARB###/PLN### prefix stripped)
INSERT INTO public.customers (customer_id, "Account Number", "Name", in_territory)
OVERRIDING SYSTEM VALUE
SELECT
  (SELECT COALESCE(MAX(customer_id), 0) FROM public.customers) + ROW_NUMBER() OVER (ORDER BY m.acct),
  m.acct,
  TRIM(REGEXP_REPLACE(m.name, '^(ARB|PLN|PA|SPP|AMP|OBB)\d*\s+', '', 'i')),
  FALSE
FROM (
  SELECT DISTINCT ON (s."account_#") s."account_#" AS acct, s.account_name AS name
  FROM public.sales s
  LEFT JOIN public.customers c ON c."Account Number" = s."account_#"
  WHERE c."Account Number" IS NULL AND s."account_#" IS NOT NULL
  ORDER BY s."account_#", s.sales_id DESC
) m;

-- 2. A foreign key target must be UNIQUE
ALTER TABLE public.customers
  ADD CONSTRAINT customers_account_number_key UNIQUE ("Account Number");

-- 3. The foreign key itself
ALTER TABLE public.sales
  ADD CONSTRAINT sales_account_fk
  FOREIGN KEY ("account_#") REFERENCES public.customers ("Account Number")
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sales_account ON public.sales ("account_#");

-- 4. Allow the web app to insert sales and auto-create unknown funeral homes on upload
DROP POLICY IF EXISTS "Allow public insert on sales" ON public.sales;
CREATE POLICY "Allow public insert on sales" ON public.sales
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert on customers" ON public.customers;
CREATE POLICY "Allow public insert on customers" ON public.customers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 5. Handy view: every sale with the funeral home pulled from customers
CREATE OR REPLACE VIEW public.v_sales_with_customer AS
SELECT s.*, c."Name" AS funeral_home, c."City" AS city, c."State" AS state, c.in_territory
FROM public.sales s
LEFT JOIN public.customers c ON c."Account Number" = s."account_#";

-- To move an account back into your territory later:
--   UPDATE public.customers SET in_territory = TRUE WHERE "Account Number" = 128761;
