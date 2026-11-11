// Extras Section Definitions
// Content for each section is loaded from the Supabase Storage bucket "extras" (see services/extrasStorage.ts):
//   Catalogs & Literature       -> bucket root
//   Selection Room Setups       -> "Selection Room Setups/" folder
//   Personalization & Memorials -> "Personalization/" folder
// Sub-folders inside a section become groups. Files sharing a name (image + catalog) are combined.

export type ExtraCategory = 'catalogs' | 'selection-rooms' | 'personalization';

export const EXTRA_CATEGORIES: { id: ExtraCategory; label: string; description: string }[] = [
  { id: 'catalogs', label: 'Catalogs & Literature', description: 'Catalogs, price guides & family brochures' },
  { id: 'selection-rooms', label: 'Selection Room Setups', description: 'Displays, signage & showroom merchandising' },
  { id: 'personalization', label: 'Personalization & Memorials', description: 'LifeSymbols, LifeStories, tributes & more' },
];
