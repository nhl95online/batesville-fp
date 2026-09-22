import React, { useState, useEffect } from 'react';
import { Customer, Product } from './types';
import { db, initializeDatabase } from './services/db';
import { Navbar } from './components/layout/Navbar';
import { PriceCardStudio } from './components/price-cards/PriceCardStudio';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { CustomerList } from './components/customers/CustomerList';
import { ProductCatalog } from './components/products/ProductCatalog';
import { CatalogYearManager } from './components/catalogs/CatalogYearManager';
import { CasketImageManagerModal } from './components/catalogs/CasketImageManagerModal';
import { DailySalesUploadModal } from './components/sales/DailySalesUploadModal';
import { syncFromSupabase } from './services/supabase';
import { Tag, BarChart3, Building2, Layers, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'cards' | 'sales' | 'customers' | 'products' | 'catalogs'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<{ customers: number; products: number; sales: number }>({
    customers: 0,
    products: 0,
    sales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Pre-selected IDs when transitioning from Customers or Products into PriceCardStudio
  const [targetCustomerId, setTargetCustomerId] = useState<string | undefined>(undefined);
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);

  // Modals
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSalesUploadModalOpen, setIsSalesUploadModalOpen] = useState(false);

  // Automatic background update function
  const runAutoSync = async () => {
    try {
      setIsAutoSyncing(true);
      const res = await syncFromSupabase();
      if (res.success) {
        const freshCustomers = await db.customers.toArray();
        const freshProducts = await db.products.toArray();
        const freshSalesCount = await db.sales.count();
        setCustomers(freshCustomers);
        setProducts(freshProducts);
        setCounts({
          customers: freshCustomers.length,
          products: freshProducts.length,
          sales: freshSalesCount,
        });
      }
    } catch (err) {
      console.warn('[Auto-Sync] Background update error:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      await initializeDatabase();
      let allCustomers = await db.customers.toArray();
      let allProducts = await db.products.toArray();
      let salesCount = await db.sales.count();

      // If local DB has no customers yet, wait for initial sync
      if (allCustomers.length === 0) {
        setIsAutoSyncing(true);
        const res = await syncFromSupabase();
        if (res.success) {
          allCustomers = await db.customers.toArray();
          allProducts = await db.products.toArray();
          salesCount = await db.sales.count();
        }
        setIsAutoSyncing(false);
      } else {
        // If data is already cached locally, display immediately and trigger silent background auto-update
        runAutoSync();
      }

      setCustomers(allCustomers);
      setProducts(allProducts);
      setCounts({
        customers: allCustomers.length,
        products: allProducts.length,
        sales: salesCount,
      });
    } catch (err) {
      console.error('Failed to load database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Automatically check and pull updates from Supabase every 3 minutes
    const autoSyncInterval = setInterval(() => {
      runAutoSync();
    }, 3 * 60 * 1000);

    return () => clearInterval(autoSyncInterval);
  }, []);

  const handleSelectProductForCard = (productId: string) => {
    setTargetProductId(productId);
    setActiveTab('cards');
  };

  const handleSelectCustomerForCard = (customerId: string) => {
    setTargetCustomerId(customerId);
    setActiveTab('cards');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121820] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-bold text-white tracking-wide">BATESVILLE<span className="text-amber-400">-FP</span></h2>
        <p className="text-sm text-slate-400 mt-1">Connecting to Batesville Cloud Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121820] text-slate-200 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      
      {/* Top Navigation */}
      <Navbar
        isAutoSyncing={isAutoSyncing}
        onOpenSalesUpload={() => setIsSalesUploadModalOpen(true)}
      />

      {/* Main Tab Navigation Bar */}
      <div className="no-print bg-[#161e2a]/95 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto py-2">
          
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={() => setActiveTab('catalogs')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'catalogs'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Catalogs by Year</span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Price Card Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Sales (Monthly & YoY)</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Customers ({counts.customers})</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Products ({counts.products})</span>
            </button>
          </div>

          {/* Quick Action: Casket Images Studio */}
          <div className="pl-3 shrink-0">
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400/50 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Casket Images</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalogs' && (
          <CatalogYearManager
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onDataChanged={loadData}
            onOpenImageManager={() => setIsImageModalOpen(true)}
          />
        )}

        {activeTab === 'cards' && (
          <PriceCardStudio
            customers={customers}
            products={products}
            initialCustomerId={targetCustomerId}
            initialProductId={targetProductId}
          />
        )}

        {activeTab === 'sales' && (
          <SalesDashboard
            customers={customers}
            products={products}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerList
            customers={customers}
            onSelectCustomerForCard={handleSelectCustomerForCard}
          />
        )}

        {activeTab === 'products' && (
          <ProductCatalog
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onOpenImageManager={() => setIsImageModalOpen(true)}
          />
        )}
      </main>

      {/* Casket Image Storage & Custom Matching Modal */}
      <CasketImageManagerModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        products={products}
        onImagesUpdated={loadData}
      />

      {/* Daily Sales PDF Upload Modal */}
      {isSalesUploadModalOpen && (
        <DailySalesUploadModal
          isOpen={isSalesUploadModalOpen}
          onClose={() => setIsSalesUploadModalOpen(false)}
          customers={customers}
          products={products}
          onSalesAdded={() => {
            loadData();
          }}
        />
      )}

    </div>
  );
}

export default App;
