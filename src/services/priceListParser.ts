import * as pdfjsLib from 'pdfjs-dist';
import { Product } from '../types';
import { db } from './db';
import { getSupabaseClient, isUrnProduct } from './supabase';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ParsedProductItem {
  id: string;
  productCode: string;
  productIdCode?: string; // e.g. "Z508", "AJ98"
  name: string;
  description: string;
  category: string;
  subcategory: string;
  material: string;
  interior: string;
  price: number;
  priceCodeRaw: string;
  catalogYear: string;
  
  // Dimensions & Weight
  extWidth?: number;
  extLength?: number;
  extHeight?: number;
  intWidth?: number;
  weightLbs?: number;
  capacity?: number;
  dimensions?: string;

  // Features & Specifications
  lifeStories: boolean;
  lifeView: boolean;
  lifeSymbols: boolean;
  dualDisposition: boolean;
  top?: string;
  finish?: string;
  oversize: boolean;
  
  // Validation status
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
  selected: boolean;
}

export interface PriceListParseResult {
  fileName: string;
  effectiveDate?: string;
  catalogYear: string;
  customerServiceCenter?: string;
  totalProductsCount: number;
  categoriesDetected: string[];
  products: ParsedProductItem[];
  rawLines: string[];
}

// Known top-level categories in Batesville Product Reference Guides
const KNOWN_CATEGORIES = [
  'Burial Solutions - Metal',
  'Burial Solutions - Wood',
  'Burial Solutions - AWC',
  'Burial Solutions - Cloth',
  'Burial Solutions - Generations Sustainable',
  'Burial Solutions - NewPointe',
  'Burial Solutions - Casket Supplies',
  'Burial Solutions - Metal - Extended Delivery Time Required',
  'Burial Solutions - Wood - Extended Delivery Time Required',
  'Burial Solutions - Cloth - Extended Delivery Time Required',
  'Burial Solutions - NewPointe - Extended Delivery Time Required',
  'Cremation Options - Cremation Containers',
  'Cremation Options - Full Size Urns',
  'Cremation Options - Urn Vaults',
  'Cremation Options - Alternative Container Interior',
  'Cremation Options - Cremation Containers - Extended Delivery Time Required',
  'Memorial Solutions - Remembrance Keepsakes',
  'Memorial Solutions - Remembrance Jewelry',
  'Memorial Solutions - Remembrance Keepsakes - Extended Delivery Time Required',
  'Product Personalization - LifeSymbols Corners',
  'Product Personalization - LifeStories Display Medallions',
  'Product Personalization - Commemorative Panels',
  'Product Personalization - Appliques & Medallions',
  'Product Personalization - Engraving Designs'
];

// Known subcategories / material groupings
const KNOWN_SUBCATEGORIES = [
  // Metals
  'Bronze', 'Copper', 'Stainless Steel', '16 Gauge Steel', '18 Gauge Steel', '20 Gauge Steel', 'Non-Gasketed Steel',
  // Woods
  'Mahogany', 'Walnut', 'Cherry', 'Maple', 'Pecan', 'Oak', 'Pine', 'Select Hardwood',
  // Cremation / Urns / Keepsakes
  'Personal Connections Bases', 'Personal Connections Toppers', 'Statuary Art', 'Memento Chests', 
  'Wood', 'Hardboard Containers', 'Cloth', 'Rental Products', 'Alternative Containers',
  'Biodegradable', 'Cloisonne Classic', 'Sheet Bronze', 'Marble', 'Metal', 'Ceramic', 'Garden Series', 'Other', 'NewPointe',
  // Jewelry
  '14K Gold', '18K Gold Vermeil', 'Sterling Silver', 'Stainless Steel Jewelry',
  // LifeSymbols & Personalization
  'Spiritual/Religious', 'Affiliations/Professions', "Life's Interests/Hobbies", 'Miscellaneous', 
  'Relationships', 'Adapter', 'Velvet', 'Marcelo Appliques and Gems', 'Decorative Kits', 'Casket Supplies', 'Infant and Youth',
  'Infant/Youth', 'LifeStories & LifeSymbols Sets', 'LifeStories Keepsake Medallion'
];

