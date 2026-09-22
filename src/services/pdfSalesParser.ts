import * as pdfjsLib from 'pdfjs-dist';
import { Customer, Product, SaleRecord } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use public CDN worker matching installed pdfjs-dist version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ParsedSaleRow {
  id: string;
  saleDate: string; // YYYY-MM-DD
  accountNumber: string;
  accountName: string;
  productCode: string;
  description: string;
  category: string;
  quantity: number;
  cost: number;
  totalAmount: number;
  year: string;
  month: string;
  day: number;
  fiscalMonth: number;
  calMonth: number;
  isMatchedCustomer: boolean;
  isMatchedProduct: boolean;
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
}

export interface PdfParseResult {
  fileName: string;
  extractedLinesCount: number;
  rows: ParsedSaleRow[];
  totalRevenue: number;
  totalUnits: number;
  matchedCustomersCount: number;
  matchedProductsCount: number;
  rawTextPreview: string[];
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FISCAL_MONTH_NUM: Record<string, number> = {
  'OCT': 1, 'NOV': 2, 'DEC': 3, 'JAN': 4, 'FEB': 5, 'MAR': 6,
  'APR': 7, 'MAY': 8, 'JUN': 9, 'JUL': 10, 'AUG': 11, 'SEP': 12
};

/**
 * Extract structured text lines from an uploaded PDF file
 */
export async function extractLinesFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[] }>;

    // Group items by vertical position (Y coordinate snapped to 4px tolerance)
    const lineBuckets = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5] / 4) * 4;

      if (!lineBuckets.has(y)) {
        lineBuckets.set(y, []);
      }
      lineBuckets.get(y)!.push({ x, text: item.str });
    }

    // Sort descending by Y (top of page down to bottom)
    const sortedY = Array.from(lineBuckets.keys()).sort((a, b) => b - a);

    for (const y of sortedY) {
      const itemsInLine = lineBuckets.get(y)!;
      // Sort ascending by X (left to right)
      itemsInLine.sort((a, b) => a.x - b.x);
      const lineStr = itemsInLine.map(it => it.text.trim()).join(' ').trim();
      if (lineStr.length > 0) {
        lines.push(lineStr);
      }
    }
  }

  return lines;
}

/**
 * Parse raw text lines into structured Batesville daily sales records
 */
