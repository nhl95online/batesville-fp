import Dexie, { type EntityTable } from 'dexie';
import { Customer, Product, SaleRecord, SalesYoYMetrics, CasketImageItem, SalesQuotaItem, FiscalMonthQuotaMetrics, AnnualQuotaTrackerData } from '../types';
import { BATESVILLE_CASKET_CATALOG } from './batesvilleCatalogData';
import { getFiscalYearBillingDays } from './billingCalendar';
import { generateSeedSales } from './seedData';

// Offline-capable IndexedDB Database using Dexie
export class BatesvilleDatabase extends Dexie {
  customers!: EntityTable<Customer, 'id'>;
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<SaleRecord, 'id'>;
  images!: EntityTable<CasketImageItem, 'id'>;

  constructor() {
    super('BatesvilleFP_DB');
    this.version(2).stores({
      customers: 'id, code, name, tier, city, state, program',
      products: 'id, code, name, category, catalogYear, material, wholesalePrice, msrp, isActive',
      sales: 'id, orderNumber, customerId, productId, productCode, saleDate, year, month, totalAmount',
      images: 'id, fileName, productCode, uploadedAt',
    });
  }
}

export const db = new BatesvilleDatabase();

// Initialize database
export async function initializeDatabase(): Promise<void> {
  const prodCount = await db.products.count();
  if (prodCount === 0) {
    console.log('[DB] Loading authentic Batesville casket catalog with full names...');
    await db.products.bulkAdd(BATESVILLE_CASKET_CATALOG);
  } else {
    // Check if cached products need full-name upgrade
    const sampleProd = await db.products.toCollection().first();
    if (sampleProd && sampleProd.description && sampleProd.name !== sampleProd.description) {
      console.log('[DB] Refreshing catalog with full product names...');
      await db.products.clear();
      await db.products.bulkAdd(BATESVILLE_CASKET_CATALOG);
    }
  }

  // Ensure sales records exist so the dashboard is never blank
  const salesCount = await db.sales.count();
  if (salesCount === 0) {
    console.log('[DB] Initializing baseline sales data...');
    const seedSales = generateSeedSales();
    await db.sales.bulkAdd(seedSales);
    invalidateSalesCache();
  }
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

// Export database as JSON string
export async function exportDatabaseToJson(): Promise<string> {
  const customers = await db.customers.toArray();
  const products = await db.products.toArray();
  const sales = await db.sales.toArray();
  const images = await db.images.toArray();

  const exportData = {
    appName: 'Batesville-FP Portable DB',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    data: {
      customers,
      products,
      sales,
      images
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

    await db.transaction('rw', [db.customers, db.products, db.sales, db.images], async () => {
      await db.customers.clear();
      await db.products.clear();
      await db.sales.clear();
      await db.images.clear();

      await db.customers.bulkAdd(parsed.data.customers);
      await db.products.bulkAdd(parsed.data.products);
      if (Array.isArray(parsed.data.sales)) {
        await db.sales.bulkAdd(parsed.data.sales);
      }
      if (Array.isArray(parsed.data.images)) {
        await db.images.bulkAdd(parsed.data.images);
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
  await db.transaction('rw', [db.customers, db.products, db.sales, db.images], async () => {
    await db.customers.clear();
    await db.products.clear();
    await db.sales.clear();
    await db.images.clear();

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

/**
 * Return default 12-month quotas with exact calendar billing days (excluding weekends & holidays)
 */
export function getDefaultFiscalQuotas(year: string): SalesQuotaItem[] {
  const billingCalendar = getFiscalYearBillingDays(year);
  return FISCAL_MONTH_CODES.map((m, idx) => {
    const fMonth = idx + 1;
    const base = BASELINE_QUOTA_SPREADSHEET[fMonth];
    const calDays = billingCalendar[idx]?.billingDays || base.workingDays;
    return {
      fiscal_year: year,
      fiscal_month: fMonth,
      month_name: m,
      quota_amount: base.quota,
      working_days: calDays,
    };
  });
}

const QUOTA_STORAGE_PREFIX = 'batesville_quotas_';

/**
 * Load quotas for a fiscal year from local storage, fallback to defaults
 */
export function getStoredQuotas(year: string): SalesQuotaItem[] {
  try {
    const raw = localStorage.getItem(`${QUOTA_STORAGE_PREFIX}${year}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read quotas from localStorage', e);
  }
  return getDefaultFiscalQuotas(year);
}

/**
 * Save updated quotas to local storage and dispatch notification
 */
export function saveStoredQuotas(year: string, quotas: SalesQuotaItem[]): void {
  try {
    localStorage.setItem(`${QUOTA_STORAGE_PREFIX}${year}`, JSON.stringify(quotas));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('batesville_quotas_updated', { detail: { year } }));
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
  const weights = [
    0.080769, 0.070138, 0.087775, 0.090957, 0.086646, 0.090273,
    0.082576, 0.077197, 0.080040, 0.087166, 0.081841, 0.084622
  ];
  const billingCalendar = getFiscalYearBillingDays(year);

  let runningSum = 0;
  return FISCAL_MONTH_CODES.map((m, idx) => {
    const fMonth = idx + 1;
    let monthQuota = Math.round(annualTotal * weights[idx]);
    if (fMonth === 12) {
      // Reconcile rounding difference in the 12th month
      monthQuota = annualTotal - runningSum;
    } else {
      runningSum += monthQuota;
    }

    const calDays = billingCalendar[idx]?.billingDays || 21;

    return {
      fiscal_year: year,
      fiscal_month: fMonth,
      month_name: m,
      quota_amount: monthQuota,
      working_days: calDays,
    };
  });
}

/**
 * Calculate all 10 rows of the Annual Quota Tracker with exact cumulative pacing and variances
 */
export function calculateAnnualQuotaMetrics(
  year: string,
  sales: SaleRecord[],
  customQuotas?: SalesQuotaItem[],
  useBaselineIfNoSales = true
): AnnualQuotaTrackerData {
  const quotas = customQuotas && customQuotas.length === 12 ? customQuotas : getStoredQuotas(year);
  
  // Filter sales for this fiscal year
  const yearSales = sales.filter(s => String(s.year) === String(year));
  const hasRealSales = yearSales.length > 0;

  // Total full-year annual quota
  const annualQuota = quotas.reduce((acc, q) => acc + (Number(q.quota_amount) || 0), 0);

  let cumulativeQuota = 0;
  let cumulativeSales = 0;

  const monthMetrics: FiscalMonthQuotaMetrics[] = quotas.map((q, idx) => {
    const fMonth = idx + 1;
    const mCode = FISCAL_MONTH_CODES[idx];
    const mName = FISCAL_MONTH_NAMES[idx];
    const quotaVal = Number(q.quota_amount) || 0;
    const wDays = Number(q.working_days) || 21;

    // Actual sales calculation for this fiscal month
    let actualSales = 0;
    if (hasRealSales) {
      const isMatching = (s: SaleRecord) => {
        const sm = String(s.month || '').toUpperCase().trim();
        return sm === mCode || s.fiscalMonth === fMonth;
      };
      actualSales = yearSales
        .filter(isMatching)
        .reduce((sum, s) => sum + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
    } else if (useBaselineIfNoSales) {
      // Authentic baseline numbers from the spreadsheet
      actualSales = BASELINE_QUOTA_SPREADSHEET[fMonth]?.fallbackSales || 0;
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
    };
  });

  const totalActualSales = cumulativeSales;
  const totalVariance = totalActualSales - annualQuota;
  const overallAttainment = annualQuota > 0 ? (totalActualSales / annualQuota) * 100 : 0;
  const totalWorkingDays = quotas.reduce((acc, q) => acc + (Number(q.working_days) || 0), 0);

  return {
    fiscalYear: year,
    annualQuota,
    totalActualSales,
    totalVariance,
    overallAttainmentPercent: Math.round(overallAttainment * 100) / 100,
    totalWorkingDays,
    months: monthMetrics,
  };
}

