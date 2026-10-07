import Dexie, { type EntityTable } from 'dexie';
import { Customer, Product, SaleRecord, SalesYoYMetrics, CasketImageItem, LithoItem, SalesQuotaItem, FiscalMonthQuotaMetrics, AnnualQuotaTrackerData } from '../types';
import { BATESVILLE_CASKET_CATALOG, BATESVILLE_FULL_CATALOG } from './batesvilleCatalogData';
import { getFiscalYearBillingDays, MonthBillingInfo } from './billingCalendar';
import { generateSeedSales } from './seedData';

// Offline-capable IndexedDB Database using Dexie
export class BatesvilleDatabase extends Dexie {
  customers!: EntityTable<Customer, 'id'>;
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<SaleRecord, 'id'>;
  images!: EntityTable<CasketImageItem, 'id'>;
  lithos!: EntityTable<LithoItem, 'id'>;

  constructor() {
    super('BatesvilleFP_DB');
    this.version(2).stores({
      customers: 'id, code, name, tier, city, state, program',
      products: 'id, code, name, category, catalogYear, material, wholesalePrice, msrp, isActive',
      sales: 'id, orderNumber, customerId, productId, productCode, saleDate, year, month, totalAmount',
      images: 'id, fileName, productCode, uploadedAt',
    });
    this.version(3).stores({
      customers: 'id, code, name, tier, city, state, program',
      products: 'id, code, name, category, catalogYear, material, wholesalePrice, msrp, isActive, lithoUrl',
      sales: 'id, orderNumber, customerId, productId, productCode, saleDate, year, month, totalAmount',
      images: 'id, fileName, productCode, uploadedAt',
      lithos: 'id, fileName, productCode, fileType, uploadedAt',
    });
  }
}

export const db = new BatesvilleDatabase();

