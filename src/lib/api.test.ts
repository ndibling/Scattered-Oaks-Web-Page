import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from './api';

// Tests the 4 shared fetch primitives (getJson/sendJson/sendForm/del) via
// one representative api.* call each, rather than every one-line wrapper
// method individually — the wrappers are pure pass-throughs with no logic
// of their own to verify.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getJson (via api.animals)', () => {
  it('returns the parsed JSON body on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'daisy' }]), { status: 200 })),
    );
    await expect(api.animals()).resolves.toEqual([{ id: 'daisy' }]);
  });

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(api.animals()).rejects.toThrow('responded 500');
  });
});

describe('sendJson (via api.login)', () => {
  it('sends a POST with a JSON body and returns the parsed response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, forcePasswordChange: false }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await api.login('Root', 'password');
    expect(result).toEqual({ success: true, forcePasswordChange: false });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ username: 'Root', password: 'password' });
  });

  it('throws the server-provided error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Invalid username or password.' }), { status: 401 }),
        ),
    );
    await expect(api.login('Root', 'wrong')).rejects.toThrow('Invalid username or password.');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 500 })));
    await expect(api.login('Root', 'wrong')).rejects.toThrow('responded 500');
  });
});

describe('sendForm (via api.uploadAnimalMedia)', () => {
  it('sends a POST with the FormData body untouched', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'media-1' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    const form = new FormData();
    form.set('media_type', 'image');
    await api.uploadAnimalMedia('daisy', form);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/admin/animals/daisy/media');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
  });
});

describe('del (via api.deleteAnimal)', () => {
  it('sends a DELETE and resolves with no value on success', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(api.deleteAnimal('daisy')).resolves.toBeUndefined();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/admin/animals/daisy');
    expect(init.method).toBe('DELETE');
  });

  it('throws on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Animal not found' }), { status: 404 }),
        ),
    );
    await expect(api.deleteAnimal('missing')).rejects.toThrow('Animal not found');
  });
});

// The remaining api.* methods are all one-line pass-throughs to the 4
// primitives already tested above with no logic of their own — this table
// just confirms each one calls the right URL/method (would catch a typo'd
// path), not re-deriving getJson/sendJson/sendForm/del's behavior again.
describe('remaining api.* wrapper methods hit the expected URL/method', () => {
  const ok = () => new Response(JSON.stringify({}), { status: 200 });
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ['animal', () => api.animal('daisy'), '/api/animals/daisy', 'GET'],
    ['gallery', () => api.gallery(), '/api/gallery', 'GET'],
    ['content', () => api.content(), '/api/content', 'GET'],
    ['settings', () => api.settings(), '/api/settings', 'GET'],
    [
      'contact',
      () => api.contact({ name: 'A', email: 'a@example.com', message: 'hi', turnstileToken: 't' }),
      '/api/contact',
      'POST',
    ],
    ['me', () => api.me(), '/api/auth/me', 'GET'],
    ['logout', () => api.logout(), '/api/auth/logout', 'POST'],
    ['changePassword', () => api.changePassword('old', 'new'), '/api/auth/change-password', 'POST'],
    [
      'requestPasswordReset',
      () => api.requestPasswordReset('a@example.com'),
      '/api/auth/forgot-password',
      'POST',
    ],
    ['resetPassword', () => api.resetPassword('tok', 'new'), '/api/auth/reset-password', 'POST'],
    [
      'createAnimal',
      () => api.createAnimal({ name: 'A', type: 'Cow', sex: 'Cow', status: 'for-sale' }),
      '/api/admin/animals',
      'POST',
    ],
    [
      'updateAnimal',
      () => api.updateAnimal('daisy', { name: 'A', type: 'Cow', sex: 'Cow', status: 'for-sale' }),
      '/api/admin/animals/daisy',
      'PUT',
    ],
    ['reorderAnimals', () => api.reorderAnimals(['a', 'b']), '/api/admin/animals/reorder', 'PUT'],
    [
      'deleteAnimalMedia',
      () => api.deleteAnimalMedia('daisy', 'm1'),
      '/api/admin/animals/daisy/media/m1',
      'DELETE',
    ],
    [
      'createGalleryPhoto',
      () => api.createGalleryPhoto(new FormData()),
      '/api/admin/gallery',
      'POST',
    ],
    [
      'updateGalleryPhoto',
      () => api.updateGalleryPhoto('g1', { label: 'A' }),
      '/api/admin/gallery/g1',
      'PUT',
    ],
    ['deleteGalleryPhoto', () => api.deleteGalleryPhoto('g1'), '/api/admin/gallery/g1', 'DELETE'],
    [
      'reorderGalleryPhotos',
      () => api.reorderGalleryPhotos(['g1', 'g2']),
      '/api/admin/gallery/reorder',
      'PUT',
    ],
    [
      'updateContent',
      () => api.updateContent('hero.headline', 'X'),
      '/api/admin/content/hero.headline',
      'PUT',
    ],
    [
      'updateContentImage',
      () => api.updateContentImage('hero.photo_url', new FormData()),
      '/api/admin/content/hero.photo_url',
      'PUT',
    ],
    [
      'updateSettings',
      () => api.updateSettings({ showPublicPrices: true }),
      '/api/admin/settings',
      'PUT',
    ],
    ['listAdminUsers', () => api.listAdminUsers(), '/api/admin/users', 'GET'],
    [
      'createAdminUser',
      () => api.createAdminUser({ username: 'a', email: 'a@example.com', role: 'admin' }),
      '/api/admin/users',
      'POST',
    ],
    [
      'updateAdminUser',
      () => api.updateAdminUser('u1', { email: 'b@example.com' }),
      '/api/admin/users/u1',
      'PUT',
    ],
    ['deleteAdminUser', () => api.deleteAdminUser('u1'), '/api/admin/users/u1', 'DELETE'],
    ['audit', () => api.audit(10, 5), '/api/admin/audit?limit=10&offset=5', 'GET'],
  ];

  for (const [name, call, expectedUrl, expectedMethod] of cases) {
    it(name, async () => {
      const fetchSpy = vi.fn().mockResolvedValue(ok());
      vi.stubGlobal('fetch', fetchSpy);
      await call();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(expectedUrl);
      expect((init as RequestInit | undefined)?.method ?? 'GET').toBe(expectedMethod);
    });
  }
});
