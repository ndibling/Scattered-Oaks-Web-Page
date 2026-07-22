// Frontend-side shapes matching the public API responses (workers/routes/*.ts).
// Kept separate from the Worker's own types since client and server code
// never share a module graph — these just need to describe the same JSON.

export type AnimalStatus = 'for-sale' | 'pending' | 'coming-soon' | 'not-for-sale';

export type AnimalMedia = {
  id: string;
  animal_id: string;
  media_type: 'image' | 'video';
  url: string;
  display_order: number;
};

export type Animal = {
  id: string;
  name: string;
  registered_name: string | null;
  type: string;
  sex: string;
  age_text: string | null;
  status: AnimalStatus;
  price_cents: number | null;
  description: string | null;
  imza_number: string | null;
  expected_height: string | null;
  sire_registered_name: string | null;
  dam_registered_name: string | null;
  display_order: number;
  /** First ordered media row's URL, present on list responses only. */
  primary_image_url: string | null;
};

export type AnimalDetail = Animal & { media: AnimalMedia[] };

export type GalleryPhoto = {
  id: string;
  url: string;
  label: string;
  description: string | null;
  display_order: number;
};

export type SiteContent = Record<string, string>;

export type SiteSettings = {
  showPublicPrices: boolean;
  galleryStyle: 'grid' | 'mosaic';
};

export const FILTER_TABS = [
  { key: 'for-sale', label: 'For Sale' },
  { key: 'pending', label: 'Pending' },
  { key: 'coming-soon', label: 'Coming Soon' },
  { key: 'not-for-sale', label: 'Not For Sale' },
  { key: 'all', label: 'View All' },
] as const;

export type FilterKey = (typeof FILTER_TABS)[number]['key'];

export const STATUS_BADGE: Record<AnimalStatus, { label: string }> = {
  'for-sale': { label: 'For Sale' },
  pending: { label: 'Sale Pending' },
  'coming-soon': { label: 'Coming Soon' },
  'not-for-sale': { label: 'Not For Sale' },
};

export function formatPrice(priceCents: number | null, showPublicPrices: boolean): string {
  if (priceCents === null) return '';
  return showPublicPrices ? `$${(priceCents / 100).toLocaleString()}` : 'Inquire';
}
