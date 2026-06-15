/**
 * SECURITY MODEL & LIMITATIONS
 * =============================
 * MoniKu is a local-first PWA. There is no server. The biometric
 * verification here is a UX shortcut — TouchID / FaceID / Windows
 * Hello as a faster path than typing the 4-digit PIN. It is NOT
 * cryptographic authentication in the WebAuthn-as-second-factor
 * sense.
 *
 * Specifically, this implementation does NOT:
 *
 *   1. Persist a credential public key. The credentialId returned by
 *      \`registerBiometric\` is stored verbatim in IndexedDB, but the
 *      server-side equivalent of a relying-party public key is
 *      nowhere. If an attacker writes a forged credentialId into
 *      IndexedDB, \`verifyBiometric\` will call \`navigator.credentials
 *      .get\` with that id, and the platform authenticator's check
 *      will fail (because the credential was never created on this
 *      device) — so a forged id cannot bypass the lock. But there is
 *      also no signature verification of any returned assertion,
 *      because the assertion is only used as a boolean (present or
 *      not).
 *
 *   2. Verify the challenge cryptographically. \`getRandomValues(32)\`
 *      produces a fresh 256-bit challenge each call, but the
 *      returned assertion is discarded — we just check
 *      \`!!assertion\`. A real WebAuthn relying party would parse
 *      \`assertion.response\` (authenticatorData, clientDataJSON,
 *      signature) and verify the signature against the stored
 *      public key. None of that happens here.
 *
 *   3. Bind the credential to the device's secure enclave. We rely
 *      on \`authenticatorAttachment: 'platform'\` to *prefer* the
 *      built-in authenticator, but a determined attacker with
 *      physical access could enroll an external authenticator and
 *      substitute its credentialId.
 *
 * What this gives us:
 *
 *   - The PIN is still the only thing protecting the data, and the
 *     PIN is checked via constant-time PBKDF2 (see
 *     lib/crypto-utils.ts). Biometric is purely a convenience.
 *   - Removing the biometric path does not weaken the app — set
 *     \`isBiometricEnabled = false\` in the auth store and the
 *     AppLock falls back to PIN.
 *
 * What would a real fix look like:
 *
 *   - Persist the credential's public key alongside credentialId in
 *     the 'security' IndexedDB table.
 *   - On \`verifyBiometric\`, parse \`assertion.response\` and verify
 *     the ECDSA / RS256 signature against the stored public key,
 *     and verify the challenge matches one we issued (mitigates
 *     replay).
 *   - Bind the credential to a stable per-install identifier so it
 *     cannot be transferred across devices.
 *
 *   All three require a server or a hardware secure element to
 *   anchor trust, and MoniKu has neither. This is a known,
 *   documented limitation — not a bug. If a future architecture
 *   adds a server, the verifyBiometric implementation here is the
 *   spot to upgrade.
 */

export async function registerBiometric(): Promise<string | null> {
  if (!window.PublicKeyCredential) {
    return null;
  }
  
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "MoniKu",
        },
        user: {
          id: userId,
          name: "moniku-user",
          displayName: "MoniKu User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Platform authenticator like TouchID/FaceID
          userVerification: "required",
        },
        timeout: 60000,
      }
    }) as PublicKeyCredential;

    if (credential) {
      return credential.id;
    }
    return null;
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return null;
  }
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Convert base64url credentialId to Uint8Array
    let base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - base64.length % 4) % 4;
    base64 += '='.repeat(padLen);
    const raw = atob(base64);
    const idBuffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      idBuffer[i] = raw.charCodeAt(i);
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: idBuffer,
          type: "public-key",
        }],
        userVerification: "required",
      }
    });

    return !!assertion;
  } catch (error) {
    console.error("Biometric verification failed:", error);
    return false;
  }
}
