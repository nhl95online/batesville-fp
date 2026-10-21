import React, { useState, useEffect } from 'react';
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
  onOpenFloorPlan?: (customerId: string) => void;
  selectedProgram?: string;
  onProgramChange?: (program: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onSelectCustomerForCard,
  onOpenFloorPlan,
  selectedProgram: selectedProgramProp,
  onProgramChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>(selectedProgramProp || 'all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (selectedProgramProp !== undefined && selectedProgramProp !== selectedProgram) {
      setSelectedProgram(selectedProgramProp);
    }
  }, [selectedProgramProp]);

  const handleSelectProgram = (prog: string) => {
    setSelectedProgram(prog);
    onProgramChange?.(prog);
  };

  // Extract distinct purchase programs and customer types
  const programs = ['all', ...Array.from(new Set(customers.map(c => c.customerPurchaseProgram || c.program || '').filter(Boolean)))];
  const customerTypes = ['all', ...Array.from(new Set(customers.map(c => c.customerType || c.customerSpectrum || '').filter(Boolean)))];

  const filteredCustomers = customers.filter((c) => {
    const custProg = c.customerPurchaseProgram || c.program || 'N/A';
    const matchesProgram = 
      selectedProgram === 'all' ? true :
      selectedProgram === 'selection-rooms' ? Boolean(c.selectionRoom || c.digitalShowroomMigrationPriority) :
      custProg === selectedProgram;
    const custTypeVal = c.customerType || c.customerSpectrum || 'N/A';
    const matchesStyle = selectedStyle === 'all' || custTypeVal === selectedStyle;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(term) ||
      (c.code || '').toLowerCase().includes(term) ||
      String(c.accountNumber || '').toLowerCase().includes(term) ||
      String(c.customerId || '').toLowerCase().includes(term) ||
      (c.address || '').toLowerCase().includes(term) ||
      (c.city || '').toLowerCase().includes(term) ||
      (c.state || '').toLowerCase().includes(term) ||
      (c.primaryContact || c.mainContact || '').toLowerCase().includes(term) ||
      (c.contactPhone || '').toLowerCase().includes(term) ||
      (c.mainPhoneNumber || c.phone || '').toLowerCase().includes(term) ||
      (c.deliveryDays || '').toLowerCase().includes(term) ||
      (c.customerSpectrum || '').toLowerCase().includes(term) ||
      (c.customerPurchaseProgram || c.program || '').toLowerCase().includes(term) ||
      (c.programSubGroup2 || '').toLowerCase().includes(term) ||
      (c.contactEmail || c.email || '').toLowerCase().includes(term) ||
      (c.customerType || '').toLowerCase().includes(term) ||
      (c.attitudeTowardsBatesville || '').toLowerCase().includes(term) ||
      (c.primaryBurialProductsCompetitor || '').toLowerCase().includes(term);
    return matchesProgram && matchesStyle && matchesSearch;
  });

  if (activeCustomer) {
    return (
      <CustomerDetail
        customer={activeCustomer}
        onBack={() => setActiveCustomer(null)}
        onGeneratePriceCard={(id) => onSelectCustomerForCard(id)}
        onOpenFloorPlan={onOpenFloorPlan}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Newspaper Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fafcfa] border-y-4 border-double border-blue-950 border-x border-slate-300 p-6 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-900 border border-blue-950 text-blue-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-bold block">
                § PARTNER DIRECTORY • FUNERAL HOME ACCOUNTS
              </span>
              <h1 className="text-2xl font-serif font-black text-slate-950 tracking-wide uppercase">
                Customers &amp; Partner Accounts
              </h1>
              <p className="text-xs sm:text-sm font-serif italic text-slate-600">
                Live customer records from Supabase with account numbers, locations, contacts, delivery days, and purchase programs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-[#eef4f1] p-1 border border-slate-400">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-emerald-800 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table Grid View (Supabase Schema)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-blue-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card Directory View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-emerald-800 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search account #, name, city, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-400 pl-10 pr-4 py-2 text-xs font-serif text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-800"
            />
          </div>
        </div>
      </div>

      {/* Filter Row: Purchase Programs & Customer Types */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#fafcfa] p-4 border border-slate-400 border-t-2 border-t-emerald-800 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span className="text-slate-700 font-serif font-bold uppercase tracking-wider">Purchase Program:</span>
            <select
              value={selectedProgram}
              onChange={(e) => handleSelectProgram(e.target.value)}
              className="bg-white border border-slate-400 px-2.5 py-1 text-slate-900 font-serif focus:outline-none focus:border-emerald-800 cursor-pointer"
            >
              <option value="all">All Programs ({customers.length})</option>
              {programs.filter(p => p !== 'all').map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-700 font-serif font-bold uppercase tracking-wider">Customer Type:</span>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="bg-white border border-slate-400 px-2.5 py-1 text-slate-900 font-serif focus:outline-none focus:border-blue-800 cursor-pointer"
            >
              {customerTypes.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Customer Types' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-slate-700 font-serif italic">
          Showing <strong className="text-blue-950 not-italic font-mono">{filteredCustomers.length}</strong> of {customers.length} customer accounts
        </span>
      </div>

      {/* View Mode: Table Grid View (Matches Exact 19 Supabase Table Headers) */}
      {viewMode === 'table' ? (
        <div className="bg-[#fafcfa] border-2 border-slate-400 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#eef4f1] text-blue-950 tracking-wider border-b-2 border-double border-emerald-900 sticky top-0 z-10 backdrop-blur font-mono text-[11px] whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">customer_id</th>
                  <th className="py-3 px-3.5 font-semibold">Account Number</th>
                  <th className="py-3 px-3.5 font-semibold min-w-[220px]">Name</th>
                  <th className="py-3 px-3.5 font-semibold min-w-[180px]">Address</th>
                  <th className="py-3 px-3.5 font-semibold">City</th>
                  <th className="py-3 px-3.5 font-semibold">State</th>
                  <th className="py-3 px-3.5 font-semibold">Primary Contact</th>
                  <th className="py-3 px-3.5 font-semibold">Contact Phone</th>
                  <th className="py-3 px-3.5 font-semibold">Main Phone Number</th>
                  <th className="py-3 px-3.5 font-semibold">Delivery Days</th>
                  <th className="py-3 px-3.5 font-semibold">Customer Spectrum</th>
                  <th className="py-3 px-3.5 font-semibold">Customer Purchase Program</th>
                  <th className="py-3 px-3.5 font-semibold">Net Urn Price</th>
                  <th className="py-3 px-3.5 font-semibold">Program Sub-Group 2</th>
                  <th className="py-3 px-3.5 font-semibold">Contact Email</th>
                  <th className="py-3 px-3.5 font-semibold">Digital Showroom Migration Priority</th>
                  <th className="py-3 px-3.5 font-semibold">Customer Type</th>
                  <th className="py-3 px-3.5 font-semibold">Attitude towards Batesville</th>
                  <th className="py-3 px-3.5 font-semibold">Primary Burial Products Competitor</th>
                  <th className="py-3 px-3.5 font-semibold">burial_discount</th>
                  <th className="py-3 px-3.5 font-semibold">cremation_discount</th>
                  <th className="py-3 px-3.5 font-semibold">rebate</th>
                  <th className="py-3 px-3.5 font-semibold">selectionroom</th>
                  <th className="py-3 px-3.5 font-semibold">selectionroom_style</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-mono whitespace-nowrap">
                {filteredCustomers.map((c) => {
                  const emailVal = c.contactEmail || c.email;
                  const progVal = c.customerPurchaseProgram || c.program;
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-emerald-50/50 transition-colors group cursor-pointer"
                      onClick={() => setActiveCustomer(c)}
                    >
                      <td className="py-3 px-3.5 text-slate-500">{c.customerId || c.id.replace('cust-', '')}</td>
                      <td className="py-3 px-3.5 text-emerald-800 font-bold">{c.accountNumber || c.code}</td>
                      <td className="py-3 px-3.5 font-serif font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {c.name}
                      </td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.address || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.city || '—'}</td>
                      <td className="py-3 px-3.5 font-sans font-semibold text-slate-800">{c.state || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-800 font-sans">{c.primaryContact || c.mainContact || '—'}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-700">{c.contactPhone || '—'}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-700">{c.mainPhoneNumber || c.phone || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.deliveryDays || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.customerSpectrum || '—'}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2.5 py-0.5 rounded-xs font-sans font-bold text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-300">
                          {progVal || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {c.netUrnPrice !== undefined && c.netUrnPrice !== null && c.netUrnPrice !== '' ? String(c.netUrnPrice) : '—'}
                      </td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.programSubGroup2 || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-600 font-sans">
                        {emailVal ? (
                          <a
                            href={`mailto:${emailVal}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-800 hover:underline"
                          >
                            {emailVal}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.digitalShowroomMigrationPriority || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.customerType || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.attitudeTowardsBatesville || '—'}</td>
                      <td className="py-3 px-3.5 font-sans text-slate-700">{c.primaryBurialProductsCompetitor || '—'}</td>

                      {/* burial_discount */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          {c.burialDiscount ?? 0}%
                        </span>
                      </td>

                      {/* cremation_discount */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          {c.cremationDiscount ?? 0}%
                        </span>
                      </td>

                      {/* rebate */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {c.rebate !== undefined && c.rebate !== null ? `${c.rebate}%` : '—'}
                      </td>

                      {/* selectionroom */}
                      <td className="py-3 px-3.5">
                        {c.selectionRoom ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
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
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[11px]">
                          {c.selectionRoomStyle || 'None'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {onOpenFloorPlan && (
                            <button
                              onClick={() => onOpenFloorPlan(c.id)}
                              className="inline-flex items-center space-x-1 bg-blue-950 hover:bg-blue-900 text-white px-2.5 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              title="Interactive Showroom Floor Plan"
                            >
                              <LayoutGrid className="w-3 h-3 text-emerald-300" />
                              <span>Floor Plan</span>
                            </button>
                          )}
                          <button
                            onClick={() => onSelectCustomerForCard(c.id)}
                            className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-400 px-2.5 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Create Showroom Price Card for this Customer"
                          >
                            <Tag className="w-3 h-3 text-emerald-700" />
                            <span>Price Card</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              className="bg-[#fafcfa] border-2 border-slate-400 p-5 hover:border-emerald-800 hover:shadow-md transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    Acct #{customer.accountNumber || customer.code}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                    {customer.customerPurchaseProgram || customer.program || 'Standard'}
                  </span>
                </div>

                <h3 
                  onClick={() => setActiveCustomer(customer)}
                  className="font-serif text-lg font-bold text-slate-900 hover:text-blue-900 transition-colors cursor-pointer leading-snug"
                >
                  {customer.name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-[#eef4f1] p-3 border border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                      {[customer.city, customer.state].filter(Boolean).join(', ') || customer.address || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary Contact:</span>
                    <span className="font-semibold text-slate-900">{customer.primaryContact || customer.mainContact || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-800">{customer.mainPhoneNumber || customer.contactPhone || customer.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-300">
                    <span className="text-slate-500">Delivery Days:</span>
                    <span className="font-mono text-emerald-800 font-bold">{customer.deliveryDays || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer Type:</span>
                    <span className="text-slate-800 font-medium">{customer.customerType || customer.customerSpectrum || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setActiveCustomer(customer)}
                  className="flex items-center justify-center space-x-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-400 text-[11px] font-semibold py-2 px-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {onOpenFloorPlan && (
                  <button
                    onClick={() => onOpenFloorPlan(customer.id)}
                    className="flex items-center justify-center space-x-1 bg-blue-950 hover:bg-blue-900 text-white text-[11px] font-semibold py-2 px-1 transition-all cursor-pointer shadow-2xs"
                    title="Interactive Showroom Floor Plan"
                  >
                    <LayoutGrid className="w-3 h-3 text-emerald-300" />
                    <span>Floor Plan</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectCustomerForCard(customer.id)}
                  className="flex items-center justify-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-400 text-[11px] font-semibold py-2 px-1 transition-all cursor-pointer shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-emerald-700" />
                  <span>Card</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
