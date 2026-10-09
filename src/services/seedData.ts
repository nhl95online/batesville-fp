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
  },
  {
    id: 'cust-262863',
    code: '262863',
    accountNumber: 262863,
    name: 'Vescio Funeral Home Woodbridge Chapel',
    contactPerson: 'Dave Albanese',
    email: 'info@vesciofuneralhome.com',
    phone: '(905) 850-3332',
    address: '8101 Weston Road',
    city: 'Woodbridge',
    state: 'ON',
    zip: 'L4L 1A6',
    tier: 'Platinum',
    program: 'PA',
    selectionRoom: true,
    selectionRoomStyle: 'Full Size',
    burialDiscount: 32,
    cremationDiscount: 15,
    rebate: 21,
    defaultMarkupPercent: 145,
    notes: 'Promethean on an angle, and a small bloc in the entrance to the right. 16 casket selection room.',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
  },
  {
    id: 'cust-919742',
    code: '919742',
    accountNumber: 919742,
    name: 'Guenette Funeral Home',
    contactPerson: 'Serge Guenette',
    email: 'info@guenettefuneral.com',
    phone: '(705) 362-4321',
    address: '108 17th Avenue',
    city: 'Kapuskasing',
    state: 'ON',
    zip: 'P5N 1M5',
    tier: 'Gold',
    program: 'Standard',
    selectionRoom: true,
    selectionRoomStyle: 'Full Size',
    defaultMarkupPercent: 140,
    notes: 'Urn Wall on the left side of the upside down L-Shaped Room, All caskets are currently on DOUBLE RACKS. 24 showroom units.',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
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

  // 3. Generate authentic showroom client reorders for Vescio Funeral Home Woodbridge Chapel (Account 262863)
  const VESCIO_SHOWROOM_MODELS = [
    { code: '255455', name: 'OT9 825 DH Onyx', category: 'Burial - Metal', subcategory: 'Metal', cost: 1280.00, monthlyOrders: [
      { year: '2024-25', mCode: 'NOV', fm: 2, cm: 11, day: '14', qty: 2 },
      { year: '2024-25', mCode: 'FEB', fm: 5, cm: 2, day: '18', qty: 3 },
      { year: '2024-25', mCode: 'MAY', fm: 8, cm: 5, day: '22', qty: 3 },
      { year: '2024-25', mCode: 'AUG', fm: 11, cm: 8, day: '19', qty: 3 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '12', qty: 2 },
      { year: '2025-26', mCode: 'JAN', fm: 4, cm: 1, day: '16', qty: 2 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '20', qty: 3 },
      { year: '2025-26', mCode: 'MAY', fm: 8, cm: 5, day: '15', qty: 2 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '24', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '18', qty: 2 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '05', qty: 1 }
    ]},
    { code: '261097', name: 'OT37 833 D Brushed Merlot', category: 'Burial - Metal', subcategory: 'Metal', cost: 1271.48, monthlyOrders: [
      { year: '2024-25', mCode: 'DEC', fm: 3, cm: 12, day: '10', qty: 2 },
      { year: '2024-25', mCode: 'MAR', fm: 6, cm: 3, day: '15', qty: 3 },
      { year: '2024-25', mCode: 'JUL', fm: 10, cm: 7, day: '20', qty: 2 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '18', qty: 2 },
      { year: '2025-26', mCode: 'FEB', fm: 5, cm: 2, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '22', qty: 2 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '16', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '22', qty: 2 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '08', qty: 1 }
    ]},
    { code: '251625', name: 'Dalton Select', category: 'Burial - Wood - Custom', subcategory: 'Wood', cost: 1200.00, monthlyOrders: [
      { year: '2024-25', mCode: 'OCT', fm: 1, cm: 10, day: '22', qty: 3 },
      { year: '2024-25', mCode: 'JAN', fm: 4, cm: 1, day: '18', qty: 3 },
      { year: '2024-25', mCode: 'APR', fm: 7, cm: 4, day: '15', qty: 3 },
      { year: '2024-25', mCode: 'AUG', fm: 11, cm: 8, day: '21', qty: 3 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '08', qty: 2 },
      { year: '2025-26', mCode: 'JAN', fm: 4, cm: 1, day: '24', qty: 2 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '18', qty: 3 },
      { year: '2025-26', mCode: 'MAY', fm: 8, cm: 5, day: '26', qty: 2 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'AUG', fm: 11, cm: 8, day: '25', qty: 3 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '03', qty: 1 }
    ]},
    { code: '258838', name: '4V4 825 HD Montgomery Red', category: 'Burial - Wood - Custom', subcategory: 'Wood', cost: 994.50, monthlyOrders: [
      { year: '2024-25', mCode: 'DEC', fm: 3, cm: 12, day: '15', qty: 2 },
      { year: '2024-25', mCode: 'APR', fm: 7, cm: 4, day: '18', qty: 2 },
      { year: '2024-25', mCode: 'AUG', fm: 11, cm: 8, day: '20', qty: 2 },
      { year: '2025-26', mCode: 'DEC', fm: 3, cm: 12, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '22', qty: 2 },
      { year: '2025-26', mCode: 'JUN', fm: 9, cm: 6, day: '18', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '14', qty: 2 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '06', qty: 1 }
    ]},
    { code: '205161', name: '4V1 891 HD Trenton', category: 'Burial - Wood', subcategory: 'Wood', cost: 874.54, monthlyOrders: [
      { year: '2024-25', mCode: 'NOV', fm: 2, cm: 11, day: '19', qty: 3 },
      { year: '2024-25', mCode: 'MAR', fm: 6, cm: 3, day: '12', qty: 3 },
      { year: '2024-25', mCode: 'JUL', fm: 10, cm: 7, day: '28', qty: 3 },
      { year: '2025-26', mCode: 'OCT', fm: 1, cm: 10, day: '24', qty: 2 },
      { year: '2025-26', mCode: 'JAN', fm: 4, cm: 1, day: '15', qty: 2 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '19', qty: 3 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '22', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '28', qty: 2 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '07', qty: 1 }
    ]},
    { code: '242475', name: 'Q01 8J5 CAH Heirloom Pewter', category: 'Burial - Metal', subcategory: 'Metal', cost: 1500.00, monthlyOrders: [
      { year: '2024-25', mCode: 'JAN', fm: 4, cm: 1, day: '20', qty: 2 },
      { year: '2024-25', mCode: 'MAY', fm: 8, cm: 5, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '25', qty: 2 },
      { year: '2025-26', mCode: 'FEB', fm: 5, cm: 2, day: '18', qty: 2 },
      { year: '2025-26', mCode: 'MAY', fm: 8, cm: 5, day: '12', qty: 2 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '20', qty: 2 }
    ]},
    { code: '252313', name: '4V2 825 HD Weyburn-Last Supper', category: 'Burial - Wood - Custom', subcategory: 'Wood', cost: 1534.91, monthlyOrders: [
      { year: '2024-25', mCode: 'FEB', fm: 5, cm: 2, day: '16', qty: 2 },
      { year: '2024-25', mCode: 'JUN', fm: 9, cm: 6, day: '21', qty: 2 },
      { year: '2025-26', mCode: 'DEC', fm: 3, cm: 12, day: '18', qty: 2 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'AUG', fm: 11, cm: 8, day: '11', qty: 2 }
    ]},
    { code: '257956', name: 'QD2 8F3 A Pisces Silver', category: 'Burial - Metal', subcategory: 'Metal', cost: 900.00, monthlyOrders: [
      { year: '2024-25', mCode: 'OCT', fm: 1, cm: 10, day: '16', qty: 2 },
      { year: '2024-25', mCode: 'FEB', fm: 5, cm: 2, day: '22', qty: 2 },
      { year: '2024-25', mCode: 'JUN', fm: 9, cm: 6, day: '14', qty: 2 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '20', qty: 2 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '16', qty: 2 },
      { year: '2025-26', mCode: 'JUN', fm: 9, cm: 6, day: '24', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '08', qty: 2 }
    ]},
    { code: '195862', name: 'Brandon Select', category: 'Burial - Wood', subcategory: 'Wood', cost: 1200.00, monthlyOrders: [
      { year: '2024-25', mCode: 'DEC', fm: 3, cm: 12, day: '22', qty: 3 },
      { year: '2024-25', mCode: 'APR', fm: 7, cm: 4, day: '10', qty: 3 },
      { year: '2024-25', mCode: 'JUL', fm: 10, cm: 7, day: '18', qty: 3 },
      { year: '2025-26', mCode: 'OCT', fm: 1, cm: 10, day: '18', qty: 2 },
      { year: '2025-26', mCode: 'JAN', fm: 4, cm: 1, day: '12', qty: 2 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '25', qty: 3 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '19', qty: 2 },
      { year: '2025-26', mCode: 'SEP', fm: 12, cm: 9, day: '15', qty: 3 },
      { year: '2026-27', mCode: 'OCT', fm: 1, cm: 10, day: '04', qty: 1 }
    ]},
    { code: '195846', name: '8PM 865 HD Regent Mahogany', category: 'Burial - Wood', subcategory: 'Wood', cost: 2520.00, monthlyOrders: [
      { year: '2024-25', mCode: 'NOV', fm: 2, cm: 11, day: '28', qty: 1 },
      { year: '2024-25', mCode: 'MAY', fm: 8, cm: 5, day: '16', qty: 2 },
      { year: '2025-26', mCode: 'JAN', fm: 4, cm: 1, day: '19', qty: 1 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '25', qty: 1 },
      { year: '2025-26', mCode: 'JUN', fm: 9, cm: 6, day: '18', qty: 2 }
    ]},
    { code: '195869', name: 'Freelton Select', category: 'Burial - Wood', subcategory: 'Wood', cost: 995.28, monthlyOrders: [
      { year: '2024-25', mCode: 'OCT', fm: 1, cm: 10, day: '25', qty: 2 },
      { year: '2024-25', mCode: 'APR', fm: 7, cm: 4, day: '22', qty: 2 },
      { year: '2025-26', mCode: 'DEC', fm: 3, cm: 12, day: '10', qty: 1 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '16', qty: 2 },
      { year: '2025-26', mCode: 'JUL', fm: 10, cm: 7, day: '22', qty: 1 }
    ]},
    { code: '195871', name: 'Butler Aspen', category: 'Burial - Wood', subcategory: 'Wood', cost: 995.28, monthlyOrders: [
      { year: '2024-25', mCode: 'JAN', fm: 4, cm: 1, day: '14', qty: 1 },
      { year: '2024-25', mCode: 'JUN', fm: 9, cm: 6, day: '20', qty: 2 },
      { year: '2025-26', mCode: 'FEB', fm: 5, cm: 2, day: '12', qty: 1 },
      { year: '2025-26', mCode: 'MAY', fm: 8, cm: 5, day: '15', qty: 2 }
    ]},
    { code: '146825', name: '4BH 891 D Gurnet', category: 'Burial - Wood', subcategory: 'Wood', cost: 1020.00, monthlyOrders: [
      { year: '2024-25', mCode: 'DEC', fm: 3, cm: 12, day: '18', qty: 1 },
      { year: '2024-25', mCode: 'JUL', fm: 10, cm: 7, day: '11', qty: 2 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '28', qty: 1 },
      { year: '2025-26', mCode: 'AUG', fm: 11, cm: 8, day: '04', qty: 2 }
    ]},
    { code: '148191', name: '3Q9 892 LH Provincial Maple', category: 'Burial - Wood', subcategory: 'Wood', cost: 2840.00, monthlyOrders: [
      { year: '2024-25', mCode: 'FEB', fm: 5, cm: 2, day: '20', qty: 1 },
      { year: '2025-26', mCode: 'NOV', fm: 2, cm: 11, day: '14', qty: 1 },
      { year: '2025-26', mCode: 'APR', fm: 7, cm: 4, day: '12', qty: 1 }
    ]},
    { code: '147968', name: 'Z94 997 DH Promethean Bronze', category: 'Burial - Metal', subcategory: 'Bronze', cost: 12500.00, monthlyOrders: [
      { year: '2024-25', mCode: 'SEP', fm: 12, cm: 9, day: '10', qty: 1 },
      { year: '2025-26', mCode: 'FEB', fm: 5, cm: 2, day: '10', qty: 1 }
    ]},
    { code: '209772', name: '711 President Carved Top-F/T', category: 'Burial - Wood', subcategory: 'Wood', cost: 1200.00, monthlyOrders: [
      { year: '2024-25', mCode: 'AUG', fm: 11, cm: 8, day: '15', qty: 1 },
      { year: '2025-26', mCode: 'MAR', fm: 6, cm: 3, day: '24', qty: 1 }
    ]}
  ];

  for (const item of VESCIO_SHOWROOM_MODELS) {
    for (const ord of item.monthlyOrders) {
      const baseYear = parseInt(ord.year.split('-')[0], 10);
      const calYear = ord.fm <= 3 ? baseYear : baseYear + 1;
      const saleDate = `${calYear}-${String(ord.cm).padStart(2, '0')}-${ord.day}`;
      const totalAmount = Math.round(ord.qty * item.cost * 100) / 100;

      sales.push({
        id: `sale-vescio-${ord.year}-${ord.mCode}-${orderSeq}`,
        saleId: orderSeq,
        year: ord.year,
        month: ord.mCode,
        day: ord.day,
        program: 'PA',
        accountName: 'Vescio Funeral Home Woodbridge Chapel',
        accountNumber: 262863,
        productCode: item.code,
        category: item.category,
        subcategory: item.subcategory,
        description: item.name,
        quantity: ord.qty,
        cost: totalAmount,
        customerId: 'cust-262863',
        productId: `prod-${item.code}-${ord.year}`,
        orderNumber: `ORD-${ord.year}-${orderSeq}`,
        unitPrice: item.cost,
        totalAmount,
        saleDate,
        fiscalMonth: ord.fm,
        calMonth: ord.cm,
        notes: `Distributor showroom delivery for Vescio Funeral Home Woodbridge Chapel`
      });
      orderSeq++;
    }
  }

  // 4. Generate authentic showroom client reorders for Guenette Funeral Home (Account 919742)
  const GUENETTE_SHOWROOM_MODELS = [
    { code: '147719', name: 'A21 879 DH Neopolitan Blue', category: 'Burial - Metal', subcategory: 'Metal', cost: 1470.00, units: 10, lastMonth: '09', lastDay: '16' },
    { code: '52-417-103', name: 'FERGUS PC', category: 'Burial - Wood', subcategory: 'Wood', cost: 1150.00, units: 8, lastMonth: '08', lastDay: '24' },
    { code: '185487', name: 'JF9 825 CDH Golden Midnight', category: 'Burial - Metal', subcategory: 'Metal', cost: 1620.00, units: 7, lastMonth: '09', lastDay: '10' },
    { code: '32-62-12', name: 'DIGBY PC', category: 'Burial - Wood', subcategory: 'Wood', cost: 980.00, units: 6, lastMonth: '07', lastDay: '19' },
    { code: '71007964', name: 'MONARCH SANDSTONE PC', category: 'Burial - Metal', subcategory: 'Metal', cost: 1320.00, units: 5, lastMonth: '08', lastDay: '05' },
    { code: '32-1062-28', name: 'ASHTON PC', category: 'Burial - Wood', subcategory: 'Wood', cost: 1100.00, units: 6, lastMonth: '09', lastDay: '02' },
    { code: '110951', name: 'WINSTON-100 PC', category: 'Burial - Cloth', subcategory: 'Cloth', cost: 650.00, units: 8, lastMonth: '09', lastDay: '20' },
    { code: '52-5410-00', name: 'HOMEWARD PC', category: 'Burial - Wood', subcategory: 'Wood', cost: 890.00, units: 4, lastMonth: '06', lastDay: '14' },
    { code: '245435', name: 'MDF Cremation Box-Pine-Cut Top', category: 'Cremation', subcategory: 'Cremation', cost: 320.00, units: 15, lastMonth: '09', lastDay: '27' },
    { code: '79-5055-01', name: 'BASIC SHELL/RF LID', category: 'Cremation', subcategory: 'Cremation', cost: 210.00, units: 18, lastMonth: '09', lastDay: '29' },
    { code: '208692', name: 'Bradbury Pecan Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 240.00, units: 9, lastMonth: '08', lastDay: '22' },
    { code: '235556', name: 'Pewter Bronze Vertical Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 195.00, units: 7, lastMonth: '09', lastDay: '12' },
    { code: '235555', name: 'Brushed Bronze Horizontal Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 195.00, units: 6, lastMonth: '07', lastDay: '18' },
    { code: '235709', name: 'Crimson Delphia Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 165.00, units: 8, lastMonth: '09', lastDay: '08' },
    { code: '235705', name: 'Blue Delphia Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 165.00, units: 9, lastMonth: '09', lastDay: '21' },
    { code: '205396', name: 'Ashen Pewter Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 155.00, units: 6, lastMonth: '08', lastDay: '15' },
    { code: '20006', name: 'Cross Oak', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 175.00, units: 4, lastMonth: '06', lastDay: '11' },
    { code: 'A572', name: 'Flying Doves', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 140.00, units: 5, lastMonth: '07', lastDay: '04' },
    { code: '51000-1-3-5-7', name: 'Cultured Marble', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 185.00, units: 4, lastMonth: '05', lastDay: '28' },
    { code: '960530-1-2-3', name: 'Marbleized', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 160.00, units: 3, lastMonth: '04', lastDay: '16' },
    { code: '960411-2', name: 'Blessing', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 150.00, units: 3, lastMonth: '05', lastDay: '09' },
    { code: '210', name: 'Camo Tambour', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 170.00, units: 2, lastMonth: '03', lastDay: '14' },
    { code: '219', name: 'Raised Panel', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 180.00, units: 3, lastMonth: '06', lastDay: '22' },
    { code: 'EA-1002', name: 'Heart Urn', category: 'Urns & Keepsakes', subcategory: 'Urns', cost: 110.00, units: 5, lastMonth: '08', lastDay: '19' },
  ];

  for (const gItem of GUENETTE_SHOWROOM_MODELS) {
    const totalAmount = Math.round(gItem.units * gItem.cost * 100) / 100;
    sales.push({
      id: `sale-guenette-2025-26-${orderSeq}`,
      saleId: orderSeq,
      year: '2025-26',
      month: gItem.lastMonth === '09' ? 'SEP' : gItem.lastMonth === '08' ? 'AUG' : 'JUL',
      day: gItem.lastDay,
      program: 'Standard',
      accountName: 'Guenette Funeral Home',
      accountNumber: 919742,
      productCode: gItem.code,
      category: gItem.category,
      subcategory: gItem.subcategory,
      description: gItem.name,
      quantity: gItem.units,
      cost: totalAmount,
      customerId: 'cust-919742',
      productId: `prod-${gItem.code}-2025-26`,
      orderNumber: `ORD-2025-26-${orderSeq}`,
      unitPrice: gItem.cost,
      totalAmount,
      saleDate: `2026-${gItem.lastMonth}-${gItem.lastDay}`,
      fiscalMonth: parseInt(gItem.lastMonth, 10) >= 10 ? parseInt(gItem.lastMonth, 10) - 9 : parseInt(gItem.lastMonth, 10) + 3,
      calMonth: parseInt(gItem.lastMonth, 10),
      notes: `Distributor showroom delivery for Guenette Funeral Home`
    });
    orderSeq++;
  }

  return sales;
}
