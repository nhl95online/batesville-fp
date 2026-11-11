import React from 'react';
import { 
  RefreshCw, 
  UploadCloud, 
  FileSpreadsheet, 
  Lock, 
  LogOut, 
  ShieldCheck, 
  KeyRound,
  Layers
} from 'lucide-react';

interface NavbarProps {
  isAutoSyncing?: boolean;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onOpenSalesUpload?: () => void;
  onOpenPriceListImport?: () => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAutoSyncing = false,
  isLoggedIn = false,
  onOpenLogin,
  onLogout,
  onChangePassword,
  onOpenSalesUpload,
  onOpenPriceListImport,
  onGoHome,
}) => {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  return (
    <header className="no-print sticky top-0 z-40 bg-[#fafcfa] border-b-4 border-double border-emerald-900 shadow-xs">
      {/* Top Newspaper Dateline Strip */}
      <div className="bg-gradient-to-r from-emerald-950 via-blue-950 to-emerald-950 text-emerald-50 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-emerald-300">VOL. XXVI • NO. 10</span>
            <span className="hidden sm:inline text-blue-300">|</span>
            <span className="hidden sm:inline text-slate-200">{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="hidden md:inline text-blue-200">FISCAL EDITION 2026–27</span>
            <span className="hidden md:inline text-emerald-400">•</span>
            <span className="flex items-center space-x-1.5">
              {isAutoSyncing ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 text-sky-300 animate-spin" />
                  <span className="text-sky-200">PRESS WIRE SYNCING...</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-300">CLOUD WIRE CONNECTED</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Broadsheet Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Newspaper Title */}
        <div 
          onClick={onGoHome}
          className={`flex items-center space-x-3.5 ${onGoHome ? 'cursor-pointer group' : ''}`}
          title={onGoHome ? 'Return to Front Page (Home)' : undefined}
        >
          <div className="w-10 h-10 rounded-xs bg-gradient-to-br from-emerald-800 via-emerald-700 to-blue-900 border-2 border-emerald-950 flex items-center justify-center shadow-xs text-white font-serif font-black text-xl group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase">
                THE CATALOG <span className="text-emerald-800 underline decoration-blue-800 decoration-2 underline-offset-4">PORTAL</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-900 font-mono font-bold border border-blue-300">
                ED. v1.0
              </span>
            </div>
            <p className="text-[11px] font-serif italic text-blue-950/80 tracking-wide">
              Official Product Catalog, Showroom &amp; Merchandising Gazette
            </p>
          </div>
        </div>

        {/* Right Tools & Top-Right LOGIN Button */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          
          {/* Admin Tools: Only shown when logged in */}
          {isLoggedIn && onOpenPriceListImport && (
            <button
              onClick={onOpenPriceListImport}
              className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-xs text-xs font-serif font-bold text-blue-900 transition-all cursor-pointer shadow-2xs"
              title="Import Product Price List & Reference Guide (PDF / Text)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden sm:inline">Import Price List</span>
            </button>
          )}

          {isLoggedIn && onOpenSalesUpload && (
            <button
              onClick={onOpenSalesUpload}
              className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xs text-xs font-serif font-bold text-emerald-900 transition-all cursor-pointer shadow-2xs"
              title="Upload Daily Sales or Invoices in PDF format"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Upload Sales PDF</span>
            </button>
          )}

          {/* Top-Right LOGIN Button: GREEN when logged in, RED when not logged in */}
          {isLoggedIn ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={onChangePassword || onLogout}
                className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-serif font-black tracking-widest uppercase px-4 py-1.5 rounded-xs border-2 border-emerald-950 shadow-sm transition-all cursor-pointer text-xs"
                title="Logged In — Click to manage password or session"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>LOGIN</span>
              </button>

              {onChangePassword && (
                <button
                  onClick={onChangePassword}
                  className="p-1.5 text-blue-900 hover:text-white hover:bg-blue-800 bg-blue-50 border border-blue-300 rounded-xs transition-colors cursor-pointer"
                  title="Change Access Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-700 hover:text-white hover:bg-red-700 bg-white border border-slate-300 rounded-xs transition-all cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-serif font-black tracking-widest uppercase px-4 py-1.5 rounded-xs border-2 border-red-900 shadow-sm transition-all cursor-pointer text-xs"
              title="Not Logged In — Click to sign in"
            >
              <Lock className="w-3.5 h-3.5 text-red-100" />
              <span>LOGIN</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
