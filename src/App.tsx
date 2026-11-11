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
import { LithoManagerModal } from './components/catalogs/LithoManagerModal';
import { DailySalesUploadModal } from './components/sales/DailySalesUploadModal';
import { PriceListImportModal } from './components/products/PriceListImportModal';
import { ShowroomFloorPlan } from './components/floorplan/ShowroomFloorPlan';
import { ExtrasHub } from './components/extras/ExtrasHub';
import { EXTRA_CATEGORIES } from './services/extrasData';
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
  ChevronDown,
  ChevronRight,
  Lock,
  Sparkles
} from 'lucide-react';

interface SubpageItem {
  id: string;
  label: string;
  badge?: string | number;
  description?: string;
  action?: () => void;
}

export function App() {
  // Single-user portal: login removed, full access always
  const isLoggedIn = true;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'changePassword'>('login');
  const [activeTab, setActiveTab] = useState<'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans' | 'extras'>('home');
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
  const [salesSubpage, setSalesSubpage] = useState<'analytics' | 'quota' | 'units' | 'table'>('quota');
  const [floorplanSubpage, setFloorplanSubpage] = useState<RoomShape>('rectangle');
  const [homeSubpage, setHomeSubpage] = useState<string>('overview');
  const [extrasSubpage, setExtrasSubpage] = useState<string>('all');

  // Navigation dropdown popover state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Which child section is highlighted inside a grouped dropdown (e.g. Catalogs group)
  const [groupHoverChild, setGroupHoverChild] = useState<string | null>(null);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Pre-selected IDs when transitioning into PriceCardStudio or ShowroomFloorPlan
  const [targetCustomerId, setTargetCustomerId] = useState<string | undefined>(undefined);
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);
  const [targetFloorPlanCustomerId, setTargetFloorPlanCustomerId] = useState<string | undefined>(undefined);

  // Modals
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLithoModalOpen, setIsLithoModalOpen] = useState(false);
  const [isSalesUploadModalOpen, setIsSalesUploadModalOpen] = useState(false);
  const [isPriceListImportOpen, setIsPriceListImportOpen] = useState(false);

  // Automatic background update function
  const runAutoSync = async () => {
    try {
      setIsAutoSyncing(true);
      const res = await syncFromSupabase();
      if (res.success) {
        const freshCustomers = (await db.customers.toArray()).filter(c => c.inTerritory !== false);
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

      if (allCustomers.length === 0 || salesCount === 0) {
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

      setCustomers(allCustomers.filter(c => c.inTerritory !== false));
      setProducts(allProducts);
      setCounts({
        customers: allCustomers.filter(c => c.inTerritory !== false).length,
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

  // Distinct Catalog Years dynamically computed from products + standard editions (Defaulting to 2026-27)
  const catalogYears = useMemo(() => {
    const baseYears = ['2026-27', '2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2016-17'];
    const productYears = Array.from(new Set(products.map(p => String(p.catalogYear || p.year || '')).filter(Boolean)));
    return Array.from(new Set([...baseYears, ...productYears])).sort((a, b) => b.localeCompare(a));
  }, [products]);

  const getCatalogYearCount = (yr: string) => {
    if (yr === 'all') return products.length;
    return products.filter(p => {
      const pYr = String(p.catalogYear || p.year || '').trim();
      if (!pYr) return false;
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

  // Current catalog year products (2026-27 Edition only)
  const currentYearProducts = useMemo(() => {
    const currentYr = products.filter(p => {
      const yr = String(p.catalogYear || p.year || '').trim();
      return yr === '2026-27' || yr.startsWith('2026');
    });
    return currentYr.length > 0 ? currentYr : products;
  }, [products]);

  const productSubpages: SubpageItem[] = useMemo(() => [
    { id: 'all', label: 'All Products', badge: currentYearProducts.length, description: 'Complete Batesville product catalog' },
    { id: 'Caskets & Containers - Metal', label: 'Metal Caskets', badge: currentYearProducts.filter(p => p.category === 'Caskets & Containers - Metal').length, description: '18g, 20g, Bronze & Stainless' },
    { id: 'Caskets & Containers - Wood', label: 'Hardwood Caskets', badge: currentYearProducts.filter(p => p.category === 'Caskets & Containers - Wood').length, description: 'Cherry, Oak, Pecan, Mahogany & Maple' },
    { id: 'Caskets & Containers - NewPointe', label: 'NewPointe Caskets', badge: currentYearProducts.filter(p => p.category === 'Caskets & Containers - NewPointe').length, description: 'NewPointe collection caskets' },
    { id: 'Urns & Keepsakes - Full Size Urns', label: 'Full Size Urns', badge: currentYearProducts.filter(p => p.category === 'Urns & Keepsakes - Full Size Urns').length, description: 'Full size urns and cremation memorials' },
    { id: 'Urns & Keepsakes - Remembrance Keepsakes', label: 'Remembrance Keepsakes', badge: currentYearProducts.filter(p => p.category === 'Urns & Keepsakes - Remembrance Keepsakes').length, description: 'Keepsakes and remembrance items' },
  ], [currentYearProducts]);

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
    { id: '4x6', label: '4" x 6" Tent Cards', description: 'Compact showroom tent / ledge cards' },
    { id: '2x12', label: '2" x 12" Urn Rails', description: 'Shelf rail strips for cremation urns' },
    { id: '8.5x11', label: '8.5" x 11" Full Sheet', description: 'Letter size cap cards / display sheets' },
    { id: '11x17', label: '11" x 17" Posters', description: 'Large format showroom display posters' },
  ], []);

  const salesSubpages: SubpageItem[] = useMemo(() => [
    { id: 'quota', label: 'Annual Quota Tracker', description: 'Annual quota breakdown, pacing, daily variance & attainment' },
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

  // Catalog files load from Supabase Storage, so the Extras dropdown omits counts
  const extrasSubpages: SubpageItem[] = useMemo(() => [
    { id: 'all', label: 'All Extras', description: 'Catalogs, selection rooms, personalization & more' },
    ...EXTRA_CATEGORIES.map(c => ({
      id: c.id,
      label: c.label,
      description: c.description,
    })),
  ], []);

interface NavTabItem {
  id: 'home' | 'catalogs' | 'cards' | 'sales' | 'customers' | 'products' | 'floorplans' | 'extras';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  subpages: SubpageItem[];
}

  // Main Navigation Tabs
  const navTabs: NavTabItem[] = [
    { id: 'home', label: 'Home', icon: Home, subpages: homeSubpages },
    { id: 'catalogs', label: 'Catalogs', icon: Calendar, subpages: catalogSubpages },
    { id: 'cards', label: 'Price Cards', icon: Tag, subpages: cardSubpages },
    { id: 'sales', label: 'Sales', icon: BarChart3, subpages: salesSubpages },
    { id: 'customers', label: 'Customers', icon: Building2, subpages: customerSubpages },
    { id: 'products', label: 'Products', icon: Layers, subpages: productSubpages },
    { id: 'floorplans', label: 'Floor Plans', icon: LayoutGrid, subpages: floorplanSubpages },
    { id: 'extras', label: 'Extras', icon: Sparkles, subpages: extrasSubpages },
  ];

  // Unified Navigation Handler supporting Tab + Subpage
  const handleNavigate = (tab: typeof activeTab, subpageId?: string) => {
    if (!isLoggedIn && tab !== 'catalogs' && tab !== 'products') {
      setLoginModalMode('login');
      setIsLoginModalOpen(true);
      return;
    }
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
        setSalesSubpage(subpageId as 'quota' | 'analytics' | 'units' | 'table');
      }
    } else if (tab === 'floorplans') {
      if (subpageId !== 'interactive') {
        setFloorplanSubpage(subpageId as RoomShape);
      }
    } else if (tab === 'home') {
      setHomeSubpage(subpageId);
    } else if (tab === 'extras') {
      setExtrasSubpage(subpageId);
    }
  };

  const handleSelectProductForCard = (productId: string) => {
    if (!isLoggedIn) {
      setLoginModalMode('login');
      setIsLoginModalOpen(true);
      return;
    }
    setTargetProductId(productId);
    setActiveTab('cards');
  };

  const handleSelectCustomerForCard = (customerId: string) => {
    if (!isLoggedIn) {
      setLoginModalMode('login');
      setIsLoginModalOpen(true);
      return;
    }
    setTargetCustomerId(customerId);
    setActiveTab('cards');
  };

  const handleOpenFloorPlan = (customerId: string) => {
    if (!isLoggedIn) {
      setLoginModalMode('login');
      setIsLoginModalOpen(true);
      return;
    }
    setTargetFloorPlanCustomerId(customerId);
    setActiveTab('floorplans');
  };

  const isCurrentSubpageActive = (subId: string) => {
    switch (activeTab) {
      case 'catalogs': return catalogSubpage === subId;
      case 'products': return productSubpage === subId;
      case 'customers': return customerSubpage === subId;
      case 'cards': return cardSubpage === subId;
      case 'sales': return salesSubpage === subId;
      case 'floorplans': return floorplanSubpage === subId || (subId === 'interactive' && !floorplanSubpage);
      case 'home': return homeSubpage === subId;
      case 'extras': return extrasSubpage === subId;
      default: return false;
    }
  };

  // Show Home, Catalogs, and Products to unauthenticated visitors; full tabs when logged in
  const visibleNavTabs = useMemo(() => {
    if (isLoggedIn) return navTabs;
    return navTabs.filter(t => t.id === 'home' || t.id === 'catalogs' || t.id === 'products');
  }, [isLoggedIn, navTabs]);

  // Related tabs combined under a single header tab with a section dropdown
  const NAV_GROUPS: { id: string; label: string; tabIds: NavTabItem['id'][] }[] = [
    { id: 'catalog-group', label: 'Catalogs', tabIds: ['catalogs', 'products', 'cards'] },
    { id: 'customer-group', label: 'Customers', tabIds: ['customers', 'floorplans'] },
  ];
  const GROUPED_CHILD_LABELS: Partial<Record<NavTabItem['id'], string>> = {
    catalogs: 'Catalog Editions',
    customers: 'Customer Accounts',
  };

  type NavEntry =
    | { kind: 'tab'; id: string; tab: NavTabItem }
    | { kind: 'group'; id: string; label: string; children: NavTabItem[] };

  const navEntries: NavEntry[] = (() => {
    const entries: NavEntry[] = [];
    const insertedGroups = new Set<string>();
    visibleNavTabs.forEach(tab => {
      const group = NAV_GROUPS.find(g => g.tabIds.includes(tab.id));
      if (!group) {
        entries.push({ kind: 'tab', id: tab.id, tab });
        return;
      }
      if (insertedGroups.has(group.id)) return;
      insertedGroups.add(group.id);
      const children = group.tabIds
        .map(id => visibleNavTabs.find(t => t.id === id))
        .filter((t): t is NavTabItem => Boolean(t));
      entries.push({ kind: 'group', id: group.id, label: group.label, children });
    });
    return entries;
  })();

  const tabButtonClass = (isActive: boolean, isOpen: boolean) =>
    `flex items-center space-x-1.5 px-3 py-1 rounded-xs font-serif uppercase tracking-wider text-xs sm:text-[13px] transition-all cursor-pointer ${
      isActive
        ? 'text-white font-bold bg-gradient-to-r from-emerald-800 to-blue-900 border border-emerald-950 shadow-xs'
        : isOpen
          ? 'text-blue-950 font-bold bg-blue-100/80 border border-blue-300'
          : 'text-slate-800 hover:text-emerald-900 hover:bg-emerald-100/60 font-semibold border border-transparent'
    }`;

  const renderSubpageButton = (tab: NavTabItem, sub: SubpageItem) => {
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
        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-emerald-50 border-b border-slate-200/70 last:border-b-0 transition-colors cursor-pointer group ${
          isSubActive ? 'bg-blue-50 text-blue-950 font-bold' : 'text-slate-800'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 pr-2">
          <span className={`w-3.5 text-xs text-center shrink-0 ${isSubActive ? 'text-emerald-700 font-bold' : 'text-transparent group-hover:text-blue-400'}`}>
            ▸
          </span>
          <div className="min-w-0">
            <div className="text-xs font-serif font-bold truncate">{sub.label}</div>
            {sub.description && (
              <div className="text-[10px] text-slate-600 font-normal leading-tight truncate">
                {sub.description}
              </div>
            )}
          </div>
        </div>
        {sub.badge !== undefined && (
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs border shrink-0 ${
            isSubActive ? 'bg-emerald-800 text-white border-emerald-950 font-semibold' : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}>
            {sub.badge}
          </span>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f6f4] flex flex-col items-center justify-center text-slate-900">
        <Loader2 className="w-10 h-10 text-emerald-700 animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-black text-slate-950 tracking-wider uppercase border-b-2 border-double border-blue-900 pb-1">
          THE CATALOG <span className="text-emerald-800">PORTAL</span>
        </h2>
        <p className="text-xs sm:text-sm font-serif italic text-blue-900 mt-2">Typesetting Cloud Edition...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-slate-900 flex flex-col selection:bg-emerald-200 selection:text-blue-950">
      
      {/* Top Navigation */}
      <Navbar
        isAutoSyncing={isAutoSyncing}
        isLoggedIn={isLoggedIn}
        onOpenSalesUpload={() => {
          if (!isLoggedIn) {
            setLoginModalMode('login');
            setIsLoginModalOpen(true);
          } else {
            setIsSalesUploadModalOpen(true);
          }
        }}
        onOpenPriceListImport={() => {
          if (!isLoggedIn) {
            setLoginModalMode('login');
            setIsLoginModalOpen(true);
          } else {
            setIsPriceListImportOpen(true);
          }
        }}
        onGoHome={() => handleNavigate(isLoggedIn ? 'home' : 'catalogs')}
      />

      {/* Newspaper Section Index Bar & Dropdown Menus */}
      <div className="no-print bg-[#eef4f1] border-b-2 border-blue-950 shadow-2xs sticky top-[88px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-1.5">
          
          <div className="flex items-center divide-x divide-emerald-900/20 overflow-x-auto scrollbar-none py-0.5">
            {navEntries.map((entry) => {
              const isDropdownOpen = openDropdown === entry.id;
              const childIds = entry.kind === 'group' ? entry.children.map(c => c.id as string) : [entry.id];
              const isActive = childIds.includes(activeTab);
              const label = entry.kind === 'group' ? entry.label : entry.tab.label;

              // Child section highlighted in a grouped dropdown: hovered > active > first
              const focusedChild = entry.kind === 'group'
                ? (entry.children.find(c => c.id === groupHoverChild)
                  || entry.children.find(c => c.id === activeTab)
                  || entry.children[0])
                : undefined;

              return (
                <div 
                  key={entry.id} 
                  className="relative shrink-0 px-1 first:pl-0"
                  onMouseEnter={() => {
                    if (openDropdown !== null && openDropdown !== entry.id) {
                      setGroupHoverChild(null);
                      setOpenDropdown(entry.id);
                    }
                  }}
                >
                  <button
                    onClick={() => {
                      if (entry.kind === 'tab' && activeTab !== entry.id) {
                        handleNavigate(entry.id as typeof activeTab);
                      }
                      setGroupHoverChild(null);
                      setOpenDropdown(isDropdownOpen ? null : entry.id);
                    }}
                    className={tabButtonClass(isActive, isDropdownOpen)}
                  >
                    <span>{label}</span>
                    {entry.kind === 'group' && isActive && (
                      <span className="hidden md:inline text-[10px] normal-case font-normal text-emerald-200 tracking-normal">
                        · {GROUPED_CHILD_LABELS[activeTab as NavTabItem['id']] || entry.children.find(c => c.id === activeTab)?.label}
                      </span>
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isActive ? 'text-emerald-200' : 'text-blue-800'} ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Newspaper Dropdown Menu Flyout */}
                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setOpenDropdown(null)} 
                      />

                      {entry.kind === 'tab' ? (
                        <div className="absolute left-0 mt-1.5 w-64 bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-xl py-1.5 z-50 animate-fadeIn max-h-[420px] overflow-y-auto">
                          <div className="px-3 py-1.5 text-[10px] font-serif font-bold text-blue-950 uppercase tracking-widest border-b-2 border-double border-emerald-800 mb-1 flex items-center justify-between bg-emerald-50/60">
                            <span>§ {entry.tab.label} Section</span>
                            <span className="text-[9px] font-mono text-emerald-800">{entry.tab.subpages.length} cols</span>
                          </div>
                          {entry.tab.subpages.map(sub => renderSubpageButton(entry.tab, sub))}
                        </div>
                      ) : focusedChild && (
                        /* Grouped flyout: section picker (left) + that section's pages (right) */
                        <div className="absolute left-0 mt-1.5 w-[540px] max-w-[92vw] bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-xl z-50 animate-fadeIn flex">
                          <div className="w-44 shrink-0 border-r-2 border-double border-emerald-800 bg-emerald-50/60 py-1.5">
                            <div className="px-3 py-1.5 text-[10px] font-serif font-bold text-blue-950 uppercase tracking-widest border-b border-emerald-800/40 mb-1">
                              § {entry.label}
                            </div>
                            {entry.children.map(child => {
                              const ChildIcon = child.icon;
                              const isFocused = focusedChild.id === child.id;
                              const isChildActive = activeTab === child.id;
                              return (
                                <button
                                  key={child.id}
                                  onMouseEnter={() => setGroupHoverChild(child.id)}
                                  onClick={() => handleNavigate(child.id as typeof activeTab)}
                                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs font-serif font-bold transition-colors cursor-pointer ${
                                    isFocused ? 'bg-white text-blue-950 border-y border-emerald-800/30' : 'text-slate-800 hover:bg-white/70 border-y border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${isChildActive ? 'text-emerald-700' : 'text-blue-800'}`} />
                                    <span className="truncate">{GROUPED_CHILD_LABELS[child.id] || child.label}</span>
                                    {isChildActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />}
                                  </span>
                                  <ChevronRight className={`w-3 h-3 shrink-0 ${isFocused ? 'text-emerald-700' : 'text-slate-400'}`} />
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex-1 min-w-0 py-1.5 max-h-[420px] overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-serif font-bold text-blue-950 uppercase tracking-widest border-b-2 border-double border-emerald-800 mb-1 flex items-center justify-between bg-emerald-50/60">
                              <span>{GROUPED_CHILD_LABELS[focusedChild.id] || focusedChild.label}</span>
                              <span className="text-[9px] font-mono text-emerald-800">{focusedChild.subpages.length} cols</span>
                            </div>
                            {focusedChild.subpages.map(sub => renderSubpageButton(focusedChild, sub))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Action: Casket Images Studio (Only visible to logged in staff) */}
          {isLoggedIn && (
            <div className="pl-3 shrink-0">
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="flex items-center space-x-1.5 bg-white hover:bg-blue-50 text-blue-950 hover:text-emerald-900 border border-blue-900 px-3 py-1 rounded-xs text-xs font-serif font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>Photo Archive</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${activeTab === 'cards' ? 'max-w-[1720px]' : 'max-w-7xl'}`}>
        {/* If user is logged in, they can view the Home executive dashboard */}
        {activeTab === 'home' && isLoggedIn && (
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

        {/* Unauthenticated fallback if guest tries to view a protected tab */}
        {!isLoggedIn && activeTab !== 'catalogs' && activeTab !== 'products' && (
          <CatalogYearManager
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onDataChanged={loadData}
            onOpenImageManager={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
            onOpenLithoManager={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
            onOpenPriceListImport={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
            selectedYear={catalogSubpage}
            onYearChange={(yr) => setCatalogSubpage(yr)}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
          />
        )}

        {activeTab === 'catalogs' && (
          <CatalogYearManager
            products={products}
            onSelectProductForCard={handleSelectProductForCard}
            onDataChanged={loadData}
            onOpenImageManager={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsImageModalOpen(true);
              }
            }}
            onOpenLithoManager={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsLithoModalOpen(true);
              }
            }}
            onOpenPriceListImport={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsPriceListImportOpen(true);
              }
            }}
            selectedYear={catalogSubpage}
            onYearChange={(yr) => setCatalogSubpage(yr)}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
          />
        )}

        {activeTab === 'cards' && isLoggedIn && (
          <PriceCardStudio
            customers={customers}
            products={products}
            initialCustomerId={targetCustomerId}
            initialProductId={targetProductId}
            initialDimension={cardSubpage}
            onDimensionChange={(dim) => setCardSubpage(dim)}
          />
        )}

        {activeTab === 'sales' && isLoggedIn && (
          <SalesDashboard
            customers={customers}
            products={products}
            initialView={salesSubpage}
            onViewChange={(v) => setSalesSubpage(v)}
            onOpenSalesUpload={() => setIsSalesUploadModalOpen(true)}
          />
        )}

        {activeTab === 'customers' && isLoggedIn && (
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
            onOpenImageManager={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsImageModalOpen(true);
              }
            }}
            onOpenLithoManager={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsLithoModalOpen(true);
              }
            }}
            onOpenPriceListImport={() => {
              if (!isLoggedIn) {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              } else {
                setIsPriceListImportOpen(true);
              }
            }}
            selectedCategory={productSubpage}
            onCategoryChange={(cat) => setProductSubpage(cat)}
            onProductUpdated={loadData}
            isLoggedIn={isLoggedIn}
            onRequireLogin={() => { setLoginModalMode('login'); setIsLoginModalOpen(true); }}
          />
        )}

        {activeTab === 'floorplans' && isLoggedIn && (
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

        {activeTab === 'extras' && isLoggedIn && (
          <ExtrasHub
            selectedCategory={extrasSubpage}
            onCategoryChange={(cat) => setExtrasSubpage(cat)}
            isLoggedIn={isLoggedIn}
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

      {/* Batesville Litho Cut Sheets Manager Modal */}
      <LithoManagerModal
        isOpen={isLithoModalOpen}
        onClose={() => setIsLithoModalOpen(false)}
        products={products}
        onLithosUpdated={loadData}
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