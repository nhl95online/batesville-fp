import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, CardDimension, CardTheme, PriceCardConfig } from '../../types';
import { Card6x6 } from './templates/Card6x6';
import { Card2x12 } from './templates/Card2x12';
import { Card8x11 } from './templates/Card8x11';
import { Card11x17 } from './templates/Card11x17';
import { CustomerRetailModal } from './CustomerRetailModal';
import { getCustomerRetailPrice } from '../../services/customerRetails';
import { 
  Printer, Eye, RefreshCw, ZoomIn, ZoomOut, Check, Building2, 
  Tag, DollarSign, Sparkles, Image as ImageIcon, Upload, FileText,
  CheckCircle2, ShieldCheck, Award, Palette
} from 'lucide-react';

interface PriceCardStudioProps {
  customers: Customer[];
  products: Product[];
  initialCustomerId?: string;
  initialProductId?: string;
}

// Helpers to auto-populate 6x6 defaults from product details
const getInitialCollection = (p: Product | undefined): 'commemorative-green' | 'commemorative-blue' | 'classic' | 'conventional' => {
  if (!p) return 'commemorative-green';
  if (p.lifesymbols || p.lifestories) return 'commemorative-green';
  const mat = (p.material || '').toLowerCase();
  if (mat.includes('mahogany') || mat.includes('cherry') || mat.includes('bronze') || mat.includes('copper')) {
    return 'classic';
  }
  if (mat.includes('gauge') || mat.includes('steel') || mat.includes('20 ga') || mat.includes('18 ga')) {
    return 'conventional';
  }
  return 'commemorative-green';
};

