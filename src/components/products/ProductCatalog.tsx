import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import { ProductLithoModal } from './ProductLithoModal';
import { isUrnProduct, getLithoPublicUrl } from '../../services/supabase';
import { toggleProductDiscontinued } from '../../services/db';
import { 
  Search, 
  Tag, 
  Eye, 
  Layers, 
  Image as ImageIcon, 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  Table as TableIcon, 
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Ban,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Lock
} from 'lucide-react';

/**
 * Checks whether a product is discontinued
 */
export function isProductDiscontinued(p: Product): boolean {
  if (p.isActive === false) return true;
  const d = p.discontinued ?? p.discountinued;
  if (d === true) return true;
  if (typeof d === 'string') {
    const lower = d.trim().toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'discontinued';
  }
  return false;
}

interface ProductCatalogProps {
  products: Product[];
  onSelectProductForCard: (productId: string) => void;
  onOpenImageManager?: () => void;
  onOpenLithoManager?: () => void;
  onOpenPriceListImport?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  onProductUpdated?: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onSelectProductForCard,
  onOpenImageManager,
  onOpenLithoManager,
  onOpenPriceListImport,
  selectedCategory: selectedCategoryProp,
  onCategoryChange,
  onProductUpdated,
  isLoggedIn = false,
  onRequireLogin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryProp || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discontinued'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [activeLithoProduct, setActiveLithoProduct] = useState<Product | null>(null);

  // Local products cache to allow instantaneous UI toggle for Discontinued status
  const [localProducts, setLocalProducts] = useState<Product[]>(products);

  const lithoCount = useMemo(() => localProducts.filter(p => Boolean(p.lithoUrl)).length, [localProducts]);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const handleToggleDiscontinued = async (p: Product) => {
    const isCurrentlyDisc = isProductDiscontinued(p);
    const updated = await toggleProductDiscontinued(p.id, !isCurrentlyDisc);
    if (updated) {
      setLocalProducts(prev => prev.map(item => item.id === p.id ? { ...item, ...updated } : item));
      onProductUpdated?.();
    }
  };

  // Sorting state: Default to sorting by productId ascending (shows Caskets 1-180 first)
  const [sortField, setSortField] = useState<'productId' | 'year' | 'status' | 'category' | 'subcategory' | 'product_code' | 'description' | 'interior' | 'price'>('productId');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  useEffect(() => {
    if (selectedCategoryProp !== undefined && selectedCategoryProp !== selectedCategory) {
      setSelectedCategory(selectedCategoryProp);
    }
  }, [selectedCategoryProp]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    onCategoryChange?.(cat);
  };

  // Distinct categories & standard Batesville 2-year editions
  const baseCatalogYears = [
    '2026-27', 
    '2025-26', 
    '2024-25', 
    '2023-24', 
    '2022-23', 
    '2021-22', 
    '2020-21', 
    '2016-17'
  ];
  const categories = useMemo(() => {
    const raw = Array.from(new Set(localProducts.map(p => p.category))).filter(Boolean) as string[];
    return ['all', ...raw.sort()];
  }, [localProducts]);
  
  const availableYears = useMemo(() => {
    const rawYears = localProducts.map(p => String(p.catalogYear || p.year || '')).filter(Boolean);
    return Array.from(new Set([...baseCatalogYears, ...rawYears])).sort().reverse();
  }, [localProducts]);

  // Default automatically to 2026-27 (the current active Batesville catalog edition)
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');

  const matchesYear = (p: Product, filterYear: string) => {
    if (filterYear === 'all') return true;
    const pYr = String(p.catalogYear || p.year || '').trim();
    const fYr = filterYear.trim();
    if (pYr === fYr) return true;
    if (fYr.includes('-') && pYr.length === 4 && fYr.startsWith(pYr)) return true;
    if (pYr.includes('-') && fYr.length === 4 && pYr.startsWith(fYr)) return true;
    
    // Core ongoing catalog models are active across Batesville editions
    // If selecting an older edition like 2025-26, 2024-25, 2023-24, include existing catalog products
    if (fYr === '2026-27') {
      return pYr === '2026-27' || pYr === '2026' || pYr === '2025' || pYr === '2025-26' || !pYr;
    }
    if (fYr === '2025-26') {
      return pYr === '2025-26' || pYr === '2025' || pYr === '2026-27' || pYr === '2024-25';
    }
    if (fYr === '2024-25') {
      return pYr === '2024-25' || pYr === '2024' || pYr === '2025-26' || pYr === '2026-27';
    }
    if (fYr === '2023-24') {
      return pYr === '2023-24' || pYr === '2023' || pYr === '2024-25' || pYr === '2026-27';
    }
    return false;
  };

