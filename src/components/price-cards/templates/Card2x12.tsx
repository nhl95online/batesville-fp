import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

interface CardProps {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
}

export const Card2x12: React.FC<CardProps> = ({ product, customer, config, retailPrice }) => {
  const { theme, showImage, showSpecs, showModelCode, showCustomerLogo, showMonthlyPayment, monthlyTermMonths } = config;

  const monthlyPayment = showMonthlyPayment && monthlyTermMonths > 0
    ? Math.round(retailPrice / monthlyTermMonths)
    : null;

  const themeStyles = {
    'classic-burgundy': 'bg-gradient-to-r from-[#3a060e] via-[#2a040a] to-[#3a060e] text-amber-50 border-amber-500/50 shadow-burgundy-900/40',
    'modern-dark': 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-slate-100 border-amber-400/40 shadow-slate-950/40',
    'clean-white': 'bg-white text-slate-800 border-amber-700/40 shadow-slate-300',
    'funeral-navy': 'bg-gradient-to-r from-[#0c1626] via-[#070e1a] to-[#0c1626] text-blue-50 border-blue-400/40 shadow-navy-950/40',
    'champagne-gold': 'bg-gradient-to-r from-[#faf6ed] via-[#f3ebe0] to-[#faf6ed] text-stone-900 border-amber-600/60 shadow-amber-900/10'
  }[theme];

  const isLight = theme === 'clean-white' || theme === 'champagne-gold';

  return (
    <div 
      className={`card-2x12 relative flex items-center justify-between px-6 py-2 rounded-lg border-2 overflow-hidden transition-all ${themeStyles}`}
      style={{
        width: '1152px', // 12 inches at 96 DPI
        height: '192px',  // 2 inches at 96 DPI
        boxSizing: 'border-box'
      }}
    >
      {/* Decorative Outer Inset Border */}
      <div className={`absolute inset-1.5 border border-dashed rounded pointer-events-none ${isLight ? 'border-amber-700/30' : 'border-amber-400/30'}`} />

      {/* Left Section: Logo & Image Preview */}
      <div className="flex items-center space-x-4 max-w-[280px]">
        {showImage && (
          <div className="w-32 h-24 rounded border border-amber-500/30 overflow-hidden shrink-0 bg-black/10">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}
        <div className="truncate">
          {showCustomerLogo && customer && (
            <div className="flex items-center space-x-2">
              {customer.logoUrl && (
                <img src={customer.logoUrl} alt={customer.name} className="h-6 max-w-[50px] object-contain rounded shrink-0" />
              )}
              <div className={`text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                {customer.name}
              </div>
            </div>
          )}
          {showModelCode && (
            <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 mt-1 rounded border ${isLight ? 'bg-amber-100 text-stone-700 border-amber-300' : 'bg-white/10 text-amber-200 border-amber-400/30'}`}>
              {product.code}
            </span>
          )}
        </div>
      </div>

      {/* Middle Section: Product Details & Specs */}
      <div className="flex-1 px-6 text-center max-w-[520px]">
        <h3 className={`font-serif text-xl font-bold leading-tight ${isLight ? 'text-stone-900' : 'text-white'}`}>
          {product.name}
        </h3>
        <p className={`text-xs mt-0.5 truncate italic ${isLight ? 'text-stone-600' : 'text-amber-200/80'}`}>
          {product.exteriorFinish}
        </p>

        {showSpecs && (
          <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
            <span className="truncate">
              <strong className={isLight ? 'text-stone-700' : 'text-stone-300'}>Material:</strong> {product.material}
            </span>
            <span>•</span>
            <span className="truncate">
              <strong className={isLight ? 'text-stone-700' : 'text-stone-300'}>Interior:</strong> {product.interior}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Price & Finance */}
      <div className="text-right pl-6 border-l border-amber-500/30 shrink-0 min-w-[200px]">
        <span className={`text-[11px] uppercase tracking-wider block font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
          Showroom Price
        </span>
        <div className={`font-serif text-4xl font-extrabold tracking-tight ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
          ${retailPrice.toLocaleString()}
        </div>
        {monthlyPayment && (
          <div className={`text-xs font-medium mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
            Est. ${monthlyPayment}/mo ({monthlyTermMonths} mo)
          </div>
        )}
      </div>
    </div>
  );
};
