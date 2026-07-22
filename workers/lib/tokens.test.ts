import { describe, it, expect } from 'vitest';
import { generateRandomToken, hashToken } from './tokens';

describe('generateRandomToken', () => {
  it('returns a 64-character hex string (256 bits)', () => {
    const token = generateRandomToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different value on every call', () => {
    expect(generateRandomToken()).not.toBe(generateRandomToken());
  });
});

describe('hashToken', () => {
  it('matches a known SHA-256 test vector', async () => {
    expect(await hashToken('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('is deterministic for the same input', async () => {
    const token = generateRandomToken();
    expect(await hashToken(token)).toBe(await hashToken(token));
  });

  it('produces different hashes for different tokens', async () => {
    const a = await hashToken('token-a');
    const b = await hashToken('token-b');
    expect(a).not.toBe(b);
  });
});
