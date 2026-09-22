import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

export type CardCollectionType = 'commemorative' | 'classic' | 'conventional' | 'basic';
export type RightGraphicType = 'tributes' | 'refined-styling' | 'none';

interface Card6x6Props {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
  collectionType?: CardCollectionType;
  productNameOverride?: string;
  customBullets?: string[];
  activeMiscFeatures?: string[];
  rightGraphic?: RightGraphicType;
  onClearBullet?: (index: number) => void;
  onUpdateBullet?: (index: number, text: string) => void;
}

const SUPABASE_MISC_BASE = 'https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/misc';

export const Card6x6: React.FC<Card6x6Props> = ({
  product,
  customer,
  config,
  retailPrice,
  collectionType = 'commemorative',
  productNameOverride,
  customBullets,
  activeMiscFeatures,
  rightGraphic = collectionType === 'classic' ? 'refined-styling' : (collectionType === 'basic' ? 'none' : 'tributes'),
  onClearBullet,
  onUpdateBullet,
}) => {
  // Collection Theme Styling
  const themeConfig = {
    'commemorative': {
      bannerBg: 'bg-[#15662a]', // Rich Batesville Emerald Green
      accentBorder: 'border-emerald-600',
      titlePrimary: 'Commemorative',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-[#15662a]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/60',
    },
    'classic': {
      bannerBg: 'bg-[#3b434e]', // Charcoal Slate
      accentBorder: 'border-[#c59b27]',
      titlePrimary: 'Classic',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-[#3b434e]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/60',
    },
    'conventional': {
      bannerBg: 'bg-[#006cb8]', // Batesville Royal Blue
      accentBorder: 'border-blue-600',
      titlePrimary: 'Conventional',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-[#006cb8]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/60',
    },
    'basic': {
      bannerBg: 'bg-white border-b-2 border-slate-300', // Crisp Showroom White
      accentBorder: 'border-slate-300',
      titlePrimary: 'Basic',
      titleSecondary: 'Collection',
      isLight: true,
      bottomBannerBg: 'bg-slate-100 border-t-2 border-slate-300',
      bottomTextColor: 'text-slate-950',
      bottomSubtextColor: 'text-slate-700',
      bottomCopyrightColor: 'text-slate-500',
    }
  }[collectionType] || {
    bannerBg: 'bg-[#15662a]',
    accentBorder: 'border-emerald-600',
    titlePrimary: 'Commemorative',
    titleSecondary: 'Collection',
    isLight: false,
    bottomBannerBg: 'bg-[#15662a]',
    bottomTextColor: 'text-white',
    bottomSubtextColor: 'text-white/95',
    bottomCopyrightColor: 'text-white/60',
  };

  // Determine Material & Finish display line
  const materialFinishLine = (() => {
    let m = product.material || 'Premium Steel';
    let f = product.finish || product.exteriorFinish || '';
    f = f.replace(/Finish/i, '').trim();
    if (f && !m.toLowerCase().includes(f.toLowerCase())) {
      return `${m} - ${f}`;
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

  // Tribute Option Count
  const tributeCount = product.lifestories && product.lifesymbols ? 4 : (product.lifesymbols || product.lifestories ? 3 : 2);

  // Default bullets (6 ledger rows matching reference card)
  const defaultBullets: string[] = (() => {
    if (collectionType === 'commemorative') {
      return [
        `${tributeCount} Tribute Option Choices`,
        `${tributeCount} Keepsake Medallions or Corners`,
        materialFinishLine,
        '', // Clean empty ledger row by default (user can fill or clear)
        'LifeView Display optional',
        interiorLine,
      ];
    } else if (collectionType === 'classic') {
      return [
        'Fine craftsmanship',
        'Exceptional finish',
        materialFinishLine,
        '',
        'Timeless design',
        interiorLine,
      ];
    } else if (collectionType === 'conventional') {
      return [
        'Quality craftsmanship',
        'Reliable protection',
        materialFinishLine,
        '',
        'Traditional styling',
        interiorLine,
      ];
    } else {
      return [
        'Essential craftsmanship',
        'Dignified simplicity',
        materialFinishLine,
        '',
        'Standard styling',
        interiorLine,
      ];
    }
  })();

  // Use custom bullets if provided and has 6 rows
  const bullets = customBullets && customBullets.length === 6 ? customBullets : defaultBullets;

  // Features to display under "Additional Features"
  const availableFeatures = [
    {
      id: 'embroidered',
      title: 'Embroidered Tribute Panel',
      subtitle: "A personal way to highlight a loved one's interests, hobbies or values (optional).",
      fileName: 'Embroidered Cap Panel.png',
      isDefault: Boolean(product.lifeview || true),
    },
    {
      id: 'memorysafe',
      title: 'MemorySafe® Drawer',
      subtitle: 'A secure space for farewell messages and small personal mementos (included).',
      fileName: 'MemorySafe.png',
      isDefault: Boolean(product.material?.toLowerCase().includes('pecan') || product.material?.toLowerCase().includes('mahogany') || product.code === '242987'),
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

  // Active feature list (limit to 1 or 2 for 6x6 square)
  const activeFeatures = activeMiscFeatures && activeMiscFeatures.length > 0
    ? availableFeatures.filter(f => activeMiscFeatures.includes(f.id) || activeMiscFeatures.includes(f.fileName))
    : availableFeatures.filter(f => f.isDefault).slice(0, 1);

  // Product Name: defaults to description
  const displayName = productNameOverride || product.description || product.name;

  return (
    <div 
      className="card-6x6 relative flex flex-col justify-between overflow-hidden shadow-2xl select-none print:shadow-none bg-white"
      style={{
        width: '576px',  // Exactly 6 inches at 96 DPI
        height: '576px', // Exactly 6 inches at 96 DPI
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. TOP HEADER BANNER */}
      <div className={`${themeConfig.bannerBg} px-6 py-3.5 flex items-center justify-between shadow-sm shrink-0`}>
        <div className={`flex items-baseline space-x-1.5 tracking-tight ${themeConfig.isLight ? 'text-slate-900' : 'text-white'}`}>
          <span className="font-bold text-2xl tracking-normal">{themeConfig.titlePrimary}</span>
          <span className="font-normal text-2xl tracking-normal opacity-90">{themeConfig.titleSecondary}</span>
        </div>
      </div>

      {/* Gold Trim Accent Line for Classic Collection */}
      {collectionType === 'classic' && (
        <div className="h-1 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 2. SPECIFICATION BULLETS & RIGHT GRAPHIC (TRIBUTES / REFINED STYLING) */}
      <div className="flex-1 bg-white flex flex-row px-5 py-2.5 relative overflow-hidden">
        
        {/* Left Side: 6 Bullet Points on Authentic Ledger Lined Rows */}
        <div className="flex-1 pr-3 flex flex-col justify-between">
          <div className="border-t border-b border-slate-200/90 divide-y divide-slate-200/90 text-[12.5px] text-slate-800">
            {bullets.map((bullet, idx) => {
              const hasText = Boolean(bullet && bullet.trim().length > 0);

              return (
                <div 
                  key={idx} 
                  className="py-1 px-1 flex items-center justify-between min-h-[25px] group hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                    {hasText ? (
                      <>
                        <span className="text-slate-900 font-bold leading-none select-none text-[13px] shrink-0">•</span>
                        <span className="font-medium text-slate-800 leading-tight truncate">
                          {bullet}
                        </span>
                      </>
                    ) : (
                      /* Clean empty ledger row without bullet dot (as shown in reference image) */
                      <div className="h-[14px] w-full select-none" />
                    )}
                  </div>

                  {/* Inline Quick-Clear Button (visible on hover) */}
                  {hasText && onClearBullet && (
                    <button
                      type="button"
                      onClick={() => onClearBullet(idx)}
                      title="Clear bullet point"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-[11px] px-1 font-bold no-print transition-opacity cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: TRIBUTES Graphic or REFINED STYLING Medallion from misc bucket */}
        {rightGraphic !== 'none' && (
          <div className="w-[140px] pl-3 border-l border-slate-200 flex flex-col items-center justify-center shrink-0">
            {rightGraphic === 'refined-styling' ? (
              <img
                src={`${SUPABASE_MISC_BASE}/Refined%20Styling.png`}
                onError={(e) => {
                  e.currentTarget.src = '/misc/Refined Styling.png';
                }}
                alt="Refined Styling Classic Collection"
                className="w-[125px] h-auto object-contain drop-shadow-sm"
              />
            ) : (
              <img
                src={`${SUPABASE_MISC_BASE}/Tributes.png`}
                onError={(e) => {
                  e.currentTarget.src = '/misc/Tributes.png';
                }}
                alt="Tribute Option Categories"
                className="w-[125px] h-auto object-contain"
              />
            )}
          </div>
        )}

      </div>

      {/* 3. ADDITIONAL FEATURES SECTION */}
      <div className="bg-[#f0f2f5] border-t border-b border-slate-300/80 px-4 py-2 shrink-0">
        <div className="font-bold text-[10.5px] text-slate-900 tracking-tight mb-1 uppercase">
          Additional Features
        </div>

        <div className={`grid ${activeFeatures.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1 max-w-[340px]'}`}>
          {activeFeatures.map((feat) => {
            const miscImageUrl = `${SUPABASE_MISC_BASE}/${encodeURIComponent(feat.fileName)}`;
            const localFallback = `/misc/${feat.fileName}`;

            return (
              <div 
                key={feat.id}
                className="bg-white rounded-lg border border-slate-200/90 p-1.5 flex items-center space-x-2.5 shadow-sm"
              >
                <div className="w-10 h-10 shrink-0 bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center">
                  <img 
                    src={miscImageUrl}
                    onError={(e) => {
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
                  <p className="text-[9px] text-slate-500 italic leading-tight mt-0.5 line-clamp-2">
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
      <div className={`${themeConfig.bottomBannerBg} px-6 pt-2.5 pb-2 flex flex-col justify-between shrink-0`}>
        
        {/* Product Name from Description */}
        <div className={`font-sans text-xl font-medium tracking-wide truncate ${themeConfig.bottomTextColor}`}>
          {displayName}
        </div>

        {/* Large Retail Price */}
        <div className={`font-sans font-bold text-5xl tracking-tight my-0.5 ${themeConfig.bottomTextColor}`}>
          ${retailPrice.toLocaleString()}
        </div>

        {/* Manufacturer Line: Batesville Canada, ULC - [Product Code] */}
        <div className="flex items-center justify-between pt-0.5">
          <span className={`font-sans text-base font-semibold tracking-normal ${themeConfig.bottomSubtextColor}`}>
            Batesville Canada, ULC - &nbsp;&nbsp;{product.code}
          </span>
        </div>

        {/* Bottom Copyright Line */}
        <div className={`text-[9px] font-sans tracking-tight mt-0.5 ${themeConfig.bottomCopyrightColor}`}>
          @ 2025 Batesville Services LLC
        </div>

      </div>

    </div>
  );
};
