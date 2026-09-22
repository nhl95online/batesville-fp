import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';
import { CardCollectionType } from './Card6x6';

interface Card2x12Props {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
  collectionType?: CardCollectionType;
  productNameOverride?: string;
}

export const Card2x12: React.FC<Card2x12Props> = ({
  product,
  customer,
  config,
  retailPrice,
  collectionType = 'classic',
  productNameOverride,
}) => {
  // Collection Titles for 2x12 Urn Strips (Exact specifications)
  const collectionInfo = {
    'classic': {
      headerBg: 'bg-[#3b434e]',
      headerTitle: 'CLASSIC Collection - Refined styling and premium materials',
      accentBorder: 'border-b-2 border-amber-400',
      isLight: false,
    },
    'commemorative': {
      headerBg: 'bg-[#15662a]',
      headerTitle: 'COMMEMORATIVE Collection - Touching ways to tell the story',
      accentBorder: 'border-b-2 border-emerald-500',
      isLight: false,
    },
    'conventional': {
      headerBg: 'bg-[#006cb8]',
      headerTitle: 'CONVENTIONAL Collection - Traditional styling and materials',
      accentBorder: 'border-b-2 border-blue-400',
      isLight: false,
    },
    'basic': {
      headerBg: 'bg-white',
      headerTitle: 'BASIC Collection - Traditional value and materials',
      accentBorder: 'border-b-2 border-slate-300',
      isLight: true,
    },
  }[collectionType] || {
    headerBg: 'bg-[#3b434e]',
    headerTitle: 'CLASSIC Collection - Refined styling and premium materials',
    accentBorder: 'border-b-2 border-amber-400',
    isLight: false,
  };

  const displayName = productNameOverride || product.description || product.name;

  return (
    <div 
      className="card-2x12 relative flex flex-col justify-between overflow-hidden shadow-2xl select-none print:shadow-none bg-white border border-slate-300"
      style={{
        width: '1152px', // 12 inches at 96 DPI
        height: '192px',  // 2 inches at 96 DPI
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. TOP HEADER STRIP WITH EXACT COLLECTION TITLE */}
      <div className={`${collectionInfo.headerBg} ${collectionInfo.accentBorder} px-6 py-2 flex items-center justify-between shrink-0 shadow-sm`}>
        <div className={`text-base font-bold italic tracking-wide ${collectionInfo.isLight ? 'text-slate-900' : 'text-white'}`}>
          {collectionInfo.headerTitle}
        </div>
        {customer && (
          <div className={`text-xs font-semibold uppercase tracking-wider ${collectionInfo.isLight ? 'text-slate-600' : 'text-white/80'}`}>
            {customer.name}
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT SECTION DIVIDED INTO DOTTED COLUMNS */}
      <div className="flex-1 flex items-center justify-between px-6 py-2 divide-x divide-dashed divide-blue-400 bg-white">
        
        {/* Column 1: Batesville Branding & Urn Thumbnail */}
        <div className="flex items-center space-x-4 pr-6 shrink-0 min-w-[260px]">
          {/* Batesville Tree Logo Representation */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <svg className="w-9 h-9 text-[#15662a]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7.58 2 4 5.58 4 10c0 2.5 1.15 4.73 2.95 6.2L6 22h12l-.95-5.8C18.85 14.73 20 12.5 20 10c0-4.42-3.58-8-8-8zm-1 16H9v-2h2v2zm0-4H9v-2h2v2zm0-4H9V8h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v2z"/>
            </svg>
            <span className="text-[11px] font-serif font-bold text-slate-900 tracking-tight leading-none mt-0.5">
              Batesville
            </span>
          </div>

          {/* Urn Photo / Preview */}
          {product.imageUrl && (
            <div className="w-20 h-20 bg-slate-50 rounded-md border border-slate-200 overflow-hidden flex items-center justify-center p-1">
              <img 
                src={product.imageUrl} 
                alt={displayName} 
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* Column 2: Urn Model Description & Specs */}
        <div className="flex-1 px-6 min-w-0">
          <h3 className="font-sans text-xl font-bold text-slate-900 truncate leading-tight">
            {displayName}
          </h3>
          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
            {product.material} {product.finish ? `• ${product.finish}` : ''}
          </p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              SKU: {product.code}
            </span>
            {product.interior && (
              <span className="truncate">{product.interior}</span>
            )}
          </div>
        </div>

        {/* Column 3: Large Retail Price */}
        <div className="px-6 text-right shrink-0 min-w-[200px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-none">
            Showroom Retail
          </span>
          <div className="font-sans font-extrabold text-4xl text-slate-950 tracking-tight leading-tight my-0.5">
            ${retailPrice.toLocaleString()}
          </div>
        </div>

        {/* Column 4: Manufacturer Footer & Copyright */}
        <div className="pl-6 text-right shrink-0 min-w-[190px]">
          <div className="font-sans font-bold text-sm text-slate-900 leading-tight">
            Batesville Canada, ULC
          </div>
          <div className="font-mono text-xs font-semibold text-slate-600 mt-0.5">
            Item #{product.code}
          </div>
          <div className="text-[9px] text-slate-400 mt-1">
            @ 2025 Batesville Services LLC
          </div>
        </div>

      </div>
    </div>
  );
};
