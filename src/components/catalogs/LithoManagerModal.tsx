import React, { useState, useEffect, useRef } from 'react';
import { Product, LithoItem } from '../../types';
import { 
  saveLithoItem, 
  getAllLithos, 
  deleteLithoItem, 
  assignLithoToProduct,
  db 
} from '../../services/db';
import { 
  uploadLithoToStorage, 
  matchLithoFileToProducts, 
  downloadLithoFile,
  deleteLithoFromStorage,
  syncAllLithosFromSupabase,
  downloadLithoAsPdf
} from '../../services/supabase';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Check, 
  Link2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
  Sparkles,
  CloudCheck,
  FolderOpen,
  FileDown,
  Loader2
} from 'lucide-react';

interface LithoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onLithosUpdated: () => void;
  initialProductCode?: string;
}

export const LithoManagerModal: React.FC<LithoManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  onLithosUpdated,
  initialProductCode,
}) => {
  const [lithos, setLithos] = useState<LithoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialProductCode || '');
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [selectedLitho, setSelectedLitho] = useState<LithoItem | null>(null);
  const [previewLitho, setPreviewLitho] = useState<LithoItem | null>(null);
  const [assignProductId, setAssignProductId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSyncingBucket, setIsSyncingBucket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLithos = async () => {
    const list = await getAllLithos();
    setLithos(list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    return list;
  };

  const handleSyncFromSupabaseBucket = async () => {
    setIsSyncingBucket(true);
    setStatusMessage({
      success: true,
      message: 'Scanning Supabase Storage bucket "lithos" for matching casket images...'
    });
    try {
      const res = await syncAllLithosFromSupabase(products);
      await loadLithos();
      onLithosUpdated();
      setStatusMessage({
        success: true,
        message: `Successfully pulled ${res.matchedCount} casket Lithos from Supabase "lithos" bucket and linked them to the catalog!`
      });
    } catch (err: any) {
      setStatusMessage({
        success: false,
        message: 'Error syncing from Supabase: ' + err.message
      });
    } finally {
      setIsSyncingBucket(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLithos().then(async (current) => {
        if (!current || current.length === 0) {
          // Auto-probe Supabase bucket if no local lithos are found yet
          handleSyncFromSupabaseBucket();
        }
      });
      setStatusMessage(null);
      if (initialProductCode) {
        setSearchTerm(initialProductCode);
      }
    }
  }, [isOpen, initialProductCode]);

  if (!isOpen) return null;

  // Process files prioritizing Batesville Product Code in filename
  const handleFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isImg = f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name);
      if (isPdf || isImg) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setStatusMessage({
        success: false,
        message: 'Please upload PDF cut sheets or image files (.pdf, .png, .jpg, .webp).'
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    let successCount = 0;
    let matchedCount = 0;
    let remoteCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress({
        current: i + 1,
        total: validFiles.length,
        currentFileName: file.name
      });

      // 1. Extract and match by Batesville Product Code
      const { matchedProducts, productCode, productName } = matchLithoFileToProducts(file.name, products);

      // 2. Read as Data URL for instant local offline storage
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const fileType = isPdf ? 'pdf' : 'image';
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : (isPdf ? '.pdf' : '.png');

      // 3. Upload to Supabase Storage bucket 'lithos' (with fallback)
      let finalUrl = dataUrl;
      let isRemote = false;
      try {
        const remoteDest = productCode ? `${productCode}_litho${ext}` : undefined;
        const remoteRes = await uploadLithoToStorage(file, remoteDest);
        if (remoteRes.success && remoteRes.url) {
          finalUrl = remoteRes.url;
          isRemote = true;
          remoteCount++;
        }
      } catch (e) {
        // Fallback to offline dataUrl
      }

      const lithoItem: LithoItem = {
        id: `litho-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        productCode: productCode || undefined,
        productName: productName || undefined,
        fileUrl: finalUrl,
        fileType,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        isRemote
      };

      await saveLithoItem(lithoItem);

      if (productCode) {
        matchedCount++;
        const allMatches = await db.products.where('code').equals(productCode).toArray();
        for (const p of allMatches) {
          await db.products.update(p.id, { 
            lithoUrl: finalUrl,
            lithoFileName: file.name,
            lithoFileType: fileType
          });
        }
      }

      successCount++;
    }

    await loadLithos();
    onLithosUpdated();
    setIsUploading(false);
    setUploadProgress(null);

    const remoteMsg = remoteCount > 0 
      ? `Uploaded ${remoteCount} to Supabase Storage!` 
      : 'Saved in offline database.';

    setStatusMessage({
      success: true,
      message: `Processed ${successCount} Litho cut sheets! ${matchedCount} automatically matched to Batesville caskets. ${remoteMsg}`
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This will unlink the Litho from any associated casket.`)) {
      return;
    }
    await deleteLithoItem(id);
    await deleteLithoFromStorage(fileName);
    if (selectedLitho?.id === id) setSelectedLitho(null);
    if (previewLitho?.id === id) setPreviewLitho(null);
    await loadLithos();
    onLithosUpdated();
  };

  const handleAssignToProduct = async () => {
    if (!selectedLitho || !assignProductId) return;

    const prod = products.find(p => p.id === assignProductId);
    if (!prod) return;

    await assignLithoToProduct(selectedLitho.id, prod.code, prod.name);

    setSelectedLitho({
      ...selectedLitho,
      productCode: prod.code,
      productName: prod.name
    });
    setAssignProductId('');
    await loadLithos();
    onLithosUpdated();
    setStatusMessage({
      success: true,
      message: `Linked Litho "${selectedLitho.fileName}" to Batesville SKU ${prod.code} (${prod.name}) across all catalog years!`
    });
  };

  const filteredLithos = lithos.filter(item => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      item.fileName.toLowerCase().includes(term) ||
      (item.productCode && item.productCode.toLowerCase().includes(term)) ||
      (item.productName && item.productName.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterType === 'assigned') return Boolean(item.productCode);
    if (filterType === 'unassigned') return !item.productCode;
    return true;
  });

  const casketsWithLithosCount = new Set(lithos.filter(l => l.productCode).map(l => l.productCode)).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-bold text-base sm:text-lg text-amber-300">
                  Batesville Litho & Cut Sheet Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lithos.length} Files
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {casketsWithLithosCount} Caskets Linked
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bulk upload PDF tearsheets and cut sheets. Automatically matched to caskets by item number and stored in Supabase Cloud.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-slideDown ${
              statusMessage.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center space-x-2">
                {statusMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{statusMessage.message}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all bg-white shadow-xs ${
              isDragOver 
                ? 'border-amber-500 bg-amber-50/60 scale-[1.005]' 
                : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              multiple
              accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3.5 bg-amber-100/70 text-amber-800 rounded-2xl shadow-inner">
                <UploadCloud className="w-8 h-8 animate-pulse text-amber-600" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-slate-800 text-base">
                  Drag & Drop All Your Batesville Lithos Here
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Accepts authentic PDF tearsheets (<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">.pdf</code>) or images (<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">.png, .jpg</code>). Drop dozens or hundreds at once!
                </p>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  💡 Tip: Naming files like <span className="font-mono font-bold">147959.pdf</span> or <span className="font-mono font-bold">147959_litho.pdf</span> will automatically link to the casket!
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading Files...' : 'Browse & Select Litho Files'}</span>
                </button>
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress && (
                <div className="w-full max-w-md mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium truncate max-w-[260px]">
                      Uploading: {uploadProgress.currentFileName}
                    </span>
                    <span className="font-bold text-amber-600">
                      {uploadProgress.current} / {uploadProgress.total} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by SKU, casket model, or file name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              {/* Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  All ({lithos.length})
                </button>
                <button
                  onClick={() => setFilterType('assigned')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'assigned' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Linked ({lithos.filter(l => l.productCode).length})
                </button>
                <button
                  onClick={() => setFilterType('unassigned')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'unassigned' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Unassigned ({lithos.filter(l => !l.productCode).length})
                </button>
              </div>

              <button
                onClick={handleSyncFromSupabaseBucket}
                disabled={isSyncingBucket}
                title="Scan and pull casket cut sheets directly from Supabase Storage 'lithos' bucket"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSyncingBucket ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudCheck className="w-3.5 h-3.5" />
                )}
                <span>{isSyncingBucket ? 'Pulling...' : 'Pull from Supabase Bucket'}</span>
              </button>

              <button
                onClick={loadLithos}
                title="Refresh Lithos"
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lithos List / Grid */}
          {filteredLithos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-serif font-bold text-slate-700 text-sm">
                {lithos.length === 0 ? 'No Litho cut sheets uploaded yet' : 'No matching lithos found'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {lithos.length === 0 
                  ? 'Drag and drop your Batesville PDF tearsheets or images above. They will automatically be matched with caskets and synced to Supabase!' 
                  : 'Try adjusting your search term or filter options.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLithos.map((item) => {
                const matchedCasket = products.find(p => p.code === item.productCode);
                const isPdf = item.fileType === 'pdf' || item.fileName.toLowerCase().endsWith('.pdf');
                const isSelected = selectedLitho?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-4 transition-all shadow-xs flex flex-col justify-between ${
                      isSelected 
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Top Row: File Type badge & Supabase indicator */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isPdf ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isPdf ? <FileText className="w-3 h-3 text-red-600" /> : <FileImage className="w-3 h-3 text-blue-600" />}
                            <span>{isPdf ? 'PDF Litho' : 'Image Litho'}</span>
                          </span>

                          {item.fileUrl.includes('supabase.co') && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1" title="Stored in Supabase Cloud Storage">
                              <CloudCheck className="w-3 h-3 text-emerald-600" />
                              <span>Supabase</span>
                            </span>
                          )}
                        </div>

                        {/* File Size */}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : ''}
                        </span>
                      </div>

                      {/* File Name */}
                      <h4 className="font-semibold text-xs text-slate-900 truncate" title={item.fileName}>
                        {item.fileName}
                      </h4>

                      {/* Associated Casket Block */}
                      <div className="mt-3 p-2.5 rounded-xl border bg-slate-50/80 border-slate-200">
                        {item.productCode ? (
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                  SKU {item.productCode}
                                </span>
                              </div>
                              <p className="text-xs font-serif font-bold text-slate-800 truncate mt-0.5">
                                {item.productName || matchedCasket?.name || 'Linked Casket'}
                              </p>
                              {matchedCasket?.material && (
                                <p className="text-[10px] text-slate-500 truncate">
                                  {matchedCasket.material} • {matchedCasket.category}
                                </p>
                              )}
                            </div>

                            {matchedCasket?.imageUrl && (
                              <img
                                src={matchedCasket.imageUrl}
                                alt={matchedCasket.name}
                                className="w-12 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-amber-800">
                            <div className="flex items-center space-x-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="text-xs font-medium">Not linked to a casket</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedLitho(item);
                                setAssignProductId('');
                              }}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                            >
                              Assign Casket
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Manual Assignment Selector when selected */}
                      {isSelected && (
                        <div className="mt-3 p-3 bg-amber-50/90 rounded-xl border border-amber-200 space-y-2 animate-fadeIn">
                          <label className="block text-[11px] font-bold text-amber-900">
                            Assign to Batesville Casket:
                          </label>
                          <select
                            value={assignProductId}
                            onChange={(e) => setAssignProductId(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                          >
                            <option value="">-- Choose Casket from Catalog --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name} ({p.material || p.category})
                              </option>
                            ))}
                          </select>
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              onClick={() => setSelectedLitho(null)}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-[11px] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAssignToProduct}
                              disabled={!assignProductId}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              Confirm Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.uploadedAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {/* Preview / View button */}
                        <button
                          onClick={() => setPreviewLitho(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center space-x-1"
                          title="Preview authentic Litho cut sheet"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Preview</span>
                        </button>

                        {/* Convert to PDF button if it's an image */}
                        {!isPdf && (
                          <button
                            onClick={() => {
                              const casket = products.find(p => p.code === item.productCode);
                              downloadLithoAsPdf(item.fileUrl, casket || { code: item.productCode || 'litho', name: item.productName || item.fileName });
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
                            title="Pull image from Supabase and convert to 8.5x11 PDF"
                          >
                            <FileDown className="w-3 h-3 text-emerald-600" />
                            <span>Convert PDF</span>
                          </button>
                        )}

                        {/* Download button */}
                        <button
                          onClick={() => downloadLithoFile(item.fileUrl, item.fileName)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
                          title="Download Litho file directly from Supabase / Storage"
                        >
                          <Download className="w-3 h-3 text-amber-600" />
                          <span>Download</span>
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(item.id, item.fileName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Litho cut sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Lithos attached to caskets will automatically be downloadable and viewable during funeral presentations.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* Embedded Litho Preview Modal */}
      {previewLitho && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-amber-300">
                    {previewLitho.fileName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {previewLitho.productCode ? `Linked to SKU ${previewLitho.productCode} (${previewLitho.productName})` : 'Unassigned Litho Document'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadLithoFile(previewLitho.fileUrl, previewLitho.fileName)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setPreviewLitho(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[500px]">
              {previewLitho.fileType === 'pdf' || previewLitho.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewLitho.fileUrl}
                  title={previewLitho.fileName}
                  className="w-full h-[70vh] rounded-xl border border-slate-300 shadow-inner bg-white"
                />
              ) : (
                <img
                  src={previewLitho.fileUrl}
                  alt={previewLitho.fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-300 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
