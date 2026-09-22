import React from 'react';
import { RefreshCw, UploadCloud } from 'lucide-react';

interface NavbarProps {
  isAutoSyncing?: boolean;
  onOpenSalesUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAutoSyncing = false,
  onOpenSalesUpload,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-[#141b25]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-serif font-black text-xl">
            B
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-lg font-bold text-white tracking-wider">
                BATESVILLE<span className="text-amber-400">-FP</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 font-mono">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Showroom Price Cards & Merchandising Portal
            </p>
          </div>
        </div>

        {/* Right Tools & Cloud Sync Indicator */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Action: Upload Daily Sales PDF */}
          {onOpenSalesUpload && (
            <button
              onClick={onOpenSalesUpload}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300 transition-all cursor-pointer shadow-sm"
              title="Upload Batesville Daily Sales or Invoices in PDF format"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Upload Sales PDF</span>
            </button>
          )}

          {/* Automatic Supabase Cloud Sync Indicator */}
          <div 
            className="flex items-center space-x-2 bg-[#18212e] border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs shadow-sm"
            title="Automatically synced with Batesville Cloud Database (Supabase)"
          >
            {isAutoSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300 font-medium">Syncing Cloud...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">Supabase Connected</span>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
