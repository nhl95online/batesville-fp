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
    // Remove the trailing account number and any trailing "Total"
    text = text.replace(/(\d{5,7})(?:\s*Total)?\s*$/i, '').trim();
  }

  // 2. Remove leading program/territory prefixes like ARB101, ARB142, PLN102, PA01, SPP, AMP
  text = text.replace(/^(?:ARB|PLN|PA|SPP|AMP|OBB)\s*\d*\s*/i, '').trim();

  // 3. Remove trailing dashes or punctuation
  text = text.replace(/[-–—\s]+$/, '').trim();

  return { cleanName: text, accountNumber };
}

/**
 * Matches a customer from the local database by account number first, then by name.
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
  const normAcct = (rawAcctNum || '').trim().toLowerCase();
  const { cleanName, accountNumber: extractedAcct } = cleanCustomerShipToName(rawShipToName);
  const targetAcct = normAcct || extractedAcct.toLowerCase();

  // 1. Match by Account Number or Code in DB
  if (targetAcct) {
    const found = customers.find(c => {
      const cAcct = String(c.accountNumber ?? '').trim().toLowerCase();
      const cCode = String(c.code ?? '').trim().toLowerCase();
      return cAcct === targetAcct || cCode === targetAcct;
    });

    if (found) {
      return {
        customer: found,
        accountNumber: String(found.accountNumber || targetAcct),
        accountName: found.name, // Use official full name from customers table
        isMatched: true
      };
    }
  }

  // 2. Match by cleanName if long enough
  if (cleanName.length >= 3) {
    const cLower = cleanName.toLowerCase();
    
    // Substring match
    const bySub = customers.find(c => {
      const nLower = c.name.toLowerCase();
      return nLower.includes(cLower) || cLower.includes(nLower);
    });
    if (bySub) {
      return {
        customer: bySub,
        accountNumber: String(bySub.accountNumber || targetAcct),
        accountName: bySub.name,
        isMatched: true
      };
    }

    // Keyword match
    const words = cLower.split(/[\s\-_,\.]+/).filter(w => w.length >= 4);
    if (words.length >= 2) {
      const byWords = customers.find(c => {
        const nLower = c.name.toLowerCase();
        return words.every(w => nLower.includes(w));
      });
      if (byWords) {
        return {
          customer: byWords,
          accountNumber: String(byWords.accountNumber || targetAcct),
          accountName: byWords.name,
          isMatched: true
        };
      }
    }
  }

  // Fallback if not in database
  return {
    customer: undefined,
    accountNumber: targetAcct,
    accountName: cleanName || (targetAcct ? `Funeral Home (${targetAcct})` : 'General Customer'),
    isMatched: false
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
    const items = content.items as Array<{ str: string; transform: number[] }>;

    // Group items by vertical position (Y coordinate snapped to 3px tolerance)
    const lineBuckets = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5] / 3) * 3;

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
 * Main Parser: Ingests text lines extracted from PDF or pasted by user.
 * Specifically handles the Batesville "Daily Billing Report" format:
 * - Columns: Participant Name, Credit Type, Invoice Date, Rollup Date, Customer Ship-to Name, Order Number, Item Number, Product Description, Qty, Invoice $$, Quota Credit
 * - Skips grey subtotal rows (which end with "Total" and have no item number)
 * - Extracts account number from the end of the funeral home name in "Customer Ship-to Name"
 * - Matches customer against customer database table
 * - Extracts Date, Item Number (Product Code), Description, Qty, and Cost (Invoice $$)
 */
