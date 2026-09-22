import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';
import { CardCollectionType, RightGraphicType } from './Card6x6';

interface Card8x11Props {
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

export const Card8x11: React.FC<Card8x11Props> = ({
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
      bannerBg: 'bg-[#15662a]', // Emerald Green
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
      bannerBg: 'bg-[#006cb8]', // Royal Blue
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
      bannerBg: 'bg-white border-b-2 border-slate-300', // Crisp White
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

  const materialFinishLine = (() => {
    let m = product.material || 'Premium Steel';
    let f = product.finish || product.exteriorFinish || '';
    f = f.replace(/Finish/i, '').trim();
    if (f && !m.toLowerCase().includes(f.toLowerCase())) {
      return `${m} - ${f}`;
    }
    return m;
  })();

  const interiorLine = (() => {
    let int = product.interior || 'Velvet';
    if (!int.toLowerCase().includes('interior')) {
      return `${int} Interior`;
    }
    return int;
  })();

  const tributeCount = product.lifestories && product.lifesymbols ? 4 : (product.lifesymbols || product.lifestories ? 3 : 2);

  const defaultBullets: string[] = (() => {
    if (collectionType === 'commemorative') {
      return [
        `${tributeCount} Tribute Option Choices`,
        `${tributeCount} Keepsake Medallions or Corners`,
        materialFinishLine,
        '',
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

  const bullets = customBullets && customBullets.length === 6 ? customBullets : defaultBullets;

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

  const activeFeatures = activeMiscFeatures && activeMiscFeatures.length > 0
    ? availableFeatures.filter(f => activeMiscFeatures.includes(f.id) || activeMiscFeatures.includes(f.fileName))
    : availableFeatures.filter(f => f.isDefault).slice(0, 3);

  const displayName = productNameOverride || product.description || product.name;

  return (
    <div 
      className="card-8x11 relative flex flex-col justify-between overflow-hidden shadow-2xl select-none print:shadow-none bg-white"
      style={{
        width: '1056px', // 11 inches wide (Landscape) at 96 DPI
        height: '816px',  // 8.5 inches high (Landscape) at 96 DPI
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. TOP HEADER BANNER */}
      <div className={`${themeConfig.bannerBg} px-8 py-4 flex items-center justify-between shadow-sm shrink-0`}>
        <div className={`flex items-baseline space-x-2 tracking-tight ${themeConfig.isLight ? 'text-slate-900' : 'text-white'}`}>
          <span className="font-bold text-3xl tracking-normal">{themeConfig.titlePrimary}</span>
          <span className="font-normal text-3xl tracking-normal opacity-90">{themeConfig.titleSecondary}</span>
        </div>
        {customer && (
          <div className={`text-sm font-semibold tracking-wider uppercase ${themeConfig.isLight ? 'text-slate-600' : 'text-white/85'}`}>
            {customer.name}
          </div>
        )}
      </div>

      {/* Gold Trim Line for Classic Collection */}
      {collectionType === 'classic' && (
        <div className="h-1.5 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 2. MAIN BODY (HORIZONTAL LANDSCAPE SPLIT) */}
      <div className="flex-1 flex flex-row px-8 py-4 gap-6 overflow-hidden bg-white">
        
        {/* Left Half: 6 Bullet Points on Ledger Grid + Right-Side Graphic */}
        <div className="w-[58%] flex flex-row border-r border-slate-200 pr-5">
          
          {/* Bullets Ledger */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="border-t border-b border-slate-200 divide-y divide-slate-200 text-sm text-slate-800">
              {bullets.map((bullet, idx) => {
                const hasText = Boolean(bullet && bullet.trim().length > 0);
                return (
                  <div key={idx} className="py-2 px-1 flex items-center justify-between min-h-[36px] group hover:bg-amber-50/20">
                    <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                      {hasText ? (
                        <>
                          <span className="text-slate-900 font-bold leading-none select-none text-base shrink-0">•</span>
                          <span className="font-medium text-slate-800 leading-tight truncate">
                            {bullet}
                          </span>
                        </>
                      ) : (
                        <div className="h-[20px] w-full select-none" />
                      )}
                    </div>
                    {hasText && onClearBullet && (
                      <button
                        type="button"
                        onClick={() => onClearBullet(idx)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 font-bold text-xs no-print"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Graphic in Left Box */}
          {rightGraphic !== 'none' && (
            <div className="w-[150px] pl-4 border-l border-slate-200 flex flex-col items-center justify-center shrink-0">
              {rightGraphic === 'refined-styling' ? (
                <img
                  src={`${SUPABASE_MISC_BASE}/Refined%20Styling.png`}
                  onError={(e) => { e.currentTarget.src = '/misc/Refined Styling.png'; }}
                  alt="Refined Styling"
                  className="w-[135px] h-auto object-contain drop-shadow"
                />
              ) : (
                <img
                  src={`${SUPABASE_MISC_BASE}/Tributes.png`}
                  onError={(e) => { e.currentTarget.src = '/misc/Tributes.png'; }}
                  alt="Tributes"
                  className="w-[135px] h-auto object-contain"
                />
              )}
            </div>
          )}

        </div>

        {/* Right Half: Large Showcase Product Image */}
        <div className="w-[42%] flex flex-col items-center justify-center p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={displayName} 
              className="max-w-full max-h-[260px] object-contain drop-shadow-md"
            />
          ) : (
            <div className="text-center text-slate-400 italic text-sm">
              Product Image Placeholder
            </div>
          )}
          <div className="text-xs font-mono text-slate-500 mt-2">
            Model #{product.code}
          </div>
        </div>

      </div>

      {/* 3. ADDITIONAL FEATURES BAR */}
      <div className="bg-[#f0f2f5] border-t border-b border-slate-300/80 px-8 py-2.5 shrink-0">
        <div className="font-bold text-xs text-slate-900 tracking-tight mb-1.5 uppercase">
          Additional Features
        </div>
        <div className="grid grid-cols-3 gap-3">
          {activeFeatures.map((feat) => {
            const miscImageUrl = `${SUPABASE_MISC_BASE}/${encodeURIComponent(feat.fileName)}`;
            const localFallback = `/misc/${feat.fileName}`;

            return (
              <div 
                key={feat.id}
                className="bg-white rounded-lg border border-slate-200 p-2 flex items-center space-x-2.5 shadow-sm"
              >
                <div className="w-12 h-12 shrink-0 bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center">
                  <img 
                    src={miscImageUrl}
                    onError={(e) => {
                      if (e.currentTarget.src !== localFallback) {
                        e.currentTarget.src = localFallback;
                      }
                    }}
                    alt={feat.title}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-slate-900 leading-tight truncate">
                    {feat.title}
                  </h5>
                  <p className="text-[10px] text-slate-500 italic leading-tight mt-0.5 line-clamp-2">
                    {feat.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gold Trim Line for Classic Collection bottom banner */}
      {collectionType === 'classic' && (
        <div className="h-1 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 4. BOTTOM BANNER */}
      <div className={`${themeConfig.bottomBannerBg} px-8 py-3.5 flex items-center justify-between shrink-0`}>
        <div>
          <div className={`font-sans text-2xl font-medium tracking-wide truncate ${themeConfig.bottomTextColor}`}>
            {displayName}
          </div>
          <div className={`font-sans text-base font-semibold tracking-normal mt-0.5 ${themeConfig.bottomSubtextColor}`}>
            Batesville Canada, ULC - &nbsp;&nbsp;{product.code}
          </div>
          <div className={`text-[10px] font-sans tracking-tight mt-1 ${themeConfig.bottomCopyrightColor}`}>
            @ 2025 Batesville Services LLC
          </div>
        </div>

        {/* Large Retail Price */}
        <div className={`font-sans font-bold text-6xl tracking-tight ${themeConfig.bottomTextColor}`}>
          ${retailPrice.toLocaleString()}
        </div>
      </div>

    </div>
  );
};
