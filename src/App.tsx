import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, CardDimension, RoomShape } from './types';
import { db, initializeDatabase } from './services/db';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './components/home/LandingPage';
import { PriceCardStudio } from './components/price-cards/PriceCardStudio';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { CustomerList } from './components/customers/CustomerList';
import { ProductCatalog } from './components/products/ProductCatalog';
import { CatalogYearManager } from './components/catalogs/CatalogYearManager';
import { CasketImageManagerModal } from './components/catalogs/CasketImageManagerModal';
import { DailySalesUploadModal } from './components/sales/DailySalesUploadModal';
import { PriceListImportModal } from './components/products/PriceListImportModal';
import { ShowroomFloorPlan } from './components/floorplan/ShowroomFloorPlan';
import { syncFromSupabase } from './services/supabase';
import { 
  Home, 
  Tag, 
  BarChart3, 
  Building2, 
  Layers, 
  Calendar, 
  Image as ImageIcon, 
  Loader2, 
  LayoutGrid,
  ChevronDown
} from 'lucide-react';

interface SubpageItem {
  id: string;
  label: string;
  badge?: string | number;
  description?: string;
  action?: () => void;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans'>('home');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<{ customers: number; products: number; sales: number }>({
    customers: 0,
    products: 0,
    sales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Subpage states for each major section
  const [catalogSubpage, setCatalogSubpage] = useState<string>('all');
  const [productSubpage, setProductSubpage] = useState<string>('all');
  const [customerSubpage, setCustomerSubpage] = useState<string>('all');
  const [cardSubpage, setCardSubpage] = useState<CardDimension>('6x6');
  const [salesSubpage, setSalesSubpage] = useState<'analytics' | 'units' | 'table'>('analytics');
  const [floorplanSubpage, setFloorplanSubpage] = useState<RoomShape>('rectangle');
  const [homeSubpage, setHomeSubpage] = useState<string>('overview');

