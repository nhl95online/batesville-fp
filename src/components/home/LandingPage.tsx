import React, { useState, useEffect } from 'react';
import { Customer, Product } from '../../types';
import { getCachedSales } from '../../services/db';
import {
  Tag,
  BarChart3,
  Building2,
  Layers,
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  LayoutGrid
} from 'lucide-react';

interface LandingPageProps {
  customers: Customer[];
  products: Product[];
  salesCount: number;
  onNavigate: (tab: 'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans') => void;
  onOpenSalesUpload: () => void;
  onOpenImageManager: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  customers,
  products,
  salesCount,
  onNavigate,
  onOpenSalesUpload,
  onOpenImageManager,
}) => {
  const [latestYear, setLatestYear] = useState<string>('2025-26');
  const [latestYearRevenue, setLatestYearRevenue] = useState<number>(0);
  const [latestYearUnits, setLatestYearUnits] = useState<number>(0);

  // Compute live recent fiscal stats
  useEffect(() => {
    async function loadRecentStats() {
      try {
        const sales = await getCachedSales();
        if (sales.length > 0) {
          const distinctYears = Array.from(new Set(sales.map(s => String(s.year))))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          const recent = distinctYears[distinctYears.length - 1] || '2025-26';
          setLatestYear(recent);

          const recentSales = sales.filter(s => String(s.year) === recent);
          const rev = recentSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
          const units = recentSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
          setLatestYearRevenue(rev);
          setLatestYearUnits(units);
        }
      } catch (err) {
        console.warn('Could not load landing page stats:', err);
      }
    }
    loadRecentStats();
  }, [salesCount]);

  // Tier counts
  const platinumCount = customers.filter(c => (c.program || '').toLowerCase().includes('platinum')).length;
  const goldCount = customers.filter(c => (c.program || '').toLowerCase().includes('gold')).length;
  const silverCount = customers.filter(c => (c.program || '').toLowerCase().includes('silver')).length;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-700/50 text-white">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Merchandising & Showroom Portal</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Batesville Showroom <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400">
              Price Card Studio & Fiscal Analytics
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Streamline your showroom operations with authenticated price cards (6x6, 2x12 Urns, 8.5x11, 11x17), real-time fiscal Year-over-Year analytics, and instant Daily Sales PDF ingestion into your Batesville Cloud Database.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => onNavigate('cards')}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Tag className="w-4 h-4" />
              <span>Launch Price Card Studio</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate('sales')}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-xl text-xs sm:text-sm border border-white/15 backdrop-blur-sm transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Fiscal Sales (YoY)</span>
            </button>

            <button
              onClick={onOpenSalesUpload}
              className="flex items-center space-x-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold px-4 py-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Upload Daily Sales PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Customers */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Partner Accounts</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900">
            {customers.length.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-600">
            <span className="font-semibold text-amber-700">{platinumCount} Platinum</span>
            <span>•</span>
            <span className="text-slate-600">{goldCount} Gold</span>
            <span>•</span>
            <span className="text-slate-500">{silverCount} Silver</span>
          </div>
        </div>

        {/* Card 2: Catalog Products */}
        <div 
          onClick={() => onNavigate('products')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Models</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900">
            {products.length.toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Wood, Metal & Cremation</span>
            <span className="text-amber-600 font-semibold group-hover:underline flex items-center">
              Browse <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Recent Fiscal Year Sales */}
        <div 
          onClick={() => onNavigate('sales')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FY {latestYear} Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900">
            {latestYearRevenue > 0 ? `$${Math.round(latestYearRevenue).toLocaleString()}` : '$—'}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{latestYearUnits.toLocaleString()} units delivered</span>
            <span className="text-emerald-700 font-semibold">Active Cycle</span>
          </div>
        </div>

        {/* Card 4: Cloud Database Sync */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supabase Sync</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-serif text-2xl font-black text-slate-900">Live & Synced</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {salesCount.toLocaleString()} total historical records
          </div>
        </div>

      </div>

      {/* Feature Hub Navigation Grid */}
      <div>
        <div className="mb-4">
          <h2 className="font-serif text-2xl font-bold text-slate-900 tracking-wide">
            Showroom Merchandising & Operations Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Select a module below to quickly manage showroom displays, generate print cards, or analyze sales trends.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Module 1: Price Card Studio */}
          <div 
            onClick={() => onNavigate('cards')}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Price Card Studio
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate high-resolution print-ready price cards in standard <strong>6x6</strong>, <strong>2x12</strong> (Urns), <strong>8.5x11</strong>, and <strong>11x17</strong> dimensions.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Classic</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">Commemorative</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Conventional</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Basic</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 2: Sales & YoY Analytics */}
          <div 
            onClick={() => onNavigate('sales')}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Fiscal Sales Analytics (YoY)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Analyze delivery orders across Batesville fiscal years (<strong>Oct 1st to Sep 30th</strong>). Defaults to the most recent fiscal year with sub-millisecond filtering.
              </p>
              <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Q1 (Oct–Dec) to Q4 (Jul–Sep) cycle</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>View Analytics</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 3: Daily Sales PDF Ingestion */}
          <div 
            onClick={onOpenSalesUpload}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Upload Daily Sales (PDF)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingest official Batesville Daily Billing Reports. Automatically parses Item Number, Qty, Cost, extracts Account # from Customer Ship-to, and assigns continuous IDs.
              </p>
              <div className="mt-4 flex items-center space-x-2 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto fiscal date (e.g. 2025-26 SEP 19)</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
              <span>Upload PDF Document</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 4: Catalogs by Year */}
          <div 
            onClick={() => onNavigate('catalogs')}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Catalogs by Year
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore catalog offerings segmented by product year. Filter by LifeSymbols, LifeStories, Dual Disposition, and Oversize dimensions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Browse Catalog Years</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 5: Customer Directory */}
          <div 
            onClick={() => onNavigate('customers')}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Customers & Partner Accounts
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lookup funeral home account numbers, contact details, customized pricing markups, and selection room configurations.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
              <span>View Accounts</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 6: Casket Images Studio */}
          <div 
            onClick={onOpenImageManager}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                Casket Photography & Storage
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access official Batesville casket product photos, link external image URLs, or upload custom photography directly into browser IndexedDB storage.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Open Image Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 7: Interactive Showroom Floor Plans */}
          <div 
            onClick={() => onNavigate('floorplans')}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between md:col-span-2 lg:col-span-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Interactive Showroom Floor Plans & Merchandising Engine
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      NEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Design custom selection rooms in <strong>Oval / Rotunda</strong>, <strong>Square</strong>, <strong>Rectangle Gallery</strong>, and <strong>L-Shaped</strong> layouts. Live integration with sales records highlights <strong>Top Sellers</strong> vs <strong>Stagnant (0 Sales)</strong> models with intelligent merchandising swap recommendations.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm group-hover:bg-amber-600 transition-colors">
                  <span>Open Floor Plans</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
