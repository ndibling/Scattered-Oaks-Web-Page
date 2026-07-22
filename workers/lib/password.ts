// Password hashing (SDD.md §6.1): PBKDF2-SHA256, 100,000 iterations, per-user
// random salt, via the Workers runtime's native WebCrypto SubtleCrypto API —
// chosen specifically because it needs no external native/WASM dependency.

const ITERATIONS = 100_000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGORITHM },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

/** Constant-time comparison — avoids leaking hash equality via early-exit timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derive(password, saltBytes);
  return { hash, salt: toHex(saltBytes) };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const candidate = await derive(password, fromHex(salt));
  return timingSafeEqual(candidate, hash);
}

/**
 * Fixed dummy hash/salt so login can run a real PBKDF2 derivation even when
 * the submitted username doesn't exist — keeps response timing for unknown
 * usernames roughly consistent with real accounts, rather than returning
 * near-instantly and leaking which usernames exist via a timing side-channel.
 * Never a real credential; verifying against it is expected to always fail.
 */
export const DUMMY_HASH_SALT = {
  hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  salt: '00000000000000000000000000000000',
};

const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

/** Requirements.md §7.2.4: 8+ chars, 1 number, 1 lowercase, 1 uppercase, 1 special char. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!SPECIAL_CHAR_PATTERN.test(password))
    return 'Password must include at least one special character.';
  return null;
}
