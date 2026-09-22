import React, { useState, useEffect } from 'react';
import { Customer, Product } from '../../types';
import { 
  getCustomerRetails, 
  saveCustomerRetails, 
  removeCustomerProductRetail, 
  parseRetailListText,
  CustomerRetailMap 
} from '../../services/customerRetails';
import { X, DollarSign, Upload, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CustomerRetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  currentCustomerId?: string;
  onRetailsUpdated: (customerId: string) => void;
}

export const CustomerRetailModal: React.FC<CustomerRetailModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  currentCustomerId,
  onRetailsUpdated,
}) => {
  const [selectedCustId, setSelectedCustId] = useState<string>(currentCustomerId || '');
  const [loadedRetails, setLoadedRetails] = useState<CustomerRetailMap>({});
  const [pasteText, setPasteText] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    if (currentCustomerId) {
      setSelectedCustId(currentCustomerId);
    } else if (customers.length > 0 && !selectedCustId) {
      setSelectedCustId(customers[0].code || customers[0].id);
    }
  }, [currentCustomerId, customers]);

  useEffect(() => {
    if (selectedCustId) {
      const data = getCustomerRetails(selectedCustId);
      setLoadedRetails(data);
      setStatusMsg(null);
    }
  }, [selectedCustId]);

  if (!isOpen) return null;

  const handleImportPasted = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRetailListText(pasteText);
    const count = Object.keys(parsed).length;
    if (count === 0) {
      setStatusMsg({ success: false, text: 'No valid "Product Code, Price" rows detected. Please check format.' });
      return;
    }

    saveCustomerRetails(selectedCustId, parsed);
    const updated = getCustomerRetails(selectedCustId);
    setLoadedRetails(updated);
    setPasteText('');
    setStatusMsg({ success: true, text: `Successfully loaded ${count} retail prices for this customer!` });
    onRetailsUpdated(selectedCustId);
  };

  const handleAddSingle = () => {
    if (!newCode.trim() || !newPrice.trim()) return;
    const num = parseFloat(newPrice.replace(/[\$,]/g, ''));
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ success: false, text: 'Please enter a valid retail price.' });
      return;
    }

    const updated = { ...loadedRetails, [newCode.trim()]: Math.round(num * 100) / 100 };
    saveCustomerRetails(selectedCustId, updated);
    setLoadedRetails(updated);
    setNewCode('');
    setNewPrice('');
    setStatusMsg({ success: true, text: `Added retail price for SKU ${newCode.trim()}: $${num.toLocaleString()}` });
    onRetailsUpdated(selectedCustId);
  };

  const handleDeleteItem = (code: string) => {
    removeCustomerProductRetail(selectedCustId, code);
    const updated = getCustomerRetails(selectedCustId);
    setLoadedRetails(updated);
    onRetailsUpdated(selectedCustId);
  };

  const currentCustomerObj = customers.find(c => 
    c.code === selectedCustId || c.id === selectedCustId || String(c.accountNumber) === selectedCustId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Customer Retail Price List
              </h3>
              <p className="text-xs text-slate-500">
                Load custom showroom retail prices per customer funeral home.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Customer Selector */}
          <div>
            <label className="text-slate-600 font-semibold uppercase tracking-wider block mb-1.5">
              Select Funeral Home:
            </label>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.code || c.id}>
                  #{c.accountNumber || c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
              statusMsg.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Quick Paste Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-600" />
                <span>Paste Retail List from Excel / CSV:</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Format: ItemCode, Price</span>
            </div>
            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="e.g.&#10;271819, 4065&#10;195846, 8245&#10;242987, 4995"
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
            />
            <div className="flex justify-end">
              <button
                onClick={handleImportPasted}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Import Pasted Retails
              </button>
            </div>
          </div>

          {/* Add Single Item */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700 uppercase tracking-wider block">
              Add / Override Single Casket Retail:
            </span>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Batesville SKU (e.g. 271819)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Retail $ (e.g. 4065)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-2">
                <button
                  onClick={handleAddSingle}
                  className="w-full h-full bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Loaded Retails Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 uppercase tracking-wider">
                Loaded Retails for #{currentCustomerObj?.accountNumber || selectedCustId} ({Object.keys(loadedRetails).length} items):
              </span>
            </div>

            {Object.keys(loadedRetails).length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No custom retail prices loaded for this funeral home yet. Paste a list above or enter an item code.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-xs">
                {Object.entries(loadedRetails).map(([code, price]) => {
                  const prod = products.find(p => String(p.code) === code);
                  return (
                    <div key={code} className="flex items-center justify-between p-2.5 hover:bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-700">{code}</span>
                        <span className="text-slate-600 truncate max-w-[260px]">
                          {prod ? prod.name : 'Custom Item'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-emerald-700 font-bold text-sm">
                          ${price.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteItem(code)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Remove price"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
