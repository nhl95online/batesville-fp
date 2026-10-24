/**
 * Customer Cost Pricing Service
 * Stores each funeral home's COST (net price they pay) per product, per fiscal year.
 * - Local cache in localStorage for instant lookups
 * - Persisted to Supabase table public.customer_product_pricing (net_cost column, by catalog_year)
 */
import { getSupabaseClient } from './supabase';

const STORAGE_KEY = 'batesville_customer_costs_v1';
const COST_SOURCE = 'customer_cost_upload';

export interface CustomerCostRow {
  accountNumber: string;
  productCode: string;
  cost: number;
}

// fiscalYear -> account# -> productCode -> cost
type CostStore = Record<string, Record<string, Record<string, number>>>;

const norm = (v: unknown) => String(v ?? '').replace(/[^0-9A-Za-z]/g, '').toLowerCase();

function readStore(): CostStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CostStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save customer costs locally:', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('batesville_customer_costs_updated'));
  }
}

/** Current Batesville fiscal year code (Oct 1 – Sep 30), e.g. "2026-27" */
export function getCurrentFiscalYear(date = new Date()): string {
  const y = date.getFullYear();
  const start = date.getMonth() + 1 >= 10 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** Look up a funeral home's cost for a product in a fiscal year (falls back to most recent earlier year) */
export function getCustomerCost(
  accountNumber: string | number | undefined,
  productCode: string | number | undefined,
  fiscalYear: string = getCurrentFiscalYear()
): { cost: number; fiscalYear: string } | null {
  const acct = norm(accountNumber);
  const code = norm(productCode);
  if (!acct || !code) return null;
  const store = readStore();
  const years = Object.keys(store)
    .filter(y => y <= fiscalYear)
    .sort((a, b) => b.localeCompare(a));
  for (const y of years) {
    const v = store[y]?.[acct]?.[code];
    if (typeof v === 'number') return { cost: v, fiscalYear: y };
  }
  return null;
}

/** Summary counts per fiscal year */
export function getCustomerCostSummary(): { fiscalYear: string; customers: number; items: number }[] {
  const store = readStore();
  return Object.entries(store)
    .map(([fiscalYear, accts]) => ({
      fiscalYear,
      customers: Object.keys(accts).length,
      items: Object.values(accts).reduce((n, m) => n + Object.keys(m).length, 0),
    }))
    .sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear));
}

/** All costs for one customer in a fiscal year */
export function getCustomerCostsFor(accountNumber: string | number, fiscalYear: string): Record<string, number> {
  return readStore()[fiscalYear]?.[norm(accountNumber)] || {};
}

/** Split one CSV line respecting quotes */
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === delim && !q) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/**
 * Parse an Excel-saved CSV (or pasted Excel cells) with columns:
 *   Account #, Product Code, Cost
 * Header row is auto-detected (account / product|item|code / cost|price|net).
 * Without a header, columns are assumed to be in that order.
 */
export function parseCustomerCostText(text: string): { rows: CustomerCostRow[]; skipped: number } {
  const lines = (text || '').split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  let acctIdx = 0, codeIdx = 1, costIdx = 2;
  let start = 0;

  const header = splitCsvLine(lines[0], delim).map(h => h.toLowerCase());
  // Header row = no purely numeric cells (data rows always have a numeric account # and cost)
  const looksLikeHeader = !header.some(h => /^\$?[\d,.\s]+$/.test(h) && /\d/.test(h));
  if (looksLikeHeader) {
    const find = (re: RegExp) => header.findIndex(h => re.test(h));
    const a = find(/acc(oun)?t|acct|cust/);
    const c = find(/product|item|sku|code|model/);
    const p = find(/cost|net|price|amount|\$/);
    if (a >= 0) acctIdx = a;
    if (c >= 0 && c !== acctIdx) codeIdx = c;
    if (p >= 0 && p !== acctIdx && p !== codeIdx) costIdx = p;
    start = 1;
  }

  const rows: CustomerCostRow[] = [];
  let skipped = 0;
  for (let i = start; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i], delim);
    const acct = String(parts[acctIdx] ?? '').replace(/[^0-9]/g, '');
    const code = String(parts[codeIdx] ?? '').trim();
    const cost = parseFloat(String(parts[costIdx] ?? '').replace(/[$,\s]/g, ''));
    if (!acct || !code || !Number.isFinite(cost) || cost <= 0) {
      skipped++;
      continue;
    }
    rows.push({ accountNumber: acct, productCode: code, cost: Math.round(cost * 100) / 100 });
  }
  return { rows, skipped };
}

/** Save costs locally and upsert net_cost into Supabase public.customer_product_pricing */
export async function saveCustomerCosts(
  fiscalYear: string,
  rows: CustomerCostRow[],
  replaceYear = false
): Promise<{ saved: number; cloudError?: string }> {
  const store = readStore();
  if (replaceYear || !store[fiscalYear]) store[fiscalYear] = {};
  for (const r of rows) {
    const a = norm(r.accountNumber);
    const c = norm(r.productCode);
    if (!store[fiscalYear][a]) store[fiscalYear][a] = {};
    store[fiscalYear][a][c] = r.cost;
  }
  writeStore(store);

  let cloudError: string | undefined;
  try {
    const client = getSupabaseClient();
    if (replaceYear) {
      // Only remove rows created by previous cost uploads (keeps manually entered retails)
      await client
        .from('customer_product_pricing')
        .delete()
        .eq('catalog_year', fiscalYear)
        .eq('source', COST_SOURCE);
    }
    // product_code is int8 in Supabase — only numeric codes can be stored in the cloud
    // De-duplicate (same account + product in one file): the last line wins
    const byKey = new Map<string, any>();
    for (const r of rows) {
      const row = {
        account_number: parseInt(r.accountNumber, 10),
        product_code: parseInt(String(r.productCode).replace(/[^0-9]/g, ''), 10),
        catalog_year: fiscalYear,
        net_cost: r.cost,
        source: COST_SOURCE,
      };
      if (Number.isFinite(row.account_number) && Number.isFinite(row.product_code)) {
        byKey.set(`${row.account_number}|${row.product_code}`, row);
      }
    }
    const payload = Array.from(byKey.values());
    for (let i = 0; i < payload.length; i += 500) {
      const { error } = await client
        .from('customer_product_pricing')
        .upsert(payload.slice(i, i + 500), { onConflict: 'account_number,product_code,catalog_year' });
      if (error) {
        cloudError = error.message;
        break;
      }
    }
  } catch (e: any) {
    cloudError = e?.message || 'Could not reach Supabase';
  }
  return { saved: rows.length, cloudError };
}

/** Pull all customer costs from Supabase into the local cache */
export async function syncCustomerCostsFromSupabase(): Promise<number> {
  try {
    const client = getSupabaseClient();
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client
        .from('customer_product_pricing')
        .select('catalog_year,account_number,product_code,net_cost')
        .gt('net_cost', 0)
        .range(from, from + 999);
      if (error || !data) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    if (all.length === 0) return 0;
    const store: CostStore = {};
    for (const r of all) {
      const y = String(r.catalog_year);
      const a = norm(r.account_number);
      const c = norm(r.product_code);
      if (!store[y]) store[y] = {};
      if (!store[y][a]) store[y][a] = {};
      store[y][a][c] = Number(r.net_cost) || 0;
    }
    writeStore(store);
    return all.length;
  } catch (e) {
    console.warn('Customer cost sync skipped:', e);
    return 0;
  }
}
