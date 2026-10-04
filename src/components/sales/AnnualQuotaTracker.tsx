import React, { useState, useEffect, useMemo } from 'react';
import { SaleRecord, SalesQuotaItem, AnnualQuotaTrackerData } from '../../types';
import { 
  getStoredQuotas, 
  saveStoredQuotas, 
  calculateAnnualQuotaMetrics, 
  distributeAnnualQuota, 
  getDefaultFiscalQuotas,
  parseBatesvilleFiscalYear,
  HISTORICAL_ANNUAL_QUOTAS,
  HISTORICAL_PERFORMANCE_CONFIG,
  FISCAL_MONTH_CODES, 
  FISCAL_MONTH_NAMES 
} from '../../services/db';
import { getFiscalYearBillingDays, MonthBillingInfo } from '../../services/billingCalendar';
import { fetchSupabaseQuotas, saveSupabaseQuotas } from '../../services/supabase';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Edit3, 
  Database, 
  Download, 
  RefreshCw, 
  Check, 
  Copy, 
  X, 
  AlertCircle,
  HelpCircle,
  BarChart2,
  Sparkles,
  Info,
  CalendarDays
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface AnnualQuotaTrackerProps {
  sales: SaleRecord[];
  availableYears: string[];
  initialYear?: string;
  onRefreshSales?: () => void;
}

