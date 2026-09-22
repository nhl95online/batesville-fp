import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, CardDimension, CardTheme, PriceCardConfig } from '../../types';
import { Card6x6, CardCollectionType, RightGraphicType } from './templates/Card6x6';
import { Card2x12 } from './templates/Card2x12';
import { Card8x11 } from './templates/Card8x11';
import { Card11x17 } from './templates/Card11x17';
import { CustomerRetailModal } from './CustomerRetailModal';
import { getCustomerRetailPrice } from '../../services/customerRetails';
import { 
  Printer, Eye, RefreshCw, ZoomIn, ZoomOut, Check, Building2, 
  Tag, DollarSign, Upload, FileText, CheckCircle2, X, Trash2, Award
} from 'lucide-react';

interface PriceCardStudioProps {
  customers: Customer[];
  products: Product[];
  initialCustomerId?: string;
  initialProductId?: string;
}

const isUrnProduct = (p: Product) => {
  const cat = (p.category || '').toLowerCase();
  const sub = (p.subcategory || '').toLowerCase();
  const mat = (p.material || '').toLowerCase();
  const name = (p.name || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  return (
    cat.includes('urn') || cat.includes('cremation') ||
    sub.includes('urn') || sub.includes('cremation') ||
    mat.includes('urn') || name.includes('urn') || desc.includes('urn') ||
    cat.includes('keepsake')
  );
};

const getInitialCollection = (p: Product | undefined): CardCollectionType => {
  if (!p) return 'commemorative';
  if (p.lifesymbols || p.lifestories) return 'commemorative';
  const mat = (p.material || '').toLowerCase();
  if (mat.includes('mahogany') || mat.includes('cherry') || mat.includes('bronze') || mat.includes('copper')) {
    return 'classic';
  }
  if (mat.includes('gauge') || mat.includes('steel') || mat.includes('20 ga') || mat.includes('18 ga')) {
    return 'conventional';
  }
  return 'commemorative';
};

const getInitialBullets = (
  p: Product | undefined, 
  coll: CardCollectionType
): string[] => {
  if (!p) return ['', '', '', '', '', ''];
  const tributeCount = p.lifestories && p.lifesymbols ? 4 : (p.lifesymbols || p.lifestories ? 3 : 2);
  const materialFinishLine = `${p.material || ''} - ${p.finish || ''}`.replace(/^ - |- $/g, '').trim() || p.material || 'Hand-rubbed finish';
  const interiorLine = (() => {
    let int = p.interior || 'Velvet';
    if (!int.toLowerCase().includes('interior')) {
      return `${int} Interior`;
    }
    return int;
  })();

  if (coll === 'commemorative') {
    return [
      `${tributeCount} Tribute Option Choices`,
      `${tributeCount} Keepsake Medallions or Corners`,
      materialFinishLine,
      '', // Clean empty ledger row by default
      'LifeView Display optional',
      interiorLine,
    ];
  } else if (coll === 'classic') {
    return [
      'Fine craftsmanship',
      'Exceptional finish',
      materialFinishLine,
      '',
      'Timeless design',
      interiorLine,
    ];
  } else if (coll === 'conventional') {
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
};

const getInitialMiscFeatures = (p: Product | undefined): string[] => {
  if (!p) return ['embroidered'];
  const feats: string[] = [];
  if (p.lifeview || true) feats.push('embroidered');
  const mat = (p.material || '').toLowerCase();
  if (mat.includes('pecan') || mat.includes('mahogany') || p.code === '242987') {
    feats.push('memorysafe');
  }
  if (p.lifestories) feats.push('lifestories');
  if (p.lifesymbols) feats.push('lifesymbols');
  return feats.length > 0 ? feats.slice(0, 2) : ['embroidered'];
};

export const PriceCardStudio: React.FC<PriceCardStudioProps> = ({
  customers,
  products,
  initialCustomerId,
  initialProductId,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || customers[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || products[0]?.id || ''
  );
  const [dimension, setDimension] = useState<CardDimension>('6x6');
  const [theme, setTheme] = useState<CardTheme>('classic-burgundy');
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  
  // Custom price / markup overrides
  const [markupPercent, setMarkupPercent] = useState<number>(140);
  const [customPriceOverride, setCustomPriceOverride] = useState<string>('');

  // Customer retail modal & trigger
  const [isRetailModalOpen, setIsRetailModalOpen] = useState<boolean>(false);
  const [retailVersion, setRetailVersion] = useState<number>(0);

  // 4 Collections: Commemorative (Green), Classic (Slate/Gold), Conventional (Royal Blue), Basic (White)
  const [collection, setCollection] = useState<CardCollectionType>('commemorative');
  
  // Right Graphic: Tributes, Refined Styling (Classic only), or None
  const [rightGraphic, setRightGraphic] = useState<RightGraphicType>('tributes');

  // Product Name (defaults to description)
  const [productName, setProductName] = useState<string>('');

  // 6 Clearable & Editable Ledger Bullets
  const [bullets, setBullets] = useState<string[]>(['', '', '', '', '', '']);

  // Additional Features from MISC Bucket
  const [activeMiscFeatures, setActiveMiscFeatures] = useState<string[]>(['embroidered']);

  // Toggles
  const [showImage, setShowImage] = useState<boolean>(true);
  const [showSpecs, setShowSpecs] = useState<boolean>(true);
  const [showFeatures, setShowFeatures] = useState<boolean>(true);
  const [showModelCode, setShowModelCode] = useState<boolean>(true);
  const [showCustomerLogo, setShowCustomerLogo] = useState<boolean>(true);
  const [showMonthlyPayment, setShowMonthlyPayment] = useState<boolean>(true);
  const [monthlyTermMonths, setMonthlyTermMonths] = useState<number>(36);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];
  
  // Filter products for Urns if 2x12 is active
  const availableProducts = useMemo(() => {
    if (dimension === '2x12') {
      const urns = products.filter(isUrnProduct);
      return urns.length > 0 ? urns : products;
    }
    return products;
  }, [dimension, products]);

  // When switching to 2x12, ensure an urn is selected
  useEffect(() => {
    if (dimension === '2x12') {
      const urns = products.filter(isUrnProduct);
      if (urns.length > 0 && !urns.some(p => p.id === selectedProductId)) {
        setSelectedProductId(urns[0].id);
      }
    }
  }, [dimension, products, selectedProductId]);

  const selectedProduct = availableProducts.find(p => p.id === selectedProductId) || availableProducts[0] || products[0];

  // Auto-initialize collection, name, bullets, and misc features on product change
  useEffect(() => {
    if (selectedProduct) {
      const coll = getInitialCollection(selectedProduct);
      setCollection(coll);
      setProductName(selectedProduct.description || selectedProduct.name || '');
      setBullets(getInitialBullets(selectedProduct, coll));
      setActiveMiscFeatures(getInitialMiscFeatures(selectedProduct));
      if (coll === 'classic') {
        setRightGraphic('refined-styling');
      } else if (coll === 'basic') {
        setRightGraphic('none');
      } else {
        setRightGraphic('tributes');
      }
    }
  }, [selectedProductId]);

  // When customer changes, update default markup
  useEffect(() => {
    if (selectedCustomer) {
      setMarkupPercent(selectedCustomer.defaultMarkupPercent || 140);
      setCustomPriceOverride('');
    }
  }, [selectedCustomerId, selectedCustomer]);

  // Adjust zoom for landscape / format
  useEffect(() => {
    if (dimension === '11x17') {
      setZoomScale(0.45);
    } else if (dimension === '8.5x11') {
      setZoomScale(0.65);
    } else if (dimension === '2x12') {
      setZoomScale(0.75);
    } else {
      setZoomScale(0.95);
    }
  }, [dimension]);

  // Check customer loaded retail price for this product
  const customerIdOrCode = selectedCustomer ? String(selectedCustomer.accountNumber || selectedCustomer.code || selectedCustomer.id) : '';
  const customerLoadedRetail = useMemo(() => {
    if (!selectedCustomer || !selectedProduct) return null;
    return getCustomerRetailPrice(customerIdOrCode, selectedProduct.code);
  }, [customerIdOrCode, selectedProduct?.code, retailVersion]);

  // Calculate Retail Price
  const calculatedRetailPrice = Math.round(
    (selectedProduct?.wholesalePrice || 0) * (1 + markupPercent / 100)
  );

  const finalRetailPrice = customPriceOverride && !isNaN(Number(customPriceOverride))
    ? Number(customPriceOverride)
    : (customerLoadedRetail !== null ? customerLoadedRetail : calculatedRetailPrice);

  const cardConfig: PriceCardConfig = {
    dimension,
    customerId: selectedCustomerId,
    productId: selectedProductId,
    customPrice: finalRetailPrice,
    markupPercent,
    showImage,
    showSpecs,
    showFeatures,
    showModelCode,
    showCustomerLogo,
    showMonthlyPayment,
    monthlyTermMonths,
    theme,
  };

  const handlePrint = () => {
    window.print();
  };

  // Bullet manipulation functions
  const handleClearBullet = (idx: number) => {
    setBullets(prev => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
  };

  const handleClearAllBullets = () => {
    setBullets(['', '', '', '', '', '']);
  };

  const handleResetBullets = () => {
    setBullets(getInitialBullets(selectedProduct, collection));
  };

  const handleSelectCollection = (newColl: CardCollectionType) => {
    setCollection(newColl);
    setBullets(getInitialBullets(selectedProduct, newColl));
    if (newColl === 'classic') {
      setRightGraphic('refined-styling');
    } else if (newColl === 'basic') {
      setRightGraphic('none');
    } else {
      setRightGraphic('tributes');
    }
  };

  const dimensionLabels: { id: CardDimension; name: string; desc: string }[] = [
    { id: '6x6', name: '6" × 6" Square', desc: 'Authentic 4-Collection Showroom Card' },
    { id: '2x12', name: '2" × 12" Urn Strip', desc: 'Ledge / Rail Card (Urns & Cremation)' },
    { id: '8.5x11', name: '8.5" × 11" Horizontal', desc: 'Landscape Showroom Display Sheet' },
    { id: '11x17', name: '11" × 17" Horizontal', desc: 'Landscape Selection Room Display Board' },
  ];

  const miscFeaturesList = [
    { id: 'embroidered', label: 'Embroidered Tribute Panel', file: 'Embroidered Cap Panel.png' },
    { id: 'memorysafe', label: 'MemorySafe® Drawer', file: 'MemorySafe.png' },
    { id: 'lifestories', label: 'LifeStories® Medallions', file: 'LifeStories.png' },
    { id: 'lifesymbols', label: 'LifeSymbols® Corner Designs', file: 'LifeSymbols.png' },
    { id: 'livingtree', label: 'Living Memorial® Tree', file: 'LivingTree.png' },
    { id: 'memorialrecord', label: 'Memorial Record® System', file: 'MemorialRecord.png' },
  ];

  const toggleMiscFeature = (featId: string) => {
    setActiveMiscFeatures(prev => {
      if (prev.includes(featId)) {
        return prev.filter(id => id !== featId);
      } else {
        if (prev.length >= 3) {
          return [prev[1], prev[2], featId];
        }
        return [...prev, featId];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                Showroom Price Card Studio
              </h1>
              <p className="text-sm text-slate-500">
                Four authentic collections (Commemorative, Classic, Conventional, Basic) with custom customer retail lists.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsRetailModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Load Customer Retails</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Left Controls, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column (Left, 4 cols) */}
        <div className="no-print lg:col-span-4 space-y-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm h-fit">
          
          {/* 1. Format / Dimensions */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Card Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dimensionLabels.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDimension(d.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    dimension === d.id
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-[11px] text-slate-500 font-normal truncate">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Customer Selection */}
          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                Funeral Home (Customer)
              </span>
              <span className="text-[11px] text-amber-700 font-medium lowercase">tier: {selectedCustomer?.tier}</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.accountNumber || c.code} - {c.name} ({c.program || 'Std'} • {c.burialDiscount || 0}% Burial Disc)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product Selection (Filtered to Urns when 2x12 is active) */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {dimension === '2x12' ? 'Select Urn / Cremation Item' : 'Select Casket / Product'}
              </label>
              {dimension === '2x12' && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                  Urns Only
                </span>
              )}
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.catalogYear}] {p.code} - {p.name} (${p.wholesalePrice} wholesale)
                </option>
              ))}
            </select>
          </div>

          {/* 4. Pricing & Customer Retail Connection */}
          <div className="border-t border-slate-200 pt-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                Funeral Home Pricing & Retails
              </span>
              <button
                onClick={() => setIsRetailModalOpen(true)}
                className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <FileText className="w-3 h-3" />
                Manage Price Lists
              </button>
            </div>

            {/* Loaded Customer Retail Indicator */}
            {customerLoadedRetail !== null ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 block">
                      Funeral Home Retail Active
                    </span>
                    <span className="text-[10px] text-emerald-700">
                      Loaded from #{selectedCustomer?.accountNumber || selectedCustomer?.code} Price List
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-base text-emerald-800">
                  ${customerLoadedRetail.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg p-2">
                No custom retail loaded for this item. Using default markup (+{markupPercent}%).
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-700 font-medium">Customer Markup (%)</span>
                <span className="text-xs font-mono font-bold text-amber-700">+{markupPercent}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="5"
                value={markupPercent}
                onChange={(e) => {
                  setMarkupPercent(Number(e.target.value));
                  setCustomPriceOverride('');
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Wholesale Cost:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  ${selectedProduct?.wholesalePrice.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Calculated Retail:</span>
                <span className="font-mono text-amber-750 font-bold text-amber-700">
                  ${calculatedRetailPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-medium">
                Direct Price Override ($) (Optional):
              </label>
              <input
                type="number"
                placeholder={customerLoadedRetail ? customerLoadedRetail.toString() : calculatedRetailPrice.toString()}
                value={customPriceOverride}
                onChange={(e) => setCustomPriceOverride(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 5. FOUR COLLECTIONS SELECTOR */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block flex items-center justify-between">
              <span>Showroom Collection</span>
              <span className="text-[10px] text-amber-700 font-medium lowercase">4 official styles</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Commemorative (Green) */}
              <button
                onClick={() => handleSelectCollection('commemorative')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  collection === 'commemorative'
                    ? 'bg-emerald-50 border-[#15662a] text-[#15662a] font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15662a]" />
                  <span className="text-xs">Commemorative</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-4">Emerald Green</div>
              </button>

              {/* Classic (Slate & Gold) */}
              <button
                onClick={() => handleSelectCollection('classic')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  collection === 'classic'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b434e] border border-amber-500" />
                  <span className="text-xs">Classic Collection</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-4">Slate & Gold Trim</div>
              </button>

              {/* Conventional (Royal Blue) */}
              <button
                onClick={() => handleSelectCollection('conventional')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  collection === 'conventional'
                    ? 'bg-blue-50 border-[#006cb8] text-[#006cb8] font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006cb8]" />
                  <span className="text-xs">Conventional</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-4">Royal Blue</div>
              </button>

              {/* Basic (White) */}
              <button
                onClick={() => handleSelectCollection('basic')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  collection === 'basic'
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shadow-xs" />
                  <span className="text-xs">Basic Collection</span>
                </div>
                <div className="text-[10px] text-slate-500 pl-4">Crisp White</div>
              </button>
            </div>
          </div>

          {/* 6. RIGHT-SIDE IMAGE (MISC BUCKET: TRIBUTES / REFINED STYLING) */}
          {dimension !== '2x12' && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                Right-Side Image (from MISC Bucket)
              </label>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Refined Styling - Only when Classic is selected */}
                {collection === 'classic' && (
                  <button
                    type="button"
                    onClick={() => setRightGraphic('refined-styling')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      rightGraphic === 'refined-styling'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold text-xs truncate">Refined Styling</div>
                    <div className="text-[10px] text-slate-500 truncate">Refined Styling.png</div>
                  </button>
                )}

                {/* Tributes Category Badge */}
                <button
                  type="button"
                  onClick={() => setRightGraphic('tributes')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    rightGraphic === 'tributes'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">Tribute Categories</div>
                  <div className="text-[10px] text-slate-500 truncate">Tributes.png</div>
                </button>

                {/* None / Hide Graphic */}
                <button
                  type="button"
                  onClick={() => setRightGraphic('none')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    rightGraphic === 'none'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">No Right Graphic</div>
                  <div className="text-[10px] text-slate-500 truncate">Clean ruled lines</div>
                </button>
              </div>
            </div>
          )}

          {/* 7. PRODUCT NAME (FROM DESCRIPTION) */}
          <div className="border-t border-slate-200 pt-4">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Product Name (from Description)
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={selectedProduct?.description || selectedProduct?.name}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Appears prominently in bottom banner above retail price.
            </p>
          </div>

          {/* 8. CLEARABLE & EDITABLE 6 BULLET ROWS (For 6x6, 8.5x11, 11x17) */}
          {dimension !== '2x12' && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Specification Bullets (6 Ledger Rows)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleClearAllBullets}
                    className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={handleResetBullets}
                    className="text-[10px] text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono text-slate-400 w-4 text-center shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={bullet}
                      placeholder={`Row ${idx + 1} (leave blank to show clean ruled line)`}
                      onChange={(e) => {
                        const updated = [...bullets];
                        updated[idx] = e.target.value;
                        setBullets(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                    />
                    {bullet && (
                      <button
                        type="button"
                        onClick={() => handleClearBullet(idx)}
                        title="Clear this bullet"
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. ADDITIONAL FEATURES (MISC BUCKET) */}
          {dimension !== '2x12' && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Additional Features (MISC Bucket)
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  {activeMiscFeatures.length} active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {miscFeaturesList.map((feat) => {
                  const isSelected = activeMiscFeatures.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleMiscFeature(feat.id)}
                      className={`p-2 rounded-lg border text-left transition-all flex items-start space-x-2 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[11px] truncate leading-tight">{feat.label}</div>
                        <div className="text-[9px] text-slate-500 truncate">{feat.file}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Live Preview Canvas Column (Right, 8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[680px] shadow-sm">
          
          {/* Preview Toolbar */}
          <div className="no-print flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2 text-xs text-slate-700">
              <Eye className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">Live Card Preview:</span>
              <span className="text-amber-800 font-mono font-medium">
                {dimension === '6x6' && `6" × 6" Square Cap Card (${collection.toUpperCase()})`}
                {dimension === '2x12' && `2" × 12" Urn Rail Strip (${collection.toUpperCase()})`}
                {dimension === '8.5x11' && `8.5" × 11" Horizontal Sheet (${collection.toUpperCase()})`}
                {dimension === '11x17' && `11" × 17" Horizontal Display Board (${collection.toUpperCase()})`}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomScale((z) => Math.max(0.3, z - 0.1))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer shadow-xs transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-medium text-slate-700 w-12 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.1))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer shadow-xs transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (dimension === '11x17') setZoomScale(0.45);
                  else if (dimension === '8.5x11') setZoomScale(0.65);
                  else if (dimension === '2x12') setZoomScale(0.75);
                  else setZoomScale(0.95);
                }}
                className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline px-2 cursor-pointer font-medium"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Scaled Preview Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-100/90 border-b border-slate-200">
            <div 
              className={`print-area transition-transform duration-200 origin-center printing-${dimension}`}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center'
              }}
            >
              {dimension === '6x6' && selectedProduct && (
                <Card6x6
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                  collectionType={collection}
                  productNameOverride={productName.trim() || undefined}
                  customBullets={bullets}
                  activeMiscFeatures={activeMiscFeatures}
                  rightGraphic={rightGraphic}
                  onClearBullet={handleClearBullet}
                />
              )}

              {dimension === '2x12' && selectedProduct && (
                <Card2x12
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                  collectionType={collection}
                  productNameOverride={productName.trim() || undefined}
                />
              )}

              {dimension === '8.5x11' && selectedProduct && (
                <Card8x11
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                  collectionType={collection}
                  productNameOverride={productName.trim() || undefined}
                  customBullets={bullets}
                  activeMiscFeatures={activeMiscFeatures}
                  rightGraphic={rightGraphic}
                  onClearBullet={handleClearBullet}
                />
              )}

              {dimension === '11x17' && selectedProduct && (
                <Card11x17
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                  collectionType={collection}
                  productNameOverride={productName.trim() || undefined}
                  customBullets={bullets}
                  activeMiscFeatures={activeMiscFeatures}
                  rightGraphic={rightGraphic}
                  onClearBullet={handleClearBullet}
                />
              )}
            </div>
          </div>

          {/* Quick Print Banner Footer */}
          <div className="no-print px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <p>
              💡 <strong>Print Tip:</strong> For 8.5&quot; × 11&quot; and 11&quot; × 17&quot;, select <em>&quot;Landscape&quot;</em> orientation and <em>&quot;Actual Size&quot;</em> in your browser print dialog.
            </p>
            <button
              onClick={handlePrint}
              className="text-amber-700 hover:text-amber-800 font-semibold underline ml-4 shrink-0 cursor-pointer"
            >
              Print Now
            </button>
          </div>

        </div>

      </div>

      {/* Customer Retail Price List Modal */}
      {isRetailModalOpen && (
        <CustomerRetailModal
          isOpen={isRetailModalOpen}
          onClose={() => setIsRetailModalOpen(false)}
          customers={customers}
          products={products}
          currentCustomerId={selectedCustomerId}
          onRetailsUpdated={() => setRetailVersion(v => v + 1)}
        />
      )}
    </div>
  );
};
