import React from 'react';
import { RefreshCw, UploadCloud } from 'lucide-react';

interface NavbarProps {
  isAutoSyncing?: boolean;
  onOpenSalesUpload?: () => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAutoSyncing = false,
  onOpenSalesUpload,
  onGoHome,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={onGoHome}
          className={`flex items-center space-x-3 ${onGoHome ? 'cursor-pointer group' : ''}`}
          title={onGoHome ? 'Return to Home Landing Page' : undefined}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-serif font-black text-xl group-hover:scale-105 transition-transform">
            B
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-lg font-bold text-slate-900 tracking-wider">
                BATESVILLE<span className="text-amber-600">-FP</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
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
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-amber-700 transition-all cursor-pointer shadow-sm"
              title="Upload Batesville Daily Sales or Invoices in PDF format"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Upload Sales PDF</span>
            </button>
          )}

          {/* Automatic Supabase Cloud Sync Indicator */}
          <div 
            className={`flex items-center space-x-2 border px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-colors ${
              isAutoSyncing
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
            title="Automatically synced with Batesville Cloud Database (Supabase)"
          >
            {isAutoSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                <span className="text-amber-700 font-medium">Syncing Cloud...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700 font-medium">Supabase Connected</span>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
