import React, { useState, useRef } from 'react';
import { Customer, Product } from '../../types';
import { 
  extractLinesFromPdf, 
  parseSalesLines, 
  convertParsedRowsToSaleRecords, 
  ParsedSaleRow, 
  PdfParseResult 
} from '../../services/pdfSalesParser';
import { addBulkSales } from '../../services/db';
import { getSupabaseClient } from '../../services/supabase';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  DollarSign, 
  Package, 
  Calendar, 
  Building2, 
  ArrowRight,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

interface DailySalesUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onSalesAdded?: (count: number) => void;
}

export const DailySalesUploadModal: React.FC<DailySalesUploadModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onSalesAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'paste'>('pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState<PdfParseResult | null>(null);
  const [editableRows, setEditableRows] = useState<ParsedSaleRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid .pdf sales report document.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const lines = await extractLinesFromPdf(file);
      if (lines.length === 0) {
        throw new Error('No readable text lines found in the uploaded PDF. Please verify the document is not an unscanned image.');
      }

      const result = parseSalesLines(lines, file.name, customers, products);
      if (result.rows.length === 0) {
        setErrorMessage(`Found ${lines.length} lines in the PDF, but no sales transaction patterns were matched. You can also paste text directly in the "Paste Text" tab.`);
      }
      setParseResult(result);
      setEditableRows(result.rows);
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setErrorMessage(err.message || 'Failed to extract text from PDF document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessPdfFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessPdfFile(file);
    }
  };

  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste sales report text or table content.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const lines = pasteText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const result = parseSalesLines(lines, 'Pasted Report', customers, products);
      setParseResult(result);
      setEditableRows(result.rows);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse pasted text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRow = (id: string) => {
    setEditableRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof ParsedSaleRow, value: any) => {
    setEditableRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'quantity' || field === 'cost') {
          updated.totalAmount = (Number(updated.quantity) || 1) * (Number(updated.cost) || 0);
        }
        return updated;
      }
      return r;
    }));
  };

  const handleCommitSales = async () => {
    if (editableRows.length === 0) {
      setErrorMessage('No sales records to add.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const saleRecords = convertParsedRowsToSaleRecords(editableRows);
      
      // 1. Save to local Dexie IndexedDB and refresh in-memory cache
      await addBulkSales(saleRecords);

      // 2. If Supabase is connected, attempt sync to remote sales table
      try {
        const client = getSupabaseClient();
        const remotePayload = saleRecords.map(s => ({
          sale_id: s.saleId,
          year: s.year,
          month: s.month,
          day: s.day,
          program: s.program,
          account_name: s.accountName,
          'account_#': s.accountNumber,
          product_code: s.productCode,
          category: s.category,
          description: s.description,
          qty: s.quantity,
          cost: s.cost
        }));

        await client.from('sales').insert(remotePayload);
      } catch (remoteErr) {
        console.warn('Remote Supabase sales insert warning (saved locally):', remoteErr);
      }

      setSuccessMessage(`Successfully added ${saleRecords.length} sales records to the Sales table!`);
      if (onSalesAdded) {
        onSalesAdded(saleRecords.length);
      }

      // Close modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving sales:', err);
      setErrorMessage(err.message || 'Failed to save sales records.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalCalculatedRevenue = editableRows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCalculatedUnits = editableRows.reduce((sum, r) => sum + Number(r.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#161e2a] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-[#121820]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Daily Sales PDF Report Upload
              </h2>
              <p className="text-xs text-slate-400">
                Upload Batesville daily sales reports or invoices in PDF format to append to the sales table.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: PDF File vs Paste Text */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800 bg-[#141b25] text-xs space-x-3">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center space-x-1.5 pb-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload PDF File</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center space-x-1.5 pb-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Paste Text / Table</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Messages */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center space-x-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Upload Dropzone (Tab 1) */}
          {activeTab === 'pdf' && !parseResult && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
                  : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                {isLoading ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>

              <h3 className="text-base font-bold text-white mb-1">
                {isLoading ? 'Extracting & Parsing Daily Sales PDF...' : 'Drop your Daily Sales PDF here'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Supports Batesville <strong>Daily Billing Reports</strong>: automatically parses Item Number, Description, Qty, and Invoice $$, resolves the Account # from Customer Ship-to Name, matches official customer names, and excludes grey subtotal rows.
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          )}

          {/* Paste Text (Tab 2) */}
          {activeTab === 'paste' && !parseResult && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Paste Report Lines (e.g. copied from Excel, PDF, or text invoice)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder={`Example lines:\n2025-04-12  134700  Scott Brampton  271819  M39 Neopolitan Blue  1  $4,065.00\n2025-04-12  134964  Forrest & Taylor  146799  Woodford Pecan  1  $4,995.00`}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={isLoading || !pasteText.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Parsing...' : 'Parse Text Content'}
                </button>
              </div>
            </div>
          )}

          {/* Parsed Results Preview Table */}
          {editableRows.length > 0 && (
            <div className="space-y-4">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Parsed Transactions</span>
                  <span className="text-base font-bold text-white font-mono">{editableRows.length}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Total Units</span>
                  <span className="text-base font-bold text-amber-400 font-mono">{totalCalculatedUnits}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Total Revenue</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    ${totalCalculatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Source Document</span>
                    <span className="text-xs font-semibold text-slate-200 truncate block max-w-[130px]" title={parseResult?.fileName}>
                      {parseResult?.fileName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setParseResult(null);
                      setEditableRows([]);
                      setPasteText('');
                    }}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/70">
                <div className="max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121820] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Account #</th>
                        <th className="px-3 py-2.5">Customer Name</th>
                        <th className="px-3 py-2.5">Order #</th>
                        <th className="px-3 py-2.5">Item #</th>
                        <th className="px-3 py-2.5">Product Description</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Cost ($)</th>
                        <th className="px-3 py-2.5 text-right">Total ($)</th>
                        <th className="px-2 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {editableRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Date */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={row.saleDate}
                              onChange={(e) => handleRowChange(row.id, 'saleDate', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-white font-mono w-24 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Account Number */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={row.accountNumber}
                              onChange={(e) => handleRowChange(row.id, 'accountNumber', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono w-20 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Customer Name */}
                          <td className="px-3 py-2 max-w-[160px] truncate">
                            <input
                              type="text"
                              value={row.accountName}
                              onChange={(e) => handleRowChange(row.id, 'accountName', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-slate-200 w-full focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Order Number */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={row.orderNumber || ''}
                              onChange={(e) => handleRowChange(row.id, 'orderNumber', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono w-24 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Product Code */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={row.productCode}
                              onChange={(e) => handleRowChange(row.id, 'productCode', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono w-20 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Description */}
                          <td className="px-3 py-2 max-w-[200px] truncate">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-slate-200 w-full focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Qty */}
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleRowChange(row.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-center font-mono w-12 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <input
                              type="number"
                              value={row.cost}
                              onChange={(e) => handleRowChange(row.id, 'cost', parseFloat(e.target.value) || 0)}
                              className="bg-slate-800/80 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-right font-mono w-20 text-emerald-300 focus:outline-none focus:border-amber-500"
                            />
                          </td>

                          {/* Total */}
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                            ${row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Delete */}
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#121820]/90">
          <div className="text-xs text-slate-400">
            {editableRows.length > 0 ? (
              <span>Ready to append <strong>{editableRows.length}</strong> transactions to the database.</span>
            ) : (
              <span>Select or drop a PDF file to begin extraction.</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {editableRows.length > 0 && (
              <button
                onClick={handleCommitSales}
                disabled={isSaving}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Add {editableRows.length} Records to Sales Table</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
