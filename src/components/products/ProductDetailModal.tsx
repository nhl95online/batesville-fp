import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../types';
import { db, getProductPerformanceByYears } from '../../services/db';
import { 
  isUrnProduct, 
  isProductDiscontinued, 
  isCasketProduct, 
  downloadLithoFile, 
  getLithoPublicUrlForProduct, 
  downloadLithoAsPdf, 
  printLithoPdf 
} from '../../services/supabase';
import { 
  X, 
  Check, 
  ShieldCheck, 
  Tag, 
  TrendingUp, 
  Calendar, 
  Ruler, 
  Award, 
  DollarSign, 
  Printer, 
  Ban, 
  CheckCircle2, 
  Download, 
  FileText,
  FileDown,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onCreatePriceCard: (productId: string) => void;
  onOpenLitho?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onCreatePriceCard,
  onOpenLitho,
}) => {
  const [history, setHistory] = useState<{ year: string | number; revenue: number; units: number; ordersCount: number }[]>([]);
  const [activeImage, setActiveImage] = useState<string>(product.imageUrl);
  const [lithoUrl, setLithoUrl] = useState<string | null>(product.lithoUrl || null);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);

  useEffect(() => {
    async function loadPerf() {
      const data = await getProductPerformanceByYears(product.code || product.id);
      setHistory(data);
    }
    loadPerf();
  }, [product.id, product.code]);

  // Automatically check Supabase 'lithos' bucket for product code cut sheet
  useEffect(() => {
    let isMounted = true;
    async function checkLitho() {
      if (product.lithoUrl) {
        setLithoUrl(product.lithoUrl);
        return;
      }
      if (!product.code) return;
      const found = await getLithoPublicUrlForProduct(product.code);
      if (isMounted && found) {
        setLithoUrl(found);
        product.lithoUrl = found;
        product.lithoFileName = `${product.code}.png`;
        product.lithoFileType = 'image';
        await db.products.update(product.id, {
          lithoUrl: found,
          lithoFileName: `${product.code}.png`,
          lithoFileType: 'image'
        });
      }
    }
    checkLitho();
    return () => { isMounted = false; };
  }, [product.code, product.id, product.lithoUrl]);

  const allImages = [product.imageUrl, ...(product.additionalImages || [])];
  const isUrn = isUrnProduct(product);
  const isCasket = isCasketProduct(product);

  const displayFeatures = useMemo(() => {
    if (isCasket) {
      const capLine = `Cap Construction: ${product.top || 'Casket Cap (Half Couch)'}`;
      const rest = (product.features || []).filter(f => 
        !f.toLowerCase().includes('cap construction') && 
        !f.toLowerCase().includes('casket cap')
      );
      return [capLine, ...rest];
    }
    // Non-caskets: strictly NO cap construction
    const clean = (product.features || []).filter(f => 
      !f.toLowerCase().includes('cap construction') && 
      !f.toLowerCase().includes('casket cap') &&
      !f.toLowerCase().includes('half couch') &&
      !f.toLowerCase().includes('full couch')
    );
    if (clean.length === 0) {
      if (isUrn) {
        return [
          'Living Memorial® Tree Planting Program',
          'Precision Crafted Artisan Memorial',
          'Secure Threaded Closure / Base'
        ];
      }
      return [
        'Living Memorial® Tree Planting Program',
        'Authentic Batesville Craftsmanship'
      ];
    }
    return clean;
  }, [isCasket, isUrn, product.top, product.features]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {product.category}
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Model: {product.code}
            </span>
            {(product.catalogYear || product.year) && (
              <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                Catalog: {product.catalogYear || product.year}
              </span>
            )}
            {isProductDiscontinued(product) ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                DISCONTINUED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                Active
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto text-slate-800">
          {/* Discontinued Warning Banner */}
          {isProductDiscontinued(product) && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs shadow-xs">
              <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider block text-rose-900 text-sm">
                  Discontinued Model / Extended Delivery
                </span>
                <p className="text-rose-700 mt-0.5 leading-relaxed">
                  This product is tagged as discontinued or extended delivery in the Batesville catalog edition ({product.catalogYear || product.year || '2025-26'}). Confirm current regional warehouse inventory prior to quoting or assigning to a showroom floor plan.
                </p>
              </div>
            </div>
          )}
          
          {/* Top Section: Photo & Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="relative h-64 md:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
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
                        activeImage === img ? 'border-amber-600 scale-105 shadow-sm' : 'border-slate-200 opacity-60 hover:opacity-100'
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
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className={`font-serif text-2xl sm:text-3xl font-bold leading-tight ${isProductDiscontinued(product) ? 'text-slate-600 line-through decoration-rose-400' : 'text-slate-900'}`}>
                    {product.name}
                  </h2>
                  {isProductDiscontinued(product) && (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-xs font-bold uppercase tracking-wider shadow-xs">
                      Discontinued
                    </span>
                  )}
                </div>
                {(product.finish || product.exteriorFinish) && (
                  <p className="text-sm font-medium text-amber-700 mt-1 italic">
                    {product.finish || product.exteriorFinish}
                  </p>
                )}

                {/* Casket Merchandising Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {product.lifesymbols && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                      ✦ LifeSymbols® Corners
                    </span>
                  )}
                  {product.lifestories && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                      ★ LifeStories® Medallions
                    </span>
                  )}
                  {product.lifeview && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-semibold">
                      ▣ LifeView® Panel
                    </span>
                  )}
                  {(product.dualDisposition || product.dual_disposition) && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                      ✓ Dual Disposition (Burial & Cremation)
                    </span>
                  )}
                  {product.oversize && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                      ⚠ Oversize Model
                    </span>
                  )}
                </div>
              </div>

              {/* Litho Cloud Status Pill */}
              {product.code && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold my-2.5">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Official Batesville Litho in Supabase (<code className="font-mono text-emerald-900">{product.code}.png</code>)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Supabase Bucket
                  </span>
                </div>
              )}

              {/* Action Buttons: Litho Cut Sheet + PDF Conversion + Price Card Generator */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {onOpenLitho && (
                  <button
                    onClick={() => {
                      const effectiveUrl = lithoUrl || (product.code ? `https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/lithos/${product.code}.png` : undefined);
                      onOpenLitho({ ...product, lithoUrl: effectiveUrl });
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
                    title="Open Litho Cut Sheet Showcase to view official Supabase image, choose layout, or print single 8.5x11 sheet"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print Litho Cut Sheet</span>
                  </button>
                )}

                {product.code && (
                  <button
                    onClick={async () => {
                      try {
                        setIsConvertingPdf(true);
                        const effectiveUrl = lithoUrl || `https://yrprtpqwojpeskccerec.supabase.co/storage/v1/object/public/lithos/${product.code}.png`;
                        await downloadLithoAsPdf(effectiveUrl, product, 'landscape');
                      } catch (err: any) {
                        alert('Error converting litho image to PDF: ' + err.message);
                      } finally {
                        setIsConvertingPdf(false);
                      }
                    }}
                    disabled={isConvertingPdf}
                    className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer text-xs sm:text-sm disabled:opacity-50"
                    title="Pull the official Litho image from Supabase 'lithos' bucket and download as clean 8.5x11 PDF"
                  >
                    {isConvertingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    <span>{isConvertingPdf ? 'Converting...' : 'Convert to PDF'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onCreatePriceCard(product.id);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer text-xs sm:text-sm"
                >
                  <Tag className="w-4 h-4" />
                  <span>Create Price Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Specifications & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            {/* Technical Specs */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-600" />
                {isCasket ? 'Casket Dimensions & Technical Specifications' : isUrn ? 'Urn Dimensions & Technical Specifications' : 'Merchandise Dimensions & Technical Specifications'}
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product Code / SKU:</span>
                  <span className="font-mono text-amber-700 font-bold">{product.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material / Composition:</span>
                  <span className="text-slate-900 font-semibold">{product.material}</span>
                </div>
                {(product.finish || product.exteriorFinish) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Exterior Finish:</span>
                    <span className="text-slate-800">{product.finish || product.exteriorFinish}</span>
                  </div>
                )}

                {isCasket && (
                  <>
                    {product.interior && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Interior Fabric & Style:</span>
                        <span className="text-slate-900 font-semibold">{product.interior}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cap Construction:</span>
                      <span className="text-slate-800 font-semibold">{product.top || 'Casket Cap (Half Couch)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Exterior Dimensions:</span>
                      <span className="text-slate-800 font-mono">
                        {product.extLength && product.extWidth
                          ? `${product.extLength}" L × ${product.extWidth}" W × ${product.extHeight || 23.0}" H`
                          : (product.dimensions || '83.5" L × 28.5" W × 23.0" H')}
                      </span>
                    </div>
                    {product.intWidth && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Interior Width:</span>
                        <span className="text-slate-900 font-mono font-bold text-amber-700">{product.intWidth}" Interior</span>
                      </div>
                    )}
                  </>
                )}

                {isUrn && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cubic Capacity / Volume:</span>
                      <span className="font-mono text-amber-700 font-bold">
                        {product.capacity ? `${product.capacity} cu. in.` : '200 cu. in. (Standard Adult)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Urn Dimensions:</span>
                      <span className="text-slate-800 font-mono">{product.dimensions || '8.5" W × 8.5" D × 10.5" H'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Closure Type:</span>
                      <span className="text-slate-800 font-medium">Precision Threaded Secure Lid / Base</span>
                    </div>
                  </>
                )}

                {!isUrn && !isCasket && product.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensions:</span>
                    <span className="text-slate-800 font-mono">{product.dimensions}</span>
                  </div>
                )}

                {isCasket && (product.capacity || product.weightLbs) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Weight:</span>
                    <span className="text-slate-800 font-mono">{product.capacity || product.weightLbs} lbs</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Catalog Year:</span>
                  <span className="font-mono text-slate-700">{product.year || product.catalogYear}</span>
                </div>
              </div>
            </div>

            {/* Batesville Features */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                {isCasket 
                  ? 'Casket Craftsmanship & Program Options' 
                  : isUrn 
                    ? 'Urn & Memorial Craftsmanship Options' 
                    : 'Product Craftsmanship & Quality'}
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                {displayFeatures.map((feature, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-slate-800 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Year-to-Year Product Sales Performance Breakdown */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Year-to-Year Sales Performance Breakdown
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {history.map((yr) => (
                <div key={yr.year} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 mb-1">{yr.year}</div>
                  <div className="text-lg font-serif font-bold text-amber-700">
                    ${yr.revenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
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
