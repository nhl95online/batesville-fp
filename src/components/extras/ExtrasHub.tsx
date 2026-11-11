import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  LayoutGrid,
  Heart,
  Search,
  Plus,
  Trash2,
  X,
  ExternalLink,
  FileText,
  Download,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { DEFAULT_EXTRAS, EXTRA_CATEGORIES, ExtraCategory, ExtraItem } from '../../services/extrasData';
import { loadExtrasStorage, ExtrasStorageContent, EXTRAS_BUCKET, FAMILY_CHOICE_ROOM_FOLDER } from '../../services/extrasStorage';

const CUSTOM_EXTRAS_KEY = 'portal_custom_extras';
const VALID_CATEGORIES = EXTRA_CATEGORIES.map(c => c.id);

export const loadCustomExtras = (): ExtraItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_EXTRAS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ExtraItem>[]) : [];
    // Normalize older saved items (e.g. retired categories, missing group)
    return parsed.map(i => ({
      ...i,
      category: VALID_CATEGORIES.includes(i.category as ExtraCategory) ? i.category : 'selection-rooms',
      group: i.group || 'Other',
    })) as ExtraItem[];
  } catch {
    return [];
  }
};

const saveCustomExtras = (items: ExtraItem[]) => {
  localStorage.setItem(CUSTOM_EXTRAS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('portal_extras_changed'));
};

const CATEGORY_ICONS: Record<ExtraCategory, React.ComponentType<{ className?: string }>> = {
  catalogs: BookOpen,
  'selection-rooms': LayoutGrid,
  personalization: Heart,
};

interface ExtrasHubProps {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  isLoggedIn?: boolean;
}

