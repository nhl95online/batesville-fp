import React, { useState, useRef } from 'react';
import { 
  exportDatabaseToJson, 
  importDatabaseFromJson, 
  resetDatabaseToSeed, 
  db 
} from '../../services/db';
import { X, Database, Download, Upload, RotateCcw, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  counts: { customers: number; products: number; sales: number };
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  counts,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batesville_fp_portable_database_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage({ success: true, message: 'Portable database successfully exported!' });
    } catch (err: any) {
      setStatusMessage({ success: false, message: err.message || 'Export failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const text = event.target?.result as string;
        const res = await importDatabaseFromJson(text);
        setStatusMessage(res);
        if (res.success) {
          onDataChanged();
        }
      } catch (err: any) {
        setStatusMessage({ success: false, message: err.message || 'Failed to parse database file' });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSeed = async () => {
    if (!window.confirm('Reset database back to initial Batesville catalog and sample sales history? Any custom local edits will be refreshed.')) {
      return;
    }
    try {
      setIsProcessing(true);
      await resetDatabaseToSeed();
      setStatusMessage({ success: true, message: 'Database reset to original Batesville seed dataset!' });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ success: false, message: err.message || 'Reset failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Portable Database Manager
              </h2>
              <p className="text-xs text-slate-500">
                Offline-capable local storage with instant export and portable backup.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Local Database Stats */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <div>
              <span className="text-[11px] text-slate-500 block uppercase font-medium">Customers</span>
              <span className="font-serif text-2xl font-bold text-slate-900">{counts.customers}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block uppercase font-medium">Products</span>
              <span className="font-serif text-2xl font-bold text-amber-800">{counts.products}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block uppercase font-medium">Sales Records</span>
              <span className="font-serif text-2xl font-bold text-emerald-800">{counts.sales}</span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs border ${
              statusMessage.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.message}</span>
            </div>
          )}

          {/* Actions List */}
          <div className="space-y-3">
            {/* 1. Export */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Export Portable Database</h4>
                <p className="text-xs text-slate-500">Download entire offline catalog, accounts, and sales history.</p>
              </div>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Export (.json)</span>
              </button>
            </div>

            {/* 2. Import */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Import Portable Database</h4>
                <p className="text-xs text-slate-500">Restore or update records from a previously exported snapshot.</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Import File</span>
              </button>
            </div>

            {/* 3. Reset to Seed */}
            <div className="flex items-center justify-between p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Restore Default Seed Data</h4>
                <p className="text-xs text-slate-500">Reset customers, products, and 4-year sales metrics to factory defaults.</p>
              </div>
              <button
                onClick={handleResetToSeed}
                disabled={isProcessing}
                className="flex items-center space-x-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
