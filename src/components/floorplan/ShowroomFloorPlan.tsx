import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, Product, SaleRecord, RoomShape, RoomCapacity, FloorSlot, CustomerFloorPlan } from '../../types';
import { db } from '../../services/db';
import { 
  isUrnProduct, 
  fetchCustomerShowroomFromSupabase, 
  fetchAccountsWithShowroomLocations, 
  saveCustomerShowroomToSupabase 
} from '../../services/supabase';
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
  Box, 
  Compass, 
  Layers, 
  Cloud, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  MapPin, 
  Plus, 
  ExternalLink,
  Sliders,
  Move
} from 'lucide-react';

interface ShowroomFloorPlanProps {
  customers: Customer[];
  products: Product[];
  initialCustomerId?: string;
  onOpenProductDetail?: (product: Product) => void;
  onOpenPriceCard?: (customerId: string, productId: string) => void;
  initialRoomShape?: RoomShape;
  onRoomShapeChange?: (shape: RoomShape) => void;
}

export const ShowroomFloorPlan: React.FC<ShowroomFloorPlanProps> = ({
  customers,
  products,
  initialCustomerId,
  onOpenProductDetail,
  onOpenPriceCard,
  initialRoomShape,
  onRoomShapeChange,
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

  // View Mode: 'blueprint' (2D Architectural CAD plan) or 'cards' (matrix grid)
  const [viewMode, setViewMode] = useState<'blueprint' | 'cards'>('blueprint');

  // Cloud Showroom sync state
  const [cloudAccounts, setCloudAccounts] = useState<string[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [cloudRoomMeta, setCloudRoomMeta] = useState<any | null>(null);

  // Customer sales data for live interaction
  const [customerSales, setCustomerSales] = useState<SaleRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Room Configuration
  const [roomShape, setRoomShape] = useState<RoomShape>(initialRoomShape || 'l-shaped');
  const [roomCapacity, setRoomCapacity] = useState<RoomCapacity>('medium');
  const [slots, setSlots] = useState<FloorSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Hover state for blueprint tooltip
  const [hoveredBayNumber, setHoveredBayNumber] = useState<number | null>(null);

  // Search & Catalog Swap Modal
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilterType, setCatalogFilterType] = useState<'all' | 'casket' | 'urn'>('all');

  // Discover accounts that have live showrooms stored in Supabase
  useEffect(() => {
    async function loadCloudAccounts() {
      try {
        const accounts = await fetchAccountsWithShowroomLocations();
        setCloudAccounts(accounts);

        // If no explicit customer was provided and we have accounts in Supabase,
        // auto-select the customer that has active cloud data (e.g. Guenette: 919742)
        if (!initialCustomerId && accounts.length > 0) {
          const cloudCust = customers.find(c => {
            const acct = String(c.accountNumber || c.code || '').trim();
            return accounts.includes(acct);
          });
          if (cloudCust && cloudCust.id !== selectedCustomerId) {
            setSelectedCustomerId(cloudCust.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load accounts with cloud showrooms:', err);
      }
    }
    loadCloudAccounts();
  }, [customers, initialCustomerId]);

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

  // Regional bestseller rankings
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

  // Helper to generate default slots when neither Supabase nor localStorage has data
  const generateDefaultLayout = useCallback((shape: RoomShape, capacity: RoomCapacity) => {
    let casketCount = 10;
    let urnCount = 12;

    const caskets = products.filter(p => !isUrnProduct(p));
    const urns = products.filter(p => isUrnProduct(p));

    const newSlots: FloorSlot[] = [];

    for (let i = 1; i <= casketCount; i++) {
      const prod = caskets[(i - 1) % Math.max(1, caskets.length)];
      const isDouble = true;
      newSlots.push({
        id: `casket-bay-${i}`,
        slotNumber: i,
        label: `Bay ${i} (Double Rack)`,
        type: 'casket',
        isDoubleRack: isDouble,
        rackType: 'double',
        levelNumber: 2,
        tierLevel: 'Double Rack - Top',
        productId: prod?.id,
        productCode: prod?.code,
        productName: prod?.name,
        category: prod?.category,
        wholesalePrice: prod?.wholesalePrice,
        imageUrl: prod?.imageUrl,
      });
    }

    for (let j = 1; j <= urnCount; j++) {
      const urn = urns[(j - 1) % Math.max(1, urns.length)];
      const shelfLvl = ((j - 1) % 3) + 1;
      newSlots.push({
        id: `urn-shelf-${j}`,
        slotNumber: j,
        label: `Urn Shelf #${j}`,
        type: 'urn',
        isDoubleRack: false,
        rackType: 'urn-shelf',
        levelNumber: shelfLvl,
        tierLevel: `Shelf ${shelfLvl}`,
        shelfSlotPosition: ((j - 1) % 2) + 1,
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
  }, [products]);

  // Load customer floor plan directly from Supabase, falling back to local cache or defaults
  const loadCustomerFloorPlan = useCallback(async (forceCloud = false) => {
    if (!activeCustomer) return;

    setIsCloudLoading(true);
    const acct = String(activeCustomer.accountNumber || activeCustomer.code || '').trim();

    try {
      const cloudRes = await fetchCustomerShowroomFromSupabase(acct, activeCustomer.name);

      if (cloudRes.success && (cloudRes.locations.length > 0 || cloudRes.room)) {
        setCloudRoomMeta(cloudRes.room);

        // Room shape from database
        let loadedShape: RoomShape = 'l-shaped';
        if (cloudRes.room?.room_shape) {
          const s = cloudRes.room.room_shape.toLowerCase();
          if (s.includes('l-shaped') || s.includes('l shaped')) loadedShape = 'l-shaped';
          else if (s.includes('oval')) loadedShape = 'oval';
          else if (s.includes('square')) loadedShape = 'square';
          else if (s.includes('rectangle')) loadedShape = 'rectangle';
          setRoomShape(loadedShape);
          onRoomShapeChange?.(loadedShape);
        }

        const newSlots: FloorSlot[] = [];

        // Map Supabase customer_casket_locations rows
        const locSlots: FloorSlot[] = cloudRes.locations.map((loc: any, idx: number) => {
          const isUrn = String(loc.display_type || '').toLowerCase().includes('urn') || 
                        String(loc.category || '').toLowerCase().includes('urn') ||
                        String(loc.bay_label || '').toLowerCase().includes('urn') ||
                        String(loc.product_name || '').toLowerCase().includes('urn') ||
                        String(loc.wall_zone || '').toLowerCase().includes('urn');

          const bayNum = Number(loc.bay_number) || (idx + 1);
          const lvlNum = Number(loc.level_number) || (String(loc.tier_level || '').toLowerCase().includes('top') ? 2 : 1);
          const isDouble = Boolean(loc.is_double_rack || String(loc.rack_type || '').toLowerCase().includes('double') || lvlNum > 1);

          // Find product in catalog if available
          const matchedProd = products.find(p => p.code === loc.product_code);

          const slotId = isUrn
            ? `urn-shelf-${bayNum}-lvl-${lvlNum}-${loc.shelf_slot_position || 1}-${loc.product_code || idx}`
            : `casket-bay-${bayNum}-lvl-${lvlNum}`;

          return {
            id: slotId,
            slotNumber: bayNum,
            label: loc.bay_label || (isUrn ? `Urn Wall - Shelf ${lvlNum}` : `Bay ${bayNum}${isDouble ? (lvlNum === 2 ? ' (Top)' : ' (Bottom)') : ''}`),
            type: (isUrn ? 'urn' : 'casket') as 'casket' | 'urn',
            isDoubleRack: isDouble,
            rackType: loc.rack_type || (isDouble ? 'double' : (isUrn ? 'urn-shelf' : 'single')),
            levelNumber: lvlNum,
            tierLevel: loc.tier_level || (isDouble ? (lvlNum === 2 ? 'Double Rack - Top' : 'Double Rack - Bottom') : `Shelf ${lvlNum}`),
            shelfSlotPosition: Number(loc.shelf_slot_position) || 1,
            wallZone: loc.wall_zone || (bayNum <= 3 ? 'North Wall' : 'East Wall'),
            posX: Number(loc.pos_x_ft) || (bayNum === 1 ? 5.5 : bayNum === 2 ? 14.5 : bayNum === 3 ? 23.5 : bayNum === 4 ? 26.5 : bayNum === 5 ? 26.5 : 14.5),
            posY: Number(loc.pos_y_ft) || (bayNum <= 3 ? 18.0 : bayNum === 4 ? 6.0 : bayNum === 5 ? 15.5 : 2.0),
            notes: loc.notes,
            productId: matchedProd?.id,
            productCode: loc.product_code || matchedProd?.code,
            productName: loc.product_name || matchedProd?.name || 'Unassigned',
            category: loc.category || matchedProd?.category || (isUrn ? 'Urns & Keepsakes' : 'Burial'),
            wholesalePrice: matchedProd?.wholesalePrice || (isUrn ? 250 : 1200),
            imageUrl: matchedProd?.imageUrl,
          };
        });

        newSlots.push(...locSlots);

        setSlots(newSlots);
        if (newSlots.length > 0) {
          // Default selection to Bay 1 Top or first slot
          const topSlot = newSlots.find(s => s.slotNumber === 1 && s.levelNumber === 2) || newSlots[0];
          setSelectedSlotId(topSlot.id);
        }

        setCloudStatusMsg({
          type: 'success',
          text: `Loaded from Supabase: ${cloudRes.locations.length} models for ${activeCustomer.name} (${cloudRes.room?.room_shape || 'L-Shaped'} Room: 28ft × 19.5ft)`
        });

        const plan: CustomerFloorPlan = {
          customerId: activeCustomer.id,
          customerName: activeCustomer.name,
          roomShape: loadedShape,
          roomCapacity,
          slots: newSlots,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`batesville_floorplan_${activeCustomer.id}`, JSON.stringify(plan));
        return;
      }

      // Fallback
      if (!forceCloud) {
        const storageKey = `batesville_floorplan_${activeCustomer.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed: CustomerFloorPlan = JSON.parse(saved);
            setRoomShape(parsed.roomShape || 'l-shaped');
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
      }

      generateDefaultLayout(roomShape, roomCapacity);
    } catch (err: any) {
      console.error('Error loading cloud showroom:', err);
      generateDefaultLayout(roomShape, roomCapacity);
      setCloudStatusMsg({
        type: 'error',
        text: `Failed to load cloud showroom: ${err.message}`
      });
    } finally {
      setIsCloudLoading(false);
    }
  }, [activeCustomer, products, roomShape, roomCapacity, generateDefaultLayout, onRoomShapeChange]);

  useEffect(() => {
    if (activeCustomer) {
      loadCustomerFloorPlan();
    }
  }, [activeCustomer?.id, loadCustomerFloorPlan]);

  // Handle changing shape or capacity
  const handleConfigChange = (newShape: RoomShape, newCapacity: RoomCapacity) => {
    setRoomShape(newShape);
    setRoomCapacity(newCapacity);
    generateDefaultLayout(newShape, newCapacity);
    onRoomShapeChange?.(newShape);
  };

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

  // Save current floor plan back to Supabase
  const handleSaveToCloud = async () => {
    if (!activeCustomer) return;
    setIsCloudSaving(true);
    setCloudStatusMsg(null);
    try {
      const acct = String(activeCustomer.accountNumber || activeCustomer.code || '');
      const res = await saveCustomerShowroomToSupabase(
        acct,
        activeCustomer.name,
        {
          room_name: cloudRoomMeta?.room_name || 'Main Selection Room',
          room_shape: 'L-Shaped',
          length_ft: cloudRoomMeta?.length_ft || 28,
          width_ft: cloudRoomMeta?.width_ft || 19.5,
          max_casket_bays: 10,
          notes: cloudRoomMeta?.notes || 'Urn Wall on the left side of the upside down L-Shaped Room, All caskets are currently on DOUBLE RACKS.'
        },
        slots
      );

      if (res.success) {
        setCloudStatusMsg({ type: 'success', text: res.message });
        const accounts = await fetchAccountsWithShowroomLocations();
        setCloudAccounts(accounts);
      } else {
        setCloudStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setCloudStatusMsg({ type: 'error', text: err.message || 'Failed to save to Supabase.' });
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleUpdateSlotRackConfig = (slotId: string, updates: Partial<FloorSlot>) => {
    setSlots(prev => {
      const updated = prev.map(s => {
        if (s.id === slotId) {
          return { ...s, ...updates };
        }
        return s;
      });
      savePlan(updated);
      return updated;
    });
  };

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

  // Find siblings in the same bay
  const baySiblingSlots = useMemo(() => {
    if (!activeSlot) return [];
    return slots.filter(s => s.type === activeSlot.type && s.slotNumber === activeSlot.slotNumber);
  }, [activeSlot, slots]);

  // Group casket slots by bay number
  const casketBays = useMemo(() => {
    const bayMap = new Map<number, FloorSlot[]>();
    slots.filter(s => s.type === 'casket').forEach(slot => {
      const existing = bayMap.get(slot.slotNumber) || [];
      existing.push(slot);
      bayMap.set(slot.slotNumber, existing);
    });

    return Array.from(bayMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [slots]);

  // Group urn slots by shelf tier (Levels 1, 2, 3)
  const urnShelves = useMemo(() => {
    const urnList = slots.filter(s => s.type === 'urn');
    const lvl1 = urnList.filter(s => s.levelNumber === 1);
    const lvl2 = urnList.filter(s => s.levelNumber === 2);
    const lvl3 = urnList.filter(s => s.levelNumber === 3);
    return {
      all: urnList,
      level1: lvl1,
      level2: lvl2,
      level3: lvl3,
      totalCount: urnList.length
    };
  }, [slots]);

  // Smart suggestion for currently inspected slot
  const smartSuggestion = useMemo(() => {
    if (!activeSlot) return null;
    const isUrn = activeSlot.type === 'urn';
    const topList = isUrn ? regionalRankings.topUrns : regionalRankings.topCaskets;

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

  // Helper to select a bay on the blueprint
  const handleSelectBay = (bayNumber: number) => {
    const baySlots = slots.filter(s => s.slotNumber === bayNumber);
    if (baySlots.length > 0) {
      // Pick top rack (level 2) or first
      const top = baySlots.find(s => s.levelNumber === 2) || baySlots[0];
      setSelectedSlotId(top.id);
    }
  };

  // Helper to find slots for bay number
  const getBaySlots = (bayNum: number) => {
    return slots.filter(s => s.slotNumber === bayNum);
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
                Architectural 2D Engine
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              True architectural blueprint mapped to {activeCustomer?.name}'s actual 28ft × 19.5ft L-Shaped showroom & Supabase placements.
            </p>
          </div>
        </div>

        {/* Customer Dropdown Selector, Cloud Sync & Print Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shadow-sm pr-8"
            >
              {customers.map(c => {
                const acct = String(c.accountNumber || c.code || '').trim();
                const isCloud = cloudAccounts.includes(acct);
                return (
                  <option key={c.id} value={c.id}>
                    {isCloud ? '☁️ ' : ''}{c.name} ({acct}){isCloud ? ' [Cloud Showroom]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => loadCustomerFloorPlan(true)}
            disabled={isCloudLoading}
            title="Refresh floor plan from Supabase customer_casket_locations"
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCloudLoading ? 'animate-spin' : ''}`} />
            <span>{isCloudLoading ? 'Syncing...' : 'Sync Cloud DB'}</span>
          </button>

          <button
            onClick={handleSaveToCloud}
            disabled={isCloudSaving}
            title="Save floor plan changes to Supabase"
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className={`w-4 h-4 text-emerald-400 ${isCloudSaving ? 'animate-pulse' : ''}`} />
            <span>{isCloudSaving ? 'Saving...' : 'Save to Cloud'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Layout</span>
          </button>
        </div>
      </div>

      {/* Cloud Showroom Status Banner */}
      {cloudStatusMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs animate-fadeIn ${
          cloudStatusMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : cloudStatusMsg.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            {cloudStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : cloudStatusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-medium">{cloudStatusMsg.text}</span>
          </div>
          <button 
            onClick={() => setCloudStatusMsg(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Room Specification Bar with Real Dimensions */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-slate-50 border border-amber-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Main Selection Room</span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase tracking-wider">
                L-Shaped Blueprint
              </span>
              <span className="text-xs font-semibold text-slate-700">
                28.0 ft (North) × 19.5 ft (East Wall - Longest)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 italic mt-0.5">
              "Urn Wall on the left side of the upside down L-Shaped Room, All caskets are currently on DOUBLE RACKS."
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">North Wall: </span>
            <span className="font-bold text-slate-900">28.0 ft</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">East Wall: </span>
            <span className="font-bold text-slate-900">19.5 ft (Longest)</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">West Wall: </span>
            <span className="font-bold text-slate-900">13.5 ft (Lower Area)</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">Higher Area: </span>
            <span className="font-bold text-slate-900">6.0 ft</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">Area: </span>
            <span className="font-bold text-slate-900">546 sq ft</span>
          </div>
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
          
          {/* Layout Controls & View Mode Toolbar */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm text-xs">
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-bold">Display Mode:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('blueprint')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'blueprint'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>📐 Architectural 2D Plan (28ft × 19.5ft)</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>▦ Bay Cards Matrix</span>
                </button>
              </div>
            </div>

            {/* Shape Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Shape:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['l-shaped', 'rectangle'] as RoomShape[]).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => handleConfigChange(shape, roomCapacity)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      roomShape === shape
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {shape === 'l-shaped' ? 'L-Shaped' : shape}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Room Canvas */}
          <div className="bg-white border-2 border-slate-300 rounded-3xl p-4 sm:p-6 shadow-md relative min-h-[580px] flex flex-col justify-between overflow-hidden">
            
            {/* Compass & North Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-700 uppercase tracking-wider">
                  28.0 FT NORTH × 19.5 FT EAST (546 SQ FT) • 5 DOUBLE RACK BAYS • 14 URNS (BAY 6)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Top Seller</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Steady</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Stagnant</span>
              </div>
            </div>

            {/* VIEW 1: ARCHITECTURAL 2D SCALED BLUEPRINT CANVAS */}
            {viewMode === 'blueprint' && (
              <div className="relative w-full flex-1 flex flex-col items-center justify-center p-2 overflow-auto">
                <svg
                  viewBox="0 0 940 680"
                  className="w-full max-w-[880px] h-auto drop-shadow-sm select-none"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <defs>
                    {/* Blueprint Grid Pattern */}
                    <pattern id="cadGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                      <rect width="28" height="28" fill="#f8fafc" />
                      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                    </pattern>
                    
                    {/* Dimension Arrows */}
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#475569" />
                    </marker>
                    
                    {/* Selected Bay Glow Filter */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Room Floor Background */}
                  <rect x="0" y="0" width="940" height="680" fill="#ffffff" />
                  
                  {/* Inside Room Floor with CAD Grid */}
                  <path
                    d={`
                      M 80 60
                      H 864
                      V 606
                      H 616
                      M 504 606
                      H 416
                      V 228
                      H 80
                      Z
                    `}
                    fill="url(#cadGrid)"
                    stroke="none"
                  />

                  {/* DIMENSION LINES & LABELS */}
                  {/* 1. North Wall: 28.0 ft */}
                  <g>
                    <line x1="80" y1="30" x2="864" y2="30" stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <rect x="400" y="18" width="144" height="22" rx="4" fill="#0f172a" />
                    <text x="472" y="33" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" letterSpacing="0.05em">
                      ← 28.0 FT NORTH WALL →
                    </text>
                  </g>

                  {/* 2. East Wall: 19.5 ft (Longest) */}
                  <g>
                    <line x1="895" y1="60" x2="895" y2="606" stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <g transform="translate(900, 333) rotate(90)">
                      <rect x="-105" y="-12" width="210" height="22" rx="4" fill="#0f172a" />
                      <text x="0" y="3" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                        ← 19.5 FT EAST WALL (LONGEST) →
                      </text>
                    </g>
                  </g>

                  {/* 3. West Wall (Lower Area): 13.5 ft */}
                  <g>
                    <line x1="380" y1="228" x2="380" y2="606" stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <g transform="translate(375, 417) rotate(-90)">
                      <rect x="-85" y="-12" width="170" height="22" rx="4" fill="#0f172a" />
                      <text x="0" y="3" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                        ← 13.5 FT WEST WALL →
                      </text>
                    </g>
                  </g>

                  {/* 4. Higher Area (Upper Wing): 6.0 ft */}
                  <g>
                    <line x1="45" y1="60" x2="45" y2="228" stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                    <g transform="translate(40, 144) rotate(-90)">
                      <rect x="-55" y="-12" width="110" height="22" rx="4" fill="#0f172a" />
                      <text x="0" y="3" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                        ← 6.0 FT →
                      </text>
                    </g>
                  </g>

                  {/* ARCHITECTURAL WALLS (Deep Slate #1e293b, 8px width) */}
                  {/* North Wall */}
                  <line x1="80" y1="60" x2="864" y2="60" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* East Wall (19.5 ft) */}
                  <line x1="864" y1="60" x2="864" y2="606" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* South Wall (East Segment) */}
                  <line x1="864" y1="606" x2="616" y2="606" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Main Entrance Doorway Opening (4 ft gap) */}
                  <path d="M 616 606 A 112 112 0 0 1 504 494" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 3" />
                  <line x1="616" y1="606" x2="504" y2="494" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
                  <text x="560" y="630" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold" letterSpacing="0.05em">
                    ▼ MAIN CLIENT ENTRANCE (4 FT) ▼
                  </text>

                  {/* South Wall (West Segment) */}
                  <line x1="504" y1="606" x2="416" y2="606" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Center Divider / Peninsula Wall dropping down from Ceiling */}
                  <line x1="416" y1="228" x2="416" y2="550" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />

                  {/* West Wall of Lower Room (13.5 ft) */}
                  <line x1="416" y1="606" x2="416" y2="228" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Horizontal Transition Wall at L-Corner */}
                  <line x1="416" y1="228" x2="260" y2="228" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Upper Wing Door Opening */}
                  <path d="M 260 228 A 70 70 0 0 1 190 158" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="260" y1="228" x2="190" y2="158" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="190" y1="228" x2="80" y2="228" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Far Left Wall of Upper Wing */}
                  <line x1="80" y1="228" x2="80" y2="60" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />

                  {/* Center Room Feature: Family Arrangement Table */}
                  <g transform="translate(640, 360)">
                    <circle cx="0" cy="0" r="38" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2" />
                    <circle cx="0" cy="0" r="22" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x="0" y="3" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold">CONSULTATION</text>
                    <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7">KIOSK & TABLE</text>
                  </g>

                  {/* ============================================================== */}
                  {/* CASKET DOUBLE RACKS POSITIONED ON WALLS                        */}
                  {/* ============================================================== */}

                  {/* BAY 1: NORTH WALL (Left) - X: 5.5 ft, Y: 18.0 ft */}
                  {(() => {
                    const baySlots = getBaySlots(1);
                    const top = baySlots.find(s => s.levelNumber === 2);
                    const btm = baySlots.find(s => s.levelNumber === 1);
                    const isSelected = selectedSlotId === top?.id || selectedSlotId === btm?.id;

                    return (
                      <g 
                        onClick={() => handleSelectBay(1)}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        {/* Rack Outline */}
                        <rect 
                          x="136" y="68" width="196" height="66" rx="8" 
                          fill={isSelected ? "#fffbeb" : "#ffffff"} 
                          stroke={isSelected ? "#f59e0b" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "3" : "1.5"} 
                        />
                        {/* Header Badge */}
                        <rect x="144" y="74" width="180" height="15" rx="3" fill="#fef3c7" />
                        <text x="148" y="85" fill="#92400e" fontSize="9" fontWeight="bold">
                          BAY 1 • DOUBLE RACK (NORTH WALL)
                        </text>
                        {/* Top Tier (Level 2): FERGUS PC */}
                        <rect x="144" y="93" width="180" height="17" rx="3" fill="#fafaf9" stroke="#e7e5e4" />
                        <rect x="146" y="95" width="28" height="13" rx="2" fill="#d97706" />
                        <text x="160" y="104" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">TOP</text>
                        <text x="180" y="105" fill="#1c1917" fontSize="9" fontWeight="bold">
                          {top?.productName || 'FERGUS PC'}
                        </text>
                        <text x="318" y="105" textAnchor="end" fill="#78716c" fontSize="8" fontFamily="monospace">
                          {top?.productCode || '52-417-103'}
                        </text>
                        {/* Bottom Tier (Level 1): A21 879 DH Neopolitan Blue */}
                        <rect x="144" y="113" width="180" height="17" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                        <rect x="146" y="115" width="28" height="13" rx="2" fill="#334155" />
                        <text x="160" y="124" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">BTM</text>
                        <text x="180" y="125" fill="#1e293b" fontSize="8.5" fontWeight="bold">
                          {btm?.productName || 'A21 879 DH Neopolitan'}
                        </text>
                        <text x="318" y="125" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                          {btm?.productCode || '147719'}
                        </text>
                      </g>
                    );
                  })()}

                  {/* BAY 2: NORTH WALL (Center-Left) - X: 14.5 ft, Y: 18.0 ft */}
                  {(() => {
                    const baySlots = getBaySlots(2);
                    const top = baySlots.find(s => s.levelNumber === 2);
                    const btm = baySlots.find(s => s.levelNumber === 1);
                    const isSelected = selectedSlotId === top?.id || selectedSlotId === btm?.id;

                    return (
                      <g 
                        onClick={() => handleSelectBay(2)}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        <rect 
                          x="388" y="68" width="196" height="66" rx="8" 
                          fill={isSelected ? "#fffbeb" : "#ffffff"} 
                          stroke={isSelected ? "#f59e0b" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "3" : "1.5"} 
                        />
                        <rect x="396" y="74" width="180" height="15" rx="3" fill="#fef3c7" />
                        <text x="400" y="85" fill="#92400e" fontSize="9" fontWeight="bold">
                          BAY 2 • DOUBLE RACK (NORTH WALL)
                        </text>
                        {/* Top Tier */}
                        <rect x="396" y="93" width="180" height="17" rx="3" fill="#fafaf9" stroke="#e7e5e4" />
                        <rect x="398" y="95" width="28" height="13" rx="2" fill="#d97706" />
                        <text x="412" y="104" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">TOP</text>
                        <text x="432" y="105" fill="#1c1917" fontSize="9" fontWeight="bold">
                          {top?.productName || 'DIGBY PC'}
                        </text>
                        <text x="570" y="105" textAnchor="end" fill="#78716c" fontSize="8" fontFamily="monospace">
                          {top?.productCode || '32-62-12'}
                        </text>
                        {/* Bottom Tier */}
                        <rect x="396" y="113" width="180" height="17" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                        <rect x="398" y="115" width="28" height="13" rx="2" fill="#334155" />
                        <text x="412" y="124" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">BTM</text>
                        <text x="432" y="125" fill="#1e293b" fontSize="8.5" fontWeight="bold">
                          {btm?.productName || 'JF9 825 CDH Golden'}
                        </text>
                        <text x="570" y="125" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                          {btm?.productCode || '185487'}
                        </text>
                      </g>
                    );
                  })()}

                  {/* BAY 3: NORTH WALL (Center-Right) - X: 23.5 ft, Y: 18.0 ft */}
                  {(() => {
                    const baySlots = getBaySlots(3);
                    const top = baySlots.find(s => s.levelNumber === 2);
                    const btm = baySlots.find(s => s.levelNumber === 1);
                    const isSelected = selectedSlotId === top?.id || selectedSlotId === btm?.id;

                    return (
                      <g 
                        onClick={() => handleSelectBay(3)}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        <rect 
                          x="640" y="68" width="196" height="66" rx="8" 
                          fill={isSelected ? "#fffbeb" : "#ffffff"} 
                          stroke={isSelected ? "#f59e0b" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "3" : "1.5"} 
                        />
                        <rect x="648" y="74" width="180" height="15" rx="3" fill="#fef3c7" />
                        <text x="652" y="85" fill="#92400e" fontSize="9" fontWeight="bold">
                          BAY 3 • DOUBLE RACK (NORTH WALL)
                        </text>
                        {/* Top Tier */}
                        <rect x="648" y="93" width="180" height="17" rx="3" fill="#fafaf9" stroke="#e7e5e4" />
                        <rect x="650" y="95" width="28" height="13" rx="2" fill="#d97706" />
                        <text x="664" y="104" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">TOP</text>
                        <text x="684" y="105" fill="#1c1917" fontSize="9" fontWeight="bold">
                          {top?.productName || 'ASHTON PC'}
                        </text>
                        <text x="822" y="105" textAnchor="end" fill="#78716c" fontSize="8" fontFamily="monospace">
                          {top?.productCode || '32-1062-28'}
                        </text>
                        {/* Bottom Tier */}
                        <rect x="648" y="113" width="180" height="17" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                        <rect x="650" y="115" width="28" height="13" rx="2" fill="#334155" />
                        <text x="664" y="124" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">BTM</text>
                        <text x="684" y="125" fill="#1e293b" fontSize="8.5" fontWeight="bold">
                          {btm?.productName || 'MONARCH SANDSTONE'}
                        </text>
                        <text x="822" y="125" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                          {btm?.productCode || '71007964'}
                        </text>
                      </g>
                    );
                  })()}

                  {/* BAY 5: EAST WALL (Upper Section) - X: 26.5 ft, Y: 15.5 ft */}
                  {(() => {
                    const baySlots = getBaySlots(5);
                    const top = baySlots.find(s => s.levelNumber === 2);
                    const btm = baySlots.find(s => s.levelNumber === 1);
                    const isSelected = selectedSlotId === top?.id || selectedSlotId === btm?.id;

                    return (
                      <g 
                        onClick={() => handleSelectBay(5)}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        <rect 
                          x="770" y="152" width="88" height="200" rx="8" 
                          fill={isSelected ? "#fffbeb" : "#ffffff"} 
                          stroke={isSelected ? "#f59e0b" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "3" : "1.5"} 
                        />
                        <rect x="775" y="158" width="78" height="16" rx="3" fill="#fef3c7" />
                        <text x="814" y="169" textAnchor="middle" fill="#92400e" fontSize="8.5" fontWeight="bold">
                          BAY 5 (EAST)
                        </text>
                        {/* Top Tier */}
                        <g transform="translate(775, 180)">
                          <rect width="78" height="80" rx="4" fill="#fafaf9" stroke="#e7e5e4" />
                          <rect x="4" y="4" width="26" height="12" rx="2" fill="#d97706" />
                          <text x="17" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">TOP</text>
                          <text x="4" y="30" fill="#1c1917" fontSize="8" fontWeight="bold">
                            {top?.productName?.slice(0, 14) || 'BASIC SHELL'}
                          </text>
                          <text x="4" y="42" fill="#78716c" fontSize="7.5" fontFamily="monospace">
                            {top?.productCode || '79-5055-01'}
                          </text>
                        </g>
                        {/* Bottom Tier */}
                        <g transform="translate(775, 266)">
                          <rect width="78" height="80" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                          <rect x="4" y="4" width="26" height="12" rx="2" fill="#334155" />
                          <text x="17" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">BTM</text>
                          <text x="4" y="30" fill="#1e293b" fontSize="8" fontWeight="bold">
                            {btm?.productName?.slice(0, 14) || 'MDF Box'}
                          </text>
                          <text x="4" y="42" fill="#64748b" fontSize="7.5" fontFamily="monospace">
                            {btm?.productCode || '245435'}
                          </text>
                        </g>
                      </g>
                    );
                  })()}

                  {/* BAY 4: EAST WALL (Lower Section) - X: 26.5 ft, Y: 6.0 ft */}
                  {(() => {
                    const baySlots = getBaySlots(4);
                    const top = baySlots.find(s => s.levelNumber === 2);
                    const btm = baySlots.find(s => s.levelNumber === 1);
                    const isSelected = selectedSlotId === top?.id || selectedSlotId === btm?.id;

                    return (
                      <g 
                        onClick={() => handleSelectBay(4)}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        <rect 
                          x="770" y="366" width="88" height="200" rx="8" 
                          fill={isSelected ? "#fffbeb" : "#ffffff"} 
                          stroke={isSelected ? "#f59e0b" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "3" : "1.5"} 
                        />
                        <rect x="775" y="372" width="78" height="16" rx="3" fill="#fef3c7" />
                        <text x="814" y="383" textAnchor="middle" fill="#92400e" fontSize="8.5" fontWeight="bold">
                          BAY 4 (EAST)
                        </text>
                        {/* Top Tier */}
                        <g transform="translate(775, 394)">
                          <rect width="78" height="80" rx="4" fill="#fafaf9" stroke="#e7e5e4" />
                          <rect x="4" y="4" width="26" height="12" rx="2" fill="#d97706" />
                          <text x="17" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">TOP</text>
                          <text x="4" y="30" fill="#1c1917" fontSize="8" fontWeight="bold">
                            {top?.productName?.slice(0, 14) || 'HOMEWARD PC'}
                          </text>
                          <text x="4" y="42" fill="#78716c" fontSize="7.5" fontFamily="monospace">
                            {top?.productCode || '52-5410-00'}
                          </text>
                        </g>
                        {/* Bottom Tier */}
                        <g transform="translate(775, 480)">
                          <rect width="78" height="80" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                          <rect x="4" y="4" width="26" height="12" rx="2" fill="#334155" />
                          <text x="17" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">BTM</text>
                          <text x="4" y="30" fill="#1e293b" fontSize="8" fontWeight="bold">
                            {btm?.productName?.slice(0, 14) || 'WINSTON-100'}
                          </text>
                          <text x="4" y="42" fill="#64748b" fontSize="7.5" fontFamily="monospace">
                            {btm?.productCode || '110951'}
                          </text>
                        </g>
                      </g>
                    );
                  })()}

                  {/* ============================================================== */}
                  {/* BAY 6: URN WALL AT CENTER PENINSULA (3 TIERS • 14 URNS)       */}
                  {/* ============================================================== */}
                  {(() => {
                    const isSelected = slots.some(s => s.type === 'urn' && s.id === selectedSlotId);

                    return (
                      <g 
                        onClick={() => {
                          const urn = urnShelves.all[0];
                          if (urn) setSelectedSlotId(urn.id);
                        }}
                        className="cursor-pointer group"
                        filter={isSelected ? "url(#glow)" : undefined}
                      >
                        {/* Peninsula Base Anchor */}
                        <rect x="360" y="525" width="112" height="76" rx="8" fill="#faf5ff" stroke="#c084fc" strokeWidth={isSelected ? "3" : "1.5"} />
                        
                        {/* Header Banner */}
                        <rect x="365" y="530" width="102" height="16" rx="3" fill="#7e22ce" />
                        <text x="416" y="541" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                          ✨ URN WALL (BAY 6)
                        </text>

                        {/* Shelf 3 (Top) */}
                        <rect x="365" y="550" width="102" height="13" rx="2" fill="#f3e8ff" />
                        <text x="370" y="560" fill="#6b21a8" fontSize="7.5" fontWeight="bold">TIER 3 (TOP):</text>
                        <text x="462" y="560" textAnchor="end" fill="#7e22ce" fontSize="7.5" fontWeight="bold">
                          {urnShelves.level3.length || 4} Urns
                        </text>

                        {/* Shelf 2 (Middle) */}
                        <rect x="365" y="566" width="102" height="13" rx="2" fill="#ede9fe" />
                        <text x="370" y="576" fill="#5b21b6" fontSize="7.5" fontWeight="bold">TIER 2 (MID):</text>
                        <text x="462" y="576" textAnchor="end" fill="#6d28d9" fontSize="7.5" fontWeight="bold">
                          {urnShelves.level2.length || 5} Urns
                        </text>

                        {/* Shelf 1 (Bottom) */}
                        <rect x="365" y="582" width="102" height="13" rx="2" fill="#ddd6fe" />
                        <text x="370" y="592" fill="#4c1d95" fontSize="7.5" fontWeight="bold">TIER 1 (BTM):</text>
                        <text x="462" y="592" textAnchor="end" fill="#5b21b6" fontSize="7.5" fontWeight="bold">
                          {urnShelves.level1.length || 5} Urns
                        </text>
                      </g>
                    );
                  })()}

                </svg>

                {/* Blueprint Instructions Helper */}
                <div className="mt-3 flex items-center justify-between w-full max-w-[880px] px-2 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Click any Double Rack or Urn Wall on the blueprint to inspect model details & sales.</span>
                  </div>
                  <span className="font-mono text-slate-400">Scale: 1 ft = 28 px • Exact Wall Proportions</span>
                </div>
              </div>
            )}

            {/* VIEW 2: DETAILED BAY CARDS MATRIX GRID */}
            {viewMode === 'cards' && (
              <div className="flex-1 flex flex-col justify-center">
                
                {/* Casket Bays Section */}
                <div className="mb-6">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-amber-600" />
                      <span>Casket Floor Bays ({casketBays.length} Bays • {slots.filter(s => s.type === 'casket').length} Models)</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-400">
                      Click any bay or tier to inspect
                    </span>
                  </div>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {casketBays.map(([bayNumber, baySlots]) => {
                      const isDouble = baySlots.length > 1 || baySlots.some(s => s.isDoubleRack);
                      const sorted = [...baySlots].sort((a, b) => (Number(b.levelNumber) || 1) - (Number(a.levelNumber) || 1));
                      const topSlot = sorted.find(s => s.levelNumber === 2) || sorted[0];
                      const btmSlot = sorted.find(s => s.levelNumber === 1 && s.id !== topSlot.id) || (sorted.length > 1 ? sorted[1] : null);

                      const isAnySelected = selectedSlotId === topSlot.id || (btmSlot && selectedSlotId === btmSlot.id);
                      const bayLabel = topSlot.label?.replace(/\s*\((Top|Bottom)\)/i, '') || `Bay ${bayNumber}`;

                      return (
                        <div
                          key={`bay-${bayNumber}`}
                          className={`p-3 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                            isAnySelected
                              ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 overflow-hidden pr-1">
                              <span className="text-[11px] font-mono font-bold text-slate-800 truncate">
                                {bayLabel}
                              </span>
                              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-300">
                                <Layers className="w-2.5 h-2.5 text-amber-700" />
                                <span>Double Rack</span>
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">
                              {topSlot.wallZone || (bayNumber <= 3 ? 'North wall' : 'East wall')}
                            </span>
                          </div>

                          {/* Top Tier Sub-Card */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSlotId(topSlot.id);
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer mb-2 ${
                              selectedSlotId === topSlot.id
                                ? 'border-amber-600 bg-amber-100/70 shadow-xs ring-1 ring-amber-400'
                                : 'border-slate-200 bg-slate-50/70 hover:bg-amber-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-700 text-white">
                                TOP TIER
                              </span>
                              {topSlot.productCode && (
                                <span className="text-[9px] font-mono text-slate-600 font-semibold">
                                  SKU: {topSlot.productCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                {topSlot.imageUrl ? (
                                  <img src={topSlot.imageUrl} alt={topSlot.productName} className="w-full h-full object-cover" />
                                ) : (
                                  <Box className="w-5 h-5 text-amber-700" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-serif font-bold text-xs text-slate-900 block truncate" title={topSlot.productName}>
                                  {topSlot.productName || 'Unassigned'}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {topSlot.category || 'Burial - Wood'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Tier Sub-Card */}
                          {btmSlot && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSlotId(btmSlot.id);
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                selectedSlotId === btmSlot.id
                                  ? 'border-amber-600 bg-amber-100/70 shadow-xs ring-1 ring-amber-400'
                                  : 'border-slate-200 bg-slate-50/70 hover:bg-amber-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-700 text-white">
                                  BOTTOM TIER
                                </span>
                                {btmSlot.productCode && (
                                  <span className="text-[9px] font-mono text-slate-600 font-semibold">
                                    SKU: {btmSlot.productCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                  {btmSlot.imageUrl ? (
                                    <img src={btmSlot.imageUrl} alt={btmSlot.productName} className="w-full h-full object-cover" />
                                  ) : (
                                    <Box className="w-5 h-5 text-slate-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-serif font-bold text-xs text-slate-900 block truncate" title={btmSlot.productName}>
                                    {btmSlot.productName || 'Unassigned'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block truncate">
                                    {btmSlot.category || 'Burial - Metal'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Position:</span>
                            <span className="font-mono text-slate-600 font-bold">
                              {topSlot.wallZone || 'North Wall'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Urn Wall Section */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-[10px] font-bold text-purple-900 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Bay 6 - Urn Wall Feature (3 Tiers • {urnShelves.totalCount} Urns)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Center Peninsula Divider
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {urnShelves.all.map(slot => {
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50 shadow-sm ring-2 ring-purple-400/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 text-[9px]">
                            <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              Lvl {slot.levelNumber || 1}
                            </span>
                            <span className="font-mono text-slate-400 text-[8px]">
                              {slot.productCode}
                            </span>
                          </div>

                          <div className="w-full h-10 rounded bg-slate-100 overflow-hidden mb-1 flex items-center justify-center">
                            {slot.imageUrl ? (
                              <img src={slot.imageUrl} alt={slot.productName} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-400" />
                            )}
                          </div>

                          <span className="text-[10px] font-serif font-bold text-slate-900 truncate block" title={slot.productName}>
                            {slot.productName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

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
                    {activeSlot.wallZone || 'Floor Plan'} • {activeSlot.type} Display Position
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

              {/* Quick Switcher for Sibling Levels in Double Rack */}
              {baySiblingSlots.length > 1 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <Layers className="w-4 h-4 text-amber-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Double Rack Bay #{activeSlot.slotNumber}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 font-bold">
                      {activeSlot.levelNumber === 2 ? 'Inspecting Top Rack' : 'Inspecting Bottom Rack'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {baySiblingSlots
                      .sort((a, b) => (Number(b.levelNumber) || 1) - (Number(a.levelNumber) || 1))
                      .map(sib => (
                        <button
                          key={sib.id}
                          onClick={() => setSelectedSlotId(sib.id)}
                          className={`p-2 rounded-lg text-left transition-all cursor-pointer border ${
                            selectedSlotId === sib.id
                              ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                              : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                            <span>{sib.levelNumber === 2 ? 'TOP RACK' : 'BOTTOM RACK'}</span>
                            <span className={`font-mono text-[9px] ${selectedSlotId === sib.id ? 'text-amber-200' : 'text-slate-500'}`}>
                              {sib.productCode || 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs font-serif font-bold truncate">
                            {sib.productName || 'Unassigned'}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

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
                    SKU: {activeSlot.productCode || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-lg font-bold text-slate-900">
                    {activeSlot.productName || 'Unassigned Model'}
                  </h4>
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    {activeSlot.category || 'Selection Room Display'}
                  </p>
                  {activeSlot.notes && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1 font-mono">
                      Note: {activeSlot.notes}
                    </p>
                  )}
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

              {/* Display & Rack Configuration */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-800">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">
                      {activeSlot.type === 'casket' ? 'Casket Rack Option' : 'Urn Shelf & Multi-Tier'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">
                    {activeSlot.tierLevel || (activeSlot.type === 'casket' ? (activeSlot.isDoubleRack ? 'Double Rack' : 'Single Floor') : 'Shelf 1')}
                  </span>
                </div>

                {activeSlot.type === 'casket' ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateSlotRackConfig(activeSlot.id, {
                          isDoubleRack: false,
                          rackType: 'single',
                          levelNumber: 1,
                          tierLevel: 'Floor'
                        })}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          !activeSlot.isDoubleRack
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Single Floor Rack
                      </button>
                      <button
                        onClick={() => handleUpdateSlotRackConfig(activeSlot.id, {
                          isDoubleRack: true,
                          rackType: 'double',
                          levelNumber: 2,
                          tierLevel: 'Double Rack - Top'
                        })}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          activeSlot.isDoubleRack
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Double Rack (2-Tier)
                      </button>
                    </div>

                    {activeSlot.isDoubleRack && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                          Current Rack Level:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUpdateSlotRackConfig(activeSlot.id, {
                              levelNumber: 2,
                              tierLevel: 'Double Rack - Top'
                            })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              activeSlot.levelNumber === 2
                                ? 'bg-amber-700 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-amber-100/50 border border-amber-200'
                            }`}
                          >
                            Top Rack (Level 2)
                          </button>
                          <button
                            onClick={() => handleUpdateSlotRackConfig(activeSlot.id, {
                              levelNumber: 1,
                              tierLevel: 'Double Rack - Bottom'
                            })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              activeSlot.levelNumber === 1
                                ? 'bg-amber-700 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-amber-100/50 border border-amber-200'
                            }`}
                          >
                            Bottom Rack (Level 1)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Urn Shelf Tier (Level 1 to 3):
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => handleUpdateSlotRackConfig(activeSlot.id, {
                              levelNumber: lvl,
                              tierLevel: lvl === 1 ? 'Shelf 1 (Bottom)' : lvl === 3 ? 'Shelf 3 (Top)' : `Shelf ${lvl}`,
                            })}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              (activeSlot.levelNumber || 1) === lvl
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            Lvl {lvl}
                          </button>
                        ))}
                      </div>
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