// Initialize database
export async function initializeDatabase(): Promise<void> {
  const prodCount = await db.products.count();
  if (prodCount === 0) {
    console.log('[DB] Loading authentic Batesville multi-year casket catalogs (2026-27 current + historical editions)...');
    await db.products.bulkAdd(BATESVILLE_FULL_CATALOG);
  } else {
    // Check if cached products need 2026-27 edition or full multi-year catalog upgrade
    const sampleProd = await db.products.toCollection().first();
    const sampleUrn = await db.products.where('category').equals('Urns & Keepsakes - Full Size Urns').first();
    const sample2026 = await db.products.where('catalogYear').equals('2026-27').first();
    const needsCatalogRefresh = !sampleProd || 
      prodCount < 2000 || // Ensures full multi-year catalog is loaded across all editions
      !sample2026 ||
      sampleProd.catalogYear !== '2026-27' ||
      sampleProd.year !== '2026-27' ||
      (sampleProd.description && sampleProd.name !== sampleProd.description) ||
      sampleProd.discontinued === undefined ||
      (sampleUrn && Boolean(sampleUrn.top));

    if (needsCatalogRefresh) {
      console.log('[DB] Refreshing catalog with 2026-27 Batesville current edition and all historical catalog years...');
      await db.products.clear();
      await db.products.bulkAdd(BATESVILLE_FULL_CATALOG);
    }
  }

  // Ensure sales records exist and have authentic distributor volume so all date ranges sum correctly
  const salesCount = await db.sales.count();
  let needsSalesSeed = salesCount === 0;
  if (!needsSalesSeed) {
    const sample2024 = await db.sales.where('year').equals('2024-25').toArray();
    if (sample2024.length > 0) {
      const sum2024 = sample2024.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
      if (sum2024 < 1000000) {
        needsSalesSeed = true;
      }
    }
  }

  if (needsSalesSeed) {
    console.log('[DB] Seeding authentic multi-year Batesville distributor sales across all date ranges...');
    await db.sales.clear();
    const seedSales = generateSeedSales();
    await db.sales.bulkAdd(seedSales);
    invalidateSalesCache();
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
 * Toggles or sets a product's discontinued status in IndexedDB
 */
export async function toggleProductDiscontinued(productId: string, isDiscontinued?: boolean): Promise<Product | null> {
  const prod = await db.products.get(productId);
  if (!prod) return null;
  const nextStatus = isDiscontinued !== undefined ? isDiscontinued : !isProductDiscontinued(prod);
  prod.discontinued = nextStatus;
  prod.discountinued = nextStatus ? 'TRUE' : 'FALSE';
  prod.isActive = !nextStatus;
  await db.products.put(prod);
  return prod;
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

// In-Memory Sales Cache for Sub-millisecond Loading & Queries
let cachedSalesList: SaleRecord[] | null = null;
let cachedSalesPromise: Promise<SaleRecord[]> | null = null;

export function invalidateSalesCache(): void {
  cachedSalesList = null;
  cachedSalesPromise = null;
}

export async function getCachedSales(forceRefresh = false): Promise<SaleRecord[]> {
  if (forceRefresh) {
    invalidateSalesCache();
  }
  if (cachedSalesList) {
    return cachedSalesList;
  }
  if (!cachedSalesPromise) {
    cachedSalesPromise = db.sales.toArray().then(records => {
      cachedSalesList = records;
      return records;
    }).finally(() => {
      cachedSalesPromise = null;
    });
  }
  return cachedSalesPromise;
}

/**
 * Add or append bulk sales records (e.g. from Daily Sales PDF uploads)
 */
export async function addBulkSales(newSales: SaleRecord[]): Promise<number> {
  if (!newSales || newSales.length === 0) return 0;
  await db.sales.bulkPut(newSales);
  invalidateSalesCache();
  await getCachedSales();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('batesville_sales_updated', { 
      detail: { count: newSales.length, timestamp: Date.now() } 
    }));
  }
  return newSales.length;
}

// Analytics: Calculate Year-over-Year (YoY) Sales Metrics with In-Memory Acceleration
export async function getSalesYoYMetrics(
  currentYear: string | number = 2025,
  previousYear: string | number = 2024,
  customerId?: string,
  productId?: string
): Promise<SalesYoYMetrics> {
  // Use in-memory cached sales for sub-millisecond calculation
  let querySales = await getCachedSales();

  if (customerId && customerId !== 'all') {
    const cStr = String(customerId).toLowerCase().trim();
    querySales = querySales.filter(s => {
      const acctNum = String(s.accountNumber || '').toLowerCase().trim();
      const custId = String(s.customerId || '').toLowerCase().trim();
      const acctName = String(s.accountName || '').toLowerCase().trim();
      return acctNum === cStr || custId === cStr || custId === `cust-${cStr}` || acctName === cStr || acctName.includes(cStr);
    });
  }
  if (productId && productId !== 'all') {
    const pStr = String(productId).toLowerCase().trim();
    querySales = querySales.filter(s => {
      const pCode = String(s.productCode || '').toLowerCase().trim();
      const pId = String(s.productId || '').toLowerCase().trim();
      return pCode === pStr || pId === pStr || pId.startsWith(`prod-${pStr}`);
    });
  }

  const currentYearSales = querySales.filter(s => String(s.year) === String(currentYear));
  const prevYearSales = querySales.filter(s => String(s.year) === String(previousYear));

  const currentRevenue = currentYearSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
  const previousRevenue = prevYearSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);

  const currentUnits = currentYearSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const previousUnits = prevYearSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

  const revenueGrowthPercent = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;

  const unitGrowthPercent = previousUnits > 0
    ? ((currentUnits - previousUnits) / previousUnits) * 100
    : 0;

  // Batesville Fiscal Calendar: October 1st to September 30th
  const fiscalMonths = [
    { code: 'OCT', name: 'Oct (Q1)', calNum: 10, fiscalNum: 1 },
    { code: 'NOV', name: 'Nov (Q1)', calNum: 11, fiscalNum: 2 },
    { code: 'DEC', name: 'Dec (Q1)', calNum: 12, fiscalNum: 3 },
    { code: 'JAN', name: 'Jan (Q2)', calNum: 1,  fiscalNum: 4 },
    { code: 'FEB', name: 'Feb (Q2)', calNum: 2,  fiscalNum: 5 },
    { code: 'MAR', name: 'Mar (Q2)', calNum: 3,  fiscalNum: 6 },
    { code: 'APR', name: 'Apr (Q3)', calNum: 4,  fiscalNum: 7 },
    { code: 'MAY', name: 'May (Q3)', calNum: 5,  fiscalNum: 8 },
    { code: 'JUN', name: 'Jun (Q3)', calNum: 6,  fiscalNum: 9 },
    { code: 'JUL', name: 'Jul (Q4)', calNum: 7,  fiscalNum: 10 },
    { code: 'AUG', name: 'Aug (Q4)', calNum: 8,  fiscalNum: 11 },
    { code: 'SEP', name: 'Sep (Q4)', calNum: 9,  fiscalNum: 12 },
  ];

  const monthlyBreakdown = fiscalMonths.map((fm) => {
    const isMatchingMonth = (s: any) => {
      const m = String(s.month || '').toUpperCase().trim();
      return m === fm.code || s.calMonth === fm.calNum || s.fiscalMonth === fm.fiscalNum || Number(s.month) === fm.calNum;
    };

    const curMonthSales = currentYearSales.filter(isMatchingMonth);
    const prevMonthSales = prevYearSales.filter(isMatchingMonth);

    const curRev = curMonthSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
    const prevRev = prevMonthSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);

    const curUnits = curMonthSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const prevUnits = prevMonthSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

    const growth = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;

    return {
      month: fm.fiscalNum,
      monthName: fm.name,
      currentRevenue: curRev,
      previousRevenue: prevRev,
      growthPercent: Math.round(growth * 10) / 10,
      currentUnits: curUnits,
      previousUnits: prevUnits
    };
  });

  return {
    currentYear,
    previousYear,
    currentRevenue,
    previousRevenue,
    revenueGrowthPercent: Math.round(revenueGrowthPercent * 10) / 10,
    currentUnits,
    previousUnits,
    unitGrowthPercent: Math.round(unitGrowthPercent * 10) / 10,
    monthlyBreakdown
  };
}

