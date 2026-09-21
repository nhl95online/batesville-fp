import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

interface CardProps {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
}

export const Card8x11: React.FC<CardProps> = ({ product, customer, config, retailPrice }) => {
  const { theme, showImage, showSpecs, showFeatures, showModelCode, showCustomerLogo, showMonthlyPayment, monthlyTermMonths, customTitle, customSubtitle, footerText } = config;

  const monthlyPayment = showMonthlyPayment && monthlyTermMonths > 0
    ? Math.round(retailPrice / monthlyTermMonths)
    : null;

  const themeStyles = {
    'classic-burgundy': 'bg-white text-slate-800 border-burgundy-800',
    'modern-dark': 'bg-slate-900 text-slate-100 border-amber-500/40',
    'clean-white': 'bg-white text-slate-900 border-slate-300',
    'funeral-navy': 'bg-gradient-to-b from-[#0c1626] to-[#070d17] text-blue-50 border-blue-400/40',
    'champagne-gold': 'bg-[#faf7f0] text-stone-900 border-amber-600/50'
  }[theme];

  const isLight = theme === 'clean-white' || theme === 'champagne-gold' || theme === 'classic-burgundy';

  return (
    <div 
      className={`card-8x11 relative flex flex-col justify-between p-10 rounded-2xl border-4 shadow-xl overflow-hidden ${themeStyles}`}
      style={{
        width: '816px',  // 8.5 inches at 96 DPI
        height: '1056px', // 11 inches at 96 DPI
        boxSizing: 'border-box'
      }}
    >
      {/* Decorative Ornate Border Inset */}
      <div className={`absolute inset-3 border-2 pointer-events-none rounded-xl ${isLight ? 'border-amber-700/30' : 'border-amber-400/30'}`} />

      {/* Header: Funeral Home Presentation Banner */}
      <div className="border-b pb-4 relative text-center">
        {showCustomerLogo && customer && (
          <div className="flex items-center justify-center space-x-3 mb-2">
            {customer.logoUrl && (
              <img src={customer.logoUrl} alt={customer.name} className="h-10 w-10 rounded-full object-cover border border-amber-600/40" />
            )}
            <h2 className={`font-serif text-xl font-bold tracking-wider uppercase ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              {customer.name}
            </h2>
          </div>
        )}
        <p className={`text-xs uppercase tracking-widest font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
          {customTitle || 'Memorial Showroom Selection & Tribute Guide'}
        </p>
        {customSubtitle && (
          <p className="text-xs text-stone-400 italic mt-0.5">{customSubtitle}</p>
        )}
      </div>

      {/* Hero Showcase: Product Name & Image */}
      <div className="my-auto space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-400/20 text-amber-200'}`}>
              {product.category}
            </span>
            {showModelCode && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${isLight ? 'bg-stone-100 text-stone-600' : 'bg-white/10 text-stone-300'}`}>
                Model: {product.code}
              </span>
            )}
          </div>
          <h1 className={`font-serif text-3xl font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
            {product.name}
          </h1>
          <p className={`text-sm italic mt-1 ${isLight ? 'text-amber-900' : 'text-amber-200'}`}>
            {product.exteriorFinish}
          </p>
        </div>

        {/* Large Product Photography */}
        {showImage && (
          <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-amber-500/30 bg-black/5 shadow-md">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}

        {/* Specifications Grid */}
        {showSpecs && (
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-white/5 border-white/10'} text-xs grid grid-cols-2 gap-4`}>
            <div>
              <span className={`block font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Casket Material / Gauge</span>
              <span className="font-semibold text-sm">{product.material}</span>
            </div>
            <div>
              <span className={`block font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Interior Upholstery</span>
              <span className="font-semibold text-sm">{product.interior}</span>
            </div>
            <div>
              <span className={`block font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Exterior Dimensions</span>
              <span className="font-semibold">{product.dimensions}</span>
            </div>
            <div>
              <span className={`block font-medium ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Manufactured By</span>
              <span className="font-semibold">Batesville Casket Company</span>
            </div>
          </div>
        )}

        {/* Craftsmanship Features */}
        {showFeatures && product.features && product.features.length > 0 && (
          <div className="space-y-2">
            <h4 className={`text-xs uppercase font-bold tracking-wider ${isLight ? 'text-stone-600' : 'text-stone-300'}`}>
              Distinguished Features & Craftsmanship
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {product.features.map((feature, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className={`text-sm ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>✦</span>
                  <span className="leading-snug">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing & Honor Box */}
      <div className={`mt-auto pt-6 border-t-2 ${isLight ? 'border-amber-700/20' : 'border-amber-400/20'} flex items-center justify-between`}>
        <div>
          <span className={`text-xs uppercase tracking-wider block font-semibold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
            Showroom Investment
          </span>
          {monthlyPayment && (
            <span className={`text-sm font-medium ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              Flexible Financing: ~${monthlyPayment} / month ({monthlyTermMonths} mos)
            </span>
          )}
          <p className="text-[11px] text-stone-400 mt-0.5">
            {footerText || 'Living Memorial Program: A tree is planted in honor of your loved one.'}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-serif text-5xl font-black tracking-tight ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
            ${retailPrice.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
