import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Product, SalesYoYMetrics, SaleRecord } from '../../types';
import { getSalesYoYMetrics, getCachedSales } from '../../services/db';
import { DailySalesUploadModal } from './DailySalesUploadModal';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Calendar, 
  Download, 
  BarChart3,
  Table as TableIcon,
  Search,
  Clock,
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface SalesDashboardProps {
  customers: Customer[];
  products: Product[];
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ customers, products }) => {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState<string | number>('2025-26');
  const [previousYear, setPreviousYear] = useState<string | number>('2024-25');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [metrics, setMetrics] = useState<SalesYoYMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartView, setChartView] = useState<'revenue' | 'units'>('revenue');
  const [activeTab, setActiveTab] = useState<'analytics' | 'table'>('analytics');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Sales Records for the Table view
  const [rawSales, setRawSales] = useState<SaleRecord[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedTableYear, setSelectedTableYear] = useState<string>('2025-26');
  const [tableDisplayLimit, setTableDisplayLimit] = useState<number>(100);

  // Find currently selected customer entity
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'all') return null;
    return customers.find(c => 
      c.code === selectedCustomerId || 
      c.id === selectedCustomerId || 
      String(c.accountNumber) === selectedCustomerId ||
      String(c.customerId) === selectedCustomerId
    );
  }, [customers, selectedCustomerId]);

  // Filter raw sales records matching the selected customer
  const customerSales = useMemo(() => {
    if (selectedCustomerId === 'all') return rawSales;
    const targetCode = String(selectedCustomer?.accountNumber || selectedCustomer?.code || selectedCustomerId).toLowerCase();
    const targetName = (selectedCustomer?.name || '').toLowerCase();

    return rawSales.filter(s => {
      const acctNum = String(s.accountNumber || '').toLowerCase();
      const acctName = (s.accountName || '').toLowerCase();
      const custId = (s.customerId || '').toLowerCase();

      return (
        acctNum === targetCode ||
        custId === targetCode ||
        custId === `cust-${targetCode}` ||
        (targetName && acctName === targetName) ||
        (targetName && acctName.includes(targetName))
      );
    });
  }, [rawSales, selectedCustomerId, selectedCustomer]);

  // High-speed associated products (instant return if 'all' customer)
  const associatedProducts = useMemo(() => {
    if (selectedCustomerId === 'all') {
      return products;
    }
    const customerCodes = new Set(customerSales.map(s => String(s.productCode)));
    const matched = products.filter(p => customerCodes.has(String(p.code)));
    const matchedCodes = new Set(matched.map(p => String(p.code)));

    for (const s of customerSales) {
      const codeStr = String(s.productCode);
      if (codeStr && !matchedCodes.has(codeStr)) {
        matchedCodes.add(codeStr);
        matched.push({
          id: `prod-${s.productCode}`,
          code: codeStr,
          name: s.description || `Model ${s.productCode}`,
          description: s.description,
          category: s.category || 'Burial Solutions',
          material: 'Casket',
          interior: 'Standard',
          wholesalePrice: Number(s.cost) || 0,
          price: Number(s.cost) || 0,
          catalogYear: s.year,
          year: s.year,
          exteriorFinish: 'Standard Finish',
          features: [],
          imageUrl: '',
          isActive: true,
          createdAt: '',
          updatedAt: ''
        });
      }
    }

    return matched.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [customerSales, selectedCustomerId, products]);

  // When customer changes, if current selected product is no longer in associatedProducts, reset to 'all'
  useEffect(() => {
    if (selectedProductId !== 'all') {
      const exists = associatedProducts.some(p => String(p.code) === String(selectedProductId) || p.id === selectedProductId);
      if (!exists) {
        setSelectedProductId('all');
      }
    }
  }, [associatedProducts, selectedProductId]);

  // Load available years & raw sales from high-speed in-memory cache
  const loadInitial = async () => {
    const sales = await getCachedSales();
    setRawSales(sales);
    const distinct: string[] = Array.from(new Set(sales.map(s => String(s.year))))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
    if (distinct.length > 0) {
      setAvailableYears(distinct);
      const latest = distinct[distinct.length - 1];
      const prev = distinct.length > 1 ? distinct[distinct.length - 2] : distinct[0];
      setCurrentYear(latest);
      setPreviousYear(prev);
      setSelectedTableYear(latest); // Default to most recent year!
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  // Reactive listener: when daily sales PDF is uploaded, refresh immediately
  useEffect(() => {
    const handleSalesUpdated = () => {
      loadInitial();
    };
    window.addEventListener('batesville_sales_updated', handleSalesUpdated);
    return () => {
      window.removeEventListener('batesville_sales_updated', handleSalesUpdated);
    };
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const data = await getSalesYoYMetrics(
          currentYear,
          previousYear,
          selectedCustomerId,
          selectedProductId
        );
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load sales metrics', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [currentYear, previousYear, selectedCustomerId, selectedProductId]);

  const exportSalesCsv = () => {
    if (!metrics) return;
    const headers = ['Fiscal Month', `${previousYear} Revenue ($)`, `${currentYear} Revenue ($)`, 'YoY Growth (%)', `${previousYear} Units`, `${currentYear} Units`];
    const rows = metrics.monthlyBreakdown.map(m => [
      m.monthName,
      m.previousRevenue,
      m.currentRevenue,
      `${m.growthPercent}%`,
      m.previousUnits,
      m.currentUnits
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `batesville_sales_fiscal_yoy_${previousYear}_vs_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // High-speed memoized multi-stage filtering
  const filteredRawSales = useMemo(() => {
    if (!rawSales.length) return [];
    let list = rawSales;

    // Stage 1: Year filter first (instantly filters 90%+ of dataset)
    if (selectedTableYear && selectedTableYear !== 'all') {
      list = list.filter(s => s.year === selectedTableYear);
    }

    // Stage 2: Customer filter
    if (selectedCustomerId !== 'all') {
      const targetCode = String(selectedCustomer?.accountNumber || selectedCustomer?.code || selectedCustomerId).toLowerCase();
      const targetName = (selectedCustomer?.name || '').toLowerCase();
      list = list.filter(s => {
        const acctNum = String(s.accountNumber || '').toLowerCase();
        const acctName = (s.accountName || '').toLowerCase();
        const custId = (s.customerId || '').toLowerCase();
        return (
          acctNum === targetCode ||
          custId === targetCode ||
          custId === `cust-${targetCode}` ||
          (targetName && acctName === targetName) ||
          (targetName && acctName.includes(targetName))
        );
      });
    }

    // Stage 3: Product filter
    if (selectedProductId !== 'all') {
      const prodTarget = String(selectedProductId).toLowerCase();
      list = list.filter(s => String(s.productCode).toLowerCase() === prodTarget);
    }

    // Stage 4: Substring search filter (only when user typed something)
    if (salesSearch.trim()) {
      const term = salesSearch.toLowerCase().trim();
      list = list.filter(s => 
        (s.productCode || '').toLowerCase().includes(term) ||
        (s.description || '').toLowerCase().includes(term) ||
        (s.accountName || '').toLowerCase().includes(term) ||
        String(s.accountNumber || '').includes(term) ||
        (s.program || '').toLowerCase().includes(term) ||
        (s.category || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [rawSales, selectedTableYear, selectedCustomerId, selectedProductId, selectedCustomer, salesSearch]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                Sales Analytics & Transactions
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Batesville Fiscal Calendar: <strong>October 1st to September 30th</strong> • Monthly, yearly, and YoY trends.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Fiscal YoY Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'table' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Sales Table ({rawSales.length})</span>
            </button>
          </div>

          {/* Upload Daily Sales PDF Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Daily Sales (PDF)</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportSalesCsv}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Fiscal Calendar Badge Alert */}
      <div className="flex items-center space-x-2.5 bg-amber-50/90 border border-amber-200 px-4 py-2.5 rounded-xl text-xs text-amber-900 shadow-sm">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Batesville Fiscal Year Cycle:</strong> Runs from <strong>October 1st</strong> through <strong>September 30th</strong>. Q1: Oct–Dec • Q2: Jan–Mar • Q3: Apr–Jun • Q4: Jul–Sep.
        </span>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Secondary Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-slate-500 font-medium">Fiscal Years:</span>
                <select
                  value={currentYear}
                  onChange={(e) => {
                    const yr = e.target.value;
                    setCurrentYear(yr);
                    const idx = availableYears.indexOf(yr);
                    if (idx > 0) {
                      setPreviousYear(availableYears[idx - 1]);
                    }
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} {yr === availableYears[availableYears.length - 1] ? '(Latest)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-medium">vs</span>
                <select
                  value={previousYear}
                  onChange={(e) => setPreviousYear(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-slate-500 font-medium">Customer:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[220px]"
                >
                  <option value="all">All Funeral Homes ({customers.length})</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.code || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-slate-500 font-medium">Product Line:</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 max-w-[280px]"
                >
                  <option value="all">
                    {selectedCustomerId === 'all' 
                      ? `All Batesville Products (${associatedProducts.length})` 
                      : `All Products for this Customer (${associatedProducts.length})`}
                  </option>
                  {associatedProducts.map((p) => {
                    const unitsSold = customerSales
                      .filter(s => String(s.productCode) === String(p.code))
                      .reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);

                    return (
                      <option key={p.id || p.code} value={p.code}>
                        {p.code} - {p.name} {unitsSold > 0 ? `(${unitsSold} sold)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Current Revenue */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>FY {currentYear} Gross Sales</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-serif text-3xl font-black text-slate-900">
                  ${metrics.currentRevenue.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  FY {previousYear}: ${metrics.previousRevenue.toLocaleString()}
                </div>
              </div>

              {/* 2. YoY Revenue Growth */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>YoY Fiscal Growth</span>
                  {metrics.revenueGrowthPercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <div className={`font-serif text-3xl font-black flex items-center ${
                  metrics.revenueGrowthPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {metrics.revenueGrowthPercent >= 0 ? '+' : ''}{metrics.revenueGrowthPercent}%
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Net: {metrics.currentRevenue - metrics.previousRevenue >= 0 ? '+$' : '-$'}
                  {Math.abs(metrics.currentRevenue - metrics.previousRevenue).toLocaleString()}
                </div>
              </div>

              {/* 3. Total Units Sold */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>FY {currentYear} Units</span>
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div className="font-serif text-3xl font-black text-slate-900">
                  {metrics.currentUnits.toLocaleString()} units
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  FY {previousYear}: {metrics.previousUnits} units ({metrics.unitGrowthPercent >= 0 ? '+' : ''}{metrics.unitGrowthPercent}%)
                </div>
              </div>

              {/* 4. Average Order Value */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-2">
                  <span>Average Unit Cost</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="font-serif text-3xl font-black text-slate-900">
                  ${metrics.currentUnits > 0 ? Math.round(metrics.currentRevenue / metrics.currentUnits).toLocaleString() : 0}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Wholesale average per casket/unit
                </div>
              </div>
            </div>
          )}

          {/* Month-by-Month Chart (Fiscal Order: Oct to Sep) */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-900">
                  Fiscal Month Progression ({previousYear} vs {currentYear})
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedCustomerId !== 'all' 
                    ? `Filtered for: ${selectedCustomer?.name || selectedCustomerId}${selectedProductId !== 'all' ? ` • SKU ${selectedProductId}` : ' • All Customer Associated Products'}` 
                    : `Sequential order from Month 1 (October) through Month 12 (September).${selectedProductId !== 'all' ? ` Filtered for SKU ${selectedProductId}` : ''}`}
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
                <button
                  onClick={() => setChartView('revenue')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    chartView === 'revenue' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Revenue ($)
                </button>
                <button
                  onClick={() => setChartView('units')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    chartView === 'units' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Units Sold
                </button>
              </div>
            </div>

            {/* Recharts Component */}
            {metrics && (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'revenue' ? (
                    <BarChart data={metrics.monthlyBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="monthName" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(val) => `$${val / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="previousRevenue" name={`FY ${previousYear} Revenue`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="currentRevenue" name={`FY ${currentYear} Revenue`} fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={metrics.monthlyBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="monthName" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(val: any) => [`${Number(val)} units`, '']}
                      />
                      <Legend />
                      <Bar dataKey="previousUnits" name={`FY ${previousYear} Units`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="currentUnits" name={`FY ${currentYear} Units`} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Monthly Fiscal Breakdown Table */}
          {metrics && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-slate-900">Fiscal Month Comparison Table</h3>
                  <p className="text-xs text-slate-500">Quarterly grouping: Q1 (Oct–Dec), Q2 (Jan–Mar), Q3 (Apr–Jun), Q4 (Jul–Sep)</p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700">USD $</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Fiscal Month</th>
                      <th className="py-3 px-4 font-semibold">FY {previousYear}</th>
                      <th className="py-3 px-4 font-semibold">FY {currentYear}</th>
                      <th className="py-3 px-4 font-semibold">Difference ($)</th>
                      <th className="py-3 px-4 font-semibold">YoY Growth (%)</th>
                      <th className="py-3 px-4 font-semibold">FY {previousYear} Units</th>
                      <th className="py-3 px-4 font-semibold">FY {currentYear} Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {metrics.monthlyBreakdown.map((row) => {
                      const netDiff = row.currentRevenue - row.previousRevenue;
                      return (
                        <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 font-sans">{row.monthName}</td>
                          <td className="py-3 px-4">${row.previousRevenue.toLocaleString()}</td>
                          <td className="py-3 px-4 font-bold text-amber-700">
                            ${row.currentRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={netDiff >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {netDiff >= 0 ? '+' : '-'}${Math.abs(netDiff).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              row.growthPercent >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {row.growthPercent >= 0 ? '+' : ''}{row.growthPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{row.previousUnits}</td>
                          <td className="py-3 px-4 text-slate-900 font-bold">{row.currentUnits}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Tab: Raw Sales Transactions Table View (Matches exact Supabase headers) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Sales Table Records (Exact Supabase Headers)
              </h3>
              <p className="text-xs text-slate-500">
                Defaulting to FY {selectedTableYear} • Showing {Math.min(tableDisplayLimit, filteredRawSales.length)} of {filteredRawSales.length} matching rows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Fiscal Year:</span>
                <select
                  value={selectedTableYear}
                  onChange={(e) => setSelectedTableYear(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} {yr === availableYears[availableYears.length - 1] ? '(Most Recent)' : ''}
                    </option>
                  ))}
                  <option value="all">All Historical Years ({rawSales.length})</option>
                </select>
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter product, account, SKU..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">sales_id</th>
                  <th className="py-3 px-3.5 font-semibold">year</th>
                  <th className="py-3 px-3.5 font-semibold">month</th>
                  <th className="py-3 px-3.5 font-semibold">day</th>
                  <th className="py-3 px-3.5 font-semibold">program</th>
                  <th className="py-3 px-3.5 font-semibold min-w-[200px]">account_name</th>
                  <th className="py-3 px-3.5 font-semibold">account_#</th>
                  <th className="py-3 px-3.5 font-semibold">product_code</th>
                  <th className="py-3 px-3.5 font-semibold">category</th>
                  <th className="py-3 px-3.5 font-semibold min-w-[240px]">description</th>
                  <th className="py-3 px-3.5 font-semibold">qty</th>
                  <th className="py-3 px-3.5 font-semibold">cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {filteredRawSales.slice(0, tableDisplayLimit).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-400">{s.saleId || s.id.replace('sale-', '')}</td>
                    <td className="py-2.5 px-3.5 text-amber-700 font-bold">{s.year}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{s.month}</td>
                    <td className="py-2.5 px-3.5 text-slate-500">{s.day}</td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                        {s.program}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900 truncate max-w-[200px]">
                      {s.accountName}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500">{s.accountNumber}</td>
                    <td className="py-2.5 px-3.5 text-amber-700 font-bold">{s.productCode}</td>
                    <td className="py-2.5 px-3.5 font-sans text-slate-600 truncate max-w-[160px]">{s.category}</td>
                    <td className="py-2.5 px-3.5 font-sans text-slate-700 truncate max-w-[260px]">{s.description}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{s.quantity}</td>
                    <td className="py-2.5 px-3.5 font-bold text-emerald-700">${s.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRawSales.length > tableDisplayLimit && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-200 flex items-center justify-center space-x-2">
              <span>Showing first {tableDisplayLimit} of {filteredRawSales.length} matching sales records.</span>
              <button
                onClick={() => setTableDisplayLimit(prev => prev + 200)}
                className="text-amber-700 font-bold hover:underline cursor-pointer flex items-center space-x-0.5"
              >
                <span>Load 200 More</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Daily Sales PDF Upload Modal */}
      {isUploadModalOpen && (
        <DailySalesUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          customers={customers}
          products={products}
          onSalesAdded={() => {
            loadInitial();
          }}
        />
      )}
    </div>
  );
};
