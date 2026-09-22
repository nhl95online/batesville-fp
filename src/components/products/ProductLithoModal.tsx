import React, { useState } from 'react';
import { Product, Customer } from '../../types';
import { isUrnProduct } from '../../services/supabase';
import { 
  Printer, 
  X, 
  Sparkles, 
  TreePine, 
  ShieldCheck, 
  Layers, 
  Ruler, 
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';

interface ProductLithoModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export const ProductLithoModal: React.FC<ProductLithoModalProps> = ({
  product,
  isOpen,
  onClose,
  customer
}) => {
  const [showPrice, setShowPrice] = useState(true);
  const [customRetailPrice, setCustomRetailPrice] = useState<string>('');

  if (!isOpen || !product) return null;

  const isUrn = isUrnProduct(product);

  // Suggested retail calculation based on customer markup or default 2.5x
  const markupMultiplier = customer?.defaultMarkupPercent ? (1 + customer.defaultMarkupPercent / 100) : 2.5;
  const defaultRetail = Math.round((product.price || product.wholesalePrice || 1200) * markupMultiplier);
  const activeRetailPrice = customRetailPrice !== '' ? Number(customRetailPrice) : defaultRetail;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      {/* Container - Hidden on print, print target replaces whole page during window.print() */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Modal Toolbar (Non-printable) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-amber-300">
                Official Batesville Litho / Tearsheet Showcase
              </h2>
              <p className="text-xs text-slate-400">
                Ready to print 8.5" × 11" product cut sheet for funeral arrangement presentation.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Price Toggle */}
            <button
              onClick={() => setShowPrice(!showPrice)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {showPrice ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showPrice ? 'Retail Price Visible' : 'Price Hidden'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Litho (8.5×11)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 flex justify-center">
          
          {/* Authentic 8.5" x 11" Litho Canvas */}
          <div 
            id="printable-litho"
            className="w-full max-w-[800px] bg-white rounded-2xl shadow-xl border border-slate-300 p-8 sm:p-12 flex flex-col justify-between text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none"
            style={{ minHeight: '1020px' }}
          >
            {/* 1. Header Banner */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-amber-600/30 pb-4 mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
                      Batesville Casket Company
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-mono tracking-wider uppercase text-slate-500">
                      Product Lithograph
                    </span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1">
                    {product.name}
                  </h1>
                </div>

                <div className="text-right">
                  <div className="bg-amber-50 border border-amber-300/80 px-3 py-1 rounded-lg text-right">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                      Product SKU / Code
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {product.code}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Catalog Year: {product.catalogYear || 'Current'}
                  </span>
                </div>
              </div>

              {/* 2. Hero High-Res Photo */}
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner mb-6 flex items-center justify-center">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-serif font-medium">
                  {product.exteriorFinish || product.finish || product.name}
                </div>
              </div>

              {/* 3. Category-Aware Technical Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                
                {/* Specs Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5 text-xs">
                  <h3 className="font-serif font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-amber-600" />
                    {isUrn ? 'Urn Specifications & Craftsmanship' : 'Casket Specifications & Dimensions'}
                  </h3>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800">{product.category}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Material & Construction:</span>
                    <span className="font-semibold text-slate-900">{product.material}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Exterior Finish:</span>
                    <span className="text-slate-800">{product.exteriorFinish || product.finish}</span>
                  </div>

                  {/* Caskets ONLY: Interior & Cap Style */}
                  {!isUrn && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Interior Fabric & Style:</span>
                        <span className="font-bold text-amber-800">{product.interior || 'Rosetan Crepe'}</span>
                      </div>
                      {product.top && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cap / Top Style:</span>
                          <span className="text-slate-800">{product.top}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dimensions (L × W × H):</span>
                        <span className="font-mono text-slate-800">
                          {product.extLength && product.extWidth 
                            ? `${product.extLength}" L × ${product.extWidth}" W × ${product.extHeight || 23.0}" H`
                            : (product.dimensions || '83.5" L × 28.5" W × 23.0" H')}
                        </span>
                      </div>
                      {product.intWidth && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Interior Width:</span>
                          <span className="font-mono text-slate-900 font-bold">{product.intWidth}" Interior</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Urns ONLY: Cubic Capacity & Closure */}
                  {isUrn && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cubic Capacity / Volume:</span>
                        <span className="font-bold text-amber-800 font-mono">
                          {product.capacity ? `${product.capacity} cu. in.` : '200 cu. in. (Standard Adult)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dimensions:</span>
                        <span className="font-mono text-slate-800">{product.dimensions || '8.5" W × 8.5" D × 10.5" H'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Closure Type:</span>
                        <span className="text-slate-800 font-medium">Precision Threaded Secure Base / Lid</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Merchandising & Living Memorial */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <h3 className="font-serif font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Memorial Features & Personalization
                    </h3>

                    {/* Living Memorial */}
                    <div className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <TreePine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px]">Living Memorial® Program</span>
                        <p className="text-[10px] text-emerald-800 leading-tight">
                          A living tree is planted in an American or Canadian National Forest as a lasting tribute.
                        </p>
                      </div>
                    </div>

                    {/* LifeSymbols */}
                    {product.lifesymbols && (
                      <div className="flex items-center space-x-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>LifeSymbols® Interchangeable Corner Designs Compatible</span>
                      </div>
                    )}

                    {/* LifeStories */}
                    {product.lifestories && (
                      <div className="flex items-center space-x-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>LifeStories® Medallion Memorial Keepsake Available</span>
                      </div>
                    )}

                    {/* Dual Disposition */}
                    {(product.dualDisposition || product.dual_disposition) && (
                      <div className="flex items-center space-x-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Dual Disposition (Approved for both Burial & Cremation)</span>
                      </div>
                    )}
                  </div>

                  {/* Presentation Price or Funeral Home Presentation */}
                  {showPrice && (
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Showroom Presentation Price
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="font-serif text-2xl font-bold text-slate-900">
                            ${activeRetailPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {customer?.name && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase">Presented by</span>
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[170px] block">
                            {customer.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Footer Gold Seal & Genuine Batesville Guarantee */}
            <div className="border-t border-slate-200 pt-4 mt-auto flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Genuine Batesville Craftsmanship • Handcrafted in North America</span>
              </div>
              <span>Printed on {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

          </div>

        </div>

      </div>

      {/* Global CSS for Clean 8.5x11 Print Layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-litho, #printable-litho * {
            visibility: visible;
          }
          #printable-litho {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            padding: 30px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 8.5in 11in portrait;
            margin: 0.4in;
          }
        }
      `}</style>
    </div>
  );
};
