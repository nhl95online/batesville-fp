import React, { useState, useEffect, useRef } from 'react';
import { Product, CasketImageItem } from '../../types';
import { 
  saveCasketImage, 
  getAllCasketImages, 
  deleteCasketImage, 
  db 
} from '../../services/db';
import { uploadCasketImageToStorage, matchCasketFileToProducts } from '../../services/supabase';
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Link2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  RefreshCw
} from 'lucide-react';

interface CasketImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onImagesUpdated: () => void;
}

export const CasketImageManagerModal: React.FC<CasketImageManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  onImagesUpdated,
}) => {
  const [images, setImages] = useState<CasketImageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<CasketImageItem | null>(null);
  const [assignProductId, setAssignProductId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = async () => {
    const list = await getAllCasketImages();
    setImages(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadImages();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process files prioritizing Batesville Product Code in filename
  const handleFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    setStatusMessage(null);
    let successCount = 0;
    let matchedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      // Extract and match by Batesville Product Code
      const { matchedProducts, productCode, productName } = matchCasketFileToProducts(file.name, products);

      // Convert to Data URL for instant local offline storage
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Upload to Supabase Storage bucket 'caskets' using product code as filename
      let finalUrl = dataUrl;
      try {
        const remoteRes = await uploadCasketImageToStorage(file, productCode ? `${productCode}.png` : undefined);
        if (remoteRes.success && remoteRes.url) {
          finalUrl = remoteRes.url;
        }
      } catch (e) {
        // Graceful fallback to dataUrl
      }

      const imageItem: CasketImageItem = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        productCode,
        productName,
        dataUrl: finalUrl,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      };

      await saveCasketImage(imageItem);

      // If product code matched, update ALL products with this code across every catalog year
      if (productCode) {
        matchedCount++;
        const allMatches = await db.products.where('code').equals(productCode).toArray();
        for (const p of allMatches) {
          await db.products.update(p.id, { imageUrl: finalUrl });
        }
      }

      successCount++;
    }

    await loadImages();
    onImagesUpdated();
    setIsUploading(false);
    setStatusMessage({
      success: true,
      message: `Processed ${successCount} casket images! ${matchedCount > 0 ? `${matchedCount} images automatically matched by Product Code and linked across all catalog years.` : 'Images stored locally and in Supabase Storage.'}`
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCasketImage(id);
    if (selectedImage?.id === id) setSelectedImage(null);
    await loadImages();
    onImagesUpdated();
  };

  const handleAssignToProduct = async () => {
    if (!selectedImage || !assignProductId) return;

    const prod = products.find(p => p.id === assignProductId);
    if (!prod) return;

    // Update image record
    const updated: CasketImageItem = {
      ...selectedImage,
      productCode: prod.code,
      productName: prod.name
    };
    await saveCasketImage(updated);

    // Update ALL product records sharing this product code across all catalog years
    const allMatches = await db.products.where('code').equals(prod.code).toArray();
    for (const p of allMatches) {
      await db.products.update(p.id, { imageUrl: selectedImage.dataUrl });
    }

    setSelectedImage(updated);
    await loadImages();
    onImagesUpdated();
    setStatusMessage({
      success: true,
      message: `Assigned image "${selectedImage.fileName}" to Batesville Product Code ${prod.code} (${prod.name}) across all catalog years!`
    });
  };

  const filteredImages = images.filter(img => 
    img.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (img.productCode && img.productCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (img.productName && img.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Casket Image Studio & Supabase Uploader
              </h2>
              <p className="text-xs text-slate-500">
                Upload photos, match them to casket SKUs, and sync with your catalogs.
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

        {/* Status Notification */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center space-x-3 text-xs border shrink-0 ${
            statusMessage.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {statusMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{statusMessage.message}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          
          {/* Left Column: Drag & Drop Zone + Gallery (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/70 p-6 rounded-2xl text-center cursor-pointer transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                {isUploading ? 'Processing & Linking Casket Images...' : 'Drop Casket Images Here or Browse'}
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-1">
                Naming images with the <strong>Product Code</strong> (e.g. <code>146799.png</code>, <code>20A_880.png</code>, <code>4BH_891.png</code>) auto-links them across all catalog years & price cards!
              </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search uploaded images by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {filteredImages.length} images
              </span>
            </div>

            {/* Gallery Grid */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs border border-slate-200 rounded-2xl bg-slate-50">
                <FileImage className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                No casket images found. Drag & drop images above to start!
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-1">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-slate-50 group shadow-xs ${
                      selectedImage?.id === img.id
                        ? 'border-amber-500 ring-2 ring-amber-500/30 scale-95'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-28 w-full overflow-hidden bg-white">
                      <img
                        src={img.dataUrl}
                        alt={img.fileName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-1.5 text-[10px] bg-white truncate border-t border-slate-200">
                      <span className="font-semibold text-slate-800 block truncate">
                        {img.productCode ? `SKU: ${img.productCode}` : img.fileName}
                      </span>
                    </div>
                    {img.productCode && (
                      <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Selected Image Inspector & Linker (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            {selectedImage ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Selected Image
                  </h3>
                  <button
                    onClick={() => handleDelete(selectedImage.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={selectedImage.dataUrl}
                    alt={selectedImage.fileName}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="text-xs space-y-1 text-slate-700">
                  <div className="truncate font-semibold text-slate-900">{selectedImage.fileName}</div>
                  {selectedImage.productCode ? (
                    <div className="text-emerald-700 flex items-center space-x-1 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Linked to: <strong>{selectedImage.productCode}</strong> ({selectedImage.productName})</span>
                    </div>
                  ) : (
                    <div className="text-amber-700 italic font-medium">Not yet linked to any casket SKU</div>
                  )}
                </div>

                {/* Link to Product Dropdown */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Link / Reassign to Casket
                  </label>
                  <select
                    value={assignProductId}
                    onChange={(e) => setAssignProductId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="">-- Select Casket Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.catalogYear})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAssignToProduct}
                    disabled={!assignProductId}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Apply Image to Product</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center my-auto py-8 text-slate-500 text-xs">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                Select any casket image from the gallery to view details or link it to a product.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
