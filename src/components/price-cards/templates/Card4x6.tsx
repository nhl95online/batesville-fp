import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

interface Card4x6Props {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
  productNameOverride?: string;
  customBullets?: string[];
  activeMiscFeatures?: string[];
  showModelCode?: boolean;
}

const SUPABASE_MISC_BASE = 'https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/misc';

// Short labels for the round feature icons along the bottom of the 4x6 card
const FEATURE_ICONS: { id: string; label: string; fileName: string }[] = [
  { id: 'memorysafe', label: 'MemorySafe® Drawer', fileName: 'MemorySafe.png' },
  { id: 'livingtree', label: 'Living Memorial® Program', fileName: 'LivingTree.png' },
  { id: 'embroidered', label: 'Embroidered Tribute Panel', fileName: 'Embroidered Cap Panel.png' },
  { id: 'lifestories', label: 'LifeStories® Medallions', fileName: 'LifeStories.png' },
  { id: 'lifesymbols', label: 'LifeSymbols® Corners', fileName: 'LifeSymbols.png' },
  { id: 'memorialrecord', label: 'Memorial Record® System', fileName: 'MemorialRecord.png' },
];

/** Default 4x6 bullets: material/gauge and interior (matches showroom tent card) */
export function get4x6DefaultBullets(product?: Product): string[] {
  if (!product) return ['', '', '', '', '', ''];
  const material = (product.material || '').trim();
  const interior = (product.interior || '').trim();
  return [material, interior, '', '', '', ''];
}

/**
 * 4" x 6" Showroom Tent Card (landscape 6" wide x 4" tall)
 * Layout: Name -> item # -> bullets -> price -> feature icons -> copyright
 */
export const Card4x6: React.FC<Card4x6Props> = ({
  product,
  retailPrice,
  productNameOverride,
  customBullets,
  activeMiscFeatures,
  showModelCode = true,
}) => {
  const displayName = productNameOverride || product.description || product.name;

  const bullets = (customBullets && customBullets.length > 0 ? customBullets : get4x6DefaultBullets(product))
    .map(b => (b || '').trim())
    .filter(Boolean)
    .slice(0, 4);

  const icons = FEATURE_ICONS.filter(f => (activeMiscFeatures || []).includes(f.id) || (activeMiscFeatures || []).includes(f.fileName)).slice(0, 4);

  return (
    <div
      className="card-4x6 relative flex flex-col overflow-hidden shadow-2xl select-none print:shadow-none bg-white border border-slate-300"
      style={{
        width: '576px',  // 6 inches at 96 DPI
        height: '384px', // 4 inches at 96 DPI
        boxSizing: 'border-box',
        padding: '22px 26px 10px 26px',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* 1. Product Name */}
      <h2
        className="font-bold leading-tight text-[#2b3270] tracking-tight"
        style={{ fontSize: displayName.length > 30 ? '24px' : '28px' }}
      >
        {displayName}
      </h2>

      {/* Item # */}
      {showModelCode && product.code && (
        <div className="text-[15px] text-slate-700 mt-1 leading-none">{product.code}</div>
      )}

      {/* 2. Bullets */}
      {bullets.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[16px] text-slate-800 leading-snug flex items-start">
              <span className="mr-1.5">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 3. Price */}
      <div className="mt-3 font-bold text-[#2b3270] leading-none tracking-tight" style={{ fontSize: '34px' }}>
        ${Math.round(retailPrice).toLocaleString()}
      </div>

      {/* Spacer pushes icons to the bottom */}
      <div className="flex-1" />

      {/* 4. Feature Icons */}
      {icons.length > 0 && (
        <div className="flex items-end gap-4 mb-1">
          {icons.map(f => (
            <div key={f.id} className="flex flex-col items-center w-[64px]">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                <img
                  src={`${SUPABASE_MISC_BASE}/${encodeURIComponent(f.fileName)}`}
                  alt={f.label}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="text-[9px] text-slate-700 text-center leading-tight mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Copyright */}
      <div className="text-[8px] text-slate-500 leading-none">© {new Date().getFullYear()} Batesville Services, LLC</div>
    </div>
  );
};
