import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { db, invalidateSalesCache, saveLithoItem } from './db';
import { Customer, Product, SaleRecord, SupabaseConfig, CasketImageItem, LithoItem, FloorSlot } from '../types';
import { BATESVILLE_CASKET_CATALOG } from './batesvilleCatalogData';

const STORAGE_KEY = 'batesville_fp_supabase_config';

// Pre-configured with the user's verified Supabase credentials
const DEFAULT_CONFIG: SupabaseConfig = {
  url: 'https://yrprtpqwojpeskccerec.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlycHJ0cHF3b2pwZXNrY2NlcmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NTE5ODgsImV4cCI6MjEwMzEyNzk4OH0.Uw5T0PLIabftmUVKHtUdlMuIanYvAdsFr2k3kWIzoWQ',
  isConnected: true
};

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.error('Failed to load Supabase config from localStorage', e);
  }
  return DEFAULT_CONFIG;
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

let activeClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const config = getStoredSupabaseConfig();
  if (!activeClient) {
    activeClient = createClient(config.url, config.anonKey);
  }
  return activeClient;
}

export function resetSupabaseClient(): void {
  activeClient = null;
}

// Test connection
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url || !anonKey) {
      return { success: false, message: 'Supabase URL and Anon/Public Key are required.' };
    }
    const client = createClient(url, anonKey);
    const { count, error } = await client.from('customers').select('*', { count: 'exact', head: true });
    
    if (error) {
      return { success: false, message: error.message || 'Failed to authenticate with Supabase.' };
    }

    return { 
      success: true, 
      message: `Successfully connected to Supabase! Found ${count || 0} customer records.` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error connecting to Supabase.' };
  }
}

// Month string to 1-12 mapping
const MONTH_MAP: Record<string, number> = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

/**
 * Normalizes a Batesville product code or string for robust matching.
 * Removes all spaces, hyphens, underscores, and lowers case.
 * e.g., "20A 880" -> "20a880", "20A_880" -> "20a880", "146799" -> "146799"
 */
