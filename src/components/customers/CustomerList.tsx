import React, { useState } from 'react';
import { Customer } from '../../types';
import { CustomerDetail } from './CustomerDetail';
import { 
  Search, 
  Building2, 
  Tag, 
  ArrowRight, 
  Filter, 
  Check, 
  X, 
  Table as TableIcon, 
  LayoutGrid,
  Mail,
  UserCheck,
  Percent
} from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomerForCard: (customerId: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onSelectCustomerForCard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Extract distinct programs and styles
  const programs = ['all', ...Array.from(new Set(customers.map(c => c.program || 'N/A')))];
  const styles = ['all', ...Array.from(new Set(customers.map(c => c.selectionRoomStyle || 'N/A')))];

  const filteredCustomers = customers.filter((c) => {
    const matchesProgram = selectedProgram === 'all' || (c.program || 'N/A') === selectedProgram;
    const matchesStyle = selectedStyle === 'all' || (c.selectionRoomStyle || 'N/A') === selectedStyle;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(term) ||
      (c.code || '').toLowerCase().includes(term) ||
      String(c.accountNumber || '').toLowerCase().includes(term) ||
      String(c.customerId || '').toLowerCase().includes(term) ||
      (c.mainContact || '').toLowerCase().includes(term) ||
      (c.secondContact || '').toLowerCase().includes(term) ||
      (c.thirdContact || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term);
    return matchesProgram && matchesStyle && matchesSearch;
  });

  if (activeCustomer) {
    return (
      <CustomerDetail
        customer={activeCustomer}
        onBack={() => setActiveCustomer(null)}
        onGeneratePriceCard={(id) => onSelectCustomerForCard(id)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-wide">
                Customers & Partner Accounts
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Live customer records from Supabase with account numbers, contacts, discounts, and selection rooms.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table Grid View (Supabase Schema)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card Directory View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search account #, name, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Filter Row: Programs & Selection Room Styles */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500 font-medium">Program:</span>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {programs.map((p) => (
                <option key={p} value={p}>
                  {p === 'all' ? `All Programs (${customers.length})` : p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Selection Room Style:</span>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Styles' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-slate-500">
          Showing <strong className="text-slate-900">{filteredCustomers.length}</strong> of {customers.length} customer accounts
        </span>
      </div>

      {/* View Mode: Table Grid View (Matches Supabase Table Headers exactly) */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">customer_id</th>
                  <th className="py-3 px-3.5 font-semibold">account_#</th>
                  <th className="py-3 px-3.5 font-semibold min-w-[220px]">account_name</th>
                  <th className="py-3 px-3.5 font-semibold">Main Contact</th>
                  <th className="py-3 px-3.5 font-semibold">email</th>
                  <th className="py-3 px-3.5 font-semibold">2nd Contact</th>
                  <th className="py-3 px-3.5 font-semibold">3rd Contact</th>
                  <th className="py-3 px-3.5 font-semibold">burial_discount</th>
                  <th className="py-3 px-3.5 font-semibold">cremation_discount</th>
                  <th className="py-3 px-3.5 font-semibold">rebate</th>
                  <th className="py-3 px-3.5 font-semibold">selectionroom</th>
                  <th className="py-3 px-3.5 font-semibold">selectionroom_style</th>
                  <th className="py-3 px-3.5 font-semibold">program</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {filteredCustomers.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => setActiveCustomer(c)}
                  >
                    <td className="py-3 px-3.5 text-slate-400">{c.customerId || c.id.replace('cust-', '')}</td>
                    <td className="py-3 px-3.5 text-amber-700 font-bold">{c.accountNumber || c.code}</td>
                    <td className="py-3 px-3.5 font-serif font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      {c.name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-sans">{c.mainContact || '—'}</td>
                    <td className="py-3 px-3.5 text-slate-500 font-sans truncate max-w-[120px]">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-amber-700 hover:underline">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">NULL</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 font-sans">{c.secondContact || <span className="text-slate-400">NULL</span>}</td>
                    <td className="py-3 px-3.5 text-slate-500 font-sans">{c.thirdContact || <span className="text-slate-400">NULL</span>}</td>
                    
                    {/* burial_discount */}
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {c.burialDiscount}%
                      </span>
                    </td>

                    {/* cremation_discount */}
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                        {c.cremationDiscount}%
                      </span>
                    </td>

                    {/* rebate */}
                    <td className="py-3 px-3.5 text-slate-500">
                      {c.rebate !== undefined && c.rebate !== null ? `${c.rebate}%` : <span className="text-slate-400">NULL</span>}
                    </td>

                    {/* selectionroom */}
                    <td className="py-3 px-3.5">
                      {c.selectionRoom ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          <span>TRUE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-400 text-[11px]">
                          <X className="w-3.5 h-3.5" />
                          <span>FALSE</span>
                        </span>
                      )}
                    </td>

                    {/* selectionroom_style */}
                    <td className="py-3 px-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        {c.selectionRoomStyle || 'None'}
                      </span>
                    </td>

                    {/* program */}
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-sans font-bold text-[11px] border ${
                        c.program === 'ARB' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        c.program === 'PLN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        c.program === 'PA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {c.program || 'N/A'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectCustomerForCard(c.id)}
                        className="inline-flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                        title="Create Showroom Price Card for this Customer"
                      >
                        <Tag className="w-3 h-3 text-amber-600" />
                        <span>Price Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode: Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-700">
                    Acct #{customer.accountNumber || customer.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {customer.program || 'N/A'}
                  </span>
                </div>

                <h3 
                  onClick={() => setActiveCustomer(customer)}
                  className="font-serif text-lg font-bold text-slate-900 hover:text-amber-700 transition-colors cursor-pointer leading-snug"
                >
                  {customer.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Main Contact:</span>
                    <span className="font-semibold text-slate-900">{customer.mainContact || '—'}</span>
                  </div>
                  {customer.secondContact && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">2nd Contact:</span>
                      <span>{customer.secondContact}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Burial Discount:</span>
                    <span className="font-mono text-emerald-600 font-bold">{customer.burialDiscount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cremation Discount:</span>
                    <span className="font-mono text-blue-600 font-bold">{customer.cremationDiscount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selection Room:</span>
                    <span className="text-slate-700 font-medium">
                      {customer.selectionRoom ? `✓ ${customer.selectionRoomStyle}` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveCustomer(customer)}
                  className="flex items-center justify-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSelectCustomerForCard(customer.id)}
                  className="flex items-center justify-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Price Card</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
