import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  LayoutGrid,
  Heart,
  Search,
  Trash2,
  X,
  ExternalLink,
  FileText,
  Download,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { EXTRA_CATEGORIES, ExtraCategory } from '../../services/extrasData';
import {
  loadExtrasStorage,
  uploadExtrasFiles,
  deleteExtrasFiles,
  ExtrasStorageContent,
  ExtraAsset,
  ExtraImage,
  EXTRAS_BUCKET,
  CATEGORY_FOLDERS,
  DEFAULT_GROUP,
} from '../../services/extrasStorage';

const CATEGORY_ICONS: Record<ExtraCategory, React.ComponentType<{ className?: string }>> = {
  catalogs: BookOpen,
  'selection-rooms': LayoutGrid,
  personalization: Heart,
};

const EMPTY_CONTENT: ExtrasStorageContent = {
  sections: { catalogs: [], 'selection-rooms': [], personalization: [] },
  familyChoiceRoomImages: [],
};

interface ExtrasHubProps {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  isLoggedIn?: boolean;
}

type EditionSelection = { year?: string; priced?: boolean; tag?: string };

export const ExtrasHub: React.FC<ExtrasHubProps> = ({
  selectedCategory = 'all',
  onCategoryChange,
  isLoggedIn = false,
}) => {
  const [content, setContent] = useState<ExtrasStorageContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEditions, setSelectedEditions] = useState<Record<string, EditionSelection>>({});
  const [viewer, setViewer] = useState<{ title: string; images: ExtraImage[]; index: number } | null>(null);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<ExtraCategory>('catalogs');
  const [uploadGroup, setUploadGroup] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setContent(await loadExtrasStorage());
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load files from storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Keyboard navigation for the image viewer
  useEffect(() => {
    if (!viewer) return;
    const total = viewer.images.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
      if (!total) return;
      if (e.key === 'ArrowRight') setViewer(v => v && { ...v, index: (v.index + 1) % total });
      if (e.key === 'ArrowLeft') setViewer(v => v && { ...v, index: (v.index - 1 + total) % total });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);

  // Search filter applied to every section/group
  const filteredSections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matches = (a: ExtraAsset) =>
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.editions.some(e => e.year.includes(q) || (e.tag || '').toLowerCase().includes(q));
    return EXTRA_CATEGORIES
      .filter(cat => selectedCategory === 'all' || selectedCategory === cat.id)
      .map(cat => ({
        cat,
        groups: content.sections[cat.id]
          .map(g => ({ ...g, assets: g.assets.filter(matches) }))
          .filter(g => g.assets.length > 0),
      }));
  }, [content, searchTerm, selectedCategory]);

  const countFor = (catId: string) => {
    const cats = catId === 'all' ? EXTRA_CATEGORIES.map(c => c.id) : [catId as ExtraCategory];
    return cats.reduce((sum, c) => sum + content.sections[c].reduce((s, g) => s + g.assets.length, 0), 0);
  };

  const openUpload = (category: ExtraCategory, group = '') => {
    setUploadCategory(category);
    setUploadGroup(group === DEFAULT_GROUP ? '' : group);
    setUploadFiles([]);
    setUploadMessage(null);
    setUploadOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles.length) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const res = await uploadExtrasFiles(uploadCategory, uploadGroup.trim(), uploadFiles);
      if (res.errors.length) {
        setUploadMessage({ ok: false, text: `Uploaded ${res.uploaded} of ${uploadFiles.length}. ${res.errors.join(' • ')}` });
      } else {
        setUploadMessage({ ok: true, text: `Uploaded ${res.uploaded} file${res.uploaded === 1 ? '' : 's'}.` });
        setUploadFiles([]);
      }
      await refresh();
    } catch (err: any) {
      setUploadMessage({ ok: false, text: err?.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (asset: ExtraAsset) => {
    const paths = [...asset.editions.map(e => e.path), ...asset.images.map(i => i.path)];
    const list = paths.map(p => `• ${p}`).join('\n');
    if (!window.confirm(`Delete "${asset.title}" from storage?\n\n${list}`)) return;
    try {
      await deleteExtrasFiles(paths);
      await refresh();
    } catch (err: any) {
      window.alert(`Delete failed: ${err?.message || err}`);
    }
  };

  const existingGroups = useMemo(
    () => content.sections[uploadCategory].map(g => g.name).filter(n => n !== DEFAULT_GROUP),
    [content, uploadCategory]
  );

  const inputClass = 'mt-1 w-full px-2 py-1.5 text-xs border border-slate-300 rounded-xs bg-white font-normal';
  const chip = 'text-[11px] font-mono text-slate-600 border border-slate-200 bg-white px-1.5 py-0.5 rounded-xs';
  const selectClass = 'text-[11px] font-mono border border-slate-300 rounded-xs bg-white px-1 py-0.5';

  const renderAsset = (asset: ExtraAsset, key: string) => {
    const hasDocs = asset.editions.length > 0;
    const thumb = asset.images[0];
    const Fallback = hasDocs ? FileText : ImageIcon;

    // Resolve selected document: Year -> Pricing version -> Tag
    let edition = asset.editions[0];
    let years: string[] = [];
    let year = '';
    let hasBothPricing = false;
    let pricedChoice = false;
    let tags: string[] = [];
    let tag = '';
    if (hasDocs) {
      const sel = selectedEditions[key] || {};
      years = Array.from(new Set(asset.editions.map(e => e.year)));
      year = sel.year !== undefined && years.includes(sel.year) ? sel.year : years[0];
      const yearEds = asset.editions.filter(e => e.year === year);
      hasBothPricing = yearEds.some(e => e.priced) && yearEds.some(e => !e.priced);
      pricedChoice = hasBothPricing ? Boolean(sel.priced) : yearEds[0].priced;
      const pool = yearEds.filter(e => e.priced === pricedChoice);
      tags = Array.from(new Set(pool.map(e => e.tag || '')));
      tag = sel.tag !== undefined && tags.includes(sel.tag) ? sel.tag : tags[0];
      edition = pool.find(e => (e.tag || '') === tag) || pool[0];
    }
    const updateSel = (patch: EditionSelection) =>
      setSelectedEditions(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    const openImages = () => asset.images.length && setViewer({ title: asset.title, images: asset.images, index: 0 });

    return (
      <li key={key} className="flex items-center gap-3 p-2.5 md:border-b md:border-r border-slate-200">
        <button
          onClick={() => (thumb ? openImages() : window.open(edition?.url, '_blank', 'noopener'))}
          className="w-14 h-14 shrink-0 bg-white border border-slate-200 flex items-center justify-center overflow-hidden hover:border-emerald-700 cursor-pointer relative"
          title={thumb ? 'View images' : `Open ${edition?.fileName}`}
        >
          {thumb
            ? <img src={thumb.url} alt={asset.title} className="max-h-full max-w-full object-contain" />
            : <Fallback className="w-6 h-6 text-blue-900" />}
          {asset.images.length > 1 && (
            <span className="absolute bottom-0 right-0 text-[9px] font-mono bg-blue-950 text-white px-1">{asset.images.length}</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-serif font-bold text-slate-950 text-xs leading-tight truncate" title={asset.title}>{asset.title}</h4>
            {isLoggedIn && (
              <button
                onClick={() => handleDeleteAsset(asset)}
                className="p-0.5 text-slate-400 hover:text-red-700 cursor-pointer shrink-0"
                title="Delete from storage"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {hasDocs && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {years.length > 1 ? (
                <select value={year} onChange={e => updateSel({ year: e.target.value })} className={selectClass} title="Edition year">
                  {years.map(y => <option key={y} value={y}>{y || 'Undated'}</option>)}
                </select>
              ) : year ? (
                <span className={chip}>{year}</span>
              ) : null}

              {hasBothPricing ? (
                <div className="inline-flex border border-slate-300 rounded-xs overflow-hidden" title="Choose version">
                  {[false, true].map(p => (
                    <button
                      key={String(p)}
                      onClick={() => updateSel({ priced: p })}
                      className={`px-1.5 py-0.5 text-[10px] font-serif font-bold uppercase tracking-wide cursor-pointer ${
                        pricedChoice === p ? 'bg-emerald-800 text-white' : 'bg-white text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      {p ? 'With Prices' : 'No Prices'}
                    </button>
                  ))}
                </div>
              ) : edition.priced ? (
                <span className="text-[10px] font-serif font-bold uppercase tracking-wide text-emerald-800 border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 rounded-xs">With Prices</span>
              ) : null}

              {tags.length > 1 ? (
                <select value={tag} onChange={e => updateSel({ tag: e.target.value })} className={selectClass} title="Version">
                  {tags.map(t => <option key={t} value={t}>{t || 'Standard'}</option>)}
                </select>
              ) : tag ? (
                <span className="text-[10px] font-mono font-bold text-blue-900 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded-xs">{tag}</span>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-1">
            {hasDocs && (
              <>
                <a
                  href={edition.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-blue-900 hover:text-emerald-800"
                >
                  <ExternalLink className="w-3 h-3" /> Catalog
                </a>
                <a
                  href={`${edition.url}?download=${encodeURIComponent(edition.fileName)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-slate-600 hover:text-emerald-800"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </a>
              </>
            )}
            {asset.images.length > 0 && (
              <button
                onClick={openImages}
                className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-blue-900 hover:text-emerald-800 cursor-pointer"
              >
                <ImageIcon className="w-3 h-3" /> {asset.images.length > 1 ? `Images (${asset.images.length})` : 'Image'}
              </button>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Compact Section Header: title + filters + search in one bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#fafcfa] border-y-2 border-double border-emerald-900 border-x border-slate-300 px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-800" />
          <h1 className="text-base font-serif font-black text-slate-950 tracking-wide uppercase">Extras</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 flex-1 md:justify-center">
          {[{ id: 'all', label: 'All' }, ...EXTRA_CATEGORIES].map(c => {
            const isActive = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onCategoryChange?.(c.id)}
                className={`px-2.5 py-0.5 text-[11px] font-serif font-bold uppercase tracking-wider rounded-xs border cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-800 to-blue-900 text-white border-emerald-950'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-emerald-50'
                }`}
              >
                {c.label} <span className="font-mono opacity-75">{countFor(c.id)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-2 py-1 text-xs font-serif border border-slate-300 rounded-xs bg-white focus:outline-none focus:border-emerald-700 w-40"
            />
          </div>
          <button
            onClick={refresh}
            className="p-1.5 border border-slate-300 bg-white rounded-xs text-slate-700 hover:text-emerald-800 cursor-pointer"
            title="Reload from storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 text-xs font-serif text-red-700 border border-red-200 bg-red-50">
          Couldn't load the "{EXTRAS_BUCKET}" storage bucket: {loadError}
        </div>
      )}

      {/* Sections */}
      {filteredSections.map(({ cat, groups }) => {
        const Icon = CATEGORY_ICONS[cat.id];
        const folder = CATEGORY_FOLDERS[cat.id];
        return (
          <section key={cat.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-double border-emerald-800 pb-1">
              <Icon className="w-4 h-4 text-emerald-800" />
              <h2 className="font-serif font-black uppercase tracking-wider text-slate-950 text-sm">{cat.label}</h2>
              <span className="text-[11px] font-serif italic text-slate-600 hidden sm:inline">— {cat.description}</span>
              <div className="ml-auto flex items-center gap-2">
                {cat.id === 'selection-rooms' && (
                  <button
                    onClick={() => setViewer({ title: 'Family Choice Room', images: content.familyChoiceRoomImages, index: 0 })}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-blue-900 hover:from-emerald-900 hover:to-blue-950 text-white border border-emerald-950 px-3 py-1 rounded-xs text-[11px] font-serif font-black uppercase tracking-widest cursor-pointer shadow-2xs"
                    title="View Family Choice Room design photos"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Family Choice Room</span>
                    {content.familyChoiceRoomImages.length > 0 && (
                      <span className="font-mono text-[10px] text-emerald-200">{content.familyChoiceRoomImages.length}</span>
                    )}
                  </button>
                )}
                {isLoggedIn && (
                  <button
                    onClick={() => openUpload(cat.id)}
                    className="flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-700 px-2.5 py-1 rounded-xs text-[11px] font-serif font-bold uppercase tracking-wider cursor-pointer"
                    title={`Upload catalogs or images to ${cat.label}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>

            {loading && groups.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-xs font-serif italic text-slate-600 bg-[#fafcfa] border border-slate-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" /> Loading…
              </div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-xs font-serif italic text-slate-600 bg-[#fafcfa] border border-dashed border-slate-300">
                {searchTerm.trim()
                  ? 'Nothing matches your search.'
                  : <>Nothing here yet. Click <b>Add</b> to upload catalogs and images
                      {folder ? <> (or drop them in the <b>"{folder}"</b> folder of the <b>"{EXTRAS_BUCKET}"</b> bucket)</> : <> (or drop them in the <b>"{EXTRAS_BUCKET}"</b> bucket)</>}.</>}
              </div>
            ) : (
              groups.map(group => (
                <div key={group.folder} className="bg-[#fafcfa] border border-slate-300 shadow-2xs">
                  <div className="px-3 py-1.5 bg-emerald-50/70 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="text-xs font-serif font-black uppercase tracking-wider text-blue-950">{group.name}</h3>
                    <div className="flex items-center gap-2">
                      {isLoggedIn && (
                        <button
                          onClick={() => openUpload(cat.id, group.name)}
                          className="text-emerald-800 hover:text-emerald-950 cursor-pointer"
                          title={`Add to ${group.name}`}
                        >
                          <Upload className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-emerald-800">{group.assets.length}</span>
                    </div>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 divide-slate-200">
                    {group.assets.map(asset => renderAsset(asset, `${group.folder}::${asset.title}`))}
                  </ul>
                </div>
              ))
            )}
          </section>
        );
      })}

      {/* Image Viewer (Family Choice Room & item images) */}
      {viewer && (() => {
        const { images, index, title } = viewer;
        const current = images[index];
        const go = (delta: number) => setViewer(v => v && { ...v, index: (v.index + delta + images.length) % images.length });
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
            <div
              onClick={e => e.stopPropagation()}
              className="bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-double border-emerald-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-800" />
                  <h3 className="font-serif font-black uppercase tracking-widest text-slate-950 text-sm">{title}</h3>
                  {images.length > 0 && <span className="text-[11px] font-mono text-slate-600">{index + 1} / {images.length}</span>}
                </div>
                <button onClick={() => setViewer(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading && !current ? (
                <div className="flex items-center justify-center gap-2 p-16 text-sm font-serif italic text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> Loading photos…
                </div>
              ) : !current ? (
                <div className="p-12 text-center text-sm font-serif italic text-slate-600">No photos yet.</div>
              ) : (
                <>
                  <div className="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center">
                    <img src={current.url} alt={current.name} className="max-h-[68vh] max-w-full object-contain" />
                    {images.length > 1 && (
                      <>
                        <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white rounded-full shadow cursor-pointer" title="Previous">
                          <ChevronLeft className="w-5 h-5 text-slate-900" />
                        </button>
                        <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white rounded-full shadow cursor-pointer" title="Next">
                          <ChevronRight className="w-5 h-5 text-slate-900" />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 p-2 overflow-x-auto border-t border-slate-300 justify-center">
                      {images.map((img, idx) => (
                        <button
                          key={img.url}
                          onClick={() => setViewer(v => v && { ...v, index: idx })}
                          className={`w-24 h-16 shrink-0 border-2 overflow-hidden cursor-pointer ${idx === index ? 'border-emerald-700' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Upload Dialog */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !uploading && setUploadOpen(false)}>
          <form
            onSubmit={handleUpload}
            onClick={e => e.stopPropagation()}
            className="bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-xl w-full max-w-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b-2 border-double border-emerald-800 pb-2">
              <h3 className="font-serif font-black uppercase tracking-wider text-slate-950 text-sm">Add Catalogs &amp; Images</h3>
              <button type="button" onClick={() => setUploadOpen(false)} disabled={uploading} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-serif font-bold text-slate-800">
                Section
                <select
                  value={uploadCategory}
                  onChange={e => { setUploadCategory(e.target.value as ExtraCategory); setUploadGroup(''); }}
                  className={inputClass}
                >
                  {EXTRA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-serif font-bold text-slate-800">
                Group <span className="font-normal text-slate-500">(optional)</span>
                <input
                  list="extras-group-options"
                  value={uploadGroup}
                  onChange={e => setUploadGroup(e.target.value)}
                  placeholder="e.g. Casket Displays"
                  className={inputClass}
                />
                <datalist id="extras-group-options">
                  {existingGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              </label>
            </div>

            <label className="block text-xs font-serif font-bold text-slate-800">
              Files
              <input
                type="file"
                multiple
                accept=".pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                className="mt-1 block w-full text-xs"
              />
            </label>
            {uploadFiles.length > 0 && (
              <ul className="max-h-28 overflow-y-auto text-[11px] font-mono text-slate-700 border border-slate-200 bg-white p-2 space-y-0.5">
                {uploadFiles.map(f => <li key={f.name} className="truncate">{f.name}</li>)}
              </ul>
            )}

            <div className="text-[11px] font-serif text-slate-600 bg-emerald-50/60 border border-emerald-200 p-2 space-y-0.5">
              <div><b>Pair an image with its catalog</b> by giving them the same name:</div>
              <div className="font-mono">Full-Couch Wall Display.jpg</div>
              <div className="font-mono">Full-Couch Wall Display 2027.pdf</div>
              <div className="pt-1">Add <b>"with Prices"</b> for priced versions and a year at the end for editions.</div>
            </div>

            {uploadMessage && (
              <div className={`text-xs font-serif p-2 border ${uploadMessage.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                {uploadMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setUploadOpen(false)} disabled={uploading} className="px-3 py-1.5 text-xs font-serif font-bold border border-slate-300 bg-white rounded-xs cursor-pointer">
                Close
              </button>
              <button
                type="submit"
                disabled={uploading || uploadFiles.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white border border-emerald-950 rounded-xs cursor-pointer"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