export function parseSalesLines(
  lines: string[], 
  fileName: string,
  customers: Customer[],
  products: Product[]
): PdfParseResult {
  const rows: ParsedSaleRow[] = [];
  const rawTextPreview = lines.slice(0, 50);

  let activeDate = '2026-09-19'; // Default fallback date
  let activeCustomerShipTo = '';
  let activeAccountNumber = '';
  let activeOrderNumber = '';
  let rowCounter = 0;

  // Intermediate item container before resolving customer info
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

  // Helper to commit accumulated block items once customer is known
  const flushBlock = (blockAcct: string, blockShipTo: string) => {
    if (currentBlockItems.length === 0) return;

    // Resolve customer for this block
    const custResolution = matchCustomerEntity(blockAcct, blockShipTo, customers);

    for (const item of currentBlockItems) {
      rowCounter++;

      const prodResolution = matchProductEntity(item.itemNumber, item.description, products);
      const dateInfo = normalizeDate(item.lineDate || activeDate);
      const fiscalInfo = calculateBatesvilleFiscalDate(dateInfo.year, dateInfo.month, dateInfo.day);

      const totalAmount = item.cost; // Invoice $$ in Batesville billing is extended line total
      const unitCost = item.quantity > 0 ? Number((item.cost / item.quantity).toFixed(2)) : item.cost;

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to add';

      if (!custResolution.isMatched) {
        status = 'warning';
        statusMessage = 'Unmatched Customer (will use ship-to name)';
      } else if (!prodResolution.isMatched) {
        status = 'warning';
        statusMessage = 'Unmatched Product SKU (added with item specs)';
      }

      rows.push({
        id: `parsed-${rowCounter}-${Date.now()}`,
        saleDate: fiscalInfo.formattedDate,
        year: fiscalInfo.year,
        month: fiscalInfo.month,
        day: fiscalInfo.day,
        fiscalMonth: fiscalInfo.fiscalMonth,
        calMonth: fiscalInfo.calMonth,
        orderNumber: item.orderNumber || activeOrderNumber,
        accountNumber: custResolution.accountNumber || blockAcct,
        accountName: custResolution.accountName,
        productCode: prodResolution.productCode,
        description: prodResolution.description,
        category: prodResolution.category,
        quantity: item.quantity,
        cost: unitCost,
        totalAmount,
        isMatchedCustomer: custResolution.isMatched,
        isMatchedProduct: prodResolution.isMatched,
        status,
        statusMessage
      });
    }

    currentBlockItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    // Skip generic document headers and report titles
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

    // 1. Detect Report Date e.g. 9/19/2026 or 2026-09-19 or 19-SEP-2026
    const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/);
    if (dateMatch) {
      activeDate = dateMatch[1];
    }

    // 2. CHECK FOR GREY SUBTOTAL ROW:
    // "the grey is the subtotal from the items listed above. so no need to include it.
    //  But the account number is at the end of the funeral home name in the column 'Customer Ship-to Name'"
    // Example: "ARB101 SCOTT FUNERAL HOME-MISS. CHAPEL 897494 Total 13.0 2,713.37 2,713.37"
    // Example: "ARB142 LYNETT FUNERAL HOME 135076 Total 3.0 1,150.56 1,150.56"
    const isSubtotalRow = /\bTotal\b/i.test(line) && !line.includes('Grand Total') && !line.includes('Report Total');
    if (isSubtotalRow) {
      // Extract account number before "Total"
      const totalAcctMatch = line.match(/(\d{5,7})\s+Total/i) || line.match(/(\d{5,7})/);
      const subtotalAcct = totalAcctMatch ? totalAcctMatch[1] : activeAccountNumber;
      
      // Extract customer name before the account number
      const shipToPart = line.split(/\bTotal\b/i)[0];
      const { cleanName } = cleanCustomerShipToName(shipToPart);

      // Flush previous block with this verified account number and name
      flushBlock(subtotalAcct, cleanName || activeCustomerShipTo);

      // Reset active customer for next section
      activeCustomerShipTo = '';
      activeAccountNumber = '';
      activeOrderNumber = '';
      continue; // Grey subtotal row is completely excluded from sales table!
    }

    // 3. CHECK FOR CUSTOMER SHIP-TO HEADER / PREFIX
    // Examples:
    // "ARB101 SCOTT FUNERAL HOME-MISS. CHAPEL 897494"
    // "ARB142 LYNETT FUNERAL HOME 135076"
    // "ARB144 SCOTT F. HOMES - WOODBRIDGE CHAPEL 135142"
    const custShipToPattern = /\b((?:ARB|PLN|PA|SPP|AMP|OBB)\s*\d*\s*[^0-9\n\r]+?\s+(\d{5,7}))\b/i;
    const custMatch = line.match(custShipToPattern);
    if (custMatch) {
      const fullMatchedStr = custMatch[1].trim();
      const detectedAcct = custMatch[2].trim();

      // If we already have items from a previous customer block waiting, flush them first
      if (currentBlockItems.length > 0 && activeAccountNumber && activeAccountNumber !== detectedAcct) {
        flushBlock(activeAccountNumber, activeCustomerShipTo);
      }

      activeCustomerShipTo = fullMatchedStr;
      activeAccountNumber = detectedAcct;
    }

    // 4. CHECK FOR ITEM SALE TRANSACTION ROW:
    // A sale row ends with Qty and Cost: e.g. "2.0 0.00", "1.0 975.14", "1.0 1,271.43", "2.0 26.78", "1.0 440.02"
    const trailingQtyCost = line.match(/(\b\d+(?:\.\d+)?)\s+(\$?\d{1,3}(?:,\d{3})*\.\d{2}|\$?\d+\.\d{2})(?:\s+(\$?\d{1,3}(?:,\d{3})*\.\d{2}|\$?\d+\.\d{2}))?\s*$/);
    
    if (trailingQtyCost) {
      const qty = parseFloat(trailingQtyCost[1]) || 1;
      const cost = parseFloat(trailingQtyCost[2].replace(/[$,]/g, '')) || 0;

      // Extract line portion before Qty & Cost
      const beforeQty = line.slice(0, trailingQtyCost.index).trim();

      // Column sequence in Batesville Daily Billing Report:
      // [Customer Ship-to + Account #] -> [Order #] -> [Item #] -> [Product Description]
      let lineOrderNumber = activeOrderNumber;
      let remainder = beforeQty;

      // Check for 8-digit Order Number (typically starts with 37...)
      const lineOrderMatch = remainder.match(/\b(37\d{6}|\d{8})\b/);
      if (lineOrderMatch) {
        lineOrderNumber = lineOrderMatch[1];
        activeOrderNumber = lineOrderNumber;
        
        // Everything after Order Number belongs to Item Number + Description
        const afterOrder = remainder.slice(lineOrderMatch.index! + lineOrderMatch[0].length).trim();
        const beforeOrder = remainder.slice(0, lineOrderMatch.index!).trim();

        // If customer ship-to appeared before order number on this line, extract it
        if (beforeOrder.length > 5) {
          const acctAtEnd = beforeOrder.match(/(\d{5,7})\s*$/);
          if (acctAtEnd) {
            activeAccountNumber = acctAtEnd[1];
            activeCustomerShipTo = beforeOrder;
          }
        }

        remainder = afterOrder;
      }

      // Now `remainder` begins with the Item Number (5-7 digits) followed by Product Description!
      // Example: "243580 LIFESYMBOLS IMMA HEART MARY-SP"
      // Example: "263783 495 825 CH RILEY"
      // Example: "241566 OT9 8L7 DH VIOLET BOUQUET"
      const itemAndDescMatch = remainder.match(/^([1-9]\d{4,6})\s+(.*)$/) || remainder.match(/\b([1-9]\d{4,6})\b\s+(.*)$/);
      
      if (itemAndDescMatch) {
        const itemNumber = itemAndDescMatch[1].trim();
        let rawDesc = itemAndDescMatch[2].trim();

        // Clean any leading punctuation
        rawDesc = rawDesc.replace(/^[-–—:\s]+/, '').trim();

        currentBlockItems.push({
          orderNumber: lineOrderNumber,
          itemNumber,
          description: rawDesc || `Item ${itemNumber}`,
          quantity: qty,
          cost,
          lineDate: activeDate,
          customerShipTo: activeCustomerShipTo,
          accountNumber: activeAccountNumber
        });
      }
    } else {
      // Check for standalone wrapped customer lines e.g. "CHAPEL 897494"
      const wrapAcctMatch = line.match(/([A-Za-z\s\.\-]+)\s+(\d{5,7})\s*$/);
      if (wrapAcctMatch && !line.includes('Total')) {
        activeAccountNumber = wrapAcctMatch[2];
        if (activeCustomerShipTo) {
          activeCustomerShipTo += ' ' + wrapAcctMatch[1];
        } else {
          activeCustomerShipTo = wrapAcctMatch[1];
        }
      }
    }
  }

  // Flush any remaining items in the last block
  if (currentBlockItems.length > 0) {
    flushBlock(activeAccountNumber, activeCustomerShipTo);
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
        // DD-MMM-YYYY e.g. 19-SEP-2026
        d = parseInt(parts[0], 10);
        const monIdx = MONTH_NAMES.indexOf(parts[1].toUpperCase());
        m = monIdx !== -1 ? monIdx + 1 : 1;
        y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
      }
    } else if (raw.includes('/')) {
      // MM/DD/YYYY or M/D/YYYY
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
    orderNumber: r.orderNumber || `ORD-DAILY-${r.year}-${r.day}${r.month}-${idx + 1}`,
    unitPrice: r.cost,
    totalAmount: r.totalAmount,
    saleDate: r.saleDate,
    fiscalMonth: r.fiscalMonth,
    calMonth: r.calMonth,
    notes: `Ingested via Daily Billing Report on ${new Date().toLocaleDateString()}`
  }));
}