/**
 * Extracts line-ordered text from an uploaded PDF Price List document using pdfjs-dist.
 */
export async function extractLinesFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const extractedLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (!items || items.length === 0) continue;

    // Group text items by their vertical Y position (with tolerance) to assemble true horizontal lines
    const lineBuckets: { y: number; items: any[] }[] = [];
    const Y_TOLERANCE = 4.0;

    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      const y = item.transform[5];
      let bucket = lineBuckets.find(b => Math.abs(b.y - y) <= Y_TOLERANCE);
      if (!bucket) {
        bucket = { y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push(item);
    }

    // Sort lines top-to-bottom (Y descending in PDF space)
    lineBuckets.sort((a, b) => b.y - a.y);

    for (const bucket of lineBuckets) {
      // Sort items within line left-to-right (X ascending)
      bucket.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = bucket.items.map(it => it.str).join(' ').trim();
      if (lineText) {
        extractedLines.push(lineText);
      }
    }
  }

  return extractedLines;
}

/**
 * Parses raw lines of text (from PDF extraction or user copy-paste) into structured Batesville product records.
 */
export function parsePriceListLines(
  lines: string[], 
  fileName = 'Batesville_Price_List.pdf',
  defaultYear?: string
): PriceListParseResult {
  let detectedYear = defaultYear || '2024-25';
  let effectiveDate = '10/1/2024';
  let customerServiceCenter = 'Toronto Customer Service Center';

  let currentCategory = 'Burial Solutions - Metal';
  let currentSubcategory = '18 Gauge Steel';
  const categoriesDetected = new Set<string>();
  const parsedItems: ParsedProductItem[] = [];

  // 1. Scan for Document Metadata (Effective Date, Service Center, Year)
  for (const line of lines.slice(0, 30)) {
    const dateMatch = line.match(/Effective\s*(?:Date)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (dateMatch) {
      effectiveDate = dateMatch[1];
      const parts = effectiveDate.split('/');
      const yrNum = parseInt(parts[2], 10);
      const fullYear = yrNum < 100 ? (2000 + yrNum) : yrNum;
      detectedYear = `${fullYear}-${String(fullYear + 1).slice(-2)}`;
    }
    const cscMatch = line.match(/([A-Za-z\s]+Customer\s+Service\s+Center)/i);
    if (cscMatch) {
      customerServiceCenter = cscMatch[1].trim();
    }
  }

  // 2. State-machine line parser
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check for Category Header
    const matchedCategory = KNOWN_CATEGORIES.find(cat => 
      rawLine.toLowerCase() === cat.toLowerCase() ||
      rawLine.toLowerCase().startsWith(cat.toLowerCase())
    );
    if (matchedCategory) {
      currentCategory = matchedCategory;
      categoriesDetected.add(matchedCategory);
      continue;
    }

    // Check for Subcategory / Material grouping
    const matchedSubcategory = KNOWN_SUBCATEGORIES.find(sub => 
      rawLine.toLowerCase() === sub.toLowerCase()
    );
    if (matchedSubcategory) {
      currentSubcategory = matchedSubcategory;
      continue;
    }

    // Skip standard headers/footers
    if (
      rawLine.includes('Toronto Customer Service Center') ||
      rawLine.includes('Customer Service Center:') ||
      rawLine.includes('Order online at') ||
      rawLine.includes('CONFIDENTIAL') ||
      rawLine.includes('N/I = New/Improved') ||
      rawLine.includes('Burial Solutions') && rawLine.includes('Page:') ||
      rawLine.includes('Cremation Options') && rawLine.includes('Page:') ||
      rawLine.includes('Memorial Solutions') && rawLine.includes('Page:') ||
      rawLine.match(/^Page:\s*\d+/i)
    ) {
      continue;
    }

    // Try parsing as a Product Line
    const product = parseSingleProductLine(rawLine, currentCategory, currentSubcategory, detectedYear);
    if (product) {
      parsedItems.push(product);
      categoriesDetected.add(product.category);
    }
  }

  return {
    fileName,
    effectiveDate,
    catalogYear: detectedYear,
    customerServiceCenter,
    totalProductsCount: parsedItems.length,
    categoriesDetected: Array.from(categoriesDetected),
    products: parsedItems,
    rawLines: lines
  };
}

