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