  // Navigation dropdown popover state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Pre-selected IDs when transitioning into PriceCardStudio or ShowroomFloorPlan
  const [targetCustomerId, setTargetCustomerId] = useState<string | undefined>(undefined);
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);
  const [targetFloorPlanCustomerId, setTargetFloorPlanCustomerId] = useState<string | undefined>(undefined);

  // Modals
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSalesUploadModalOpen, setIsSalesUploadModalOpen] = useState(false);
  const [isPriceListImportOpen, setIsPriceListImportOpen] = useState(false);

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

  // Distinct Catalog Years dynamically computed from products + standard editions
  const catalogYears = useMemo(() => {
    const baseYears = ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2016-17'];
    const productYears = Array.from(new Set(products.map(p => String(p.catalogYear || '')).filter(Boolean)));
    return Array.from(new Set([...productYears, ...baseYears])).sort().reverse();
  }, [products]);

  const getCatalogYearCount = (yr: string) => {
    if (yr === 'all') return products.length;
    return products.filter(p => {
      const pYr = String(p.catalogYear || '').trim();
      if (pYr === yr) return true;
      if (yr.includes('-') && pYr.length === 4 && yr.startsWith(pYr)) return true;
      if (pYr.includes('-') && yr.length === 4 && pYr.startsWith(yr)) return true;
      return false;
    }).length;
  };

  // Subpages Definitions for Each Section
  const catalogSubpages: SubpageItem[] = useMemo(() => [
    { id: 'all', label: 'All Catalog Years', badge: products.length, description: 'All indexed catalog products combined' },
    ...catalogYears.map(yr => ({
      id: yr,
      label: `${yr} Edition`,
      badge: getCatalogYearCount(yr),
      description: `Batesville ${yr} Catalog specs & pricing`
    }))
  ], [products, catalogYears]);

  const productSubpages: SubpageItem[] = useMemo(() => [
    { id: 'all', label: 'All Products', badge: products.length, description: 'Complete Batesville product catalog' },
    { id: 'metal', label: 'Metal Caskets', description: '18g, 20g, Bronze & Stainless' },
    { id: 'wood', label: 'Hardwood Caskets', description: 'Cherry, Oak, Pecan, Mahogany & Maple' },
    { id: 'cloth', label: 'Cloth & NewPointe', description: 'NewPointe and cloth-covered caskets' },
    { id: 'urns', label: 'Urns & Cremation', description: 'Full size urns, vaults, cremation containers' },
    { id: 'keepsakes', label: 'Keepsakes & Jewelry', description: 'Remembrance keepsakes & jewelry' },
  ], [products]);

  const customerSubpages: SubpageItem[] = useMemo(() => [
    { id: 'all', label: 'All Accounts', badge: customers.length, description: 'All partner accounts' },
    { id: 'ARB', label: 'ARB Program', description: 'Batesville ARB partner accounts' },
    { id: 'PLN', label: 'PLN Program', description: 'Batesville PLN partner accounts' },
    { id: 'AMP', label: 'AMP Program', description: 'Batesville AMP partner accounts' },
    { id: 'SPP', label: 'SPP Program', description: 'Batesville SPP partner accounts' },
    { id: 'PA', label: 'PA Program', description: 'Batesville PA partner accounts' },
    { id: 'selection-rooms', label: 'Selection Rooms', badge: customers.filter(c => c.selectionRoom).length, description: 'Active showroom accounts' },
  ], [customers]);

  const cardSubpages: SubpageItem[] = useMemo(() => [
    { id: '6x6', label: '6" x 6" Cap Cards', description: 'Standard showroom casket cap cards' },
    { id: '2x12', label: '2" x 12" Urn Rails', description: 'Shelf rail strips for cremation urns' },
    { id: '8.5x11', label: '8.5" x 11" Full Sheet', description: 'Letter size cap cards / display sheets' },
    { id: '11x17', label: '11" x 17" Posters', description: 'Large format showroom display posters' },
  ], []);

  const salesSubpages: SubpageItem[] = useMemo(() => [
    { id: 'analytics', label: 'Executive Analytics', description: 'Year-over-Year revenue trends & comparison' },
    { id: 'units', label: 'Unit Volume & Share', description: 'Units sold & market share metrics' },
    { id: 'table', label: 'Sales Ledger Table', description: 'Detailed individual sales transactions' },
    { id: 'import-sales', label: 'Import Daily PDF', description: 'Upload Batesville daily PDF sales reports', action: () => setIsSalesUploadModalOpen(true) },
  ], []);

  const floorplanSubpages: SubpageItem[] = useMemo(() => [
    { id: 'interactive', label: 'Showroom Studio', description: 'Visual showroom builder & slot layout' },
    { id: 'rectangle', label: 'Rectangle Room', description: 'Standard rectangular showroom layout' },
    { id: 'l-shaped', label: 'L-Shaped Room', description: 'L-Shaped showroom layout' },
    { id: 'square', label: 'Square Room', description: 'Square showroom layout' },
    { id: 'oval', label: 'Oval Room', description: 'Curved / oval showroom layout' },
  ], []);

  const homeSubpages: SubpageItem[] = useMemo(() => [
    { id: 'overview', label: 'Executive Overview', description: 'KPI metrics, natural language Q&A' },
    { id: 'share', label: 'Market Share vs 12M', description: '% Market share vs Rolling 12M line trend' },
    { id: 'variance', label: 'Program Variance', description: 'YTD variance % by quarter and program' },
    { id: 'segments', label: 'Segment Breakdown', description: 'Total units by material & treemap matrix' },
  ], []);

