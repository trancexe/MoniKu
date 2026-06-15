export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  // Convert hex string salt back to Uint8Array safely
  const saltMatch = saltHex.match(/.{1,2}/g);
  const saltData = new Uint8Array(saltMatch ? saltMatch.map(byte => parseInt(byte, 16)) : []);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Constant-time string comparison. Prevents timing side-channel attacks
 * by always touching every character regardless of where the first
 * mismatch occurs. Both inputs must be of equal length.
 *
 * Use for comparing any secret-derived value (PIN hash, token, etc).
 * Do NOT use for general string equality — the early-exit behaviour of
 * `===` is faster and just as safe for non-secret comparisons.
 */
function constantTimeEqual(a: string, b: string): boolean {
  // Length check itself can leak length, but the lengths of PIN hashes
  // and salts are public (fixed 64/32 hex chars), so this is safe.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPin(pin: string, saltHex: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, saltHex);
  return constantTimeEqual(hash, storedHash);
}