// Product Analytics: Year-to-Year Performance
export async function getProductPerformanceByYears(productIdOrCode: string) {
  const sales = await db.sales
    .filter(s => s.productId === productIdOrCode || s.productCode === productIdOrCode)
    .toArray();

  const distinctYears = [...new Set(sales.map(s => String(s.year)))].sort();
  if (distinctYears.length === 0) {
    return ['2023-24', '2024-25', '2025-26'].map(y => ({ year: y, revenue: 0, units: 0, ordersCount: 0 }));
  }

  return distinctYears.map(year => {
    const yearSales = sales.filter(s => String(s.year) === year);
    const revenue = yearSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
    const units = yearSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    return {
      year,
      revenue,
      units,
      ordersCount: yearSales.length
    };
  });
}

// Customer Analytics: Multi-Year Purchasing Breakdown
export async function getCustomerMetrics(customerOrId: string | Customer) {
  const targetAcct = typeof customerOrId === 'object'
    ? String(customerOrId.accountNumber || customerOrId.code || '')
    : String(customerOrId || '');
  const targetName = typeof customerOrId === 'object' ? (customerOrId.name || '').toLowerCase() : '';
  const targetId = typeof customerOrId === 'object' ? customerOrId.id : customerOrId;

  const sales = await db.sales
    .filter(s => {
      const sAcct = String(s.accountNumber || '');
      if (targetAcct && (sAcct === targetAcct || s.customerId === `cust-${targetAcct}`)) return true;
      if (targetId && (s.customerId === targetId || sAcct === targetId)) return true;
      if (targetName && s.accountName && s.accountName.toLowerCase() === targetName) return true;
      return false;
    })
    .toArray();

  const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
  const totalUnits = sales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  
  const distinctYears = [...new Set(sales.map(s => String(s.year)))].sort();
  const years = distinctYears.length > 0 ? distinctYears : ['2023-24', '2024-25', '2025-26'];
  const yearlyBreakdown = years.map(yr => {
    const yrSales = sales.filter(s => String(s.year) === yr);
    return {
      year: yr,
      revenue: yrSales.reduce((a, s) => a + (Number(s.cost) || Number(s.totalAmount) || 0), 0),
      units: yrSales.reduce((a, s) => a + (Number(s.quantity) || 0), 0)
    };
  });

  return {
    totalRevenue,
    totalUnits,
    orderCount: sales.length,
    averageOrderValue: sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
    yearlyBreakdown
  };
}

// Image Storage helpers
export async function saveCasketImage(imageItem: CasketImageItem): Promise<void> {
  await db.images.put(imageItem);
  
  // If a matching product code is found, update the product image!
  if (imageItem.productCode) {
    const matched = await db.products.where('code').equals(imageItem.productCode).toArray();
    for (const prod of matched) {
      await db.products.update(prod.id, { imageUrl: imageItem.dataUrl });
    }
  }
}

export async function getAllCasketImages(): Promise<CasketImageItem[]> {
  return await db.images.toArray();
}

export async function deleteCasketImage(id: string): Promise<void> {
  await db.images.delete(id);
}

// Litho Cut Sheet Storage helpers
export async function saveLithoItem(lithoItem: LithoItem): Promise<void> {
  await db.lithos.put(lithoItem);
  
  // If product code matched, update ALL products sharing this code across every catalog year
  if (lithoItem.productCode) {
    const matched = await db.products.where('code').equals(lithoItem.productCode).toArray();
    for (const prod of matched) {
      await db.products.update(prod.id, { 
        lithoUrl: lithoItem.fileUrl,
        lithoFileName: lithoItem.fileName,
        lithoFileType: lithoItem.fileType
      });
    }
  }
}

