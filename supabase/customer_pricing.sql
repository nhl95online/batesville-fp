-- =====================================================================
-- Customer Cost Pricing (what each funeral home pays, NOT retail)
-- Run once in the Supabase SQL Editor.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customer_pricing (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fiscal_year  TEXT    NOT NULL,                 -- e.g. '2026-27'
  "account_#"  BIGINT  NOT NULL,                 -- funeral home Account Number
  product_code TEXT    NOT NULL,                 -- Batesville item / product code
  cost         NUMERIC(12, 2) NOT NULL,          -- funeral home net cost
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fiscal_year, "account_#", product_code)
);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_acct ON public.customer_pricing ("account_#", fiscal_year);

-- Link to customers (works once customers."Account Number" is UNIQUE — see link_sales_to_customers.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_account_number_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_pricing_account_fk'
  ) THEN
    ALTER TABLE public.customer_pricing
      ADD CONSTRAINT customer_pricing_account_fk
      FOREIGN KEY ("account_#") REFERENCES public.customers ("Account Number")
      ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access customer_pricing" ON public.customer_pricing;
CREATE POLICY "Public access customer_pricing" ON public.customer_pricing
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
