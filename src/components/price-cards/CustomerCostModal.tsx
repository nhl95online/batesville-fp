import React, { useMemo, useRef, useState } from 'react';
import { Customer } from '../../types';
import {
  parseCustomerCostText,
  saveCustomerCosts,
  getCustomerCostSummary,
  getCurrentFiscalYear,
  CustomerCostRow,
} from '../../services/customerCosts';
import { X, Upload, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';

interface CustomerCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSaved?: () => void;
}

export const CustomerCostModal: React.FC<CustomerCostModalProps> = ({ isOpen, onClose, customers, onSaved }) => {
  const currentFY = getCurrentFiscalYear();
  const yearOptions = useMemo(() => {
    const start = parseInt(currentFY, 10);
    return [start + 1, start, start - 1, start - 2, start - 3].map(s => `${s}-${String(s + 1).slice(-2)}`);
  }, [currentFY]);

  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [replaceYear, setReplaceYear] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<CustomerCostRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState(getCustomerCostSummary());

  const nameByAcct = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(String(c.accountNumber ?? c.code ?? '').replace(/[^0-9]/g, ''), c.name);
    return m;
  }, [customers]);

  const parse = (text: string) => {
    setRawText(text);
    const res = parseCustomerCostText(text);
    setRows(res.rows);
    setSkipped(res.skipped);
    setMessage(null);
  };

  const handleFile = async (file: File) => {
    if (/\.xlsx?$/i.test(file.name)) {
      setMessage({ type: 'error', text: 'Please save the Excel file as CSV (File → Save As → CSV) or copy the cells and paste them below.' });
      return;
    }
    parse(await file.text());
  };

  const distinctAccounts = useMemo(() => Array.from(new Set(rows.map(r => r.accountNumber))), [rows]);
  const unknownAccounts = distinctAccounts.filter(a => !nameByAcct.has(a));

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    const res = await saveCustomerCosts(fiscalYear, rows, replaceYear);
    setSaving(false);
    setSummary(getCustomerCostSummary());
    if (res.cloudError) {
      setMessage({
        type: 'warning',
        text: `Saved ${res.saved} costs on this computer. Supabase sync failed: ${res.cloudError}. Run supabase/customer_pricing.sql in the Supabase SQL Editor, then load again.`,
      });
    } else {
      setMessage({ type: 'success', text: `Saved ${res.saved} customer costs for FY ${fiscalYear} to Supabase.` });
    }
    onSaved?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-800 text-white rounded-lg"><DollarSign className="w-4 h-4" /></div>
            <div>
              <h2 className="font-serif font-bold text-slate-900">Load Customer Cost Pricing</h2>
              <p className="text-xs text-slate-500">What each funeral home pays (not retail). One file for all customers.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Year + options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              Pricing Fiscal Year:
              <select
                value={fiscalYear}
                onChange={e => setFiscalYear(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>FY {y}{y === currentFY ? ' (current)' : ''}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={replaceYear} onChange={e => setReplaceYear(e.target.checked)} />
              Replace all existing costs for this year
            </label>
          </div>

          {/* File / paste */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Columns: <strong>Account #</strong>, <strong>Product Code</strong>, <strong>Cost</strong> (header row optional)
              </span>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Choose CSV File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
            <textarea
              value={rawText}
              onChange={e => parse(e.target.value)}
              placeholder={'…or paste straight from Excel:\nAccount #\tProduct Code\tCost\n129085\t147959\t6250.00\n129146\t271819\t1895.00'}
              className="w-full h-32 bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">{rows.length} prices</span>
                <span className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 font-semibold">{distinctAccounts.length} funeral homes</span>
                {skipped > 0 && <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800">{skipped} lines skipped</span>}
                {unknownAccounts.length > 0 && (
                  <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800" title={unknownAccounts.join(', ')}>
                    {unknownAccounts.length} account(s) not in customers
                  </span>
                )}
              </div>
              <div className="max-h-56 overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-1.5">Account #</th>
                      <th className="text-left px-3 py-1.5">Funeral Home</th>
                      <th className="text-left px-3 py-1.5">Product Code</th>
                      <th className="text-right px-3 py-1.5">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rows.slice(0, 200).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1">{r.accountNumber}</td>
                        <td className="px-3 py-1 font-sans truncate max-w-[220px]">{nameByAcct.get(r.accountNumber) || <span className="text-rose-600">Unknown</span>}</td>
                        <td className="px-3 py-1">{r.productCode}</td>
                        <td className="px-3 py-1 text-right">${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 200 && <p className="text-[11px] text-slate-500">Showing first 200 of {rows.length}.</p>}
            </div>
          )}

          {message && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
              message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : message.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Loaded summary */}
          {summary.length > 0 && (
            <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
              <strong className="text-slate-700">Already loaded:</strong>{' '}
              {summary.map(s => `FY ${s.fiscalYear}: ${s.items} prices / ${s.customers} homes`).join(' • ')}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer">Close</button>
          <button
            onClick={handleSave}
            disabled={rows.length === 0 || saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : `Save ${rows.length || ''} Costs for FY ${fiscalYear}`}
          </button>
        </div>
      </div>
    </div>
  );
};