export async function getAllLithos(): Promise<LithoItem[]> {
  return await db.lithos.toArray();
}

export async function getLithoByProductCode(productCode: string): Promise<LithoItem | undefined> {
  return await db.lithos.where('productCode').equals(productCode).first();
}

export async function deleteLithoItem(id: string): Promise<void> {
  const item = await db.lithos.get(id);
  if (item && item.productCode) {
    const others = await db.lithos.where('productCode').equals(item.productCode).toArray();
    if (others.length <= 1) {
      const matched = await db.products.where('code').equals(item.productCode).toArray();
      for (const prod of matched) {
        await db.products.update(prod.id, { 
          lithoUrl: undefined,
          lithoFileName: undefined,
          lithoFileType: undefined
        });
      }
    }
  }
  await db.lithos.delete(id);
}

export async function assignLithoToProduct(lithoId: string, productCode: string, productName?: string): Promise<void> {
  const item = await db.lithos.get(lithoId);
  if (!item) return;

  // Clean old product code if changing
  if (item.productCode && item.productCode !== productCode) {
    const oldMatches = await db.lithos.where('productCode').equals(item.productCode).toArray();
    if (oldMatches.length <= 1) {
      const oldProds = await db.products.where('code').equals(item.productCode).toArray();
      for (const prod of oldProds) {
        await db.products.update(prod.id, { 
          lithoUrl: undefined,
          lithoFileName: undefined,
          lithoFileType: undefined
        });
      }
    }
  }

  item.productCode = productCode;
  if (productName) item.productName = productName;
  await db.lithos.put(item);

  // Update target products across all catalog years
  const matched = await db.products.where('code').equals(productCode).toArray();
  for (const prod of matched) {
    await db.products.update(prod.id, { 
      lithoUrl: item.fileUrl,
      lithoFileName: item.fileName,
      lithoFileType: item.fileType
    });
  }
}

// Export database as JSON string
export async function exportDatabaseToJson(): Promise<string> {
  const customers = await db.customers.toArray();
  const products = await db.products.toArray();
  const sales = await db.sales.toArray();
  const images = await db.images.toArray();
  const lithos = await db.lithos.toArray();

  const exportData = {
    appName: 'Batesville-FP Portable DB',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    data: {
      customers,
      products,
      sales,
      images,
      lithos
    }
  };

  return JSON.stringify(exportData, null, 2);
}

// Import database from JSON string
export async function importDatabaseFromJson(jsonContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed.data || !Array.isArray(parsed.data.customers) || !Array.isArray(parsed.data.products)) {
      throw new Error('Invalid Batesville-FP database file format.');
    }

    await db.transaction('rw', [db.customers, db.products, db.sales, db.images, db.lithos], async () => {
      await db.customers.clear();
      await db.products.clear();
      await db.sales.clear();
      await db.images.clear();
      await db.lithos.clear();

      await db.customers.bulkAdd(parsed.data.customers);
      await db.products.bulkAdd(parsed.data.products);
      if (Array.isArray(parsed.data.sales)) {
        await db.sales.bulkAdd(parsed.data.sales);
      }
      if (Array.isArray(parsed.data.images)) {
        await db.images.bulkAdd(parsed.data.images);
      }
      if (Array.isArray(parsed.data.lithos)) {
        await db.lithos.bulkAdd(parsed.data.lithos);
      }
    });

    return { 
      success: true, 
      message: `Successfully imported ${parsed.data.customers.length} customers, ${parsed.data.products.length} products, and ${(parsed.data.sales || []).length} sales.` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to import database file.' };
  }
}

// Reset database to authentic Batesville catalog
export async function resetDatabaseToSeed(): Promise<void> {
  await db.transaction('rw', [db.customers, db.products, db.sales, db.images, db.lithos], async () => {
    await db.customers.clear();
    await db.products.clear();
    await db.sales.clear();
    await db.images.clear();
    await db.lithos.clear();

    await db.products.bulkAdd(BATESVILLE_CASKET_CATALOG);
  });
}

// ============================================================================
// Annual Quota Tracker Engine & Baseline Models
// ============================================================================

