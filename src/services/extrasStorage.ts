import { getSupabaseClient } from './supabase';

// Supabase Storage bucket that holds Extras content (catalog PDFs, room photos, etc.)
export const EXTRAS_BUCKET = 'extras';

// Family Choice Room photos: either inside this folder in the bucket,
// or at the bucket root with a name starting with "Family Choice(s)"
// (e.g. "Family Choices Physical Showroom 1.png" or "Family Choice Room 1.jpg")
export const FAMILY_CHOICE_ROOM_FOLDER = 'Family Choice Room';
const FAMILY_CHOICE_PREFIX = /^family[\s_-]*choices?\b/i;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

export interface CatalogEdition {
  year: string;
  priced: boolean;      // file name contains "with Prices" / "with Pricing"
  tag?: string;         // extra label after the year, e.g. "AMP" in "Batesville Price List 2027 AMP"
  fileName: string;
  url: string;
  isImage: boolean;
}

export interface CatalogDocument {
  title: string;
  editions: CatalogEdition[]; // newest first
}

export interface ExtrasStorageContent {
  catalogs: CatalogDocument[];
  familyChoiceRoomImages: { name: string; url: string }[];
}

const stripExtension = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '');

const WITH_PRICES = /\b(?:with|w\/?)\s*(?:prices?|pricing)\b|\bpriced\b/i;
const WITHOUT_PRICES = /\b(?:without|w\/o|no)\s*(?:prices?|pricing)\b|\bunpriced\b/i;
const YEAR = /(?:19|20)\d{2}(?:\s*[-–_]\s*(?:20\d{2}|\d{2}))?/g;

const tidy = (s: string) => s.replace(/[_]+/g, ' ').replace(/\s*[-–]\s*$/, '').replace(/^\s*[-–]\s*/, '').replace(/\s+/g, ' ').trim();

// Parses catalog file names (extension ignored):
//   "Cremation Options Catalog 2027"             -> title "Cremation Options Catalog", year 2027
//   "Cremation Options Catalog with Prices 2027" -> same title, priced
//   "Batesville Price List 2027 AMP"             -> title "Batesville Price List", year 2027, tag "AMP"
//   Years may also be written "2026-27" or "2026_2027".
const parseCatalogName = (fileName: string): Omit<CatalogEdition, 'fileName' | 'url' | 'isImage'> & { title: string } | null => {
  let base = stripExtension(fileName).trim();

  const yearMatches = Array.from(base.matchAll(YEAR));
  const yearMatch = yearMatches[yearMatches.length - 1];
  if (!yearMatch || yearMatch.index === undefined) return null;

  const year = yearMatch[0].replace(/\s+/g, '').replace(/[–_]/g, '-');
  let before = base.slice(0, yearMatch.index);
  let after = base.slice(yearMatch.index + yearMatch[0].length);

  const priced = WITH_PRICES.test(base) && !WITHOUT_PRICES.test(base);
  const stripPricing = (s: string) => s.replace(WITHOUT_PRICES, ' ').replace(WITH_PRICES, ' ');
  before = tidy(stripPricing(before));
  after = tidy(stripPricing(after));

  const title = before || after;
  const tag = before ? after : '';
  if (!title) return null;
  return { title, year, priced, tag: tag || undefined };
};

const isRealFile = (f: { name: string; id: string | null }) =>
  Boolean(f.id) && !f.name.startsWith('.');

export async function loadExtrasStorage(): Promise<ExtrasStorageContent> {
  const client = getSupabaseClient();
  const bucket = client.storage.from(EXTRAS_BUCKET);
  const publicUrl = (path: string) => bucket.getPublicUrl(path).data.publicUrl;

  const [rootRes, roomRes] = await Promise.all([
    bucket.list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
    bucket.list(FAMILY_CHOICE_ROOM_FOLDER, { limit: 100, sortBy: { column: 'name', order: 'asc' } }),
  ]);

  if (rootRes.error) throw rootRes.error;

  const rootFiles = (rootRes.data || []).filter(isRealFile);

  // Family Choice Room images
  const familyChoiceRoomImages = [
    ...(roomRes.data || [])
      .filter(f => isRealFile(f) && IMAGE_EXT.test(f.name))
      .map(f => ({ name: f.name, url: publicUrl(`${FAMILY_CHOICE_ROOM_FOLDER}/${f.name}`) })),
    ...rootFiles
      .filter(f => FAMILY_CHOICE_PREFIX.test(f.name) && IMAGE_EXT.test(f.name))
      .map(f => ({ name: f.name, url: publicUrl(f.name) })),
  ].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Catalogs: "<Title> [with Prices] <Year> [Tag].<ext>" grouped by title
  const byTitle = new Map<string, CatalogDocument>();
  rootFiles
    .filter(f => !FAMILY_CHOICE_PREFIX.test(f.name))
    .forEach(f => {
      const parsed = parseCatalogName(f.name);
      if (!parsed) return;
      const key = parsed.title.toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, { title: parsed.title, editions: [] });
      byTitle.get(key)!.editions.push({
        year: parsed.year,
        priced: parsed.priced,
        tag: parsed.tag,
        fileName: f.name,
        url: publicUrl(f.name),
        isImage: IMAGE_EXT.test(f.name),
      });
    });

  const catalogs = Array.from(byTitle.values())
    .map(doc => ({ ...doc, editions: doc.editions.sort((a, b) => b.year.localeCompare(a.year)) }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return { catalogs, familyChoiceRoomImages };
}
