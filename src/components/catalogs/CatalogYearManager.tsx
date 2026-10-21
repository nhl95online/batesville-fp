import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { syncFromSupabase } from '../../services/supabase';
import { db } from '../../services/db';
import { 
  Calendar, 
  Layers, 
  RefreshCw, 
  Upload, 
  Download, 
  Tag, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Plus,
  FileText,
  Lock
} from 'lucide-react';

interface CatalogYearManagerProps {
  products: Product[];
  onSelectProductForCard: (productId: string) => void;
  onDataChanged: () => void;
  onOpenImageManager: () => void;
  onOpenLithoManager?: () => void;
  onOpenPriceListImport?: () => void;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export const CatalogYearManager: React.FC<CatalogYearManagerProps> = ({
  products,
  onSelectProductForCard,
  onDataChanged,
  onOpenImageManager,
  onOpenLithoManager,
  onOpenPriceListImport,
  selectedYear: selectedYearProp,
  onYearChange,
  isLoggedIn = false,
  onRequireLogin,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(selectedYearProp || 'all');
  const [selectedFeature, setSelectedFeature] = useState<'all' | 'lifesymbols' | 'lifestories' | 'dual' | 'oversize'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedYearProp !== undefined && selectedYearProp !== selectedYear) {
      setSelectedYear(selectedYearProp);
    }
  }, [selectedYearProp]);

  const handleSelectYear = (yr: string) => {
    setSelectedYear(yr);
    onYearChange?.(yr);
  };

  // Group products by Catalog Year (including standard Batesville catalog editions)
  const baseYears = ['2026-27', '2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2016-17'];
  const productYears = Array.from(new Set(products.map(p => String(p.catalogYear || p.year || '')).filter(Boolean)));
  const distinctYears = Array.from(new Set([...baseYears, ...productYears])).sort((a, b) => b.localeCompare(a));
  const activeYear = selectedYear === 'all' ? (distinctYears[0] || '2026-27') : selectedYear;

  const matchesYear = (productYear: string | number | undefined, filterYear: string) => {
    if (filterYear === 'all') return true;
    const pYr = String(productYear || '').trim();
    const fYr = filterYear.trim();
    if (!pYr) return false;
    if (pYr === fYr) return true;
    if (fYr.includes('-') && pYr.length === 4 && fYr.startsWith(pYr)) return true;
    if (pYr.includes('-') && fYr.length === 4 && pYr.startsWith(fYr)) return true;
    return false;
  };

  const filteredProducts = products.filter(p => {
    const matchYear = matchesYear(p.catalogYear || p.year, selectedYear);
    const matchesFeature = 
      selectedFeature === 'all' ? true :
      selectedFeature === 'lifesymbols' ? Boolean(p.lifesymbols) :
      selectedFeature === 'lifestories' ? Boolean(p.lifestories) :
      selectedFeature === 'dual' ? Boolean(p.dualDisposition || p.dual_disposition) :
      selectedFeature === 'oversize' ? Boolean(p.oversize) : true;
    const matchesSearch = !searchTerm ? true :
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.material && p.material.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.interior && p.interior.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchYear && matchesFeature && matchesSearch;
  });

  const handleSyncFromSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const res = await syncFromSupabase();
    setIsSyncing(false);
    setSyncStatus(res);
    if (res.success) {
      onDataChanged();
    }
  };

  // CSV Catalog Importer for new catalog years
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV file is empty or missing data rows.');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
        const newProducts: Product[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          const code = row['code'] || row['product_code'] || row['sku'] || `BV-${i}`;
          const name = row['name'] || row['description'] || `Casket ${code}`;
          const yr = row['year'] || row['catalog_year'] || '2026-27';
          const cat = row['category'] || 'Burial Solutions - Wood';
          const cost = Number(row['cost'] || row['wholesale'] || row['price']) || 1500;
          const msrp = Number(row['msrp'] || row['retail']) || Math.round(cost * 2.2);

          newProducts.push({
            id: `prod-${code}-${yr}`,
            code,
            name,
            catalogYear: yr,
            category: cat,
            material: row['material'] || 'Solid Hardwood / Steel',
            interior: row['interior'] || 'Rosetan Crepe',
            exteriorFinish: row['finish'] || row['exterior'] || 'Polished Finish',
            dimensions: '83.0" L x 28.5" W x 23.0" H',
            features: [
              'Living Memorial Program eligible',
              'Quality Batesville craft'
            ],
            wholesalePrice: cost,
            msrp,
            imageUrl: row['image'] || row['image_url'] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        await db.products.bulkPut(newProducts);
        onDataChanged();
        setSyncStatus({
          success: true,
          message: `Successfully imported ${newProducts.length} products from CSV into catalog database!`
        });
      } catch (err: any) {
        setSyncStatus({ success: false, message: err.message || 'Failed to parse CSV catalog file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Newspaper Section Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#fafcfa] border-y-4 border-double border-emerald-900 border-x border-slate-300 p-6 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-900 border border-emerald-950 text-emerald-100">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-900 font-bold block">
                § ARCHIVE SECTION • ANNUAL PUBLICATIONS
              </span>
              <h1 className="text-2xl font-serif font-black text-slate-950 tracking-wide uppercase">
                Catalogs by Year &amp; Product Editions
              </h1>
              <p className="text-xs sm:text-sm font-serif italic text-slate-600">
                Organize, compare, and browse catalog models, dimensions, specifications, and historical editions.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Admin Tools) */}
        {isLoggedIn && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Import Price List Button */}
            {onOpenPriceListImport && (
              <button
                onClick={onOpenPriceListImport}
                className="flex items-center space-x-2 bg-blue-900 hover:bg-blue-800 text-white font-serif font-bold uppercase tracking-wider px-4 py-2 border border-blue-950 shadow-xs transition-all cursor-pointer text-xs"
                title="Import PDF / Text Product Reference Guide into Products Table"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-200" />
                <span>Import Price Guide</span>
              </button>
            )}

            {/* Supabase Ingest Button */}
            <button
              onClick={handleSyncFromSupabase}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-serif font-bold uppercase tracking-wider px-4 py-2 border border-emerald-950 shadow-xs transition-all cursor-pointer text-xs"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-200 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Supabase...' : 'Sync Cloud Archive'}</span>
            </button>

            {/* Manage Images Shortcut */}
            <button
              onClick={onOpenImageManager}
              className="flex items-center space-x-2 bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-800 font-serif font-bold px-3.5 py-2 transition-colors cursor-pointer text-xs shadow-2xs"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Photo Archive</span>
            </button>

            {/* Manage Lithos Shortcut */}
            {onOpenLithoManager && (
              <button
                onClick={onOpenLithoManager}
                className="flex items-center space-x-2 bg-white hover:bg-blue-50 text-blue-950 border border-blue-800 font-serif font-bold px-3.5 py-2 transition-colors cursor-pointer text-xs shadow-2xs"
                title="Manage and upload authentic Batesville Litho cut sheets"
              >
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Litho Cut Sheets</span>
              </button>
            )}

            {/* CSV Import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCsvImport}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-700 font-serif font-bold px-3.5 py-2 transition-colors cursor-pointer text-xs shadow-2xs"
              title="Import a catalog year spreadsheet"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Import CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className={`p-4 flex items-center space-x-3 text-xs border-l-4 border font-serif shadow-xs ${
          syncStatus.success 
            ? 'bg-emerald-50 border-emerald-300 border-l-emerald-800 text-emerald-950 font-medium' 
            : 'bg-rose-50 border-rose-300 border-l-rose-700 text-rose-900'
        }`}>
          {syncStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* Year Edition Selector Pills (Newspaper Volume Tabs) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-300">
        <button
          onClick={() => handleSelectYear('all')}
          className={`px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
            selectedYear === 'all'
              ? 'bg-gradient-to-r from-emerald-800 to-blue-900 text-white border-emerald-950 shadow-xs'
              : 'bg-[#fafcfa] border-slate-300 text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          All Editions Combined ({products.length} Items)
        </button>

        {distinctYears.map((yr) => {
          const count = products.filter(p => matchesYear(p.catalogYear || p.year, yr)).length;
          const isSelected = selectedYear === yr || (selectedYear !== 'all' && matchesYear(yr, selectedYear));
          return (
            <button
              key={yr}
              onClick={() => handleSelectYear(yr)}
              className={`px-4 py-2 font-serif text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-800 to-blue-900 text-white border-emerald-950 shadow-xs'
                  : 'bg-[#fafcfa] border-slate-300 text-slate-700 hover:text-blue-900 hover:bg-blue-50'
              }`}
            >
              {yr} Edition ({count} models)
            </button>
          );
        })}
      </div>

      {/* Catalog Overview Metrics (Broadsheet Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#fafcfa] border border-slate-300 border-t-4 border-t-emerald-800 p-5 shadow-xs">
          <span className="text-xs font-serif font-bold text-emerald-900 uppercase tracking-widest block border-b border-dotted border-slate-300 pb-1 mb-2">
            Active Publication Edition
          </span>
          <div className="font-serif text-3xl font-black text-slate-950">
            {selectedYear === 'all' ? 'All Catalog Years' : `${selectedYear} Edition`}
          </div>
          <p className="text-xs font-serif italic text-slate-600 mt-1">
            {filteredProducts.length} total models indexed in ledger
          </p>
        </div>

        <div className="bg-[#fafcfa] border border-slate-300 border-t-4 border-t-blue-900 p-5 shadow-xs">
          <span className="text-xs font-serif font-bold text-blue-950 uppercase tracking-widest block border-b border-dotted border-slate-300 pb-1 mb-2">
            Indexed Volume Years
          </span>
          <div className="font-serif text-3xl font-black text-blue-900">
            {distinctYears.length} Editions
          </div>
          <p className="text-xs font-mono text-slate-600 mt-1 truncate">
            {distinctYears.join(' • ')}
          </p>
        </div>

        <div className="bg-[#fafcfa] border border-slate-300 border-t-4 border-t-emerald-700 p-5 shadow-xs">
          <span className="text-xs font-serif font-bold text-emerald-900 uppercase tracking-widest block border-b border-dotted border-slate-300 pb-1 mb-2">
            Average Wholesale Index
          </span>
          <div className="font-serif text-3xl font-black text-emerald-800">
            ${filteredProducts.length > 0 ? (filteredProducts.reduce((a, b) => a + (Number(b.price !== undefined && b.price !== null ? b.price : b.wholesalePrice) || 0), 0) / filteredProducts.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <p className="text-xs font-serif italic text-slate-600 mt-1">
            Per unit catalog wholesale baseline
          </p>
        </div>
      </div>

      {/* Product List for Selected Catalog Year */}
      <div className="bg-[#fafcfa] border-2 border-slate-400 overflow-hidden shadow-sm">
        <div className="p-5 border-b-2 border-double border-emerald-900 bg-[#f2f7f4] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-black text-slate-950 text-base uppercase tracking-wider">
              § Merchandise Ledger — {selectedYear === 'all' ? 'All Catalogs' : `${selectedYear} Edition`}
            </h3>
            <p className="text-xs font-serif italic text-slate-600">
              Caskets, urns, dimensions, and specifications indexed for this catalog edition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Filter by code, name, finish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white w-48"
            />

            {/* Feature Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
              <button
                onClick={() => setSelectedFeature('all')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'all' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFeature('lifesymbols')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'lifesymbols' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                LifeSymbols®
              </button>
              <button
                onClick={() => setSelectedFeature('lifestories')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'lifestories' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                LifeStories®
              </button>
              <button
                onClick={() => setSelectedFeature('dual')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'dual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dual Disp.
              </button>
              <button
                onClick={() => setSelectedFeature('oversize')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'oversize' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Oversize
              </button>
            </div>

            <span className="text-xs font-mono font-bold text-amber-700 pl-2">
              {filteredProducts.length} models
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Photo</th>
                <th className="py-3 px-4 font-semibold">SKU / Code</th>
                <th className="py-3 px-4 font-semibold">Casket Model</th>
                <th className="py-3 px-4 font-semibold">Features / Badges</th>
                <th className="py-3 px-4 font-semibold">Dimensions (Ext / Int)</th>
                <th className="py-3 px-4 font-semibold">Material & Finish</th>
                <th className="py-3 px-4 font-semibold">Interior Fabric</th>
                <th className="py-3 px-4 font-semibold">Cap / Top</th>
                <th className="py-3 px-4 font-semibold">Wholesale</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.slice(0, 100).map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-sm">
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-700">
                    {prod.code}
                  </td>
                  <td className="py-2.5 px-4 min-w-[240px] max-w-[360px]">
                    <div className="font-serif font-bold text-slate-900 text-sm leading-snug break-words" title={prod.name}>
                      {prod.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{prod.category}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[170px]">
                      {prod.lifesymbols && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                          LifeSymbols
                        </span>
                      )}
                      {prod.lifestories && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-semibold">
                          LifeStories
                        </span>
                      )}
                      {(prod.dualDisposition || prod.dual_disposition) && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold">
                          Dual Disp.
                        </span>
                      )}
                      {prod.oversize && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-semibold">
                          Oversize
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-700 text-[11px]">
                      {prod.extLength && prod.extWidth ? `${prod.extLength}"L × ${prod.extWidth}"W` : prod.dimensions}
                    </div>
                    {prod.intWidth && (
                      <div className="text-[10px] text-amber-700 font-mono font-semibold">
                        Int: {prod.intWidth}" W
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-[160px] truncate">
                    <div className="text-slate-800 font-medium">{prod.material}</div>
                    <div className="text-[10px] text-slate-500 italic truncate">{prod.finish || prod.exteriorFinish}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 max-w-[140px] truncate">
                    {prod.interior}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {prod.top || 'Half Couch'}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                    ${Number(prod.price !== undefined && prod.price !== null ? prod.price : prod.wholesalePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => isLoggedIn ? onSelectProductForCard(prod.id) : (onRequireLogin ? onRequireLogin() : onSelectProductForCard(prod.id))}
                      className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title={isLoggedIn ? "Create Showroom Price Card" : "Staff sign in required to generate price cards"}
                    >
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>Price Card</span>
                      {!isLoggedIn && <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-600" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