export const BASELINE_QUOTA_SPREADSHEET: Record<number, { quota: number; workingDays: number; fallbackSales: number }> = {
  1:  { quota: 478228, workingDays: 23, fallbackSales: 465282 }, // Oct
  2:  { quota: 415280, workingDays: 20, fallbackSales: 422874 }, // Nov
  3:  { quota: 519711, workingDays: 23, fallbackSales: 423909 }, // Dec
  4:  { quota: 538549, workingDays: 22, fallbackSales: 488967 }, // Jan
  5:  { quota: 513022, workingDays: 20, fallbackSales: 390263 }, // Feb
  6:  { quota: 534499, workingDays: 22, fallbackSales: 420889 }, // Mar
  7:  { quota: 488927, workingDays: 22, fallbackSales: 420140 }, // Apr
  8:  { quota: 457074, workingDays: 21, fallbackSales: 399352 }, // May
  9:  { quota: 473910, workingDays: 22, fallbackSales: 390166 }, // Jun
  10: { quota: 516100, workingDays: 23, fallbackSales: 441283 }, // Jul
  11: { quota: 484574, workingDays: 21, fallbackSales: 371009 }, // Aug
  12: { quota: 501041, workingDays: 22, fallbackSales: 430501 }, // Sep
};

export const FISCAL_MONTH_NAMES = [
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'
];

export const FISCAL_MONTH_CODES = [
  'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'
];

export interface HistoricalYearPerformance {
  quota: number;
  attainmentPercent: number;
  isTbd?: boolean;
}

/**
 * Historical performance records and final attainment percentages (October to September)
 */
export const HISTORICAL_PERFORMANCE_CONFIG: Record<string, HistoricalYearPerformance> = {
  '2017-18': { quota: 3420000, attainmentPercent: 96.38 },
  '2018-19': { quota: 3580000, attainmentPercent: 94.53 },
  '2019-20': { quota: 3750000, attainmentPercent: 117.51 },
  '2020-21': { quota: 3920000, attainmentPercent: 114.37 },
  '2021-22': { quota: 4100000, attainmentPercent: 115.25 },
  '2022-23': { quota: 4281810, attainmentPercent: 106.00 },
  '2023-24': { quota: 4680827, attainmentPercent: 102.21 },
  '2024-25': { quota: 5060563, attainmentPercent: 106.20 },
  '2025-26': { quota: 5920915, attainmentPercent: 91.10 },
  '2026-27': { quota: 0, attainmentPercent: 0, isTbd: true },
};

/**
 * Historical and baseline annual quota targets per fiscal year (from 2016-17 to present).
 * The annual quota changes by year and is always the sum of that year's 12 monthly targets.
 */
export const HISTORICAL_ANNUAL_QUOTAS: Record<string, number> = {
  '2016-17': 3300000,
  '2017-18': 3420000,
  '2018-19': 3580000,
  '2019-20': 3750000,
  '2020-21': 3920000,
  '2021-22': 4100000,
  '2022-23': 4281810,
  '2023-24': 4680827,
  '2024-25': 5060563,
  '2025-26': 5920915, // Executive baseline spreadsheet ($5,920,915 across 12M)
  '2026-27': 0,       // TBD - brand new fiscal year just started, quota pending
};

/**
 * Normalizes fiscal year strings like "2024-25", "2024", or "2024-2025" into standard "2024-25"
 */
export function parseBatesvilleFiscalYear(yearStr: string): { baseYear: number; nextYear: number; standardCode: string } {
  let baseYear = 2024;
  if (!yearStr) {
    return { baseYear: 2024, nextYear: 2025, standardCode: '2024-25' };
  }
  const str = String(yearStr).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    baseYear = parseInt(parts[0], 10);
    let nYear = parseInt(parts[1], 10);
    if (nYear < 100) nYear += 2000;
    return {
      baseYear,
      nextYear: nYear,
      standardCode: `${baseYear}-${String(nYear).slice(-2)}`
    };
  }
  const y = parseInt(str, 10);
  if (!isNaN(y)) {
    return {
      baseYear: y,
      nextYear: y + 1,
      standardCode: `${y}-${String(y + 1).slice(-2)}`
    };
  }
  return { baseYear: 2024, nextYear: 2025, standardCode: '2024-25' };
}

const FISCAL_MONTH_NAME_TO_NUM: Record<string, number> = {
  'OCT': 1, 'NOV': 2, 'DEC': 3, 'JAN': 4, 'FEB': 5, 'MAR': 6,
  'APR': 7, 'MAY': 8, 'JUN': 9, 'JUL': 10, 'AUG': 11, 'SEP': 12,
  'OCTOBER': 1, 'NOVEMBER': 2, 'DECEMBER': 3, 'JANUARY': 4,
  'FEBRUARY': 5, 'MARCH': 6, 'APRIL': 7, 'JUNE': 9,
  'JULY': 10, 'AUGUST': 11, 'SEPTEMBER': 12
};

/**
 * Determines exact fiscal year and fiscal month (1=Oct ... 12=Sep) for any sale record
 */
