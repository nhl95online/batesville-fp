import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductCategory } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import { Search, Tag, Eye, Layers, Image as ImageIcon, Calendar } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onSelectProductForCard: (productId: string) => void;
  onOpenImageManager?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onSelectProductForCard,
  onOpenImageManager,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

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

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || String(p.catalogYear) === selectedYear;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.material && p.material.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.exteriorFinish && p.exteriorFinish.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesYear && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Batesville Merchandise & Product Catalog
              </h1>
              <p className="text-sm text-slate-400">
                Browse caskets, urns, and memorials across catalog years, view specifications, and attach photos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Casket Images Studio button */}
          {onOpenImageManager && (
            <button
              onClick={onOpenImageManager}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Casket Images</span>
            </button>
          )}

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search model, name, finish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Row: Catalog Year & Category */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium">Catalog Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
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
          <span className="text-slate-400 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 max-w-[200px]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-400">
          Showing <strong className="text-white">{filteredProducts.length}</strong> items
        </span>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
          >
            {/* Image Container */}
            <div 
              className="relative h-52 w-full bg-slate-950 overflow-hidden cursor-pointer"
              onClick={() => setActiveModalProduct(product)}
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-amber-300 text-[11px] font-mono px-2.5 py-0.5 rounded-md">
                {product.code}
              </div>
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-slate-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">
                Year: {product.catalogYear}
              </div>
            </div>

            {/* Product Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                  {product.category}
                </span>
                <h3 
                  onClick={() => setActiveModalProduct(product)}
                  className="font-serif text-xl font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer leading-snug mt-0.5"
                >
                  {product.name}
                </h3>
                <p className="text-xs text-slate-400 italic mt-1 truncate">
                  {product.exteriorFinish}
                </p>

                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[170px]">{product.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interior:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[170px]">{product.interior}</span>
                  </div>
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Wholesale Cost</span>
                    <span className="font-mono text-sm font-semibold text-emerald-400">
                      ${product.wholesalePrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setActiveModalProduct(product)}
                    className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Specs & YoY</span>
                  </button>

                  <button
                    onClick={() => onSelectProductForCard(product.id)}
                    className="flex items-center justify-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Price Card</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Details & YoY Performance Modal */}
      {activeModalProduct && (
        <ProductDetailModal
          product={activeModalProduct}
          onClose={() => setActiveModalProduct(null)}
          onCreatePriceCard={(id) => onSelectProductForCard(id)}
        />
      )}
    </div>
  );
};
