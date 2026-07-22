import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordPolicy, DUMMY_HASH_SALT } from './password';

describe('hashPassword / verifyPassword', () => {
  it('produces a hash that verifies against the original password', async () => {
    const { hash, salt } = await hashPassword('Correct-Horse1!');
    expect(await verifyPassword('Correct-Horse1!', hash, salt)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const { hash, salt } = await hashPassword('Correct-Horse1!');
    expect(await verifyPassword('Wrong-Password1!', hash, salt)).toBe(false);
  });

  it('uses a fresh random salt each time, even for the same password', async () => {
    const a = await hashPassword('SamePassword1!');
    const b = await hashPassword('SamePassword1!');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('always fails against the fixed dummy hash/salt', async () => {
    expect(
      await verifyPassword('anything at all', DUMMY_HASH_SALT.hash, DUMMY_HASH_SALT.salt),
    ).toBe(false);
    expect(await verifyPassword('', DUMMY_HASH_SALT.hash, DUMMY_HASH_SALT.salt)).toBe(false);
  });
});

describe('validatePasswordPolicy', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordPolicy('Abcdefg1!')).toBeNull();
  });

  it.each([
    ['Ab1!', 'at least 8 characters'],
    ['abcdefgh1!', 'one uppercase letter'],
    ['ABCDEFGH1!', 'one lowercase letter'],
    ['Abcdefghi!', 'one number'],
    ['Abcdefgh1', 'one special character'],
  ])('rejects %j with a message about %s', (password, expectedFragment) => {
    const error = validatePasswordPolicy(password);
    expect(error).not.toBeNull();
    expect(error).toContain(expectedFragment);
  });
});
