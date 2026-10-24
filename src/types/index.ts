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

export type CustomerTier = 'ARB' | 'PLN' | 'PA' | 'SPP' | 'AMP' | 'Standard' | string;

export interface Customer {
  id: string; // e.g. "cust-1"
  // Exact 19 Supabase 'customers' table columns
  customerId?: number | string; // customer_id
  accountNumber?: number | string; // Account Number
  name: string; // Name
  address?: string; // Address
  city?: string; // City
  state?: string; // State
  primaryContact?: string; // Primary Contact
  contactPhone?: string; // Contact Phone
  mainPhoneNumber?: string; // Main Phone Number
  deliveryDays?: string; // Delivery Days
  customerSpectrum?: string; // Customer Spectrum
  customerPurchaseProgram?: string; // Customer Purchase Program
  netUrnPrice?: string | number; // Net Urn Price
  programSubGroup2?: string; // Program Sub-Group 2
  contactEmail?: string; // Contact Email
  digitalShowroomMigrationPriority?: string; // Digital Showroom Migration Priority
  customerType?: string; // Customer Type
  attitudeTowardsBatesville?: string; // Attitude towards Batesville
  primaryBurialProductsCompetitor?: string; // Primary Burial Products Competitor
  inTerritory?: boolean; // in_territory: false = removed from territory (hidden from lists, sales still counted)

  // Legacy & convenience aliases for app compatibility
  code: string; // Account Number as string
  accountName?: string;
  mainContact?: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  zip?: string;
  secondContact?: string;
  thirdContact?: string;
  burialDiscount?: number;
  cremationDiscount?: number;
  rebate?: number;
  selectionRoom?: boolean;
  selectionRoomStyle?: string;
  program?: string;
  tier: CustomerTier;
  defaultMarkupPercent: number;
  logoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  // Exact 19 Supabase 'products' table columns
  product_id?: number; // product_id (int8)
  productId?: number;
  year?: string; // year (text)
  category: string; // category (text)
  product_code?: number | string; // product_code (int8)
  productCode?: number | string;
  description?: string; // description (text)
  interior?: string | null; // interior (text) - nullable (e.g. urns, keepsakes do not have interiors)
  order_qty?: number | null; // order_qty (int8)
  orderQty?: number | null;
  accessories?: number | string | null; // accessories (int8)
  lifeview?: string | boolean | null; // lifeview (text)
  dual_disposition?: string | boolean | null; // dual_disposition (text)
  dualDisposition?: boolean;
  top?: string | null; // top (text) - nullable
  finish?: string | null; // finish (text) - nullable (e.g. unfinished or cloth items)
  oversize?: string | boolean | null; // oversize (text)
  ext_width?: number | null; // ext_width (float8)
  extWidth?: number | null;
  ext_length?: number | null; // ext_length (float8)
  extLength?: number | null;
  int_width?: number | null; // int_width (float8)
  intWidth?: number | null;
  ext_height?: number | null; // ext_height (float8)
  extHeight?: number | null;
  weight_capacity?: number | null; // weight_capacity (numeric)
  weightCapacity?: number | null;
  capacity?: number;
  discountinued?: string | boolean | null; // discountinued (text - note table spelling)
  discontinued?: string | boolean | null;
  price?: number; // price (numeric)

  // Merchandising & Feature Flags
  material?: string; // material (text)
  subcategory?: string; // subcategory (text)
  lifestories?: boolean; // lifestories (bool)
  lifesymbols?: boolean; // lifesymbols (bool)

