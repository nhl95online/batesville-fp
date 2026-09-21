import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

interface Card6x6Props {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
  collectionType?: 'commemorative-green' | 'commemorative-blue' | 'classic' | 'conventional';
  productNameOverride?: string;
  customBullets?: string[];
  activeMiscFeatures?: string[];
  tributeCount?: number;
}

const SUPABASE_MISC_BASE = 'https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/misc';

export const Card6x6: React.FC<Card6x6Props> = ({
  product,
  customer,
  config,
  retailPrice,
  collectionType: explicitCollection,
  productNameOverride,
  customBullets,
  activeMiscFeatures,
  tributeCount: explicitTributeCount,
}) => {
  // Determine collection type (Auto-detect if not explicitly provided)
  const collectionType = explicitCollection || (() => {
    if (config.theme === 'classic-burgundy' || config.theme === 'modern-dark') {
      return 'classic';
    }
    if (config.theme === 'funeral-navy') {
      return 'conventional';
    }
    if (product.lifesymbols || product.lifestories) {
      return 'commemorative-green';
    }
    if (product.material.toLowerCase().includes('mahogany') || product.material.toLowerCase().includes('cherry') || product.material.toLowerCase().includes('bronze')) {
      return 'classic';
    }
    return 'commemorative-green';
  })();

  // Collection Theme Colors
  const themeConfig = {
    'commemorative-green': {
      bannerBg: 'bg-[#15662a]', // Rich Batesville green
      accentBorder: 'border-emerald-600',
      titlePrimary: 'Commemorative',
      titleSecondary: 'Collection',
      type: 'commemorative',
    },
    'commemorative-blue': {
      bannerBg: 'bg-[#006cb8]', // Vibrant Batesville blue
      accentBorder: 'border-blue-600',
      titlePrimary: 'Commemorative',
      titleSecondary: 'Collection',
      type: 'commemorative',
    },
    'classic': {
      bannerBg: 'bg-[#3b434e]', // Charcoal slate
      accentBorder: 'border-[#c59b27]', // Classic gold border trim
      titlePrimary: 'Classic',
      titleSecondary: 'Collection',
      type: 'classic',
    },
    'conventional': {
      bannerBg: 'bg-[#112d4e]', // Deep navy
      accentBorder: 'border-[#3f72af]',
      titlePrimary: 'Conventional',
      titleSecondary: 'Collection',
      type: 'conventional',
    }
  }[collectionType];

  // Number of tribute options
  const tributeCount = explicitTributeCount || (product.lifestories ? 7 : (product.lifesymbols ? 4 : 4));

  // Determine Material & Finish display line
  const materialFinishLine = (() => {
    let m = product.material || 'Premium Steel';
    let f = product.finish || product.exteriorFinish || '';
    // Clean up finish if it has redundant "Finish"
    f = f.replace(/Finish/i, '').trim();
    if (f && !m.toLowerCase().includes(f.toLowerCase())) {
      return `${m}-${f}`;
    }
    return m;
  })();

  // Determine Interior display line
  const interiorLine = (() => {
    let int = product.interior || 'Velvet';
    if (!int.toLowerCase().includes('interior')) {
      return `${int} Interior`;
    }
    return int;
  })();

  // Default bullets based on collection & casket specs
  const bullets = customBullets && customBullets.length > 0 ? customBullets : (() => {
    if (themeConfig.type === 'commemorative') {
      return [
        `${tributeCount === 7 ? 'Seven' : (tributeCount === 4 ? 'Four' : `${tributeCount}`)} Tribute Options Included`,
        'May be saved as lasting keepsakes',
        materialFinishLine,
        'Display on casket optional',
        interiorLine,
      ];
    } else if (themeConfig.type === 'classic') {
      return [
        'Fine craftsmanship',
        'Exceptional finish',
        materialFinishLine,
        'Timeless design',
        interiorLine,
      ];
    } else {
      return [
        'Quality construction',
        'Reliable protection',
        materialFinishLine,
        'Traditional styling',
        interiorLine,
      ];
    }
  })();

  // Features to display under "Additional Features"
  // Checks if casket has TRUE for flags from 4th attached image:
  // lifestories, lifeview, lifesymbols, dual_disposition (or MemorySafe)
  const availableFeatures = [
    {
      id: 'embroidered',
      title: 'Embroidered Tribute Panel',
      subtitle: "A personal way to highlight a loved one's interests, hobbies or values (optional).",
      fileName: 'Embroidered Cap Panel.png',
      isDefault: Boolean(product.lifeview || true), // Most Batesville display units feature embroidered panel option
    },
    {
      id: 'memorysafe',
      title: 'MemorySafe® Drawer',
      subtitle: 'A secure space for farewell messages and small personal mementos (included).',
      fileName: 'MemorySafe.png',
      isDefault: Boolean(product.material.toLowerCase().includes('pecan') || product.material.toLowerCase().includes('mahogany') || product.code === '242987'),
    },
    {
      id: 'lifestories',
      title: 'LifeStories® Medallions',
      subtitle: 'Keepsake medallions to honor personal relationships and heritage (included).',
      fileName: 'LifeStories.png',
      isDefault: Boolean(product.lifestories),
    },
    {
      id: 'lifesymbols',
      title: 'LifeSymbols® Corner Designs',
      subtitle: "Interchangeable corner emblems celebrating life's passions and affiliations.",
      fileName: 'LifeSymbols.png',
      isDefault: Boolean(product.lifesymbols),
    },
    {
      id: 'livingtree',
      title: 'Living Memorial® Tree',
      subtitle: 'A tree seedling is planted in a national forest in memory of your loved one (included).',
      fileName: 'LivingTree.png',
      isDefault: false,
    },
    {
      id: 'memorialrecord',
      title: 'Memorial Record® System',
      subtitle: 'A meaningful record system placed safely within the casket.',
      fileName: 'MemorialRecord.png',
      isDefault: false,
    },
  ];

  // Active feature list
  const activeFeatures = activeMiscFeatures && activeMiscFeatures.length > 0
    ? availableFeatures.filter(f => activeMiscFeatures.includes(f.id) || activeMiscFeatures.includes(f.fileName))
    : availableFeatures.filter(f => f.isDefault).slice(0, 2);

  // Product Name: defaults to description
  const displayName = productNameOverride || product.description || product.name;

  return (
    <div 
      className="card-6x6 relative flex flex-col justify-between overflow-hidden shadow-2xl select-none print:shadow-none"
      style={{
        width: '576px',  // Exactly 6 inches at 96 DPI
        height: '576px', // Exactly 6 inches at 96 DPI
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. TOP HEADER BANNER */}
      <div className={`${themeConfig.bannerBg} px-6 py-3.5 flex items-center justify-between text-white shadow-sm shrink-0`}>
        <div className="flex items-baseline space-x-1.5 tracking-tight">
          <span className="font-bold text-2xl tracking-normal">{themeConfig.titlePrimary}</span>
          <span className="font-normal text-2xl tracking-normal opacity-95">{themeConfig.titleSecondary}</span>
        </div>
      </div>

      {/* Gold Trim Line for Classic Collection */}
      {collectionType === 'classic' && (
        <div className="h-1 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 2. SPECIFICATION BULLETS & RIGHT MEDALLION / SEAL */}
      <div className="flex-1 bg-white flex flex-row px-5 py-3 relative overflow-hidden">
        
        {/* Left Side: Bullet Points with Ledger Lined Rows */}
        <div className="flex-1 pr-3 flex flex-col justify-between">
          <div className="divide-y divide-slate-200/90 border-t border-b border-slate-200/90 text-[13px] text-slate-800">
            
            {/* Row 1 */}
            <div className="py-1.5 flex items-start space-x-2 min-h-[28px]">
              <span className="text-slate-900 font-bold leading-none select-none">•</span>
              <span className="font-medium text-slate-800 leading-snug">{bullets[0] || ''}</span>
            </div>

            {/* Row 2 */}
            <div className="py-1.5 flex items-start space-x-2 min-h-[28px]">
              <span className="text-slate-900 font-bold leading-none select-none">•</span>
              <span className="font-medium text-slate-800 leading-snug">{bullets[1] || ''}</span>
            </div>

            {/* Row 3: Material & Gauge */}
            <div className="py-1.5 flex items-start space-x-2 min-h-[28px]">
              <span className="text-slate-900 font-bold leading-none select-none">•</span>
              <span className="font-medium text-slate-800 leading-snug">{bullets[2] || materialFinishLine}</span>
            </div>

            {/* Row 4: Subtle separator spacing row */}
            <div className="py-1 min-h-[16px] bg-slate-50/40" />

            {/* Row 5: Display optional / Timeless design */}
            <div className="py-1.5 flex items-start space-x-2 min-h-[28px]">
              <span className="text-slate-900 font-bold leading-none select-none">•</span>
              <span className="font-medium text-slate-800 leading-snug">{bullets[3] || 'Display on casket optional'}</span>
            </div>

            {/* Row 6: Interior */}
            <div className="py-1.5 flex items-start space-x-2 min-h-[28px]">
              <span className="text-slate-900 font-bold leading-none select-none">•</span>
              <span className="font-medium text-slate-800 leading-snug">{bullets[4] || interiorLine}</span>
            </div>

          </div>
        </div>

        {/* Right Side: Graphic Medallions / Seal */}
        <div className="w-[170px] border-l border-slate-200 pl-3 flex flex-col items-center justify-center shrink-0">
          
          {themeConfig.type === 'commemorative' ? (
            <div className="w-full flex flex-col items-center">
              <div className="text-[11px] font-bold text-slate-800 text-center tracking-tight mb-2 uppercase">
                Tribute Option Categories
              </div>

              {/* 2x2 Medallions Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 w-full">
                
                {/* 1. Relationships */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-200 p-0.5 shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-stone-900 border border-amber-300/40 flex items-center justify-center">
                      <span className="text-amber-300 text-sm font-serif">💍</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-700 mt-0.5">Relationships</span>
                </div>

                {/* 2. Spirituality */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-200 p-0.5 shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-stone-900 border border-amber-300/40 flex items-center justify-center">
                      <span className="text-amber-300 text-sm font-serif">🕊️</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-700 mt-0.5">Spirituality</span>
                </div>

                {/* 3. Affiliations */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-700 via-amber-600 to-amber-200 p-0.5 shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-stone-900 border border-red-400/40 flex items-center justify-center">
                      <span className="text-red-400 text-sm font-serif">🎖️</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-700 mt-0.5">Affiliations</span>
                </div>

                {/* 4. Hobbies & Interests */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-200 p-0.5 shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-stone-900 border border-amber-300/40 flex items-center justify-center">
                      <span className="text-amber-300 text-sm font-serif">🌹</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-700 mt-0.5 leading-tight">Hobbies &amp; Interests</span>
                </div>

              </div>
            </div>
          ) : themeConfig.type === 'classic' ? (
            /* Classic Collection Golden Medallion Seal */
            <div className="flex flex-col items-center justify-center p-1">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#9c7820] via-[#f7e49e] to-[#7d5f19] p-1 shadow-md">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#fbf8f0] to-[#e8dcb8] border-2 border-[#b58c27] flex flex-col items-center justify-center text-center p-1 shadow-inner">
                  <span className="text-[9px] font-serif font-black tracking-widest text-[#694e0f] uppercase leading-none">
                    Refined
                  </span>
                  <span className="text-[12px] font-serif font-black tracking-wider text-[#4d3809] uppercase leading-tight">
                    Styling
                  </span>
                  <div className="w-12 h-0.5 bg-[#b58c27]/60 my-0.5" />
                  <span className="text-[7.5px] font-bold tracking-tight text-[#694e0f] uppercase leading-tight">
                    Classic Collection
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Conventional Collection Seal */
            <div className="flex flex-col items-center justify-center p-1">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-slate-600 via-slate-200 to-slate-500 p-1 shadow-md">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-400 flex flex-col items-center justify-center text-center p-1 shadow-inner">
                  <span className="text-[9px] font-serif font-black tracking-widest text-slate-700 uppercase leading-none">
                    Certified
                  </span>
                  <span className="text-[12px] font-serif font-black tracking-wider text-slate-900 uppercase leading-tight">
                    Quality
                  </span>
                  <div className="w-12 h-0.5 bg-slate-400/60 my-0.5" />
                  <span className="text-[7.5px] font-bold tracking-tight text-slate-600 uppercase leading-tight">
                    Conventional Collection
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. ADDITIONAL FEATURES SECTION */}
      <div className="bg-[#f0f2f5] border-t border-b border-slate-300/80 px-4 py-2 shrink-0">
        <div className="font-bold text-[11px] text-slate-900 tracking-tight mb-1.5 uppercase">
          Additional Features
        </div>

        <div className={`grid ${activeFeatures.length > 1 ? 'grid-cols-2 gap-2.5' : 'grid-cols-1 max-w-[320px]'}`}>
          {activeFeatures.map((feat) => {
            const miscImageUrl = `${SUPABASE_MISC_BASE}/${encodeURIComponent(feat.fileName)}`;
            const localFallback = `/misc/${feat.fileName}`;

            return (
              <div 
                key={feat.id}
                className="bg-white rounded-lg border border-slate-200/90 p-2 flex items-center space-x-2.5 shadow-sm"
              >
                <div className="w-11 h-11 shrink-0 bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center">
                  <img 
                    src={miscImageUrl}
                    onError={(e) => {
                      // Fallback to local cached copy if offline
                      const target = e.currentTarget;
                      if (target.src !== localFallback) {
                        target.src = localFallback;
                      }
                    }}
                    alt={feat.title}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-[11px] text-slate-900 leading-tight truncate">
                    {feat.title}
                  </h5>
                  <p className="text-[9.5px] text-slate-500 italic leading-tight mt-0.5 line-clamp-2">
                    {feat.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gold Accent Line for Classic Collection bottom banner */}
      {collectionType === 'classic' && (
        <div className="h-1 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 4. BOTTOM BANNER */}
      <div className={`${themeConfig.bannerBg} px-6 pt-3 pb-2 text-white flex flex-col justify-between shrink-0`}>
        
        {/* Product Name from Description */}
        <div className="font-sans text-xl font-medium text-white tracking-wide truncate">
          {displayName}
        </div>

        {/* Large Retail Price */}
        <div className="font-sans font-bold text-5xl tracking-tight text-white my-0.5">
          ${retailPrice.toLocaleString()}
        </div>

        {/* Manufacturer Line: Batesville Canada, ULC - [Product Code] */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-sans text-base font-semibold text-white/95 tracking-normal">
            Batesville Canada, ULC - &nbsp;&nbsp;{product.code}
          </span>
        </div>

        {/* Bottom Copyright Line */}
        <div className="text-[9px] text-white/60 font-sans tracking-tight mt-0.5">
          @ 2025 Batesville Services LLC
        </div>

      </div>

    </div>
  );
};
