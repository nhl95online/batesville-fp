import React, { useState, useEffect, useRef } from 'react';
import { Product, Customer, LithoItem } from '../../types';
import { 
  isUrnProduct, 
  uploadLithoToStorage, 
  downloadLithoFile,
  getLithoPublicUrlForProduct,
  downloadLithoAsPdf,
  printLithoPdf,
  printLithoDirect,
  printHtmlElementDirect,
  getLithoPublicUrl
} from '../../services/supabase';
import { saveLithoItem, db } from '../../services/db';
import { 
  Printer, 
  X, 
  Sparkles, 
  TreePine, 
  ShieldCheck, 
  Layers, 
  Ruler, 
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle2,
  Download,
  Upload,
  FileText,
  FileImage,
  RefreshCw,
  FileDown,
  Loader2,
  Check
} from 'lucide-react';

interface ProductLithoModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onProductUpdated?: () => void;
}

export const ProductLithoModal: React.FC<ProductLithoModalProps> = ({
  product,
  isOpen,
  onClose,
  customer,
  onProductUpdated
}) => {
  const [showPrice, setShowPrice] = useState(true);
  const [customRetailPrice, setCustomRetailPrice] = useState<string>('');
  
  // Directly default to the official Supabase bucket URL for this product's SKU
  const defaultBucketUrl = product?.code ? getLithoPublicUrl(product.code) : null;
  const [activeLithoUrl, setActiveLithoUrl] = useState<string | null>(
    product?.lithoUrl || defaultBucketUrl
  );
  const [viewMode, setViewMode] = useState<'official' | 'generated'>('official');
  const [isUploading, setIsUploading] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize on open or product change
  useEffect(() => {
    if (!product || !product.code) return;
    const directUrl = product.lithoUrl || getLithoPublicUrl(product.code);
    setActiveLithoUrl(directUrl);
    setViewMode('official');

    let isMounted = true;
    async function verifyAndSave() {
      if (!product || !product.code) return;
      const verifiedUrl = await getLithoPublicUrlForProduct(product.code);
      if (isMounted && verifiedUrl) {
        setActiveLithoUrl(verifiedUrl);
        product.lithoUrl = verifiedUrl;
        product.lithoFileName = `${product.code}.png`;
        product.lithoFileType = 'image';
        
        await db.products.update(product.id, {
          lithoUrl: verifiedUrl,
          lithoFileName: `${product.code}.png`,
          lithoFileType: 'image'
        });
      }
    }

    if (isOpen) {
      verifyAndSave();
    }
    return () => { isMounted = false; };
  }, [product?.id, product?.code, product?.lithoUrl, isOpen]);

  if (!isOpen || !product) return null;

  const isUrn = isUrnProduct(product);
  const hasUploadedLitho = Boolean(activeLithoUrl);
  const isPdf = activeLithoUrl && activeLithoUrl.toLowerCase().includes('.pdf');

  // Suggested retail calculation based on customer markup or default 2.5x
  const markupMultiplier = customer?.defaultMarkupPercent ? (1 + customer.defaultMarkupPercent / 100) : 2.5;
  const defaultRetail = Math.round((product.price || product.wholesalePrice || 1200) * markupMultiplier);
  const activeRetailPrice = customRetailPrice !== '' ? Number(customRetailPrice) : defaultRetail;

  // Print Action - STRICTLY prints 1 single sheet of paper
  const handlePrint = async () => {
    if (viewMode === 'official' && activeLithoUrl) {
      // Print the authentic image directly from Supabase in an isolated print window (guaranteed 1 sheet)
      try {
        setIsPrintingPdf(true);
        printLithoDirect(activeLithoUrl, product, pdfOrientation);
      } catch (err: any) {
        await downloadLithoAsPdf(activeLithoUrl, product, pdfOrientation);
      } finally {
        setIsPrintingPdf(false);
      }
    } else {
      // Print the generated HTML tearsheet in an isolated print window (guaranteed 1 sheet)
      printHtmlElementDirect('printable-litho', `${product.code} - ${product.name} Litho`);
    }
  };

  // Convert to PDF & Download
  const handleConvertAndDownloadPdf = async () => {
    if (!activeLithoUrl) return;

    if (isPdf) {
      // It's already a PDF, download directly
      await downloadLithoFile(activeLithoUrl, product.lithoFileName || `${product.code}_litho.pdf`);
      return;
    }

    try {
      setIsConvertingPdf(true);
      await downloadLithoAsPdf(activeLithoUrl, product, pdfOrientation);
    } catch (err: any) {
      alert('Error converting litho image to PDF: ' + err.message);
    } finally {
      setIsConvertingPdf(false);
    }
  };

  // Download raw original image from Supabase
  const handleDownloadRawImage = async () => {
    if (!activeLithoUrl) return;
    const name = product.lithoFileName || `${product.code}.png`;
    await downloadLithoFile(activeLithoUrl, name);
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Uploading to Supabase Storage...');

    try {
      const isFilePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : (isFilePdf ? '.pdf' : '.png');
      const cleanDest = `${product.code}_litho${ext}`;

      // 1. Data URL fallback
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // 2. Upload to Supabase Storage
      let finalUrl = dataUrl;
      let isRemote = false;
      const remoteRes = await uploadLithoToStorage(file, cleanDest);
      if (remoteRes.success && remoteRes.url) {
        finalUrl = remoteRes.url;
        isRemote = true;
      }

      // 3. Save to Dexie
      const lithoItem: LithoItem = {
        id: `litho-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        productCode: product.code,
        productName: product.name,
        fileUrl: finalUrl,
        fileType: isFilePdf ? 'pdf' : 'image',
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        isRemote
      };

      await saveLithoItem(lithoItem);

      // 4. Update product in DB
      const allMatches = await db.products.where('code').equals(product.code).toArray();
      for (const p of allMatches) {
        await db.products.update(p.id, {
          lithoUrl: finalUrl,
          lithoFileName: file.name,
          lithoFileType: isFilePdf ? 'pdf' : 'image'
        });
      }

      product.lithoUrl = finalUrl;
      product.lithoFileName = file.name;
      product.lithoFileType = isFilePdf ? 'pdf' : 'image';
      setActiveLithoUrl(finalUrl);

      setViewMode('official');
      setUploadStatus(isRemote ? 'Uploaded to Supabase Cloud!' : 'Stored locally!');
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setUploadStatus(err.message || 'Upload error');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      {/* Hidden file input for quick direct upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSingleFileUpload}
        accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Main Dialog Window */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[96vh]">
        
        {/* Modal Toolbar (Non-printable) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-bold text-base text-amber-300">
                  {product.name}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SKU {product.code}
                </span>
                {hasUploadedLitho && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Supabase Litho Pulled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Batesville Litho Cut Sheet • Pulled from Supabase Storage & Converted to PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher if uploaded litho exists */}
            {hasUploadedLitho && (
              <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700">
                <button
                  onClick={() => setViewMode('official')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'official' 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                      : 'hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Official Litho (Supabase)</span>
                </button>
                <button
                  onClick={() => setViewMode('generated')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'generated' 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                      : 'hover:text-white'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>8.5×11 Tearsheet</span>
                </button>
              </div>
            )}

            {/* Price Visibility Toggle (active for generated view) */}
            {viewMode === 'generated' && (
              <button
                onClick={() => setShowPrice(!showPrice)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-700"
              >
                {showPrice ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showPrice ? 'Price Visible' : 'Price Hidden'}</span>
              </button>
            )}

            {/* Convert & Download PDF button (when in official litho mode) */}
            {hasUploadedLitho && (
              <button
                onClick={handleConvertAndDownloadPdf}
                disabled={isConvertingPdf}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="Pull image from Supabase bucket 'lithos' and convert to an 8.5x11 PDF document"
              >
                {isConvertingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isConvertingPdf ? 'Converting to PDF...' : 'Convert to PDF'}</span>
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isPrintingPdf}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
              title="Print Litho Cut Sheet (8.5x11)"
            >
              {isPrintingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isPrintingPdf ? 'Preparing Print...' : 'Print Litho Cut Sheet'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Status Banner */}
        {uploadStatus && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between animate-fadeIn">
            <span>{uploadStatus}</span>
            <button onClick={() => setUploadStatus(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex justify-center">

          {/* VIEW MODE 1: Official Batesville Litho Image pulled from Supabase Bucket */}
          {viewMode === 'official' && activeLithoUrl && (
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden flex flex-col">
              
              {/* Document Subheader Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs">
                <div className="flex items-center space-x-2">
                  {isPdf ? (
                    <FileText className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <FileImage className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                    {product.lithoFileName || `${product.code}.png`}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Supabase 'lithos' Bucket
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  {/* PDF Orientation Select */}
                  {!isPdf && (
                    <div className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <span>PDF Layout:</span>
                      <select
                        value={pdfOrientation}
                        onChange={(e) => setPdfOrientation(e.target.value as any)}
                        className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
                      >
                        <option value="landscape">Landscape (11" × 8.5")</option>
                        <option value="portrait">Portrait (8.5" × 11")</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleConvertAndDownloadPdf}
                    disabled={isConvertingPdf}
                    className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  {!isPdf && (
                    <button
                      onClick={handleDownloadRawImage}
                      className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 font-medium text-xs cursor-pointer"
                      title="Download the authentic PNG image file"
                    >
                      <span>Download PNG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Document Image Embedder */}
              <div className="flex-1 min-h-[580px] p-4 bg-slate-200/60 flex items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={activeLithoUrl}
                    title={product.name}
                    className="w-full h-[75vh] rounded-xl border border-slate-300 shadow-inner bg-white"
                  />
                ) : (
                  <div className="relative group max-w-full flex flex-col items-center">
                    <img
                      src={activeLithoUrl}
                      alt={product.name}
                      className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg border border-slate-300 bg-white p-2"
                    />
                    <div className="mt-2 text-center text-[11px] text-slate-500">
                      Authentic Batesville Litho Cut Sheet for Model {product.code} • Click "Convert to PDF" to generate high-res 8.5" × 11" printable PDF
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Authentic 8.5" x 11" Litho Canvas */}
          {(viewMode === 'generated' || !activeLithoUrl) && (
            <div 
              id="printable-litho"
              className="w-full max-w-[800px] bg-white rounded-2xl shadow-xl border border-slate-300 p-8 sm:p-12 flex flex-col justify-between text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none"
              style={{ minHeight: '1020px' }}
            >
              {/* 1. Header Banner */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-amber-600/30 pb-4 mb-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
                        Batesville Casket Company
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-mono tracking-wider uppercase text-slate-500">
                        Product Lithograph
                      </span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1">
                      {product.name}
                    </h1>
                  </div>

                  <div className="text-right">
                    <div className="bg-amber-50 border border-amber-300/80 px-3 py-1 rounded-lg text-right">
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                        Product SKU / Code
                      </span>
                      <span className="font-mono text-base font-bold text-slate-900">
                        {product.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Catalog Year: {product.catalogYear || 'Current'}
                    </span>
                  </div>
                </div>

                {/* 2. Hero High-Res Photo */}
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner mb-6 flex items-center justify-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-4"
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-serif font-medium">
                    {product.exteriorFinish || product.finish || product.name}
                  </div>
                </div>

                {/* 3. Category-Aware Technical Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  
                  {/* Specs Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5 text-xs">
                    <h3 className="font-serif font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-amber-600" />
                      {isUrn ? 'Urn Specifications & Craftsmanship' : 'Casket Specifications & Dimensions'}
                    </h3>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-semibold text-slate-800">{product.category}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Material & Construction:</span>
                      <span className="font-semibold text-slate-900">{product.material}</span>
                    </div>

                    {(product.exteriorFinish || product.finish) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exterior Finish:</span>
                        <span className="text-slate-800">{product.exteriorFinish || product.finish}</span>
                      </div>
                    )}

                    {/* Caskets ONLY: Interior & Cap Style */}
                    {!isUrn && (
                      <>
                        {product.interior && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Interior Fabric & Style:</span>
                            <span className="font-bold text-amber-800">{product.interior}</span>
                          </div>
                        )}
                        {product.top && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cap / Top Style:</span>
                            <span className="text-slate-800">{product.top}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dimensions (L × W × H):</span>
                          <span className="font-mono text-slate-800">
                            {product.extLength && product.extWidth 
                              ? `${product.extLength}" L × ${product.extWidth}" W × ${product.extHeight || 23.0}" H`
                              : (product.dimensions || '83.5" L × 28.5" W × 23.0" H')}
                          </span>
                        </div>
                        {product.intWidth && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Interior Width:</span>
                            <span className="font-mono text-slate-900 font-bold">{product.intWidth}" Interior</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Urns ONLY: Cubic Capacity & Closure */}
                    {isUrn && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cubic Capacity / Volume:</span>
                          <span className="font-bold text-amber-800 font-mono">
                            {product.capacity ? `${product.capacity} cu. in.` : '200 cu. in. (Standard Adult)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dimensions:</span>
                          <span className="font-mono text-slate-800">{product.dimensions || '8.5" W × 8.5" D × 10.5" H'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Closure Type:</span>
                          <span className="text-slate-800 font-medium">Precision Threaded Secure Base / Lid</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Merchandising & Living Memorial */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-xs flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <h3 className="font-serif font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Memorial Features & Personalization
                      </h3>

                      {/* Living Memorial */}
                      <div className="flex items-start space-x-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <TreePine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px]">Living Memorial® Program</span>
                          <p className="text-[10px] text-emerald-800 leading-tight">
                            A living tree is planted in an American or Canadian National Forest as a lasting tribute.
                          </p>
                        </div>
                      </div>

                      {/* LifeSymbols */}
                      {product.lifesymbols && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>LifeSymbols® Interchangeable Corner Designs Compatible</span>
                        </div>
                      )}

                      {/* LifeStories */}
                      {product.lifestories && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>LifeStories® Medallion Memorial Keepsake Available</span>
                        </div>
                      )}

                      {/* Dual Disposition */}
                      {(product.dualDisposition || product.dual_disposition) && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Dual Disposition (Approved for both Burial & Cremation)</span>
                        </div>
                      )}
                    </div>

                    {/* Presentation Price or Funeral Home Presentation */}
                    {showPrice && (
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                            Showroom Presentation Price
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="font-serif text-2xl font-bold text-slate-900">
                              ${activeRetailPrice.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {customer?.name && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase">Presented by</span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[170px] block">
                              {customer.name}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Footer Gold Seal & Genuine Batesville Guarantee */}
              <div className="border-t border-slate-200 pt-4 mt-auto flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Genuine Batesville Craftsmanship • Handcrafted in North America</span>
                </div>
                <span>Printed on {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Global CSS for Clean 8.5x11 Print Layout */}
      <style>{`
        @media print {
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 8.5in 11in portrait;
            margin: 0.4in;
          }
        }
      `}</style>
    </div>
  );
};
