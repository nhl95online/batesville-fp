import { getSupabaseClient } from './supabase';
import { ExtraCategory } from './extrasData';

// Supabase Storage bucket that holds all Extras content (catalogs, images, room photos)
export const EXTRAS_BUCKET = 'extras';

// Where each Extras section lives inside the bucket.
// Catalogs & Literature uses the bucket root; other sections use a folder.
// Sub-folders inside a section folder become groups (e.g. "Selection Room Setups/Casket Displays/").
export const CATEGORY_FOLDERS: Record<ExtraCategory, string> = {
  catalogs: '',
  'selection-rooms': 'Selection Room Setups',
  personalization: 'Personalization',
};

// Family Choice Room photos: either inside this folder in the bucket,
// or at the bucket root with a name starting with "Family Choice(s)"
// (e.g. "Family Choices Physical Showroom 1.jpg" or "Family Choice Room 1.jpg")
export const FAMILY_CHOICE_ROOM_FOLDER = 'Family Choice Room';
const FAMILY_CHOICE_PREFIX = /^family[\s_-]*choices?\b/i;

// Root-level folders that are NOT catalog groups
const RESERVED_ROOT_FOLDERS = new Set(
  [FAMILY_CHOICE_ROOM_FOLDER, ...Object.values(CATEGORY_FOLDERS)].filter(Boolean).map(f => f.toLowerCase())
);

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
export const DEFAULT_GROUP = 'Library';

export interface CatalogEdition {
  year: string;         // '' when the file name has no year
  priced: boolean;      // file name contains "with Prices" / "with Pricing"
  tag?: string;         // extra label after the year, e.g. "AMP" in "Batesville Price List 2027 AMP"
  fileName: string;
  path: string;         // full path within the bucket
  url: string;
}

export interface ExtraImage {
  name: string;
  path: string;
  url: string;
}

// One entry on the page: files sharing the same title are combined
// (e.g. "Full-Couch Wall Display.jpg" + "Full-Couch Wall Display 2027.pdf")
export interface ExtraAsset {
  title: string;
  editions: CatalogEdition[]; // documents, newest first
  images: ExtraImage[];
}

export interface ExtraGroup {
  name: string;
  folder: string; // bucket path of the group's folder
  assets: ExtraAsset[];
}

export interface ExtrasStorageContent {
  sections: Record<ExtraCategory, ExtraGroup[]>;
  familyChoiceRoomImages: ExtraImage[];
}

const stripExtension = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '');

const WITH_PRICES = /\b(?:with|w\/?)\s*(?:prices?|pricing)\b|\bpriced\b/i;
const WITHOUT_PRICES = /\b(?:without|w\/o|no)\s*(?:prices?|pricing)\b|\bunpriced\b/i;
const YEAR = /(?:19|20)\d{2}(?:\s*[-–_]\s*(?:20\d{2}|\d{2}))?/g;

const tidy = (s: string) => s.replace(/[_]+/g, ' ').replace(/\s*[-–]\s*$/, '').replace(/^\s*[-–]\s*/, '').replace(/\s+/g, ' ').trim();
const stripPricing = (s: string) => s.replace(WITHOUT_PRICES, ' ').replace(WITH_PRICES, ' ');

// Parses file names (extension ignored):
//   "Cremation Options Catalog 2027"             -> title "Cremation Options Catalog", year 2027
//   "Cremation Options Catalog with Prices 2027" -> same title, priced
//   "Batesville Price List 2027 AMP"             -> title "Batesville Price List", year 2027, tag "AMP"
//   "Full-Couch Wall Display"                    -> title "Full-Couch Wall Display", no year
const parseFileName = (fileName: string) => {
  const base = stripExtension(fileName).trim();
  const priced = WITH_PRICES.test(base) && !WITHOUT_PRICES.test(base);

  const yearMatches = Array.from(base.matchAll(YEAR));
  const yearMatch = yearMatches[yearMatches.length - 1];
  if (!yearMatch || yearMatch.index === undefined) {
    return { title: tidy(stripPricing(base)), year: '', priced, tag: undefined as string | undefined };
  }

  const year = yearMatch[0].replace(/\s+/g, '').replace(/[–_]/g, '-');
  const before = tidy(stripPricing(base.slice(0, yearMatch.index)));
  const after = tidy(stripPricing(base.slice(yearMatch.index + yearMatch[0].length)));
  const title = before || after;
  return { title, year, priced, tag: (before ? after : '') || undefined };
};

// Images may be numbered ("Corner Display 2.jpg") — strip the trailing number so they pair with the catalog
const imageTitle = (fileName: string) =>
  tidy(stripPricing(stripExtension(fileName).replace(YEAR, ' '))).replace(/\s+\d{1,2}$/, '').trim();

