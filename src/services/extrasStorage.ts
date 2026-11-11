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

// "Cremation Options Catalog 2026" -> { title: "Cremation Options Catalog", year: "2026" }
// Also supports "… 2026-27", "… 2026_2027", "…-2026"
const parseTitleAndYear = (fileName: string): { title: string; year: string } | null => {
  const base = stripExtension(fileName).trim();
  const match = base.match(/^(.*?)[\s_-]+((?:19|20)\d{2}(?:\s*[-–_]\s*(?:\d{4}|\d{2}))?)$/);
  if (!match) return null;
  const title = match[1].replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const year = match[2].replace(/\s+/g, '').replace(/[–_]/g, '-');
  return title ? { title, year } : null;
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

  // Catalogs: "<Title> <Year>.<ext>" grouped by title
  const byTitle = new Map<string, CatalogDocument>();
  rootFiles
    .filter(f => !FAMILY_CHOICE_PREFIX.test(f.name))
    .forEach(f => {
      const parsed = parseTitleAndYear(f.name);
      if (!parsed) return;
      const key = parsed.title.toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, { title: parsed.title, editions: [] });
      byTitle.get(key)!.editions.push({
        year: parsed.year,
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
