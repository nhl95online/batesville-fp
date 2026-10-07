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
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name (Discreet, private branding) */}
        <div 
          onClick={onGoHome}
          className={`flex items-center space-x-3 ${onGoHome ? 'cursor-pointer group' : ''}`}
          title={onGoHome ? 'Return to Home' : undefined}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-serif font-black text-xl group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-lg font-bold text-slate-900 tracking-wider">
                CATALOG<span className="text-amber-600"> PORTAL</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                v1.0
              </span>
              {!isLoggedIn && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                  Guest View
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Product Catalog & Merchandising Portal
            </p>
          </div>
        </div>

        {/* Right Tools, Authentication & Cloud Sync */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Admin Tools: Only shown when logged in */}
          {isLoggedIn && onOpenPriceListImport && (
            <button
              onClick={onOpenPriceListImport}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900 transition-all cursor-pointer shadow-xs"
              title="Import Product Price List & Reference Guide (PDF / Text)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Import Price List</span>
            </button>
          )}

          {isLoggedIn && onOpenSalesUpload && (
            <button
              onClick={onOpenSalesUpload}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-amber-700 transition-all cursor-pointer shadow-sm"
              title="Upload Daily Sales or Invoices in PDF format"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Upload Sales PDF</span>
            </button>
          )}

          {/* Database Cloud Sync Status */}
          <div 
            className={`hidden md:flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-xs shadow-xs transition-colors ${
              isAutoSyncing
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
            title="Connected to secure database"
          >
            {isAutoSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                <span className="text-amber-700 font-medium">Syncing...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700 font-medium">Connected</span>
              </>
            )}
          </div>

          {/* Authentication Actions */}
          {isLoggedIn ? (
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <div 
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                title="You are authenticated with full portal access"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Staff Access</span>
              </div>

              {onChangePassword && (
                <button
                  onClick={onChangePassword}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Change Access Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-white hover:bg-rose-600 bg-white rounded-lg transition-all cursor-pointer shadow-2xs border border-rose-200"
                  title="Sign out and lock private portal sections"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Lock</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer text-xs"
              title="Sign in with password to access analytics, sales, price cards & tools"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