/**
 * Parses an individual table row from the price list.
 * Typical pattern:
 * [L/T]? [N/I]? [ProductID] [ItemNumber: 5-6 digits] [PriceCode: 6-7 digits] [Description] [Flags] [Dimensions/Weight]
 */
function parseSingleProductLine(
  line: string,
  category: string,
  subcategory: string,
  catalogYear: string
): ParsedProductItem | null {
  let cleanLine = line.trim();

  // Strip L/T (Lead Time / Extended Delivery) and N/I (New/Improved) flags from start
  cleanLine = cleanLine.replace(/^(?:L\/T|N\/I)\s+/i, '').trim();
  cleanLine = cleanLine.replace(/^(?:L\/T|N\/I)\s+/i, '').trim();

  // Match: Optional Product ID, followed by 5-6 digit Item Number, followed by 5-7 digit Price Code
  // Examples:
  // "Z508 147959 0168400 Z64 824 DH Classic Gold, Champagne Velvet BR 29.00 84.00 26.00 300"
  // "2298 146799 0043050 20A 880 HD Woodbridge Pecan, Champagne Velvet X S 28.50 82.50 24.00 270"
  // "1822 100126 0009870 Jefferson 8.50 10.06 8.50 230 4"
  // "279246 279246 0000320 Rose Decorative Kit, Embroidered Applique ... 14.25 24.00 16.00 1"
  const rowRegex = /^(?:([A-Za-z0-9\/]+)\s+)?(\d{5,6})\s+(\d{5,7})\s+(.+)$/;
  const match = cleanLine.match(rowRegex);
  if (!match) return null;

  const prodIdCode = match[1] || '';
  const itemNumber = match[2];
  const priceCodeRaw = match[3];
  let remainder = match[4].trim();

  // Price code decoding: In Batesville guides, price code is in dimes: 0040570 -> $4,057.00
  const parsedPrice = parseInt(priceCodeRaw, 10) / 10;

  // Extract trailing dimensions and weight numbers from the end
  // Examples:
  // "29.00 84.00 26.00 300" (ext_width, ext_length, int_width, weight)
  // "28.50 23.00 82.00 215" (ext_width, ext_height, ext_length, weight)
  // "8.50 10.06 8.50 230 4" (width, height, length, capacity, weight for urns)
  // "20.00" (length for chains)
  let extWidth: number | undefined;
  let extLength: number | undefined;
  let extHeight: number | undefined;
  let intWidth: number | undefined;
  let weightLbs: number | undefined;
  let capacity: number | undefined;

  const trailingNumsMatch = remainder.match(/((?:\d+(?:\.\d+)?\s+){1,4}\d+(?:\.\d+)?)$/);
  if (trailingNumsMatch) {
    const numsStr = trailingNumsMatch[1];
    const nums = numsStr.trim().split(/\s+/).map(Number);
    remainder = remainder.substring(0, remainder.length - numsStr.length).trim();

    if (category.toLowerCase().includes('urn') || category.toLowerCase().includes('cremation container') || category.toLowerCase().includes('remembrance')) {
      if (nums.length === 5) {
        // [width, height, length, capacity, weight]
        [extWidth, extHeight, extLength, capacity, weightLbs] = nums;
      } else if (nums.length === 4) {
        [extWidth, extHeight, extLength, weightLbs] = nums;
      } else if (nums.length === 3) {
        [extWidth, extLength, weightLbs] = nums;
      } else if (nums.length === 2) {
        [extWidth, extLength] = nums;
      } else if (nums.length === 1) {
        extLength = nums[0];
      }
    } else {
      // Standard Caskets
      if (nums.length === 4) {
        // [ext_width, ext_length, int_width, weight]
        [extWidth, extLength, intWidth, weightLbs] = nums;
      } else if (nums.length === 3) {
        [extWidth, extLength, weightLbs] = nums;
      } else if (nums.length === 5) {
        [extWidth, extHeight, extLength, intWidth, weightLbs] = nums;
      }
    }
  }

  // Parse checkbox codes and options right before dimensions
  let lifeStories = false;
  let lifeView = false;
  let lifeSymbols = false;
  let dualDisposition = false;
  let top: string | undefined;
  let finish: string | undefined;
  let oversize = false;

  const KNOWN_CODES = ['X', 'FT', 'FI', 'SM', 'BR', 'C', 'FR', 'GS', 'P', 'S', 'SR', 'U', 'UR', 'VFR', 'VGS', 'VS', 'VSR', 'D3', 'D4', 'OV'];
  let tokens = remainder.split(/\s+/);
  
  while (tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    if (KNOWN_CODES.includes(last)) {
      if (['FT', 'FI', 'SM'].includes(last)) {
        top = last === 'FT' ? 'Full Top (Full Couch)' : last === 'FI' ? 'Full Couch with Inner Panel' : 'Statesman Cap';
      } else if (['BR', 'C', 'FR', 'GS', 'P', 'S', 'SR', 'U', 'UR', 'VFR', 'VGS', 'VS', 'VSR'].includes(last)) {
        const finishMap: Record<string, string> = {
          'BR': 'Brushed Finish', 'C': 'Clear Finish', 'FR': 'Full Rub / High Gloss',
          'GS': 'Gloss Spray', 'P': 'Painted Finish', 'S': 'Satin Finish',
          'SR': 'Semi Rub / High Gloss', 'U': 'Unfinished', 'UR': 'Ultra Rub / High Gloss',
          'VFR': 'Veneer-Full Rub / High Gloss', 'VGS': 'Veneer-Gloss Spray',
          'VS': 'Veneer-Satin Finish', 'VSR': 'Veneer-Semi Rub / High Gloss'
        };
        finish = finishMap[last] || last;
      } else if (['D3', 'D4', 'OV'].includes(last)) {
        oversize = true;
      } else if (last === 'X') {
        // Can be LifeSymbols, LifeStories, or Dual Disposition
        lifeSymbols = true;
      }
      tokens.pop();
    } else {
      break;
    }
  }

  const description = tokens.join(' ').replace(/,\s*$/, '').trim();
  if (!description) return null;

  // Extract model name and interior fabric
  let name = description;
  let interior = 'Standard Crepe';
  if (description.includes(',')) {
    const parts = description.split(',');
    name = description;
    interior = parts.slice(1).join(',').trim();
  }

  // Determine material from subcategory
  let material = subcategory || 'High-Grade Steel / Timber';
  const lowerCat = category.toLowerCase();
  const lowerSub = subcategory.toLowerCase();

  if (lowerCat.includes('metal') || lowerSub.includes('steel') || lowerSub.includes('bronze') || lowerSub.includes('copper')) {
    material = subcategory;
  } else if (lowerCat.includes('wood') || ['oak', 'pecan', 'cherry', 'maple', 'mahogany', 'walnut', 'pine', 'select hardwood'].includes(lowerSub)) {
    material = subcategory;
  } else if (lowerCat.includes('cloth')) {
    material = 'Cloth Covered Fiberboard';
  }

  // Format dimension string
  let dimStr: string | undefined;
  if (extLength && extWidth) {
    dimStr = `${extLength}" L x ${extWidth}" W${extHeight ? ` x ${extHeight}" H` : ''}`;
  }

  return {
    id: `prod-${itemNumber}-${catalogYear}`,
    productCode: itemNumber,
    productIdCode: prodIdCode || undefined,
    name,
    description,
    category,
    subcategory,
    material,
    interior,
    price: parsedPrice,
    priceCodeRaw,
    catalogYear,
    extWidth,
    extLength,
    extHeight,
    intWidth,
    weightLbs,
    capacity,
    dimensions: dimStr,
    lifeStories,
    lifeView,
    lifeSymbols,
    dualDisposition,
    top,
    finish,
    oversize,
    status: parsedPrice > 0 ? 'valid' : 'warning',
    statusMessage: parsedPrice > 0 ? undefined : 'Zero or missing price code',
    selected: true
  };
}

