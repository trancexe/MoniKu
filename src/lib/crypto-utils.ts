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

export async function verifyPin(pin: string, saltHex: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, saltHex);
  return hash === storedHash;
}