interface NavTabItem {
  id: 'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  subpages: SubpageItem[];
}

  // Main Navigation Tabs
  const navTabs: NavTabItem[] = [
    { id: 'home', label: 'Executive Home', icon: Home, subpages: homeSubpages },
    { id: 'catalogs', label: 'Catalogs by Year', icon: Calendar, badge: catalogSubpage !== 'all' ? catalogSubpage : undefined, subpages: catalogSubpages },
    { id: 'cards', label: 'Price Card Studio', icon: Tag, badge: cardSubpage, subpages: cardSubpages },
    { id: 'sales', label: 'Sales (Monthly & YoY)', icon: BarChart3, subpages: salesSubpages },
    { id: 'customers', label: `Customers (${counts.customers})`, icon: Building2, subpages: customerSubpages },
    { id: 'products', label: `All Products (${counts.products})`, icon: Layers, subpages: productSubpages },
    { id: 'floorplans', label: 'Showroom Floor Plans', icon: LayoutGrid, subpages: floorplanSubpages },
  ];

  // Unified Navigation Handler supporting Tab + Subpage
  const handleNavigate = (tab: typeof activeTab, subpageId?: string) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    if (!subpageId) return;

    if (tab === 'catalogs') {
      setCatalogSubpage(subpageId);
    } else if (tab === 'products') {
      setProductSubpage(subpageId);
    } else if (tab === 'customers') {
      setCustomerSubpage(subpageId);
    } else if (tab === 'cards') {
      setCardSubpage(subpageId as CardDimension);
    } else if (tab === 'sales') {
      if (subpageId === 'import-sales') {
        setIsSalesUploadModalOpen(true);
      } else {
        setSalesSubpage(subpageId as 'analytics' | 'units' | 'table');
      }
    } else if (tab === 'floorplans') {
      if (subpageId !== 'interactive') {
        setFloorplanSubpage(subpageId as RoomShape);
      }
    } else if (tab === 'home') {
      setHomeSubpage(subpageId);
    }
  };

  const handleSelectProductForCard = (productId: string) => {
    setTargetProductId(productId);
    setActiveTab('cards');
  };

  const handleSelectCustomerForCard = (customerId: string) => {
    setTargetCustomerId(customerId);
    setActiveTab('cards');
  };

  const handleOpenFloorPlan = (customerId: string) => {
    setTargetFloorPlanCustomerId(customerId);
    setActiveTab('floorplans');
  };

  // Determine current active subpages for the Ribbon
  const currentSubpages = useMemo(() => {
    switch (activeTab) {
      case 'catalogs': return catalogSubpages;
      case 'products': return productSubpages;
      case 'customers': return customerSubpages;
      case 'cards': return cardSubpages;
      case 'sales': return salesSubpages;
      case 'floorplans': return floorplanSubpages;
      case 'home': return homeSubpages;
      default: return [];
    }
  }, [activeTab, catalogSubpages, productSubpages, customerSubpages, cardSubpages, salesSubpages, floorplanSubpages, homeSubpages]);

  const currentSubpageTitle = useMemo(() => {
    switch (activeTab) {
      case 'catalogs': return 'Catalog Editions';
      case 'products': return 'Product Categories';
      case 'customers': return 'Account Programs';
      case 'cards': return 'Card Formats';
      case 'sales': return 'Sales Views';
      case 'floorplans': return 'Showroom Layouts';
      case 'home': return 'Executive Sections';
      default: return 'Subpages';
    }
  }, [activeTab]);

  const isCurrentSubpageActive = (subId: string) => {
    switch (activeTab) {
      case 'catalogs': return catalogSubpage === subId;
      case 'products': return productSubpage === subId;
      case 'customers': return customerSubpage === subId;
      case 'cards': return cardSubpage === subId;
      case 'sales': return salesSubpage === subId;
      case 'floorplans': return floorplanSubpage === subId || (subId === 'interactive' && !floorplanSubpage);
      case 'home': return homeSubpage === subId;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-bold text-slate-900 tracking-wide">
          BATESVILLE<span className="text-amber-600">-FP</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Connecting to Batesville Cloud Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-amber-500/20 selection:text-amber-900">
      
      {/* Top Navigation */}
      <Navbar
        isAutoSyncing={isAutoSyncing}
        onOpenSalesUpload={() => setIsSalesUploadModalOpen(true)}
        onOpenPriceListImport={() => setIsPriceListImportOpen(true)}
        onGoHome={() => handleNavigate('home')}
      />

      {/* Main Tab Navigation Bar & Dropdown Menus */}
      <div className="no-print bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto py-1.5">
          
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDropdownOpen = openDropdown === tab.id;

              return (
                <div key={tab.id} className="relative">
                  <div className={`flex items-center rounded-xl transition-all ${
                    isActive ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}>
                    {/* Primary Button */}
                    <button
                      onClick={() => handleNavigate(tab.id as typeof activeTab)}
                      className="flex items-center space-x-2 pl-3 pr-1.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                          isActive ? 'bg-amber-700/60 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>

                    {/* Subpage Dropdown Chevron Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(isDropdownOpen ? null : tab.id);
                      }}
                      className={`py-2 px-1.5 rounded-r-xl transition-colors cursor-pointer ${
                        isActive ? 'text-amber-100 hover:text-white hover:bg-amber-700/50' : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title={`View ${tab.label} subpages`}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Menu Flyout */}
                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setOpenDropdown(null)} 
                      />
                      <div className="absolute left-0 mt-1 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn max-h-96 overflow-y-auto">
                        <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                          <span>{tab.label} Subpages</span>
                          <span className="text-[9px] font-normal text-slate-400">{tab.subpages.length} options</span>
                        </div>
                        {tab.subpages.map(sub => {
                          const isSubActive = activeTab === tab.id && isCurrentSubpageActive(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                if (sub.action) {
                                  sub.action();
                                  setOpenDropdown(null);
                                } else {
                                  handleNavigate(tab.id as typeof activeTab, sub.id);
                                }
                              }}
                              className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50/70 transition-colors cursor-pointer ${
                                isSubActive ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700'
                              }`}
                            >
                              <div className="pr-2">
                                <div className="text-xs font-semibold">{sub.label}</div>
                                {sub.description && (
                                  <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5 truncate max-w-[180px]">
                                    {sub.description}
                                  </div>
                                )}
                              </div>
                              {sub.badge !== undefined && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                                  isSubActive ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Action: Casket Images Studio */}
          <div className="pl-3 shrink-0">
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-amber-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Casket Images</span>
            </button>
          </div>

        </div>

        {/* Subpage Ribbon: Power BI Sheet / Excel Tabs Style */}
        <div className="bg-slate-100/90 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-none shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[11px] shrink-0 mr-1 uppercase tracking-wider">
              <span>{currentSubpageTitle}:</span>
            </div>
            
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
              {currentSubpages.map(sub => {
                const isActive = isCurrentSubpageActive(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      if (sub.action) {
                        sub.action();
                      } else {
                        handleNavigate(activeTab, sub.id);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                    }`}
                    title={sub.description}
                  >
                    <span>{sub.label}</span>
                    {sub.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                        isActive ? 'bg-amber-700/60 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sub.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <LandingPage
            customers={customers}
            products={products}
            salesCount={counts.sales}
            selectedSection={homeSubpage}
            onNavigate={(tab, subpage) => handleNavigate(tab, subpage)}
            onOpenSalesUpload={() => setIsSalesUploadModalOpen(true)}
            onOpenImageManager={() => setIsImageModalOpen(true)}
            onOpenPriceListImport={() => setIsPriceListImportOpen(true)}
          />
        )}

        {activeTab === 'catalogs' && (
          <CatalogYearManager
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onDataChanged={loadData}
            onOpenImageManager={() => setIsImageModalOpen(true)}
            onOpenPriceListImport={() => setIsPriceListImportOpen(true)}
            selectedYear={catalogSubpage}
            onYearChange={(yr) => setCatalogSubpage(yr)}
          />
        )}

        {activeTab === 'cards' && (
          <PriceCardStudio
            customers={customers}
            products={products}
            initialCustomerId={targetCustomerId}
            initialProductId={targetProductId}
            initialDimension={cardSubpage}
            onDimensionChange={(dim) => setCardSubpage(dim)}
          />
        )}

        {activeTab === 'sales' && (
          <SalesDashboard
            customers={customers}
            products={products}
            initialView={salesSubpage}
            onViewChange={(v) => setSalesSubpage(v)}
            onOpenSalesUpload={() => setIsSalesUploadModalOpen(true)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerList
            customers={customers}
            onSelectCustomerForCard={handleSelectCustomerForCard}
            onOpenFloorPlan={handleOpenFloorPlan}
            selectedProgram={customerSubpage}
            onProgramChange={(prog) => setCustomerSubpage(prog)}
          />
        )}

        {activeTab === 'products' && (
          <ProductCatalog
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onOpenImageManager={() => setIsImageModalOpen(true)}
            onOpenPriceListImport={() => setIsPriceListImportOpen(true)}
            selectedCategory={productSubpage}
            onCategoryChange={(cat) => setProductSubpage(cat)}
          />
        )}

        {activeTab === 'floorplans' && (
          <ShowroomFloorPlan
            customers={customers}
            products={products}
            initialCustomerId={targetFloorPlanCustomerId}
            initialRoomShape={floorplanSubpage}
            onRoomShapeChange={(shape) => setFloorplanSubpage(shape)}
            onOpenPriceCard={(cId, pId) => {
              setTargetCustomerId(cId);
              setTargetProductId(pId);
              setActiveTab('cards');
            }}
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

      {/* Price List Reference Guide Import Modal */}
      {isPriceListImportOpen && (
        <PriceListImportModal
          isOpen={isPriceListImportOpen}
          onClose={() => setIsPriceListImportOpen(false)}
          onProductsImported={() => {
            loadData();
          }}
        />
      )}

    </div>
  );
}

export default App;
