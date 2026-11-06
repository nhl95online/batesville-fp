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
  orderNumber?: string;
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
 * Calculates Batesville Fiscal Year, Month, and Day.
 * Batesville's fiscal year runs October 1 to September 30.
 * - Months Jan-Sep (1-9): Year is (calYear - 1)-(calYear) [e.g. Sep 19, 2026 -> 2025-26, SEP, 19]
 * - Once it hits October (months 10-12): Year increases to calYear-(calYear + 1) [e.g. Oct 1, 2026 -> 2026-27, OCT, 1]
 */
export function calculateBatesvilleFiscalDate(calYear: number, calMonth: number, day: number): {
  year: string;
  month: string;
  day: number;
  fiscalMonth: number;
  calMonth: number;
  formattedDate: string;
} {
  const mStr = MONTH_NAMES[calMonth - 1] || 'SEP';
  const fiscalMonth = FISCAL_MONTH_NUM[mStr] || 12;

  let fiscalYearStr: string;
  if (calMonth >= 10) {
    // October, November, December: increases to calYear-(calYear+1) e.g. "2026-27"
    const nextShort = String(calYear + 1).slice(-2);
    fiscalYearStr = `${calYear}-${nextShort}`;
  } else {
    // January through September: (calYear-1)-calYear e.g. "2025-26"
    const curShort = String(calYear).slice(-2);
    fiscalYearStr = `${calYear - 1}-${curShort}`;
  }

  const formattedDate = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    year: fiscalYearStr,
    month: mStr,
    day,
    fiscalMonth,
    calMonth,
    formattedDate
  };
}

/**
 * Clean up funeral home name by removing leading program/territory prefixes (e.g. ARB101, ARB142)
 * and trailing account numbers.
 */
export function cleanCustomerShipToName(rawName: string): { cleanName: string; accountNumber: string } {
  let text = (rawName || '').trim();
  let accountNumber = '';

  // 1. Check for account number at the end of the customer string (5 to 7 digits, optionally followed by "Total")
  const acctMatch = text.match(/(\d{5,7})(?:\s*Total)?\s*$/i);
  if (acctMatch) {
    accountNumber = acctMatch[1];
    text = text.replace(/(\d{5,7})(?:\s*Total)?\s*$/i, '').trim();
  }

  // 2. Remove leading program/territory prefixes like ARB101, ARB142, PLN102, PA01, SPP, AMP
  text = text.replace(/^(?:ARB|PLN|PA|SPP|AMP|OBB)\s*\d*\s*/i, '').trim();

  // 3. Remove trailing dashes or punctuation
  text = text.replace(/[-–—\s]+$/, '').trim();

  return { cleanName: text, accountNumber };
}

/**
 * Matches a customer from the local database strictly by Account Number first.
 * Does not require customer name during upload — uses Account # directly.
 */
export function matchCustomerEntity(
  rawAcctNum: string,
  rawShipToName: string,
  customers: Customer[]
): {
  customer?: Customer;
  accountNumber: string;
  accountName: string;
  isMatched: boolean;
} {
  const normAcct = (rawAcctNum || '').trim();
  const { accountNumber: extractedAcct } = cleanCustomerShipToName(rawShipToName);
  const targetAcct = normAcct || extractedAcct;
  const targetAcctLower = targetAcct.toLowerCase();

  // Match strictly by Account Number or Code in DB
  if (targetAcctLower) {
    const found = customers.find(c => {
      const cAcct = String(c.accountNumber ?? '').trim().toLowerCase();
      const cCode = String(c.code ?? '').trim().toLowerCase();
      return cAcct === targetAcctLower || cCode === targetAcctLower;
    });

    if (found) {
      return {
        customer: found,
        accountNumber: String(found.accountNumber || targetAcct),
        accountName: found.name || String(found.accountNumber || targetAcct),
        isMatched: true
      };
    }
  }

  // Fallback: just use the Account # directly (no synthetic "Funeral Home (...)" name)
  return {
    customer: undefined,
    accountNumber: targetAcct,
    accountName: targetAcct,
    isMatched: Boolean(targetAcct)
  };
}

