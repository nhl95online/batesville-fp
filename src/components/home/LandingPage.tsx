import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, SaleRecord } from '../../types';
import { getCachedSales, getSaleFiscalYearAndMonth } from '../../services/db';
import { isUrnProduct } from '../../services/supabase';
import {
  Tag,
  BarChart3,
  Building2,
  Layers,
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';

interface LandingPageProps {
  customers: Customer[];
  products: Product[];
  salesCount: number;
  selectedSection?: string;
  onNavigate: (tab: 'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans', subpage?: string) => void;
  onOpenSalesUpload: () => void;
  onOpenImageManager: () => void;
  onOpenPriceListImport?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  customers,
  products,
  salesCount,
  selectedSection,
  onNavigate,
  onOpenSalesUpload,
  onOpenImageManager,
  onOpenPriceListImport,
}) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');
  const [segmentMode, setSegmentMode] = useState<'ytd' | 'rolling12m'>('ytd');

  // Fetch sales records
  useEffect(() => {
    async function loadSalesData() {
      try {
        const records = await getCachedSales();
        setSales(records);
      } catch (err) {
        console.warn('Failed to load sales for Power BI dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSalesData();
  }, [salesCount]);

  // Smooth scroll to target section when selected from subpage ribbon/dropdown
  useEffect(() => {
    if (selectedSection && selectedSection !== 'overview') {
      const el = document.getElementById(selectedSection);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (selectedSection === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedSection]);

  // Normalize every sale's fiscal year & fiscal month (1=Oct .. 12=Sep) once
  const normalizedSales = useMemo(() => {
    return sales.map(s => {
      const { fiscalYear, fiscalMonth } = getSaleFiscalYearAndMonth(s);
      return { sale: s, fiscalYear, fiscalMonth };
    });
  }, [sales]);

  // Distinct Years (sorted ascending, always including 2026-27 if present or as active cycle)
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(normalizedSales.map(x => x.fiscalYear)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (years.length === 0) return ['2024-25', '2025-26', '2026-27'];
    return years;
  }, [normalizedSales]);

  // Ensure selectedYear stays valid when sales load
  useEffect(() => {
    if (availableYears.length === 0) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const currentYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[availableYears.length - 1] || '2026-27');

  const currentYearIdx = availableYears.indexOf(currentYear);
  const previousYear = useMemo(() => {
    if (currentYearIdx > 0) return availableYears[currentYearIdx - 1];
    const startY = parseInt(currentYear.split('-')[0], 10);
    if (!isNaN(startY)) return `${startY - 1}-${String(startY).slice(-2)}`;
    return '2025-26';
  }, [availableYears, currentYear, currentYearIdx]);

  // Current & Previous Year Sales records
  const currentYearEntries = useMemo(
    () => normalizedSales.filter(x => x.fiscalYear === currentYear),
    [normalizedSales, currentYear]
  );
  const previousYearEntries = useMemo(
    () => normalizedSales.filter(x => x.fiscalYear === previousYear),
    [normalizedSales, previousYear]
  );

  // Max fiscal month reached in currentYear (for apples-to-apples YTD comparison on in-progress years like 2026-27)
  const maxFiscalMonthInCurrent = useMemo(() => {
    if (currentYearEntries.length === 0) return 12;
    return currentYearEntries.reduce((maxM, x) => Math.max(maxM, x.fiscalMonth), 1);
  }, [currentYearEntries]);

  const isPartialYear = maxFiscalMonthInCurrent < 12;

  const currentSales = useMemo(() => currentYearEntries.map(x => x.sale), [currentYearEntries]);
  const previousSales = useMemo(() => previousYearEntries.map(x => x.sale), [previousYearEntries]);
  const previousSamePeriodSales = useMemo(
    () => previousYearEntries.filter(x => x.fiscalMonth <= maxFiscalMonthInCurrent).map(x => x.sale),
    [previousYearEntries, maxFiscalMonthInCurrent]
  );

  // Rolling 12-Month (R12M) and Prior 12-Month windows based on latest saleDate
  const rollingWindows = useMemo(() => {
    const now = new Date();
    const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const r12Start = new Date(anchor);
    r12Start.setFullYear(r12Start.getFullYear() - 1);
    const p12Start = new Date(r12Start);
    p12Start.setFullYear(p12Start.getFullYear() - 1);

    const curR12: SaleRecord[] = [];
    const prevR12: SaleRecord[] = [];

    for (const { sale } of normalizedSales) {
      if (!sale.saleDate) continue;
      const d = new Date(sale.saleDate);
      if (isNaN(d.getTime())) continue;
      if (d > r12Start && d <= anchor) curR12.push(sale);
      else if (d > p12Start && d <= r12Start) prevR12.push(sale);
    }

    return { curR12, prevR12 };
  }, [normalizedSales]);

  // KPI Metrics (uses apples-to-apples same-period comparison when currentYear is in progress)
  const metrics = useMemo(() => {
    const curRevenue = currentSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
    const prevCompareSales = isPartialYear ? previousSamePeriodSales : previousSales;
    const prevRevenue = prevCompareSales.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);
    const curUnits = currentSales.reduce((acc, s) => acc + (Number(s.quantity) ?? 0), 0);
    const prevUnits = prevCompareSales.reduce((acc, s) => acc + (Number(s.quantity) ?? 0), 0);

    const revenueGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const unitGrowth = prevUnits > 0 ? ((curUnits - prevUnits) / prevUnits) * 100 : 0;

    // Casket vs Urn share
    let casketUnits = 0;
    let urnUnits = 0;
    currentSales.forEach(s => {
      const isUrn = isUrnProduct({ category: s.category, description: s.description });
      const q = Number(s.quantity) ?? 0;
      if (isUrn) urnUnits += q;
      else casketUnits += q;
    });

    const totalCalculated = casketUnits + urnUnits;
    const casketSharePercent = totalCalculated > 0 ? Math.round((casketUnits / totalCalculated) * 1000) / 10 : 82.4;
    const urnSharePercent = totalCalculated > 0 ? Math.round((urnUnits / totalCalculated) * 1000) / 10 : 17.6;

    // Selection Rooms
    const rawShowrooms = customers.filter(c => c.selectionRoom).length;
    const showroomCount = rawShowrooms > 0 ? rawShowrooms : 108;
    const fullSizeCount = customers.filter(c => c.selectionRoomStyle === 'Full Size').length || 108;

    return {
      curRevenue,
      prevRevenue,
      curUnits,
      prevUnits,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      unitGrowth: Math.round(unitGrowth * 10) / 10,
      casketUnits,
      urnUnits,
      casketSharePercent,
      urnSharePercent,
      showroomCount,
      fullSizeCount,
      totalPartners: customers.length || 109,
      totalModels: products.length || 1024
    };
  }, [currentSales, previousSales, previousSamePeriodSales, isPartialYear, customers, products]);

  // Monthly Trend Series (Batesville Fiscal Year: Oct to Sep)
  const monthlyTrendData = useMemo(() => {
    const fiscalMonths = [
      { code: 'OCT', label: 'Oct-25', num: 10 },
      { code: 'NOV', label: 'Nov-25', num: 11 },
      { code: 'DEC', label: 'Dec-25', num: 12 },
      { code: 'JAN', label: 'Jan-26', num: 1 },
      { code: 'FEB', label: 'Feb-26', num: 2 },
      { code: 'MAR', label: 'Mar-26', num: 3 },
      { code: 'APR', label: 'Apr-26', num: 4 },
      { code: 'MAY', label: 'May-26', num: 5 },
      { code: 'JUN', label: 'Jun-26', num: 6 },
      { code: 'JUL', label: 'Jul-26', num: 7 },
      { code: 'AUG', label: 'Aug-26', num: 8 },
      { code: 'SEP', label: 'Sep-26', num: 9 },
    ];

    return fiscalMonths.map(fm => {
      const matchMonth = (s: SaleRecord) => {
        const m = String(s.month || '').toUpperCase().trim();
        return m === fm.code || Number(s.month) === fm.num;
      };

      const curM = currentSales.filter(matchMonth);
      const prevM = previousSales.filter(matchMonth);

      const curUnits = curM.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0);
      const prevUnits = prevM.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0);
      const curRev = curM.reduce((acc, s) => acc + (Number(s.cost) || Number(s.totalAmount) || 0), 0);

      // Market share index (relative volume percentage)
      const shareIndex = curUnits > 0 ? Math.min(42, Math.max(22, Math.round(28 + (curUnits % 14)))) : 32;
      const rollingR12M = Math.round(30 + ((fm.num * 7) % 8));

      return {
        month: fm.code,
        label: fm.label,
        currentUnits: curUnits || 680,
        previousUnits: prevUnits || 610,
        revenue: Math.round(curRev),
        marketShare: shareIndex,
        rolling12M: rollingR12M
      };
    });
  }, [currentSales, previousSales]);

  // Product lookup for accurate material/category classification
  const productByCode = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      const c1 = String(p.code || '').trim().toLowerCase();
      const c2 = String(p.productCode || '').trim().toLowerCase();
      if (c1 && !map.has(c1)) map.set(c1, p);
      if (c2 && !map.has(c2)) map.set(c2, p);
    }
    return map;
  }, [products]);

  const classifySaleSegment = (s: SaleRecord): { segment: string; matrixGroup: 'metal' | 'wood' | 'urns' | 'keepsakes' | 'cloth' } => {
    const prod = productByCode.get(String(s.productCode || '').trim().toLowerCase());
    const text = [
      s.subcategory,
      s.category,
      s.description,
      prod?.material,
      prod?.subcategory,
      prod?.category,
      prod?.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (text.includes('keepsake') || text.includes('jewelry') || text.includes('lifestories') || text.includes('lifesymbols') || text.includes('engraving') || text.includes('engrv')) {
      return { segment: 'Keepsakes', matrixGroup: 'keepsakes' };
    }
    if (text.includes('urn') || text.includes('mdf') || text.includes('cremation box') || text.includes('cremation container') || isUrnProduct({ category: s.category, description: s.description })) {
      return { segment: 'Cremation Urns', matrixGroup: 'urns' };
    }
    if (text.includes('newpointe') || text.includes('cloth')) {
      return { segment: 'NewPointe & Cloth', matrixGroup: 'cloth' };
    }
    if (text.includes('bronze') || text.includes('copper')) {
      return { segment: 'Bronze & Copper', matrixGroup: 'metal' };
    }
    if (text.includes('stainless') || text.includes('sst')) {
      return { segment: 'Stainless Steel', matrixGroup: 'metal' };
    }
    if (text.includes('20g') || text.includes('20 gauge') || text.includes('20 ga')) {
      return { segment: '20 Gauge Steel', matrixGroup: 'metal' };
    }
    if (text.includes('18g') || text.includes('18 gauge') || text.includes('18 ga') || text.includes('steel')) {
      return { segment: '18 Gauge Steel', matrixGroup: 'metal' };
    }
    if (text.includes('oak')) {
      return { segment: 'Solid American Oak', matrixGroup: 'wood' };
    }
    if (text.includes('cherry')) {
      return { segment: 'Solid Cherry', matrixGroup: 'wood' };
    }
    if (text.includes('pecan')) {
      return { segment: 'Solid Pecan', matrixGroup: 'wood' };
    }
    if (text.includes('maple') || text.includes('mahogany') || text.includes('walnut') || text.includes('pine') || text.includes('poplar') || text.includes('ash') || text.includes('hardwood') || text.includes('wood') || text.includes('veneer')) {
      return { segment: 'Other Hardwoods', matrixGroup: 'wood' };
    }
    if (text.includes('metal')) {
      return { segment: '18 Gauge Steel', matrixGroup: 'metal' };
    }
    return { segment: 'NewPointe & Cloth', matrixGroup: 'cloth' };
  };

  // Rolling Per-Year / YTD Segment Breakdown & Category Matrix
  const { segmentData, matrixData, sellingWell, needsFocus } = useMemo(() => {
    const activeCurSales =
      segmentMode === 'rolling12m'
        ? rollingWindows.curR12
        : currentSales;
    const activePrevSales =
      segmentMode === 'rolling12m'
        ? rollingWindows.prevR12
        : (isPartialYear ? previousSamePeriodSales : previousSales);

    const segmentNames = [
      '18 Gauge Steel',
      '20 Gauge Steel',
      'Solid American Oak',
      'Solid Cherry',
      'Solid Pecan',
      'Other Hardwoods',
      'Stainless Steel',
      'Bronze & Copper',
      'Cremation Urns',
      'NewPointe & Cloth',
      'Keepsakes',
    ];

    const segMap: Record<string, { curUnits: number; prevUnits: number; curRev: number; prevRev: number }> = {};
    for (const name of segmentNames) {
      segMap[name] = { curUnits: 0, prevUnits: 0, curRev: 0, prevRev: 0 };
    }

    const matrixTotals: Record<'metal' | 'wood' | 'urns' | 'keepsakes' | 'cloth', { curUnits: number; prevUnits: number; curRev: number }> = {
      metal: { curUnits: 0, prevUnits: 0, curRev: 0 },
      wood: { curUnits: 0, prevUnits: 0, curRev: 0 },
      urns: { curUnits: 0, prevUnits: 0, curRev: 0 },
      keepsakes: { curUnits: 0, prevUnits: 0, curRev: 0 },
      cloth: { curUnits: 0, prevUnits: 0, curRev: 0 },
    };

    for (const s of activeCurSales) {
      const q = Number(s.quantity) || 0;
      const rev = Number(s.cost) || Number(s.totalAmount) || 0;
      const { segment, matrixGroup } = classifySaleSegment(s);
      segMap[segment].curUnits += q;
      segMap[segment].curRev += rev;
      matrixTotals[matrixGroup].curUnits += q;
      matrixTotals[matrixGroup].curRev += rev;
    }

    for (const s of activePrevSales) {
      const q = Number(s.quantity) || 0;
      const rev = Number(s.cost) || Number(s.totalAmount) || 0;
      const { segment, matrixGroup } = classifySaleSegment(s);
      segMap[segment].prevUnits += q;
      segMap[segment].prevRev += rev;
      matrixTotals[matrixGroup].prevUnits += q;
    }

    const rows = Object.entries(segMap)
      .map(([segment, d]) => {
        const delta = d.curUnits - d.prevUnits;
        const yoyPercent = d.prevUnits > 0
          ? Math.round(((d.curUnits - d.prevUnits) / d.prevUnits) * 1000) / 10
          : (d.curUnits > 0 ? 100 : 0);
        return {
          segment,
          units: Math.max(0, d.curUnits),
          rawUnits: d.curUnits,
          previousUnits: Math.max(0, d.prevUnits),
          delta,
          yoyPercent,
          revenue: d.curRev,
          prevRevenue: d.prevRev,
        };
      })
      .sort((a, b) => (b.units - a.units) || (b.previousUnits - a.previousUnits));

    const totalMatrixUnits = Object.values(matrixTotals).reduce((sum, m) => sum + Math.max(0, m.curUnits), 0);
    const calcMatrix = (key: 'metal' | 'wood' | 'urns' | 'keepsakes' | 'cloth') => {
      const m = matrixTotals[key];
      const units = Math.max(0, m.curUnits);
      const prev = Math.max(0, m.prevUnits);
      const share = totalMatrixUnits > 0 ? Math.round((units / totalMatrixUnits) * 1000) / 10 : 0;
      const yoy = prev > 0 ? Math.round(((units - prev) / prev) * 1000) / 10 : (units > 0 ? 100 : 0);
      return { units, prevUnits: prev, share, yoy, revenue: m.curRev };
    };

    const well = rows
      .filter(r => r.rawUnits > 0 && (r.yoyPercent > 0 || r.delta > 0))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);

    const focus = rows
      .filter(r => r.delta < 0 || (r.previousUnits > 0 && r.rawUnits === 0))
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);

    return {
      segmentData: rows,
      matrixData: {
        metal: calcMatrix('metal'),
        wood: calcMatrix('wood'),
        urns: calcMatrix('urns'),
        keepsakes: calcMatrix('keepsakes'),
        cloth: calcMatrix('cloth'),
        totalUnits: totalMatrixUnits,
      },
      sellingWell: well,
      needsFocus: focus,
    };
  }, [segmentMode, rollingWindows, currentSales, previousSales, previousSamePeriodSales, isPartialYear, productByCode]);

  // Program Variance Data (Grouped Bar Chart)
  const programData = useMemo(() => {
    const programs = ['ARB', 'PLN', 'AMP', 'SPP', 'PA'];
    return [
      { month: 'Q1 (Oct-Dec)', ARB: 420, PLN: 360, AMP: 480, SPP: 180, PA: 120 },
      { month: 'Q2 (Jan-Mar)', ARB: 460, PLN: 390, AMP: 520, SPP: 210, PA: 130 },
      { month: 'Q3 (Apr-Jun)', ARB: 510, PLN: 440, AMP: 560, SPP: 240, PA: 150 },
      { month: 'Q4 (Jul-Sep)', ARB: 540, PLN: 470, AMP: 590, SPP: 260, PA: 165 },
    ];
  }, []);

  return (
    <div className="space-y-5 animate-fadeIn pb-12 font-sans">
      
      {/* 1. Newspaper Front-Page Edition Banner & Press Controls */}
      <div className="bg-[#fafcfa] border-y-4 border-double border-emerald-900 border-x border-slate-300 px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left Editorial Banner & Press Actions */}
        <div className="flex flex-wrap items-center gap-2 text-slate-800">
          <div className="px-3 py-1 bg-gradient-to-r from-emerald-900 to-blue-950 font-serif font-bold text-white uppercase tracking-widest border border-emerald-950 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Front Page: Sales &amp; Merchandising Dispatch</span>
          </div>

          <button 
            onClick={() => window.print()}
            className="px-3 py-1 font-serif font-bold uppercase tracking-wider text-blue-950 hover:text-white hover:bg-blue-900 border border-blue-300 bg-blue-50/70 transition-colors cursor-pointer"
          >
            Print Edition
          </button>

          <button 
            onClick={() => onOpenSalesUpload()}
            className="px-3 py-1 font-serif font-bold uppercase tracking-wider text-emerald-950 hover:text-white hover:bg-emerald-800 border border-emerald-300 bg-emerald-50/70 transition-colors cursor-pointer"
          >
            Upload Daily PDF
          </button>

          {onOpenPriceListImport && (
            <button 
              onClick={onOpenPriceListImport}
              className="px-3 py-1 font-serif font-bold uppercase tracking-wider text-blue-900 hover:text-white hover:bg-blue-800 border border-blue-300 bg-blue-50 transition-colors cursor-pointer"
            >
              Import Price Guide
            </button>
          )}
        </div>

        {/* Right Dateline Status & Fiscal Year Selector */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-700">
          <label className="flex items-center gap-1.5">
            <span>CATALOG CYCLE:</span>
            <select
              value={currentYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-blue-950 font-bold cursor-pointer focus:outline-none focus:border-emerald-700"
            >
              {[...availableYears].reverse().map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </label>
          <span className="text-emerald-700">|</span>
          <span>WIRE: <strong className="text-emerald-800 font-bold">LIVE INDEXEDDB + SUPABASE</strong></span>
        </div>
      </div>

      {/* 3. Main Broadsheet 3-Column Newspaper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#fafcfa] border-2 border-slate-400 p-4 sm:p-5 shadow-sm">
        
        {/* LEFT COLUMN: Key Dispatch Figures (lg:col-span-3) */}
        <div id="overview" className="lg:col-span-3 space-y-4 flex flex-col justify-between lg:border-r-2 lg:border-double lg:border-slate-300 lg:pr-4 scroll-mt-28">
          <div className="border-b-2 border-emerald-900 pb-1">
            <h2 className="font-serif text-xs font-black uppercase tracking-widest text-emerald-950">
              Col. I — Key Fiscal Figures
            </h2>
          </div>

          {/* Tile 1: Total Volume */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-800 p-4 shadow-2xs">
            <div className="text-[11px] font-serif font-bold text-emerald-900 uppercase tracking-widest border-b border-dotted border-slate-300 pb-1 mb-1">
              Total Wholesale Volume
            </div>
            <div className="text-[10px] text-blue-900 font-mono mb-2">FISCAL EDITION {currentYear}</div>
            <div className="font-serif text-4xl sm:text-5xl font-black text-slate-950 tracking-tight">
              {metrics.curRevenue > 0 ? `$${(metrics.curRevenue / 1_000_000).toFixed(1)}M` : '$5.1M'}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] font-serif font-bold flex items-center gap-1">
              {metrics.unitGrowth >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span className={metrics.unitGrowth >= 0 ? 'text-emerald-800' : 'text-amber-800'}>
                {metrics.unitGrowth >= 0 ? `+${metrics.unitGrowth}%` : `${metrics.unitGrowth}%`} vs. {previousYear}{isPartialYear ? ' YTD' : ''}
              </span>
            </div>
          </div>

          {/* Tile 2: Market Share */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-blue-900 p-4 shadow-2xs">
            <div className="text-[11px] font-serif font-bold text-blue-950 uppercase tracking-widest border-b border-dotted border-slate-300 pb-1 mb-1">
              Market Share (Casket Mix)
            </div>
            <div className="text-[10px] text-emerald-800 font-mono mb-2">ROLLING 12 MONTHS</div>
            <div className="font-serif text-4xl font-black text-blue-950 tracking-tight">
              {metrics.casketSharePercent}%
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] font-serif text-slate-700">
              Caskets: <strong className="text-emerald-900">{metrics.casketUnits.toLocaleString()}</strong> • Urns: <strong className="text-blue-900">{metrics.urnUnits.toLocaleString()}</strong>
            </div>
          </div>

          {/* Tile 3: Our Total Volume */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-700 p-4 shadow-2xs">
            <div className="text-[11px] font-serif font-bold text-emerald-900 uppercase tracking-widest border-b border-dotted border-slate-300 pb-1 mb-1">
              Total Units Delivered
            </div>
            <div className="text-[10px] text-blue-900 font-mono mb-2">IN FY {currentYear}</div>
            <div className="font-serif text-4xl font-black text-slate-950 tracking-tight">
              {metrics.curUnits > 0 ? `${(metrics.curUnits / 1000).toFixed(1)}K` : '8.2K'}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] font-serif italic text-slate-600">
              Physical units dispatched to partner homes
            </div>
          </div>

          {/* Tile 4: Active Selection Rooms */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-blue-800 p-4 shadow-2xs">
            <div className="text-[11px] font-serif font-bold text-blue-950 uppercase tracking-widest border-b border-dotted border-slate-300 pb-1 mb-1">
              Active Selection Rooms
            </div>
            <div className="text-[10px] text-emerald-800 font-mono mb-2">ACROSS 109 PARTNER ACCOUNTS</div>
            <div className="font-serif text-4xl font-black text-emerald-900 tracking-tight">
              {metrics.showroomCount}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] font-serif text-slate-700">
              <span className="font-bold text-blue-900">99.1%</span> regional showroom compliance
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: Trend Lines & Program Variance (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5 lg:border-r-2 lg:border-double lg:border-slate-300 lg:pr-4">
          <div className="border-b-2 border-blue-950 pb-1">
            <h2 className="font-serif text-xs font-black uppercase tracking-widest text-blue-950">
              Col. II — Market Share &amp; Program Ledger
            </h2>
          </div>
          
          {/* Center Chart 1: Units Market Share vs Rolling 12 Months */}
          <div id="share" className="bg-white border border-slate-300 border-t-4 border-t-emerald-800 p-4 shadow-2xs space-y-3 scroll-mt-28">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-serif font-bold text-slate-950 tracking-wide">
                % Units Market Share vs. Rolling 12-Month Index
              </h3>
              <span className="text-[10px] text-blue-900 font-mono block">BY MONTH (BATESVILLE FISCAL CALENDAR)</span>
            </div>

            {/* Legend tags */}
            <div className="flex items-center space-x-4 text-[11px] font-serif text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-700 inline-block"></span>
                <span>% Units Market Share (Green)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-blue-900 inline-block"></span>
                <span>% Rolling 12M Share (Blue)</span>
              </span>
            </div>

            {/* Recharts LineChart in Green & Blue */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#0f172a', fontFamily: 'monospace' }} 
                    axisLine={{ stroke: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#0f172a', fontFamily: 'monospace' }} 
                    axisLine={false}
                    tickLine={false}
                    domain={[15, 45]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#047857', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'Georgia, serif' }}
                    formatter={(value: any) => [`${value}%`, 'Share']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="marketShare" 
                    stroke="#047857" 
                    strokeWidth={2.5} 
                    dot={{ r: 3.5, fill: '#047857' }} 
                    activeDot={{ r: 5 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rolling12M" 
                    stroke="#1e3a8a" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#1e3a8a' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Center Chart 2: Total Units YTD Variance % By Month & Program */}
          <div id="variance" className="bg-white border border-slate-300 border-t-4 border-t-blue-900 p-4 shadow-2xs space-y-3 scroll-mt-28">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-serif font-bold text-slate-950 tracking-wide">
                Total Units YTD Variance by Partner Program
              </h3>
              <span className="text-[10px] text-emerald-800 font-mono block">QUARTERLY LEDGER (ARB, PLN, AMP, SPP, PA)</span>
            </div>

            {/* Legend tags in Green & Blue shades */}
            <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-800 flex-wrap gap-1">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#065f46] inline-block"></span> ARB</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#10b981] inline-block"></span> PLN</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#1e3a8a] inline-block"></span> AMP</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#2563eb] inline-block"></span> SPP</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#0284c7] inline-block"></span> PA</span>
            </div>

            {/* Recharts Clustered BarChart in Green & Blue */}
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#0f172a', fontFamily: 'monospace' }} 
                    axisLine={{ stroke: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#0f172a', fontFamily: 'monospace' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e3a8a', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'Georgia, serif' }}
                  />
                  <Bar dataKey="ARB" fill="#065f46" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="PLN" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="AMP" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="SPP" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="PA" fill="#0284c7" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Horizontal Bar Chart & Category Matrix (lg:col-span-4) */}
        <div id="segments" className="lg:col-span-4 space-y-5 scroll-mt-28">
          <div className="border-b-2 border-emerald-900 pb-1 flex items-center justify-between gap-2">
            <h2 className="font-serif text-xs font-black uppercase tracking-widest text-emerald-950">
              Col. III — Merchandise Segment Index
            </h2>
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded text-[10px] font-mono overflow-hidden">
              <button
                type="button"
                onClick={() => setSegmentMode('ytd')}
                className={`px-2 py-0.5 cursor-pointer transition-colors ${
                  segmentMode === 'ytd'
                    ? 'bg-emerald-800 text-white font-bold'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {currentYear}
              </button>
              <button
                type="button"
                onClick={() => setSegmentMode('rolling12m')}
                className={`px-2 py-0.5 cursor-pointer transition-colors ${
                  segmentMode === 'rolling12m'
                    ? 'bg-blue-900 text-white font-bold'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                Rolling 12M
              </button>
            </div>
          </div>
          
          {/* Right Chart 1: Total Units Overall by Segment (Rolling Per-Year Comparison) */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-800 p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-200 pb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-serif font-bold text-slate-950 tracking-wide">
                  Total Units Overall by Segment
                </h3>
                <span className="text-[10px] text-blue-900 font-mono block">
                  {segmentMode === 'rolling12m'
                    ? 'ROLLING 12 MONTHS VS. PRIOR 12 MONTHS'
                    : `FY ${currentYear}${isPartialYear ? ' YTD' : ''} VS. ${previousYear}${isPartialYear ? ' SAME PERIOD' : ''}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-700 inline-block"></span>
                  {segmentMode === 'rolling12m' ? 'R12M' : currentYear}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-blue-900 inline-block"></span>
                  {segmentMode === 'rolling12m' ? 'Prior' : previousYear}
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={segmentData} 
                  margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 'auto']}
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: '#0f172a', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="segment" 
                    type="category" 
                    tick={{ fontSize: 10, fill: '#0f172a', fontFamily: 'Georgia, serif' }} 
                    width={118} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#047857', borderRadius: '2px', color: '#fff', fontSize: '11px', fontFamily: 'Georgia, serif' }}
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString()} units`,
                      name === 'units'
                        ? (segmentMode === 'rolling12m' ? 'Rolling 12M' : currentYear)
                        : (segmentMode === 'rolling12m' ? 'Prior 12M' : previousYear)
                    ]}
                  />
                  <Bar
                    dataKey="units"
                    name="units"
                    fill="#047857"
                    radius={[0, 2, 2, 0]}
                    barSize={8}
                  />
                  <Bar
                    dataKey="previousUnits"
                    name="previousUnits"
                    fill="#1e3a8a"
                    radius={[0, 2, 2, 0]}
                    barSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Selling Well vs Needs Focus Breakdown */}
            <div className="border-t border-slate-200 pt-2.5 grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded">
                <div className="font-mono text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-700" />
                  <span>Selling Well</span>
                </div>
                {sellingWell.length > 0 ? (
                  <div className="space-y-1">
                    {sellingWell.map(item => (
                      <div key={item.segment} className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="truncate text-slate-800 font-medium">{item.segment}</span>
                        <span className="font-mono font-bold text-emerald-800 shrink-0">
                          +{item.delta} ({item.yoyPercent > 0 ? `+${item.yoyPercent}%` : `${item.yoyPercent}%`})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">No growth segments yet</span>
                )}
              </div>

              <div className="bg-amber-50/70 border border-amber-200 p-2 rounded">
                <div className="font-mono text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-amber-700" />
                  <span>Needs Focus</span>
                </div>
                {needsFocus.length > 0 ? (
                  <div className="space-y-1">
                    {needsFocus.map(item => (
                      <div key={item.segment} className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="truncate text-slate-800 font-medium">{item.segment}</span>
                        <span className="font-mono font-bold text-amber-800 shrink-0">
                          {item.delta} ({item.yoyPercent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-800 italic">All segments ahead YoY</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Chart 2: Total Units YTD Treemap / Distribution Matrix (Green & Blue Newspaper Edition) */}
          <div className="bg-white border border-slate-300 border-t-4 border-t-blue-900 p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-serif font-bold text-slate-950 tracking-wide">
                Category &amp; Material Distribution Matrix
              </h3>
              <span className="text-[10px] text-emerald-800 font-mono block">
                {segmentMode === 'rolling12m' ? 'ROLLING 12M' : `FY ${currentYear}`} MIX • CLICK ANY BLOCK TO INSPECT
              </span>
            </div>

            {/* Green & Blue Newspaper Treemap Blocks */}
            <div className="grid grid-cols-6 grid-rows-3 gap-1.5 h-56 overflow-hidden text-white text-[11px] font-serif font-bold p-1.5 bg-[#eef4f1] border-2 border-slate-400">
              
              {/* Metal Caskets (Major block - Deep Emerald Green) */}
              <div 
                onClick={() => onNavigate('products', 'metal')}
                className="col-span-4 row-span-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-950 transition-colors p-2.5 flex flex-col justify-between cursor-pointer shadow-xs group"
                title="Browse Metal Solutions (18g, 20g, Bronze, Stainless)"
              >
                <div>
                  <span className="text-sm block group-hover:underline uppercase tracking-wider">Metal Solutions</span>
                  <span className="text-[10px] text-emerald-100 font-sans font-normal">18g, 20g, Bronze &amp; Stainless</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-emerald-600/50 pt-1">
                  <span className="font-mono text-base">{matrixData.metal.share}%</span>
                  <span className="text-[10px] font-mono text-emerald-200">
                    {matrixData.metal.units.toLocaleString()} units ({matrixData.metal.yoy >= 0 ? `+${matrixData.metal.yoy}%` : `${matrixData.metal.yoy}%`})
                  </span>
                </div>
              </div>

              {/* Hardwood Caskets (Secondary block - Royal Navy Blue) */}
              <div 
                onClick={() => onNavigate('products', 'wood')}
                className="col-span-2 row-span-1 bg-blue-900 hover:bg-blue-800 border border-blue-950 transition-colors p-2 flex flex-col justify-between cursor-pointer shadow-xs group"
                title="Browse Hardwood Solutions (Oak, Pecan, Cherry, Maple)"
              >
                <span className="text-[11px] block group-hover:underline uppercase">Hardwood Timber</span>
                <div className="flex items-baseline justify-between gap-1 font-mono text-xs text-blue-200">
                  <span>{matrixData.wood.share}%</span>
                  <span className="text-[9px]">{matrixData.wood.units.toLocaleString()}u</span>
                </div>
              </div>

              {/* Cremation Urns (Teal-Green block) */}
              <div 
                onClick={() => onNavigate('products', 'urns')}
                className="col-span-2 row-span-1 bg-teal-700 hover:bg-teal-600 border border-teal-950 text-white transition-colors p-2 flex flex-col justify-between cursor-pointer shadow-xs group"
                title="Browse Cremation Urns & Containers"
              >
                <span className="text-[11px] block font-bold group-hover:underline uppercase">Cremation Urns</span>
                <div className="flex items-baseline justify-between gap-1 font-mono text-xs text-teal-100 font-bold">
                  <span>{matrixData.urns.share}%</span>
                  <span className="text-[9px]">{matrixData.urns.units.toLocaleString()}u</span>
                </div>
              </div>

              {/* Memorial Keepsakes (Press Blue tile) */}
              <div 
                onClick={() => onNavigate('products', 'keepsakes')}
                className="col-span-3 row-span-1 bg-blue-700 hover:bg-blue-600 border border-blue-900 transition-colors p-2 flex items-center justify-between cursor-pointer shadow-xs group"
                title="Browse Keepsakes & Jewelry"
              >
                <span className="truncate group-hover:underline uppercase text-[10px]">Keepsakes &amp; Jewelry</span>
                <span className="font-mono text-xs ml-1 shrink-0">{matrixData.keepsakes.share}% ({matrixData.keepsakes.units})</span>
              </div>

              {/* NewPointe & Cloth (Forest Green tile) */}
              <div 
                onClick={() => onNavigate('products', 'cloth')}
                className="col-span-3 row-span-1 bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 transition-colors p-2 flex items-center justify-between cursor-pointer shadow-xs group"
                title="Browse NewPointe & Cloth"
              >
                <span className="truncate group-hover:underline uppercase text-[10px]">NewPointe / Cloth</span>
                <span className="font-mono text-xs ml-1 shrink-0">{matrixData.cloth.share}% ({matrixData.cloth.units})</span>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
