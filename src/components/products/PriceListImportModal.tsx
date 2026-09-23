import React, { useState, useRef } from 'react';
import { 
  extractLinesFromPdf, 
  parsePriceListLines, 
  ParsedProductItem, 
  PriceListParseResult,
  convertToSqlText,
  convertToCsvText,
  convertToJsonText,
  saveParsedProducts
} from '../../services/priceListParser';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Download, 
  Check, 
  Layers, 
  DollarSign, 
  Database, 
  Search, 
  Sparkles, 
  Code2, 
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  Box
} from 'lucide-react';

interface PriceListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsImported?: (count: number) => void;
}

export const PriceListImportModal: React.FC<PriceListImportModalProps> = ({
  isOpen,
  onClose,
  onProductsImported,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'paste'>('pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [catalogYearOverride, setCatalogYearOverride] = useState('2024-25');
  const [parseResult, setParseResult] = useState<PriceListParseResult | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProductItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Text conversion drawer
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'sql' | 'csv' | 'json'>('sql');
  const [hasCopied, setHasCopied] = useState(false);

  // Saving state
  const [syncToSupabase, setSyncToSupabase] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Process uploaded PDF
  const handleProcessPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMessage({ success: false, message: 'Please upload a valid .pdf Batesville Price Guide.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const lines = await extractLinesFromPdf(file);
      if (lines.length === 0) {
        throw new Error('No readable text lines found in the uploaded PDF. Please make sure the PDF has selectable text.');
      }

      const result = parsePriceListLines(lines, file.name, catalogYearOverride);
      if (result.products.length === 0) {
        setStatusMessage({
          success: false,
          message: `Extracted ${lines.length} lines, but no product lines matching Batesville format were detected. Try pasting the text directly in the "Paste Text / OCR" tab.`
        });
      } else {
        setCatalogYearOverride(result.catalogYear);
      }
      setParseResult(result);
      setParsedProducts(result.products);
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setStatusMessage({ success: false, message: err.message || 'Failed to extract text from PDF document.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Process pasted text
  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      setStatusMessage({ success: false, message: 'Please paste text from your Batesville price list.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
      const result = parsePriceListLines(lines, 'Pasted_Price_List.txt', catalogYearOverride);
      
      if (result.products.length === 0) {
        setStatusMessage({
          success: false,
          message: `Found ${lines.length} lines, but could not detect product codes and prices. Verify format: [Item#] [PriceCode] [Description]...`
        });
      } else {
        setCatalogYearOverride(result.catalogYear);
      }
      setParseResult(result);
      setParsedProducts(result.products);
    } catch (err: any) {
      setStatusMessage({ success: false, message: err.message || 'Failed to parse text.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample data from user's PDF
  const handleLoadSamplePdfData = () => {
    const sample = `Batesville Product Reference Guide Effective 10/1/2024
Toronto Customer Service Center
Customer Service Center: 9188
Effective Date: 10/1/24

Burial Solutions - Metal
Bronze
Z508 147959 0168400 Z64 824 DH Classic Gold, Champagne Velvet BR 29.00 84.00 26.00 300
Z628 280178 0099280 Z65 8J3 D DaVinci Bronze, Champagne Velvet X 29.00 84.00 26.00 300
OJ58 147862 0086810 O39 884 IDH Aegean Bronze, Champagne Velvet BR 28.50 83.50 24.00 260
Copper
YJ26 147929 0084770 Y35 625 DH Mediterranean Copper, Champagne Velvet FT BR 28.50 83.50 24.00 260
YJ28 147930 0084770 Y35 825 DH Mediterranean Copper, Champagne Velvet BR 28.50 83.50 24.00 260
YJ58 147935 0080540 Y39 884 IDH Aegean Copper, Champagne Velvet BR 28.50 83.50 24.00 260
Stainless Steel
UZ88 185491 0050550 UG1 828 CDH Silver Sapphire, Silver Velvet-Charpente X BR 28.50 83.50 24.00 195
UZ98 185493 0050550 UG1 828 CDH Golden Sand, Champagne Velvet-Charpente X BR 28.50 83.50 24.00 195
U098 147901 0048410 U46 844 NDH Tapestry Rose, Moss Pink Velvet BR 28.50 83.50 24.00 195
U118 147905 0048410 U23 833 IDH Onyx, Silver Velvet BR 28.50 83.50 24.00 195
18 Gauge Steel
JZ88 185487 0043860 JF9 825 CDH Golden Midnight, Champagne Velvet-Charpente X BR 28.50 83.50 24.00 220
JZ98 185489 0043860 JF9 825 CDH Golden Pearl, Eggshell Velvet-Charpente X 28.50 83.50 24.00 220
AJ98 147733 0040570 A37 833 D Sierra, Champagne Velvet 28.13 83.13 24.00 230
OE18 239696 0040050 OE1 8J3 DH Golden Granite, Champagne Velvet X BR 29.00 84.00 26.00 250
OE28 239699 0040050 OE1 8J3 DH Golden Midnight, Champagne Velvet X BR 29.00 84.00 26.00 250
20 Gauge Steel
M388 271815 0024120 M39 825 CH Auburn, Champagne Velvet X 28.50 83.50 24.00 195
M398 271817 0024120 M39 825 CH Midnight, Ivory Velvet X 28.50 83.50 24.00 195
S468 148073 0022590 S48 882 A Sunglow, Rosetan Crepe 28.38 83.13 24.88 190
Q468 148031 0020380 Q88 832 A Roman, Rosetan Crepe 28.25 83.00 23.88 169

Burial Solutions - Wood
Pecan
2298 146799 0043050 20A 880 HD Woodbridge Pecan, Champagne Velvet X S 28.50 82.50 24.00 270
2V48 209786 0035910 2V1 880 HD Woodhaven Pecan 28, Champagne Velvet X VS D4 32.50 87.00 28.00 275
Oak
5J58 148213 0078210 5PM 865 HD Bexley Oak, Champagne Velvet-Wood Bed FR 29.00 84.25 24.00 315
5C28 146876 0051490 5ZZ 865 HD Barkley Oak, Champagne Velvet X S 28.75 82.25 24.00 240
5158 239372 0047230 521 8J3 CHD Warren Oak, Champagne Velvet-Charpente X S 28.50 82.50 24.00 260
5998 146869 0042210 5MX 825 D Trinity Oak, Rosetan Crepe S 28.50 82.25 24.00 240

Cremation Options - Full Size Urns
Wood
1822 100126 0009870 Jefferson 8.50 10.06 8.50 230 4
18C8 100095 0009480 Fredericksburg Dual Capacity 10.38 9.63 10.38 430 7
Marble
18A1 100060 0004430 Cameo Bell Jar 8.25 11.00 8.25 220 11
238323 238323 0004130 Companion Meadow Green Synthetic Marble Urn 15.00 6.25 8.00 420 25
Sheet Bronze
1881 148358 0005770 Unity 9.75 8.06 6.13 450 11
235554 235554 0004240 Brushed Bronze Vertical Urn X X 4.44 9.06 8.50 220 7
`;
    setPasteText(sample);
    setActiveTab('paste');
    const lines = sample.split('\n').map(l => l.trim()).filter(Boolean);
    const result = parsePriceListLines(lines, 'Sample_Reference_Guide_2024.pdf', '2024-25');
    setParseResult(result);
    setParsedProducts(result.products);
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setParsedProducts(prev => prev.map(p => ({ ...p, selected: checked })));
  };

  const handleToggleSelectOne = (id: string) => {
    setParsedProducts(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  // Filtered view
  const displayedProducts = parsedProducts.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    const term = searchFilter.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(term) ||
      p.productCode.includes(term) ||
      p.subcategory.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const selectedCount = parsedProducts.filter(p => p.selected).length;

  // Text Conversion generation
  const activeSelectedItems = parsedProducts.filter(p => p.selected);
  const generatedText = 
    exportFormat === 'sql' 
      ? convertToSqlText(activeSelectedItems)
      : exportFormat === 'csv'
      ? convertToCsvText(activeSelectedItems)
      : convertToJsonText(activeSelectedItems);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleDownloadFile = () => {
    const ext = exportFormat === 'sql' ? 'sql' : exportFormat === 'csv' ? 'csv' : 'json';
    const mime = exportFormat === 'sql' ? 'text/plain' : exportFormat === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([generatedText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batesville_products_${catalogYearOverride}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save directly to products table
  const handleSaveToDatabase = async () => {
    if (selectedCount === 0) {
      setStatusMessage({ success: false, message: 'Please select at least one product to import.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await saveParsedProducts(activeSelectedItems, { pushToRemote: syncToSupabase });
      setStatusMessage({
        success: res.success,
        message: `${res.message} ${res.remoteSynced ? ' (Pushed to Supabase products table)' : ''}`
      });
      if (res.success && onProductsImported) {
        onProductsImported(res.count);
      }
    } catch (err: any) {
      setStatusMessage({ success: false, message: err.message || 'Failed to save products to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900 tracking-wide flex items-center gap-2">
                Price List & Reference Guide Importer
                <span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  PDF / Text → Products Table
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Parse Batesville Product Reference Guides, convert to SQL/text, and load directly into the products table.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`px-6 py-3 border-b text-xs flex items-center justify-between ${
            statusMessage.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.message}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)}
              className="text-[11px] font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Tabs & Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'pdf' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                <span>Upload PDF Document</span>
              </button>

              <button
                onClick={() => setActiveTab('paste')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'paste' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Paste Text / OCR</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadSamplePdfData}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Sample Batesville Guide (2024-25)</span>
              </button>

              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span className="font-medium">Catalog Year:</span>
                <input
                  type="text"
                  value={catalogYearOverride}
                  onChange={(e) => setCatalogYearOverride(e.target.value)}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Tab 1: PDF Upload Dropzone */}
          {activeTab === 'pdf' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleProcessPdfFile(file);
              }}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
                isDragging 
                  ? 'border-amber-500 bg-amber-50/60' 
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/60'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessPdfFile(file);
                }}
              />
              
              {isLoading ? (
                <div className="flex flex-col items-center space-y-2 text-amber-700">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">Extracting & parsing PDF price guide tables...</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag & drop your Batesville Product Reference Guide (.pdf)
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Toronto & local customer service center price lists with metals, woods, urns, and personalization.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste table lines from your price list here... Example:
Burial Solutions - Metal
Bronze
Z508 147959 0168400 Z64 824 DH Classic Gold, Champagne Velvet BR 29.00 84.00 26.00 300
OJ58 147862 0086810 O39 884 IDH Aegean Bronze, Champagne Velvet BR 28.50 83.50 24.00 260"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white resize-y"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleProcessPastedText}
                  disabled={isLoading || !pasteText.trim()}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Parse Product Text</span>
                </button>
              </div>
            </div>
          )}

          {/* Parsed Results Overview */}
          {parseResult && (
            <div className="space-y-4">
              
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Detected Products</span>
                  <span className="font-serif text-xl font-bold text-slate-900">
                    {parseResult.totalProductsCount}
                  </span>
                  <span className="text-[10px] text-emerald-700 block">ready for database</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Catalog Year</span>
                  <span className="font-mono text-base font-bold text-amber-700">
                    {parseResult.catalogYear}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{parseResult.effectiveDate || 'Effective 10/1/24'}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Categories Found</span>
                  <span className="font-serif text-xl font-bold text-blue-700">
                    {parseResult.categoriesDetected.length}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {parseResult.categoriesDetected[0]?.replace('Solutions - ', '') || 'All'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Convert Format</span>
                    <button
                      onClick={() => setIsExportDrawerOpen(!isExportDrawerOpen)}
                      className="mt-1 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{isExportDrawerOpen ? 'Hide Text' : 'Convert to Text'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Text Conversion Panel (SQL / CSV / JSON) */}
              {isExportDrawerOpen && (
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Code2 className="w-4 h-4 text-amber-400" />
                      <span className="font-serif font-bold text-sm text-white">
                        Converted Text Output ({selectedCount} Products)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Format toggle */}
                      <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                        {(['sql', 'csv', 'json'] as const).map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => setExportFormat(fmt)}
                            className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                              exportFormat === fmt 
                                ? 'bg-amber-500 text-slate-950 font-bold' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>

                      {/* Copy button */}
                      <button
                        onClick={handleCopyText}
                        className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        {hasCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      {/* Download button */}
                      <button
                        onClick={handleDownloadFile}
                        className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {exportFormat === 'sql' 
                      ? 'PostgreSQL / Supabase SQL INSERT statement. Copy and paste directly into Supabase SQL Editor.'
                      : exportFormat === 'csv'
                      ? 'Standard comma-delimited table. Can be saved as products.csv or imported via Supabase Table Editor.'
                      : 'Structured JSON array matching Batesville Product catalog schema.'}
                  </p>

                  <textarea
                    readOnly
                    rows={8}
                    value={generatedText}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-300 focus:outline-none select-all"
                  />
                </div>
              )}

              {/* Table Filter & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search model, code, material..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Categories ({parsedProducts.length})</option>
                    {parseResult.categoriesDetected.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span>Selected: <strong className="text-slate-900 font-mono">{selectedCount}</strong> of {parsedProducts.length}</span>
                  <button
                    onClick={() => handleToggleSelectAll(selectedCount !== parsedProducts.length)}
                    className="text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    {selectedCount === parsedProducts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Products Table Grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedCount === parsedProducts.length && parsedProducts.length > 0}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Item #</th>
                        <th className="py-2.5 px-3">Product Name & Description</th>
                        <th className="py-2.5 px-3">Category / Material</th>
                        <th className="py-2.5 px-3 text-right">List Price</th>
                        <th className="py-2.5 px-3 text-right">Specs / Dimensions</th>
                        <th className="py-2.5 px-3 text-center">Features</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedProducts.map(p => (
                        <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={p.selected}
                              onChange={() => handleToggleSelectOne(p.id)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800 whitespace-nowrap">
                            {p.productCode}
                            {p.productIdCode && (
                              <span className="block text-[10px] text-slate-400 font-normal">{p.productIdCode}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 min-w-[200px]">
                            <span className="font-serif font-bold text-slate-900 block truncate" title={p.description}>
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              Interior: {p.interior}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-medium text-slate-800 block text-[11px]">
                              {p.subcategory || p.material}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              {p.category.replace('Solutions - ', '').replace('Options - ', '')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap text-[11px] text-slate-600 font-mono">
                            {p.extWidth && p.extLength ? (
                              <span>{p.extLength}" × {p.extWidth}"</span>
                            ) : p.dimensions ? (
                              <span>{p.dimensions}</span>
                            ) : (
                              <span>—</span>
                            )}
                            {p.weightLbs && (
                              <span className="block text-[10px] text-slate-400">{p.weightLbs} lbs</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1 text-[10px]">
                              {p.lifeSymbols && <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold" title="LifeSymbols">LS</span>}
                              {p.top && <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold" title={p.top}>Cap</span>}
                              {p.finish && <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold" title={p.finish}>{p.finish}</span>}
                              {p.oversize && <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold" title="Oversize">OV</span>}
                            </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="checkbox"
              id="syncSupabaseProducts"
              checked={syncToSupabase}
              onChange={(e) => setSyncToSupabase(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="syncSupabaseProducts" className="text-slate-700 font-medium cursor-pointer">
              Also push & sync to Supabase <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">products</code> table
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>

            {parsedProducts.length > 0 && (
              <button
                onClick={() => setIsExportDrawerOpen(true)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-amber-600" />
                <span>View Text / SQL</span>
              </button>
            )}

            <button
              onClick={handleSaveToDatabase}
              disabled={isSaving || selectedCount === 0}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Products Table...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Add {selectedCount} to Products Table</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
