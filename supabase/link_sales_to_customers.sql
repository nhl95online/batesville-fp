-- =====================================================================
-- Link public.sales."account_#"  ->  public.customers."Account Number"
-- Run once in the Supabase SQL Editor.
-- =====================================================================

-- 1. Add the 33 funeral homes that appear in sales but are missing from customers
--    (name taken from the most recent sale, with ARB###/PLN### prefixes stripped)
INSERT INTO public.customers (customer_id, "Account Number", "Name")
OVERRIDING SYSTEM VALUE
SELECT
  (SELECT COALESCE(MAX(customer_id), 0) FROM public.customers) + ROW_NUMBER() OVER (ORDER BY m.acct),
  m.acct,
  TRIM(REGEXP_REPLACE(m.name, '^(ARB|PLN|PA|SPP|AMP|OBB)\d*\s+', '', 'i'))
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
SELECT s.*, c."Name" AS funeral_home, c."City" AS city, c."State" AS state
FROM public.sales s
LEFT JOIN public.customers c ON c."Account Number" = s."account_#";