export const ExtrasHub: React.FC<ExtrasHubProps> = ({
  selectedCategory = 'all',
  onCategoryChange,
  isLoggedIn = false,
}) => {
  const [customExtras, setCustomExtras] = useState<ExtraItem[]>(() => loadCustomExtras());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState({
    title: '',
    category: 'catalogs' as ExtraCategory,
    group: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
  });

  useEffect(() => {
    const sync = () => setCustomExtras(loadCustomExtras());
    window.addEventListener('portal_extras_changed', sync);
    return () => window.removeEventListener('portal_extras_changed', sync);
  }, []);

  // Supabase Storage content (catalog PDFs + Family Choice Room photos)
  const [storage, setStorage] = useState<ExtrasStorageContent>({ catalogs: [], familyChoiceRoomImages: [] });
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [selectedEditions, setSelectedEditions] = useState<Record<string, { year?: string; priced?: boolean; tag?: string }>>({});
  const [roomViewerIndex, setRoomViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadExtrasStorage()
      .then(res => { if (!cancelled) setStorage(res); })
      .catch(err => { if (!cancelled) setStorageError(err?.message || 'Unable to load files from storage.'); })
      .finally(() => { if (!cancelled) setStorageLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Keyboard navigation for the Family Choice Room viewer
  useEffect(() => {
    if (roomViewerIndex === null) return;
    const total = storage.familyChoiceRoomImages.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRoomViewerIndex(null);
      if (e.key === 'ArrowRight' && total) setRoomViewerIndex(i => (i === null ? 0 : (i + 1) % total));
      if (e.key === 'ArrowLeft' && total) setRoomViewerIndex(i => (i === null ? 0 : (i - 1 + total) % total));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roomViewerIndex, storage.familyChoiceRoomImages.length]);

  const filteredCatalogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return storage.catalogs.filter(doc =>
      !q || doc.title.toLowerCase().includes(q) || doc.editions.some(e => e.year.includes(q))
    );
  }, [storage.catalogs, searchTerm]);

  const allExtras = useMemo(() => [...DEFAULT_EXTRAS, ...customExtras], [customExtras]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allExtras.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.details || []).some(d => d.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allExtras, selectedCategory, searchTerm]);

  // Category -> Group -> Items (preserving data order)
  const grouped = useMemo(() => {
    return EXTRA_CATEGORIES
      .filter(cat => selectedCategory === 'all' || selectedCategory === cat.id)
      .map(cat => {
        const groups = new Map<string, ExtraItem[]>();
        filtered.filter(i => i.category === cat.id).forEach(i => {
          if (!groups.has(i.group)) groups.set(i.group, []);
          groups.get(i.group)!.push(i);
        });
        return { cat, groups: Array.from(groups.entries()) };
      })
      // Catalogs & Selection Rooms always render (storage-driven content / Family Choice Room button)
      .filter(c => c.groups.length > 0 || (!searchTerm.trim() && (c.cat.id === 'catalogs' || c.cat.id === 'selection-rooms')) || (c.cat.id === 'catalogs' && filteredCatalogs.length > 0));
  }, [filtered, selectedCategory, searchTerm, filteredCatalogs]);

  const existingGroups = useMemo(
    () => Array.from(new Set(allExtras.filter(i => i.category === draft.category).map(i => i.group))),
    [allExtras, draft.category]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const newItem: ExtraItem = {
      id: `custom-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      group: draft.group.trim() || 'Other',
      description: draft.description.trim(),
      imageUrl: draft.imageUrl.trim() || undefined,
      linkUrl: draft.linkUrl.trim() || undefined,
      isCustom: true,
    };
    const next = [...customExtras, newItem];
    setCustomExtras(next);
    saveCustomExtras(next);
    setDraft({ ...draft, title: '', description: '', imageUrl: '', linkUrl: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this extra?')) return;
    const next = customExtras.filter(i => i.id !== id);
    setCustomExtras(next);
    saveCustomExtras(next);
  };

  const inputClass = 'mt-1 w-full px-2 py-1.5 text-xs border border-slate-300 rounded-xs bg-white font-normal';

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
            const storageCount = c.id === 'all' || c.id === 'catalogs' ? storage.catalogs.length : 0;
            const count = (c.id === 'all' ? allExtras.length : allExtras.filter(i => i.category === c.id).length) + storageCount;
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
                {c.label} <span className="font-mono opacity-75">{count}</span>
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
          {isLoggedIn && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-950 px-2.5 py-1 rounded-xs text-[11px] font-serif font-bold uppercase tracking-wider cursor-pointer"
              title="Add Extra"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories, each with combined group panels */}
      {grouped.map(({ cat, groups }) => {
        const Icon = CATEGORY_ICONS[cat.id];
        return (
          <section key={cat.id} className="space-y-2">
            <div className="flex items-center gap-2 border-b-2 border-double border-emerald-800 pb-1">
              <Icon className="w-4 h-4 text-emerald-800" />
              <h2 className="font-serif font-black uppercase tracking-wider text-slate-950 text-sm">{cat.label}</h2>
              <span className="text-[11px] font-serif italic text-slate-600 hidden sm:inline">— {cat.description}</span>
              {cat.id === 'selection-rooms' && (
                <button
                  onClick={() => setRoomViewerIndex(0)}
                  className="ml-auto flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-blue-900 hover:from-emerald-900 hover:to-blue-950 text-white border border-emerald-950 px-3 py-1 rounded-xs text-[11px] font-serif font-black uppercase tracking-widest cursor-pointer shadow-2xs"
                  title="View Family Choice Room design photos"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Family Choice Room</span>
                  {storage.familyChoiceRoomImages.length > 0 && (
                    <span className="font-mono text-[10px] text-emerald-200">{storage.familyChoiceRoomImages.length}</span>
                  )}
                </button>
              )}
            </div>

            {/* Catalog Library — loaded from the Supabase "extras" bucket */}
            {cat.id === 'catalogs' && (
              <div className="bg-[#fafcfa] border border-slate-300 shadow-2xs">
                <div className="px-3 py-1.5 bg-emerald-50/70 border-b border-slate-300 flex items-center justify-between">
                  <h3 className="text-xs font-serif font-black uppercase tracking-wider text-blue-950">Catalog Library</h3>
                  <span className="text-[10px] font-mono text-emerald-800">{filteredCatalogs.length}</span>
                </div>
                {storageLoading ? (
                  <div className="flex items-center gap-2 p-4 text-xs font-serif italic text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" /> Loading catalogs…
                  </div>
                ) : storageError ? (
                  <div className="p-4 text-xs font-serif text-red-700">
                    Couldn't load the "{EXTRAS_BUCKET}" storage bucket: {storageError}
                  </div>
                ) : filteredCatalogs.length === 0 ? (
                  <div className="p-4 text-xs font-serif italic text-slate-600">
                    {searchTerm.trim()
                      ? 'No catalogs match your search.'
                      : <>No catalogs yet. Upload files to the Supabase <b>"{EXTRAS_BUCKET}"</b> bucket named like <b>"Cremation Options Catalog 2026.pdf"</b>.</>}
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 divide-slate-200">
                    {filteredCatalogs.map(doc => {
                      // Resolve selected edition: Year -> Pricing version -> Tag (e.g. program)
                      const sel = selectedEditions[doc.title] || {};
                      const years = Array.from(new Set(doc.editions.map(e => e.year)));
                      const year = sel.year && years.includes(sel.year) ? sel.year : years[0];
                      const yearEds = doc.editions.filter(e => e.year === year);
                      const hasBothPricing = yearEds.some(e => e.priced) && yearEds.some(e => !e.priced);
                      const pricedChoice = hasBothPricing ? Boolean(sel.priced) : yearEds[0].priced;
                      const pool = yearEds.filter(e => e.priced === pricedChoice);
                      const tags = Array.from(new Set(pool.map(e => e.tag || '')));
                      const tag = sel.tag !== undefined && tags.includes(sel.tag) ? sel.tag : tags[0];
                      const edition = pool.find(e => (e.tag || '') === tag) || pool[0];
                      const updateSel = (patch: { year?: string; priced?: boolean; tag?: string }) =>
                        setSelectedEditions(prev => ({ ...prev, [doc.title]: { ...prev[doc.title], ...patch } }));
                      const chip = 'text-[11px] font-mono text-slate-600 border border-slate-200 bg-white px-1.5 py-0.5 rounded-xs';
                      const select = 'text-[11px] font-mono border border-slate-300 rounded-xs bg-white px-1 py-0.5';

                      return (
                        <li key={doc.title} className="flex items-center gap-3 p-2.5 md:border-b md:border-r border-slate-200">
                          <a
                            href={edition.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-14 shrink-0 bg-white border border-slate-200 flex items-center justify-center overflow-hidden hover:border-emerald-700"
                            title={`Open ${edition.fileName}`}
                          >
                            {edition.isImage
                              ? <img src={edition.url} alt={doc.title} className="max-h-full max-w-full object-contain" />
                              : <FileText className="w-6 h-6 text-blue-900" />}
                          </a>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-serif font-bold text-slate-950 text-xs leading-tight truncate" title={doc.title}>{doc.title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {years.length > 1 ? (
                                <select value={year} onChange={e => updateSel({ year: e.target.value })} className={select} title="Edition year">
                                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              ) : (
                                <span className={chip}>{year}</span>
                              )}

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
                                <select value={tag} onChange={e => updateSel({ tag: e.target.value })} className={select} title="Version">
                                  {tags.map(t => <option key={t} value={t}>{t || 'Standard'}</option>)}
                                </select>
                              ) : tag ? (
                                <span className="text-[10px] font-mono font-bold text-blue-900 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded-xs">{tag}</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={edition.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-blue-900 hover:text-emerald-800"
                              >
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                              <a
                                href={`${edition.url}?download=${encodeURIComponent(edition.fileName)}`}
                                className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-slate-600 hover:text-emerald-800"
                                title="Download"
                              >
                                <Download className="w-3 h-3" /> Download
                              </a>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groups.map(([groupName, items]) => (
                <div key={groupName} className="bg-[#fafcfa] border border-slate-300 shadow-2xs">
                  <div className="px-3 py-1.5 bg-emerald-50/70 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="text-xs font-serif font-black uppercase tracking-wider text-blue-950">{groupName}</h3>
                    <span className="text-[10px] font-mono text-emerald-800">{items.length}</span>
                  </div>
                  <ul className="divide-y divide-slate-200">
                    {items.map(item => (
                      <li key={item.id} className="flex gap-3 p-2.5">
                        <div className="w-14 h-14 shrink-0 bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                          {item.imageUrl && !brokenImages[item.id] ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="max-h-full max-w-full object-contain"
                              onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                            />
                          ) : (
                            <Icon className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-serif font-bold text-slate-950 text-xs leading-tight">{item.title}</h4>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.linkUrl && (
                                <a
                                  href={item.linkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-0.5 text-blue-900 hover:text-emerald-800"
                                  title={item.linkLabel || 'Open link'}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {item.isCustom && isLoggedIn && (
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-0.5 text-slate-500 hover:text-red-700 cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">{item.description}</p>
                          )}
                          {item.details && item.details.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{item.details.join(' • ')}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-sm font-serif italic text-slate-600 border border-dashed border-slate-300 bg-white">
          No extras match your search.
        </div>
      )}

      {/* Family Choice Room Photo Viewer */}
      {roomViewerIndex !== null && (() => {
        const images = storage.familyChoiceRoomImages;
        const current = images[roomViewerIndex];
        const go = (delta: number) => setRoomViewerIndex(i => (i === null ? 0 : (i + delta + images.length) % images.length));
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setRoomViewerIndex(null)}>
            <div
              onClick={e => e.stopPropagation()}
              className="bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-double border-emerald-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-800" />
                  <h3 className="font-serif font-black uppercase tracking-widest text-slate-950 text-sm">Family Choice Room</h3>
                  {images.length > 0 && (
                    <span className="text-[11px] font-mono text-slate-600">{roomViewerIndex + 1} / {images.length}</span>
                  )}
                </div>
                <button onClick={() => setRoomViewerIndex(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {storageLoading ? (
                <div className="flex items-center justify-center gap-2 p-16 text-sm font-serif italic text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> Loading photos…
                </div>
              ) : !current ? (
                <div className="p-12 text-center text-sm font-serif italic text-slate-600">
                  No room photos yet. Upload images to the <b>"{FAMILY_CHOICE_ROOM_FOLDER}"</b> folder in the Supabase <b>"{EXTRAS_BUCKET}"</b> bucket.
                </div>
              ) : (
                <>
                  <div className="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center">
                    <img src={current.url} alt={current.name} className="max-h-[68vh] max-w-full object-contain" />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => go(-1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white rounded-full shadow cursor-pointer"
                          title="Previous"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-900" />
                        </button>
                        <button
                          onClick={() => go(1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white rounded-full shadow cursor-pointer"
                          title="Next"
                        >
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
                          onClick={() => setRoomViewerIndex(idx)}
                          className={`w-24 h-16 shrink-0 border-2 overflow-hidden cursor-pointer ${idx === roomViewerIndex ? 'border-emerald-700' : 'border-transparent opacity-70 hover:opacity-100'}`}
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

      {/* Add Extra Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setIsAdding(false)}>
          <form
            onSubmit={handleAdd}
            onClick={e => e.stopPropagation()}
            className="bg-[#fafcfa] border-2 border-blue-950 rounded-xs shadow-xl w-full max-w-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b-2 border-double border-emerald-800 pb-2">
              <h3 className="font-serif font-black uppercase tracking-wider text-slate-950 text-sm">Add Extra</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block text-xs font-serif font-bold text-slate-800">
              Title *
              <input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-serif font-bold text-slate-800">
                Section
                <select
                  value={draft.category}
                  onChange={e => setDraft({ ...draft, category: e.target.value as ExtraCategory, group: '' })}
                  className={inputClass}
                >
                  {EXTRA_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-serif font-bold text-slate-800">
                Group
                <input
                  list="extras-group-options"
                  value={draft.group}
                  onChange={e => setDraft({ ...draft, group: e.target.value })}
                  placeholder="Pick or type new"
                  className={inputClass}
                />
                <datalist id="extras-group-options">
                  {existingGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              </label>
            </div>
            <label className="block text-xs font-serif font-bold text-slate-800">
              Description
              <textarea rows={2} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-serif font-bold text-slate-800">
                Image URL
                <input value={draft.imageUrl} onChange={e => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="/misc/Image.png" className={inputClass} />
              </label>
              <label className="block text-xs font-serif font-bold text-slate-800">
                Link
                <input value={draft.linkUrl} onChange={e => setDraft({ ...draft, linkUrl: e.target.value })} placeholder="https://..." className={inputClass} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-serif font-bold border border-slate-300 bg-white rounded-xs cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs font-serif font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-950 rounded-xs cursor-pointer">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
