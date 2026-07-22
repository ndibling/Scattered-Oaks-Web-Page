// Random tokens for sessions and password resets (SDD.md §6.2 step 5,
// §6.3 step 2): a cryptographically random 256-bit token is handed to the
// client (as a cookie, or embedded in a reset link); only its SHA-256 hash
// is ever stored in D1, so a stolen database dump can't be used to log in.

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRandomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}
