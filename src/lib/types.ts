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

// [ADDED] 2026-07-22 (M6) — admin-facing shapes, matching the field names
// (snake_case, matching DB columns) that workers/routes/admin*.ts return.

export type AnimalInput = {
  name: string;
  registered_name?: string | null;
  type: string;
  sex: string;
  age_text?: string | null;
  status: AnimalStatus;
  price_cents?: number | null;
  description?: string | null;
  imza_number?: string | null;
  expected_height?: string | null;
  sire_registered_name?: string | null;
  dam_registered_name?: string | null;
  display_order?: number;
};

export type GalleryPhotoInput = {
  label: string;
  description?: string | null;
  display_order?: number;
};

export type AuthedAdmin = {
  id: string;
  username: string;
  role: 'root' | 'admin';
  forcePasswordChange: boolean;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: 'root' | 'admin';
  force_password_change: number;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  last_login_at: string | null;
};

export type AdminUserInput = {
  username: string;
  email: string;
  role: 'root' | 'admin';
};

export type AuditLogEntry = {
  id: string;
  admin_id: string | null;
  admin_username: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

export type AuditLogPage = {
  results: AuditLogEntry[];
  hasMore: boolean;
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