/**
 * Matches a product code against the database catalog or categorizes by description.
 */
export function matchProductEntity(
  itemNumber: string,
  rawDesc: string,
  products: Product[]
): {
  product?: Product;
  productCode: string;
  description: string;
  category: string;
  isMatched: boolean;
} {
  const normCode = (itemNumber || '').trim().toLowerCase();

  if (normCode) {
    const found = products.find(p => {
      const pCode = String(p.code || '').trim().toLowerCase();
      const pProdCode = String(p.productCode || '').trim().toLowerCase();
      return pCode === normCode || pProdCode === normCode;
    });

    if (found) {
      return {
        product: found,
        productCode: found.code,
        description: rawDesc.trim() || found.description || found.name,
        category: found.category || 'Burial Solutions',
        isMatched: true
      };
    }
  }

  // Determine category from description
  let category = 'Burial Solutions';
  const dUpper = (rawDesc || '').toUpperCase();
  if (dUpper.includes('LIFESYMBOLS') || dUpper.includes('LIFESTORIES') || dUpper.includes('CRUCIFIX') || dUpper.includes('KEEPSAKE')) {
    category = 'Memorial Solutions - Keepsakes';
  } else if (dUpper.includes('MDF') || dUpper.includes('CREMATION BOX') || dUpper.includes('TRAY')) {
    category = 'Cremation Options - Cremation Containers';
  } else if (dUpper.includes('URN')) {
    category = 'Cremation Options - Full Size Urns';
  } else if (dUpper.includes('CHESTNUT') || dUpper.includes('PECAN') || dUpper.includes('OAK') || dUpper.includes('CHERRY') || dUpper.includes('MAPLE') || dUpper.includes('WOOD') || dUpper.includes('PINE')) {
    category = 'Burial Solutions - Wood';
  } else if (dUpper.includes('STEEL') || dUpper.includes('OT9') || dUpper.includes('OCTAGON') || dUpper.includes('GAUGE') || dUpper.includes('BRONZE') || dUpper.includes('COPPER')) {
    category = 'Burial Solutions - Metal';
  } else if (dUpper.includes('CLOTH')) {
    category = 'Burial Solutions - Cloth';
  }

  return {
    product: undefined,
    productCode: itemNumber || '100000',
    description: rawDesc.trim() || (itemNumber ? `Product Code ${itemNumber}` : 'Batesville Model'),
    category,
    isMatched: false
  };
}

/**
 * Extract structured text lines from an uploaded PDF file with spatial coordinate preservation.
 */
export async function extractLinesFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rawItems = (content.items as Array<{ str: string; transform: number[] }>)
      .filter(it => it && typeof it.str === 'string' && it.str.trim() !== '')
      .map(it => ({
        x: it.transform[4],
        y: it.transform[5],
        text: it.str.trim()
      }));

    // Sort descending by Y (top of page down to bottom)
    rawItems.sort((a, b) => b.y - a.y);

    // Cluster items into horizontal lines using a 3.5px vertical tolerance
    // (avoids fixed-bucket boundary splits where left text and right-aligned negative numbers differ by <1px)
    const clusters: Array<{ baseY: number; items: Array<{ x: number; text: string }> }> = [];
    for (const item of rawItems) {
      const existing = clusters.find(c => Math.abs(c.baseY - item.y) <= 3.5);
      if (existing) {
        existing.items.push({ x: item.x, text: item.text });
      } else {
        clusters.push({ baseY: item.y, items: [{ x: item.x, text: item.text }] });
      }
    }

    for (const cluster of clusters) {
      // Sort ascending by X (left to right)
      cluster.items.sort((a, b) => a.x - b.x);
      const lineStr = cluster.items.map(it => it.text).join(' ').trim();
      if (lineStr.length > 0) {
        lines.push(lineStr);
      }
    }
  }

  return lines;
}

