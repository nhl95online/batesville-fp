import React, { useState } from 'react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  syncFromSupabase,
  pushToSupabase,
  resetSupabaseClient 
} from '../../services/supabase';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Cloud, UploadCloud } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [config, setConfig] = useState(getStoredSupabaseConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'schema'>('config');

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    resetSupabaseClient();
    saveStoredSupabaseConfig(config);

    const res = await testSupabaseConnection(config.url, config.anonKey);
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      const updated = { ...config, isConnected: true };
      setConfig(updated);
      saveStoredSupabaseConfig(updated);
    }
  };

  const handleSyncFromSupabase = async () => {
    setIsSyncing(true);
    setTestResult(null);
    const res = await syncFromSupabase();
    setIsSyncing(false);
    setTestResult(res);
    if (res.success) {
      onDataChanged();
    }
  };

  const handlePushToSupabase = async () => {
    setIsSyncing(true);
    setTestResult(null);
    const res = await pushToSupabase();
    setIsSyncing(false);
    setTestResult(res);
  };

  const schemaSqlSample = `-- Supabase SQL Schema for Batesville-FP
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contactPerson TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    tier TEXT DEFAULT 'Standard',
    defaultMarkupPercent NUMERIC DEFAULT 140,
    logoUrl TEXT,
    notes TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    material TEXT,
    interior TEXT,
    exteriorFinish TEXT,
    dimensions TEXT,
    weightLbs NUMERIC,
    features JSONB DEFAULT '[]'::jsonb,
    wholesalePrice NUMERIC NOT NULL DEFAULT 0,
    msrp NUMERIC NOT NULL DEFAULT 0,
    imageUrl TEXT,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    orderNumber TEXT NOT NULL,
    customerId TEXT REFERENCES public.customers(id),
    productId TEXT REFERENCES public.products(id),
    quantity INTEGER DEFAULT 1,
    unitPrice NUMERIC NOT NULL,
    totalAmount NUMERIC NOT NULL,
    saleDate DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    notes TEXT
);`;

  const copySchemaToClipboard = () => {
    navigator.clipboard.writeText(schemaSqlSample);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Supabase Integration & Cloud Sync
              </h2>
              <p className="text-xs text-slate-400">
                Connect your Supabase project to sync customer, product, and sales data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-2 px-6 pt-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Connection Settings
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'schema'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            SQL Schema Generator
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'config' ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzcompany.supabase.co"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Found in your Supabase Dashboard under <strong>Project Settings → API</strong>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Supabase Anon / Public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={config.anonKey}
                    onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Status Banner */}
              {testResult && (
                <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs border ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {config.lastSyncedAt && (
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Last synced: {new Date(config.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSaveAndTest}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Connection...' : 'Save & Test Connection'}</span>
                </button>

                <button
                  onClick={handleSyncFromSupabase}
                  disabled={isSyncing || !config.url}
                  className="flex-1 flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync From Supabase'}</span>
                </button>

                <button
                  onClick={handlePushToSupabase}
                  disabled={isSyncing || !config.url}
                  className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-3 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Push local data up to Supabase"
                >
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Push</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Copy this SQL and run it in your <strong>Supabase Dashboard → SQL Editor</strong> to create all tables:
                </p>
                <button
                  onClick={copySchemaToClipboard}
                  className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-200/90 overflow-x-auto max-h-72">
                {schemaSqlSample}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
