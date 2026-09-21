import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import { Customer, Product, SaleRecord, SupabaseConfig, CasketImageItem } from '../types';

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

// Helper: parse raw product description into material, interior, and clean name
function parseBatesvilleDescription(desc: string) {
  if (!desc) return { name: 'Casket', material: 'Steel', interior: 'Crepe', finish: 'Standard Finish' };

  let parts = desc.split(',').map(s => s.trim());
  let mainTitle = parts[0] || desc;
  let interior = parts[1] || 'Crepe Interior';
  let finish = 'Factory Finish';
  let material = 'High-Grade Steel / Timber';

  // Determine material from description
  const lower = desc.toLowerCase();
  if (lower.includes('pecan')) { material = 'Solid Northern Pecan'; finish = 'Warm Pecan Stain'; }
  else if (lower.includes('maple')) { material = 'Solid Select Maple'; finish = 'Polished Maple Finish'; }
  else if (lower.includes('cherry')) { material = 'Solid Appalachian Cherry'; finish = 'High-Lustre Georgetown Finish'; }
  else if (lower.includes('oak')) { material = 'Solid American Oak'; finish = 'Natural Satin Oak Finish'; }
  else if (lower.includes('bronze')) { material = 'Solid 48 oz. Bronze'; finish = 'High-Lustre Polished Bronze'; }
  else if (lower.includes('steel') || lower.includes('18g') || lower.includes('20g')) { material = '18 Gauge Protective Steel'; finish = 'Brushed Metallic with Protective Seal'; }
  else if (lower.includes('cloth')) { material = 'Cloth Covered Fiberboard'; finish = 'Textured Cloth Weave'; }
  else if (lower.includes('urn')) { material = 'Cast Metal & Fine Hardwood'; finish = 'Hand-Engraved Satin Urn'; }
  else if (lower.includes('mdf') || lower.includes('pine')) { material = 'Pine & Composite Cremation'; finish = 'Natural Pine Grain'; }

  // Clean name from codes like "20A 880 HD Woodbridge Pecan" -> "Woodbridge Pecan"
  let cleanName = mainTitle.replace(/^[0-9A-Z]{2,4}\s+[0-9A-Z]{2,4}\s+(HD|CH|D|AH|UHD|H)?\s*/i, '').trim();
  if (!cleanName || cleanName.length < 3) cleanName = mainTitle;

  return { name: cleanName, material, interior, finish };
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
      // determine tier
      let tier = 'Standard' as any;
      if (c.burial_discount >= 45 || c.program === 'ARB') tier = 'Platinum';
      else if (c.burial_discount >= 35) tier = 'Gold';
      else if (c.burial_discount > 0) tier = 'Silver';

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
        tier,
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

    // 3. Extract and build Product Catalog organized by Year & Product Code
    const productMap = new Map<string, Product>();
    const distinctYears = new Set<string>();

    allSalesRaw.forEach((s: any) => {
      const prodCode = String(s.product_code);
      const yr = String(s.year || '2025');
      distinctYears.add(yr);

      const compositeKey = `${prodCode}-${yr}`;
      if (!productMap.has(compositeKey)) {
        const parsed = parseBatesvilleDescription(s.description);
        const cost = Number(s.cost) || 1200;
        const msrp = Math.round(cost * 2.2);

        productMap.set(compositeKey, {
          id: `prod-${prodCode}-${yr}`,
          code: prodCode,
          name: parsed.name,
          category: s.category || 'Burial Solutions - Wood',
          catalogYear: yr,
          material: parsed.material,
          interior: parsed.interior,
          exteriorFinish: parsed.finish,
          dimensions: '83.0" L x 28.5" W x 23.0" H',
          features: [
            'Batesville precision construction',
            'Living Memorial Program eligible',
            'Factory hand-finished exterior',
            'Customizable personalized corners'
          ],
          wholesalePrice: cost,
          msrp,
          imageUrl: getFallbackImage(s.category, prodCode),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    // Also check if remote 'products' table has rows
    const { data: remoteProducts } = await client.from('products').select('*');
    if (remoteProducts && remoteProducts.length > 0) {
      remoteProducts.forEach((p: any) => {
        const prodCode = String(p.product_code || p.code || p.product_id);
        const yr = String(p.year || p.catalog_year || '2025');
        const key = `${prodCode}-${yr}`;
        const cost = Number(p.price || p.cost || p.wholesale_price || 1200);

        productMap.set(key, {
          id: `prod-${prodCode}-${yr}`,
          code: prodCode,
          name: p.description || p.name || `Model ${prodCode}`,
          category: p.category || 'Burial Solutions - Wood',
          catalogYear: yr,
          material: p.material || 'Carbon Steel',
          interior: p.interior || 'Rosetan Crepe',
          exteriorFinish: p.finish || 'Polished Finish',
          dimensions: '83.0" L x 28.5" W x 23.0" H',
          features: [
            'Batesville Living Memorial registered',
            'Gasketed continuous seal protection',
            'Memory Safe personal drawer'
          ],
          wholesalePrice: cost,
          msrp: Math.round(cost * 2.2),
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
      const qty = Number(s.qty) || 1;
      const cost = Number(s.cost) || 0;

      // Batesville Fiscal Year calculation: Oct 1st to Sep 30th
      let actualCalYear = 2017;
      if (yr.includes('-')) {
        const parts = yr.split('-');
        const baseYear = parseInt(parts[0], 10);
        actualCalYear = (fiscalMonth <= 3) ? baseYear : (baseYear + 1);
      }

      const saleDate = `${actualCalYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      return {
        id: `sale-${s.sale_id || idx}`,
        saleId: Number(s.sale_id || idx),
        year: yr,
        month: mStr,
        day: s.day,
        program: s.program || 'N/A',
        accountName: s.account_name || 'N/A',
        accountNumber: s['account_#'],
        productCode: String(s.product_code || ''),
        category: s.category || 'N/A',
        description: s.description || 'N/A',
        quantity: qty,
        cost,
        customerId: `cust-${s['account_#'] || s.account_name}`,
        productId: `prod-${s.product_code}-${yr}`,
        orderNumber: `ORD-${yr}-${s.sale_id || idx}`,
        unitPrice: cost,
        totalAmount: cost * qty,
        saleDate,
        fiscalMonth,
        calMonth,
        notes: `Program: ${s.program || 'N/A'} • Acct: ${s.account_name}`
      };
    });

    // 5. Ingest and match casket images from Supabase Storage 'caskets' bucket
    try {
      const { data: casketBucketFiles } = await client.storage.from('caskets').list('', { limit: 1000 });
      if (casketBucketFiles && casketBucketFiles.length > 0) {
        for (const file of casketBucketFiles) {
          if (file.name === '.emptyFolderPlaceholder') continue;
          const publicUrl = client.storage.from('caskets').getPublicUrl(file.name).data.publicUrl;
          
          const cleanName = file.name.toLowerCase().replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          const words = cleanName.split(' ').filter(w => w.length > 2);

          let matchedProductCode: string | undefined = undefined;
          let matchedProductName: string | undefined = undefined;

          for (const prod of mappedProducts) {
            const desc = (prod.name + ' ' + prod.material + ' ' + prod.exteriorFinish).toLowerCase();
            const code = prod.code.toLowerCase();

            if (code === cleanName || words.every(w => desc.includes(w) || code.includes(w))) {
              prod.imageUrl = publicUrl;
              matchedProductCode = prod.code;
              matchedProductName = prod.name;
              break;
            }
          }

          await db.images.put({
            id: `casket-img-${file.name}`,
            fileName: file.name,
            productCode: matchedProductCode,
            productName: matchedProductName,
            dataUrl: publicUrl,
            sizeBytes: file.metadata?.size,
            uploadedAt: file.created_at || new Date().toISOString()
          });
        }
      }
    } catch (imgErr) {
      console.warn('Caskets storage sync warning:', imgErr);
    }

    // 6. Ingest customer logos from Supabase Storage 'funeral home logo' bucket
    try {
      const { data: logoFiles } = await client.storage.from('funeral home logo').list('', { limit: 1000 });
      if (logoFiles && logoFiles.length > 0) {
        for (const file of logoFiles) {
          if (file.name === '.emptyFolderPlaceholder') continue;
          const publicUrl = client.storage.from('funeral home logo').getPublicUrl(file.name).data.publicUrl;
          const clean = file.name.toLowerCase().replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

          for (const cust of mappedCustomers) {
            if (String(cust.accountNumber) === clean || cust.name.toLowerCase().includes(clean)) {
              cust.logoUrl = publicUrl;
              break;
            }
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

// Upload casket image to Supabase Storage if bucket exists
export async function uploadCasketImageToStorage(file: File): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const client = getSupabaseClient();
    const cleanFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { data, error } = await client.storage
      .from('caskets')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      return { success: false, message: error.message };
    }

    const { data: publicData } = client.storage
      .from('caskets')
      .getPublicUrl(cleanFileName);

    return {
      success: true,
      url: publicData.publicUrl,
      message: 'Successfully uploaded casket image to Supabase Storage!'
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to upload to Supabase storage.' };
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
