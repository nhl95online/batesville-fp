import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, invalidateSalesCache } from './db';
import { Customer, Product, SaleRecord, SupabaseConfig, CasketImageItem } from '../types';
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Supabase config from localStorage', e);
  }
  return DEFAULT_CONFIG;
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
  return (
    cat.includes('urn') ||
    cat.includes('keepsake') ||
    (cat.includes('cremation') && (cat.includes('full size') || name.includes('urn') || desc.includes('urn'))) ||
    name.includes('urn') ||
    name.includes('keepsake') ||
    desc.includes('urn') ||
    desc.includes('keepsake')
  );
}

// Helper: parse raw product description into material, interior, and clean name
function parseBatesvilleDescription(desc: string, category?: string) {
  if (!desc) return { name: 'Casket', material: 'Steel', interior: 'Crepe', finish: 'Standard Finish', isUrn: false };

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
      finish: 'Hand-Polished Satin Urn Finish',
      isUrn: true
    };
  }

  let parts = desc.split(',').map(s => s.trim());
  let interior = parts[1] || 'Crepe Interior';
  let finish = 'Factory Finish';
  let material = 'High-Grade Steel / Timber';

  // Determine material from description
  if (lower.includes('pecan')) { material = 'Solid Northern Pecan'; finish = 'Warm Pecan Stain'; }
  else if (lower.includes('maple')) { material = 'Solid Select Maple'; finish = 'Polished Maple Finish'; }
  else if (lower.includes('cherry')) { material = 'Solid Appalachian Cherry'; finish = 'High-Lustre Georgetown Finish'; }
  else if (lower.includes('oak')) { material = 'Solid American Oak'; finish = 'Natural Satin Oak Finish'; }
  else if (lower.includes('bronze')) { material = 'Solid 48 oz. Bronze'; finish = 'High-Lustre Polished Bronze'; }
  else if (lower.includes('steel') || lower.includes('18g') || lower.includes('20g')) { material = '18 Gauge Protective Steel'; finish = 'Brushed Metallic with Protective Seal'; }
  else if (lower.includes('cloth')) { material = 'Cloth Covered Fiberboard'; finish = 'Textured Cloth Weave'; }
  else if (lower.includes('mdf') || lower.includes('pine')) { material = 'Pine & Composite Cremation'; finish = 'Natural Pine Grain'; }

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
      distinctYears.add(String(p.catalogYear || '2025'));
    });

    // Also enrich from sales records for historical catalog years
    allSalesRaw.forEach((s: any) => {
      const prodCode = String(s.product_code);
      const yr = String(s.year || '2025');
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
            interior: parsed.interior,
            exteriorFinish: parsed.finish,
            finish: parsed.finish,
            top: isUrn ? undefined : 'Casket Cap (Half Couch)',
            dimensions: isUrn ? '8.5" W x 8.5" D x 10.5" H' : '83.5" L x 28.5" W x 23.0" H',
            capacity: isUrn ? 200 : undefined,
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

    // Ingest and prioritize remote 'products' table from Supabase (all 21 exact columns)
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

        productMap.set(key, {
          id: `prod-${p.product_id || prodCode}-${yr}`,
          productId: p.product_id ? Number(p.product_id) : undefined,
          category: p.category || 'Caskets & Containers - Metal',
          material: p.material || p.subcategory || 'Standard Metal / Timber',
          subcategory: p.subcategory || undefined,
          productCode: p.product_code !== undefined ? p.product_code : prodCode,
          code: prodCode,
          price: cost,
          wholesalePrice: cost,
          description: p.description || `Model ${prodCode}`,
          name: p.description || `Model ${prodCode}`,
          interior: p.interior || 'Rosetan Crepe',
          lifestories: Boolean(p.lifestories),
          lifeview: Boolean(p.lifeview),
          lifesymbols: Boolean(p.lifesymbols),
          dualDisposition: Boolean(p.dual_disposition),
          dual_disposition: Boolean(p.dual_disposition),
          top: p.top || undefined,
          finish: p.finish || undefined,
          exteriorFinish: p.finish || 'Polished Finish',
          oversize: Boolean(p.oversize),
          extWidth: p.ext_width ? Number(p.ext_width) : undefined,
          extHeight: p.ext_height ? Number(p.ext_height) : undefined,
          extLength: p.ext_length ? Number(p.ext_length) : undefined,
          intWidth: p.int_width ? Number(p.int_width) : undefined,
          ext_width: p.ext_width ? Number(p.ext_width) : undefined,
          ext_height: p.ext_height ? Number(p.ext_height) : undefined,
          ext_length: p.ext_length ? Number(p.ext_length) : undefined,
          int_width: p.int_width ? Number(p.int_width) : undefined,
          capacity: p.capacity ? Number(p.capacity) : undefined,
          weightLbs: p.capacity ? Number(p.capacity) : undefined,
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
      let actualCalYear = 2017;
      if (yr.includes('-')) {
        const parts = yr.split('-');
        const baseYear = parseInt(parts[0], 10);
        actualCalYear = (fiscalMonth <= 3) ? baseYear : (baseYear + 1);
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
      await db.customers.clear();
      await db.products.clear();
      await db.sales.clear();

      await db.customers.bulkAdd(mappedCustomers);
      await db.products.bulkAdd(mappedProducts);
      await db.sales.bulkAdd(mappedSales);
    });

    // Invalidate sales memory cache to ensure fresh remote data is accessed
    invalidateSalesCache();

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
      await client.from('sales').upsert(localSales);
    }

    return { success: true, message: `Pushed records up to Supabase!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Push failed.' };
  }
}