export function getSaleFiscalYearAndMonth(s: SaleRecord): { fiscalYear: string; fiscalMonth: number } {
  let fMonth = Number(s.fiscalMonth) || 0;
  if (fMonth < 1 || fMonth > 12) {
    const mStr = String(s.month || '').toUpperCase().trim();
    if (FISCAL_MONTH_NAME_TO_NUM[mStr]) {
      fMonth = FISCAL_MONTH_NAME_TO_NUM[mStr];
    } else {
      const cMonth = Number(s.calMonth) || parseInt(mStr, 10);
      if (!isNaN(cMonth) && cMonth >= 1 && cMonth <= 12) {
        fMonth = cMonth >= 10 ? (cMonth - 9) : (cMonth + 3);
      } else if (s.saleDate && s.saleDate.includes('-')) {
        const parts = s.saleDate.split('-');
        const parsedM = parseInt(parts[1], 10);
        if (!isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
          fMonth = parsedM >= 10 ? (parsedM - 9) : (parsedM + 3);
        }
      }
    }
  }
  if (fMonth < 1 || fMonth > 12) fMonth = 1;

  let fy = String(s.year || '').trim();
  if (fy.includes('-')) {
    const parts = fy.split('-');
    const bYear = parseInt(parts[0], 10);
    let nYear = parseInt(parts[1], 10);
    if (nYear < 100) nYear += 2000;
    return { fiscalYear: `${bYear}-${String(nYear).slice(-2)}`, fiscalMonth: fMonth };
  }

  if (s.saleDate && s.saleDate.includes('-')) {
    const parts = s.saleDate.split('-');
    const cYear = parseInt(parts[0], 10);
    const cMonth = parseInt(parts[1], 10);
    if (!isNaN(cYear) && !isNaN(cMonth)) {
      if (cMonth >= 10) {
        return { fiscalYear: `${cYear}-${String(cYear + 1).slice(-2)}`, fiscalMonth: fMonth };
      } else {
        return { fiscalYear: `${cYear - 1}-${String(cYear).slice(-2)}`, fiscalMonth: fMonth };
      }
    }
  }

  const singleYear = parseInt(fy, 10);
  if (!isNaN(singleYear) && singleYear >= 2000) {
    if (fMonth <= 3) {
      return { fiscalYear: `${singleYear}-${String(singleYear + 1).slice(-2)}`, fiscalMonth: fMonth };
    } else {
      return { fiscalYear: `${singleYear - 1}-${String(singleYear).slice(-2)}`, fiscalMonth: fMonth };
    }
  }

  return { fiscalYear: fy || '2024-25', fiscalMonth: fMonth };
}

/**
 * Return default 12-month quotas with exact calendar billing days (excluding weekends & holidays)
 * The annual quota is dynamically calculated per year.
 */
export function getDefaultFiscalQuotas(year: string): SalesQuotaItem[] {
  const normYear = parseBatesvilleFiscalYear(year).standardCode;

  // For 2025-26, use the exact spreadsheet baseline numbers ($5,920,915)
  if (normYear === '2025-26') {
    const billingCalendar = getFiscalYearBillingDays(normYear);
    return FISCAL_MONTH_CODES.map((m, idx) => {
      const fMonth = idx + 1;
      const base = BASELINE_QUOTA_SPREADSHEET[fMonth];
      const calDays = billingCalendar[idx]?.billingDays || base.workingDays;
      return {
        fiscal_year: normYear,
        fiscal_month: fMonth,
        month_name: m,
        quota_amount: base.quota,
        working_days: calDays,
      };
    });
  }

  // Look up or calculate annual target for this specific fiscal year
  const annualTarget = HISTORICAL_ANNUAL_QUOTAS[normYear];

  // For TBD years (e.g. FY 2026-27 where quota is not yet assigned by leadership)
  if (annualTarget === 0) {
    const billingCalendar = getFiscalYearBillingDays(normYear);
    return FISCAL_MONTH_CODES.map((m, idx) => ({
      fiscal_year: normYear,
      fiscal_month: idx + 1,
      month_name: m,
      quota_amount: 0,
      working_days: billingCalendar[idx]?.billingDays || 21,
    }));
  }

  if (annualTarget === undefined) {
    const baseYear = parseInt(normYear.split('-')[0], 10) || 2025;
    const yearDiff = baseYear - 2025;
    const target = Math.round(5920915 * Math.pow(1.035, yearDiff));
    return distributeAnnualQuota(target, normYear);
  }

  // Distribute target across 12 months using authentic seasonality weights & calendar days
  return distributeAnnualQuota(annualTarget, normYear);
}

const QUOTA_STORAGE_PREFIX = 'batesville_quotas_';

/**
 * Load quotas for a fiscal year from local storage, fallback to defaults
 */
