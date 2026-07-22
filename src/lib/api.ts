import type {
  Animal,
  AnimalDetail,
  AnimalInput,
  AnimalMedia,
  GalleryPhoto,
  GalleryPhotoInput,
  SiteContent,
  SiteSettings,
  AuthedAdmin,
  AdminUser,
  AdminUserInput,
  AuditLogPage,
} from './types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} responded ${res.status}`);
  return res.json() as Promise<T>;
}

async function sendJson<T>(method: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `${path} responded ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method, body: form });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `${path} responded ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `${path} responded ${res.status}`);
  }
}

export const api = {
  // Public (M3/M4)
  animals: () => getJson<Animal[]>('/api/animals'),
  animal: (id: string) => getJson<AnimalDetail>(`/api/animals/${id}`),
  gallery: () => getJson<GalleryPhoto[]>('/api/gallery'),
  content: () => getJson<SiteContent>('/api/content'),
  settings: () => getJson<SiteSettings>('/api/settings'),
  contact: (body: {
    name: string;
    email: string;
    message: string;
    animalId?: string;
    turnstileToken: string;
  }) => sendJson<{ success: true }>('POST', '/api/contact', body),

  // Auth (M5/M6) — session is a same-origin cookie, sent automatically; no
  // client-side token handling needed.
  me: () => getJson<AuthedAdmin>('/api/auth/me'),
  login: (username: string, password: string) =>
    sendJson<{ success: true; forcePasswordChange: boolean }>('POST', '/api/auth/login', {
      username,
      password,
    }),
  logout: () => sendJson<{ success: true }>('POST', '/api/auth/logout', {}),
  changePassword: (currentPassword: string, newPassword: string) =>
    sendJson<{ success: true }>('POST', '/api/auth/change-password', {
      currentPassword,
      newPassword,
    }),
  requestPasswordReset: (email: string) =>
    sendJson<{ message: string }>('POST', '/api/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    sendJson<{ success: true }>('POST', '/api/auth/reset-password', { token, newPassword }),

  // Admin — animals
  createAnimal: (body: AnimalInput) => sendJson<Animal>('POST', '/api/admin/animals', body),
  updateAnimal: (id: string, body: AnimalInput) =>
    sendJson<Animal>('PUT', `/api/admin/animals/${id}`, body),
  deleteAnimal: (id: string) => del(`/api/admin/animals/${id}`),
  reorderAnimals: (order: string[]) =>
    sendJson<{ success: true }>('PUT', '/api/admin/animals/reorder', { order }),
  uploadAnimalMedia: (id: string, form: FormData) =>
    sendForm<AnimalMedia>('POST', `/api/admin/animals/${id}/media`, form),
  deleteAnimalMedia: (id: string, mediaId: string) =>
    del(`/api/admin/animals/${id}/media/${mediaId}`),

  // Admin — gallery
  createGalleryPhoto: (form: FormData) =>
    sendForm<GalleryPhoto>('POST', '/api/admin/gallery', form),
  updateGalleryPhoto: (id: string, body: GalleryPhotoInput) =>
    sendJson<GalleryPhoto>('PUT', `/api/admin/gallery/${id}`, body),
  deleteGalleryPhoto: (id: string) => del(`/api/admin/gallery/${id}`),
  reorderGalleryPhotos: (order: string[]) =>
    sendJson<{ success: true }>('PUT', '/api/admin/gallery/reorder', { order }),

  // Admin — content
  updateContent: (key: string, value: string) =>
    sendJson<{ key: string; value: string }>('PUT', `/api/admin/content/${key}`, { value }),
  updateContentImage: (key: string, form: FormData) =>
    sendForm<{ key: string; value: string }>('PUT', `/api/admin/content/${key}`, form),

  // Admin — settings
  updateSettings: (body: Partial<SiteSettings>) =>
    sendJson<SiteSettings>('PUT', '/api/admin/settings', body),

  // Admin — users
  listAdminUsers: () => getJson<AdminUser[]>('/api/admin/users'),
  createAdminUser: (body: AdminUserInput) => sendJson<AdminUser>('POST', '/api/admin/users', body),
  updateAdminUser: (id: string, body: Partial<AdminUserInput> & { newPassword?: string }) =>
    sendJson<AdminUser>('PUT', `/api/admin/users/${id}`, body),
  deleteAdminUser: (id: string) => del(`/api/admin/users/${id}`),

  // Admin — audit
  audit: (limit = 50, offset = 0) =>
    getJson<AuditLogPage>(`/api/admin/audit?limit=${limit}&offset=${offset}`),
};
