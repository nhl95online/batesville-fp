import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';
import { CardCollectionType, RightGraphicType } from './Card6x6';

interface Card11x17Props {
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

export const Card11x17: React.FC<Card11x17Props> = ({
  product,
  retailPrice,
  collectionType = 'commemorative',
  productNameOverride,
  customBullets,
  activeMiscFeatures,
  rightGraphic = collectionType === 'classic' ? 'refined-styling' : (collectionType === 'basic' ? 'none' : 'tributes'),
  onClearBullet,
}) => {
  // Collection Theme Styling (Matching 6x6)
  const themeConfig = {
    'commemorative': {
      bannerBg: 'bg-[#15662a]', // Rich Batesville Emerald Green
      accentBorder: 'border-emerald-600',
      titlePrimary: 'Commemorative',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-gradient-to-r from-[#15662a] from-25% via-[#28793b] via-60% to-white to-92%',
      bottomAccentTrim: 'bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/80',
      bottomRightCodeColor: 'text-slate-900',
    },
    'classic': {
      bannerBg: 'bg-[#3b434e]', // Charcoal Slate
      accentBorder: 'border-[#c59b27]',
      titlePrimary: 'Classic',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-gradient-to-r from-[#4a515a] from-25% via-[#707985] via-60% to-white to-92%',
      bottomAccentTrim: 'bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/80',
      bottomRightCodeColor: 'text-slate-900',
    },
    'conventional': {
      bannerBg: 'bg-[#006cb8]', // Batesville Royal Blue
      accentBorder: 'border-blue-600',
      titlePrimary: 'Conventional',
      titleSecondary: 'Collection',
      isLight: false,
      bottomBannerBg: 'bg-gradient-to-r from-[#006cb8] from-25% via-[#2287d9] via-60% to-white to-92%',
      bottomAccentTrim: 'bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/80',
      bottomRightCodeColor: 'text-slate-900',
    },
    'basic': {
      bannerBg: 'bg-white border-b-2 border-slate-300', // Crisp Showroom White
      accentBorder: 'border-slate-300',
      titlePrimary: 'Basic',
      titleSecondary: 'Collection',
      isLight: true,
      bottomBannerBg: 'bg-gradient-to-r from-[#475569] from-25% via-[#758498] via-60% to-white to-92%',
      bottomAccentTrim: 'bg-gradient-to-r from-[#94a3b8] via-[#e2e8f0] to-[#64748b]',
      bottomTextColor: 'text-white',
      bottomSubtextColor: 'text-white/95',
      bottomCopyrightColor: 'text-white/80',
      bottomRightCodeColor: 'text-slate-900',
    }
  }[collectionType] || {
    bannerBg: 'bg-[#15662a]',
    accentBorder: 'border-emerald-600',
    titlePrimary: 'Commemorative',
    titleSecondary: 'Collection',
    isLight: false,
    bottomBannerBg: 'bg-gradient-to-r from-[#15662a] from-25% via-[#28793b] via-60% to-white to-92%',
    bottomAccentTrim: 'bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c]',
    bottomTextColor: 'text-white',
    bottomSubtextColor: 'text-white/95',
    bottomCopyrightColor: 'text-white/80',
    bottomRightCodeColor: 'text-slate-900',
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
        'LifeView Display optional',
        interiorLine,
        '',
      ];
    } else if (collectionType === 'classic') {
      return [
        'Fine craftsmanship',
        'Exceptional finish',
        materialFinishLine,
        'Timeless design',
        interiorLine,
        '',
      ];
    } else if (collectionType === 'conventional') {
      return [
        'Quality craftsmanship',
        'Reliable protection',
        materialFinishLine,
        'Traditional styling',
        interiorLine,
        '',
      ];
    } else {
      return [
        'Essential craftsmanship',
        'Dignified simplicity',
        materialFinishLine,
        'Standard styling',
        interiorLine,
        '',
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
    : availableFeatures.filter(f => f.isDefault).slice(0, 2);

  const displayName = productNameOverride || product.description || product.name;

  return (
    <div 
      className="card-11x17 relative flex flex-col justify-between overflow-hidden shadow-2xl select-none print:shadow-none bg-white"
      style={{
        width: '1632px', // 17 inches wide (Landscape) at 96 DPI
        height: '1056px', // 11 inches high (Landscape) at 96 DPI
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. TOP HEADER BANNER (Scaled 6x6 style) */}
      <div className={`${themeConfig.bannerBg} px-12 py-6 flex items-center justify-between shadow-sm shrink-0`}>
        <div className={`flex items-baseline space-x-3 tracking-tight ${themeConfig.isLight ? 'text-slate-900' : 'text-white'}`}>
          <span className="font-bold text-5xl tracking-normal">{themeConfig.titlePrimary}</span>
          <span className="font-normal text-5xl tracking-normal opacity-90">{themeConfig.titleSecondary}</span>
        </div>
      </div>

      {/* Gold Trim Line for Classic Collection */}
      {collectionType === 'classic' && (
        <div className="h-2 bg-gradient-to-r from-[#b38728] via-[#fbf5b7] to-[#aa771c] shrink-0" />
      )}

      {/* 2. SPECIFICATION BULLETS & RIGHT GRAPHIC (TRIBUTES / REFINED STYLING - Scaled 6x6 style, no casket image) */}
      <div className="flex-1 bg-white flex flex-row px-12 py-8 relative overflow-hidden">
        
        {/* Left Side: Clean Specification Bullets */}
        <div className="flex-1 pr-8 flex flex-col justify-start">
          <div className="space-y-3.5 text-2xl text-slate-800 py-1">
            {bullets.map((bullet, idx) => {
              const hasText = Boolean(bullet && bullet.trim().length > 0);
              if (!hasText) return null;
              return (
                <div key={idx} className="py-1.5 px-2 flex items-center justify-between group hover:bg-amber-50/30 transition-colors rounded">
                  <div className="flex items-center space-x-4 flex-1 min-w-0 pr-3">
                    <span className="text-slate-900 font-bold leading-none select-none text-3xl shrink-0">•</span>
                    <span className="font-medium text-slate-800 leading-tight truncate">
                      {bullet}
                    </span>
                  </div>
                  {onClearBullet && (
                    <button
                      type="button"
                      onClick={() => onClearBullet(idx)}
                      title="Clear bullet point"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 font-bold text-base px-1 no-print transition-opacity shrink-0 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: TRIBUTES Graphic or REFINED STYLING Medallion */}
        {rightGraphic !== 'none' && (
          <div className="w-[480px] pl-8 flex flex-col items-center justify-center shrink-0">
            {rightGraphic === 'refined-styling' ? (
              <img
                src="/misc/Refined Styling.png"
                onError={(e) => { e.currentTarget.src = `${SUPABASE_MISC_BASE}/Refined%20Styling.png`; }}
                alt="Refined Styling Classic Collection"
                className="w-full max-w-[440px] max-h-[420px] h-auto object-contain"
              />
            ) : (
              <img
                src="/misc/Tributes.png"
                onError={(e) => { e.currentTarget.src = `${SUPABASE_MISC_BASE}/Tributes.png`; }}
                alt="Tribute Option Categories"
                className="w-full max-w-[440px] max-h-[420px] h-auto object-contain"
              />
            )}
          </div>
        )}

      </div>

      {/* 3. ADDITIONAL FEATURES SECTION (Scaled 6x6 style) */}
      <div className="bg-[#f0f2f5] border-t border-b border-slate-300/80 px-12 py-4 shrink-0">
        <div className="font-bold text-sm text-slate-900 tracking-tight mb-2.5 uppercase">
          Additional Features
        </div>
        <div className={`grid ${activeFeatures.length >= 3 ? 'grid-cols-3 gap-5' : activeFeatures.length === 2 ? 'grid-cols-2 gap-5 max-w-[1100px]' : 'grid-cols-1 max-w-[640px]'}`}>
          {activeFeatures.map((feat) => {
            const miscImageUrl = `${SUPABASE_MISC_BASE}/${encodeURIComponent(feat.fileName)}`;
            const localFallback = `/misc/${feat.fileName}`;

            return (
              <div 
                key={feat.id}
                className="bg-white rounded-xl border border-slate-200/90 p-3 flex items-center space-x-4 shadow-sm"
              >
                <div className="w-18 h-18 shrink-0 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center">
                  <img 
                    src={miscImageUrl}
                    onError={(e) => {
                      if (e.currentTarget.src !== localFallback) {
                        e.currentTarget.src = localFallback;
                      }
                    }}
                    alt={feat.title}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-base text-slate-900 leading-tight truncate">
                    {feat.title}
                  </h5>
                  <p className="text-sm text-slate-500 italic leading-tight mt-1 line-clamp-2">
                    {feat.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Bevel Shadow & Metallic Accent Trim Line */}
      <div className="h-3 bg-gradient-to-b from-transparent to-black/20 shrink-0 -mb-3 pointer-events-none z-10" />
      <div className={`h-2 ${themeConfig.bottomAccentTrim} shrink-0 z-10 shadow-xs`} />

      {/* 4. BOTTOM BANNER WITH COLOR-TO-WHITE HORIZONTAL GRADIENT (Scaled 6x6 style) */}
      <div className={`${themeConfig.bottomBannerBg} px-12 pt-5 pb-4 flex flex-col justify-between shrink-0 relative overflow-hidden`}>
        
        {/* Product Name from Description */}
        <div className={`font-sans text-3xl font-normal tracking-wide truncate ${themeConfig.bottomTextColor} drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]`}>
          {displayName}
        </div>

        {/* Large Retail Price */}
        <div className={`font-sans font-bold text-7xl tracking-tight my-1 ${themeConfig.bottomTextColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]`}>
          ${retailPrice.toLocaleString()}
        </div>

        {/* Product SKU/Code directly below price */}
        <div className={`font-sans text-2xl font-semibold tracking-normal -mt-0.5 ${themeConfig.bottomSubtextColor} drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]`}>
          {product.code}
        </div>

        {/* Bottom Bar: Copyright on left, Item Code on right in white gradient zone */}
        <div className="flex items-center justify-between pt-2 mt-1">
          <span className={`text-sm font-sans tracking-tight ${themeConfig.bottomCopyrightColor}`}>
            © 2025 Batesville Services, LLC
          </span>
          <span className={`text-sm font-mono font-bold tracking-wider ${themeConfig.bottomRightCodeColor}`}>
            {product.code ? `13060${product.code}`.slice(0, 10) : '1306000082'}
          </span>
        </div>

      </div>

    </div>
  );
};