  // Mapped & Display Fields
  code: string; // Batesville SKU / Model e.g. "146799"
  name: string; // Model name / description
  catalogYear: string | number; // e.g. "2016-17", "2017-18", "2024", "2025"
  exteriorFinish?: string;
  wholesalePrice: number;
  msrp?: number;
  dimensions?: string;
  weightLbs?: number;
  features: string[];
  imageUrl: string;
  additionalImages?: string[];
  lithoUrl?: string;
  lithoFileName?: string;
  lithoFileType?: string;
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
  subcategory?: string; // subcategory (e.g. "18 GA", "OAK", "HARDWOOD")
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

export type CardDimension = '6x6' | '4x6' | '2x12' | '8.5x11' | '11x17';

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

export interface LithoItem {
  id: string;
  fileName: string;
  productCode?: string;
  productName?: string;
  fileUrl: string; // Supabase storage public URL or data URL
  fileType: 'pdf' | 'image' | string;
  sizeBytes?: number;
  uploadedAt: string;
  isRemote?: boolean;
}

export type RoomShape = 'oval' | 'square' | 'rectangle' | 'l-shaped';
export type RoomCapacity = 'small' | 'medium' | 'large';

export interface FloorSlot {
  id: string;
  slotNumber: number;
  label: string;
  type: 'casket' | 'urn';
  // Double Rack support for caskets
  isDoubleRack?: boolean;
  rackType?: 'single' | 'double' | 'pedestal' | 'urn-shelf' | 'urn-tower';
  levelNumber?: number; // 1 = Floor / Bottom Rack / Shelf 1, 2 = Top Rack / Shelf 2, 3..5 = Urn Shelves
  tierLevel?: string; // 'Double Rack - Top', 'Double Rack - Bottom', 'Shelf 1 (Bottom)', 'Floor'
  shelfSlotPosition?: number; // 1, 2, 3 across the shelf
  productId?: string;
  productCode?: string;
  productName?: string;
  category?: string;
  wholesalePrice?: number;
  // Customer-Specific Pricing Fields
  masterListPrice?: number;
  discountPercent?: number;
  netCost?: number;
  retailPrice?: number;
  profitMarginDollars?: number;
  profitMarginPercent?: number;
  imageUrl?: string;
  wallZone?: string;
  posX?: number;
  posY?: number;
  orientation_deg?: number;
  notes?: string;
}

export interface CustomerProductPricing {
  id?: number | string;
  account_number: number | string;
  product_code: number | string;
  catalog_year: string;
  master_list_price: number;
  discount_percent: number;
  net_cost: number;
  retail_price?: number;
  profit_margin_dollars?: number;
  profit_margin_percent?: number;
  source?: 'formula' | 'custom_override' | 'gpl_import';
  created_at?: string;
  updated_at?: string;
}


export interface CustomerRoom {
  room_id?: string;
  'account_#'?: number | string;
  account_name?: string;
  room_name?: string;
  room_shape?: RoomShape | string;
  length_ft?: number;
  width_ft?: number;
  ceiling_height_ft?: number;
  sq_footage?: number;
  door_wall?: string;
  door_pos_ft?: number;
  door_width_ft?: number;
  // Multiple doors option
  has_door_2?: boolean;
  door_2_wall?: string;
  door_2_pos_ft?: number;
  door_2_width_ft?: number;
  // Room Wing option
  has_wing?: boolean;
  wing_wall?: string;
  wing_offset_ft?: number;
  wing_length_ft?: number;
  wing_width_ft?: number;
  // L-Shape specific layout dimensions
  l_west_lower_ft?: number;
  l_west_upper_ft?: number;
  l_cutout_x_ft?: number;
  max_casket_bays?: number;
  notes?: string;
}

export interface CustomerFloorPlan {
  customerId: string;
  customerName: string;
  roomShape: RoomShape;
  roomCapacity: RoomCapacity;
  slots: FloorSlot[];
  roomMeta?: CustomerRoom;
  updatedAt: string;
}

export interface SalesQuotaItem {
  id?: string;
  fiscal_year: string;
  fiscal_month: number;
  month_name: string;
  quota_amount: number;
  working_days: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FiscalMonthQuotaMetrics {
  fiscalMonth: number;
  monthName: string;
  quota: number;
  cumulativeQuota: number;
  sales: number;
  cumulativeSales: number;
  cumulativeVariance: number;
  monthlyVariance: number;
  workingDays: number;
  dailySales: number;
  dailyRequired: number;
  attainmentPercent: number;
  annualPercent: number;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  salesCount?: number;
}

export interface AnnualQuotaTrackerData {
  fiscalYear: string;
  annualQuota: number;
  totalActualSales: number;
  totalVariance: number;
  overallAttainmentPercent: number;
  totalWorkingDays: number;
  months: FiscalMonthQuotaMetrics[];
  isQuotaTbd?: boolean;
}