export function normalizeProductCode(code: string | number): string {
  return String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Matches a casket image file name to products using Product Code as the primary identifier.
 * Priority:
 * 1. Exact match on normalized product code (e.g. "146799.png", "20A_880.png", "4BH_891.webp")
 * 2. Prefix match: filename starts with product code (e.g. "146799_woodbridge.png", "20a_880_1.png")
 * 3. Token match: filename contains product code as a delimiter-separated token (e.g. "casket_146799.jpg")
 * 4. Fallback to descriptive name tokens if code is absent.
 */
export function matchCasketFileToProducts(fileName: string, products: Product[]): {
  matchedProducts: Product[];
  productCode?: string;
  productName?: string;
} {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  const normBase = normalizeProductCode(baseName);

  if (!normBase) return { matchedProducts: [] };

  // 1. Exact match: Filename base directly matches a product code
  const exactMatches = products.filter(p => normalizeProductCode(p.code) === normBase);
  if (exactMatches.length > 0) {
    return {
      matchedProducts: exactMatches,
      productCode: exactMatches[0].code,
      productName: exactMatches[0].name
    };
  }

  // 2. Prefix match: Filename starts with product code (e.g. "146799_woodbridge.png" or "20a_880_woodbridge.png")
  // Sort products by code length descending to ensure longer codes match first
  const sortedProducts = [...products].sort((a, b) => b.code.length - a.code.length);
  for (const p of sortedProducts) {
    const normCode = normalizeProductCode(p.code);
    if (normCode.length >= 3 && normBase.startsWith(normCode)) {
      const codeMatches = products.filter(x => x.code === p.code);
      return {
        matchedProducts: codeMatches,
        productCode: p.code,
        productName: p.name
      };
    }
  }

  // 3. Delimited token match: Filename contains product code as a separate segment (e.g. "casket_146799_front.jpg")
  const tokens = baseName.split(/[-_ \.]+/).map(t => normalizeProductCode(t)).filter(t => t.length >= 3);
  for (const token of tokens) {
    const found = products.find(p => normalizeProductCode(p.code) === token);
    if (found) {
      const codeMatches = products.filter(x => x.code === found.code);
      return {
        matchedProducts: codeMatches,
        productCode: found.code,
        productName: found.name
      };
    }
  }

  // 4. Fallback: Match by descriptive words (e.g. if file was named "woodbridge_pecan.png")
  const words = baseName.toLowerCase().split(/[-_ \.]+/).filter(w => w.length > 3);
  if (words.length > 0) {
    for (const p of products) {
      const pText = (p.name + ' ' + p.material + ' ' + p.exteriorFinish).toLowerCase();
      if (words.every(w => pText.includes(w))) {
        const codeMatches = products.filter(x => x.code === p.code);
        return {
          matchedProducts: codeMatches,
          productCode: p.code,
          productName: p.name
        };
      }
    }
  }

  return { matchedProducts: [] };
}

/**
 * Matches a litho / cut sheet file to Batesville casket products.
 * Handles filenames such as:
 * - "147959.pdf", "147959.png"
 * - "147959_litho.pdf", "147959-litho.pdf", "147959 litho.pdf"
 * - "litho_147959.pdf", "litho-147959.pdf"
 * - "147959 Woodbridge Pecan Litho.pdf"
 * - "Woodbridge_Pecan_147959.pdf"
 * - "20A 880 litho.pdf", "4BH_891.pdf"
 */
export function matchLithoFileToProducts(fileName: string, products: Product[]): {
  matchedProducts: Product[];
  productCode?: string;
  productName?: string;
} {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();

  // 1. Try standard casket matcher first
  const initialMatch = matchCasketFileToProducts(fileName, products);
  if (initialMatch.matchedProducts.length > 0 && initialMatch.productCode) {
    return initialMatch;
  }

  // 2. Strip common litho / tearsheet words and re-test
  const cleanBase = baseName
    .replace(/\b(litho|lithos|lithograph|cutsheet|cut_sheet|cut sheet|tearsheet|tear_sheet|tear sheet|sheet|batesville|casket|urn|catalog)\b/gi, ' ')
    .trim();

  if (cleanBase) {
    const cleanMatch = matchCasketFileToProducts(cleanBase, products);
    if (cleanMatch.matchedProducts.length > 0 && cleanMatch.productCode) {
      return cleanMatch;
    }
  }

  // 3. Scan for any 5 or 6 digit number in filename (canonical Batesville SKU)
  const skuMatch = baseName.match(/\b(\d{5,6})\b/);
  if (skuMatch) {
    const candidateCode = skuMatch[1];
    const found = products.filter(p => normalizeProductCode(p.code) === candidateCode);
    if (found.length > 0) {
      return {
        matchedProducts: found,
        productCode: found[0].code,
        productName: found[0].name
      };
    }
  }

  return { matchedProducts: [] };
}

/**
 * Matches funeral home logos by Batesville account number as primary key.
 */
export function matchLogoFileToCustomers(fileName: string, customers: Customer[]): Customer[] {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  const normBase = normalizeProductCode(baseName);

  // 1. Match by exact or prefix account number
  const matches = customers.filter(c => {
    const acctStr = normalizeProductCode(String(c.accountNumber || ''));
    return acctStr && (normBase === acctStr || normBase.startsWith(acctStr));
  });
  if (matches.length > 0) return matches;

  // 2. Match by customer name tokens
  const words = baseName.toLowerCase().split(/[-_ \.]+/).filter(w => w.length > 3);
  if (words.length > 0) {
    return customers.filter(c => words.every(w => c.name.toLowerCase().includes(w)));
  }

  return [];
}

/**
 * Checks whether a product or item is an urn, keepsake, or cremation memorial
 */
export function isUrnProduct(product?: { category?: string; name?: string; description?: string } | null): boolean {
  if (!product) return false;
  const cat = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();

  // If category specifically indicates burial or casket, it is not an urn
  if ((cat.includes('burial') || cat.includes('casket')) && !cat.includes('urn')) {
    return false;
  }

  // Use word boundary to avoid matching "Gurnet", "Auburn", "Burnished", "Furnishing"
  const urnWordRegex = /\b(urn|urns|keepsake|keepsakes)\b/i;

  return (
    urnWordRegex.test(cat) ||
    (cat.includes('cremation') && (cat.includes('full size') || urnWordRegex.test(name) || urnWordRegex.test(desc))) ||
    urnWordRegex.test(name) ||
    urnWordRegex.test(desc)
  );
}

// Helper: parse raw product description into material, interior, and clean name
function parseBatesvilleDescription(desc: string, category?: string) {
  if (!desc) return { name: 'Merchandise', material: 'Standard', interior: '', finish: '', isUrn: false };

  const fullName = desc.trim();
  const isUrn = isUrnProduct({ category, name: fullName, description: fullName });
  const lower = fullName.toLowerCase();

  if (isUrn) {
    let material = 'Cast Metal & Fine Hardwood';
    if (lower.includes('bronze')) material = 'Cast Bronze / Cold Cast';
    else if (lower.includes('pewter')) material = 'Hand-Crafted Pewter';
    else if (lower.includes('brass')) material = 'Solid Spun Brass';
    else if (lower.includes('marble')) material = 'Cultured Marble';
    else if (lower.includes('wood') || lower.includes('cherry') || lower.includes('oak') || lower.includes('pecan')) material = 'Fine Solid Hardwood';
    else if (lower.includes('sheet bronze')) material = 'Sheet Bronze';

    return {
      name: fullName,
      material,
      interior: '', // Urns do not have fabric interiors
      finish: '',   // Empty if not specified
      isUrn: true
    };
  }

  let parts = desc.split(',').map(s => s.trim());
  let interior = parts.length > 1 ? parts[1] : '';
  let finish = '';
  let material = 'High-Grade Steel / Timber';

  // Determine material from description
  if (lower.includes('pecan')) { material = 'Solid Northern Pecan'; finish = 'Warm Pecan Stain'; }
  else if (lower.includes('maple')) { material = 'Solid Select Maple'; finish = 'Polished Maple Finish'; }
  else if (lower.includes('cherry')) { material = 'Solid Appalachian Cherry'; finish = 'Georgetown Cherry Finish'; }
  else if (lower.includes('oak')) { material = 'Solid American Oak'; finish = 'Satin Oak Finish'; }
  else if (lower.includes('bronze')) { material = 'Solid 48 oz. Bronze'; finish = 'Polished Bronze'; }
  else if (lower.includes('steel') || lower.includes('18g') || lower.includes('20g')) { material = '18 Gauge Protective Steel'; }
  else if (lower.includes('cloth')) { material = 'Cloth Covered Fiberboard'; finish = 'Textured Cloth Weave'; }
  else if (lower.includes('mdf') || lower.includes('pine')) { material = 'Pine & Composite Cremation'; }

  return { name: fullName, material, interior, finish, isUrn: false };
}

// Fallback high quality imagery for product categories if no custom photo uploaded yet
function getFallbackImage(category: string, code: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('wood') || cat.includes('pecan') || cat.includes('cherry') || cat.includes('oak')) {
    return 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80';
  }
  if (cat.includes('urn')) {
    return 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop&q=80';
  }
  if (cat.includes('cloth') || cat.includes('cremation box') || cat.includes('container')) {
    return 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80';
}

// Sync from Supabase down to Local Portable Database
export async function syncFromSupabase(): Promise<{ 
  success: boolean; 
  message: string; 
  counts?: { customers: number; products: number; sales: number; years: string[] } 
}> {
  const client = getSupabaseClient();

  try {
    // 1. Fetch Customers from Supabase
    const { data: remoteCustomers, error: custError } = await client.from('customers').select('*');
    if (custError) throw new Error(`Customers sync error: ${custError.message}`);

    const mappedCustomers: Customer[] = (remoteCustomers || []).map((c: any) => {
      const markup = c.burial_discount ? Math.round(100 + c.burial_discount) : 140;

      return {
        id: `cust-${c.customer_id}`,
        customerId: Number(c.customer_id),
        accountNumber: c['account_#'],
        code: String(c['account_#'] || c.customer_id),
        name: c.account_name || `Account ${c['account_#']}`,
        accountName: c.account_name || `Account ${c['account_#']}`,
        mainContact: c['Main Contact'] || '—',
        contactPerson: c['Main Contact'] || '—',
        email: c.email || undefined,
        secondContact: c['2nd Contact'] || undefined,
        thirdContact: c['3rd Contact'] || undefined,
        burialDiscount: Number(c.burial_discount || 0),
        cremationDiscount: Number(c.cremation_discount || 0),
        rebate: c.rebate !== null && c.rebate !== undefined ? Number(c.rebate) : undefined,
        selectionRoom: Boolean(c.selectionroom),
        selectionRoomStyle: c.selectionroom_style || (c.selectionroom ? 'Full Size' : 'None'),
        program: c.program || 'Standard',
        tier: c.program || 'Standard',
        defaultMarkupPercent: markup,
        notes: `Program: ${c.program || 'N/A'} • Style: ${c.selectionroom_style || 'Standard'} • Discounts: Burial ${c.burial_discount || 0}%, Cremation ${c.cremation_discount || 0}%`,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // 2. Fetch Sales from Supabase in batches of 1000
    let allSalesRaw: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await client
        .from('sales')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw new Error(`Sales sync error: ${error.message}`);
      if (!data || data.length === 0) break;
      allSalesRaw.push(...data);
      if (data.length < pageSize) break;
      page++;
    }

    // 3. Extract and build Product Catalog organized by Year & Product Code with all 21 casket attributes
    const productMap = new Map<string, Product>();
    const distinctYears = new Set<string>();

    // Seed with authentic Batesville catalog (all 918 casket models with full specs)
    BATESVILLE_CASKET_CATALOG.forEach((p) => {
      productMap.set(p.code, { ...p });
      distinctYears.add(String(p.catalogYear || '2026-27'));
    });

    // Also enrich from sales records for historical catalog years
    allSalesRaw.forEach((s: any) => {
      const prodCode = String(s.product_code);
      const yr = String(s.year || '2026-27');
      distinctYears.add(yr);

      const compositeKey = `${prodCode}-${yr}`;
      if (!productMap.has(compositeKey)) {
        const base = productMap.get(prodCode);
        if (base) {
          productMap.set(compositeKey, {
            ...base,
            id: `prod-${prodCode}-${yr}`,
            catalogYear: yr,
            year: yr,
            wholesalePrice: Number(s.cost) || base.wholesalePrice,
            price: Number(s.cost) || base.wholesalePrice,
          });
        } else {
          const parsed = parseBatesvilleDescription(s.description, s.category);
          const cost = Number(s.cost) || 1200;
          const isUrn = parsed.isUrn || isUrnProduct({ category: s.category, name: parsed.name, description: s.description });
          productMap.set(compositeKey, {
            id: `prod-${prodCode}-${yr}`,
            code: prodCode,
            name: parsed.name,
            description: s.description || parsed.name,
            category: s.category || (isUrn ? 'Cremation Options - Full Size Urns' : 'Caskets & Containers - Metal'),
            material: parsed.material,
            catalogYear: yr,
            year: yr,
            interior: parsed.interior || undefined,
            exteriorFinish: parsed.finish || undefined,
            finish: parsed.finish || undefined,
            top: isUrn ? undefined : (parsed.material.includes('Steel') || parsed.material.includes('Pecan') ? 'Half Couch' : undefined),
            dimensions: isUrn ? '8.5" W x 8.5" D x 10.5" H' : '83.5" L x 28.5" W x 23.0" H',
            capacity: isUrn ? 200 : undefined,
            weight_capacity: isUrn ? 200 : undefined,
            features: isUrn ? [
              'Living Memorial® Tree Planting Program',
              'Artisan hand-finished keepsake urn',
              'Secure threaded lid closure'
            ] : [
              'Living Memorial® Tree Planting Program',
              'Factory hand-finished exterior',
              'Quality Batesville precision craft'
            ],
            wholesalePrice: cost,
            price: cost,
            imageUrl: getFallbackImage(s.category, prodCode),
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    // Ingest and prioritize remote 'products' table from Supabase (all 19 exact columns)
    const { data: remoteProducts } = await client.from('products').select('*');
    if (remoteProducts && remoteProducts.length > 0) {
      remoteProducts.forEach((p: any) => {
        const prodCode = String(p.product_code || p.code || p.product_id);
        const yr = String(p.year || '2025');
        const key = `${prodCode}-${yr}`;
        const cost = Number(p.price || p.cost || p.wholesale_price || 0);

        const features: string[] = [];
        if (p.lifesymbols) features.push('LifeSymbols® Interchangeable Corner Designs');
        if (p.lifestories) features.push('LifeStories® Keepsake Medallion System');
        if (p.lifeview) features.push('LifeView® Panel / Corner Feature');
        if (p.dual_disposition) features.push('Dual Disposition: Certified for Burial & Cremation');
        if (p.oversize) features.push(`Oversize Construction (${p.int_width || '28'}" Interior Width)`);
        if (p.top) features.push(`Cap Construction: ${p.top}`);
        features.push('Living Memorial® Tree Planting Program');

        const dimStr = (p.ext_length && p.ext_width)
          ? `${p.ext_length}" L x ${p.ext_width}" W${p.ext_height ? ` x ${p.ext_height}" H` : ''}`
          : '83.5" L x 28.5" W x 23.0" H';

        const interiorVal = p.interior ? String(p.interior).trim() : '';
        const finishVal = p.finish ? String(p.finish).trim() : '';
        const topVal = p.top ? String(p.top).trim() : '';
        const weightCap = p.weight_capacity !== undefined && p.weight_capacity !== null 
          ? Number(p.weight_capacity) 
          : (p.capacity !== undefined && p.capacity !== null ? Number(p.capacity) : undefined);
        const isDiscontinued = p.discountinued !== undefined && p.discountinued !== null
          ? p.discountinued
          : (p.discontinued !== undefined ? p.discontinued : undefined);

        productMap.set(key, {
          id: `prod-${p.product_id || prodCode}-${yr}`,
          productId: p.product_id ? Number(p.product_id) : undefined,
          product_id: p.product_id ? Number(p.product_id) : undefined,
          category: p.category || 'Caskets & Containers - Metal',
          material: p.material || p.subcategory || 'Standard Metal / Timber',
          subcategory: p.subcategory || undefined,
          productCode: p.product_code !== undefined ? p.product_code : prodCode,
          product_code: p.product_code !== undefined ? p.product_code : prodCode,
          code: prodCode,
          price: cost,
          wholesalePrice: cost,
          description: p.description || `Model ${prodCode}`,
          name: p.description || `Model ${prodCode}`,
          interior: interiorVal || undefined,
          order_qty: p.order_qty !== undefined && p.order_qty !== null ? Number(p.order_qty) : undefined,
          orderQty: p.order_qty !== undefined && p.order_qty !== null ? Number(p.order_qty) : undefined,
          accessories: p.accessories !== undefined && p.accessories !== null ? p.accessories : undefined,
          lifeview: p.lifeview !== undefined && p.lifeview !== null ? p.lifeview : undefined,
          dual_disposition: p.dual_disposition !== undefined && p.dual_disposition !== null ? p.dual_disposition : undefined,
          dualDisposition: Boolean(p.dual_disposition),
          top: topVal || undefined,
          finish: finishVal || undefined,
          exteriorFinish: finishVal || undefined,
          oversize: p.oversize !== undefined && p.oversize !== null ? p.oversize : undefined,
          extWidth: p.ext_width ? Number(p.ext_width) : undefined,
          extHeight: p.ext_height ? Number(p.ext_height) : undefined,
          extLength: p.ext_length ? Number(p.ext_length) : undefined,
          intWidth: p.int_width ? Number(p.int_width) : undefined,
          ext_width: p.ext_width ? Number(p.ext_width) : undefined,
          ext_height: p.ext_height ? Number(p.ext_height) : undefined,
          ext_length: p.ext_length ? Number(p.ext_length) : undefined,
          int_width: p.int_width ? Number(p.int_width) : undefined,
          weight_capacity: weightCap,
          weightCapacity: weightCap,
          capacity: weightCap,
          weightLbs: weightCap,
          discountinued: isDiscontinued,
          discontinued: isDiscontinued,
          lifestories: Boolean(p.lifestories),
          lifesymbols: Boolean(p.lifesymbols),
          year: yr,
          catalogYear: yr,
          dimensions: dimStr,
          features,
          imageUrl: p.image_url || getFallbackImage(p.category, prodCode),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }

    const mappedProducts: Product[] = Array.from(productMap.values());

    const FISCAL_MONTH_NUM: Record<string, number> = {
      'OCT': 1, 'NOV': 2, 'DEC': 3, 'JAN': 4, 'FEB': 5, 'MAR': 6,
      'APR': 7, 'MAY': 8, 'JUN': 9, 'JUL': 10, 'AUG': 11, 'SEP': 12
    };
    const CAL_MONTH_NUM: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    };

    // 4. Map Sales Records (Matching exact Supabase headers)
    const mappedSales: SaleRecord[] = allSalesRaw.map((s: any, idx: number) => {
      const yr = String(s.year || '');
      const mStr = String(s.month || '').toUpperCase().trim();
      const calMonth = CAL_MONTH_NUM[mStr] || 1;
      const fiscalMonth = FISCAL_MONTH_NUM[mStr] || 1;
      const day = s.day || 1;
      const qty = (s.qty !== undefined && s.qty !== null && !isNaN(Number(s.qty))) ? Number(s.qty) : 1;
      const cost = Number(s.cost) || 0; // "Invoice $$" in Supabase is the actual extended transaction dollar amount

      // Batesville Fiscal Year calculation: Oct 1st to Sep 30th
      let actualCalYear = 2024;
      if (yr.includes('-')) {
        const parts = yr.split('-');
        const baseYear = parseInt(parts[0], 10);
        actualCalYear = (fiscalMonth <= 3) ? baseYear : (baseYear + 1);
      } else {
        const parsedY = parseInt(yr, 10);
        if (!isNaN(parsedY) && parsedY >= 2000) {
          actualCalYear = (fiscalMonth <= 3) ? parsedY : (parsedY + 1);
        }
      }

      const saleDate = `${actualCalYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const acctNumberStr = (s['account_#'] !== undefined && s['account_#'] !== null) ? String(s['account_#']) : undefined;

      return {
        id: `sale-${s.sales_id || s.sale_id || idx}`,
        saleId: Number(s.sales_id || s.sale_id || idx),
        year: yr,
        month: mStr,
        day: s.day,
        program: s.program || 'N/A',
        accountName: s.account_name || 'N/A',
        accountNumber: acctNumberStr || s['account_#'],
        productCode: String(s.product_code || ''),
        category: s.category || 'N/A',
        subcategory: s.subcategory ? String(s.subcategory).trim() : '',
        description: s.description || 'N/A',
        quantity: qty,
        cost,
        customerId: `cust-${acctNumberStr || s['account_#'] || s.account_name}`,
        productId: `prod-${s.product_code}-${yr}`,
        orderNumber: `ORD-${yr}-${s.sale_id || idx}`,
        unitPrice: qty > 0 ? Number((cost / qty).toFixed(2)) : cost,
        totalAmount: cost,
        saleDate,
        fiscalMonth,
        calMonth,
        notes: `Program: ${s.program || 'N/A'} • Acct: ${s.account_name}`
      };
    });

    // 5. Ingest and match casket images from Supabase Storage 'caskets' bucket (Prioritizing Product Code)
    try {
      const { data: casketBucketFiles } = await client.storage.from('caskets').list('', { limit: 1000 });
      if (casketBucketFiles && casketBucketFiles.length > 0) {
        for (const file of casketBucketFiles) {
          if (file.name === '.emptyFolderPlaceholder') continue;
          const publicUrl = client.storage.from('caskets').getPublicUrl(file.name).data.publicUrl;
          
          const { matchedProducts, productCode, productName } = matchCasketFileToProducts(file.name, mappedProducts);

          // Update ALL matching products across every catalog year
          for (const prod of matchedProducts) {
            prod.imageUrl = publicUrl;
          }

          await db.images.put({
            id: `casket-img-${file.name}`,
            fileName: file.name,
            productCode: productCode,
            productName: productName,
            dataUrl: publicUrl,
            sizeBytes: file.metadata?.size,
            uploadedAt: file.created_at || new Date().toISOString()
          });
        }
      }
    } catch (imgErr) {
      console.warn('Caskets storage sync warning:', imgErr);
    }

    // 6. Ingest customer logos from Supabase Storage 'funeral home logo' bucket (Prioritizing Account #)
    try {
      const { data: logoFiles } = await client.storage.from('funeral home logo').list('', { limit: 1000 });
      if (logoFiles && logoFiles.length > 0) {
        for (const file of logoFiles) {
          if (file.name === '.emptyFolderPlaceholder') continue;
          const publicUrl = client.storage.from('funeral home logo').getPublicUrl(file.name).data.publicUrl;
          
          const matchedCusts = matchLogoFileToCustomers(file.name, mappedCustomers);
          for (const cust of matchedCusts) {
            cust.logoUrl = publicUrl;
          }
        }
      }
    } catch (logoErr) {
      console.warn('Logo storage sync warning:', logoErr);
    }

    // 7. Store in local IndexedDB
    await db.transaction('rw', [db.customers, db.products, db.sales, db.images], async () => {
      if (mappedCustomers.length > 0) {
        await db.customers.clear();
        await db.customers.bulkAdd(mappedCustomers);
      }
      if (mappedProducts.length > 0) {
        await db.products.clear();
        await db.products.bulkAdd(mappedProducts);
      }
      if (mappedSales.length > 0) {
        await db.sales.clear();
        await db.sales.bulkAdd(mappedSales);
      } else {
        const curCount = await db.sales.count();
        if (curCount === 0) {
          const { generateSeedSales } = await import('./seedData');
          await db.sales.bulkAdd(generateSeedSales());
        }
      }
    });

    // Invalidate sales memory cache to ensure fresh remote data is accessed
    invalidateSalesCache();

    // Notify all active views that sales data is ready
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('batesville_sales_updated', { 
        detail: { count: mappedSales.length, timestamp: Date.now() } 
      }));
    }

    // Check if any existing local images can be matched to newly synced products
    const localImages = await db.images.toArray();
    for (const img of localImages) {
      if (img.productCode) {
        const matches = await db.products.where('code').equals(img.productCode).toArray();
        for (const p of matches) {
          await db.products.update(p.id, { imageUrl: img.dataUrl });
        }
      }
    }

    // Save timestamp
    const config = getStoredSupabaseConfig();
    config.lastSyncedAt = new Date().toISOString();
    config.isConnected = true;
    saveStoredSupabaseConfig(config);

    return {
      success: true,
      message: `Successfully synchronized ${mappedCustomers.length} customers, ${mappedProducts.length} products across ${distinctYears.size} catalog years, and ${mappedSales.length} sales records from Supabase!`,
      counts: {
        customers: mappedCustomers.length,
        products: mappedProducts.length,
        sales: mappedSales.length,
        years: Array.from(distinctYears)
      }
    };
  } catch (err: any) {
    console.error('Supabase sync error:', err);
    return { success: false, message: err.message || 'Sync failed.' };
  }
}

// Upload casket image to Supabase Storage named directly by Product Code or clean filename
export async function uploadCasketImageToStorage(
  file: File, 
  customFileName?: string
): Promise<{ success: boolean; url?: string; message: string; savedName: string }> {
  try {
    const client = getSupabaseClient();
    
    // Maintain clean filename based on product code or clean original name
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.png';
    let cleanFileName = customFileName || file.name;
    if (!cleanFileName.toLowerCase().endsWith(ext.toLowerCase())) {
      cleanFileName += ext;
    }
    cleanFileName = cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const { data, error } = await client.storage
      .from('caskets')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      return { success: false, message: error.message, savedName: cleanFileName };
    }

    const { data: publicData } = client.storage
      .from('caskets')
      .getPublicUrl(cleanFileName);

    return {
      success: true,
      url: publicData.publicUrl,
      savedName: cleanFileName,
      message: `Successfully uploaded "${cleanFileName}" to Supabase Storage!`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to upload to Supabase storage.', savedName: file.name };
  }
}

/**
 * Uploads a Batesville Litho cut sheet (PDF or high-res image) to Supabase Storage.
 * Attempts bucket 'lithos' first. If 'lithos' bucket is not found, attempts bucket 'caskets' under 'lithos/'.
 */
export async function uploadLithoToStorage(
  file: File, 
  customFileName?: string
): Promise<{ success: boolean; url?: string; message: string; savedName: string; isRemote: boolean }> {
  try {
    const client = getSupabaseClient();
    
    // Determine extension
    let ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    if (!ext) {
      if (file.type === 'application/pdf') ext = '.pdf';
      else if (file.type.includes('png')) ext = '.png';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = '.jpg';
      else if (file.type.includes('webp')) ext = '.webp';
      else ext = '.pdf';
    }

    let cleanFileName = customFileName || file.name;
    if (!cleanFileName.toLowerCase().endsWith(ext.toLowerCase())) {
      cleanFileName += ext;
    }
    cleanFileName = cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const mimeType = file.type || (ext.toLowerCase() === '.pdf' ? 'application/pdf' : 'image/png');

    // 1. Try 'lithos' bucket
    let targetBucket = 'lithos';
    let targetPath = cleanFileName;
    let uploadRes = await client.storage
      .from('lithos')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType
      });

    // 2. If 'lithos' bucket does not exist, fall back to 'caskets' bucket under 'lithos/' prefix
    if (uploadRes.error && uploadRes.error.message.includes('not found')) {
      targetBucket = 'caskets';
      targetPath = `lithos/${cleanFileName}`;
      uploadRes = await client.storage
        .from('caskets')
        .upload(targetPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType
        });
    }

    if (uploadRes.error) {
      return { 
        success: false, 
        message: uploadRes.error.message, 
        savedName: cleanFileName,
        isRemote: false 
      };
    }

    const { data: publicData } = client.storage
      .from(targetBucket)
      .getPublicUrl(targetPath);

    return {
      success: true,
      url: publicData.publicUrl,
      savedName: cleanFileName,
      isRemote: true,
      message: `Successfully uploaded "${cleanFileName}" to Supabase Storage!`
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: err.message || 'Failed to upload Litho to Supabase storage.', 
      savedName: file.name,
      isRemote: false
    };
  }
}

/**
 * Downloads a Litho file directly from a Supabase public URL or data URL to the user's browser.
 */
export async function downloadLithoFile(fileUrl: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Deletes a litho file from Supabase storage
 */
export async function deleteLithoFromStorage(fileName: string): Promise<{ success: boolean; message?: string }> {
  try {
    const client = getSupabaseClient();
    // Try both lithos bucket and caskets/lithos
    await client.storage.from('lithos').remove([fileName]);
    await client.storage.from('caskets').remove([`lithos/${fileName}`, fileName]);
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

/**
 * Automatically discovers the public Litho URL for a Batesville product code
 * from the Supabase Storage 'lithos' bucket. Probes for .png, .jpg, .jpeg, .webp, and .pdf.
 */
export async function getLithoPublicUrlForProduct(productCode: string | number): Promise<string | null> {
  const code = String(productCode || '').trim();
  if (!code) return null;

  const extensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
  const baseUrl = 'https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/lithos/';

  // 1. Try exact code with extensions
  for (const ext of extensions) {
    const candidateUrl = `${baseUrl}${code}${ext}`;
    try {
      const res = await fetch(candidateUrl, { method: 'HEAD' });
      if (res.ok) return candidateUrl;
    } catch {
      // ignore network errors
    }
  }

  // 2. Try normalized code (no spaces, e.g. "20a880.png")
  const normCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normCode && normCode !== code.toLowerCase()) {
    for (const ext of extensions) {
      const candidateUrl = `${baseUrl}${normCode}${ext}`;
      try {
        const res = await fetch(candidateUrl, { method: 'HEAD' });
        if (res.ok) return candidateUrl;
      } catch {
        // ignore
      }
    }
  }

  return null;
}

/**
 * Converts a Litho image pulled from Supabase Storage into a Letter (8.5" x 11") PDF.
 * Automatically fits the image to standard letter format with high resolution.
 */
export async function generateLithoPdf(
  imageUrl: string,
  product: { code?: string | number; name?: string },
  orientation: 'auto' | 'landscape' | 'portrait' = 'auto'
): Promise<{ blob: Blob; blobUrl: string; doc: jsPDF }> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch litho image from Supabase (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const contentType = res.headers.get('content-type') || '';
  const isPng = contentType.includes('png') || imageUrl.toLowerCase().endsWith('.png');
  const mimePrefix = isPng ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
  const imgData = mimePrefix + base64;

  // Determine image dimensions
  let width = 1185;
  let height = 866;

  try {
    if (typeof window !== 'undefined' && typeof window.Image !== 'undefined') {
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || 1185, height: img.naturalHeight || 866 });
        img.onerror = () => resolve({ width: 1185, height: 866 });
        img.src = imgData;
      });
      width = dims.width;
      height = dims.height;
    }
  } catch {
    // fallback dimensions
  }

  // Choose orientation
  let chosenOrientation: 'landscape' | 'portrait' = 'landscape';
  if (orientation === 'portrait') {
    chosenOrientation = 'portrait';
  } else if (orientation === 'landscape') {
    chosenOrientation = 'landscape';
  } else {
    // auto: landscape if wider than tall
    chosenOrientation = width >= height ? 'landscape' : 'portrait';
  }

  const doc = new jsPDF({
    orientation: chosenOrientation,
    unit: 'in',
    format: 'letter'
  });

  const pageWidth = chosenOrientation === 'landscape' ? 11.0 : 8.5;
  const pageHeight = chosenOrientation === 'landscape' ? 8.5 : 11.0;
  const margin = 0.25; // 0.25 inch margin for maximum image presentation area
  const maxW = pageWidth - (margin * 2);
  const maxH = pageHeight - (margin * 2);

  const aspect = width / height;
  let renderW = maxW;
  let renderH = renderW / aspect;

  if (renderH > maxH) {
    renderH = maxH;
    renderW = renderH * aspect;
  }

  const posX = (pageWidth - renderW) / 2;
  const posY = (pageHeight - renderH) / 2;

  doc.addImage(imgData, isPng ? 'PNG' : 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  return { blob: pdfBlob, blobUrl, doc };
}

/**
 * Synchronously generates the standard public Supabase Storage URL for a product's Litho cut sheet.
 */
export function getLithoPublicUrl(productCode: string | number): string {
  const code = String(productCode || '').trim();
  return `https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/lithos/${code}.png`;
}

/**
 * Downloads a Litho image converted into an authentic 8.5" x 11" PDF file directly.
 */
export async function downloadLithoAsPdf(
  imageUrl: string,
  product: { code?: string | number; name?: string },
  orientation: 'auto' | 'landscape' | 'portrait' = 'auto'
): Promise<void> {
  const { doc } = await generateLithoPdf(imageUrl, product, orientation);
  const fileName = `${product.code || 'casket'}_litho.pdf`;
  doc.save(fileName);
}

/**
 * Prints a Litho cut sheet image directly from Supabase Storage in an isolated print window.
 * This guarantees the browser prints exactly 1 single sheet of paper (NEVER 198 pages).
 */
export function printLithoDirect(
  imageUrl: string,
  product: { code?: string | number; name?: string },
  orientation: 'auto' | 'landscape' | 'portrait' = 'auto'
): void {
  const isLandscape = orientation === 'portrait' ? false : true;
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  
  if (!printWindow) {
    // Fallback if popup is blocked: convert and download PDF
    downloadLithoAsPdf(imageUrl, product, orientation);
    return;
  }

  const title = `Batesville Litho Cut Sheet - SKU ${product.code || ''} ${product.name || ''}`;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${isLandscape ? '11in 8.5in landscape' : '8.5in 11in portrait'};
      margin: 0.15in;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: auto;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      img {
        max-width: 100% !important;
        max-height: 100% !important;
      }
    }
  </style>
</head>
<body>
  <img id="litho-img" src="${imageUrl}" alt="${title}" />
  <script>
    const img = document.getElementById('litho-img');
    function doPrint() {
      setTimeout(() => {
        window.focus();
        window.print();
        setTimeout(() => { try { window.close(); } catch(e){} }, 2000);
      }, 350);
    }
    if (img.complete) {
      doPrint();
    } else {
      img.onload = doPrint;
      img.onerror = () => {
        alert('Could not load litho cut sheet image from Supabase bucket.');
        window.close();
      };
    }
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Prints an HTML element (such as the 8.5x11 generated tearsheet) in an isolated print window.
 * Strictly guarantees exactly 1 single printed sheet (never prints the background 198 catalog rows).
 */
export function printHtmlElementDirect(elementId: string, title = 'Batesville Litho Cut Sheet'): void {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const printWindow = window.open('', '_blank', 'width=950,height=1200');
  if (!printWindow) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('\n');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${styles}
  <style>
    @page {
      size: 8.5in 11in portrait;
      margin: 0.35in;
    }
    html, body {
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }
    #printable-litho {
      width: 100% !important;
      max-width: 100% !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  </style>
</head>
<body class="bg-white">
  <div style="padding: 10px;">
    ${el.outerHTML}
  </div>
  <script>
    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(() => { try { window.close(); } catch(e){} }, 2000);
    }, 450);
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Legacy wrapper: calls printLithoDirect
 */
export async function printLithoPdf(
  imageUrl: string,
  product: { code?: string | number; name?: string },
  orientation: 'auto' | 'landscape' | 'portrait' = 'auto'
): Promise<void> {
  printLithoDirect(imageUrl, product, orientation);
}

/**
 * Scans the Supabase 'lithos' bucket for all catalog products and syncs their URLs to IndexedDB.
 */
export async function syncAllLithosFromSupabase(products: Product[]): Promise<{
  matchedCount: number;
  matchedUrls: Record<string, string>;
}> {
  const matchedUrls: Record<string, string> = {};
  let count = 0;

  const chunkSize = 20;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (p) => {
      const foundUrl = await getLithoPublicUrlForProduct(p.code);
      if (foundUrl) {
        matchedUrls[p.code] = foundUrl;
        count++;

        const allMatches = await db.products.where('code').equals(p.code).toArray();
        for (const prod of allMatches) {
          await db.products.update(prod.id, {
            lithoUrl: foundUrl,
            lithoFileName: `${p.code}.png`,
            lithoFileType: 'image'
          });
        }

        await saveLithoItem({
          id: `litho-sb-${p.code}`,
          fileName: `${p.code}.png`,
          productCode: p.code,
          productName: p.name,
          fileUrl: foundUrl,
          fileType: 'image',
          uploadedAt: new Date().toISOString(),
          isRemote: true
        });
      }
    }));
  }

  return { matchedCount: count, matchedUrls };
}

// Push local changes to Supabase
export async function pushToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  try {
    const localCustomers = await db.customers.toArray();
    const localProducts = await db.products.toArray();
    const localSales = await db.sales.toArray();

    if (localCustomers.length > 0) {
      await client.from('customers').upsert(localCustomers);
    }
    if (localProducts.length > 0) {
      await client.from('products').upsert(localProducts);
    }
    if (localSales.length > 0) {
      const salesPayload = localSales.map(s => ({
        sales_id: s.saleId,
        year: s.year,
        month: s.month,
        day: String(s.day),
        program: s.program || 'N/A',
        account_name: s.accountName,
        'account_#': Number(s.accountNumber) || s.accountNumber,
        product_code: Number(s.productCode) || s.productCode,
        category: s.category,
        subcategory: s.subcategory || '',
        description: s.description,
        qty: s.quantity,
        cost: s.cost
      }));
      await client.from('sales').upsert(salesPayload, { onConflict: 'sales_id' });
    }

    return { success: true, message: `Pushed records up to Supabase!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Push failed.' };
  }
}

/**
 * Fetch quotas from Supabase sales_quotas table.
 * Gracefully returns success: false if table does not yet exist.
 */
export async function fetchSupabaseQuotas(fiscalYear?: string): Promise<{
  success: boolean;
  data: any[];
  message?: string;
}> {
  try {
    const client = getSupabaseClient();
    let query = client.from('sales_quotas').select('*').order('fiscal_month', { ascending: true });
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }
    const { data, error } = await query;
    if (error) {
      return { success: false, data: [], message: error.message };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], message: err.message };
  }
}

/**
 * Upsert quotas into Supabase sales_quotas table.
 */
export async function saveSupabaseQuotas(quotas: any[]): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const client = getSupabaseClient();
    const payload = quotas.map(q => ({
      fiscal_year: q.fiscal_year,
      fiscal_month: q.fiscal_month,
      month_name: q.month_name,
      quota_amount: Number(q.quota_amount) || 0,
      working_days: Number(q.working_days) || 21,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from('sales_quotas').upsert(payload, {
      onConflict: 'fiscal_year,fiscal_month'
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: `Successfully saved ${quotas.length} quota records to Supabase!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save quotas to Supabase.' };
  }
}

/**
 * Fetch showroom room definitions and casket/urn locations for an account from Supabase
 */
export async function fetchCustomerShowroomFromSupabase(accountNumber: string | number, customerName?: string): Promise<{
  success: boolean;
  room: any | null;
  locations: any[];
  message?: string;
}> {
  try {
    const client = getSupabaseClient();
    const acctStr = String(accountNumber || '').trim();
    const nameStr = customerName ? customerName.toLowerCase().trim() : '';

    const isMatch = (item: any) => {
      const itemAcct = String(item['account_#'] || item.account_number || '').trim();
      if (acctStr && (itemAcct === acctStr || `cust-${itemAcct}` === acctStr || itemAcct === acctStr.replace('cust-', ''))) {
        return true;
      }
      if (nameStr) {
        const itemCustName = String(item.account_name || '').toLowerCase().trim();
        if (itemCustName && (itemCustName === nameStr || itemCustName.includes(nameStr) || nameStr.includes(itemCustName))) {
          return true;
        }
      }
      return false;
    };

    // 1. Fetch Room definition
    const { data: allRooms, error: roomError } = await client.from('customer_rooms').select('*');
    if (roomError) {
      console.warn('customer_rooms fetch warning:', roomError.message);
    }
    const matchedRoom = allRooms ? allRooms.find(isMatch) : null;

    // 2. Fetch Casket/Urn Locations
    const { data: allLocs, error: locError } = await client.from('customer_casket_locations').select('*');
    if (locError) {
      console.warn('customer_casket_locations fetch warning:', locError.message);
      return { success: false, room: matchedRoom, locations: [], message: locError.message };
    }
    const matchedLocs = (allLocs || []).filter(isMatch);

    // Sort by bay_number asc, level_number desc (Top level 2 first, then Bottom level 1), shelf_slot_position asc
    matchedLocs.sort((a: any, b: any) => {
      const bayDiff = (Number(a.bay_number) || 0) - (Number(b.bay_number) || 0);
      if (bayDiff !== 0) return bayDiff;
      const lvlDiff = (Number(b.level_number) || 1) - (Number(a.level_number) || 1);
      if (lvlDiff !== 0) return lvlDiff;
      return (Number(a.shelf_slot_position) || 1) - (Number(b.shelf_slot_position) || 1);
    });

    return {
      success: true,
      room: matchedRoom || null,
      locations: matchedLocs
    };
  } catch (err: any) {
    return { success: false, room: null, locations: [], message: err.message };
  }
}

/**
 * Fetch list of account numbers that have active showroom locations in Supabase
 */
export async function fetchAccountsWithShowroomLocations(): Promise<string[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('customer_casket_locations')
      .select('*');
    
    if (error || !data) return [];
    const accounts = Array.from(new Set(data.map((r: any) => String(r['account_#'] || r.account_number || '').trim()).filter(Boolean)));
    return accounts;
  } catch {
    return [];
  }
}

/**
 * Save / Upsert showroom room definition and casket locations to Supabase
 */
export async function saveCustomerShowroomToSupabase(
  accountNumber: string | number,
  customerName: string,
  roomData: {
    room_name?: string;
    room_shape?: string;
    length_ft?: number;
    width_ft?: number;
    ceiling_height_ft?: number;
    sq_footage?: number;
    door_wall?: string;
    door_pos_ft?: number;
    door_width_ft?: number;
    max_casket_bays?: number;
    notes?: string;
  },
  slots: FloorSlot[]
): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabaseClient();
    const acctNum = Number(accountNumber) || accountNumber;

    // 1. Upsert customer_rooms
    const roomLength = Number(roomData.length_ft) || 28;
    const roomWidth = Number(roomData.width_ft) || 19.5;
    const sqFt = roomData.sq_footage || Math.round(roomLength * roomWidth);

    const roomPayload = {
      'account_#': acctNum,
      account_name: customerName || 'Showroom',
      room_name: roomData.room_name || 'Main Selection Room',
      room_shape: roomData.room_shape || 'L-Shaped',
      length_ft: roomLength,
      width_ft: roomWidth,
      ceiling_height_ft: Number(roomData.ceiling_height_ft) || 11.0,
      sq_footage: sqFt,
      door_wall: roomData.door_wall || 'South',
      door_pos_ft: Number(roomData.door_pos_ft) || 5.0,
      door_width_ft: Number(roomData.door_width_ft) || 4.0,
      max_casket_bays: roomData.max_casket_bays || slots.filter(s => s.type === 'casket').length || 10,
      notes: roomData.notes || 'Updated via Batesville Interactive Floor Plan'
    };

    await client.from('customer_rooms').upsert(roomPayload, { onConflict: 'account_#,room_name' });

    // 2. Prepare customer_casket_locations
    const locPayload = slots
      .filter(s => s.productCode || (s.productName && s.productName !== 'Unassigned Bay' && s.productName !== 'Unassigned'))
      .map(s => {
        const wall = s.wallZone || 'North Wall';
        const defaultDeg = wall.includes('East') ? 270 : wall.includes('West') ? 90 : 180;
        const orientDeg = s.orientation_deg !== undefined ? s.orientation_deg : defaultDeg;

        return {
          'account_#': acctNum,
          room_name: roomData.room_name || 'Main Selection Room',
          bay_number: s.slotNumber,
          bay_label: s.label,
          product_code: s.productCode || '',
          product_name: s.productName || '',
          category: s.category || (s.type === 'urn' ? 'Urn' : 'Burial'),
          display_type: s.type === 'urn' ? 'Urn Wall Unit' : 'Full Casket',
          wall_zone: wall,
          pos_x_ft: s.posX !== undefined ? s.posX : (s.slotNumber * 2.5),
          pos_y_ft: s.posY !== undefined ? s.posY : 10.0,
          orientation_deg: orientDeg,
          tier_level: s.tierLevel || (s.isDoubleRack ? (s.levelNumber === 2 ? 'Double Rack - Top' : 'Double Rack - Bottom') : 'Floor'),
          is_double_rack: Boolean(s.isDoubleRack),
          rack_type: s.rackType || (s.isDoubleRack ? 'Double Rack' : (s.type === 'urn' ? 'Urn Shelf' : 'Single Rack')),
          level_number: s.levelNumber || 1,
          shelf_slot_position: s.shelfSlotPosition || 1,
          status: 'Active',
          notes: s.notes || ''
        };
      });

    if (locPayload.length > 0) {
      await client.from('customer_casket_locations').delete().eq('account_#', acctNum);
      const { error: insertError } = await client.from('customer_casket_locations').insert(locPayload);
      if (insertError) {
        return { success: false, message: insertError.message };
      }
    }

    return {
      success: true,
      message: `Successfully saved ${locPayload.length} showroom placements to Supabase for ${customerName}!`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save showroom to Supabase.' };
  }
}

/**
 * Helper to determine if a product is discontinued
 */
export function isProductDiscontinued(p: any): boolean {
  if (!p) return false;
  if (p.isActive === false) return true;
  const d = p.discontinued ?? p.discountinued;
  if (d === true) return true;
  if (typeof d === 'string') {
    const lower = d.trim().toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'discontinued';
  }
  return false;
}

/**
 * Checks whether a product or item is a casket
 */
export function isCasketProduct(product?: { category?: string; name?: string; description?: string } | null): boolean {
  if (!product) return false;
  const cat = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();

  // Exclude all non-caskets
  if (
    cat.includes('urn') || 
    cat.includes('keepsake') || 
    cat.includes('jewelry') || 
    cat.includes('personalization') ||
    cat.includes('engraving') ||
    cat.includes('applique') ||
    cat.includes('medallion') ||
    cat.includes('corner') ||
    cat.includes('panel') ||
    cat.includes('frame') ||
    cat.includes('casket supplies') || 
    cat.includes('alternative container interior') ||
    cat.includes('supplies') ||
    cat.includes('vault') ||
    cat.includes('outer burial') ||
    name.includes('urn') ||
    name.includes('medallion') ||
    name.includes('keepsake') ||
    name.includes('jewelry') ||
    name.includes('appliques')
  ) {
    return false;
  }

  // True caskets: Metal, Wood, NewPointe, Cloth, AWC, or name/category explicitly containing casket
  return (
    cat.includes('metal') ||
    cat.includes('wood') ||
    cat.includes('newpointe') ||
    cat.includes('cloth') ||
    cat.includes('awc') ||
    cat.includes('casket') ||
    name.includes('casket')
  );
}