  const checkCategoryMatch = (p: Product, filterCat: string) => {
    if (!filterCat || filterCat === 'all') return true;
    if (p.category === filterCat) return true;
    const f = filterCat.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    if (pCat === f) return true;

    // Also support family navigation shortcuts if accessed from top bar
    const isUrn = isUrnProduct(p);
    if (f === 'caskets' || f === 'all_caskets') {
      return !isUrn && !pCat.includes('personalization');
    }
    if (f === 'metal') {
      return !isUrn && (pCat.includes('metal') || (p.subcategory || '').toLowerCase().includes('metal'));
    }
    if (f === 'wood') {
      return !isUrn && (pCat.includes('wood') || ['oak', 'pecan', 'cherry', 'mahogany', 'maple', 'poplar', 'pine', 'walnut'].some(m => (p.material || '').toLowerCase().includes(m)));
    }
    if (f === 'cloth') {
      return !isUrn && (pCat.includes('cloth') || pCat.includes('newpointe'));
    }
    if (f === 'cremation_caskets') {
      return !isUrn && (pCat.includes('cremation container') || pCat.includes('alternative container'));
    }
    if (f === 'urns') {
      return isUrn;
    }
    if (f === 'keepsakes') {
      return pCat.includes('keepsake') || pCat.includes('jewelry');
    }
    if (f === 'personalization') {
      return pCat.includes('personalization') || pCat.includes('lifesymbols') || pCat.includes('lifestories');
    }
    return pCat.includes(f);
  };

