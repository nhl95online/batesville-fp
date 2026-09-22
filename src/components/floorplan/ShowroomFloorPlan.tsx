import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, SaleRecord, RoomShape, RoomCapacity, FloorSlot, CustomerFloorPlan } from '../../types';
import { db } from '../../services/db';
import { isUrnProduct } from '../../services/supabase';
import { 
  LayoutGrid, 
  Sparkles, 
  Flame, 
  Zap, 
  Snowflake, 
  ArrowRightLeft, 
  RotateCcw, 
  Printer, 
  Search, 
  ChevronRight, 
  Check, 
  Info, 
  TrendingUp, 
  ShieldCheck, 
  Eye, 
  X,
  Maximize2,
  Box,
  Compass
} from 'lucide-react';

interface ShowroomFloorPlanProps {
  customers: Customer[];
  products: Product[];
  initialCustomerId?: string;
  onOpenProductDetail?: (product: Product) => void;
  onOpenPriceCard?: (customerId: string, productId: string) => void;
}

export const ShowroomFloorPlan: React.FC<ShowroomFloorPlanProps> = ({
  customers,
  products,
  initialCustomerId,
  onOpenProductDetail,
  onOpenPriceCard,
}) => {
  // Active selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (initialCustomerId) return initialCustomerId;
    if (customers.length > 0) return customers[0].id;
    return '';
  });

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  // Customer sales data for live interaction
  const [customerSales, setCustomerSales] = useState<SaleRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Room Configuration
  const [roomShape, setRoomShape] = useState<RoomShape>('rectangle');
  const [roomCapacity, setRoomCapacity] = useState<RoomCapacity>('medium');
  const [slots, setSlots] = useState<FloorSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Search & Catalog Swap Modal
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilterType, setCatalogFilterType] = useState<'all' | 'casket' | 'urn'>('all');

  // Load customer sales and all regional sales
  useEffect(() => {
    async function loadSales() {
      if (!activeCustomer) return;
      setIsLoadingSales(true);
      try {
        const custAcct = String(activeCustomer.accountNumber || activeCustomer.code || '');
        const sales = await db.sales.toArray();
        setAllSales(sales);

        const filtered = sales.filter(s => {
          const sAcct = String(s.accountNumber || '');
          if (custAcct && (sAcct === custAcct || s.customerId === `cust-${custAcct}`)) return true;
          if (s.customerId === activeCustomer.id || sAcct === activeCustomer.id) return true;
          if (s.accountName && activeCustomer.name && s.accountName.toLowerCase() === activeCustomer.name.toLowerCase()) return true;
          return false;
        });
        setCustomerSales(filtered);
      } catch (err) {
        console.error('Error loading sales for floor plan:', err);
      } finally {
        setIsLoadingSales(false);
      }
    }
    loadSales();
  }, [activeCustomer]);

  // Regional bestseller rankings (for intelligent replacement suggestions)
  const regionalRankings = useMemo(() => {
    const casketCounts: Record<string, { product: Product; units: number; revenue: number }> = {};
    const urnCounts: Record<string, { product: Product; units: number; revenue: number }> = {};

    allSales.forEach(s => {
      const pCode = String(s.productCode || '');
      const prod = products.find(p => p.code === pCode);
      if (!prod) return;

      const isUrn = isUrnProduct(prod);
      const targetMap = isUrn ? urnCounts : casketCounts;

      if (!targetMap[pCode]) {
        targetMap[pCode] = { product: prod, units: 0, revenue: 0 };
      }
      targetMap[pCode].units += Number(s.quantity || 1);
      targetMap[pCode].revenue += (Number(s.cost) || Number(s.totalAmount) || 0);
    });

    return {
      topCaskets: Object.values(casketCounts).sort((a, b) => b.units - a.units),
      topUrns: Object.values(urnCounts).sort((a, b) => b.units - a.units),
    };
  }, [allSales, products]);

  // Generate or load customer floor plan
  useEffect(() => {
    if (!activeCustomer || products.length === 0) return;

    const storageKey = `batesville_floorplan_${activeCustomer.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed: CustomerFloorPlan = JSON.parse(saved);
        setRoomShape(parsed.roomShape || 'rectangle');
        setRoomCapacity(parsed.roomCapacity || 'medium');
        setSlots(parsed.slots || []);
        if (parsed.slots && parsed.slots.length > 0) {
          setSelectedSlotId(parsed.slots[0].id);
        }
        return;
      } catch (e) {
        console.warn('Failed to parse saved floor plan:', e);
      }
    }

    // Auto-generate initial layout based on room capacity and shape
    generateDefaultLayout(roomShape, roomCapacity);
  }, [activeCustomer, products]);

  // Helper to generate default slots
  const generateDefaultLayout = (shape: RoomShape, capacity: RoomCapacity) => {
    let casketCount = 14;
    let urnCount = 12;

    if (capacity === 'small') {
      casketCount = 8;
      urnCount = 6;
    } else if (capacity === 'large') {
      casketCount = 20;
      urnCount = 18;
    }

    const caskets = products.filter(p => !isUrnProduct(p));
    const urns = products.filter(p => isUrnProduct(p));

    const newSlots: FloorSlot[] = [];

    // Casket bays
    for (let i = 1; i <= casketCount; i++) {
      const prod = caskets[(i - 1) % caskets.length];
      newSlots.push({
        id: `casket-bay-${i}`,
        slotNumber: i,
        label: i === 1 ? 'Bay 1 (Entrance Feature)' : `Bay ${i}`,
        type: 'casket',
        productId: prod?.id,
        productCode: prod?.code,
        productName: prod?.name,
        category: prod?.category,
        wholesalePrice: prod?.wholesalePrice,
        imageUrl: prod?.imageUrl,
      });
    }

    // Urn pedestals / shelves
    for (let j = 1; j <= urnCount; j++) {
      const urn = urns[(j - 1) % urns.length];
      newSlots.push({
        id: `urn-shelf-${j}`,
        slotNumber: j,
        label: `Urn Pedestal ${j}`,
        type: 'urn',
        productId: urn?.id,
        productCode: urn?.code,
        productName: urn?.name,
        category: urn?.category,
        wholesalePrice: urn?.wholesalePrice,
        imageUrl: urn?.imageUrl,
      });
    }

    setSlots(newSlots);
    if (newSlots.length > 0) {
      setSelectedSlotId(newSlots[0].id);
    }

    // Save to localStorage
    if (activeCustomer) {
      const plan: CustomerFloorPlan = {
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        roomShape: shape,
        roomCapacity: capacity,
        slots: newSlots,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`batesville_floorplan_${activeCustomer.id}`, JSON.stringify(plan));
    }
  };

  // Handle changing shape or capacity
  const handleConfigChange = (newShape: RoomShape, newCapacity: RoomCapacity) => {
    setRoomShape(newShape);
    setRoomCapacity(newCapacity);
    generateDefaultLayout(newShape, newCapacity);
  };

  // Save current slots to localStorage
  const savePlan = (updatedSlots: FloorSlot[]) => {
    if (!activeCustomer) return;
    const plan: CustomerFloorPlan = {
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      roomShape,
      roomCapacity,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`batesville_floorplan_${activeCustomer.id}`, JSON.stringify(plan));
  };

  // Replace item in active slot
  const handleSwapSlotProduct = (newProduct: Product) => {
    if (!selectedSlotId) return;

    setSlots(prev => {
      const updated = prev.map(s => {
        if (s.id === selectedSlotId) {
          return {
            ...s,
            productId: newProduct.id,
            productCode: newProduct.code,
            productName: newProduct.name,
            category: newProduct.category,
            wholesalePrice: newProduct.wholesalePrice,
            imageUrl: newProduct.imageUrl,
          };
        }
        return s;
      });
      savePlan(updated);
      return updated;
    });

    setIsCatalogModalOpen(false);
  };

  // Slot Performance calculation
  const getSlotSalesStats = (slot: FloorSlot) => {
    if (!slot.productCode) return { units: 0, revenue: 0, lastDate: 'Never', status: 'stagnant' as const };

    const matching = customerSales.filter(s => s.productCode === slot.productCode);
    const units = matching.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
    const revenue = matching.reduce((sum, s) => sum + (Number(s.cost) || Number(s.totalAmount) || 0), 0);

    const sortedDates = matching
      .map(s => s.saleDate)
      .filter(Boolean)
      .sort()
      .reverse();

    const lastDate = sortedDates[0] || (matching.length > 0 ? 'Recorded' : 'No sales');

    let status: 'top' | 'steady' | 'stagnant' = 'stagnant';
    if (units >= 5) {
      status = 'top';
    } else if (units >= 1) {
      status = 'steady';
    }

    return { units, revenue, lastDate, status };
  };

  const activeSlot = slots.find(s => s.id === selectedSlotId);
  const activeSlotStats = activeSlot ? getSlotSalesStats(activeSlot) : null;
  const activeSlotProduct = activeSlot?.productId 
    ? products.find(p => p.id === activeSlot.productId || p.code === activeSlot.productCode) 
    : null;

  // Smart suggestion for currently inspected slot
  const smartSuggestion = useMemo(() => {
    if (!activeSlot) return null;
    const isUrn = activeSlot.type === 'urn';
    const topList = isUrn ? regionalRankings.topUrns : regionalRankings.topCaskets;

    // Filter out items already placed on the floor
    const placedCodes = new Set(slots.map(s => s.productCode));
    const candidate = topList.find(t => !placedCodes.has(t.product.code));

    if (candidate) {
      return {
        product: candidate.product,
        regionalUnits: candidate.units,
        reason: `${candidate.product.name} is a proven top performer in this category with ${candidate.units} sales across peer funeral homes.`
      };
    }
    return null;
  }, [activeSlot, slots, regionalRankings]);

  // Overall Showroom Metrics
  const showroomSummary = useMemo(() => {
    let topCount = 0;
    let steadyCount = 0;
    let stagnantCount = 0;
    let totalWholesale = 0;

    slots.forEach(s => {
      const stats = getSlotSalesStats(s);
      if (stats.status === 'top') topCount++;
      else if (stats.status === 'steady') steadyCount++;
      else stagnantCount++;

      totalWholesale += s.wholesalePrice || 1200;
    });

    const activeSelling = topCount + steadyCount;
    const healthScore = slots.length > 0 ? Math.round((activeSelling / slots.length) * 100) : 0;
    const estimatedRetail = Math.round(totalWholesale * 2.4);

    return {
      totalSlots: slots.length,
      casketCount: slots.filter(s => s.type === 'casket').length,
      urnCount: slots.filter(s => s.type === 'urn').length,
      topCount,
      steadyCount,
      stagnantCount,
      healthScore,
      totalWholesale,
      estimatedRetail,
    };
  }, [slots, customerSales]);

  // Filtered products for catalog swap modal
  const filteredCatalogForSwap = useMemo(() => {
    return products.filter(p => {
      const isUrn = isUrnProduct(p);
      if (catalogFilterType === 'casket' && isUrn) return false;
      if (catalogFilterType === 'urn' && !isUrn) return false;

      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.material && p.material.toLowerCase().includes(q)) ||
        (p.exteriorFinish && p.exteriorFinish.toLowerCase().includes(q))
      );
    });
  }, [products, catalogFilterType, catalogSearch]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Header & Customer Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 shadow-sm">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide flex items-center gap-2">
              Interactive Showroom Floor Plan
              <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Live Sales Engine
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Visual selection room floor plan mapped to {activeCustomer?.name}'s actual sales performance.
            </p>
          </div>
        </div>

        {/* Customer Dropdown Selector & Print Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shadow-sm pr-8"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.accountNumber || c.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Layout</span>
          </button>
        </div>
      </div>

      {/* Showroom Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-slate-500 block mb-0.5">Showroom Velocity</span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-xl font-bold font-mono ${showroomSummary.healthScore >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {showroomSummary.healthScore}%
            </span>
            <span className="text-[10px] text-slate-400">selling</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-emerald-600" />
            <span>Top Sellers (≥5)</span>
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono">
            {showroomSummary.topCount}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Steady Movers (1-4)</span>
          </span>
          <span className="text-xl font-bold text-blue-700 font-mono">
            {showroomSummary.steadyCount}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
            <Snowflake className="w-3.5 h-3.5 text-rose-500" />
            <span>Stagnant (0 Sales)</span>
          </span>
          <span className="text-xl font-bold text-rose-600 font-mono">
            {showroomSummary.stagnantCount}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm col-span-2 sm:col-span-1">
          <span className="text-slate-500 block mb-0.5">Floor Display Value</span>
          <span className="text-base font-bold text-slate-900 font-mono block">
            ${showroomSummary.totalWholesale.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Wholesale Total</span>
        </div>
      </div>

      {/* Main Studio: Room Layout Canvas + Slot Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual Room Layout Canvas */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Layout Controls Toolbar */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm text-xs">
            {/* Shape Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Layout Shape:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['rectangle', 'oval', 'square', 'l-shaped'] as RoomShape[]).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => handleConfigChange(shape, roomCapacity)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      roomShape === shape
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {shape === 'l-shaped' ? 'L-Shaped' : shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Room Size:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['small', 'medium', 'large'] as RoomCapacity[]).map((cap) => (
                  <button
                    key={cap}
                    onClick={() => handleConfigChange(roomShape, cap)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      roomCapacity === cap
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Room Canvas */}
          <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-8 shadow-md relative min-h-[560px] flex flex-col justify-between overflow-hidden">
            
            {/* Architectural Compass & North Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <Compass className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-600 uppercase tracking-wider">
                  {roomShape.toUpperCase()} SHOWROOM • {roomCapacity.toUpperCase()} CAPACITY ({slots.length} TOTAL SLOTS)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Top Seller</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Steady</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Stagnant</span>
              </div>
            </div>

            {/* Entrance Door Symbol */}
            <div className="flex justify-center mb-4">
              <div className="px-6 py-1 rounded-b-xl bg-slate-800 text-amber-300 text-[10px] font-mono tracking-widest uppercase font-bold shadow-sm">
                ▼ MAIN CLIENT ENTRANCE ▼
              </div>
            </div>

            {/* Dynamic Room Slots Grid Based on Shape */}
            <div className="flex-1 flex flex-col justify-center">
              
              {/* Casket Bays Section */}
              <div className="mb-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-amber-600" />
                  <span>Casket Floor Bays ({slots.filter(s => s.type === 'casket').length})</span>
                </div>

                <div className={`grid gap-3 ${
                  roomShape === 'oval' 
                    ? 'grid-cols-2 sm:grid-cols-4 rounded-3xl p-4 bg-slate-50 border border-dashed border-amber-300'
                    : roomShape === 'l-shaped'
                    ? 'grid-cols-2 sm:grid-cols-3 p-4 bg-slate-50 rounded-2xl border border-slate-200'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                }`}>
                  {slots.filter(s => s.type === 'casket').map(slot => {
                    const stats = getSlotSalesStats(slot);
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {/* Status Ribbon Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {slot.label}
                          </span>
                          {stats.status === 'top' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Flame className="w-3 h-3 text-emerald-600" />
                              <span>{stats.units}</span>
                            </span>
                          )}
                          {stats.status === 'steady' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              <Zap className="w-3 h-3 text-blue-600" />
                              <span>{stats.units}</span>
                            </span>
                          )}
                          {stats.status === 'stagnant' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                              <Snowflake className="w-3 h-3 text-rose-600" />
                              <span>0</span>
                            </span>
                          )}
                        </div>

                        {/* Product Photo & Name */}
                        <div className="flex items-center space-x-2 my-1">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                            {slot.imageUrl ? (
                              <img src={slot.imageUrl} alt={slot.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Box className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-serif font-bold text-xs text-slate-900 block truncate" title={slot.productName}>
                              {slot.productName || 'Unassigned'}
                            </span>
                            <span className="font-mono text-[10px] text-amber-700 block">
                              {slot.productCode}
                            </span>
                          </div>
                        </div>

                        {/* Footer Price */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Cost:</span>
                          <span className="font-mono font-bold text-slate-700">
                            ${slot.wholesalePrice?.toLocaleString() || '1,200'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Urn Wall & Pedestals Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Urn & Keepsake Wall Shelves / Pedestals ({slots.filter(s => s.type === 'urn').length})</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {slots.filter(s => s.type === 'urn').map(slot => {
                    const stats = getSlotSalesStats(slot);
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-2 ring-amber-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[9px]">
                          <span className="font-mono font-bold text-slate-500">#{slot.slotNumber}</span>
                          {stats.status === 'top' && <Flame className="w-2.5 h-2.5 text-emerald-600" />}
                          {stats.status === 'steady' && <Zap className="w-2.5 h-2.5 text-blue-600" />}
                          {stats.status === 'stagnant' && <Snowflake className="w-2.5 h-2.5 text-rose-500" />}
                        </div>

                        <div className="w-full h-10 rounded bg-slate-100 overflow-hidden mb-1 flex items-center justify-center">
                          {slot.imageUrl ? (
                            <img src={slot.imageUrl} alt={slot.productName} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <span className="text-[10px] font-serif font-bold text-slate-900 truncate block">
                          {slot.productName}
                        </span>
                        <span className="text-[9px] font-mono text-amber-800 block truncate">
                          {stats.units} sold
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Showroom Consultation Island */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center">
              <div className="px-5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-medium flex items-center gap-2">
                <span>Family Arrangement Table & Touchscreen Presentation Kiosk</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Slot Inspector & Merchandising Recommendations */}
        <div className="space-y-4">
          
          {activeSlot ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-700 block">
                    Slot Inspection
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                    {activeSlot.label}
                  </h3>
                  <span className="text-xs text-slate-500 capitalize">
                    {activeSlot.type} Display Position
                  </span>
                </div>

                {activeSlotStats && (
                  <div>
                    {activeSlotStats.status === 'top' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                        <Flame className="w-4 h-4 text-emerald-600" />
                        <span>Top Seller</span>
                      </span>
                    )}
                    {activeSlotStats.status === 'steady' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span>Steady Mover</span>
                      </span>
                    )}
                    {activeSlotStats.status === 'stagnant' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs">
                        <Snowflake className="w-4 h-4 text-rose-600" />
                        <span>Zero Velocity</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Product Preview Card */}
              <div className="space-y-3">
                <div className="relative w-full h-44 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {activeSlot.imageUrl ? (
                    <img 
                      src={activeSlot.imageUrl} 
                      alt={activeSlot.productName} 
                      className="w-full h-full object-contain p-3" 
                    />
                  ) : (
                    <Box className="w-8 h-8 text-slate-400" />
                  )}
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white font-mono text-[10px] px-2 py-0.5 rounded">
                    SKU: {activeSlot.productCode}
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-lg font-bold text-slate-900">
                    {activeSlot.productName}
                  </h4>
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    {activeSlot.category}
                  </p>
                </div>

                {/* Sales Figures Ledger */}
                {activeSlotStats && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client Units Sold</span>
                      <span className="font-mono text-base font-bold text-slate-900">
                        {activeSlotStats.units} units
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client Revenue</span>
                      <span className="font-mono text-base font-bold text-emerald-700">
                        ${activeSlotStats.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between text-[11px]">
                      <span className="text-slate-500">Last Client Purchase:</span>
                      <span className="font-mono text-slate-700">{activeSlotStats.lastDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Merchandising Suggestions Module */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    Merchandising Recommendation
                  </h4>
                </div>

                {activeSlotStats?.status === 'stagnant' && smartSuggestion ? (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-900 leading-relaxed">
                      ⚠️ <strong>Zero sales recorded</strong> for this funeral home. To maximize showroom velocity, Batesville recommends swapping this slot with:
                    </p>

                    <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        <img src={smartSuggestion.product.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-serif font-bold text-xs text-slate-900 block truncate">
                          {smartSuggestion.product.name}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          🔥 {smartSuggestion.regionalUnits} sold regionally
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSwapSlotProduct(smartSuggestion.product)}
                      className="w-full flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Swap with Suggested Model</span>
                    </button>
                  </div>
                ) : activeSlotStats?.status === 'top' ? (
                  <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <p className="font-medium">
                      ✓ <strong>Optimal Showroom Placement.</strong> This model generates strong revenue and high conversion. Maintain front-and-center placement.
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p>
                      Steady contributor. Consider featuring matching keepsake urn or corner LifeSymbols displays to lift family personalization take-rate.
                    </p>
                  </div>
                )}
              </div>

              {/* Slot Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setCatalogFilterType(activeSlot.type);
                    setIsCatalogModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Choose Replacement from Catalog</span>
                </button>

                {activeSlotProduct && onOpenPriceCard && activeCustomer && (
                  <button
                    onClick={() => onOpenPriceCard(activeCustomer.id, activeSlotProduct.id)}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <span>Generate Showroom Price Card for Slot</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <LayoutGrid className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs">Click on any casket bay or urn pedestal to inspect performance & recommendations.</p>
            </div>
          )}

        </div>

      </div>

      {/* Catalog Model Swap Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Select Model for {activeSlot?.label}
                </h3>
                <p className="text-xs text-slate-500">
                  Choose any Batesville casket or urn from your product catalog.
                </p>
              </div>
              <button
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search model name, SKU code, material, finish..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {filteredCatalogForSwap.slice(0, 50).map(product => (
                <div
                  key={product.id}
                  onClick={() => handleSwapSlotProduct(product)}
                  className="py-3 px-3 rounded-xl hover:bg-amber-50/50 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-xs text-slate-900 group-hover:text-amber-700 truncate">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        SKU: {product.code} • {product.category}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      ${product.wholesalePrice?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold group-hover:underline">
                      Assign to Slot →
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
