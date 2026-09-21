import React from 'react';
import { Customer, Product, PriceCardConfig } from '../../../types';

interface CardProps {
  product: Product;
  customer?: Customer;
  config: PriceCardConfig;
  retailPrice: number;
}

export const Card11x17: React.FC<CardProps> = ({ product, customer, config, retailPrice }) => {
  const { theme, showImage, showSpecs, showFeatures, showModelCode, showCustomerLogo, showMonthlyPayment, monthlyTermMonths, customTitle, customSubtitle, footerText } = config;

  const monthlyPayment = showMonthlyPayment && monthlyTermMonths > 0
    ? Math.round(retailPrice / monthlyTermMonths)
    : null;

  const themeStyles = {
    'classic-burgundy': 'bg-white text-slate-800 border-burgundy-900',
    'modern-dark': 'bg-[#0f172a] text-slate-100 border-amber-500/50',
    'clean-white': 'bg-white text-slate-900 border-slate-300',
    'funeral-navy': 'bg-[#0b1320] text-blue-50 border-blue-400/40',
    'champagne-gold': 'bg-[#faf6ee] text-stone-900 border-amber-600/50'
  }[theme];

  const isLight = theme === 'clean-white' || theme === 'champagne-gold' || theme === 'classic-burgundy';

  return (
    <div 
      className={`card-11x17 relative flex flex-col justify-between p-14 rounded-3xl border-8 shadow-2xl overflow-hidden ${themeStyles}`}
      style={{
        width: '1056px', // 11 inches at 96 DPI
        height: '1632px', // 17 inches at 96 DPI
        boxSizing: 'border-box'
      }}
    >
      {/* Ornate Gold Filigree Inset Borders */}
      <div className={`absolute inset-4 border-2 rounded-2xl pointer-events-none ${isLight ? 'border-amber-700/40' : 'border-amber-400/40'}`} />
      <div className={`absolute inset-6 border border-dashed rounded-xl pointer-events-none ${isLight ? 'border-amber-700/20' : 'border-amber-400/20'}`} />

      {/* Grand Showroom Header */}
      <div className="text-center relative pb-6 border-b-2 border-amber-500/30">
        {showCustomerLogo && customer && (
          <div className="flex items-center justify-center space-x-4 mb-3">
            {customer.logoUrl && (
              <img src={customer.logoUrl} alt={customer.name} className="h-14 w-14 rounded-full object-cover border-2 border-amber-500/60 shadow" />
            )}
            <h1 className={`font-serif text-3xl font-extrabold tracking-widest uppercase ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              {customer.name}
            </h1>
          </div>
        )}
        <h2 className={`font-serif text-xl uppercase tracking-widest font-semibold ${isLight ? 'text-stone-700' : 'text-amber-200'}`}>
          {customTitle || 'Selection Room Tribute & Memorial Exhibition'}
        </h2>
        <p className={`text-sm italic mt-1 ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
          {customSubtitle || 'Excellence in Craftsmanship & Timeless Remembrance'}
        </p>
      </div>

      {/* Main Feature Content */}
      <div className="my-auto space-y-8">
        {/* Product Identity Title */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-3 mb-2">
            <span className={`px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-400/20 text-amber-200'}`}>
              {product.category}
            </span>
            {showModelCode && (
              <span className={`px-3 py-1 font-mono text-sm rounded border ${isLight ? 'bg-stone-100 text-stone-700 border-stone-300' : 'bg-white/10 text-stone-200 border-white/20'}`}>
                Batesville Code: {product.code}
              </span>
            )}
          </div>
          <h2 className={`font-serif text-5xl font-black tracking-tight leading-none ${isLight ? 'text-stone-900' : 'text-white'}`}>
            {product.name}
          </h2>
          <p className={`text-xl font-serif italic mt-2 ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
            {product.exteriorFinish}
          </p>
        </div>

        {/* Grand Hero Photo */}
        {showImage && (
          <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border-4 border-amber-500/40 shadow-xl bg-black/10">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute bottom-3 right-4 px-3 py-1 bg-black/70 backdrop-blur text-white text-xs rounded font-mono">
              Batesville Premium Edition
            </div>
          </div>
        )}

        {/* Detailed Engineering Specs & Features Grid */}
        <div className="grid grid-cols-2 gap-6">
          {showSpecs && (
            <div className={`p-6 rounded-2xl border ${isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-white/5 border-white/10'} space-y-3`}>
              <h3 className={`font-serif text-lg font-bold uppercase tracking-wider ${isLight ? 'text-stone-800' : 'text-white'}`}>
                Specifications & Construction
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1 border-stone-200/50">
                  <span className={isLight ? 'text-stone-500' : 'text-stone-400'}>Material & Gauge:</span>
                  <span className="font-semibold">{product.material}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-stone-200/50">
                  <span className={isLight ? 'text-stone-500' : 'text-stone-400'}>Interior Lining:</span>
                  <span className="font-semibold">{product.interior}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-stone-200/50">
                  <span className={isLight ? 'text-stone-500' : 'text-stone-400'}>Exterior Dimensions:</span>
                  <span className="font-semibold">{product.dimensions}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className={isLight ? 'text-stone-500' : 'text-stone-400'}>Hardware & Corners:</span>
                  <span className="font-semibold">Cast Bar & Interchangeable Corners</span>
                </div>
              </div>
            </div>
          )}

          {showFeatures && product.features && product.features.length > 0 && (
            <div className={`p-6 rounded-2xl border ${isLight ? 'bg-amber-50/50 border-amber-200/60' : 'bg-white/5 border-white/10'} space-y-3`}>
              <h3 className={`font-serif text-lg font-bold uppercase tracking-wider ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                Craftsmanship & Heritage
              </h3>
              <div className="space-y-2.5 text-sm">
                {product.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <span className={`text-base leading-none ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>✦</span>
                    <span className="leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Living Memorial Notice Banner */}
        <div className={`p-4 rounded-xl text-center border ${isLight ? 'bg-stone-100/70 border-stone-200 text-stone-700' : 'bg-white/5 border-white/10 text-stone-300'} text-xs`}>
          🌲 <strong>The Living Memorial® Program:</strong> Batesville arranges for a tree seedling to be planted in a national forest as a lasting tribute to each individual honored with this casket.
        </div>
      </div>

      {/* Grand Price Section & Footer */}
      <div className={`mt-auto pt-8 border-t-4 ${isLight ? 'border-amber-700/30' : 'border-amber-400/30'} flex items-end justify-between`}>
        <div className="space-y-1">
          <span className={`text-sm uppercase tracking-widest font-bold block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
            Showroom Investment
          </span>
          {monthlyPayment && (
            <div className={`text-base font-semibold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              Available Payment Plan: ${monthlyPayment} / month ({monthlyTermMonths} Months)
            </div>
          )}
          <p className="text-xs text-stone-400">
            {footerText || 'Includes delivery, inspection, and full Batesville manufacturer warranty.'}
          </p>
        </div>

        <div className="text-right">
          <div className={`font-serif text-6xl font-black tracking-tight ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
            ${retailPrice.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