export const AnnualQuotaTracker: React.FC<AnnualQuotaTrackerProps> = ({
  sales,
  availableYears,
  initialYear = '2024-25',
  onRefreshSales
}) => {
  // Select active fiscal year (e.g. '2024-25', '2025-26')
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [quotas, setQuotas] = useState<SalesQuotaItem[]>([]);
  const [isEditingQuotas, setIsEditingQuotas] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic Billing Days & Holiday calendar for selected fiscal year
  const billingCalendarInfo: MonthBillingInfo[] = useMemo(() => {
    return getFiscalYearBillingDays(selectedYear);
  }, [selectedYear]);

  // Form state for quota editing
  const [editYearTarget, setEditYearTarget] = useState<number>(5920915);
  const [tempQuotas, setTempQuotas] = useState<SalesQuotaItem[]>([]);

  // Distinct available fiscal years (covering 2016-17 to present and future years)
  const allYears = useMemo(() => {
    const generated: string[] = [];
    for (let start = 2026; start >= 2016; start--) {
      generated.push(`${start}-${String(start + 1).slice(-2)}`);
    }
    const merged = Array.from(new Set([...availableYears, ...generated]))
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return merged;
  }, [availableYears]);

  // Load quotas for selected year (check Supabase first, fallback to local storage / default)
  const loadQuotas = async (year: string) => {
    setIsSyncing(true);
    try {
      // Try fetching from Supabase cloud
      const remoteRes = await fetchSupabaseQuotas(year);
      if (remoteRes.success && remoteRes.data && remoteRes.data.length === 12) {
        const normYear = parseBatesvilleFiscalYear(year).standardCode;
        const remoteSum = remoteRes.data.reduce((acc: number, q: any) => acc + (Number(q.quota_amount) || 0), 0);
        // If Supabase has old stale 5,920,915 placeholder for a year that isn't 2025-26, use year-specific defaults
        if (normYear !== '2025-26' && remoteSum === 5920915 && HISTORICAL_ANNUAL_QUOTAS[normYear] !== 5920915) {
          const defaults = getDefaultFiscalQuotas(normYear);
          setQuotas(defaults);
          return;
        }
        setQuotas(remoteRes.data);
        saveStoredQuotas(year, remoteRes.data);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch quotas from Supabase, using local cache:', e);
    } finally {
      setIsSyncing(false);
    }

    // Fallback to local storage or defaults
    const local = getStoredQuotas(year);
    setQuotas(local);
  };

  useEffect(() => {
    loadQuotas(selectedYear);
  }, [selectedYear]);

  // Recalculate full 10-row matrix summing figures for all months in selected year
  const metrics: AnnualQuotaTrackerData = useMemo(() => {
    const effectiveQuotas = (quotas && quotas.length === 12 && quotas[0].fiscal_year === selectedYear)
      ? quotas
      : getStoredQuotas(selectedYear);
    return calculateAnnualQuotaMetrics(selectedYear, sales, effectiveQuotas, true);
  }, [selectedYear, sales, quotas]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return metrics.months.map(m => ({
      name: m.monthName,
      Quota: m.quota,
      Sales: m.sales,
      PacingActual: m.cumulativeSales,
      PacingTarget: m.cumulativeQuota,
      Variance: m.monthlyVariance
    }));
  }, [metrics]);

  // Real-time sum of all 12 monthly quotas inside the edit modal
  const tempQuotasAnnualSum = useMemo(() => {
    return tempQuotas.reduce((sum, q) => sum + (Number(q.quota_amount) || 0), 0);
  }, [tempQuotas]);

  // Open quota edit modal
  const handleOpenEditModal = () => {
    const cloned = JSON.parse(JSON.stringify(quotas));
    setTempQuotas(cloned);
    const sum = cloned.reduce((acc: number, q: any) => acc + (Number(q.quota_amount) || 0), 0);
    setEditYearTarget(sum || metrics.annualQuota || 5920915);
    setIsEditingQuotas(true);
  };

  // Auto-distribute annual target
  const handleAutoDistribute = () => {
    const distributed = distributeAnnualQuota(editYearTarget, selectedYear);
    setTempQuotas(distributed);
  };

  // Auto-sync exact billing days for selected year excluding corporate holidays
  const handleAutoSyncCalendarDays = () => {
    const updated = tempQuotas.map((q, idx) => ({
      ...q,
      working_days: billingCalendarInfo[idx]?.billingDays || q.working_days
    }));
    setTempQuotas(updated);
    setNotification({
      type: 'success',
      message: `Updated all 12 months with exact calendar billing days for FY ${selectedYear} (corporate holidays excluded)!`
    });
  };

  // Save updated quotas
  const handleSaveQuotas = async () => {
    saveStoredQuotas(selectedYear, tempQuotas);
    setQuotas(tempQuotas);
    setIsEditingQuotas(false);

    setNotification({
      type: 'success',
      message: 'Quotas successfully saved to local database!'
    });

    // Attempt cloud sync to Supabase
    try {
      const res = await saveSupabaseQuotas(tempQuotas);
      if (res.success) {
        setNotification({
          type: 'success',
          message: 'Quotas saved to local database and synced with Supabase cloud!'
        });
      }
    } catch (e) {
      console.warn('Cloud sync error:', e);
    }

    setTimeout(() => setNotification(null), 4000);
  };

  // Export current table to Excel CSV
  const handleExportCsv = () => {
    const headers = ['Metric', ...FISCAL_MONTH_NAMES, 'Full Year Total'];
    const rows = [
      ['Quota', ...metrics.months.map(m => m.quota), metrics.annualQuota],
      ['Total (Cumulative Quota)', ...metrics.months.map(m => m.cumulativeQuota), metrics.annualQuota],
      ['Actual (Cumulative Sales)', ...metrics.months.map(m => m.cumulativeSales), metrics.totalActualSales],
      ['(+/-) Cumulative Variance', ...metrics.months.map(m => m.cumulativeVariance), metrics.totalVariance],
      ['Sales (Monthly Actual)', ...metrics.months.map(m => m.sales), metrics.totalActualSales],
      ['(+/-) Monthly Variance', ...metrics.months.map(m => m.monthlyVariance), metrics.totalVariance],
      ['Daily Actual Pace', ...metrics.months.map(m => m.dailySales), Math.round(metrics.totalActualSales / (metrics.totalWorkingDays || 260))],
      ["Req'd Daily Pace", ...metrics.months.map(m => m.dailyRequired), Math.round(metrics.annualQuota / (metrics.totalWorkingDays || 260))],
      ['Attainment % to Date', ...metrics.months.map(m => `${m.attainmentPercent}%`), `${metrics.overallAttainmentPercent}%`],
      ['Annual % Quota Completed', ...metrics.months.map(m => `${m.annualPercent}%`), `${metrics.overallAttainmentPercent}%`],
      ['Working Days', ...metrics.months.map(m => m.workingDays), metrics.totalWorkingDays],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `batesville_quota_tracker_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number, hideSign = false) => {
    const formatted = Math.abs(Math.round(val)).toLocaleString('en-US');
    if (val < 0 && !hideSign) {
      return `-$${formatted}`;
    }
    return `$${formatted}`;
  };

  const copySqlToClipboard = () => {
    const sqlText = `-- Supabase Schema & View for Batesville Annual Quota Tracker
-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.sales_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year TEXT NOT NULL,
    fiscal_month INTEGER NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
    month_name TEXT NOT NULL,
    quota_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    working_days INTEGER NOT NULL DEFAULT 21,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotas_fy_fm ON public.sales_quotas(fiscal_year, fiscal_month);
ALTER TABLE public.sales_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Sales Quotas" ON public.sales_quotas FOR ALL USING (true) WITH CHECK (true);

-- Real-time pacing view that automatically updates as sales are inserted
CREATE OR REPLACE VIEW public.v_annual_quota_pacing AS
WITH normalized_sales AS (
    SELECT 
        CASE 
            WHEN s.year LIKE '%-%' THEN s.year
            WHEN UPPER(TRIM(s.month)) IN ('OCT', 'NOV', 'DEC', 'OCTOBER', 'NOVEMBER', 'DECEMBER') 
                 THEN s.year || '-' || SUBSTRING((s.year::INT + 1)::TEXT FROM 3 FOR 2)
            ELSE 
                 (s.year::INT - 1)::TEXT || '-' || SUBSTRING(s.year FROM 3 FOR 2)
        END AS fiscal_year,
        CASE UPPER(TRIM(s.month))
            WHEN 'OCT' THEN 1 WHEN 'OCTOBER' THEN 1
            WHEN 'NOV' THEN 2 WHEN 'NOVEMBER' THEN 2
            WHEN 'DEC' THEN 3 WHEN 'DECEMBER' THEN 3
            WHEN 'JAN' THEN 4 WHEN 'JANUARY' THEN 4
            WHEN 'FEB' THEN 5 WHEN 'FEBRUARY' THEN 5
            WHEN 'MAR' THEN 6 WHEN 'MARCH' THEN 6
            WHEN 'APR' THEN 7 WHEN 'APRIL' THEN 7
            WHEN 'MAY' THEN 8
            WHEN 'JUN' THEN 9 WHEN 'JUNE' THEN 9
            WHEN 'JUL' THEN 10 WHEN 'JULY' THEN 10
            WHEN 'AUG' THEN 11 WHEN 'AUGUST' THEN 11
            WHEN 'SEP' THEN 12 WHEN 'SEPTEMBER' THEN 12
            ELSE 1
        END AS fiscal_month,
        COALESCE(s.cost, 0) AS cost
    FROM public.sales s
),
monthly_actuals AS (
    SELECT 
        ns.fiscal_year,
        ns.fiscal_month,
        SUM(ns.cost) AS total_sales
    FROM normalized_sales ns
    GROUP BY ns.fiscal_year, ns.fiscal_month
),
joined_pacing AS (
    SELECT 
        q.fiscal_year,
        q.fiscal_month,
        q.month_name,
        q.working_days,
        q.quota_amount AS monthly_quota,
        COALESCE(ma.total_sales, 0) AS monthly_sales,
        SUM(q.quota_amount) OVER (PARTITION BY q.fiscal_year ORDER BY q.fiscal_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_quota,
        SUM(COALESCE(ma.total_sales, 0)) OVER (PARTITION BY q.fiscal_year ORDER BY q.fiscal_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_sales,
        SUM(q.quota_amount) OVER (PARTITION BY q.fiscal_year) AS full_year_quota
    FROM public.sales_quotas q
    LEFT JOIN monthly_actuals ma 
        ON ma.fiscal_year = q.fiscal_year 
       AND ma.fiscal_month = q.fiscal_month
)
SELECT 
    fiscal_year,
    fiscal_month,
    month_name,
    working_days,
    ROUND(monthly_quota, 2) AS quota,
    ROUND(cumulative_quota, 2) AS total,
    ROUND(cumulative_sales, 2) AS actual,
    ROUND(cumulative_sales - cumulative_quota, 2) AS cumulative_variance,
    ROUND(monthly_sales, 2) AS sales,
    ROUND(monthly_sales - monthly_quota, 2) AS monthly_variance,
    ROUND(monthly_sales / NULLIF(working_days, 0), 2) AS daily_actual,
    ROUND(monthly_quota / NULLIF(working_days, 0), 2) AS required_daily,
    ROUND((cumulative_sales / NULLIF(cumulative_quota, 0)) * 100, 2) AS attainment_percent,
    ROUND((cumulative_sales / NULLIF(full_year_quota, 0)) * 100, 2) AS annual_percent
FROM joined_pacing
ORDER BY fiscal_year, fiscal_month;`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const avgDailySales = Math.round(metrics.totalActualSales / (metrics.totalWorkingDays || 260));
  const avgRequiredDaily = Math.round(metrics.annualQuota / (metrics.totalWorkingDays || 260));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-xl text-white shadow-md shadow-amber-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                  Annual Quota Tracking & Pacing Breakdown
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Real-time Auto Pacing
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Batesville Fiscal Calendar: <strong>October 1st to September 30th</strong> • Automatic monthly pacing, daily run-rate, and cumulative variances.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Fiscal Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {allYears.map(yr => (
                <option key={yr} value={yr}>
                  FY {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Edit Quotas Button */}
          <button
            onClick={handleOpenEditModal}
            className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Edit monthly quotas & working days"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
            <span>Edit Quotas & Days</span>
          </button>

          {/* Holiday Schedule Button */}
          <button
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="View observed corporate holidays for this fiscal year"
          >
            <CalendarDays className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">Holiday Schedule</span>
          </button>

          {/* Supabase SQL Button */}
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="View and copy Supabase SQL table & real-time view"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Schema</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Export table to CSV / Excel format"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Cloud Refresh */}
          <button
            onClick={() => {
              loadQuotas(selectedYear);
              if (onRefreshSales) onRefreshSales();
            }}
            disabled={isSyncing}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Refresh cloud data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Informational Guidance for New Fiscal Year & Historical Years */}
      {selectedYear === '2026-27' && metrics.annualQuota === 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/90 border border-amber-300 px-4 py-3 rounded-xl text-xs text-amber-950 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>FY 2026–27 Just Started (Oct 1st) • Quota TBD (Pending Release):</strong> Actual October revenue and daily run-rate are actively tracked in real-time. You can plug in your official quota target anytime by clicking <strong>"Edit Quotas & Days"</strong>!
            </span>
          </div>
          <button
            onClick={handleOpenEditModal}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs cursor-pointer transition-all"
          >
            Enter FY27 Quota
          </button>
        </div>
      ) : HISTORICAL_PERFORMANCE_CONFIG[selectedYear] ? (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs text-slate-700 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>FY {selectedYear} Official Performance Record:</strong> Finished at <strong className="text-emerald-700 font-bold">{HISTORICAL_PERFORMANCE_CONFIG[selectedYear].attainmentPercent.toFixed(2)}%</strong> Attainment
              {HISTORICAL_PERFORMANCE_CONFIG[selectedYear].quota > 0 && (
                <> • Annual Target: <strong>{formatCurrency(HISTORICAL_PERFORMANCE_CONFIG[selectedYear].quota)}</strong> • Total Actual Sales: <strong>{formatCurrency(metrics.totalActualSales)}</strong></>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 px-4 py-3 rounded-xl text-xs text-blue-900 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Batesville Fiscal Year:</strong> Runs October 1 to September 30. All daily sales and cumulative variances tally automatically.
            </span>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Annual Quota */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Quota</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-serif text-slate-900">
              {metrics.annualQuota > 0 ? formatCurrency(metrics.annualQuota) : 'TBD'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.annualQuota > 0 ? `Sum of All 12 Quota Months (${selectedYear})` : 'Awaiting FY27 Quota Assignment'}
            </div>
          </div>
        </div>

        {/* Card 2: Actual Sales to Date */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Revenue</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-serif text-slate-900">
              {formatCurrency(metrics.totalActualSales)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {selectedYear === '2026-27' ? 'Incoming actual sales (Oct to Date)' : 'Cumulative actual sales across 12M'}
            </div>
          </div>
        </div>

        {/* Card 3: Pacing Variance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Year (+/-)</span>
            <div className={`p-2 rounded-lg ${metrics.annualQuota === 0 ? 'bg-blue-50 text-blue-600' : metrics.totalVariance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {metrics.annualQuota === 0 ? <TrendingUp className="w-4 h-4" /> : metrics.totalVariance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-serif ${metrics.annualQuota === 0 ? 'text-slate-700' : metrics.totalVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {metrics.annualQuota > 0 ? formatCurrency(metrics.totalVariance) : 'Tracking'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.annualQuota === 0 ? 'Tracking incoming actual sales' : metrics.totalVariance >= 0 ? 'Ahead of Annual Target' : 'Behind Annual Quota Pace'}
            </div>
          </div>
        </div>

        {/* Card 4: Attainment % */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Attainment</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              metrics.annualQuota === 0
                ? 'bg-blue-100 text-blue-800'
                : metrics.overallAttainmentPercent >= 100 
                ? 'bg-emerald-100 text-emerald-800' 
                : metrics.overallAttainmentPercent >= 90
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {metrics.annualQuota === 0 ? 'Pending Quota' : `${metrics.overallAttainmentPercent}%`}
            </span>
          </div>
          <div className="mt-3">
            {metrics.annualQuota > 0 ? (
              <>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      metrics.overallAttainmentPercent >= 100 
                        ? 'bg-emerald-500' 
                        : metrics.overallAttainmentPercent >= 90 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(metrics.overallAttainmentPercent, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Goal: 100%</span>
                  <span className="font-semibold text-slate-700">{metrics.overallAttainmentPercent}% Achieved</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 py-1">
                Attainment % will calculate automatically upon entering FY27 quota.
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Daily Pace */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Pace Avg</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-serif text-slate-900">
              {formatCurrency(avgDailySales)}
              <span className="text-xs font-normal text-slate-500 font-sans ml-1">/ day</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.annualQuota > 0 ? (
                <>Req'd Pace: <strong className="text-slate-700">{formatCurrency(avgRequiredDaily)}</strong> / day</>
              ) : (
                <>Req'd Pace: <strong className="text-slate-700">TBD</strong> (Pending Quota)</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Quota Breakdown Spreadsheet Matrix (Exact 10 Rows) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
        
        {/* Table Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">
              Batesville Fiscal Year {selectedYear} • Executive Sales Quota Ledger
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChart(!showChart)}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart ? 'Hide Visual Chart' : 'Show Visual Chart'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Responsive Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-mono border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-center">
                <th className="py-3 px-4 text-left font-sans text-xs uppercase tracking-wider text-slate-300 w-36 sticky left-0 bg-slate-950 z-10 border-r border-slate-800">
                  Metric
                </th>
                {metrics.months.map((m) => (
                  <th key={m.monthName} className="py-3 px-3 text-slate-300 border-r border-slate-800/60 min-w-[85px]">
                    {m.monthName}
                  </th>
                ))}
                <th className="py-3 px-4 text-amber-400 bg-slate-950/80 font-bold min-w-[125px]">
                  <div>FY Total</div>
                  <div className="text-[10px] text-slate-400 font-normal font-sans tracking-normal">Sum of 12 Months</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-right">
              
              {/* Row 1: Quota */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Quota
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-100 border-r border-slate-800/40">
                    {metrics.annualQuota > 0 ? formatCurrency(m.quota) : 'TBD'}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-amber-300 bg-slate-950/40">
                  {metrics.annualQuota > 0 ? formatCurrency(metrics.annualQuota) : 'TBD'}
                </td>
              </tr>

              {/* Row 2: Total (Cumulative Quota) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Total
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-200 border-r border-slate-800/40 font-semibold">
                    {metrics.annualQuota > 0 ? formatCurrency(m.cumulativeQuota) : 'TBD'}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-amber-300 bg-slate-950/40">
                  {metrics.annualQuota > 0 ? formatCurrency(metrics.annualQuota) : 'TBD'}
                </td>
              </tr>

              {/* Row 3: Actual (Cumulative Actual Sales) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Actual
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-100 border-r border-slate-800/40 font-semibold">
                    {formatCurrency(m.cumulativeSales)}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-blue-300 bg-slate-950/40">
                  {formatCurrency(metrics.totalActualSales)}
                </td>
              </tr>

              {/* Row 4: (+/-) Cumulative Variance */}
              <tr className="hover:bg-slate-800/40 transition-colors font-bold">
                <td className="py-2.5 px-4 text-left text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  (+/-)
                </td>
                {metrics.months.map((m) => {
                  const isPositive = m.cumulativeVariance >= 0;
                  return (
                    <td 
                      key={m.monthName} 
                      className={`py-2 px-2 text-center border-r border-slate-800/40 ${
                        isPositive 
                          ? 'bg-emerald-600 text-white font-black' 
                          : 'bg-red-600 text-white font-black'
                      }`}
                    >
                      {formatCurrency(m.cumulativeVariance)}
                    </td>
                  );
                })}
                <td className={`py-2 px-3 text-center font-black ${
                  metrics.totalVariance >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {formatCurrency(metrics.totalVariance)}
                </td>
              </tr>

              {/* Row 5: Sales (Monthly Actual) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Sales
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-100 border-r border-slate-800/40 font-semibold">
                    {formatCurrency(m.sales)}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-blue-300 bg-slate-950/40">
                  {formatCurrency(metrics.totalActualSales)}
                </td>
              </tr>

              {/* Row 6: (+/-) Monthly Variance */}
              <tr className="hover:bg-slate-800/40 transition-colors font-bold">
                <td className="py-2.5 px-4 text-left text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  (+/-)
                </td>
                {metrics.months.map((m) => {
                  const isPositive = m.monthlyVariance >= 0;
                  return (
                    <td 
                      key={m.monthName} 
                      className={`py-2 px-2 text-center border-r border-slate-800/40 ${
                        isPositive 
                          ? 'bg-emerald-600 text-white font-black' 
                          : 'bg-red-600 text-white font-black'
                      }`}
                    >
                      {formatCurrency(m.monthlyVariance)}
                    </td>
                  );
                })}
                <td className={`py-2 px-3 text-center font-black ${
                  metrics.totalVariance >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {formatCurrency(metrics.totalVariance)}
                </td>
              </tr>

              {/* Row 7: Daily (Actual Daily Pace) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Daily
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-200 border-r border-slate-800/40">
                    {formatCurrency(m.dailySales)}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-slate-300 bg-slate-950/40">
                  {formatCurrency(avgDailySales)}
                </td>
              </tr>

              {/* Row 8: Req'd (Required Daily Pace) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Req'd
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-300 border-r border-slate-800/40">
                    {metrics.annualQuota > 0 ? formatCurrency(m.dailyRequired) : 'TBD'}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-slate-300 bg-slate-950/40">
                  {metrics.annualQuota > 0 ? formatCurrency(avgRequiredDaily) : 'TBD'}
                </td>
              </tr>

              {/* Row 9: % (Attainment % to Date) */}
              <tr className="hover:bg-slate-800/40 transition-colors font-bold text-center">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  %
                </td>
                {metrics.months.map((m) => {
                  const isGood = m.attainmentPercent >= 100;
                  return (
                    <td 
                      key={m.monthName} 
                      className={`py-2 px-2 border-r border-slate-800/40 ${
                        metrics.annualQuota === 0
                          ? 'bg-slate-950 text-slate-500 font-semibold'
                          : isGood 
                          ? 'bg-emerald-600 text-white font-black' 
                          : 'bg-red-600 text-white font-black'
                      }`}
                    >
                      {metrics.annualQuota > 0 ? `${m.attainmentPercent.toFixed(2)}%` : 'TBD'}
                    </td>
                  );
                })}
                <td className={`py-2 px-3 font-black ${
                  metrics.annualQuota === 0
                    ? 'bg-slate-950 text-slate-500'
                    : metrics.overallAttainmentPercent >= 100 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {metrics.annualQuota > 0 ? `${metrics.overallAttainmentPercent.toFixed(2)}%` : 'TBD'}
                </td>
              </tr>

              {/* Row 10: Annual % (% of Total Annual Quota) */}
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-left font-bold text-slate-200 font-sans sticky left-0 bg-slate-900 border-r border-slate-800">
                  Annual %
                </td>
                {metrics.months.map((m) => (
                  <td key={m.monthName} className="py-2.5 px-3 text-slate-300 border-r border-slate-800/40 font-semibold">
                    {metrics.annualQuota > 0 ? `${m.annualPercent.toFixed(2)}%` : 'TBD'}
                  </td>
                ))}
                <td className="py-2.5 px-4 font-bold text-amber-300 bg-slate-950/40">
                  {metrics.annualQuota > 0 ? `${metrics.overallAttainmentPercent.toFixed(2)}%` : 'TBD'}
                </td>
              </tr>

              {/* Supplementary Row: Billing Days (Excluding Weekends & Holidays) */}
              <tr className="bg-slate-950 text-slate-400 text-xs">
                <td className="py-2.5 px-4 text-left font-medium text-slate-400 font-sans sticky left-0 bg-slate-950 border-r border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <span>Billing Days</span>
                    <button
                      onClick={() => setIsHolidayModalOpen(true)}
                      className="text-slate-500 hover:text-amber-400 cursor-pointer"
                      title="Excludes weekends and all recognized corporate holidays"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">Excl. Holidays</div>
                </td>
                {metrics.months.map((m, idx) => {
                  const bInfo = billingCalendarInfo[idx];
                  const hasHolidays = bInfo && bInfo.holidays.length > 0;
                  return (
                    <td key={m.monthName} className="py-2.5 px-3 border-r border-slate-800/40 text-center">
                      <div className="font-bold text-slate-200">{m.workingDays}d</div>
                      {hasHolidays ? (
                        <div 
                          className="text-[9px] text-amber-400 truncate cursor-pointer hover:underline"
                          onClick={() => setIsHolidayModalOpen(true)}
                          title={`${bInfo.holidays.length} holiday(s) excluded: ${bInfo.holidays.map(h => h.name).join(', ')}`}
                        >
                          -{bInfo.holidays.length} hldy
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-600">0 hldy</div>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 px-4 text-center font-bold text-slate-200">
                  <div>{metrics.totalWorkingDays}d</div>
                  <div className="text-[9px] text-slate-400">Full Year</div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Spreadsheet Footer Note */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>
            <span>Legend: </span>
            <span className="inline-block w-2.5 h-2.5 bg-emerald-600 rounded-sm mx-1 align-middle" />
            <span className="text-emerald-400 mr-3">Surplus / Target Exceeded</span>
            <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-sm mx-1 align-middle" />
            <span className="text-red-400">Pacing Deficit</span>
          </div>
          <div>
            Connected to Supabase Table: <code className="text-amber-400 font-mono">public.sales_quotas</code> & View: <code className="text-amber-400 font-mono">public.v_annual_quota_pacing</code>
          </div>
        </div>

      </div>

      {/* Visual Pacing Chart */}
      {showChart && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-slate-900">
                Monthly Target vs Actual Sales & Cumulative Run-Rate
              </h3>
              <p className="text-xs text-slate-500">
                Fiscal Year {selectedYear} trajectory across all 12 fiscal months.
              </p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)), 
                    name === 'Quota' ? 'Monthly Target' : 
                    name === 'Sales' ? 'Monthly Actual' : 
                    name === 'PacingActual' ? 'Cumulative Actual' : 
                    'Cumulative Quota'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="Quota" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Monthly Quota" />
                <Bar yAxisId="left" dataKey="Sales" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Monthly Sales" />
                <Line yAxisId="right" type="monotone" dataKey="PacingTarget" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" name="Target Quota Run-Rate" />
                <Line yAxisId="right" type="monotone" dataKey="PacingActual" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Actual Cumulative Run-Rate" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Edit Quotas & Working Days Modal */}
      {isEditingQuotas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900">
                    Configure Quotas & Working Days (FY {selectedYear})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set customized targets per month or enter a full-year goal to distribute automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingQuotas(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Prominent Live Annual Quota Summary Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-50/20 border-2 border-amber-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-sm">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <span>Annual Quota (Sum of All 12 Months)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-mono font-bold">
                        FY {selectedYear}
                      </span>
                    </div>
                    <div className="text-2xl font-bold font-serif text-slate-900 mt-0.5">
                      {formatCurrency(tempQuotasAnnualSum)}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Summing individual quota figures for all 12 months in FY {selectedYear}. Automatically recalculates in real-time as you adjust any month below.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right sm:border-l sm:border-amber-200/80 sm:pl-4 shrink-0">
                  <div className="text-[11px] text-slate-500 font-medium">12-Month Total:</div>
                  <div className="text-base font-bold text-amber-700 font-mono">
                    {formatCurrency(tempQuotasAnnualSum)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {tempQuotas.reduce((acc, q) => acc + (Number(q.working_days) || 0), 0)} Total Billing Days
                  </div>
                </div>
              </div>

              {/* Quick Annual Distribution Tool */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto-Distribute Annual Target Across 12 Months</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enter a total annual target to automatically split proportionally across all 12 months using seasonality weights:
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-mono">$</span>
                    <input
                      type="number"
                      value={editYearTarget}
                      onChange={(e) => setEditYearTarget(Number(e.target.value) || 0)}
                      className="pl-6 pr-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleAutoDistribute}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Distribute
                  </button>
                </div>
              </div>

              {/* Quick Calendar Billing Days Tool */}
              <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    <span>Auto-Calculate Billing Days from Calendar (Excluding Holidays)</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Dynamically computes Monday–Friday billing days for FY {selectedYear}, automatically deducting recognized corporate holidays (New Year's, MLK Day, Memorial Day, Juneteenth, July 4th, Labor Day, Thanksgiving, Black Friday, Christmas).
                  </p>
                </div>
                <button
                  onClick={handleAutoSyncCalendarDays}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Apply Calendar Days
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tempQuotas.map((q, idx) => {
                  const mName = FISCAL_MONTH_NAMES[idx];
                  const mCode = FISCAL_MONTH_CODES[idx];
                  const bInfo = billingCalendarInfo[idx];
                  const hasHolidays = bInfo && bInfo.holidays.length > 0;
                  return (
                    <div key={q.fiscal_month} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800">
                            Month {q.fiscal_month}: {mName} ({mCode})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {bInfo ? `${mName} ${bInfo.calYear}` : ''} • Req: {formatCurrency(Math.round(q.quota_amount / (q.working_days || 21)))}/d
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Quota Target ($)
                            </label>
                            <input
                              type="number"
                              value={q.quota_amount}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updated = [...tempQuotas];
                                updated[idx].quota_amount = val;
                                setTempQuotas(updated);
                                const newAnnualTotal = updated.reduce((sum, item) => sum + (Number(item.quota_amount) || 0), 0);
                                setEditYearTarget(newAnnualTotal);
                              }}
                              className="w-full bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                Billing Days
                              </label>
                              {bInfo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...tempQuotas];
                                    updated[idx].working_days = bInfo.billingDays;
                                    setTempQuotas(updated);
                                  }}
                                  className="text-[9px] text-blue-600 hover:underline cursor-pointer"
                                  title="Reset to calendar default"
                                >
                                  Reset ({bInfo.billingDays}d)
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={q.working_days}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 1;
                                const updated = [...tempQuotas];
                                updated[idx].working_days = val;
                                setTempQuotas(updated);
                              }}
                              className="w-full bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Holiday indicator for this month */}
                      {hasHolidays ? (
                        <div className="mt-2.5 text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center space-x-1">
                          <Info className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">
                            Excluded: {bInfo.holidays.map(h => h.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2.5 text-[10px] text-slate-400 font-sans">
                          No corporate holidays in this month
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Summary Row */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Annual Quota (Summing figures for all 12 quota months in FY {selectedYear}):</span>
                </div>
                <span className="text-lg font-bold text-amber-900 font-serif">
                  {formatCurrency(tempQuotasAnnualSum)}
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsEditingQuotas(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotas}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
              >
                Save & Apply Quotas
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Supabase Schema Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900">
                    Supabase SQL Schema & Real-Time View
                  </h3>
                  <p className="text-xs text-slate-500">
                    Provides the table, auto-updating view, and trigger for your Supabase backend.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1">How this keeps everything together & automatically updates:</strong>
                  The PostgreSQL View (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">public.v_annual_quota_pacing</code>) joins directly with your <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">sales</code> table. Whenever new sales records are inserted (via Daily PDF upload or Supabase SQL), the view recalculates every cumulative sum, variance, and daily pace in real time with 0 delay!
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={copySqlToClipboard}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800">
                  {`-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Create the sales_quotas Table
CREATE TABLE IF NOT EXISTS public.sales_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year TEXT NOT NULL,                                           -- e.g. '2024-25', '2025-26'
    fiscal_month INTEGER NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12), -- 1=Oct, 2=Nov, ..., 12=Sep
    month_name TEXT NOT NULL,                                            -- 'OCT', 'NOV', 'DEC', etc.
    quota_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,                      -- Target quota dollar amount
    working_days INTEGER NOT NULL DEFAULT 21,                            -- Business days in month
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotas_fy_fm ON public.sales_quotas(fiscal_year, fiscal_month);
ALTER TABLE public.sales_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Sales Quotas" ON public.sales_quotas FOR ALL USING (true) WITH CHECK (true);

-- 2. Real-Time View: v_annual_quota_pacing
-- Automatically updates real-time as soon as any record is added to sales!
CREATE OR REPLACE VIEW public.v_annual_quota_pacing AS
WITH normalized_sales AS (
    SELECT 
        CASE 
            WHEN s.year LIKE '%-%' THEN s.year
            WHEN UPPER(TRIM(s.month)) IN ('OCT', 'NOV', 'DEC', 'OCTOBER', 'NOVEMBER', 'DECEMBER') 
                 THEN s.year || '-' || SUBSTRING((s.year::INT + 1)::TEXT FROM 3 FOR 2)
            ELSE 
                 (s.year::INT - 1)::TEXT || '-' || SUBSTRING(s.year FROM 3 FOR 2)
        END AS fiscal_year,
        CASE UPPER(TRIM(s.month))
            WHEN 'OCT' THEN 1 WHEN 'OCTOBER' THEN 1
            WHEN 'NOV' THEN 2 WHEN 'NOVEMBER' THEN 2
            WHEN 'DEC' THEN 3 WHEN 'DECEMBER' THEN 3
            WHEN 'JAN' THEN 4 WHEN 'JANUARY' THEN 4
            WHEN 'FEB' THEN 5 WHEN 'FEBRUARY' THEN 5
            WHEN 'MAR' THEN 6 WHEN 'MARCH' THEN 6
            WHEN 'APR' THEN 7 WHEN 'APRIL' THEN 7
            WHEN 'MAY' THEN 8
            WHEN 'JUN' THEN 9 WHEN 'JUNE' THEN 9
            WHEN 'JUL' THEN 10 WHEN 'JULY' THEN 10
            WHEN 'AUG' THEN 11 WHEN 'AUGUST' THEN 11
            WHEN 'SEP' THEN 12 WHEN 'SEPTEMBER' THEN 12
            ELSE 1
        END AS fiscal_month,
        COALESCE(s.cost, 0) AS cost
    FROM public.sales s
),
monthly_actuals AS (
    SELECT 
        ns.fiscal_year,
        ns.fiscal_month,
        SUM(ns.cost) AS total_sales
    FROM normalized_sales ns
    GROUP BY ns.fiscal_year, ns.fiscal_month
),
joined_pacing AS (
    SELECT 
        q.fiscal_year,
        q.fiscal_month,
        q.month_name,
        q.working_days,
        q.quota_amount AS monthly_quota,
        COALESCE(ma.total_sales, 0) AS monthly_sales,
        SUM(q.quota_amount) OVER (PARTITION BY q.fiscal_year ORDER BY q.fiscal_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_quota,
        SUM(COALESCE(ma.total_sales, 0)) OVER (PARTITION BY q.fiscal_year ORDER BY q.fiscal_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_sales,
        SUM(q.quota_amount) OVER (PARTITION BY q.fiscal_year) AS full_year_quota
    FROM public.sales_quotas q
    LEFT JOIN monthly_actuals ma 
        ON ma.fiscal_year = q.fiscal_year 
       AND ma.fiscal_month = q.fiscal_month
)
SELECT 
    fiscal_year,
    fiscal_month,
    month_name,
    working_days,
    ROUND(monthly_quota, 2) AS quota,
    ROUND(cumulative_quota, 2) AS total,
    ROUND(cumulative_sales, 2) AS actual,
    ROUND(cumulative_sales - cumulative_quota, 2) AS cumulative_variance,
    ROUND(monthly_sales, 2) AS sales,
    ROUND(monthly_sales - monthly_quota, 2) AS monthly_variance,
    ROUND(monthly_sales / NULLIF(working_days, 0), 2) AS daily_actual,
    ROUND(monthly_quota / NULLIF(working_days, 0), 2) AS required_daily,
    ROUND((cumulative_sales / NULLIF(cumulative_quota, 0)) * 100, 2) AS attainment_percent,
    ROUND((cumulative_sales / NULLIF(full_year_quota, 0)) * 100, 2) AS annual_percent
FROM joined_pacing
ORDER BY fiscal_year, fiscal_month;`}
                </pre>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500">
                File located at: <code className="font-mono text-slate-700">supabase/quota_schema.sql</code>
              </span>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Corporate Holiday Schedule Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900">
                    Observed Corporate Holidays (FY {selectedYear})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recognized billing & shipping closures excluded from monthly selling days.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Holiday List */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-semibold text-blue-950 flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-blue-700" />
                  <span>Standard Corporate Observance Policy:</span>
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Monday through Friday selling days only. When a corporate holiday falls on a Saturday, it is observed on the preceding Friday. When it falls on a Sunday, it is observed on the following Monday. Batesville logistics and billing are officially closed on these dates.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {billingCalendarInfo
                  .flatMap(m => m.holidays.map(h => ({ ...h, monthName: m.monthName, calYear: m.calYear })))
                  .map((h, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors">
                      <div>
                        <div className="font-bold text-slate-900">{h.name}</div>
                        <div className="text-[11px] text-slate-500">{h.monthName} {h.calYear}</div>
                      </div>
                      <div className="font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-[11px]">
                        {h.date}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-600">
                Total holidays excluded in FY {selectedYear}: <strong className="text-slate-900">{billingCalendarInfo.reduce((sum, m) => sum + m.holidayDays, 0)} days</strong>
              </span>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
