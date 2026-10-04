import { Customer, Product, SaleRecord } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    code: 'FH-101',
    name: 'Heritage Memorial Chapel & Gardens',
    contactPerson: 'Arthur Vance',
    email: 'avance@heritagememorial.com',
    phone: '(555) 234-8901',
    address: '1420 Grandview Avenue',
    city: 'Indianapolis',
    state: 'IN',
    zip: '46202',
    tier: 'Platinum',
    defaultMarkupPercent: 140, // 2.4x
    logoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=160&auto=format&fit=crop&q=80',
    notes: 'Premium partner with 4 active selection rooms. Standard showroom orders every 1st Monday.',
    createdAt: '2023-01-15T09:00:00.000Z',
    updatedAt: '2026-01-10T14:20:00.000Z',
  },
  {
    id: 'cust-2',
    code: 'FH-102',
    name: 'Oakwood Family Mortuary',
    contactPerson: 'Eleanor Sterling',
    email: 'eleanor@oakwoodmortuary.org',
    phone: '(555) 478-2231',
    address: '880 Pine Crest Boulevard',
    city: 'Columbus',
    state: 'OH',
    zip: '43215',
    tier: 'Platinum',
    defaultMarkupPercent: 150, // 2.5x
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=160&auto=format&fit=crop&q=80',
    notes: 'High volume hardwood casket purchaser. Prefers 6x6 cap cards and 2x12 rail cards.',
    createdAt: '2023-02-10T11:30:00.000Z',
    updatedAt: '2026-02-01T10:15:00.000Z',
  },
  {
    id: 'cust-3',
    code: 'FH-103',
    name: 'St. Patrick Funeral Services',
    contactPerson: 'Father Thomas Gallagher',
    email: 'tgallagher@stpatrickfunerals.com',
    phone: '(555) 891-3400',
    address: '320 Cathedral Way',
    city: 'Louisville',
    state: 'KY',
    zip: '40202',
    tier: 'Gold',
    defaultMarkupPercent: 130, // 2.3x
    notes: 'Faith-based memorial client. Specializes in classic bronze and cherry wood lines.',
    createdAt: '2023-03-22T08:00:00.000Z',
    updatedAt: '2026-01-18T16:00:00.000Z',
  },
  {
    id: 'cust-4',
    code: 'FH-104',
    name: 'Evergreen Cremation & Memorial Center',
    contactPerson: 'David Miller',
    email: 'dmiller@evergreencremation.net',
    phone: '(555) 762-9904',
    address: '512 Evergreen Parkway',
    city: 'Cincinnati',
    state: 'OH',
    zip: '45202',
    tier: 'Gold',
    defaultMarkupPercent: 160, // 2.6x
    notes: 'Growing cremation-oriented account. Needs modern 8.5x11 urn sheets and 11x17 lobby cards.',
    createdAt: '2023-05-18T10:00:00.000Z',
    updatedAt: '2026-03-02T11:45:00.000Z',
  },
  {
    id: 'cust-5',
    code: 'FH-105',
    name: 'Highland Park Funeral Directors',
    contactPerson: 'Sarah Jenkins',
    email: 'sjenkins@highlandparkfd.com',
    phone: '(555) 323-5511',
    address: '1904 Summit Ridge Road',
    city: 'Pittsburgh',
    state: 'PA',
    zip: '15206',
    tier: 'Silver',
    defaultMarkupPercent: 135,
    notes: 'Historic suburban funeral home. Strong focus on 18G steel line and personalized corners.',
    createdAt: '2023-08-01T14:00:00.000Z',
    updatedAt: '2026-01-25T09:20:00.000Z',
  },
  {
    id: 'cust-6',
    code: 'FH-106',
    name: 'Clearwater Funeral & Crematory',
    contactPerson: 'Robert Chen',
    email: 'rchen@clearwaterfuneral.com',
    phone: '(555) 601-7782',
    address: '400 Lakeview Terrace',
    city: 'Chicago',
    state: 'IL',
    zip: '60611',
    tier: 'Standard',
    defaultMarkupPercent: 125,
    notes: 'Regional associate facility. Focus on basic steel and keepsake bundles.',
    createdAt: '2024-01-12T13:30:00.000Z',
    updatedAt: '2026-02-14T15:10:00.000Z',
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'BV-A60-845',
    name: 'Promethean 48 oz. Polished Bronze',
    category: 'Metal Caskets',
    catalogYear: '2025',
    material: '48 oz. Solid Polished Bronze (Prestige Line)',
    interior: 'Champagne Velvet with Hand-Tufted Cap Panel',
    exteriorFinish: 'High-Lustre Polished Bronze with 14K Gold Accents',
    dimensions: '83.5" L x 28.5" W x 23.5" H',
    weightLbs: 260,
    features: [
      'Gasketed hermetic continuous seal',
      'Solid bronze cast swing bar hardware',
      'Living Memorial Tree Planting eligible',
      'Living Memorial Certificate included',
      'Memory Safe drawer for personal mementos'
    ],
    wholesalePrice: 4250,
    msrp: 9800,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'
    ],
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
  },
  {
    id: 'prod-2',
    code: 'BV-H18-420',
    name: 'Golden Sienna 18 Gauge Steel',
    category: 'Metal Caskets',
    catalogYear: '2025',
    material: '18 Gauge High-Tensile Carbon Steel',
    interior: 'Rosetan Crepe with Tailored Piping',
    exteriorFinish: 'Tuscan Bronze & Burnished Copper Tone Finish',
    dimensions: '83.0" L x 28.0" W x 23.0" H',
    weightLbs: 210,
    features: [
      'Continuous seam welded gasketed protection',
      'Batesville Charpente interior adjustment system',
      'Locking mechanism with hidden key actuation',
      'Living Memorial Program registration',
      'Interchangeable corner art corners (Angel, Cross, Military)'
    ],
    wholesalePrice: 1650,
    msrp: 3850,
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-01-05T00:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'prod-3',
    code: 'BV-WD-780',
    name: 'Premier Solid Mahogany',
    category: 'Hardwood Caskets',
    catalogYear: '2025',
    material: 'Finest Handcrafted Solid Ribbon Mahogany',
    interior: 'Pearl Velvet with French Fold Fluting',
    exteriorFinish: 'Deep Hand-Rubbed High Gloss Georgetown Finish',
    dimensions: '82.5" L x 28.0" W x 22.5" H',
    weightLbs: 245,
    features: [
      'Genuine hand-selected solid ribbon mahogany',
      'Sculpted solid wood swing bar handles',
      'Adjustable wire-spring bed mattress',
      'Living Memorial Program eligible',
      'Prestige master craftsman seal of authenticity'
    ],
    wholesalePrice: 3400,
    msrp: 7900,
    imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-01-10T00:00:00.000Z',
    updatedAt: '2026-01-20T11:00:00.000Z',
  },
  {
    id: 'prod-4',
    code: 'BV-WD-612',
    name: 'Diplomat Solid Walnut & Cherry',
    category: 'Hardwood Caskets',
    catalogYear: '2025',
    material: 'Selected Solid Pennsylvania Walnut & Cherry Accents',
    interior: 'Almond Velvet with Sunburst Radiance Cap',
    exteriorFinish: 'Hand-Polished Satin Amber Finish',
    dimensions: '82.0" L x 27.5" W x 22.5" H',
    weightLbs: 230,
    features: [
      'Bookmatched natural wood grain pattern',
      'Memory Safe drawer built into foot end',
      'Living Memorial Program registration',
      'Batesville Safety Grip continuous wood bar',
      'Pre-slotted for interchangeable personal corner emblems'
    ],
    wholesalePrice: 2850,
    msrp: 6450,
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-02-01T00:00:00.000Z',
    updatedAt: '2026-01-15T09:30:00.000Z',
  },
  {
    id: 'prod-5',
    code: 'BV-ST-220',
    name: 'Silver Sapphire 18 Gauge Steel',
    category: 'Metal Caskets',
    catalogYear: '2024',
    material: '18 Gauge Heavy Cold-Rolled Steel',
    interior: 'Silver Shantung Crepe with Tailored Box Pleats',
    exteriorFinish: 'Midnight Blue & Brushed Silver Two-Tone Finish',
    dimensions: '83.0" L x 28.0" W x 23.0" H',
    weightLbs: 205,
    features: [
      'Full protective rubber one-piece perimeter gasket',
      'Cathodic rust-inhibitive primer undercoat',
      'Living Memorial Program tree planting',
      'Chrome-plated die cast bar hardware',
      'Personalization medallion alcove in head panel'
    ],
    wholesalePrice: 1550,
    msrp: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-02-15T00:00:00.000Z',
    updatedAt: '2026-02-18T14:15:00.000Z',
  },
  {
    id: 'prod-6',
    code: 'BV-WD-340',
    name: 'Autumn Oak Solid Timber',
    category: 'Hardwood Caskets',
    catalogYear: '2024',
    material: 'Solid American White Oak',
    interior: 'Rosetan Crepe with Basketweave Embroidery',
    exteriorFinish: 'Natural Honey Grain Warm Satin Finish',
    dimensions: '82.0" L x 27.5" W x 22.0" H',
    weightLbs: 220,
    features: [
      'Authentic rough-sawn grain texture option',
      'Solid wood stationary bar hardware with oak dowels',
      'Adjustable bed mattress mechanism',
      'Biodegradable interior lining option available',
      'Living Memorial certificate'
    ],
    wholesalePrice: 2150,
    msrp: 4950,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-03-01T00:00:00.000Z',
    updatedAt: '2026-01-10T16:00:00.000Z',
  },
  {
    id: 'prod-7',
    code: 'BV-URN-108',
    name: 'Ashen Pewter & Brass Urn',
    category: 'Cremation & Urns',
    catalogYear: '2025',
    material: 'Solid Spun Brass with Brushed Pewter Electroplate',
    interior: 'Polished Felt Chamber (200 cu. in.)',
    exteriorFinish: 'Hand-Engraved Silver Leaf Laurel Border',
    dimensions: '10.5" H x 6.8" Diameter',
    weightLbs: 6.5,
    features: [
      'Threaded screw-top airtight lid closure',
      'Soft felt bottom protects furniture surfaces',
      'Includes velvet transport and presentation pouch',
      'Engravable face for custom name, dates, & scripture'
    ],
    wholesalePrice: 195,
    msrp: 495,
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-03-10T00:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 'prod-8',
    code: 'BV-URN-215',
    name: 'Bradbury Solid Pecan Urn Chest',
    category: 'Cremation & Urns',
    catalogYear: '2025',
    material: 'Solid Northern Pecan with Walnut Inlay',
    interior: 'Satin Lined Memorial Compartment (215 cu. in.)',
    exteriorFinish: 'Warm Walnut Furniture Finish',
    dimensions: '8.5" H x 11.5" W x 10.5" D',
    weightLbs: 8.0,
    features: [
      'Bottom-loading panel secured with brass machine screws',
      'Batesville Living Memorial registered product',
      'Compatible with custom laser engraving and photo tiles',
      'Spacious interior accommodates standard temporary container'
    ],
    wholesalePrice: 275,
    msrp: 695,
    imageUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-04-01T00:00:00.000Z',
    updatedAt: '2026-01-20T09:00:00.000Z',
  },
  {
    id: 'prod-9',
    code: 'BV-VLT-500',
    name: 'Trigard Venetian Lined Burial Vault',
    category: 'Burial Vaults',
    catalogYear: '2024',
    material: 'High-Strength Reinforced Concrete with ABS Polymer Liner',
    interior: 'Seamless High-Impact Thermoformed Plastic Liner',
    exteriorFinish: 'Two-Tone Cathedral Gray with White Marble Marbling',
    dimensions: '90.0" L x 34.0" W x 33.0" H',
    weightLbs: 2400,
    features: [
      'Tongue-and-groove joint sealed with waterproof butyl mastic',
      'Structural ribbed arch cover resists sub-surface earth load',
      'Includes personalized brass nameplate and customized emblem',
      'Tested to withstand up to 5,000 lbs/sq. ft. surface load'
    ],
    wholesalePrice: 950,
    msrp: 2250,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    isActive: true,
    createdAt: '2023-04-15T00:00:00.000Z',
    updatedAt: '2026-02-12T15:30:00.000Z',
  }
];

