import React, { useState, useRef } from 'react';
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
  Plus
} from 'lucide-react';

interface CatalogYearManagerProps {
  products: Product[];
  onSelectProductForCard: (productId: string) => void;
  onDataChanged: () => void;
  onOpenImageManager: () => void;
}

export const CatalogYearManager: React.FC<CatalogYearManagerProps> = ({
  products,
  onSelectProductForCard,
  onDataChanged,
  onOpenImageManager,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<'all' | 'lifesymbols' | 'lifestories' | 'dual' | 'oversize'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group products by Catalog Year
  const distinctYears = [...new Set(products.map(p => String(p.catalogYear)))].sort().reverse();
  const activeYear = selectedYear === 'all' ? (distinctYears[0] || '2025') : selectedYear;

  const filteredProducts = products.filter(p => {
    const matchesYear = selectedYear === 'all' || String(p.catalogYear) === selectedYear;
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
    return matchesYear && matchesFeature && matchesSearch;
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
          const yr = row['year'] || row['catalog_year'] || '2026';
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Catalogs by Year & Product Editions
              </h1>
              <p className="text-sm text-slate-400">
                Organize, import, and compare Batesville casket catalogs, pricing, and specs across years.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Supabase Ingest Button */}
          <button
            onClick={handleSyncFromSupabase}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Supabase...' : 'Sync Catalogs from Supabase'}</span>
          </button>

          {/* Manage Images Shortcut */}
          <button
            onClick={onOpenImageManager}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Casket Images</span>
          </button>

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
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
            title="Import a catalog year spreadsheet"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Catalog CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs border ${
          syncStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {syncStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* Year Edition Selector Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedYear('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedYear === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Years Combined ({products.length} Items)
        </button>

        {distinctYears.map((yr) => {
          const count = products.filter(p => String(p.catalogYear) === yr).length;
          return (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedYear === yr
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {yr} Catalog Edition ({count} models)
            </button>
          );
        })}
      </div>

      {/* Catalog Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Active Edition
          </span>
          <div className="font-serif text-3xl font-black text-white">
            {selectedYear === 'all' ? 'All Catalog Years' : `${selectedYear} Catalog`}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {filteredProducts.length} total models indexed
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Available Catalog Years
          </span>
          <div className="font-serif text-3xl font-black text-amber-300">
            {distinctYears.length} Years
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {distinctYears.join(' • ')}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Average Wholesale Base
          </span>
          <div className="font-serif text-3xl font-black text-emerald-400">
            ${filteredProducts.length > 0 ? Math.round(filteredProducts.reduce((a, b) => a + b.wholesalePrice, 0) / filteredProducts.length).toLocaleString() : 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Per unit catalog wholesale baseline
          </p>
        </div>
      </div>

      {/* Product List for Selected Catalog Year */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-white text-base">
              Merchandise in {selectedYear === 'all' ? 'All Catalogs' : `${selectedYear} Edition`}
            </h3>
            <p className="text-xs text-slate-400">
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
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48"
            />

            {/* Feature Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setSelectedFeature('all')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFeature('lifesymbols')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'lifesymbols' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                LifeSymbols®
              </button>
              <button
                onClick={() => setSelectedFeature('lifestories')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'lifestories' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                LifeStories®
              </button>
              <button
                onClick={() => setSelectedFeature('dual')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'dual' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dual Disp.
              </button>
              <button
                onClick={() => setSelectedFeature('oversize')}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedFeature === 'oversize' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Oversize
              </button>
            </div>

            <span className="text-xs font-mono text-amber-400 pl-2">
              {filteredProducts.length} models
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 backdrop-blur">
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
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredProducts.slice(0, 100).map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-700 bg-black/30 shrink-0">
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-300">
                    {prod.code}
                  </td>
                  <td className="py-2.5 px-4 min-w-[240px] max-w-[360px]">
                    <div className="font-serif font-bold text-white text-sm leading-snug break-words" title={prod.name}>
                      {prod.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{prod.category}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[170px]">
                      {prod.lifesymbols && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">
                          LifeSymbols
                        </span>
                      )}
                      {prod.lifestories && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-semibold">
                          LifeStories
                        </span>
                      )}
                      {(prod.dualDisposition || prod.dual_disposition) && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold">
                          Dual Disp.
                        </span>
                      )}
                      {prod.oversize && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-semibold">
                          Oversize
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-300 text-[11px]">
                      {prod.extLength && prod.extWidth ? `${prod.extLength}"L × ${prod.extWidth}"W` : prod.dimensions}
                    </div>
                    {prod.intWidth && (
                      <div className="text-[10px] text-amber-400/90 font-mono">
                        Int: {prod.intWidth}" W
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-[160px] truncate">
                    <div className="text-slate-200 font-medium">{prod.material}</div>
                    <div className="text-[10px] text-slate-400 italic truncate">{prod.finish || prod.exteriorFinish}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-[140px] truncate">
                    {prod.interior}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {prod.top || 'Half Couch'}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-emerald-400">
                    ${prod.wholesalePrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => onSelectProductForCard(prod.id)}
                      className="inline-flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>Price Card</span>
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
