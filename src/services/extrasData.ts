// Extras Section Content
// Edit this file to add, remove, or change items shown in the "Extras" header tab.
// Items that share the same `group` within a category are combined into a single panel.
// Images can be placed in /public and referenced by path (e.g. '/misc/LifeSymbols.png').

export type ExtraCategory = 'catalogs' | 'selection-rooms' | 'personalization';

export interface ExtraItem {
  id: string;
  title: string;
  category: ExtraCategory;
  group: string;
  description: string;
  imageUrl?: string;
  details?: string[];
  linkUrl?: string;
  linkLabel?: string;
  isCustom?: boolean;
}

export const EXTRA_CATEGORIES: { id: ExtraCategory; label: string; description: string }[] = [
  { id: 'catalogs', label: 'Catalogs & Literature', description: 'Catalogs, price guides & family brochures' },
  { id: 'selection-rooms', label: 'Selection Room Setups', description: 'Displays, signage & showroom merchandising' },
  { id: 'personalization', label: 'Personalization & Memorials', description: 'LifeSymbols, LifeStories, tributes & more' },
];

export const DEFAULT_EXTRAS: ExtraItem[] = [
  // ---- Catalogs & Literature ----
  {
    id: 'cat-main-2026',
    title: '2026–27 Product Catalog',
    category: 'catalogs',
    group: 'Product Catalogs',
    description: 'Full-line casket, urn & keepsake catalog for arrangement conferences.',
    details: ['Metal, hardwood & NewPointe lines', 'Pairs with current price list'],
  },
  {
    id: 'cat-cremation',
    title: 'Cremation Options Catalog',
    category: 'catalogs',
    group: 'Product Catalogs',
    description: 'Urns, keepsakes, rental caskets and cremation containers.',
  },
  {
    id: 'cat-price-guide',
    title: 'Reference Guide & Price List',
    category: 'catalogs',
    group: 'Pricing & Take-Home',
    description: 'Model codes, dimensions and program pricing. Import via "Import Price List".',
  },
  {
    id: 'cat-family-brochure',
    title: 'Family Take-Home Brochures',
    category: 'catalogs',
    group: 'Pricing & Take-Home',
    description: 'Compact brochures families can take home after the conference.',
  },

  // ---- Selection Room Setups ----
  {
    id: 'sr-full-couch',
    title: 'Full-Couch Wall Display',
    category: 'selection-rooms',
    group: 'Casket Displays',
    description: 'Wall-mounted full-couch displays — single & double rack, accent lighting.',
  },
  {
    id: 'sr-corner',
    title: 'Corner / Partial Display',
    category: 'selection-rooms',
    group: 'Casket Displays',
    description: 'Corner and quarter-couch displays for L-shaped & square rooms.',
  },
  {
    id: 'sr-urn-wall',
    title: 'Cremation Urn Wall & Shelving',
    category: 'selection-rooms',
    group: 'Cremation Displays',
    description: 'Lighted adjustable shelving with 2" x 12" rail price strips.',
  },
  {
    id: 'sr-refined-styling',
    title: 'Refined Styling Refresh',
    category: 'selection-rooms',
    group: 'Showroom Enhancements',
    description: 'Updated décor, finishes and lighting for a modern selection room.',
    imageUrl: '/misc/Refined Styling.png',
  },
  {
    id: 'sr-digital',
    title: 'Digital Selection Kiosk',
    category: 'selection-rooms',
    group: 'Showroom Enhancements',
    description: 'Touchscreen catalog display to supplement physical inventory.',
  },
  {
    id: 'merch-cap-cards',
    title: 'Showroom Price Cards',
    category: 'selection-rooms',
    group: 'Signage & Merchandising',
    description: 'Cap cards, tent cards, urn rails & posters from the Price Cards studio.',
  },
  {
    id: 'merch-signage',
    title: 'Signage & Wayfinding',
    category: 'selection-rooms',
    group: 'Signage & Merchandising',
    description: 'Section headers and category signs for metal, wood & cremation areas.',
  },
  {
    id: 'merch-swatches',
    title: 'Interior & Finish Swatch Kits',
    category: 'selection-rooms',
    group: 'Signage & Merchandising',
    description: 'Fabric and wood finish samples for arrangement conferences.',
  },

  // ---- Personalization & Memorials ----
  {
    id: 'pers-lifesymbols',
    title: 'LifeSymbols® Corner Medallions',
    category: 'personalization',
    group: 'Casket Personalization',
    description: 'Interchangeable corners reflecting interests and faith.',
    imageUrl: '/misc/LifeSymbols.png',
  },
  {
    id: 'pers-cap-panel',
    title: 'Embroidered Cap Panels',
    category: 'personalization',
    group: 'Casket Personalization',
    description: 'Custom embroidered head panels with themes, names or emblems.',
    imageUrl: '/misc/Embroidered Cap Panel.png',
  },
  {
    id: 'pers-lifestories',
    title: 'LifeStories® Memorial Drawer',
    category: 'personalization',
    group: 'Keepsake Compartments',
    description: 'Built-in drawer for keepsakes, letters and mementos.',
    imageUrl: '/misc/LifeStories.png',
  },
  {
    id: 'pers-memorysafe',
    title: 'MemorySafe® Drawer',
    category: 'personalization',
    group: 'Keepsake Compartments',
    description: 'Secure compartment for personal items.',
    imageUrl: '/misc/MemorySafe.png',
  },
  {
    id: 'pers-memorial-record',
    title: 'Memorial Record',
    category: 'personalization',
    group: 'Memorialization',
    description: 'Permanent identification and memorial record tube.',
    imageUrl: '/misc/MemorialRecord.png',
  },
  {
    id: 'pers-tributes',
    title: 'Tributes',
    category: 'personalization',
    group: 'Memorialization',
    description: 'Personalized tribute products to honor a life.',
    imageUrl: '/misc/Tributes.png',
  },
  {
    id: 'pers-living-tree',
    title: 'Living Memorial Program',
    category: 'personalization',
    group: 'Memorialization',
    description: 'A tree planted in a national forest for each family served.',
    imageUrl: '/misc/LivingTree.png',
  },
];