  // Status counts
  const activeCount = useMemo(() => localProducts.filter(p => !isProductDiscontinued(p)).length, [localProducts]);
  const discontinuedCount = useMemo(() => localProducts.filter(p => isProductDiscontinued(p)).length, [localProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return localProducts.filter((p) => {
      // Status filter
      if (statusFilter === 'active' && isProductDiscontinued(p)) return false;
      if (statusFilter === 'discontinued' && !isProductDiscontinued(p)) return false;

      // Category filter
      const matchesCategory = checkCategoryMatch(p, selectedCategory);
      if (!matchesCategory) return false;

      // Year filter
      const matchYear = matchesYear(p, selectedYear);
      if (!matchYear) return false;

      // Search term match
      const matchesSearch = 
        !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.product_code !== undefined && String(p.product_code).toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(term)) ||
        (p.material && p.material.toLowerCase().includes(term)) ||
        (p.finish && p.finish.toLowerCase().includes(term)) ||
        (p.exteriorFinish && p.exteriorFinish.toLowerCase().includes(term)) ||
        (p.interior && p.interior.toLowerCase().includes(term));
      return matchesSearch;
    });
  }, [localProducts, statusFilter, selectedCategory, selectedYear, searchTerm]);

  // Sort products: By default sorts by productId ascending (Caskets IDs 1-180 are displayed first!)
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortField === 'year') {
        const valA = String(a.catalogYear || a.year || '');
        const valB = String(b.catalogYear || b.year || '');
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'status') {
        const isDiscA = isProductDiscontinued(a);
        const isDiscB = isProductDiscontinued(b);
        return sortAsc ? (isDiscA === isDiscB ? 0 : isDiscA ? -1 : 1) : (isDiscA === isDiscB ? 0 : isDiscA ? 1 : -1);
      }
      if (sortField === 'category') {
        const valA = a.category || '';
        const valB = b.category || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'subcategory') {
        const valA = a.subcategory || '';
        const valB = b.subcategory || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'product_code') {
        const valA = String(a.product_code ?? a.code ?? '');
        const valB = String(b.product_code ?? b.code ?? '');
        return sortAsc ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      }
      if (sortField === 'description') {
        const valA = a.description || a.name || '';
        const valB = b.description || b.name || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'interior') {
        const valA = a.interior || '';
        const valB = b.interior || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'price') {
        const valA = Number(a.price ?? a.wholesalePrice ?? 0);
        const valB = Number(b.price ?? b.wholesalePrice ?? 0);
        return sortAsc ? valA - valB : valB - valA;
      }

      // Default: productId ascending
      const idA = a.productId ?? (a.product_id ? Number(a.product_id) : 99999);
      const idB = b.productId ?? (b.product_id ? Number(b.product_id) : 99999);
      return sortAsc ? idA - idB : idB - idA;
    });
  }, [filteredProducts, sortField, sortAsc]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                Merchandise & Product Catalog
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Comprehensive product specifications, dimensions, materials, and cut sheets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Buttons: Only shown when logged in */}
          {isLoggedIn && (
            <>
              {onOpenPriceListImport && (
                <button
                  onClick={onOpenPriceListImport}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.01]"
                  title="Import Product Price Guide / Reference List (PDF / Text)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import Price List</span>
                </button>
              )}

              {onOpenImageManager && (
                <button
                  onClick={onOpenImageManager}
                  className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Casket Images</span>
                </button>
              )}

              {onOpenLithoManager && (
                <button
                  onClick={onOpenLithoManager}
                  className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  title="Upload & Manage Litho Cut Sheets"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Litho Cut Sheets</span>
                  {lithoCount > 0 && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {lithoCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search code, name, finish, interior..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Filter Row: Catalog Year, Category & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-slate-500 font-medium">Catalog Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
          >
            {availableYears.map((y, idx) => (
              <option key={y} value={y}>
                {idx === 0 ? `${y} Edition (Current)` : `${y} Edition`}
              </option>
            ))}
            <option value="all">All Catalog Years ({localProducts.length})</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => handleSelectCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[320px] cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter (All, Active, Discontinued) */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Items ({localProducts.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Active ({activeCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('discontinued')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              statusFilter === 'discontinued'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Discontinued ({discontinuedCount})</span>
          </button>
        </div>

        <span className="text-slate-500">
          Showing <strong className="text-slate-900">{sortedProducts.length}</strong> items
        </span>
      </div>

      {/* View Mode 1: Table Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[750px] relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-xs">
                <tr>
                  <th 
                    onClick={() => handleSort('productId')}
                    className="py-3 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                    title="Sort by Product ID (Default catalog order: Caskets first)"
                  >
                    product_id
                    {sortField === 'productId' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('year')}
                    className="py-3 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    year
                    {sortField === 'year' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="py-3 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                    title="Sort by Active / Discontinued Status"
                  >
                    status
                    {sortField === 'status' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('category')}
                    className="py-3 px-3 font-semibold whitespace-nowrap min-w-[140px] cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    category
                    {sortField === 'category' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('subcategory')}
                    className="py-3 px-3 font-semibold whitespace-nowrap min-w-[130px] cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    subcategory
                    {sortField === 'subcategory' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('product_code')}
                    className="py-3 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    product_code
                    {sortField === 'product_code' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('description')}
                    className="py-3 px-3 font-semibold whitespace-nowrap min-w-[220px] cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    description
                    {sortField === 'description' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th 
                    onClick={() => handleSort('interior')}
                    className="py-3 px-3 font-semibold whitespace-nowrap min-w-[130px] cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    interior
                    {sortField === 'interior' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">order_qty</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">accessories</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">lifeview</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">dual_disposition</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap min-w-[110px]">top</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap min-w-[130px]">finish</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">oversize</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">ext_width</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">ext_length</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">int_width</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">weight_capacity</th>
                  <th 
                    onClick={() => handleSort('price')}
                    className="py-3 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none transition-colors group/th"
                  >
                    price
                    {sortField === 'price' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-amber-600 inline ml-1" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 opacity-0 group-hover/th:opacity-100" />}
                  </th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap text-right sticky right-0 bg-slate-50 shadow-l">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
                {sortedProducts.map((p) => {
                  const hasInterior = Boolean(p.interior && p.interior.trim());
                  const hasFinish = Boolean((p.finish && p.finish.trim()) || (p.exteriorFinish && p.exteriorFinish.trim()));
                  const hasTop = Boolean(p.top && p.top.trim());
                  const hasLifeview = Boolean(p.lifeview && p.lifeview !== 'FALSE' && p.lifeview !== 'false' && p.lifeview !== '0');
                  const hasDual = Boolean((p.dual_disposition && p.dual_disposition !== 'FALSE' && p.dual_disposition !== 'false' && p.dual_disposition !== '0') || p.dualDisposition);
                  const hasOversize = Boolean(p.oversize && p.oversize !== 'FALSE' && p.oversize !== 'false' && p.oversize !== '0');
                  const hasDiscontinued = Boolean(p.discountinued && p.discountinued !== 'FALSE' && p.discountinued !== 'false' && p.discountinued !== '0') ||
                                          Boolean(p.discontinued && p.discontinued !== 'FALSE' && p.discontinued !== 'false' && p.discontinued !== '0');

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-amber-50/50 transition-colors group cursor-pointer"
                      onClick={() => setActiveModalProduct(p)}
                    >
                      {/* 1. product_id */}
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {p.productId ?? p.product_id ?? ''}
                      </td>

                      {/* 2. year */}
                      <td className="py-2.5 px-3">
                        {p.year || p.catalogYear ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[11px]">
                            {p.year || p.catalogYear}
                          </span>
                        ) : ''}
                      </td>

                      {/* 3. status */}
                      <td className="py-2.5 px-3">
                        {isProductDiscontinued(p) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] tracking-wide uppercase border border-rose-200 shadow-xs">
                            <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                            Discontinued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200/60 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* 4. category */}
                      <td className="py-2.5 px-3 font-sans">
                        {p.category ? (
                          <span className="text-slate-800 font-medium truncate block max-w-[160px]" title={p.category}>
                            {p.category}
                          </span>
                        ) : ''}
                      </td>

                      {/* 5. subcategory */}
                      <td className="py-2.5 px-3 font-sans">
                        {p.subcategory ? (
                          <span className="text-slate-700 truncate block max-w-[140px]" title={p.subcategory}>
                            {p.subcategory}
                          </span>
                        ) : ''}
                      </td>

                      {/* 6. product_code */}
                      <td className="py-2.5 px-3">
                        {p.product_code || p.code ? (
                          <span className="text-amber-700 font-bold font-mono">
                            {p.product_code || p.code}
                          </span>
                        ) : ''}
                      </td>

                      {/* 7. description */}
                      <td className="py-2.5 px-3">
                        {p.description || p.name ? (
                          <div className="flex items-center space-x-2">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="w-7 h-7 object-contain bg-slate-50 border border-slate-200 rounded shrink-0"
                              />
                            ) : null}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isProductDiscontinued(p) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-xs">
                                  <Ban className="w-2.5 h-2.5" />
                                  DISCONTINUED
                                </span>
                              )}
                              <span 
                                className={`font-serif font-bold transition-colors truncate max-w-[220px] ${
                                  isProductDiscontinued(p) 
                                    ? 'text-slate-500 line-through decoration-rose-400 group-hover:text-rose-700' 
                                    : 'text-slate-900 group-hover:text-amber-700'
                                }`}
                                title={p.description || p.name}
                              >
                                {p.description || p.name}
                              </span>
                            </div>
                          </div>
                        ) : ''}
                      </td>

                      {/* 8. interior */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasInterior ? (
                          <span className="text-slate-800 font-medium truncate block max-w-[130px]" title={p.interior!}>
                            {p.interior}
                          </span>
                        ) : ''}
                      </td>

                      {/* 9. order_qty */}
                      <td className="py-2.5 px-3">
                        {p.order_qty !== undefined && p.order_qty !== null ? p.order_qty : (p.orderQty !== undefined && p.orderQty !== null ? p.orderQty : '')}
                      </td>

                      {/* 10. accessories */}
                      <td className="py-2.5 px-3">
                        {p.accessories !== undefined && p.accessories !== null && String(p.accessories).trim() !== '' ? String(p.accessories) : ''}
                      </td>

                      {/* 11. lifeview */}
                      <td className="py-2.5 px-3">
                        {hasLifeview ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                            {typeof p.lifeview === 'string' ? p.lifeview : 'TRUE'}
                          </span>
                        ) : ''}
                      </td>

                      {/* 12. dual_disposition */}
                      <td className="py-2.5 px-3">
                        {hasDual ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                            {typeof p.dual_disposition === 'string' ? p.dual_disposition : 'TRUE'}
                          </span>
                        ) : ''}
                      </td>

                      {/* 13. top */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasTop ? (
                          <span className="text-slate-800 truncate block max-w-[110px]" title={p.top!}>
                            {p.top}
                          </span>
                        ) : ''}
                      </td>

                      {/* 14. finish */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasFinish ? (
                          <span className="text-slate-800 font-medium truncate block max-w-[140px]" title={p.finish || p.exteriorFinish}>
                            {p.finish || p.exteriorFinish}
                          </span>
                        ) : ''}
                      </td>

                      {/* 15. oversize */}
                      <td className="py-2.5 px-3">
                        {hasOversize ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[10px]">
                            {typeof p.oversize === 'string' ? p.oversize : 'TRUE'}
                          </span>
                        ) : ''}
                      </td>

                      {/* 16. ext_width */}
                      <td className="py-2.5 px-3">
                        {(p.ext_width || p.extWidth) ? `${p.ext_width || p.extWidth}"` : ''}
                      </td>

                      {/* 17. ext_length */}
                      <td className="py-2.5 px-3">
                        {(p.ext_length || p.extLength) ? `${p.ext_length || p.extLength}"` : ''}
                      </td>

                      {/* 18. int_width */}
                      <td className="py-2.5 px-3">
                        {(p.int_width || p.intWidth) ? (
                          <span className="text-amber-700 font-bold">{p.int_width || p.intWidth}"</span>
                        ) : ''}
                      </td>

                      {/* 19. weight_capacity */}
                      <td className="py-2.5 px-3">
                        {(p.weight_capacity || p.weightCapacity || p.capacity) ? (p.weight_capacity || p.weightCapacity || p.capacity) : ''}
                      </td>

                      {/* 20. price */}
                      <td className="py-2.5 px-3">
                        {(p.price || p.wholesalePrice) ? (
                          <span className="font-bold text-emerald-700 font-mono">
                            ${Number(p.price || p.wholesalePrice).toLocaleString()}
                          </span>
                        ) : ''}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right sticky right-0 bg-white group-hover:bg-amber-50/50 shadow-l" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1 shrink-0">
                          <button
                            onClick={() => setActiveModalProduct(p)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
                            title="Specs - View Details & Historical Sales"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActiveLithoProduct({
                              ...p,
                              lithoUrl: p.lithoUrl || (p.code ? getLithoPublicUrl(p.code) : undefined)
                            })}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              p.lithoUrl 
                                ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 ring-1 ring-emerald-500/60' 
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                            title={p.lithoUrl ? "Official Batesville Litho Available (Click to view / download)" : "Litho - Print 8.5x11 Showcase Litho Cut Sheet"}
                          >
                            <Printer className={`w-3.5 h-3.5 ${p.lithoUrl ? 'text-emerald-400' : 'text-amber-400'}`} />
                          </button>
                          <button
                            onClick={() => isLoggedIn ? onSelectProductForCard(p.id) : (onRequireLogin ? onRequireLogin() : onSelectProductForCard(p.id))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-xs relative"
                            title={isLoggedIn ? "Card - Generate Showroom Price Card" : "Staff sign in required to generate price cards"}
                          >
                            <Tag className="w-3.5 h-3.5 text-amber-600" />
                            {!isLoggedIn && (
                              <Lock className="w-2 h-2 text-amber-700 absolute bottom-0.5 right-0.5" />
                            )}
                          </button>
                          {isLoggedIn && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDiscontinued(p);
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
                                isProductDiscontinued(p)
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 hover:text-rose-600'
                              }`}
                              title={isProductDiscontinued(p) ? 'Mark as Active' : 'Mark as Discontinued'}
                              aria-label={isProductDiscontinued(p) ? 'Mark as Active' : 'Mark as Discontinued'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode 2: Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-amber-400 hover:shadow-md transition-all flex flex-col group shadow-xs"
            >
              {/* Image Container */}
              <div 
                className="relative h-48 sm:h-52 w-full bg-slate-50/70 overflow-hidden cursor-pointer flex items-center justify-center p-2.5 border-b border-slate-100"
                onClick={() => setActiveModalProduct(product)}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name || ''}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                {isProductDiscontinued(product) ? (
                  <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 z-10 border border-rose-700">
                    <Ban className="w-3 h-3" />
                    DISCONTINUED
                  </div>
                ) : (product.product_code || product.code) ? (
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm border border-slate-200 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shadow-xs">
                    {product.product_code || product.code}
                  </div>
                ) : null}
                {isProductDiscontinued(product) && (product.product_code || product.code) && (
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs">
                    {product.product_code || product.code}
                  </div>
                )}
                {(product.year || product.catalogYear) && (
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                    Year: {product.year || product.catalogYear}
                  </div>
                )}
                {product.lithoUrl && (
                  <div className="absolute bottom-2 right-2 bg-emerald-900/90 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 border border-emerald-500/40 backdrop-blur-xs">
                    <FileText className="w-2.5 h-2.5" />
                    <span>Litho</span>
                  </div>
                )}
              </div>

              {/* Product Body */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    {product.category && (
                      <span className="text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase tracking-wider block truncate">
                        {product.category}
                      </span>
                    )}
                    {product.subcategory && (
                      <span className="text-[9px] text-slate-500 font-medium truncate">
                        {product.subcategory}
                      </span>
                    )}
                  </div>
                  
                  <h3 
                    onClick={() => setActiveModalProduct(product)}
                    className={`font-serif text-sm sm:text-[15px] font-bold transition-colors cursor-pointer leading-snug line-clamp-2 h-10 mt-0.5 ${
                      isProductDiscontinued(product)
                        ? 'text-slate-500 line-through decoration-rose-400 group-hover:text-rose-700'
                        : 'text-slate-900 group-hover:text-amber-700'
                    }`}
                    title={product.description || product.name}
                  >
                    {product.description || product.name}
                  </h3>
                  
                  {/* Exterior Finish - No forced fallback */}
                  {(product.finish || product.exteriorFinish) && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5 truncate" title={product.finish || product.exteriorFinish}>
                      {product.finish || product.exteriorFinish}
                    </p>
                  )}

                  {isUrnProduct(product) ? (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                      {product.material && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Material:</span>
                          <span className="text-slate-800 font-medium truncate max-w-[130px]">{product.material}</span>
                        </div>
                      )}
                      {(product.weight_capacity || product.capacity) && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Capacity:</span>
                          <span className="text-amber-800 font-medium font-mono truncate max-w-[130px]">
                            {product.weight_capacity || product.capacity} cu. in.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                      {product.material && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Material:</span>
                          <span className="text-slate-800 font-medium truncate max-w-[130px]">{product.material}</span>
                        </div>
                      )}
                      {product.interior && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Interior:</span>
                          <span className="text-slate-800 font-medium truncate max-w-[130px]">{product.interior}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing & Square Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {(product.price || product.wholesalePrice) ? (
                      <>
                        <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider leading-none">Wholesale</span>
                        <span className="font-mono text-sm font-bold text-emerald-700 leading-tight">
                          ${Number(product.price || product.wholesalePrice).toLocaleString()}
                        </span>
                      </>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => setActiveModalProduct(product)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title="Specs - View Details & Historical Sales"
                      aria-label="View Specs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setActiveLithoProduct({
                        ...product,
                        lithoUrl: product.lithoUrl || (product.code ? getLithoPublicUrl(product.code) : undefined)
                      })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
                        product.lithoUrl 
                          ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 ring-1 ring-emerald-500/60' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                      title={product.lithoUrl ? "Official Batesville Litho Available (Click to view / download)" : "Litho - Print 8.5x11 Showcase Litho Cut Sheet"}
                      aria-label="Print Litho"
                    >
                      <Printer className={`w-4 h-4 ${product.lithoUrl ? 'text-emerald-400' : 'text-amber-400'}`} />
                    </button>

                    <button
                      onClick={() => isLoggedIn ? onSelectProductForCard(product.id) : (onRequireLogin ? onRequireLogin() : onSelectProductForCard(product.id))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 hover:border-amber-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 relative"
                      title={isLoggedIn ? "Card - Generate Showroom Price Card" : "Staff sign in required to generate price cards"}
                      aria-label="Generate Price Card"
                    >
                      <Tag className="w-4 h-4 text-amber-600" />
                      {!isLoggedIn && (
                        <Lock className="w-2.5 h-2.5 text-amber-700 absolute bottom-0.5 right-0.5" />
                      )}
                    </button>

                    {isLoggedIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDiscontinued(product);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
                          isProductDiscontinued(product)
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 hover:text-rose-600'
                        }`}
                        title={isProductDiscontinued(product) ? 'Mark as Active' : 'Mark as Discontinued'}
                        aria-label={isProductDiscontinued(product) ? 'Mark as Active' : 'Mark as Discontinued'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details & YoY Performance Modal */}
      {activeModalProduct && (
        <ProductDetailModal
          product={activeModalProduct}
          onClose={() => setActiveModalProduct(null)}
          onCreatePriceCard={(id) => onSelectProductForCard(id)}
          onOpenLitho={(p) => setActiveLithoProduct(p)}
        />
      )}

      {/* Product Litho / Cut Sheet Showcase Modal */}
      {activeLithoProduct && (
        <ProductLithoModal
          product={activeLithoProduct}
          isOpen={Boolean(activeLithoProduct)}
          onClose={() => setActiveLithoProduct(null)}
          onProductUpdated={onProductUpdated}
        />
      )}
    </div>
  );
};