type StorageEntry = { name: string; id: string | null };
const isRealFile = (f: StorageEntry) => Boolean(f.id) && !f.name.startsWith('.');
const isFolder = (f: StorageEntry) => !f.id && !f.name.startsWith('.');
const joinPath = (...parts: string[]) => parts.filter(Boolean).join('/');

const buildAssets = (files: { name: string; path: string; url: string }[]): ExtraAsset[] => {
  const byTitle = new Map<string, ExtraAsset>();
  const get = (title: string) => {
    const key = title.toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, { title, editions: [], images: [] });
    return byTitle.get(key)!;
  };

  files.forEach(f => {
    if (IMAGE_EXT.test(f.name)) {
      const title = imageTitle(f.name) || stripExtension(f.name);
      get(title).images.push({ name: f.name, path: f.path, url: f.url });
    } else {
      const parsed = parseFileName(f.name);
      if (!parsed.title) return;
      get(parsed.title).editions.push({
        year: parsed.year, priced: parsed.priced, tag: parsed.tag,
        fileName: f.name, path: f.path, url: f.url,
      });
    }
  });

  return Array.from(byTitle.values())
    .map(a => ({
      ...a,
      editions: a.editions.sort((x, y) => y.year.localeCompare(x.year)),
      images: a.images.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true })),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export async function loadExtrasStorage(): Promise<ExtrasStorageContent> {
  const bucket = getSupabaseClient().storage.from(EXTRAS_BUCKET);
  const publicUrl = (path: string) => bucket.getPublicUrl(path).data.publicUrl;
  const list = async (folder: string) => {
    const { data, error } = await bucket.list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return (data || []) as StorageEntry[];
  };
  const toFiles = (folder: string, entries: StorageEntry[], exclude?: (name: string) => boolean) =>
    entries
      .filter(f => isRealFile(f) && !(exclude && exclude(f.name)))
      .map(f => ({ name: f.name, path: joinPath(folder, f.name), url: publicUrl(joinPath(folder, f.name)) }));

  // Loads a section folder: direct files -> default group, sub-folders -> named groups
  const loadSection = async (folder: string, isRoot: boolean): Promise<ExtraGroup[]> => {
    const entries = await list(folder);
    const groups: ExtraGroup[] = [];
    const direct = toFiles(folder, entries, isRoot ? (n => FAMILY_CHOICE_PREFIX.test(n)) : undefined);
    if (direct.length) groups.push({ name: DEFAULT_GROUP, folder, assets: buildAssets(direct) });

    const subfolders = entries.filter(f => isFolder(f) && !(isRoot && RESERVED_ROOT_FOLDERS.has(f.name.toLowerCase())));
    const subGroups = await Promise.all(subfolders.map(async sub => {
      const subPath = joinPath(folder, sub.name);
      const files = toFiles(subPath, await list(subPath));
      return { name: sub.name, folder: subPath, assets: buildAssets(files) };
    }));
    return [...groups, ...subGroups.filter(g => g.assets.length > 0)];
  };

  const [catalogs, selectionRooms, personalization, rootEntries, roomEntries] = await Promise.all([
    loadSection(CATEGORY_FOLDERS.catalogs, true),
    loadSection(CATEGORY_FOLDERS['selection-rooms'], false),
    loadSection(CATEGORY_FOLDERS.personalization, false),
    list(''),
    list(FAMILY_CHOICE_ROOM_FOLDER),
  ]);

  const familyChoiceRoomImages = [
    ...toFiles(FAMILY_CHOICE_ROOM_FOLDER, roomEntries).filter(f => IMAGE_EXT.test(f.name)),
    ...toFiles('', rootEntries).filter(f => FAMILY_CHOICE_PREFIX.test(f.name) && IMAGE_EXT.test(f.name)),
  ].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return {
    sections: { catalogs, 'selection-rooms': selectionRooms, personalization },
    familyChoiceRoomImages,
  };
}

// Keep readable names (spaces, dashes, parentheses) but drop characters Storage rejects (e.g. ®, ™)
const safeFileName = (name: string) =>
  name.normalize('NFKD').replace(/[^\w\s.\-()&,+]/g, '').replace(/\s+/g, ' ').trim();

export async function uploadExtrasFiles(
  category: ExtraCategory,
  group: string,
  files: File[]
): Promise<{ uploaded: number; errors: string[] }> {
  const bucket = getSupabaseClient().storage.from(EXTRAS_BUCKET);
  const groupFolder = group && group !== DEFAULT_GROUP ? safeFileName(group) : '';
  const folder = joinPath(CATEGORY_FOLDERS[category], groupFolder);
  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    const path = joinPath(folder, safeFileName(file.name));
    const { error } = await bucket.upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || undefined,
    });
    if (error) errors.push(`${file.name}: ${error.message}`);
    else uploaded++;
  }
  return { uploaded, errors };
}

export async function deleteExtrasFiles(paths: string[]): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(EXTRAS_BUCKET).remove(paths);
  if (error) throw error;
}