export function generateSeedSales(): SaleRecord[] {
  const sales: SaleRecord[] = [];
  let orderSeq = 10001;

  // Authentic Batesville historical performance data (October to September)
  const HISTORICAL_TARGETS: Record<string, { quota: number; pct: number; sales: number }> = {
    '2017-18': { quota: 3420000, pct: 96.38, sales: 3296196 },
    '2018-19': { quota: 3580000, pct: 94.53, sales: 3384174 },
    '2019-20': { quota: 3750000, pct: 117.51, sales: 4406625 },
    '2020-21': { quota: 3920000, pct: 114.37, sales: 4483304 },
    '2021-22': { quota: 4100000, pct: 115.25, sales: 4725250 },
    '2022-23': { quota: 4281810, pct: 106.00, sales: 4538719 },
    '2023-24': { quota: 4680827, pct: 102.21, sales: 4784273 },
    '2024-25': { quota: 5060563, pct: 106.20, sales: 5374318 },
    '2025-26': { quota: 5920915, pct: 91.10, sales: 5393954 },
  };

  const weights = [
    0.080769, 0.070138, 0.087775, 0.090957, 0.086646, 0.090273,
    0.082576, 0.077197, 0.080040, 0.087166, 0.081841, 0.084622
  ];

  const fiscalMonthDefs = [
    { fm: 1,  monthCode: 'OCT', monthName: 'Oct', calMonth: 10, isNextYear: false },
    { fm: 2,  monthCode: 'NOV', monthName: 'Nov', calMonth: 11, isNextYear: false },
    { fm: 3,  monthCode: 'DEC', monthName: 'Dec', calMonth: 12, isNextYear: false },
    { fm: 4,  monthCode: 'JAN', monthName: 'Jan', calMonth: 1,  isNextYear: true },
    { fm: 5,  monthCode: 'FEB', monthName: 'Feb', calMonth: 2,  isNextYear: true },
    { fm: 6,  monthCode: 'MAR', monthName: 'Mar', calMonth: 3,  isNextYear: true },
    { fm: 7,  monthCode: 'APR', monthName: 'Apr', calMonth: 4,  isNextYear: true },
    { fm: 8,  monthCode: 'MAY', monthName: 'May', calMonth: 5,  isNextYear: true },
    { fm: 9,  monthCode: 'JUN', monthName: 'Jun', calMonth: 6,  isNextYear: true },
    { fm: 10, monthCode: 'JUL', monthName: 'Jul', calMonth: 7,  isNextYear: true },
    { fm: 11, monthCode: 'AUG', monthName: 'Aug', calMonth: 8,  isNextYear: true },
    { fm: 12, monthCode: 'SEP', monthName: 'Sep', calMonth: 9,  isNextYear: true },
  ];

  const daySchedule = [2, 5, 8, 11, 14, 17, 20, 23, 26, 28];
  const orderWeights = [0.09, 0.11, 0.10, 0.08, 0.12, 0.09, 0.11, 0.10, 0.10, 0.10];

  // 1. Generate full 12-month distributor volume sales for historical years 2017-18 through 2025-26
  for (const [fyKey, target] of Object.entries(HISTORICAL_TARGETS)) {
    const baseYear = parseInt(fyKey.split('-')[0], 10);
    const totalTarget = target.sales;

    // Precalculate 12 monthly targets summing exactly to totalTarget
    const monthlyTargets: number[] = [];
    let runningMonthSum = 0;
    for (let idx = 0; idx < 12; idx++) {
      if (idx === 11) {
        monthlyTargets.push(totalTarget - runningMonthSum);
      } else {
        const amt = Math.round(totalTarget * weights[idx]);
        monthlyTargets.push(amt);
        runningMonthSum += amt;
      }
    }

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const def = fiscalMonthDefs[mIdx];
      const calYear = def.isNextYear ? baseYear + 1 : baseYear;
      const calMonth = def.calMonth;
      const monthTarget = monthlyTargets[mIdx];

      let runningOrderSum = 0;
      const numOrders = daySchedule.length;

      for (let oIdx = 0; oIdx < numOrders; oIdx++) {
        let orderAmount = 0;
        if (oIdx === numOrders - 1) {
          orderAmount = monthTarget - runningOrderSum;
        } else {
          orderAmount = Math.round(monthTarget * orderWeights[oIdx]);
          runningOrderSum += orderAmount;
        }

        const custIdx = (oIdx + mIdx + baseYear) % INITIAL_CUSTOMERS.length;
        const customer = INITIAL_CUSTOMERS[custIdx];

        const prodIdx = (oIdx * 3 + mIdx * 2 + baseYear) % INITIAL_PRODUCTS.length;
        const product = INITIAL_PRODUCTS[prodIdx];

        const day = (calMonth === 2 && daySchedule[oIdx] > 28) ? 28 : daySchedule[oIdx];
        const dayStr = day.toString().padStart(2, '0');
        const monthStr = calMonth.toString().padStart(2, '0');
        const saleDate = `${calYear}-${monthStr}-${dayStr}`;

        const unitPrice = product.wholesalePrice || 2400;
        const quantity = Math.max(1, Math.round(orderAmount / unitPrice));

        sales.push({
          id: `sale-${calYear}-${monthStr}-${orderSeq}`,
          saleId: orderSeq,
          year: fyKey,
          month: def.monthCode,
          day: dayStr,
          program: customer.program || 'OBB',
          accountName: customer.name,
          accountNumber: customer.accountNumber || (100 + custIdx),
          productCode: product.code,
          category: product.category,
          subcategory: product.subcategory || (product.material ? product.material.slice(0, 15) : 'Commercial'),
          description: product.name,
          quantity,
          cost: orderAmount,
          customerId: customer.id,
          productId: product.id,
          orderNumber: `ORD-${fyKey}-${orderSeq}`,
          unitPrice: Math.round(orderAmount / quantity),
          totalAmount: orderAmount,
          saleDate,
          fiscalMonth: def.fm,
          calMonth,
          notes: `Distributor wholesale delivery for ${customer.name}`
        });

        orderSeq++;
      }
    }
  }

  // 2. Generate live incoming Month 1 (October 2026) orders for FY 2026-27
  const fy27Month1Target = 462500;
  let fy27Running = 0;
  const fy27DaySchedule = [2, 5, 8, 12, 16, 20, 24, 28];
  const fy27OrderWeights = [0.12, 0.14, 0.11, 0.13, 0.15, 0.12, 0.11, 0.12];

  for (let oIdx = 0; oIdx < fy27DaySchedule.length; oIdx++) {
    let orderAmount = 0;
    if (oIdx === fy27DaySchedule.length - 1) {
      orderAmount = fy27Month1Target - fy27Running;
    } else {
      orderAmount = Math.round(fy27Month1Target * fy27OrderWeights[oIdx]);
      fy27Running += orderAmount;
    }

    const custIdx = oIdx % INITIAL_CUSTOMERS.length;
    const customer = INITIAL_CUSTOMERS[custIdx];
    const prodIdx = (oIdx * 2) % INITIAL_PRODUCTS.length;
    const product = INITIAL_PRODUCTS[prodIdx];
    const dayStr = fy27DaySchedule[oIdx].toString().padStart(2, '0');
    const saleDate = `2026-10-${dayStr}`;
    const unitPrice = product.wholesalePrice || 2400;
    const quantity = Math.max(1, Math.round(orderAmount / unitPrice));

    sales.push({
      id: `sale-2026-10-${orderSeq}`,
      saleId: orderSeq,
      year: '2026-27',
      month: 'OCT',
      day: dayStr,
      program: customer.program || 'OBB',
      accountName: customer.name,
      accountNumber: customer.accountNumber || (100 + custIdx),
      productCode: product.code,
      category: product.category,
      subcategory: product.subcategory || 'Commercial',
      description: product.name,
      quantity,
      cost: orderAmount,
      customerId: customer.id,
      productId: product.id,
      orderNumber: `ORD-2026-27-${orderSeq}`,
      unitPrice: Math.round(orderAmount / quantity),
      totalAmount: orderAmount,
      saleDate,
      fiscalMonth: 1,
      calMonth: 10,
      notes: `Live October delivery for ${customer.name}`
    });

    orderSeq++;
  }

  return sales;
}
