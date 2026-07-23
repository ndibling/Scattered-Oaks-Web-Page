import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { extensionFor, uploadToR2, deleteFromR2 } from './r2';

describe('extensionFor', () => {
  it('maps a known MIME type to its extension', () => {
    expect(extensionFor(new File([], 'photo.heic', { type: 'image/jpeg' }))).toBe('jpg');
  });

  it('falls back to the filename extension for an unknown MIME type', () => {
    expect(extensionFor(new File([], 'clip.mkv', { type: 'video/x-matroska' }))).toBe('mkv');
  });

  it('falls back to "bin" when neither MIME type nor filename gives an extension', () => {
    expect(extensionFor(new File([], 'noextension', { type: 'application/octet-stream' }))).toBe(
      'bin',
    );
  });
});

describe('uploadToR2 / deleteFromR2', () => {
  it('uploads a file and returns a /media/-prefixed URL, then moves it to trash/ on delete', async () => {
    const key = `test/r2-lib-${crypto.randomUUID()}.jpg`;
    const url = await uploadToR2(
      env.MEDIA,
      key,
      new File([new Uint8Array([1, 2, 3])], 'x.jpg', { type: 'image/jpeg' }),
    );
    expect(url).toBe(`/media/${key}`);

    const stored = await env.MEDIA.get(key);
    expect(stored).not.toBeNull();

    await deleteFromR2(env.MEDIA, url);
    expect(await env.MEDIA.get(key)).toBeNull();

    const trashed = await env.MEDIA.get(`trash/${key}`);
    expect(trashed).not.toBeNull();
    expect(new Uint8Array(await trashed!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('deleteFromR2 no-ops for a non-R2-backed URL (e.g. a seeded /uploads/... placeholder)', async () => {
    await expect(deleteFromR2(env.MEDIA, '/uploads/Daisy.jpg')).resolves.toBeUndefined();
  });

  it('deleteFromR2 no-ops for a /media/ URL whose object no longer exists', async () => {
    await expect(
      deleteFromR2(env.MEDIA, `/media/test/does-not-exist-${crypto.randomUUID()}.jpg`),
    ).resolves.toBeUndefined();
  });
});
