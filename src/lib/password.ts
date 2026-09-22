/**
 * Password hashing for the local-only auth model.
 *
 * IMPORTANT: this is NOT equivalent to the original backend's BCrypt + server-side JWT auth.
 * There is no server here to keep secrets on, so this can only ever protect against someone
 * casually opening the app on a shared device — not a determined attacker with access to the
 * browser's storage. See README "Security model" for details.
 *
 * Uses PBKDF2-SHA256 (native Web Crypto, no extra dependency) with a random salt per user.
 */

const ITERATIONS = 150_000;

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveBits(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
}

/** Returns a stored hash string in the form "pbkdf2$<saltB64>$<hashB64>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return `pbkdf2$${bufToBase64(salt.buffer)}$${bufToBase64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const salt = base64ToBuf(parts[1]);
  const expected = parts[2];
  const bits = await deriveBits(password, salt);
  return bufToBase64(bits) === expected;
}
