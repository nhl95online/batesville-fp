import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { getProductPerformanceByYears } from '../../services/db';
import { X, Check, ShieldCheck, Tag, TrendingUp, Calendar, Ruler, Award, DollarSign } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onCreatePriceCard: (productId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onCreatePriceCard,
}) => {
  const [history, setHistory] = useState<{ year: string | number; revenue: number; units: number; ordersCount: number }[]>([]);
  const [activeImage, setActiveImage] = useState<string>(product.imageUrl);

  useEffect(() => {
    async function loadPerf() {
      const data = await getProductPerformanceByYears(product.code || product.id);
      setHistory(data);
    }
    loadPerf();
  }, [product.id, product.code]);

  const allImages = [product.imageUrl, ...(product.additionalImages || [])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {product.category}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Model: {product.code}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* Top Section: Photo & Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="relative h-64 md:h-72 w-full rounded-2xl overflow-hidden border border-slate-700 bg-black/40 shadow-inner">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {allImages.length > 1 && (
                <div className="flex items-center space-x-2">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImage === img ? 'border-amber-400 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta & Pricing */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 className="font-serif text-3xl font-bold text-white leading-tight">
                  {product.name}
                </h2>
                <p className="text-sm font-medium text-amber-300/90 mt-1 italic">
                  {product.exteriorFinish}
                </p>

                {/* Casket Merchandising Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {product.lifesymbols && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                      ✦ LifeSymbols® Corners
                    </span>
                  )}
                  {product.lifestories && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
                      ★ LifeStories® Medallions
                    </span>
                  )}
                  {product.lifeview && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                      ▣ LifeView® Panel
                    </span>
                  )}
                  {(product.dualDisposition || product.dual_disposition) && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                      ✓ Dual Disposition (Burial & Cremation)
                    </span>
                  )}
                  {product.oversize && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                      ⚠ Oversize Model
                    </span>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Wholesale Base Cost:</span>
                    <span className="font-mono text-emerald-400 text-sm font-semibold">${product.wholesalePrice.toLocaleString()}</span>
                  </div>
                  {product.category && (
                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-2">
                      <span className="text-slate-400">Category & Subcategory:</span>
                      <span className="text-slate-300">{product.category} {product.subcategory ? `• ${product.subcategory}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Jump directly into Price Card Generator */}
              <button
                onClick={() => {
                  onCreatePriceCard(product.id);
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>Create Price Card for This Product</span>
              </button>
            </div>
          </div>

          {/* Specifications & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            {/* Technical Specs */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-400" />
                Casket Dimensions & Technical Specifications
              </h3>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product Code / SKU:</span>
                  <span className="font-mono text-amber-300 font-semibold">{product.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Material / Composition:</span>
                  <span className="text-slate-200 font-semibold">{product.material}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exterior Finish:</span>
                  <span className="text-slate-200">{product.finish || product.exteriorFinish}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Interior Fabric & Style:</span>
                  <span className="text-slate-200 font-semibold">{product.interior}</span>
                </div>
                {product.top && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cap / Top Style:</span>
                    <span className="text-slate-200">{product.top}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Exterior Dimensions:</span>
                  <span className="text-slate-200 font-mono">
                    {product.extLength && product.extWidth
                      ? `${product.extLength}" L × ${product.extWidth}" W × ${product.extHeight || 23.0}" H`
                      : product.dimensions}
                  </span>
                </div>
                {product.intWidth && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interior Width:</span>
                    <span className="text-slate-200 font-mono font-semibold text-amber-400">{product.intWidth}" Interior</span>
                  </div>
                )}
                {(product.capacity || product.weightLbs) && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capacity / Weight:</span>
                    <span className="text-slate-200 font-mono">{product.capacity || product.weightLbs} lbs</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Catalog Year:</span>
                  <span className="font-mono text-slate-300">{product.year || product.catalogYear}</span>
                </div>
              </div>
            </div>

            {/* Batesville Features */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Casket Craftsmanship & Program Options
              </h3>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                {product.features.map((feature, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Year-to-Year Product Sales Performance Breakdown */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Year-to-Year Sales Performance Breakdown
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {history.map((yr) => (
                <div key={yr.year} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl text-center">
                  <div className="text-xs font-semibold text-slate-400 mb-1">{yr.year}</div>
                  <div className="text-lg font-serif font-bold text-amber-300">
                    ${yr.revenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {yr.units} units ({yr.ordersCount} orders)
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
