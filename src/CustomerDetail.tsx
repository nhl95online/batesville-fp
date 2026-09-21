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
  FileText 
} from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
  onGeneratePriceCard: (customerId: string) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  onBack,
  onGeneratePriceCard,
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
      const m = await getCustomerMetrics(customer.id);
      setMetrics(m);

      const orders = await db.sales
        .where('customerId')
        .equals(customer.id)
        .reverse()
        .limit(10)
        .toArray();
      
      if (orders.length === 0 && customer.accountNumber) {
        const altOrders = await db.sales
          .filter(s => s.accountNumber === String(customer.accountNumber) || s.accountName === customer.name)
          .reverse()
          .limit(10)
          .toArray();
        setRecentOrders(altOrders);
      } else {
        setRecentOrders(orders);
      }
    }
    loadData();
  }, [customer.id, customer.accountNumber, customer.name]);

  return (
    <div className="space-y-6">
      {/* Top Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                {customer.name}
              </h1>
              <span className="px-3 py-0.5 rounded-full font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {customer.program || 'Standard'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Account #: <span className="font-mono text-amber-400 font-bold">{customer.accountNumber || customer.code}</span> • Customer ID: <span className="font-mono text-slate-300">{customer.customerId || customer.id.replace('cust-', '')}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => onGeneratePriceCard(customer.id)}
          className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Tag className="w-4 h-4" />
          <span>Create Showroom Price Cards</span>
        </button>
      </div>

      {/* Grid of Details: Supabase Headers & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Supabase Customer Fields */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-amber-400" />
            Supabase Account Profile
          </h2>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">customer_id:</span>
              <span className="font-mono font-semibold text-white">{customer.customerId || customer.id.replace('cust-', '')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">account_#:</span>
              <span className="font-mono font-bold text-amber-400">{customer.accountNumber || customer.code}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">account_name:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{customer.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Main Contact:</span>
              <span className="font-semibold text-slate-100">{customer.mainContact || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">email:</span>
              <span className="truncate max-w-[180px]">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-amber-400 hover:underline">
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-slate-600">NULL</span>
                )}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">2nd Contact:</span>
              <span>{customer.secondContact || <span className="text-slate-600">NULL</span>}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">3rd Contact:</span>
              <span>{customer.thirdContact || <span className="text-slate-600">NULL</span>}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">program:</span>
              <span className="font-bold text-amber-300">{customer.program || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Discounts & Selection Room Configuration */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-emerald-400" />
            Discounts & Selection Room
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block uppercase">burial_discount</span>
              <span className="font-mono text-3xl font-black text-emerald-400 mt-1 block">
                {customer.burialDiscount}%
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Off Caskets</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block uppercase">cremation_discount</span>
              <span className="font-mono text-3xl font-black text-blue-400 mt-1 block">
                {customer.cremationDiscount}%
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Off Urns/Units</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">rebate:</span>
              <span className="font-mono text-slate-300">
                {customer.rebate !== undefined && customer.rebate !== null ? `${customer.rebate}%` : 'NULL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">selectionroom:</span>
              <span className={`font-bold flex items-center gap-1 ${customer.selectionRoom ? 'text-emerald-400' : 'text-slate-500'}`}>
                {customer.selectionRoom ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {customer.selectionRoom ? 'TRUE (Active)' : 'FALSE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">selectionroom_style:</span>
              <span className="font-semibold text-amber-300">{customer.selectionRoomStyle || 'None'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            💡 <strong>Price Card Automation:</strong> When printing price cards for this funeral home, their <strong>{customer.burialDiscount}% burial discount</strong> is automatically reflected in the calculation!
          </p>
        </div>

        {/* Column 3: Multi-Year Sales Metrics */}
        <div className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-1">
                  <span>Total Purchases</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="font-serif text-2xl font-bold text-white">
                  ${metrics.totalRevenue.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  {metrics.totalUnits} caskets & urns delivered
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-1">
                  <span>Lifetime Orders</span>
                  <Package className="w-4 h-4 text-amber-400" />
                </div>
                <div className="font-serif text-2xl font-bold text-white">
                  {metrics.orderCount} orders
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Avg order: ${metrics.averageOrderValue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Year by Year Breakdown */}
          {metrics && metrics.yearlyBreakdown.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Purchasing by Year
              </h3>
              <div className="space-y-1.5">
                {metrics.yearlyBreakdown.map((yr) => (
                  <div key={yr.year} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60 last:border-0">
                    <span className="font-mono text-slate-300">{yr.year}</span>
                    <span className="font-mono font-bold text-amber-300">${yr.revenue.toLocaleString()}</span>
                    <span className="text-slate-400 text-[11px]">{yr.units} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Recent Orders Table */}
      {recentOrders.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-serif font-bold text-white">Purchase History</h3>
            <span className="text-xs text-slate-400">Latest orders from Supabase</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-300">{ord.orderNumber}</td>
                    <td className="py-3 px-4 font-mono">{ord.year}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{ord.productCode}</td>
                    <td className="py-3 px-4 text-white truncate max-w-[260px]">{ord.description || ord.notes || '—'}</td>
                    <td className="py-3 px-4 font-mono">{ord.quantity}</td>
                    <td className="py-3 px-4 font-mono">${ord.unitPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">${ord.totalAmount.toLocaleString()}</td>
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
