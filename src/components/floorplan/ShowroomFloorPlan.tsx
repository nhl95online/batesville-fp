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
  Move,
  Ruler,
  Settings2,
  DoorOpen
} from 'lucide-react';
import { RoomArchitectureModal, RoomArchConfig } from './RoomArchitectureModal';

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

  // Room Architecture & Dimension State
  const [roomArch, setRoomArch] = useState<RoomArchConfig>({
    roomName: 'Main Selection Room',
    shape: initialRoomShape || 'l-shaped',
    lengthFt: 28.0,
    widthFt: 19.5,
    ceilingHeightFt: 11.0,
    door1Wall: 'South',
    door1PosFt: 5.0,
    door1WidthFt: 4.0,
    hasDoor2: false,
    door2Wall: 'North',
    door2PosFt: 8.0,
    door2WidthFt: 3.5,
    hasWing: false,
    wingWall: 'West',
    wingOffsetFt: 2.0,
    wingLengthFt: 8.0,
    wingWidthFt: 6.0,
    lEastLongestFt: 19.5,
    lWestLowerFt: 13.5,
    lWestUpperFt: 6.0,
    lCutoutXFt: 13.5,
    notes: 'Urn Wall on the left side of the upside down L-Shaped Room, All caskets are currently on DOUBLE RACKS.'
  });
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

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

        // Parse optional configuration from room notes if available
        let extraConfig: any = {};
        if (cloudRes.room?.notes) {
          const match = cloudRes.room.notes.match(/<!--CONFIG:\s*(\{.*?\})\s*-->/);
          if (match) {
            try {
              extraConfig = JSON.parse(match[1]);
            } catch (e) {
              console.warn('Failed to parse room notes config', e);
            }
          }
        }

        // Room shape from database
        let loadedShape: RoomShape = 'l-shaped';
        if (cloudRes.room?.room_shape) {
          const s = cloudRes.room.room_shape.toLowerCase();
          if (s.includes('l-shaped') || s.includes('l shaped')) loadedShape = 'l-shaped';
          else if (s.includes('oval')) loadedShape = 'oval';
          else if (s.includes('square')) loadedShape = 'square';
          else if (s.includes('rectangle')) loadedShape = 'rectangle';
        }

        const lEast = extraConfig.lEastLongestFt || Number(cloudRes.room?.width_ft) || 19.5;
        const lLower = extraConfig.lWestLowerFt || 13.5;
        const lUpper = extraConfig.lWestUpperFt || (lEast > lLower ? lEast - lLower : 6.0);

        const parsedArch: RoomArchConfig = {
          roomName: cloudRes.room?.room_name || 'Main Selection Room',
          shape: loadedShape,
          lengthFt: Number(cloudRes.room?.length_ft) || 28.0,
          widthFt: Number(cloudRes.room?.width_ft) || 19.5,
          ceilingHeightFt: Number(cloudRes.room?.ceiling_height_ft) || 11.0,
          door1Wall: (cloudRes.room?.door_wall as any) || 'South',
          door1PosFt: Number(cloudRes.room?.door_pos_ft) || 5.0,
          door1WidthFt: Number(cloudRes.room?.door_width_ft) || 4.0,
          hasDoor2: extraConfig.hasDoor2 ?? false,
          door2Wall: extraConfig.door2Wall || 'North',
          door2PosFt: extraConfig.door2PosFt || 8.0,
          door2WidthFt: extraConfig.door2WidthFt || 3.5,
          hasWing: extraConfig.hasWing ?? false,
          wingWall: extraConfig.wingWall || 'West',
          wingOffsetFt: extraConfig.wingOffsetFt || 2.0,
          wingLengthFt: extraConfig.wingLengthFt || 8.0,
          wingWidthFt: extraConfig.wingWidthFt || 6.0,
          lEastLongestFt: lEast,
          lWestLowerFt: lLower,
          lWestUpperFt: lUpper,
          lCutoutXFt: extraConfig.lCutoutXFt || 13.5,
          notes: cloudRes.room?.notes?.replace(/<!--CONFIG:.*?-->/g, '').trim() || ''
        };

        setRoomArch(parsedArch);
        setRoomShape(loadedShape);
        onRoomShapeChange?.(loadedShape);

        const newSlots: FloorSlot[] = [];

        // Map Supabase customer_casket_locations rows
        const locSlots: FloorSlot[] = cloudRes.locations.map((loc: any, idx: number) => {
          const displayType = String(loc.display_type || '').toLowerCase();
          const category = String(loc.category || '').toLowerCase();
          const bayLabel = String(loc.bay_label || '').toLowerCase();
          const prodName = String(loc.product_name || '').toLowerCase();
          const wallZone = String(loc.wall_zone || '').toLowerCase();

          // Robust Urn detection:
          // Exclude burial/casket explicitly so names like "Gurnet", "Auburn", "Burnished" are never misclassified as urns
          let isUrn = false;
          if (displayType.includes('casket') || category.includes('burial') || category.includes('casket')) {
            isUrn = false;
          } else if (displayType.includes('urn') || category.includes('urn')) {
            isUrn = true;
          } else {
            const urnWordRegex = /\b(urn|urns|keepsake|keepsakes)\b/i;
            isUrn = urnWordRegex.test(bayLabel) || urnWordRegex.test(prodName) || urnWordRegex.test(wallZone);
          }

          const bayNum = Number(loc.bay_number) || (idx + 1);
          const lvlNum = Number(loc.level_number) || (String(loc.tier_level || '').toLowerCase().includes('top') ? 2 : 1);
          
          // Determine if double rack
          const rackTypeStr = String(loc.rack_type || '').toLowerCase();
          const isDouble = !isUrn && (
            loc.is_double_rack === true ||
            (loc.is_double_rack !== false && (rackTypeStr.includes('double') || lvlNum > 1))
          ) && !rackTypeStr.includes('single');

          // Find product in catalog if available
          const matchedProd = products.find(p => p.code === loc.product_code);

          const slotId = isUrn
            ? `urn-shelf-${bayNum}-lvl-${lvlNum}-${loc.shelf_slot_position || 1}-${loc.product_code || idx}`
            : `casket-bay-${bayNum}-lvl-${lvlNum}`;

          let posX = loc.pos_x_ft !== null && loc.pos_x_ft !== undefined ? Number(loc.pos_x_ft) : undefined;
          let posY = loc.pos_y_ft !== null && loc.pos_y_ft !== undefined ? Number(loc.pos_y_ft) : undefined;
          let orientDeg = loc.orientation_deg !== null && loc.orientation_deg !== undefined ? Number(loc.orientation_deg) : undefined;

          const rLen = Number(parsedArch.lengthFt) || 28.0;
          const rWid = Number(parsedArch.widthFt) || 19.5;

          // Wall-relative coordinate normalization:
          // When users enter floor plans from spreadsheets, distance along the North or East wall
          // is often measured from that respective wall.
          if (wallZone.includes('north')) {
            if (posY !== undefined && posY <= rWid / 2) {
              posY = Number((rWid - posY).toFixed(2));
            }
            if (orientDeg === undefined || orientDeg === 0) orientDeg = 180;
          } else if (wallZone.includes('east')) {
            if (posX !== undefined && posX <= rLen / 2) {
              posX = Number((rLen - posX).toFixed(2));
            }
            if (orientDeg === undefined || orientDeg === 0) orientDeg = 270;
          } else if (wallZone.includes('west')) {
            if (orientDeg === undefined || orientDeg === 0) orientDeg = 90;
          } else if (wallZone.includes('south')) {
            if (orientDeg === undefined || orientDeg === 0) orientDeg = 0;
          }

          return {
            id: slotId,
            slotNumber: bayNum,
            label: loc.bay_label || (isUrn ? `Urn Wall - Shelf ${lvlNum}` : (isDouble ? `Bay ${bayNum} (${lvlNum === 2 ? 'Top' : 'Bottom'})` : `Bay ${bayNum}`)),
            type: (isUrn ? 'urn' : 'casket') as 'casket' | 'urn',
            isDoubleRack: isDouble,
            rackType: loc.rack_type || (isDouble ? 'double' : (isUrn ? 'urn-shelf' : 'single')),
            levelNumber: lvlNum,
            tierLevel: loc.tier_level || (isDouble ? (lvlNum === 2 ? 'Double Rack - Top' : 'Double Rack - Bottom') : (isUrn ? `Shelf ${lvlNum}` : 'Single Floor Rack')),
            shelfSlotPosition: Number(loc.shelf_slot_position) || 1,
            wallZone: loc.wall_zone || (bayNum <= 3 ? 'North Wall' : 'East Wall'),
            posX: posX ?? (bayNum === 1 ? 5.5 : bayNum === 2 ? 14.5 : bayNum === 3 ? 23.5 : bayNum === 4 ? 26.5 : bayNum === 5 ? 26.5 : 14.5),
            posY: posY ?? (bayNum <= 3 ? (rWid - 1.5) : bayNum === 4 ? 6.0 : bayNum === 5 ? 15.5 : 2.0),
            orientation_deg: orientDeg ?? (bayNum <= 3 ? 180 : bayNum <= 5 ? 270 : 180),
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
          text: `Loaded from Supabase: ${cloudRes.locations.length} models for ${activeCustomer.name} (${parsedArch.shape.toUpperCase()} Room: ${parsedArch.lengthFt}ft × ${parsedArch.widthFt}ft)`
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

      // Fallback for customer without cloud data yet
      const defaultArch: RoomArchConfig = {
        roomName: `${activeCustomer.name} Showroom`,
        shape: 'rectangle',
        lengthFt: 28.0,
        widthFt: 18.0,
        ceilingHeightFt: 10.0,
        door1Wall: 'South',
        door1PosFt: 12.0,
        door1WidthFt: 4.0,
        hasDoor2: false,
        door2Wall: 'North',
        door2PosFt: 6.0,
        door2WidthFt: 3.5,
        hasWing: false,
        wingWall: 'West',
        wingOffsetFt: 2.0,
        wingLengthFt: 8.0,
        wingWidthFt: 6.0,
        lEastLongestFt: 18.0,
        lWestLowerFt: 12.0,
        lWestUpperFt: 6.0,
        lCutoutXFt: 12.0,
        notes: ''
      };
      setRoomArch(defaultArch);
      setRoomShape('rectangle');
      onRoomShapeChange?.('rectangle');

      if (!forceCloud) {
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
      }

      generateDefaultLayout('rectangle', roomCapacity);
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
    setRoomArch(prev => ({ ...prev, shape: newShape }));
    setRoomCapacity(newCapacity);
    generateDefaultLayout(newShape, newCapacity);
    onRoomShapeChange?.(newShape);
  };

  const savePlan = (updatedSlots: FloorSlot[]) => {
    if (!activeCustomer) return;
    const plan: CustomerFloorPlan = {
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      roomShape: roomArch.shape,
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
      const configPayload = {
        hasDoor2: roomArch.hasDoor2,
        door2Wall: roomArch.door2Wall,
        door2PosFt: roomArch.door2PosFt,
        door2WidthFt: roomArch.door2WidthFt,
        hasWing: roomArch.hasWing,
        wingWall: roomArch.wingWall,
        wingOffsetFt: roomArch.wingOffsetFt,
        wingLengthFt: roomArch.wingLengthFt,
        wingWidthFt: roomArch.wingWidthFt,
        lEastLongestFt: roomArch.lEastLongestFt,
        lWestLowerFt: roomArch.lWestLowerFt,
        lWestUpperFt: roomArch.lWestUpperFt,
        lCutoutXFt: roomArch.lCutoutXFt,
      };
      const combinedNotes = `${roomArch.notes || ''} <!--CONFIG: ${JSON.stringify(configPayload)} -->`.trim();

      const shapeLabel = roomArch.shape === 'l-shaped' ? 'L-Shaped' : 
                         roomArch.shape === 'oval' ? 'Oval' :
                         roomArch.shape === 'square' ? 'Square' : 'Rectangle';

      const res = await saveCustomerShowroomToSupabase(
        acct,
        activeCustomer.name,
        {
          room_name: roomArch.roomName || 'Main Selection Room',
          room_shape: shapeLabel,
          length_ft: roomArch.lengthFt,
          width_ft: roomArch.widthFt,
          ceiling_height_ft: roomArch.ceilingHeightFt,
          door_wall: roomArch.door1Wall,
          door_pos_ft: roomArch.door1PosFt,
          door_width_ft: roomArch.door1WidthFt,
          max_casket_bays: slots.filter(s => s.type === 'casket').length || 10,
          notes: combinedNotes
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

  // Save room architecture from modal
  const handleSaveRoomArch = async (newArch: RoomArchConfig) => {
    setRoomArch(newArch);
    setRoomShape(newArch.shape);
    setIsArchModalOpen(false);

    if (!activeCustomer) return;
    setIsCloudSaving(true);
    setCloudStatusMsg(null);
    try {
      const acct = String(activeCustomer.accountNumber || activeCustomer.code || '');
      const configPayload = {
        hasDoor2: newArch.hasDoor2,
        door2Wall: newArch.door2Wall,
        door2PosFt: newArch.door2PosFt,
        door2WidthFt: newArch.door2WidthFt,
        hasWing: newArch.hasWing,
        wingWall: newArch.wingWall,
        wingOffsetFt: newArch.wingOffsetFt,
        wingLengthFt: newArch.wingLengthFt,
        wingWidthFt: newArch.wingWidthFt,
        lEastLongestFt: newArch.lEastLongestFt,
        lWestLowerFt: newArch.lWestLowerFt,
        lWestUpperFt: newArch.lWestUpperFt,
        lCutoutXFt: newArch.lCutoutXFt,
      };
      const combinedNotes = `${newArch.notes || ''} <!--CONFIG: ${JSON.stringify(configPayload)} -->`.trim();

      const shapeLabel = newArch.shape === 'l-shaped' ? 'L-Shaped' : 
                         newArch.shape === 'oval' ? 'Oval' :
                         newArch.shape === 'square' ? 'Square' : 'Rectangle';

      const res = await saveCustomerShowroomToSupabase(
        acct,
        activeCustomer.name,
        {
          room_name: newArch.roomName || 'Main Selection Room',
          room_shape: shapeLabel,
          length_ft: newArch.lengthFt,
          width_ft: newArch.widthFt,
          ceiling_height_ft: newArch.ceilingHeightFt,
          door_wall: newArch.door1Wall,
          door_pos_ft: newArch.door1PosFt,
          door_width_ft: newArch.door1WidthFt,
          max_casket_bays: slots.filter(s => s.type === 'casket').length || 10,
          notes: combinedNotes
        },
        slots
      );

      if (res.success) {
        setCloudStatusMsg({ 
          type: 'success', 
          text: `Saved architectural layout (${shapeLabel} ${newArch.lengthFt}ft × ${newArch.widthFt}ft) for ${activeCustomer.name} to Supabase!` 
        });
        const accounts = await fetchAccountsWithShowroomLocations();
        setCloudAccounts(accounts);
      } else {
        setCloudStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setCloudStatusMsg({ type: 'error', text: err.message || 'Failed to save room layout.' });
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

      {/* Room Specification Bar with Dynamic Dimensions & Architecture Modal Button */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-slate-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold shadow-xs shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{roomArch.roomName}</span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase tracking-wider">
                {roomArch.shape === 'l-shaped' ? 'L-Shaped Blueprint' : roomArch.shape === 'square' ? 'Square Perimeter' : roomArch.shape === 'oval' ? 'Oval Floor' : 'Rectangular CAD'}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {roomArch.lengthFt} ft (Length) × {roomArch.widthFt} ft (Width) • {roomArch.ceilingHeightFt} ft Ceiling
              </span>
            </div>
            <p className="text-[11px] text-slate-600 italic mt-0.5">
              {roomArch.notes || `Scaled architectural floor plan for ${activeCustomer?.name}. Zero peninsulas.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">North Wall: </span>
            <span className="font-bold text-slate-900">{roomArch.lengthFt} ft</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">East Wall: </span>
            <span className="font-bold text-slate-900">{roomArch.lEastLongestFt || roomArch.widthFt} ft {roomArch.shape === 'l-shaped' ? '(Longest)' : ''}</span>
          </div>
          {roomArch.shape === 'l-shaped' && (
            <>
              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                <span className="text-slate-400">West Wall: </span>
                <span className="font-bold text-slate-900">{roomArch.lWestLowerFt} ft (Lower)</span>
              </div>
              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                <span className="text-slate-400">Higher Area: </span>
                <span className="font-bold text-slate-900">{roomArch.lWestUpperFt} ft</span>
              </div>
            </>
          )}
          <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
            <span className="text-slate-400">Primary Door: </span>
            <span className="font-bold text-slate-900">{roomArch.door1Wall} Wall ({roomArch.door1WidthFt} ft)</span>
          </div>
          {roomArch.hasDoor2 && (
            <div className="px-3 py-1 bg-white rounded-lg border border-amber-200 text-amber-900 shadow-2xs">
              <span className="text-amber-600 font-sans">Door 2: </span>
              <span className="font-bold">{roomArch.door2Wall} Wall</span>
            </div>
          )}
          {roomArch.hasWing && (
            <div className="px-3 py-1 bg-white rounded-lg border border-indigo-200 text-indigo-900 shadow-2xs">
              <span className="text-indigo-600 font-sans">Wing: </span>
              <span className="font-bold">{roomArch.wingWall} ({roomArch.wingLengthFt}×{roomArch.wingWidthFt} ft)</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsArchModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors shrink-0 ml-1 font-sans"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Customize Dimensions</span>
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
                  {roomArch.lengthFt.toFixed(1)} FT NORTH × {(roomArch.lEastLongestFt || roomArch.widthFt).toFixed(1)} FT EAST ({Math.round(roomArch.lengthFt * roomArch.widthFt)} SQ FT) • {
                    (() => {
                      const doubleCount = casketBays.filter(([_, bSlots]) => bSlots.some(s => s.isDoubleRack)).length;
                      const singleCount = casketBays.length - doubleCount;
                      if (doubleCount > 0 && singleCount > 0) return `${casketBays.length} BAYS (${doubleCount} DOUBLE, ${singleCount} SINGLE)`;
                      if (doubleCount > 0) return `${casketBays.length} DOUBLE RACK BAYS`;
                      return `${casketBays.length} SINGLE RACK BAYS`;
                    })()
                  } • {urnShelves.totalCount} URNS
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Top Seller</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Steady</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Stagnant</span>
              </div>
            </div>

            {/* VIEW 1: ARCHITECTURAL 2D SCALED BLUEPRINT CANVAS */}
            {viewMode === 'blueprint' && (() => {
              const roomLength = roomArch.lengthFt || 28.0;
              const roomWidth = roomArch.widthFt || 19.5;

              // Canvas boundary dimensions
              const svgW = 960;
              const svgH = 680;
              const padLeft = 85;
              const padRight = 85;
              const padTop = 55;
              const padBottom = 65;

              const maxDrawW = svgW - padLeft - padRight; // 790
              const maxDrawH = svgH - padTop - padBottom; // 560

              const scale = Math.min(maxDrawW / roomLength, maxDrawH / roomWidth);
              const drawW = roomLength * scale;
              const drawH = roomWidth * scale;

              const originX = padLeft + (maxDrawW - drawW) / 2;
              const originY = padTop + (maxDrawH - drawH) / 2;

              // Coordinate conversion
              // In room ft: X: 0 (West) to roomLength (East), Y: 0 (South) to roomWidth (North)
              const toSvgX = (xFt: number) => originX + (xFt * scale);
              const toSvgY = (yFt: number) => originY + ((roomWidth - yFt) * scale);

              const x0 = toSvgX(0);
              const xMax = toSvgX(roomLength);
              const yTop = toSvgY(roomWidth); // North
              const yBot = toSvgY(0);         // South

              // Cutout dimensions for L-shape (NO PENINSULAS!)
              const cutoutX = roomArch.lCutoutXFt || 13.5;
              const lowerY = roomArch.lWestLowerFt || 13.5;
              const upperY = roomArch.lWestUpperFt || 6.0;
              const xCut = toSvgX(cutoutX);
              const yMid = toSvgY(lowerY);

              // Floor perimeter path
              let floorPath = '';
              if (roomArch.shape === 'l-shaped') {
                floorPath = `M ${x0} ${yTop} H ${xMax} V ${yBot} H ${xCut} V ${yMid} H ${x0} Z`;
              } else if (roomArch.shape === 'square' || roomArch.shape === 'rectangle') {
                floorPath = `M ${x0} ${yTop} H ${xMax} V ${yBot} H ${x0} Z`;
              }

              // Door 1 coordinates
              const d1Wall = roomArch.door1Wall;
              const d1Offset = roomArch.door1PosFt || 5.0;
              const d1Width = roomArch.door1WidthFt || 4.0;
              const d1WidthPx = d1Width * scale;

              let d1StartPx = { x: 0, y: 0 };
              let d1EndPx = { x: 0, y: 0 };
              let d1ArcD = '';
              let d1LabelPos = { x: 0, y: 0 };

              if (d1Wall === 'South') {
                const doorStartX = roomArch.shape === 'l-shaped' ? Math.max(cutoutX, roomLength - d1Offset - d1Width) : (roomLength - d1Offset - d1Width);
                const sx = toSvgX(doorStartX);
                const ex = sx + d1WidthPx;
                d1StartPx = { x: sx, y: yBot };
                d1EndPx = { x: ex, y: yBot };
                d1ArcD = `M ${ex} ${yBot} A ${d1WidthPx} ${d1WidthPx} 0 0 1 ${sx} ${yBot - d1WidthPx}`;
                d1LabelPos = { x: (sx + ex) / 2, y: yBot + 24 };
              } else if (d1Wall === 'North') {
                const sx = toSvgX(d1Offset);
                const ex = sx + d1WidthPx;
                d1StartPx = { x: sx, y: yTop };
                d1EndPx = { x: ex, y: yTop };
                d1ArcD = `M ${sx} ${yTop} A ${d1WidthPx} ${d1WidthPx} 0 0 1 ${ex} ${yTop + d1WidthPx}`;
                d1LabelPos = { x: (sx + ex) / 2, y: yTop - 12 };
              } else if (d1Wall === 'East') {
                const sy = toSvgY(d1Offset + d1Width);
                const ey = toSvgY(d1Offset);
                d1StartPx = { x: xMax, y: sy };
                d1EndPx = { x: xMax, y: ey };
                d1ArcD = `M ${xMax} ${ey} A ${d1WidthPx} ${d1WidthPx} 0 0 1 ${xMax - d1WidthPx} ${sy}`;
                d1LabelPos = { x: xMax + 24, y: (sy + ey) / 2 };
              } else {
                const sy = toSvgY(d1Offset + d1Width);
                const ey = toSvgY(d1Offset);
                d1StartPx = { x: x0, y: sy };
                d1EndPx = { x: x0, y: ey };
                d1ArcD = `M ${x0} ${sy} A ${d1WidthPx} ${d1WidthPx} 0 0 1 ${x0 + d1WidthPx} ${ey}`;
                d1LabelPos = { x: x0 - 24, y: (sy + ey) / 2 };
              }

              // Door 2 (if enabled)
              let d2StartPx = { x: 0, y: 0 };
              let d2EndPx = { x: 0, y: 0 };
              let d2ArcD = '';
              let d2LabelPos = { x: 0, y: 0 };
              if (roomArch.hasDoor2) {
                const d2Wall = roomArch.door2Wall;
                const d2Offset = roomArch.door2PosFt || 8.0;
                const d2Width = roomArch.door2WidthFt || 3.5;
                const d2WidthPx = d2Width * scale;

                if (d2Wall === 'North') {
                  const sx = toSvgX(d2Offset);
                  const ex = sx + d2WidthPx;
                  d2StartPx = { x: sx, y: yTop };
                  d2EndPx = { x: ex, y: yTop };
                  d2ArcD = `M ${sx} ${yTop} A ${d2WidthPx} ${d2WidthPx} 0 0 1 ${ex} ${yTop + d2WidthPx}`;
                  d2LabelPos = { x: (sx + ex) / 2, y: yTop - 12 };
                } else if (d2Wall === 'West') {
                  const sy = toSvgY(d2Offset + d2Width);
                  const ey = toSvgY(d2Offset);
                  const wx = roomArch.shape === 'l-shaped' && d2Offset < lowerY ? xCut : x0;
                  d2StartPx = { x: wx, y: sy };
                  d2EndPx = { x: wx, y: ey };
                  d2ArcD = `M ${wx} ${sy} A ${d2WidthPx} ${d2WidthPx} 0 0 1 ${wx + d2WidthPx} ${ey}`;
                  d2LabelPos = { x: wx - 20, y: (sy + ey) / 2 };
                } else if (d2Wall === 'South') {
                  const sx = toSvgX(d2Offset);
                  const ex = sx + d2WidthPx;
                  d2StartPx = { x: sx, y: yBot };
                  d2EndPx = { x: ex, y: yBot };
                  d2ArcD = `M ${ex} ${yBot} A ${d2WidthPx} ${d2WidthPx} 0 0 1 ${sx} ${yBot - d2WidthPx}`;
                  d2LabelPos = { x: (sx + ex) / 2, y: yBot + 24 };
                } else {
                  const sy = toSvgY(d2Offset + d2Width);
                  const ey = toSvgY(d2Offset);
                  d2StartPx = { x: xMax, y: sy };
                  d2EndPx = { x: xMax, y: ey };
                  d2ArcD = `M ${xMax} ${ey} A ${d2WidthPx} ${d2WidthPx} 0 0 1 ${xMax - d2WidthPx} ${sy}`;
                  d2LabelPos = { x: xMax + 24, y: (sy + ey) / 2 };
                }
              }

              return (
                <div className="relative w-full flex-1 flex flex-col items-center justify-center p-2 overflow-auto">
                  <svg
                    viewBox="0 0 960 680"
                    className="w-full max-w-[900px] h-auto drop-shadow-sm select-none"
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                  >
                    <defs>
                      <pattern id="cadGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <rect width="28" height="28" fill="#f8fafc" />
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                      </pattern>
                      
                      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#475569" />
                      </marker>
                      
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    {/* Room Floor Background */}
                    <rect x="0" y="0" width="960" height="680" fill="#ffffff" />

                    {/* CAD Floor Interior (NO PENINSULAS!) */}
                    {roomArch.shape === 'oval' ? (
                      <ellipse
                        cx={toSvgX(roomLength / 2)}
                        cy={toSvgY(roomWidth / 2)}
                        rx={drawW / 2}
                        ry={drawH / 2}
                        fill="url(#cadGrid)"
                        stroke="none"
                      />
                    ) : (
                      <path
                        d={floorPath}
                        fill="url(#cadGrid)"
                        stroke="none"
                      />
                    )}

                    {/* DIMENSION LINES & LABELS */}
                    {/* North Wall Dimension */}
                    <g>
                      <line x1={x0} y1={yTop - 25} x2={xMax} y2={yTop - 25} stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                      <rect x={(x0 + xMax) / 2 - 80} y={yTop - 36} width="160" height="22" rx="4" fill="#0f172a" />
                      <text x={(x0 + xMax) / 2} y={yTop - 21} textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" letterSpacing="0.05em">
                        ← {roomLength.toFixed(1)} FT NORTH WALL →
                      </text>
                    </g>

                    {/* East Wall Dimension (Longest) */}
                    <g>
                      <line x1={xMax + 30} y1={yTop} x2={xMax + 30} y2={yBot} stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                      <g transform={`translate(${xMax + 35}, ${(yTop + yBot) / 2}) rotate(90)`}>
                        <rect x="-105" y="-11" width="210" height="22" rx="4" fill="#0f172a" />
                        <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                          ← {(roomArch.lEastLongestFt || roomWidth).toFixed(1)} FT EAST WALL {roomArch.shape === 'l-shaped' ? '(LONGEST) ' : ''}→
                        </text>
                      </g>
                    </g>

                    {/* L-Shape West Wall Dimensions */}
                    {roomArch.shape === 'l-shaped' && (
                      <>
                        {/* Lower West Wall: 13.5 ft */}
                        <g>
                          <line x1={xCut - 24} y1={yMid} x2={xCut - 24} y2={yBot} stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                          <g transform={`translate(${xCut - 28}, ${(yMid + yBot) / 2}) rotate(-90)`}>
                            <rect x="-70" y="-10" width="140" height="20" rx="4" fill="#0f172a" />
                            <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="9.5" fontWeight="bold">
                              ← {lowerY.toFixed(1)} FT WEST WALL →
                            </text>
                          </g>
                        </g>

                        {/* Higher Area Step: 6.0 ft */}
                        <g>
                          <line x1={x0 - 24} y1={yTop} x2={x0 - 24} y2={yMid} stroke="#475569" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                          <g transform={`translate(${x0 - 28}, ${(yTop + yMid) / 2}) rotate(-90)`}>
                            <rect x="-50" y="-10" width="100" height="20" rx="4" fill="#0f172a" />
                            <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="9.5" fontWeight="bold">
                              ← {upperY.toFixed(1)} FT →
                            </text>
                          </g>
                        </g>
                      </>
                    )}

                    {/* ARCHITECTURAL OUTER WALLS (NO PENINSULA!) */}
                    {/* North Wall */}
                    {d1Wall === 'North' ? (
                      <>
                        <line x1={x0} y1={yTop} x2={d1StartPx.x} y2={yTop} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        <line x1={d1EndPx.x} y1={yTop} x2={xMax} y2={yTop} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                      </>
                    ) : (
                      <line x1={x0} y1={yTop} x2={xMax} y2={yTop} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    )}

                    {/* East Wall */}
                    {d1Wall === 'East' ? (
                      <>
                        <line x1={xMax} y1={yTop} x2={xMax} y2={d1StartPx.y} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        <line x1={xMax} y1={d1EndPx.y} x2={xMax} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                      </>
                    ) : (
                      <line x1={xMax} y1={yTop} x2={xMax} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    )}

                    {/* South Wall */}
                    {roomArch.shape === 'l-shaped' ? (
                      d1Wall === 'South' ? (
                        <>
                          <line x1={xMax} y1={yBot} x2={d1EndPx.x} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                          <line x1={d1StartPx.x} y1={yBot} x2={xCut} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        </>
                      ) : (
                        <line x1={xMax} y1={yBot} x2={xCut} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                      )
                    ) : (
                      d1Wall === 'South' ? (
                        <>
                          <line x1={xMax} y1={yBot} x2={d1EndPx.x} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                          <line x1={d1StartPx.x} y1={yBot} x2={x0} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        </>
                      ) : (
                        <line x1={xMax} y1={yBot} x2={x0} y2={yBot} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                      )
                    )}

                    {/* West Wall(s) */}
                    {roomArch.shape === 'l-shaped' ? (
                      <>
                        {/* Lower West Wall */}
                        <line x1={xCut} y1={yBot} x2={xCut} y2={yMid} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        {/* Corner Shelf/Transition Step */}
                        <line x1={xCut} y1={yMid} x2={x0} y2={yMid} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                        {/* Higher West Wall */}
                        <line x1={x0} y1={yMid} x2={x0} y2={yTop} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                      </>
                    ) : (
                      <line x1={x0} y1={yBot} x2={x0} y2={yTop} stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    )}

                    {/* Optional Wing Alcove (if enabled) */}
                    {roomArch.hasWing && (() => {
                      const wx = toSvgX(roomArch.wingOffsetFt);
                      const wy = toSvgY(lowerY / 2);
                      const ww = roomArch.wingWidthFt * scale;
                      const wl = roomArch.wingLengthFt * scale;
                      return (
                        <g>
                          <rect x={wx - ww} y={wy - (wl / 2)} width={ww} height={wl} fill="url(#cadGrid)" stroke="#1e293b" strokeWidth="6" strokeDasharray="6 3" rx="4" />
                          <text x={wx - (ww / 2)} y={wy} textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="bold">
                            ROOM WING
                          </text>
                        </g>
                      );
                    })()}

                    {/* Primary Entrance Doorway Opening */}
                    <g>
                      <path d={d1ArcD} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 3" />
                      <line x1={d1StartPx.x} y1={d1StartPx.y} x2={d1EndPx.x} y2={d1EndPx.y - d1WidthPx} stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
                      <text x={d1LabelPos.x} y={d1LabelPos.y} textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold" letterSpacing="0.05em">
                        ▼ MAIN CLIENT ENTRANCE ({d1Width} FT) ▼
                      </text>
                    </g>

                    {/* Secondary Doorway (if enabled) */}
                    {roomArch.hasDoor2 && (
                      <g>
                        <path d={d2ArcD} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1={d2StartPx.x} y1={d2StartPx.y} x2={d2EndPx.x} y2={d2EndPx.y} stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                        <text x={d2LabelPos.x} y={d2LabelPos.y} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="bold">
                          DOORWAY 2 ({roomArch.door2WidthFt} FT)
                        </text>
                      </g>
                    )}

                    {/* Open Center Room Feature: Consultation Table & Rug (only when no casket bay is in center room) */}
                    {(!casketBays.some(([_, bSlots]) => bSlots.some(s => (s.wallZone || '').toLowerCase().includes('center')))) && (
                      <g transform={`translate(${toSvgX(roomLength > 20 ? 21.0 : roomLength / 2)}, ${toSvgY(roomWidth / 2)})`}>
                        <circle cx="0" cy="0" r="36" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2" />
                        <circle cx="0" cy="0" r="20" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                        <text x="0" y="3" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold">CONSULTATION</text>
                        <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7">KIOSK & TABLE</text>
                      </g>
                    )}

                    {/* DYNAMIC CASKET BAYS RENDERED FROM SLOTS */}
                    {casketBays.map(([bayNumber, baySlots]) => {
                      const sorted = [...baySlots].sort((a, b) => (Number(b.levelNumber) || 1) - (Number(a.levelNumber) || 1));
                      const top = sorted.find(s => s.levelNumber === 2) || sorted[0];
                      const btm = sorted.find(s => s.levelNumber === 1 && s.id !== top.id) || (sorted.length > 1 ? sorted[1] : null);
                      const isSelected = selectedSlotId === top?.id || (btm && selectedSlotId === btm.id);

                      let posX = top.posX;
                      let posY = top.posY;
                      let orient = top.orientation_deg;

                      // Wall-relative coordinate normalization fallback
                      const wall = (top.wallZone || '').toLowerCase();
                      if (wall.includes('north') && posY !== undefined && posY <= roomWidth / 2) {
                        posY = roomWidth - posY;
                      } else if (wall.includes('east') && posX !== undefined && posX <= roomLength / 2) {
                        posX = roomLength - posX;
                      }

                      // Fallback coordinates if not populated
                      if (posX === undefined || posY === undefined) {
                        if (bayNumber <= 3) {
                          posX = 5.5 + (bayNumber - 1) * 9.0;
                          posY = roomWidth - 1.5;
                          orient = 180;
                        } else if (bayNumber <= 5) {
                          posX = roomLength - 1.5;
                          posY = 6.0 + (bayNumber - 4) * 9.5;
                          orient = 270;
                        } else {
                          posX = 14.5;
                          posY = 2.0;
                          orient = 0;
                        }
                      }

                      if (orient === undefined || orient === 0) {
                        if (wall.includes('north')) orient = 180;
                        else if (wall.includes('east')) orient = 270;
                        else if (wall.includes('west')) orient = 90;
                        else if (wall.includes('south')) orient = 0;
                      }

                      const isDoubleBay = Boolean(top.isDoubleRack || baySlots.length > 1);
                      const isVertical = orient === 90 || orient === 270 || wall.includes('east') || wall.includes('west');
                      const rackW = isVertical ? Math.min(92, Math.max(76, 2.8 * scale)) : Math.min(210, Math.max(160, 7.2 * scale));
                      const rackH = isVertical ? Math.min(210, Math.max(160, 7.2 * scale)) : Math.min(92, Math.max(76, 2.8 * scale));

                      const cx = toSvgX(posX);
                      const cy = toSvgY(posY);
                      const rx = cx - (rackW / 2);
                      const ry = cy - (rackH / 2);

                      return (
                        <g
                          key={`cad-bay-${bayNumber}`}
                          onClick={() => handleSelectBay(bayNumber)}
                          className="cursor-pointer group"
                          filter={isSelected ? "url(#glow)" : undefined}
                        >
                          {/* Rack Frame */}
                          <rect
                            x={rx} y={ry} width={rackW} height={rackH} rx="8"
                            fill={isSelected ? "#fffbeb" : "#ffffff"}
                            stroke={isSelected ? "#f59e0b" : "#cbd5e1"}
                            strokeWidth={isSelected ? "3" : "1.5"}
                          />

                          {/* Horizontal Layout (North / South walls / Center) */}
                          {!isVertical ? (
                            isDoubleBay ? (
                              <>
                                {/* Double Rack Header Badge */}
                                <rect x={rx + 8} y={ry + 6} width={rackW - 16} height="15" rx="3" fill="#fef3c7" />
                                <text x={rx + 12} y={ry + 17} fill="#92400e" fontSize="9" fontWeight="bold">
                                  BAY {bayNumber} • DOUBLE RACK ({top.wallZone || 'WALL'})
                                </text>

                                {/* Top Tier */}
                                <rect x={rx + 8} y={ry + 24} width={rackW - 16} height="18" rx="3" fill="#fafaf9" stroke="#e7e5e4" />
                                <rect x={rx + 10} y={ry + 26} width="26" height="14" rx="2" fill="#d97706" />
                                <text x={rx + 23} y={ry + 36} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">TOP</text>
                                <text x={rx + 42} y={ry + 37} fill="#1c1917" fontSize="9" fontWeight="bold">
                                  {top?.productName?.slice(0, 18) || 'Unassigned'}
                                </text>
                                <text x={rx + rackW - 14} y={ry + 37} textAnchor="end" fill="#78716c" fontSize="8" fontFamily="monospace">
                                  {top?.productCode || ''}
                                </text>

                                {/* Bottom Tier */}
                                <rect x={rx + 8} y={ry + 44} width={rackW - 16} height="18" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                                <rect x={rx + 10} y={ry + 46} width="26" height="14" rx="2" fill="#334155" />
                                <text x={rx + 23} y={ry + 56} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">BTM</text>
                                <text x={rx + 42} y={ry + 57} fill="#1e293b" fontSize="8.5" fontWeight="bold">
                                  {btm?.productName?.slice(0, 18) || 'Empty Bottom'}
                                </text>
                                <text x={rx + rackW - 14} y={ry + 57} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                                  {btm?.productCode || ''}
                                </text>
                              </>
                            ) : (
                              /* Single Rack Horizontal */
                              <>
                                {/* Single Rack Header Badge */}
                                <rect x={rx + 8} y={ry + 6} width={rackW - 16} height="15" rx="3" fill="#f1f5f9" />
                                <text x={rx + 12} y={ry + 17} fill="#334155" fontSize="9" fontWeight="bold">
                                  BAY {bayNumber} • SINGLE RACK ({top.wallZone || 'WALL'})
                                </text>

                                {/* Single Casket Card */}
                                <rect x={rx + 8} y={ry + 25} width={rackW - 16} height="36" rx="4" fill="#fafaf9" stroke="#cbd5e1" strokeWidth="1" />
                                <rect x={rx + 12} y={ry + 28} width="36" height="14" rx="2" fill="#0f172a" />
                                <text x={rx + 30} y={ry + 38} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">CASKET</text>
                                <text x={rx + 54} y={ry + 39} fill="#0f172a" fontSize="9" fontWeight="bold">
                                  {top?.productName?.slice(0, 20) || 'Unassigned'}
                                </text>
                                <text x={rx + rackW - 14} y={ry + 39} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                                  {top?.productCode || ''}
                                </text>
                                <text x={rx + 12} y={ry + 53} fill="#64748b" fontSize="7.5">
                                  {top?.category || 'Burial'}
                                </text>
                                {top?.wholesalePrice && (
                                  <text x={rx + rackW - 14} y={ry + 53} textAnchor="end" fill="#059669" fontSize="8" fontWeight="bold">
                                    ${Number(top.wholesalePrice).toLocaleString()}
                                  </text>
                                )}
                              </>
                            )
                          ) : (
                            /* Vertical Layout (East / West walls) */
                            isDoubleBay ? (
                              <>
                                {/* Double Rack Header Badge */}
                                <rect x={rx + 5} y={ry + 6} width={rackW - 10} height="16" rx="3" fill="#fef3c7" />
                                <text x={cx} y={ry + 17} textAnchor="middle" fill="#92400e" fontSize="8.5" fontWeight="bold">
                                  BAY {bayNumber} ({top.wallZone?.includes('East') ? 'EAST' : 'WEST'})
                                </text>

                                {/* Top Tier */}
                                <g transform={`translate(${rx + 5}, ${ry + 26})`}>
                                  <rect width={rackW - 10} height={(rackH - 36) / 2} rx="4" fill="#fafaf9" stroke="#e7e5e4" />
                                  <rect x="4" y="4" width="24" height="12" rx="2" fill="#d97706" />
                                  <text x="16" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">TOP</text>
                                  <text x="4" y="30" fill="#1c1917" fontSize="8" fontWeight="bold">
                                    {top?.productName?.slice(0, 13) || 'Unassigned'}
                                  </text>
                                  <text x="4" y="43" fill="#78716c" fontSize="7.5" fontFamily="monospace">
                                    {top?.productCode || ''}
                                  </text>
                                </g>

                                {/* Bottom Tier */}
                                <g transform={`translate(${rx + 5}, ${ry + 26 + (rackH - 36) / 2 + 4})`}>
                                  <rect width={rackW - 10} height={(rackH - 36) / 2} rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                                  <rect x="4" y="4" width="24" height="12" rx="2" fill="#334155" />
                                  <text x="16" y="13" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">BTM</text>
                                  <text x="4" y="30" fill="#1e293b" fontSize="8" fontWeight="bold">
                                    {btm?.productName?.slice(0, 13) || 'Empty Bottom'}
                                  </text>
                                  <text x="4" y="43" fill="#64748b" fontSize="7.5" fontFamily="monospace">
                                    {btm?.productCode || ''}
                                  </text>
                                </g>
                              </>
                            ) : (
                              /* Single Rack Vertical */
                              <>
                                {/* Single Rack Header Badge */}
                                <rect x={rx + 5} y={ry + 6} width={rackW - 10} height="16" rx="3" fill="#f1f5f9" />
                                <text x={cx} y={ry + 17} textAnchor="middle" fill="#334155" fontSize="8" fontWeight="bold">
                                  BAY {bayNumber} • SINGLE
                                </text>

                                {/* Single Casket Card */}
                                <g transform={`translate(${rx + 5}, ${ry + 26})`}>
                                  <rect width={rackW - 10} height={rackH - 32} rx="4" fill="#fafaf9" stroke="#cbd5e1" strokeWidth="1" />
                                  <rect x="5" y="6" width="36" height="13" rx="2" fill="#0f172a" />
                                  <text x="23" y="15" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">CASKET</text>
                                  <text x="5" y="32" fill="#0f172a" fontSize="8.5" fontWeight="bold">
                                    {top?.productName?.slice(0, 13) || 'Unassigned'}
                                  </text>
                                  <text x="5" y="46" fill="#64748b" fontSize="7.5" fontFamily="monospace">
                                    {top?.productCode || ''}
                                  </text>
                                  <text x="5" y="60" fill="#64748b" fontSize="7">
                                    {top?.category || 'Burial'}
                                  </text>
                                  {top?.wholesalePrice && (
                                    <text x="5" y="74" fill="#059669" fontSize="7.5" fontWeight="bold">
                                      ${Number(top.wholesalePrice).toLocaleString()}
                                    </text>
                                  )}
                                </g>
                              </>
                            )
                          )}
                        </g>
                      );
                    })}

                    {/* DYNAMIC URN WALL DISPLAY UNIT (NO PENINSULA!) */}
                    {urnShelves.all.length > 0 && (() => {
                      const firstUrn = urnShelves.all[0];
                      const urnX = firstUrn.posX !== undefined ? firstUrn.posX : 14.5;
                      const urnY = firstUrn.posY !== undefined ? firstUrn.posY : 2.0;
                      const isSelected = slots.some(s => s.type === 'urn' && s.id === selectedSlotId);

                      const unitW = Math.min(180, Math.max(130, 4.8 * scale));
                      const unitH = Math.min(100, Math.max(74, 3.0 * scale));
                      const cx = toSvgX(urnX);
                      const cy = toSvgY(urnY);
                      const ux = cx - (unitW / 2);
                      const uy = cy - (unitH / 2);

                      return (
                        <g
                          onClick={() => {
                            if (firstUrn) setSelectedSlotId(firstUrn.id);
                          }}
                          className="cursor-pointer group"
                          filter={isSelected ? "url(#glow)" : undefined}
                        >
                          <rect
                            x={ux} y={uy} width={unitW} height={unitH} rx="8"
                            fill="#faf5ff"
                            stroke={isSelected ? "#a855f7" : "#c084fc"}
                            strokeWidth={isSelected ? "3" : "1.5"}
                          />
                          {/* Header Banner */}
                          <rect x={ux + 4} y={uy + 4} width={unitW - 8} height="16" rx="3" fill="#7e22ce" />
                          <text x={cx} y={uy + 15} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                            ✨ URN GALLERY ({firstUrn.slotNumber ? `BAY ${firstUrn.slotNumber}` : 'WALL'}) • {urnShelves.totalCount} URNS
                          </text>

                          {/* Shelf 3 (Top) */}
                          <rect x={ux + 4} y={uy + 24} width={unitW - 8} height="13" rx="2" fill="#f3e8ff" />
                          <text x={ux + 8} y={uy + 33} fill="#6b21a8" fontSize="7.5" fontWeight="bold">TIER 3 (TOP):</text>
                          <text x={ux + unitW - 8} y={uy + 33} textAnchor="end" fill="#7e22ce" fontSize="7.5" fontWeight="bold">
                            {urnShelves.level3.length || 4} Urns
                          </text>

                          {/* Shelf 2 (Middle) */}
                          <rect x={ux + 4} y={uy + 40} width={unitW - 8} height="13" rx="2" fill="#ede9fe" />
                          <text x={ux + 8} y={uy + 49} fill="#5b21b6" fontSize="7.5" fontWeight="bold">TIER 2 (MID):</text>
                          <text x={ux + unitW - 8} y={uy + 49} textAnchor="end" fill="#6d28d9" fontSize="7.5" fontWeight="bold">
                            {urnShelves.level2.length || 5} Urns
                          </text>

                          {/* Shelf 1 (Bottom) */}
                          <rect x={ux + 4} y={uy + 56} width={unitW - 8} height="13" rx="2" fill="#ddd6fe" />
                          <text x={ux + 8} y={uy + 65} fill="#4c1d95" fontSize="7.5" fontWeight="bold">TIER 1 (BTM):</text>
                          <text x={ux + unitW - 8} y={uy + 65} textAnchor="end" fill="#5b21b6" fontSize="7.5" fontWeight="bold">
                            {urnShelves.level1.length || 5} Urns
                          </text>
                        </g>
                      );
                    })()}

                  </svg>

                  {/* Blueprint Instructions Helper */}
                  <div className="mt-3 flex items-center justify-between w-full max-w-[900px] px-2 text-[11px] text-slate-500">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Click any Double Rack or Urn Wall on the blueprint to inspect model details & sales.</span>
                    </div>
                    <span className="font-mono text-slate-400">Scale: 1 ft = {Math.round(scale)} px • Dynamic CAD Blueprint</span>
                  </div>
                </div>
              );
            })()}

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
                              {isDouble ? (
                                <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-300">
                                  <Layers className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Double Rack</span>
                                </span>
                              ) : (
                                <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-300">
                                  <Box className="w-2.5 h-2.5 text-slate-600" />
                                  <span>Single Rack</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">
                              {topSlot.wallZone || (bayNumber <= 3 ? 'North wall' : 'East wall')}
                            </span>
                          </div>

                          {/* Top Tier Sub-Card (or Single Casket Display) */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSlotId(topSlot.id);
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isDouble && btmSlot ? 'mb-2' : ''} ${
                              selectedSlotId === topSlot.id
                                ? 'border-amber-600 bg-amber-100/70 shadow-xs ring-1 ring-amber-400'
                                : 'border-slate-200 bg-slate-50/70 hover:bg-amber-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white ${isDouble ? 'bg-amber-700' : 'bg-slate-800'}`}>
                                {isDouble ? 'TOP TIER' : 'CASKET DISPLAY'}
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
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500 block truncate">
                                    {topSlot.category || 'Burial'}
                                  </span>
                                  {topSlot.wholesalePrice && (
                                    <span className="text-[10px] text-emerald-700 font-bold font-mono">
                                      ${Number(topSlot.wholesalePrice).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Tier Sub-Card (Only rendered for Double Racks) */}
                          {isDouble && btmSlot && (
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
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {btmSlot.category || 'Burial'}
                                    </span>
                                    {btmSlot.wholesalePrice && (
                                      <span className="text-[10px] text-emerald-700 font-bold font-mono">
                                        ${Number(btmSlot.wholesalePrice).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
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

                {/* Urn Wall Section (Only rendered if showroom contains urns) */}
                {urnShelves.totalCount > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-purple-900 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Urn Wall Feature (3 Tiers • {urnShelves.totalCount} Urns)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Dedicated Wall Display
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
              )}

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

      {/* Room Architecture & Dimensions Modal */}
      <RoomArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
        config={roomArch}
        customerName={activeCustomer?.name || 'Customer'}
        accountNumber={String(activeCustomer?.accountNumber || activeCustomer?.code || '')}
        onSave={handleSaveRoomArch}
        isSaving={isCloudSaving}
      />

    </div>
  );
};
