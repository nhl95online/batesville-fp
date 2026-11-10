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
} from 'lucide-react';
import { DEFAULT_EXTRAS, EXTRA_CATEGORIES, ExtraCategory, ExtraItem } from '../../services/extrasData';

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
    return EXTRA_CATEGORIES.map(cat => {
      const groups = new Map<string, ExtraItem[]>();
      filtered.filter(i => i.category === cat.id).forEach(i => {
        if (!groups.has(i.group)) groups.set(i.group, []);
        groups.get(i.group)!.push(i);
      });
      return { cat, groups: Array.from(groups.entries()) };
    }).filter(c => c.groups.length > 0);
  }, [filtered]);

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
            const count = c.id === 'all' ? allExtras.length : allExtras.filter(i => i.category === c.id).length;
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
            </div>

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
