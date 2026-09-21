/**
 * Customer Retail Price List Service
 * Manages loaded retail prices for each customer funeral home.
 * Supports bulk CSV/pasted import and single item overrides.
 */

const STORAGE_KEY = 'batesville_customer_retails_v1';

export type CustomerRetailMap = Record<string, number>; // product_code -> retail price
export type AllCustomerRetails = Record<string, CustomerRetailMap>; // customerId or code -> (product_code -> retail price)

/**
 * Load all customer retails from localStorage
 */
export function getAllCustomerRetails(): AllCustomerRetails {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading customer retails:', err);
    return {};
  }
}

/**
 * Get retail prices loaded for a specific customer
 */
export function getCustomerRetails(customerIdOrCode: string): CustomerRetailMap {
  const all = getAllCustomerRetails();
  const key = String(customerIdOrCode).toLowerCase().trim();
  return all[key] || all[String(customerIdOrCode)] || {};
}

/**
 * Look up a specific product's retail price for a customer
 */
export function getCustomerRetailPrice(
  customerIdOrCode: string, 
  productCode: string | number
): number | null {
  if (!customerIdOrCode || !productCode) return null;
  const custMap = getCustomerRetails(customerIdOrCode);
  const pCodeStr = String(productCode).trim();
  
  if (custMap[pCodeStr] !== undefined) {
    return custMap[pCodeStr];
  }
  
  // Try case-insensitive / normalized lookup
  const normTarget = pCodeStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(custMap)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget) {
      return v;
    }
  }

  return null;
}

/**
 * Save / update retail prices for a customer
 */
export function saveCustomerRetails(
  customerIdOrCode: string, 
  retails: CustomerRetailMap
): void {
  const all = getAllCustomerRetails();
  const key = String(customerIdOrCode).toLowerCase().trim();
  all[key] = { ...(all[key] || {}), ...retails };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save customer retails:', err);
  }
}

/**
 * Delete a specific product price or clear customer retails
 */
export function removeCustomerProductRetail(
  customerIdOrCode: string, 
  productCode: string
): void {
  const all = getAllCustomerRetails();
  const key = String(customerIdOrCode).toLowerCase().trim();
  if (all[key]) {
    delete all[key][productCode];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}

/**
 * Parse pasted text or CSV into a CustomerRetailMap
 * Supported formats:
 * - "product_code, price" (e.g. "271819, 4065" or "146799, 4995.00")
 * - "product_code\tprice" (Excel copy-paste)
 * - "product_code: price"
 * - "product_code price"
 */
export function parseRetailListText(text: string): CustomerRetailMap {
  const map: CustomerRetailMap = {};
  if (!text) return map;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('code') || trimmed.toLowerCase().startsWith('item')) {
      continue;
    }

    // Split by comma, tab, semicolon, or colon
    let parts = trimmed.split(/[\t,;:]+/).map(p => p.trim());
    if (parts.length < 2) {
      // Split by whitespace
      parts = trimmed.split(/\s+/).map(p => p.trim());
    }

    if (parts.length >= 2) {
      const rawCode = parts[0];
      const rawPrice = parts[1].replace(/[\$,]/g, '').trim();
      const numPrice = parseFloat(rawPrice);

      if (rawCode && !isNaN(numPrice) && numPrice > 0) {
        map[rawCode] = Math.round(numPrice * 100) / 100;
      }
    }
  }

  return map;
}