/**
 * Normalizes a raw PDF or pasted text line so split minus signs, accounting parentheses,
 * angle brackets, Unicode dashes, and merged right-aligned negative columns parse reliably.
 */
export function normalizeReportLine(rawLine: string): string {
  if (!rawLine) return '';
  let s = rawLine
    // 1. Normalize all Unicode minus / dash variants to standard ASCII '-'
    .replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, '-')
    // 2. Convert accounting angle brackets <1,271.43> to parentheses (1,271.43)
    .replace(/<\s*(\$?\s*[\d,.]+)\s*>/g, '($1)')
    // 3. Stitch thousands commas split by PDF kerning e.g. "1, 271.43" -> "1,271.43"
    .replace(/(\d),\s+(\d{3}\b)/g, '$1,$2')
    // 4. Tighten spaces inside accounting parentheses e.g. "( 1,271.43 )" -> "(1,271.43)"
    .replace(/\(\s*(\$?\s*[\d,.]+)\s*\)/g, '($1)')
    .replace(/\$\s*\(\s*([\d,.]+)\s*\)/g, '$($1)')
    // 5. Collapse space between leading minus and decimal/currency number e.g. "- 1,271.43" -> "-1,271.43", "- 1.0" -> "-1.0"
    .replace(/(^|\s|\$)-\s+(?=\$?(?:\d[\d,]*\.\d+|\.\d+)\b)/g, '$1-')
    .replace(/(^|\s)-\s+(?=\d{1,3}\s+(?:[-($]|\d[\d,]*\.\d{2}|\.\d{2}))/g, '$1-')
    // 6. Collapse space before a trailing minus at the very end of the line e.g. "1,271.43 -" -> "1,271.43-"
    .replace(/(\d\.\d{1,2})\s+-\s*$/g, '$1-')
    // 7. Separate adjacent right-aligned numeric columns when a negative sign or parenthesis touches the previous number
    .replace(/\)\s*\(/g, ') (')
    .replace(/(\d\.\d{1,2})([-(]\$?(?:\d|\.\d))/g, '$1 $2')
    .replace(/(\))([-(]\$?(?:\d|\.\d))/g, '$1 $2');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Parses a signed quantity or currency string, supporting:
 * - Standard negative signs: -1,271.43, -$1,271.43, $-1,271.43, - 1,271.43
 * - Unicode minus / dashes: −1,271.43, –1,271.43, —1,271.43
 * - Accounting parentheses: (1,271.43), ($1,271.43), $(1,271.43), ( 1.0 )
 * - Trailing minus / credit markers: 1,271.43-, $1,271.43-, 1,271.43 CR
 */
export function parseSignedNumber(raw: string): number {
  if (!raw) return 0;
  const str = String(raw).trim();
  const isNegative =
    /[-−–—]/.test(str) ||
    (str.includes('(') && str.includes(')')) ||
    /\bCR\b/i.test(str);
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const val = parseFloat(cleaned);
  if (!Number.isFinite(val)) return 0;
  return isNegative && val !== 0 ? -Math.abs(val) : val;
}

// Quantity is a 1-3 digit number (optionally with .0 / .00), signed with leading -, (...), trailing -, or CR.
// Limiting integer part to 1-3 digits prevents 5-8 digit Account / Item / Order numbers from being mistaken for Qty.
const QTY_TOKEN_PATTERN = `(?:[-+]|\\(\\s*)?(?:\\d{1,3}(?:\\.\\d{1,2})?|\\.\\d{1,2})(?:\\)|-(?!\\d)|\\s*CR\\b)?`;
// Currency token has .dd (2 decimal places) or a $ sign, signed with leading -, (...), trailing -, or CR.
const CURR_TOKEN_PATTERN = `(?:[-+]?\\s*\\$?\\s*|\\(\\s*\\$?\\s*|\\$\\s*[-+(]\\s*)?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2}|\\.\\d{2}|\\$\\s*(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?)(?:\\)|-(?!\\d)|\\s*CR\\b)?`;
const FIRST_COL_TOKEN_PATTERN = `(?:${QTY_TOKEN_PATTERN}|${CURR_TOKEN_PATTERN})`;
const TRAILING_QTY_COST_REGEX = new RegExp(
  `(?:\\s+|^)(${FIRST_COL_TOKEN_PATTERN})\\s+(${CURR_TOKEN_PATTERN})(?:\\s+(${CURR_TOKEN_PATTERN}))?\\s*$`,
  'i'
);
const SINGLE_TRAILING_CURR_REGEX = new RegExp(
  `(?:\\s+|^)(${CURR_TOKEN_PATTERN})\\s*$`,
  'i'
);

/**
 * Main Parser: Ingests text lines extracted from PDF or pasted by user.
 * Specifically handles the Batesville "Daily Billing Report" format:
 * - Extracts Account # directly (Customer Name is not needed)
 * - Skips grey subtotal rows (which end with "Total" and have no item number)
 * - Extracts Date, Order #, Item Number (Product Code), Description, Qty, and Cost (Invoice $$)
 * - Includes negative billings / credit memos (negative Qty and/or negative Invoice $$ / Quota Credit)
 */
export function parseSalesLines(
  lines: string[], 
  fileName: string,
  customers: Customer[],
  products: Product[]
): PdfParseResult {
  const rows: ParsedSaleRow[] = [];
  const rawTextPreview = lines.slice(0, 50);

  let activeDate = '2026-10-01'; // Default fallback date
  let activeCustomerShipTo = '';
  let activeAccountNumber = '';
  let activeOrderNumber = '';
  let rowCounter = 0;

  interface RawItemCandidate {
    orderNumber?: string;
    itemNumber: string;
    description: string;
    quantity: number;
    cost: number;
    lineDate: string;
    customerShipTo: string;
    accountNumber: string;
  }

  let currentBlockItems: RawItemCandidate[] = [];
  let pendingPrefixText = '';

  const knownAcctSet = new Set(
    customers
      .map(c => String(c.accountNumber || c.code || '').trim())
      .filter(Boolean)
  );

  const flushBlock = (blockAcct: string, blockShipTo: string) => {
    if (currentBlockItems.length === 0) return;

    const custResolution = matchCustomerEntity(blockAcct, blockShipTo, customers);

    for (const item of currentBlockItems) {
      rowCounter++;

      const prodResolution = matchProductEntity(item.itemNumber, item.description, products);
      const dateInfo = normalizeDate(item.lineDate || activeDate);
      const fiscalInfo = calculateBatesvilleFiscalDate(dateInfo.year, dateInfo.month, dateInfo.day);

      const totalAmount = item.cost;

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to add';

      if (!prodResolution.isMatched) {
        status = 'warning';
        statusMessage = 'Unmatched Product SKU (added with item specs)';
      }

      const finalAcct = custResolution.accountNumber || item.accountNumber || blockAcct;

      rows.push({
        id: `parsed-${rowCounter}-${Date.now()}`,
        saleDate: fiscalInfo.formattedDate,
        year: fiscalInfo.year,
        month: fiscalInfo.month,
        day: fiscalInfo.day,
        fiscalMonth: fiscalInfo.fiscalMonth,
        calMonth: fiscalInfo.calMonth,
        orderNumber: item.orderNumber || activeOrderNumber,
        accountNumber: finalAcct,
        accountName: custResolution.accountName || finalAcct,
        productCode: prodResolution.productCode,
        description: prodResolution.description,
        category: prodResolution.category,
        quantity: item.quantity,
        cost: item.cost,
        totalAmount,
        isMatchedCustomer: Boolean(finalAcct),
        isMatchedProduct: prodResolution.isMatched,
        status,
        statusMessage
      });
    }

    currentBlockItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeReportLine(lines[i]);
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    if (
      lowerLine.startsWith('daily billing report') ||
      lowerLine.includes('participant name') ||
      (lowerLine.includes('credit type') && lowerLine.includes('invoice date')) ||
      (lowerLine.includes('item number') && lowerLine.includes('product description')) ||
      lowerLine.startsWith('page ') ||
      lowerLine.includes('batesville services') ||
      lowerLine.includes('report total') ||
      lowerLine.includes('grand total')
    ) {
      continue;
    }

    // 1. Detect Report Date e.g. 10/1/2026 or 2026-10-01 or 01-OCT-2026
    // When both Invoice Date and Rollup Date appear on a line (especially for credits referencing an older invoice),
    // use the Rollup Date (the last date token on the line).
    const dateMatches = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g);
    if (dateMatches && dateMatches.length > 0) {
      activeDate = dateMatches[dateMatches.length - 1];
    }

    // 2. CHECK FOR GREY SUBTOTAL ROW:
    const isSubtotalRow = /\bTotal\b/i.test(line) && !/Grand Total|Report Total/i.test(line);
    if (isSubtotalRow) {
      const totalAcctMatch = line.match(/(\d{5,7})\s+Total/i) || line.match(/(\d{5,7})/);
      const subtotalAcct = totalAcctMatch ? totalAcctMatch[1] : activeAccountNumber;

      const shipToPart = line.split(/\bTotal\b/i)[0];
      const { cleanName } = cleanCustomerShipToName(shipToPart);

      // Fallback: if a customer's detail credit line was not matched above, but the customer's Total line is negative,
      // capture the credit so a negative customer billing is never dropped.
      if (currentBlockItems.length === 0 && subtotalAcct) {
        const afterTotal = line.split(/\bTotal\b/i)[1] || '';
        const totalNums = afterTotal.match(TRAILING_QTY_COST_REGEX);
        const totalSingle = !totalNums ? afterTotal.match(SINGLE_TRAILING_CURR_REGEX) : null;
        if (totalNums || totalSingle) {
          let tQty = -1;
          let tCost = 0;
          if (totalNums) {
            tQty = parseSignedNumber(totalNums[1]);
            const c2 = parseSignedNumber(totalNums[2]);
            const c3 = totalNums[3] !== undefined ? parseSignedNumber(totalNums[3]) : undefined;
            tCost = (c2 === 0 && c3 !== undefined && c3 !== 0) ? c3 : c2;
            if (c2 > 0 && c3 !== undefined && c3 < 0) tCost = c3;
          } else if (totalSingle) {
            tCost = parseSignedNumber(totalSingle[1]);
            tQty = tCost < 0 ? -1 : 1;
          }
          if (tCost < 0 || tQty < 0) {
            if (tQty < 0 && tCost > 0) tCost = -tCost;
            if (tCost < 0 && tQty > 0) tQty = -tQty;
            currentBlockItems.push({
              orderNumber: activeOrderNumber,
              itemNumber: '0',
              description: 'Credit / Billing Adjustment',
              quantity: tQty || -1,
              cost: tCost,
              lineDate: activeDate,
              customerShipTo: cleanName || activeCustomerShipTo,
              accountNumber: subtotalAcct
            });
          }
        }
      }

      flushBlock(subtotalAcct, cleanName || activeCustomerShipTo);

      activeCustomerShipTo = '';
      activeAccountNumber = '';
      activeOrderNumber = '';
      pendingPrefixText = '';
      continue;
    }

    // 3. CHECK FOR CUSTOMER SHIP-TO HEADER / PREFIX
    const custShipToPattern = /\b((?:ARB|PLN|PA|SPP|AMP|OBB)\s*\d*\s*[^0-9\n\r]+?\s+(\d{5,7}))\b/i;
    const custMatch = line.match(custShipToPattern);
    if (custMatch) {
      const fullMatchedStr = custMatch[1].trim();
      const detectedAcct = custMatch[2].trim();

      if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== detectedAcct) {
        flushBlock(activeAccountNumber, activeCustomerShipTo);
      }

      activeCustomerShipTo = fullMatchedStr;
      activeAccountNumber = detectedAcct;
    }

    // 4. CHECK FOR ITEM SALE / CREDIT TRANSACTION ROW:
    const trailingQtyCost = line.match(TRAILING_QTY_COST_REGEX);
    const singleTrailingCurr = !trailingQtyCost ? line.match(SINGLE_TRAILING_CURR_REGEX) : null;
    const isSingleCurrTransaction = Boolean(
      singleTrailingCurr &&
      singleTrailingCurr.index !== undefined &&
      line.slice(0, singleTrailingCurr.index).trim().length > 0 &&
      (parseSignedNumber(singleTrailingCurr[1]) < 0 || /\b\d{4,10}\b/.test(line.slice(0, singleTrailingCurr.index)))
    );

    if (trailingQtyCost || isSingleCurrTransaction) {
      let qty: number;
      let cost: number;
      let beforeQty: string;

      if (trailingQtyCost) {
        const rawQty = trailingQtyCost[1];
        const rawCol2 = trailingQtyCost[2];
        const rawCol3 = trailingQtyCost[3];

        // Handle edge case where Qty column was blank in PDF and only Invoice $$ + Quota Credit (2 decimals each) appear at end
        if (
          rawCol3 === undefined &&
          /\.\d{2}\b/.test(rawQty) &&
          parseSignedNumber(rawQty) === parseSignedNumber(rawCol2)
        ) {
          cost = parseSignedNumber(rawCol2);
          qty = cost < 0 ? -1 : 1;
        } else {
          qty = parseSignedNumber(rawQty);
          const col2Val = parseSignedNumber(rawCol2);
          const col3Val = rawCol3 !== undefined ? parseSignedNumber(rawCol3) : undefined;
          // Use Invoice $$ (col2Val), or fallback to Quota Credit (col3Val) if Invoice $$ is 0.00 on a credit/adjustment
          cost = (col2Val === 0 && col3Val !== undefined && col3Val !== 0) ? col3Val : col2Val;
          if (col2Val > 0 && col3Val !== undefined && col3Val < 0) {
            cost = col3Val;
          }
          // Ensure sign consistency between quantity and cost on credit rows
          if (qty < 0 && cost > 0) {
            cost = -cost;
          } else if (cost < 0 && qty > 0) {
            qty = -qty;
          }
        }
        beforeQty = line.slice(0, trailingQtyCost.index).trim();
      } else {
        cost = parseSignedNumber(singleTrailingCurr![1]);
        qty = cost < 0 ? -1 : 1;
        beforeQty = line.slice(0, singleTrailingCurr!.index).trim();
      }

      // If this line only had the numbers (or wrapped description tail) and the previous line had the Order/Item prefix, stitch them
      if (pendingPrefixText && !/\b\d{4,10}\b/.test(beforeQty)) {
        beforeQty = `${pendingPrefixText} ${beforeQty}`.trim();
      }
      pendingPrefixText = '';

      let lineOrderNumber = activeOrderNumber;
      let remainder = beforeQty;

      // Strip leading Participant Name / Credit Type / Invoice Date / Rollup Date up to the last date token
      const allDates = [...remainder.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g)];
      if (allDates.length > 0) {
        const lastDate = allDates[allDates.length - 1];
        remainder = remainder.slice(lastDate.index! + lastDate[0].length).trim();
      }

      // Check for 8-10 digit Order Number / Credit Memo Number (e.g. 37xxxxxx or 8-10 digit order/credit #)
      const lineOrderMatch = remainder.match(/\b(37\d{6}|\d{8,10})\b/);
      if (lineOrderMatch) {
        lineOrderNumber = lineOrderMatch[1];
        activeOrderNumber = lineOrderNumber;
        
        const afterOrder = remainder.slice(lineOrderMatch.index! + lineOrderMatch[0].length).trim();
        const beforeOrder = remainder.slice(0, lineOrderMatch.index!).trim();

        if (beforeOrder.length >= 4) {
          const acctAtEnd = beforeOrder.match(/(\d{5,7})\s*$/);
          if (acctAtEnd) {
            if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== acctAtEnd[1]) {
              flushBlock(activeAccountNumber, activeCustomerShipTo);
            }
            activeAccountNumber = acctAtEnd[1];
            activeCustomerShipTo = beforeOrder;
          }
        }

        remainder = afterOrder;
      } else {
        // No 8-10 digit order number on this line: strip any leading Customer Ship-To so Account # is not mistaken for Item #
        if (custMatch) {
          const custIdx = remainder.indexOf(custMatch[0]);
          if (custIdx !== -1) {
            remainder = remainder.slice(custIdx + custMatch[0].length).trim();
          }
        } else {
          // Check if remainder starts with [Funeral Home Name + 5-7 digit Account #] followed by [Order/Item #]
          const namedAcctMatch = remainder.match(/^([A-Za-z][^\n\r]*?)\s+(\d{5,7})\s+(.*)$/);
          if (namedAcctMatch) {
            const detectedAcct = namedAcctMatch[2];
            if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== detectedAcct) {
              flushBlock(activeAccountNumber, activeCustomerShipTo);
            }
            activeAccountNumber = detectedAcct;
            activeCustomerShipTo = `${namedAcctMatch[1].trim()} ${detectedAcct}`;
            remainder = namedAcctMatch[3].trim();
          } else {
            // Bare [5-7 digit Account #] followed by [5-7 digit Item #] (e.g. pasted lines "2025-04-12 134700 271819 M39...")
            const bareAcctThenItem = remainder.match(/^(\d{5,7})\s+(?:([A-Z0-9-]{6,12})\s+)?(\d{5,7})\b\s*(.*)$/i);
            if (bareAcctThenItem) {
              const detectedAcct = bareAcctThenItem[1];
              if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== detectedAcct) {
                flushBlock(activeAccountNumber, activeCustomerShipTo);
              }
              activeAccountNumber = detectedAcct;
              if (bareAcctThenItem[2]) {
                lineOrderNumber = bareAcctThenItem[2];
                activeOrderNumber = lineOrderNumber;
              }
              remainder = `${bareAcctThenItem[3]} ${bareAcctThenItem[4] || ''}`.trim();
            } else {
              // If remainder starts with a known Customer Account # followed by anything else
              const leadingAcct = remainder.match(/^(\d{5,7})\b\s*(.*)$/);
              if (leadingAcct && knownAcctSet.has(leadingAcct[1]) && leadingAcct[2]) {
                const detectedAcct = leadingAcct[1];
                if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== detectedAcct) {
                  flushBlock(activeAccountNumber, activeCustomerShipTo);
                }
                activeAccountNumber = detectedAcct;
                remainder = leadingAcct[2].trim();
              }
            }
          }
        }

        // If remainder has [Alphanumeric/6-10 char Order/Credit #] followed by [5-7 digit Item #], extract Order #
        const altOrderThenItem = remainder.match(/^([A-Z0-9-]{5,12})\s+(\d{5,7})\b\s*(.*)$/i);
        if (altOrderThenItem) {
          lineOrderNumber = altOrderThenItem[1];
          activeOrderNumber = lineOrderNumber;
          remainder = `${altOrderThenItem[2]} ${altOrderThenItem[3] || ''}`.trim();
        }
      }

      const itemAndDescMatch =
        remainder.match(/^(\d{4,8}|\d{2,4}-\d{2,5}(?:-\d{1,4})?|[A-Z]{1,3}-?\d{3,6})\b(?:\s+(.*))?$/i) ||
        remainder.match(/\b(\d{4,8}|\d{2,4}-\d{2,5}(?:-\d{1,4})?)\b(?:\s+(.*))?$/);
      
      if (itemAndDescMatch && !knownAcctSet.has(itemAndDescMatch[1])) {
        const itemNumber = itemAndDescMatch[1].trim();
        let rawDesc = (itemAndDescMatch[2] || '').trim();

        rawDesc = rawDesc.replace(/^[-–—:\s]+/, '').trim();

        currentBlockItems.push({
          orderNumber: lineOrderNumber,
          itemNumber,
          description: rawDesc || (cost < 0 ? `Credit Item ${itemNumber}` : `Item ${itemNumber}`),
          quantity: qty,
          cost,
          lineDate: activeDate,
          customerShipTo: activeCustomerShipTo,
          accountNumber: activeAccountNumber
        });
      } else if (cost < 0 || qty < 0) {
        // Credit memo / billing adjustment row: always include in currentBlockItems even if Account # only appears on the customer's Total line below
        const cleanDesc = remainder.replace(/^[-–—:\s]+/, '').trim();
        currentBlockItems.push({
          orderNumber: lineOrderNumber,
          itemNumber: itemAndDescMatch ? itemAndDescMatch[1].trim() : '0',
          description: cleanDesc || 'Credit / Billing Adjustment',
          quantity: qty,
          cost,
          lineDate: activeDate,
          customerShipTo: activeCustomerShipTo,
          accountNumber: activeAccountNumber
        });
      }
    } else {
      // Non-transaction line: check for wrapped customer header, order number, or wrapped item prefix
      const orderOnWrap = line.match(/\b(37\d{6}|\d{8,10})\b/);
      if (orderOnWrap) {
        activeOrderNumber = orderOnWrap[1];
      }

      const wrapAcctMatch = line.match(/([A-Za-z\s\.\-&']+)\s+(\d{5,7})\s*$/);
      if (wrapAcctMatch && !/\bTotal\b/i.test(line)) {
        if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== wrapAcctMatch[2]) {
          flushBlock(activeAccountNumber, activeCustomerShipTo);
        }
        activeAccountNumber = wrapAcctMatch[2];
        if (activeCustomerShipTo) {
          activeCustomerShipTo += ' ' + wrapAcctMatch[1];
        } else {
          activeCustomerShipTo = wrapAcctMatch[1];
        }
        pendingPrefixText = '';
      } else {
        // If the previous item in currentBlockItems was a credit row with itemNumber '0' and this wrapped line has the SKU + Description, attach it
        const lastItem = currentBlockItems[currentBlockItems.length - 1];
        const wrappedSkuMatch = line.match(/(?:\b(?:37\d{6}|\d{8,10})\s+)?\b(\d{4,7}|\d{2,4}-\d{2,5}(?:-\d{1,4})?)\b\s+([A-Za-z0-9].*)$/);
        if (lastItem && lastItem.itemNumber === '0' && wrappedSkuMatch && !knownAcctSet.has(wrappedSkuMatch[1])) {
          lastItem.itemNumber = wrappedSkuMatch[1];
          lastItem.description = wrappedSkuMatch[2].replace(/^[-–—:\s]+/, '').trim();
          pendingPrefixText = '';
        } else {
          pendingPrefixText = line;
        }
      }
    }
  }

  if (currentBlockItems.length > 0) {
    flushBlock(activeAccountNumber, activeCustomerShipTo);
  }

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
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      } else if (isNaN(Number(parts[1]))) {
        d = parseInt(parts[0], 10);
        const monIdx = MONTH_NAMES.indexOf(parts[1].toUpperCase());
        m = monIdx !== -1 ? monIdx + 1 : 1;
        y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
      }
    } else if (raw.includes('/')) {
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
    accountName: r.accountName || String(r.accountNumber),
    accountNumber: r.accountNumber,
    productCode: r.productCode,
    category: r.category,
    subcategory: '',
    description: r.description,
    quantity: r.quantity,
    cost: r.cost,
    customerId: `cust-${r.accountNumber}`,
    productId: `prod-${r.productCode}-${r.year}`,
    orderNumber: r.orderNumber || `ORD-DAILY-${r.year}-${r.day}${r.month}-${idx + 1}`,
    unitPrice: r.quantity !== 0 ? Number((r.cost / Math.abs(r.quantity)).toFixed(2)) : r.cost,
    totalAmount: r.cost,
    saleDate: r.saleDate,
    fiscalMonth: r.fiscalMonth,
    calMonth: r.calMonth,
    notes: `Ingested via Daily Billing Report on ${new Date().toLocaleDateString()}`
  }));
}
