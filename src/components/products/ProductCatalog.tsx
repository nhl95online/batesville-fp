import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import { ProductLithoModal } from './ProductLithoModal';
import { isUrnProduct } from '../../services/supabase';
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
  LayoutGrid 
} from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onSelectProductForCard: (productId: string) => void;
  onOpenImageManager?: () => void;
  onOpenPriceListImport?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onSelectProductForCard,
  onOpenImageManager,
  onOpenPriceListImport,
  selectedCategory: selectedCategoryProp,
  onCategoryChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryProp || 'all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [activeLithoProduct, setActiveLithoProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (selectedCategoryProp !== undefined && selectedCategoryProp !== selectedCategory) {
      setSelectedCategory(selectedCategoryProp);
    }
  }, [selectedCategoryProp]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    onCategoryChange?.(cat);
  };

  // Distinct categories & sorted years (most recent first)
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const availableYears = useMemo(() => {
    return Array.from(new Set(products.map(p => String(p.catalogYear)))).filter(Boolean).sort().reverse();
  }, [products]);

  // Default automatically to the most recent year
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const sorted = Array.from(new Set(products.map(p => String(p.catalogYear)))).filter(Boolean).sort().reverse();
    return sorted[0] || 'all';
  });

  const hasInitializedYear = useRef(false);

  useEffect(() => {
    if (!hasInitializedYear.current && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
      hasInitializedYear.current = true;
    }
  }, [availableYears]);

  const checkCategoryMatch = (p: Product, filterCat: string) => {
    if (filterCat === 'all') return true;
    const f = filterCat.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pMat = (p.material || '').toLowerCase();
    const pDesc = (p.description || '').toLowerCase();

    if (f === 'metal') {
      return pCat.includes('metal') || pMat.includes('steel') || pMat.includes('bronze') || pMat.includes('copper') || pDesc.includes('18 ga') || pDesc.includes('20 ga');
    }
    if (f === 'wood') {
      return pCat.includes('wood') || ['oak', 'pecan', 'cherry', 'mahogany', 'maple', 'poplar', 'pine', 'walnut'].some(m => pMat.includes(m) || pDesc.includes(m));
    }
    if (f === 'cloth') {
      return pCat.includes('cloth') || pCat.includes('newpointe') || pDesc.includes('cloth') || pDesc.includes('newpointe');
    }
    if (f === 'urns') {
      return isUrnProduct(p);
    }
    if (f === 'keepsakes') {
      return pCat.includes('keepsake') || pCat.includes('jewelry') || pDesc.includes('keepsake') || pDesc.includes('jewelry');
    }
    return p.category === filterCat || pCat.includes(f);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = checkCategoryMatch(p, selectedCategory);
    const matchesYear = selectedYear === 'all' || String(p.catalogYear) === selectedYear;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      String(p.product_code || '').toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.material && p.material.toLowerCase().includes(term)) ||
      (p.finish && p.finish.toLowerCase().includes(term)) ||
      (p.exteriorFinish && p.exteriorFinish.toLowerCase().includes(term)) ||
      (p.interior && p.interior.toLowerCase().includes(term));
    return matchesCategory && matchesYear && matchesSearch;
  });

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
                Batesville Merchandise & Product Catalog
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Full Supabase schema database with 19 columns, category filtering, lithos, and card generation.
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
              title="Table Grid View (Exact 19 Supabase Headers)"
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

          {/* Import Price List button */}
          {onOpenPriceListImport && (
            <button
              onClick={onOpenPriceListImport}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.01]"
              title="Import Batesville Price Guide / Reference List (PDF / Text)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Price List</span>
            </button>
          )}

          {/* Casket Images Studio button */}
          {onOpenImageManager && (
            <button
              onClick={onOpenImageManager}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <ImageIcon className="w-4 h-4 text-amber-600" />
              <span>Casket Images</span>
            </button>
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

      {/* Filter Row: Catalog Year & Category */}
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
                {idx === 0 ? `${y} Edition (Most Recent)` : `${y} Edition`}
              </option>
            ))}
            <option value="all">All Catalog Years ({products.length})</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => handleSelectCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[200px] cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500">
          Showing <strong className="text-slate-900">{filteredProducts.length}</strong> items
        </span>
      </div>

      {/* View Mode 1: Table Grid View with EXACT 19 Supabase Headers */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[750px] relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-xs">
                <tr>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">product_id</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">year</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap min-w-[140px]">category</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">product_code</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap min-w-[220px]">description</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap min-w-[130px]">interior</th>
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
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">discountinued</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">price</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap text-right sticky right-0 bg-slate-50 shadow-l">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
                {filteredProducts.map((p) => {
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
                      <td className="py-2.5 px-3 text-slate-400">
                        {p.productId || p.product_id || <span className="text-slate-300 font-sans italic text-[11px]">NULL</span>}
                      </td>

                      {/* 2. year */}
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[11px]">
                          {p.year || p.catalogYear || '—'}
                        </span>
                      </td>

                      {/* 3. category */}
                      <td className="py-2.5 px-3 font-sans">
                        <span className="text-slate-800 font-medium truncate block max-w-[160px]" title={p.category}>
                          {p.category}
                        </span>
                      </td>

                      {/* 4. product_code */}
                      <td className="py-2.5 px-3">
                        <span className="text-amber-700 font-bold font-mono">
                          {p.product_code || p.code}
                        </span>
                      </td>

                      {/* 5. description */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-7 h-7 object-contain bg-slate-50 border border-slate-200 rounded shrink-0"
                          />
                          <span 
                            className="font-serif font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate max-w-[220px]"
                            title={p.description || p.name}
                          >
                            {p.description || p.name}
                          </span>
                        </div>
                      </td>

                      {/* 6. interior */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasInterior ? (
                          <span className="text-slate-800 font-medium truncate block max-w-[130px]" title={p.interior!}>
                            {p.interior}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 7. order_qty */}
                      <td className="py-2.5 px-3">
                        {p.order_qty !== undefined && p.order_qty !== null ? (
                          p.order_qty
                        ) : p.orderQty !== undefined && p.orderQty !== null ? (
                          p.orderQty
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 8. accessories */}
                      <td className="py-2.5 px-3">
                        {p.accessories !== undefined && p.accessories !== null && String(p.accessories).trim() !== '' ? (
                          String(p.accessories)
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 9. lifeview */}
                      <td className="py-2.5 px-3">
                        {hasLifeview ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                            {typeof p.lifeview === 'string' ? p.lifeview : 'TRUE'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 10. dual_disposition */}
                      <td className="py-2.5 px-3">
                        {hasDual ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                            {typeof p.dual_disposition === 'string' ? p.dual_disposition : 'TRUE'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 11. top */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasTop ? (
                          <span className="text-slate-800 truncate block max-w-[110px]" title={p.top!}>
                            {p.top}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 12. finish */}
                      <td className="py-2.5 px-3 font-sans">
                        {hasFinish ? (
                          <span className="text-slate-800 font-medium truncate block max-w-[140px]" title={p.finish || p.exteriorFinish}>
                            {p.finish || p.exteriorFinish}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 13. oversize */}
                      <td className="py-2.5 px-3">
                        {hasOversize ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[10px]">
                            {typeof p.oversize === 'string' ? p.oversize : 'TRUE'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 14. ext_width */}
                      <td className="py-2.5 px-3">
                        {p.ext_width || p.extWidth ? `${p.ext_width || p.extWidth}"` : <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>}
                      </td>

                      {/* 15. ext_length */}
                      <td className="py-2.5 px-3">
                        {p.ext_length || p.extLength ? `${p.ext_length || p.extLength}"` : <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>}
                      </td>

                      {/* 16. int_width */}
                      <td className="py-2.5 px-3">
                        {p.int_width || p.intWidth ? (
                          <span className="text-amber-700 font-bold">{p.int_width || p.intWidth}"</span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 17. weight_capacity */}
                      <td className="py-2.5 px-3">
                        {p.weight_capacity || p.weightCapacity || p.capacity ? (
                          p.weight_capacity || p.weightCapacity || p.capacity
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 18. discountinued */}
                      <td className="py-2.5 px-3">
                        {hasDiscontinued ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            {typeof (p.discountinued || p.discontinued) === 'string' ? (p.discountinued || p.discontinued) : 'TRUE'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">NULL</span>
                        )}
                      </td>

                      {/* 19. price */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-emerald-700 font-mono">
                          ${Number(p.price || p.wholesalePrice || 0).toLocaleString()}
                        </span>
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
                            onClick={() => setActiveLithoProduct(p)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs"
                            title="Litho - Print 8.5x11 Showcase Litho Cut Sheet"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button
                            onClick={() => onSelectProductForCard(p.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-xs"
                            title="Card - Generate Showroom Price Card"
                          >
                            <Tag className="w-3.5 h-3.5 text-amber-600" />
                          </button>
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
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-amber-400 hover:shadow-md transition-all flex flex-col group shadow-xs"
            >
              {/* Image Container */}
              <div 
                className="relative h-48 sm:h-52 w-full bg-slate-50/70 overflow-hidden cursor-pointer flex items-center justify-center p-2.5 border-b border-slate-100"
                onClick={() => setActiveModalProduct(product)}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm border border-slate-200 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shadow-xs">
                  {product.product_code || product.code}
                </div>
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                  Year: {product.year || product.catalogYear}
                </div>
              </div>

              {/* Product Body */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase tracking-wider block truncate">
                    {product.category}
                  </span>
                  <h3 
                    onClick={() => setActiveModalProduct(product)}
                    className="font-serif text-sm sm:text-[15px] font-bold text-slate-900 group-hover:text-amber-700 transition-colors cursor-pointer leading-snug line-clamp-2 h-10 mt-0.5"
                    title={product.description || product.name}
                  >
                    {product.description || product.name}
                  </h3>
                  
                  {/* Exterior Finish - No forced fallback */}
                  {product.finish || product.exteriorFinish ? (
                    <p className="text-[11px] text-slate-500 italic mt-0.5 truncate" title={product.finish || product.exteriorFinish}>
                      {product.finish || product.exteriorFinish}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">
                      No finish specified
                    </p>
                  )}

                  {isUrnProduct(product) ? (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Material:</span>
                        <span className="text-slate-800 font-medium truncate max-w-[130px]">{product.material || 'Hardwood / Metal'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Capacity:</span>
                        <span className="text-amber-800 font-medium font-mono truncate max-w-[130px]">
                          {product.weight_capacity || product.capacity ? `${product.weight_capacity || product.capacity} cu. in.` : '200 cu. in.'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Material:</span>
                        <span className="text-slate-800 font-medium truncate max-w-[130px]">{product.material || 'Steel / Timber'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Interior:</span>
                        <span className="text-slate-800 font-medium truncate max-w-[130px]">
                          {product.interior ? product.interior : <span className="text-slate-400 italic font-normal">None / Unlined</span>}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing & Square Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider leading-none">Wholesale</span>
                    <span className="font-mono text-sm font-bold text-emerald-700 leading-tight">
                      ${Number(product.price || product.wholesalePrice || 0).toLocaleString()}
                    </span>
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
                      onClick={() => setActiveLithoProduct(product)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title="Litho - Print 8.5x11 Showcase Litho Cut Sheet"
                      aria-label="Print Litho"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                    </button>

                    <button
                      onClick={() => onSelectProductForCard(product.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 hover:border-amber-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title="Card - Generate Showroom Price Card"
                      aria-label="Generate Price Card"
                    >
                      <Tag className="w-4 h-4 text-amber-600" />
                    </button>
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
        />
      )}
    </div>
  );
};