const getInitialBullets = (
  p: Product | undefined, 
  coll: 'commemorative-green' | 'commemorative-blue' | 'classic' | 'conventional'
): string[] => {
  if (!p) return ['', '', '', '', ''];
  const tributeCount = p.lifesymbols && p.lifestories ? 4 : (p.lifesymbols || p.lifestories ? 3 : 2);
  const materialFinishLine = `${p.material || ''} - ${p.finish || ''}`.replace(/^ - |- $/g, '').trim() || p.material || 'Hand-rubbed finish';
  const interiorLine = (() => {
    let int = p.interior || 'Velvet';
    if (!int.toLowerCase().includes('interior')) {
      return `${int} Interior`;
    }
    return int;
  })();

  if (coll === 'commemorative-green' || coll === 'commemorative-blue') {
    return [
      `${tributeCount} Tribute Option Choices`,
      `${tributeCount} Keepsake Medallions or Corners`,
      materialFinishLine,
      'LifeView Display optional',
      interiorLine,
    ];
  } else if (coll === 'classic') {
    return [
      'Exceptional Craftsmanship',
      'Hand-Rubbed Lustrous Finish',
      materialFinishLine,
      'Classic Timeless Design',
      interiorLine,
    ];
  } else {
    return [
      'Quality construction',
      'Reliable protection',
      materialFinishLine,
      'Traditional styling',
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
  const [zoomScale, setZoomScale] = useState<number>(1);
  
  // Custom price / markup overrides
  const [markupPercent, setMarkupPercent] = useState<number>(140);
  const [customPriceOverride, setCustomPriceOverride] = useState<string>('');

  // Customer retail modal & trigger
  const [isRetailModalOpen, setIsRetailModalOpen] = useState<boolean>(false);
  const [retailVersion, setRetailVersion] = useState<number>(0);

  // 6x6 Authentic Showroom Card States
  const [collection6x6, setCollection6x6] = useState<'commemorative-green' | 'commemorative-blue' | 'classic' | 'conventional'>('commemorative-green');
  const [productName6x6, setProductName6x6] = useState<string>('');
  const [bullets6x6, setBullets6x6] = useState<string[]>([]);
  const [activeMiscFeatures6x6, setActiveMiscFeatures6x6] = useState<string[]>(['embroidered']);

  // Toggles for 8.5x11 / 11x17 / 2x12
  const [showImage, setShowImage] = useState<boolean>(true);
  const [showSpecs, setShowSpecs] = useState<boolean>(true);
  const [showFeatures, setShowFeatures] = useState<boolean>(true);
  const [showModelCode, setShowModelCode] = useState<boolean>(true);
  const [showCustomerLogo, setShowCustomerLogo] = useState<boolean>(true);
  const [showMonthlyPayment, setShowMonthlyPayment] = useState<boolean>(true);
  const [monthlyTermMonths, setMonthlyTermMonths] = useState<number>(36);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];
  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Auto initialize 6x6 states when product changes
  useEffect(() => {
    if (selectedProduct) {
      const coll = getInitialCollection(selectedProduct);
      setCollection6x6(coll);
      setProductName6x6(selectedProduct.description || selectedProduct.name || '');
      setBullets6x6(getInitialBullets(selectedProduct, coll));
      setActiveMiscFeatures6x6(getInitialMiscFeatures(selectedProduct));
    }
  }, [selectedProductId]);

  // When customer changes, update default markup
  useEffect(() => {
    if (selectedCustomer) {
      setMarkupPercent(selectedCustomer.defaultMarkupPercent || 140);
      setCustomPriceOverride('');
    }
  }, [selectedCustomerId, selectedCustomer]);

  // Adjust default zoom based on card dimensions so it fits viewport nicely
  useEffect(() => {
    if (dimension === '11x17') {
      setZoomScale(0.48);
    } else if (dimension === '8.5x11') {
      setZoomScale(0.68);
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

  // Calculate Retail Price based on formula or manual override or loaded customer retail
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
    customTitle: customTitle.trim() || undefined,
    customSubtitle: customSubtitle.trim() || undefined,
    footerText: footerText.trim() || undefined,
  };

  const handlePrint = () => {
    window.print();
  };

  const dimensionLabels: { id: CardDimension; name: string; desc: string }[] = [
    { id: '6x6', name: '6" × 6" Square', desc: 'Authentic 3-Collection Showroom Card' },
    { id: '2x12', name: '2" × 12" Rail Strip', desc: 'Horizontal casket rail / ledge card' },
    { id: '8.5x11', name: '8.5" × 11" Letter', desc: 'Standard showroom presentation sheet' },
    { id: '11x17', name: '11" × 17" Tabloid', desc: 'Large selection room display board' },
  ];

  const themeOptions: { id: CardTheme; name: string; previewBg: string }[] = [
    { id: 'classic-burgundy', name: 'Classic Burgundy', previewBg: 'bg-[#520d1a]' },
    { id: 'modern-dark', name: 'Slate Luxury Dark', previewBg: 'bg-slate-900 border border-slate-700' },
    { id: 'clean-white', name: 'Crisp Showroom White', previewBg: 'bg-white border border-slate-300' },
    { id: 'funeral-navy', name: 'Prestige Navy', previewBg: 'bg-[#0c1626]' },
    { id: 'champagne-gold', name: 'Warm Champagne', previewBg: 'bg-[#f3ede1] border border-amber-300' },
  ];

  const miscFeaturesList = [
    { id: 'embroidered', label: 'Embroidered Tribute Panel', file: 'Embroidered Cap Panel.png', desc: 'Cap panel embroidery insert' },
    { id: 'memorysafe', label: 'MemorySafe® Drawer', file: 'MemorySafe.png', desc: 'Secure drawer for mementos' },
    { id: 'lifestories', label: 'LifeStories® Medallions', file: 'LifeStories.png', desc: 'Keepsake medallions & tribute' },
    { id: 'lifesymbols', label: 'LifeSymbols® Corner Designs', file: 'LifeSymbols.png', desc: 'Interchangeable corners' },
    { id: 'livingtree', label: 'Living Memorial® Tree', file: 'LivingTree.png', desc: 'Seedling planted in memory' },
    { id: 'memorialrecord', label: 'Memorial Record® System', file: 'MemorialRecord.png', desc: 'Keepsake record compartment' },
  ];

  const toggleMiscFeature = (featId: string) => {
    setActiveMiscFeatures6x6(prev => {
      if (prev.includes(featId)) {
        return prev.filter(id => id !== featId);
      } else {
        // limit to 2 for authentic 6x6 card layout
        if (prev.length >= 2) {
          return [prev[1], featId];
        }
        return [...prev, featId];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Showroom Price Card Studio
              </h1>
              <p className="text-sm text-slate-400">
                Design, customize, and print showroom display cards with customer-specific pricing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsRetailModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Load Customer Retails</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Left Controls, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column (Left, 4 cols) */}
        <div className="no-print lg:col-span-4 space-y-5 bg-slate-900/90 border border-slate-800/90 p-5 rounded-2xl h-fit">
          
          {/* 1. Target Format / Dimension */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Card Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dimensionLabels.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDimension(d.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    dimension === d.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold shadow-sm'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm">{d.name}</div>
                  <div className="text-[11px] text-slate-400 font-normal truncate">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Customer Selection (Sets Customer-Specific Markup & Retails) */}
          <div className="border-t border-slate-800 pt-4">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Select Customer (Funeral Home)
              </span>
              <span className="text-[11px] text-amber-400/80 lowercase">tier: {selectedCustomer?.tier}</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.accountNumber || c.code} - {c.name} ({c.program || 'Std'} • {c.burialDiscount || 0}% Burial Disc)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product Selection with Catalog Year Filter */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select Product / Casket
              </label>
              <select
                value={cardConfig.catalogYear || 'all'}
                onChange={(e) => {
                  const yr = e.target.value;
                  const available = yr === 'all' ? products : products.filter(p => String(p.catalogYear) === yr);
                  if (available.length > 0 && !available.some(p => p.id === selectedProductId)) {
                    setSelectedProductId(available[0].id);
                  }
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-amber-400 focus:outline-none"
              >
                <option value="all">All Catalog Years</option>
                {Array.from(new Set(products.map(p => String(p.catalogYear)))).sort().reverse().map(y => (
                  <option key={y} value={y}>{y} Catalog</option>
                ))}
              </select>
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.catalogYear}] {p.code} - {p.name} (${p.wholesalePrice} wholesale)
                </option>
              ))}
            </select>
          </div>

          {/* 4. Pricing & Customer Retail Price List Connection */}
          <div className="border-t border-slate-800 pt-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Customer Pricing & Retails
              </span>
              <button
                onClick={() => setIsRetailModalOpen(true)}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Price Lists
              </button>
            </div>

            {/* Loaded Customer Retail Indicator */}
            {customerLoadedRetail !== null ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-emerald-300 block">
                      Funeral Home Retail Active
                    </span>
                    <span className="text-[10px] text-emerald-400/80">
                      Loaded from #{selectedCustomer?.accountNumber || selectedCustomer?.code} Price List
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-base text-emerald-300">
                  ${customerLoadedRetail.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 bg-slate-800/40 border border-slate-800 rounded-lg p-2">
                No custom retail loaded for this item. Using customer markup formula (+{markupPercent}%).
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300">Customer Markup (%)</span>
                <span className="text-xs font-mono text-amber-400">+{markupPercent}%</span>
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
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
              <div>
                <span className="text-slate-400 block">Wholesale Cost:</span>
                <span className="font-mono text-slate-200 font-semibold">
                  ${selectedProduct?.wholesalePrice.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Calculated Retail:</span>
                <span className="font-mono text-amber-400 font-bold">
                  ${calculatedRetailPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Direct Price Override ($) (Optional):
              </label>
              <input
                type="number"
                placeholder={customerLoadedRetail ? customerLoadedRetail.toString() : calculatedRetailPrice.toString()}
                value={customPriceOverride}
                onChange={(e) => setCustomPriceOverride(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 5. SPECIFIC 6x6 AUTHENTIC CONTROLS */}
          {dimension === '6x6' ? (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              
              {/* 6x6 Collection Buttons */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span>6x6 Showroom Collection</span>
                  <span className="text-[10px] text-amber-400 lowercase">authentic branding</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCollection6x6('commemorative-green');
                      setBullets6x6(getInitialBullets(selectedProduct, 'commemorative-green'));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      collection6x6 === 'commemorative-green'
                        ? 'bg-[#15662a]/25 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#15662a]" />
                      <span className="text-xs">Commemorative</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-4">Emerald Green</div>
                  </button>

                  <button
                    onClick={() => {
                      setCollection6x6('commemorative-blue');
                      setBullets6x6(getInitialBullets(selectedProduct, 'commemorative-blue'));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      collection6x6 === 'commemorative-blue'
                        ? 'bg-[#006cb8]/25 border-blue-500 text-blue-300 font-bold'
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#006cb8]" />
                      <span className="text-xs">Commemorative</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-4">Royal Blue</div>
                  </button>

                  <button
                    onClick={() => {
                      setCollection6x6('classic');
                      setBullets6x6(getInitialBullets(selectedProduct, 'classic'));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      collection6x6 === 'classic'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3b434e] border border-amber-400" />
                      <span className="text-xs">Classic Collection</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-4">Slate & Gold Trim</div>
                  </button>

                  <button
                    onClick={() => {
                      setCollection6x6('conventional');
                      setBullets6x6(getInitialBullets(selectedProduct, 'conventional'));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      collection6x6 === 'conventional'
                        ? 'bg-sky-900/30 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#112d4e]" />
                      <span className="text-xs">Conventional</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-4">Deep Navy</div>
                  </button>
                </div>
              </div>

              {/* Product Name from Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Product Name (from Description)
                </label>
                <input
                  type="text"
                  value={productName6x6}
                  onChange={(e) => setProductName6x6(e.target.value)}
                  placeholder={selectedProduct?.description || selectedProduct?.name}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Appears in bottom banner above retail price.
                </p>
              </div>

              {/* 5 Ledger Specification Bullets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Specification Bullets (5 Ledger Lines)
                  </label>
                  <button
                    onClick={() => setBullets6x6(getInitialBullets(selectedProduct, collection6x6))}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                </div>
                {bullets6x6.map((bullet, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const updated = [...bullets6x6];
                        updated[idx] = e.target.value;
                        setBullets6x6(updated);
                      }}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>

              {/* Additional Features (MISC Bucket Images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Additional Features (MISC Bucket)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {activeMiscFeatures6x6.length}/2 active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {miscFeaturesList.map((feat) => {
                    const isSelected = activeMiscFeatures6x6.includes(feat.id);
                    return (
                      <button
                        key={feat.id}
                        type="button"
                        onClick={() => toggleMiscFeature(feat.id)}
                        className={`p-2 rounded-lg border text-left transition-all flex items-start space-x-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                            : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[11px] truncate leading-tight">{feat.label}</div>
                          <div className="text-[9px] text-slate-400 truncate">{feat.file}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* NON-6X6 CONTROLS (Theme, Toggles, Text Overrides) */
            <>
              {/* Theme Palette */}
              <div className="border-t border-slate-800 pt-4">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Card Visual Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {themeOptions.map((t) => (
                    <button
                      key={t.id}
                      title={t.name}
                      onClick={() => setTheme(t.id)}
                      className={`h-9 rounded-lg flex items-center justify-center transition-all ${t.previewBg} ${
                        theme === t.id ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {theme === t.id && (
                        <Check className={`w-4 h-4 ${t.id === 'clean-white' || t.id === 'champagne-gold' ? 'text-slate-900' : 'text-amber-300'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Toggles */}
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Display Elements
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showImage}
                      onChange={(e) => setShowImage(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Product Photo</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSpecs}
                      onChange={(e) => setShowSpecs(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Material & Specs</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeatures}
                      onChange={(e) => setShowFeatures(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Craft Features</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showModelCode}
                      onChange={(e) => setShowModelCode(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Model SKU</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCustomerLogo}
                      onChange={(e) => setShowCustomerLogo(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Funeral Home</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMonthlyPayment}
                      onChange={(e) => setShowMonthlyPayment(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Financing Est.</span>
                  </label>
                </div>
              </div>

              {/* Custom Text Overrides */}
              {(dimension === '8.5x11' || dimension === '11x17') && (
                <div className="border-t border-slate-800 pt-4 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Header & Footer Customization
                  </label>
                  <input
                    type="text"
                    placeholder="Custom Header Title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Custom Subtitle"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Custom Footer (e.g. Living Memorial info)"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </>
          )}

        </div>

        {/* Live Preview Canvas Column (Right, 8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900/60 border border-slate-800/90 rounded-2xl overflow-hidden min-h-[680px]">
          
          {/* Preview Toolbar */}
          <div className="no-print flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Live Card Preview:</span>
              <span className="text-amber-300 font-mono">
                {dimension === '6x6' && `6" × 6" Square Cap Card (${collection6x6.replace('-', ' ').toUpperCase()})`}
                {dimension === '2x12' && '2" × 12" Casket Rail Strip'}
                {dimension === '8.5x11' && '8.5" × 11" Showroom Letter Sheet'}
                {dimension === '11x17' && '11" × 17" Tabloid Display Board'}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomScale((z) => Math.max(0.3, z - 0.1))}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.1))}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (dimension === '11x17') setZoomScale(0.48);
                  else if (dimension === '8.5x11') setZoomScale(0.68);
                  else if (dimension === '2x12') setZoomScale(0.75);
                  else setZoomScale(0.95);
                }}
                className="text-[11px] text-amber-400 hover:underline px-2"
              >
                Reset Fit
              </button>
            </div>
          </div>

          {/* Scaled Preview Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
                  collectionType={collection6x6}
                  productNameOverride={productName6x6.trim() || undefined}
                  customBullets={bullets6x6.length === 5 && bullets6x6.some(b => b.trim()) ? bullets6x6 : undefined}
                  activeMiscFeatures={activeMiscFeatures6x6}
                />
              )}

              {dimension === '2x12' && selectedProduct && (
                <Card2x12
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                />
              )}

              {dimension === '8.5x11' && selectedProduct && (
                <Card8x11
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                />
              )}

              {dimension === '11x17' && selectedProduct && (
                <Card11x17
                  product={selectedProduct}
                  customer={selectedCustomer}
                  config={cardConfig}
                  retailPrice={finalRetailPrice}
                />
              )}
            </div>
          </div>

          {/* Quick Print Banner Footer */}
          <div className="no-print px-6 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <p>
              💡 <strong>Print Tip:</strong> When using standard printers, select <em>&quot;Actual Size&quot;</em> or <em>&quot;100% Scale&quot;</em> in your print dialog to maintain precise physical inches.
            </p>
            <button
              onClick={handlePrint}
              className="text-amber-400 hover:text-amber-300 font-semibold underline ml-4 shrink-0 cursor-pointer"
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
