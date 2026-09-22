export type ProductCategory = 
  | 'Burial Solutions - Wood'
  | 'Burial Solutions - Metal'
  | 'Burial Solutions - Cloth'
  | 'Burial Solutions - NewPointe'
  | 'Cremation Options - Full Size Urns'
  | 'Cremation Options - Cremation Containers'
  | 'Memorial Solutions - Keepsakes'
  | 'Metal Caskets'
  | 'Hardwood Caskets'
  | 'Cremation & Urns'
  | 'Burial Vaults'
  | 'Keepsakes & Jewelry'
  | string;

export type CustomerTier = 'Platinum' | 'Gold' | 'Silver' | 'Standard';

export interface Customer {
  id: string; // e.g. "cust-1"
  customerId?: number; // customer_id
  accountNumber?: number | string; // account_#
  code: string; // account_# as string
  name: string; // account_name
  accountName?: string; // account_name
  mainContact?: string; // Main Contact
  contactPerson: string; // Main Contact alias
  email?: string; // email
  secondContact?: string; // 2nd Contact
  thirdContact?: string; // 3rd Contact
  burialDiscount?: number; // burial_discount (e.g. 46)
  cremationDiscount?: number; // cremation_discount (e.g. 30)
  rebate?: number; // rebate
  selectionRoom?: boolean; // selectionroom (true / false)
  selectionRoomStyle?: string; // selectionroom_style ("Full Size" | "Only Urns")
  program?: string; // program ("ARB" | "PLN" | "PA" | "SPP" | "AMP")
  tier: CustomerTier;
  defaultMarkupPercent: number; // calculated from discounts or default
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  logoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  // Exact Supabase 'products' table columns
  productId?: number; // product_id (int8)
  category: string; // category (text)
  material: string; // material (text)
  subcategory?: string; // subcategory (text)
  productCode?: number | string; // product_code (int8)
  price?: number; // price (numeric)
  description?: string; // description (text)
  interior: string; // interior (text)
  lifestories?: boolean; // lifestories (bool)
  lifeview?: boolean; // lifeview (bool)
  lifesymbols?: boolean; // lifesymbols (bool)
  dualDisposition?: boolean; // dual_disposition (bool)
  dual_disposition?: boolean; // raw alias
  top?: string; // top (text)
  finish?: string; // finish (text)
  oversize?: boolean; // oversize (bool)
  extWidth?: number; // ext_width (float8)
  extHeight?: number; // ext_height (float8)
  extLength?: number; // ext_length (float8)
  intWidth?: number; // int_width (float8)
  ext_width?: number;
  ext_height?: number;
  ext_length?: number;
  int_width?: number;
  capacity?: number; // capacity (numeric)
  year?: string; // year (text)

  // Mapped & Display Fields
  code: string; // Batesville SKU / Model e.g. "146799"
  name: string; // Model name / description
  catalogYear: string | number; // e.g. "2016-17", "2017-18", "2024", "2025"
  exteriorFinish: string;
  wholesalePrice: number;
  msrp?: number;
  dimensions?: string;
  weightLbs?: number;
  features: string[];
  imageUrl: string;
  additionalImages?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleRecord {
  id: string;
  saleId: number; // sale_id
  year: string; // year (e.g. "2016-17", "2020-21")
  month: string; // month text (e.g. "OCT", "AUG", "SEP")
  day: string | number; // day (e.g. "14", "30")
  program: string; // program (e.g. "OBB", "ARB")
  accountName: string; // account_name
  accountNumber: number | string; // account_#
  productCode: string; // product_code (e.g. "146799")
  category: string; // category
  description: string; // description
  quantity: number; // qty
  cost: number; // cost
  // Mapped/computed fields
  customerId: string; // mapped customer reference
  productId: string; // mapped product reference
  orderNumber: string;
  unitPrice: number;
  totalAmount: number;
  saleDate: string;
  fiscalMonth: number; // 1 = OCT, 2 = NOV ... 12 = SEP
  calMonth: number; // 1 = JAN ... 12 = DEC
  notes?: string;
}

export type CardDimension = '6x6' | '2x12' | '8.5x11' | '11x17';

export type CardTheme = 
  | 'classic-burgundy' 
  | 'modern-dark' 
  | 'clean-white' 
  | 'funeral-navy' 
  | 'champagne-gold';

export interface PriceCardConfig {
  dimension: CardDimension;
  customerId: string;
  productId: string;
  additionalProductIds?: string[];
  customPrice?: number;
  markupPercent?: number;
  catalogYear?: string | number;
  showImage: boolean;
  showSpecs: boolean;
  showFeatures: boolean;
  showModelCode: boolean;
  showCustomerLogo: boolean;
  showMonthlyPayment: boolean;
  monthlyInterestRate?: number;
  monthlyTermMonths: number;
  theme: CardTheme;
  customTitle?: string;
  customSubtitle?: string;
  footerText?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  lastSyncedAt?: string;
  isConnected: boolean;
}

export interface SalesYoYMetrics {
  currentYear: string | number;
  previousYear: string | number;
  currentRevenue: number;
  previousRevenue: number;
  revenueGrowthPercent: number;
  currentUnits: number;
  previousUnits: number;
  unitGrowthPercent: number;
  monthlyBreakdown: {
    month: number;
    monthName: string;
    currentRevenue: number;
    previousRevenue: number;
    growthPercent: number;
    currentUnits: number;
    previousUnits: number;
  }[];
}

export interface CasketImageItem {
  id: string;
  fileName: string;
  productCode?: string;
  productName?: string;
  dataUrl: string; // base64 or remote URL
  uploadedAt: string;
  sizeBytes?: number;
}

export type RoomShape = 'oval' | 'square' | 'rectangle' | 'l-shaped';
export type RoomCapacity = 'small' | 'medium' | 'large';

export interface FloorSlot {
  id: string;
  slotNumber: number;
  label: string;
  type: 'casket' | 'urn';
  productId?: string;
  productCode?: string;
  productName?: string;
  category?: string;
  wholesalePrice?: number;
  imageUrl?: string;
}

export interface CustomerFloorPlan {
  customerId: string;
  customerName: string;
  roomShape: RoomShape;
  roomCapacity: RoomCapacity;
  slots: FloorSlot[];
  updatedAt: string;
}