/**
 * Converts parsed product items into standard Product objects for Batesville-FP database.
 */
export function convertParsedToProducts(items: ParsedProductItem[]): Product[] {
  return items.map(item => {
    const isUrn = isUrnProduct({ category: item.category, name: item.name, description: item.description });
    const features: string[] = [];

    if (item.lifeSymbols) features.push('LifeSymbols® Interchangeable Corner Designs');
    if (item.lifeStories) features.push('LifeStories® Keepsake Medallion System');
    if (item.lifeView) features.push('LifeView® Panel / Corner Feature');
    if (item.dualDisposition) features.push('Dual Disposition: Certified for Burial & Cremation');
    if (item.oversize) features.push(`Oversize Construction (${item.intWidth || '28'}" Interior Width)`);
    if (item.top) features.push(`Cap Construction: ${item.top}`);
    if (item.finish) features.push(`Exterior Finish: ${item.finish}`);
    features.push('Living Memorial® Tree Planting Program');

    return {
      id: item.id,
      code: item.productCode,
      productCode: item.productCode,
      name: item.name,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      material: item.material,
      interior: item.interior,
      price: item.price,
      wholesalePrice: item.price,
      catalogYear: item.catalogYear,
      year: item.catalogYear,
      extWidth: item.extWidth,
      extLength: item.extLength,
      extHeight: item.extHeight,
      intWidth: item.intWidth,
      weightLbs: item.weightLbs,
      capacity: item.capacity,
      dimensions: item.dimensions || '83.5" L x 28.5" W x 23.0" H',
      features,
      lifestories: item.lifeStories,
      lifeview: item.lifeView,
      lifesymbols: item.lifeSymbols,
      dualDisposition: item.dualDisposition,
      top: item.top,
      finish: item.finish,
      exteriorFinish: item.finish || 'Standard Finish',
      oversize: item.oversize,
      imageUrl: isUrn
        ? 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

/**
 * Converts parsed product items into PostgreSQL / Supabase SQL INSERT statements.
 */
export function convertToSqlText(items: ParsedProductItem[], tableName = 'public.products'): string {
  const escapeSql = (val: string | null | undefined) => {
    if (val === null || val === undefined) return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const header = `-- ==============================================================================
-- Batesville Product Reference Guide: SQL Insert & Upsert Script
-- Target Table: ${tableName}
-- Generated: ${new Date().toISOString()} (${items.length} Products)
-- ==============================================================================

`;

  const valuesRows = items.map(p => {
    return `(
  ${escapeSql(p.category)},
  ${escapeSql(p.subcategory)},
  ${escapeSql(p.material)},
  ${escapeSql(p.productCode)},
  ${p.price.toFixed(2)},
  ${escapeSql(p.description)},
  ${escapeSql(p.interior)},
  ${p.lifeStories ? 'TRUE' : 'FALSE'},
  ${p.lifeView ? 'TRUE' : 'FALSE'},
  ${p.lifeSymbols ? 'TRUE' : 'FALSE'},
  ${p.dualDisposition ? 'TRUE' : 'FALSE'},
  ${escapeSql(p.top)},
  ${escapeSql(p.finish)},
  ${p.oversize ? 'TRUE' : 'FALSE'},
  ${p.extWidth !== undefined ? p.extWidth : 'NULL'},
  ${p.extHeight !== undefined ? p.extHeight : 'NULL'},
  ${p.extLength !== undefined ? p.extLength : 'NULL'},
  ${p.intWidth !== undefined ? p.intWidth : 'NULL'},
  ${p.capacity !== undefined ? p.capacity : 'NULL'},
  ${escapeSql(p.catalogYear)}
)`;
  });

  const sql = `${header}INSERT INTO ${tableName} (
  category, subcategory, material, product_code, price,
  description, interior, lifestories, lifeview, lifesymbols,
  dual_disposition, top, finish, oversize, ext_width,
  ext_height, ext_length, int_width, capacity, year
) VALUES
${valuesRows.join(',\n')};
`;

  return sql;
}

/**
 * Converts parsed product items into clean CSV text matching Supabase and Excel formats.
 */
export function convertToCsvText(items: ParsedProductItem[]): string {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'category',
    'subcategory',
    'material',
    'product_code',
    'price',
    'description',
    'interior',
    'lifestories',
    'lifeview',
    'lifesymbols',
    'dual_disposition',
    'top',
    'finish',
    'oversize',
    'ext_width',
    'ext_height',
    'ext_length',
    'int_width',
    'capacity',
    'year'
  ];

  const lines = [headers.join(',')];

  for (const p of items) {
    const row = [
      escapeCsv(p.category),
      escapeCsv(p.subcategory),
      escapeCsv(p.material),
      escapeCsv(p.productCode),
      p.price.toFixed(2),
      escapeCsv(p.description),
      escapeCsv(p.interior),
      p.lifeStories ? 'TRUE' : 'FALSE',
      p.lifeView ? 'TRUE' : 'FALSE',
      p.lifeSymbols ? 'TRUE' : 'FALSE',
      p.dualDisposition ? 'TRUE' : 'FALSE',
      escapeCsv(p.top || ''),
      escapeCsv(p.finish || ''),
      p.oversize ? 'TRUE' : 'FALSE',
      p.extWidth !== undefined ? p.extWidth : '',
      p.extHeight !== undefined ? p.extHeight : '',
      p.extLength !== undefined ? p.extLength : '',
      p.intWidth !== undefined ? p.intWidth : '',
      p.capacity !== undefined ? p.capacity : '',
      escapeCsv(p.catalogYear)
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Converts parsed product items into JSON string.
 */
export function convertToJsonText(items: ParsedProductItem[]): string {
  const products = convertParsedToProducts(items);
  return JSON.stringify(products, null, 2);
}

/**
 * Saves parsed product items directly to the local IndexedDB and optionally pushes to Supabase.
 */
export async function saveParsedProducts(
  items: ParsedProductItem[], 
  options: { pushToRemote?: boolean } = {}
): Promise<{ success: boolean; count: number; message: string; remoteSynced: boolean }> {
  const products = convertParsedToProducts(items);
  if (products.length === 0) {
    return { success: false, count: 0, message: 'No valid products to save.', remoteSynced: false };
  }

  // 1. Save to local Dexie IndexedDB
  await db.products.bulkPut(products);

  let remoteSynced = false;

  // 2. Optionally push directly to Supabase products table
  if (options.pushToRemote) {
    try {
      const client = getSupabaseClient();
      const supabasePayload = items.map(p => ({
        category: p.category,
        subcategory: p.subcategory,
        material: p.material,
        product_code: isNaN(Number(p.productCode)) ? p.productCode : Number(p.productCode),
        price: p.price,
        description: p.description,
        interior: p.interior,
        lifestories: p.lifeStories,
        lifeview: p.lifeView,
        lifesymbols: p.lifeSymbols,
        dual_disposition: p.dualDisposition,
        top: p.top,
        finish: p.finish,
        oversize: p.oversize,
        ext_width: p.extWidth,
        ext_height: p.extHeight,
        ext_length: p.extLength,
        int_width: p.intWidth,
        capacity: p.capacity,
        year: p.catalogYear
      }));

      // Ingest in batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < supabasePayload.length; i += BATCH_SIZE) {
        const batch = supabasePayload.slice(i, i + BATCH_SIZE);
        const { error } = await client.from('products').upsert(batch);
        if (error) {
          console.warn('Supabase products upsert warning:', error.message);
        }
      }
      remoteSynced = true;
    } catch (err) {
      console.warn('Could not sync to remote Supabase:', err);
    }
  }

  return {
    success: true,
    count: products.length,
    message: `Successfully loaded ${products.length} products into the catalog!`,
    remoteSynced
  };
}
