import React, { useState, useEffect } from 'react';
import { Customer, SaleRecord } from '../../types';
import { getCustomerMetrics, db } from '../../services/db';
import { 
  Building2, 
  Mail, 
  ArrowLeft, 
  Tag, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Calendar, 
  Users,
  Percent,
  Check,
  X,
  FileText,
  LayoutGrid
} from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
  onGeneratePriceCard: (customerId: string) => void;
  onOpenFloorPlan?: (customerId: string) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  onBack,
  onGeneratePriceCard,
  onOpenFloorPlan,
}) => {
  const [metrics, setMetrics] = useState<{
    totalRevenue: number;
    totalUnits: number;
    orderCount: number;
    averageOrderValue: number;
    yearlyBreakdown: { year: string | number; revenue: number; units: number }[];
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<SaleRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const m = await getCustomerMetrics(customer);
      setMetrics(m);

      const custAcct = String(customer.accountNumber || customer.code || '');
      const orders = await db.sales
        .filter(s => {
          const sAcct = String(s.accountNumber || '');
          if (custAcct && (sAcct === custAcct || s.customerId === `cust-${custAcct}`)) return true;
          if (s.customerId === customer.id || sAcct === customer.id) return true;
          if (s.accountName && customer.name && s.accountName.toLowerCase() === customer.name.toLowerCase()) return true;
          return false;
        })
        .reverse()
        .limit(20)
        .toArray();
      
      setRecentOrders(orders);
    }
    loadData();
  }, [customer]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                {customer.name}
              </h1>
              <span className="px-3 py-0.5 rounded-full font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                {customer.program || 'Standard'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Account #: <span className="font-mono text-amber-700 font-bold">{customer.accountNumber || customer.code}</span> • Customer ID: <span className="font-mono text-slate-600">{customer.customerId || customer.id.replace('cust-', '')}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenFloorPlan && (
            <button
              onClick={() => onOpenFloorPlan(customer.id)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer text-xs sm:text-sm"
            >
              <LayoutGrid className="w-4 h-4 text-amber-400" />
              <span>Interactive Floor Plan</span>
            </button>
          )}

          <button
            onClick={() => onGeneratePriceCard(customer.id)}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer text-xs sm:text-sm"
          >
            <Tag className="w-4 h-4" />
            <span>Create Showroom Price Cards</span>
          </button>
        </div>
      </div>

      {/* Grid of Details: Supabase Headers & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Supabase Customer Identity & Contact Fields */}
        <div className="bg-[#fafcfa] border-2 border-slate-400 p-6 space-y-4 shadow-xs">
          <h2 className="text-xs font-serif font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-2">
            <Users className="w-4 h-4 text-emerald-800" />
            Supabase Customer Profile
          </h2>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">customer_id:</span>
              <span className="font-mono font-semibold text-slate-900">{customer.customerId || customer.id.replace('cust-', '')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Account Number:</span>
              <span className="font-mono font-bold text-emerald-800">{customer.accountNumber || customer.code}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Name:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{customer.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Address:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{customer.address || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">City:</span>
              <span className="font-semibold text-slate-900">{customer.city || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">State:</span>
              <span className="font-semibold text-slate-900">{customer.state || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Primary Contact:</span>
              <span className="font-semibold text-slate-900">{customer.primaryContact || customer.mainContact || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Contact Phone:</span>
              <span className="font-mono text-slate-800">{customer.contactPhone || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Main Phone Number:</span>
              <span className="font-mono text-slate-800">{customer.mainPhoneNumber || customer.phone || '—'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Contact Email:</span>
              <span className="truncate max-w-[200px]">
                {(customer.contactEmail || customer.email) ? (
                  <a href={`mailto:${customer.contactEmail || customer.email}`} className="text-blue-800 hover:underline">
                    {customer.contactEmail || customer.email}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Programs, Delivery & Showroom Details */}
        <div className="bg-[#fafcfa] border-2 border-slate-400 p-6 space-y-4 shadow-xs">
          <h2 className="text-xs font-serif font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-2">
            <Building2 className="w-4 h-4 text-blue-900" />
            Program &amp; Account Classification
          </h2>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Delivery Days:</span>
              <span className="font-mono font-bold text-emerald-800">{customer.deliveryDays || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Customer Spectrum:</span>
              <span className="font-semibold text-slate-900">{customer.customerSpectrum || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Customer Purchase Program:</span>
              <span className="font-bold text-emerald-800">{customer.customerPurchaseProgram || customer.program || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Net Urn Price:</span>
              <span className="font-mono text-slate-900">
                {customer.netUrnPrice !== undefined && customer.netUrnPrice !== null && customer.netUrnPrice !== '' ? String(customer.netUrnPrice) : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Program Sub-Group 2:</span>
              <span className="font-semibold text-slate-900">{customer.programSubGroup2 || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Digital Showroom Migration Priority:</span>
              <span className="font-semibold text-blue-900">{customer.digitalShowroomMigrationPriority || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Customer Type:</span>
              <span className="font-semibold text-slate-900">{customer.customerType || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Attitude towards Batesville:</span>
              <span className="font-semibold text-slate-900">{customer.attitudeTowardsBatesville || '—'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Primary Burial Products Competitor:</span>
              <span className="font-semibold text-slate-900">{customer.primaryBurialProductsCompetitor || '—'}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Multi-Year Sales Metrics */}
        <div className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
                  <span>Total Purchases</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-serif text-2xl font-bold text-slate-900">
                  ${metrics.totalRevenue.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {metrics.totalUnits} caskets & urns delivered
                </span>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
                  <span>Lifetime Orders</span>
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div className="font-serif text-2xl font-bold text-slate-900">
                  {metrics.orderCount} orders
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Avg order: ${metrics.averageOrderValue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Year by Year Breakdown */}
          {metrics && metrics.yearlyBreakdown.length > 0 && (
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Purchasing by Year
              </h3>
              <div className="space-y-1.5">
                {metrics.yearlyBreakdown.map((yr) => (
                  <div key={yr.year} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-mono text-slate-600">{yr.year}</span>
                    <span className="font-mono font-bold text-amber-700">${yr.revenue.toLocaleString()}</span>
                    <span className="text-slate-500 text-[11px]">{yr.units} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Recent Orders Table */}
      {recentOrders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-serif font-bold text-slate-900">Purchase History</h3>
            <span className="text-xs text-slate-500">Latest orders from Supabase</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Order #</th>
                  <th className="py-3 px-4 font-semibold">Year</th>
                  <th className="py-3 px-4 font-semibold">Product Code</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Quantity</th>
                  <th className="py-3 px-4 font-semibold">Unit Cost</th>
                  <th className="py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-700">{ord.orderNumber}</td>
                    <td className="py-3 px-4 font-mono">{ord.year}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ord.productCode}</td>
                    <td className="py-3 px-4 text-slate-900 font-sans truncate max-w-[260px]">{ord.description || ord.notes || '—'}</td>
                    <td className="py-3 px-4 font-mono">{ord.quantity}</td>
                    <td className="py-3 px-4 font-mono">${ord.unitPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">${ord.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