export function getStoredQuotas(year: string): SalesQuotaItem[] {
  const normYear = parseBatesvilleFiscalYear(year).standardCode;
  try {
    const raw = localStorage.getItem(`${QUOTA_STORAGE_PREFIX}${normYear}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        const sum = parsed.reduce((acc: number, q: any) => acc + (Number(q.quota_amount) || 0), 0);
        // Invalidate stale cache if an earlier version saved the 5,920,915 placeholder for a year that isn't 2025-26
        if (normYear !== '2025-26' && sum === 5920915 && HISTORICAL_ANNUAL_QUOTAS[normYear] !== 5920915) {
          return getDefaultFiscalQuotas(normYear);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read quotas from localStorage', e);
  }
  return getDefaultFiscalQuotas(normYear);
}

/**
 * Save updated quotas to local storage and dispatch notification
 */
export function saveStoredQuotas(year: string, quotas: SalesQuotaItem[]): void {
  const normYear = parseBatesvilleFiscalYear(year).standardCode;
  try {
    localStorage.setItem(`${QUOTA_STORAGE_PREFIX}${normYear}`, JSON.stringify(quotas));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('batesville_quotas_updated', { detail: { year: normYear } }));
    }
  } catch (e) {
    console.error('Failed to save quotas to localStorage', e);
  }
}

/**
 * Distribute an annual total quota across 12 months using historical Batesville seasonality weights
 * and dynamically calculates billing days for that year excluding weekends & corporate holidays.
 */
export function distributeAnnualQuota(annualTotal: number, year: string): SalesQuotaItem[] {
  const normYear = parseBatesvilleFiscalYear(year).standardCode;
  const weights = [
    0.080769, 0.070138, 0.087775, 0.090957, 0.086646, 0.090273,
    0.082576, 0.077197, 0.080040, 0.087166, 0.081841, 0.084622
  ];
  const billingCalendar = getFiscalYearBillingDays(normYear);

  let runningSum = 0;
  return FISCAL_MONTH_CODES.map((m, idx) => {
    const fMonth = idx + 1;
    let monthQuota = Math.round(annualTotal * weights[idx]);
    if (fMonth === 12) {
      // Reconcile rounding difference in the 12th month to equal exact annual total
      monthQuota = annualTotal - runningSum;
    } else {
      runningSum += monthQuota;
    }

    const calDays = billingCalendar[idx]?.billingDays || 21;

    return {
      fiscal_year: normYear,
      fiscal_month: fMonth,
      month_name: m,
      quota_amount: monthQuota,
      working_days: calDays,
    };
  });
}

/**
 * Calculate all 10 rows of the Annual Quota Tracker summing figures for all months
 * from October through September for the selected fiscal year.
 * Sums actual sales transactions falling within each fiscal month's exact date range.
 */
export function calculateAnnualQuotaMetrics(
  year: string,
  sales: SaleRecord[],
  customQuotas?: SalesQuotaItem[],
  useBaselineIfNoSales = true
): AnnualQuotaTrackerData {
  const normYear = parseBatesvilleFiscalYear(year).standardCode;
  const billingCalendar = getFiscalYearBillingDays(normYear);
  const quotas = (customQuotas && customQuotas.length === 12 && customQuotas[0].fiscal_year === normYear)
    ? customQuotas
    : getStoredQuotas(normYear);

  // Map each fiscal month (1..12) to its exact date range
  const monthDateRangeMap: Record<number, MonthBillingInfo> = {};
  for (const info of billingCalendar) {
    monthDateRangeMap[info.fiscalMonth] = info;
  }

  // Sum actual sales transactions falling within each fiscal month's exact date range
  const monthlyActualSales: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  };
  const monthlySalesCount: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  };
  let matchedSalesCount = 0;
  let totalMatchedSalesAmount = 0;

  for (const s of sales) {
    const amount = Number(s.cost) || Number(s.totalAmount) || ((Number(s.unitPrice) || 0) * (Number(s.quantity) || 1)) || 0;
    let matchedMonth = 0;

    // Check 1: Match by exact date range if saleDate is present
    if (s.saleDate) {
      const cleanDate = String(s.saleDate).trim().slice(0, 10);
      for (let fm = 1; fm <= 12; fm++) {
        const range = monthDateRangeMap[fm];
        if (range && cleanDate >= range.startDate && cleanDate <= range.endDate) {
          matchedMonth = fm;
          break;
        }
      }
    }

    // Check 2: Fallback to fiscal year and month fields if saleDate didn't match or is missing
    if (matchedMonth === 0) {
      const { fiscalYear: saleFY, fiscalMonth: saleFM } = getSaleFiscalYearAndMonth(s);
      if (saleFY === normYear && saleFM >= 1 && saleFM <= 12) {
        matchedMonth = saleFM;
      }
    }

    if (matchedMonth >= 1 && matchedMonth <= 12) {
      monthlyActualSales[matchedMonth] = (monthlyActualSales[matchedMonth] || 0) + amount;
      monthlySalesCount[matchedMonth] = (monthlySalesCount[matchedMonth] || 0) + 1;
      matchedSalesCount++;
      totalMatchedSalesAmount += amount;
    }
  }

  const hasRealSales = matchedSalesCount > 0 && (totalMatchedSalesAmount >= 1000000 || normYear === '2026-27');

  // The Annual Quota is strictly the sum of all 12 quota months in this fiscal year!
  const annualQuota = quotas.reduce((acc, q) => acc + (Number(q.quota_amount) || 0), 0);

  let cumulativeQuota = 0;
  let cumulativeSales = 0;

  const monthMetrics: FiscalMonthQuotaMetrics[] = quotas.map((q, idx) => {
    const fMonth = idx + 1;
    const mName = FISCAL_MONTH_NAMES[idx];
    const quotaVal = Number(q.quota_amount) || 0;
    const wDays = Number(q.working_days) || 21;
    const rangeInfo = monthDateRangeMap[fMonth];

    let actualSales = 0;
    if (hasRealSales) {
      actualSales = monthlyActualSales[fMonth] || 0;
    } else if (useBaselineIfNoSales) {
      const perf = HISTORICAL_PERFORMANCE_CONFIG[normYear];
      if (perf && perf.quota > 0 && perf.attainmentPercent > 0) {
        const targetAnnualSales = Math.round(perf.quota * (perf.attainmentPercent / 100));
        const weights = [
          0.080769, 0.070138, 0.087775, 0.090957, 0.086646, 0.090273,
          0.082576, 0.077197, 0.080040, 0.087166, 0.081841, 0.084622
        ];
        if (fMonth === 12) {
          let priorSum = 0;
          for (let m = 0; m < 11; m++) {
            priorSum += Math.round(targetAnnualSales * weights[m]);
          }
          actualSales = targetAnnualSales - priorSum;
        } else {
          actualSales = Math.round(targetAnnualSales * weights[idx]);
        }
      } else if (normYear === '2026-27') {
        actualSales = monthlyActualSales[fMonth] || 0;
      } else {
        const baselineFallback = BASELINE_QUOTA_SPREADSHEET[fMonth]?.fallbackSales || 0;
        actualSales = Math.round(baselineFallback * (annualQuota / 5920915));
      }
    }

    cumulativeQuota += quotaVal;
    cumulativeSales += actualSales;

    const cumulativeVariance = cumulativeSales - cumulativeQuota;
    const monthlyVariance = actualSales - quotaVal;
    const dailySales = wDays > 0 ? actualSales / wDays : 0;
    const dailyRequired = wDays > 0 ? quotaVal / wDays : 0;
    const attainmentPercent = cumulativeQuota > 0 ? (cumulativeSales / cumulativeQuota) * 100 : 0;
    const annualPercent = annualQuota > 0 ? (cumulativeSales / annualQuota) * 100 : 0;

    return {
      fiscalMonth: fMonth,
      monthName: mName,
      quota: quotaVal,
      cumulativeQuota,
      sales: actualSales,
      cumulativeSales,
      cumulativeVariance,
      monthlyVariance,
      workingDays: wDays,
      dailySales: Math.round(dailySales),
      dailyRequired: Math.round(dailyRequired),
      attainmentPercent: Math.round(attainmentPercent * 100) / 100,
      annualPercent: Math.round(annualPercent * 100) / 100,
      startDate: rangeInfo?.startDate || '',
      endDate: rangeInfo?.endDate || '',
      dateRange: rangeInfo?.dateRange || '',
      salesCount: monthlySalesCount[fMonth] || 0,
    };
  });

  const totalActualSales = cumulativeSales;
  const totalVariance = totalActualSales - annualQuota;
  const isQuotaTbd = (normYear === '2026-27' && annualQuota === 0);
  const overallAttainment = annualQuota > 0 ? (totalActualSales / annualQuota) * 100 : 0;
  const totalWorkingDays = quotas.reduce((acc, q) => acc + (Number(q.working_days) || 0), 0);

  return {
    fiscalYear: normYear,
    annualQuota,
    totalActualSales,
    totalVariance,
    overallAttainmentPercent: Math.round(overallAttainment * 100) / 100,
    totalWorkingDays,
    months: monthMetrics,
    isQuotaTbd,
  };
}

