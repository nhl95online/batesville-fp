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
  const years = [2023, 2024, 2025, 2026];
  let orderSeq = 10001;

  const monthWeights: Record<number, number> = {
    1: 1.25, 2: 1.20, 3: 1.15, 4: 1.05, 5: 0.95, 6: 0.90,
    7: 0.88, 8: 0.92, 9: 0.98, 10: 1.05, 11: 1.12, 12: 1.22
  };

  const yearGrowth: Record<number, number> = {
    2023: 1.0,
    2024: 1.14,
    2025: 1.26,
    2026: 1.38
  };

  for (const year of years) {
    const maxMonth = (year === 2026) ? 9 : 12;

    for (let month = 1; month <= maxMonth; month++) {
      const baseOrders = Math.round(5 * monthWeights[month] * (yearGrowth[year] || 1));

      for (let i = 0; i < baseOrders; i++) {
        const custIdx = i % INITIAL_CUSTOMERS.length;
        const customer = INITIAL_CUSTOMERS[custIdx];
        
        const prodIdx = (i + month + year) % INITIAL_PRODUCTS.length;
        const product = INITIAL_PRODUCTS[prodIdx];

        const day = 1 + ((i * 7 + month * 3) % 27);
        const dayStr = day.toString().padStart(2, '0');
        const monthStr = month.toString().padStart(2, '0');
        const saleDate = `${year}-${monthStr}-${dayStr}`;

        const quantity = (product.category === 'Cremation & Urns') ? (1 + (i % 3)) : 1;
        const unitPrice = product.wholesalePrice;
        const totalAmount = unitPrice * quantity;

        const MONTH_NAMES = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mText = MONTH_NAMES[month] || 'JAN';
        const fiscalMonth = month >= 10 ? (month - 9) : (month + 3);

        sales.push({
          id: `sale-${year}-${month}-${orderSeq}`,
          saleId: orderSeq,
          year: `${year}-${String(year + 1).slice(2)}`,
          month: mText,
          day: dayStr,
          program: customer.program || 'OBB',
          accountName: customer.name,
          accountNumber: customer.accountNumber || 0,
          productCode: product.code,
          category: product.category,
          description: product.name,
          quantity,
          cost: unitPrice,
          customerId: customer.id,
          productId: product.id,
          orderNumber: `ORD-${year}-${orderSeq}`,
          unitPrice,
          totalAmount,
          saleDate,
          fiscalMonth,
          calMonth: month,
          notes: `Delivery order for ${customer.name}`
        });

        orderSeq++;
      }
    }
  }

  return sales;
}