export function parseSalesLines(
  lines: string[], 
  fileName: string,
  customers: Customer[],
  products: Product[]
): PdfParseResult {
  const rows: ParsedSaleRow[] = [];
  const rawTextPreview = lines.slice(0, 40);

  // Pre-index customers and products for O(1) matching
  const customerByAcct = new Map<string, Customer>();
  const customerByName = new Map<string, Customer>();
  for (const c of customers) {
    const acct = String(c.accountNumber || c.code || '').trim().toLowerCase();
    if (acct) customerByAcct.set(acct, c);
    const name = c.name.toLowerCase().trim();
    if (name) customerByName.set(name, c);
  }

  const productByCode = new Map<string, Product>();
  for (const p of products) {
    const code = String(p.code || '').trim().toLowerCase();
    if (code) productByCode.set(code, p);
  }

  let rowCounter = 0;

  for (const line of lines) {
    // Skip table headers and summary totals
    const lLower = line.toLowerCase();
    if (
      lLower.includes('batesville services') ||
      lLower.includes('page') ||
      lLower.includes('grand total') ||
      lLower.includes('report total') ||
      lLower.includes('account #') && lLower.includes('product')
    ) {
      continue;
    }

    // Try multiple regex strategies to extract row components:
    // Strategy 1: Tab-separated or comma-separated tokens
    // Strategy 2: Date + Account# + ProductCode + Qty + Price pattern
    
    // Check for date pattern
    // e.g. 2025-09-15, 09/15/2025, 15-SEP-2025, 09-15-2025
    const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/);
    
    // Check for price / currency amounts: e.g. $4,065.00, 4065.00, $1,599
    const priceMatches = Array.from(line.matchAll(/\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]{3,5}\b)/g))
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(num => num >= 50 && num <= 50000); // realistic casket/urn price threshold

    // Check for Account Number: 5 to 7 digits
    const acctMatch = line.match(/\b([1-9][0-9]{4,6})\b/);

    // Check for Product Code: 5 to 7 digits, or patterns like 20A_880, 4BH_891
    const prodMatches = Array.from(line.matchAll(/\b([0-9]{5,7}|[0-9]{1,2}[A-Za-z]{1,2}[-_]?[0-9]{2,4})\b/g))
      .map(m => m[1])
      .filter(code => code !== acctMatch?.[1]); // product code shouldn't be the account number

    if (dateMatch && priceMatches.length > 0) {
      rowCounter++;
      const rawDateStr = dateMatch[1];
      const parsedDate = normalizeDate(rawDateStr);
      
      const acctNum = acctMatch ? acctMatch[1] : '';
      const prodCode = prodMatches.length > 0 ? prodMatches[0] : '';
      const cost = priceMatches[priceMatches.length - 1]; // usually last column is line total / cost
      
      // Look up customer
      const matchedCust = customerByAcct.get(acctNum.toLowerCase()) || 
        Array.from(customerByName.values()).find(c => line.toLowerCase().includes(c.name.toLowerCase()));
      
      const accountName = matchedCust ? matchedCust.name : (acctNum ? `Account #${acctNum}` : 'General Account');

      // Look up product
      const matchedProd = productByCode.get(prodCode.toLowerCase());
      const description = matchedProd ? (matchedProd.description || matchedProd.name) : (prodCode ? `Product Code ${prodCode}` : 'Batesville Model');
      const category = matchedProd ? matchedProd.category : 'Burial Solutions';

      // Determine quantity: look for small integer (1-10) before price
      const qtyMatch = line.match(/\b([1-9]|10)\b(?=\s+\$?[\d,]+)/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      const totalAmount = cost * quantity;
      const calMonth = parsedDate.month;
      const mStr = MONTH_NAMES[calMonth - 1] || 'JAN';
      const fiscalMonth = FISCAL_MONTH_NUM[mStr] || 1;

      // Batesville Fiscal Year format e.g. "2024-25"
      const baseYear = fiscalMonth <= 3 ? parsedDate.year : parsedDate.year - 1;
      const nextYearShort = String(baseYear + 1).slice(-2);
      const fiscalYearStr = `${baseYear}-${nextYearShort}`;

      const isMatchedCustomer = Boolean(matchedCust);
      const isMatchedProduct = Boolean(matchedProd);

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to add';

      if (!isMatchedCustomer && !acctNum) {
        status = 'warning';
        statusMessage = 'Unmatched Customer';
      } else if (!isMatchedProduct && !prodCode) {
        status = 'warning';
        statusMessage = 'Unmatched Product';
      }

      rows.push({
        id: `parsed-${rowCounter}-${Date.now()}`,
        saleDate: parsedDate.formatted,
        year: fiscalYearStr,
        month: mStr,
        day: parsedDate.day,
        fiscalMonth,
        calMonth,
        accountNumber: matchedCust?.accountNumber ? String(matchedCust.accountNumber) : acctNum,
        accountName,
        productCode: matchedProd?.code || prodCode || '100000',
        description,
        category,
        quantity,
        cost,
        totalAmount,
        isMatchedCustomer,
        isMatchedProduct,
        status,
        statusMessage
      });
    }
  }

  // Summary counts
  const totalRevenue = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);
  const matchedCustomersCount = rows.filter(r => r.isMatchedCustomer).length;
  const matchedProductsCount = rows.filter(r => r.isMatchedProduct).length;

  return {
    fileName,
    extractedLinesCount: lines.length,
    rows,
    totalRevenue,
    totalUnits,
    matchedCustomersCount,
    matchedProductsCount,
    rawTextPreview
  };
}

/**
 * Normalizes different date formats to standard YYYY-MM-DD
 */
function normalizeDate(raw: string): { formatted: string; year: number; month: number; day: number } {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  let d = now.getDate();

  try {
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      } else if (isNaN(Number(parts[1]))) {
        // DD-MMM-YYYY e.g. 15-SEP-2025
        d = parseInt(parts[0], 10);
        const monIdx = MONTH_NAMES.indexOf(parts[1].toUpperCase());
        m = monIdx !== -1 ? monIdx + 1 : 1;
        y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
      }
    } else if (raw.includes('/')) {
      // MM/DD/YYYY or DD/MM/YYYY
      const parts = raw.split('/');
      m = parseInt(parts[0], 10);
      d = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
    }
  } catch (e) {
    // fallback to current date
  }

  const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { formatted, year: y, month: m, day: d };
}

/**
 * Converts parsed rows into full SaleRecord entities ready to save to database
 */
export function convertParsedRowsToSaleRecords(rows: ParsedSaleRow[]): SaleRecord[] {
  return rows.map((r, idx) => ({
    id: `sale-upload-${Date.now()}-${idx}`,
    saleId: Math.floor(Date.now() / 1000) + idx,
    year: r.year,
    month: r.month,
    day: r.day,
    program: 'Daily Sales Upload',
    accountName: r.accountName,
    accountNumber: r.accountNumber,
    productCode: r.productCode,
    category: r.category,
    description: r.description,
    quantity: r.quantity,
    cost: r.cost,
    customerId: `cust-${r.accountNumber || r.accountName}`,
    productId: `prod-${r.productCode}-${r.year}`,
    orderNumber: `ORD-DAILY-${r.year}-${r.day}${r.month}-${idx + 1}`,
    unitPrice: r.cost,
    totalAmount: r.totalAmount,
    saleDate: r.saleDate,
    fiscalMonth: r.fiscalMonth,
    calMonth: r.calMonth,
    notes: `Ingested via Daily Sales PDF Upload on ${new Date().toLocaleDateString()}`
  }));
}
