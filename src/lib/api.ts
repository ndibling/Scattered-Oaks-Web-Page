import type { Animal, AnimalDetail, GalleryPhoto, SiteContent, SiteSettings } from './types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} responded ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  animals: () => getJson<Animal[]>('/api/animals'),
  animal: (id: string) => getJson<AnimalDetail>(`/api/animals/${id}`),
  gallery: () => getJson<GalleryPhoto[]>('/api/gallery'),
  content: () => getJson<SiteContent>('/api/content'),
  settings: () => getJson<SiteSettings>('/api/settings'),
};
