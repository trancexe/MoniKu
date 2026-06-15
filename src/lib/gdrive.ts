import { exportAllData, importAllData } from "./sync-utils";

export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const BACKUP_FILE_NAME = "fintrack_backup.json";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

/**
 * Minta access token baru dari Google Identity Services.
 * Token langsung dikembalikan ke caller, GIS tidak menyimpan.
 * Caller wajib jaga token di scope lokal dan tidak mem-persist.
 *
 * @throws Error dengan type field untuk GIS-specific errors
 * @throws Error('GIS_TIMEOUT') jika user tidak menyelesaikan popup
 *   dalam `timeoutMs` (default 2 menit). Tanpa timeout, GIS kadang
 *   gagal callback tanpa reject — lihat catatan di bawah.
 *
 * Catatan timeout: GIS `initTokenClient` tidak menyediakan API
 * timeout native. Popup yang ditutup tanpa interaksi biasanya
 * memicu `error_callback` dengan type 'popup_closed', tetapi ada
 * edge case (network failure, GIS script gagal load setengah jalan)
 * di mana callback tidak pernah dipanggil dan promise hang selamanya.
 * Promise.race + setTimeout adalah pola standar untuk ini.
 */
const DEFAULT_OAUTH_TIMEOUT_MS = 2 * 60 * 1000; // 2 menit

export async function getFreshAccessToken(
  clientId: string,
  timeoutMs: number = DEFAULT_OAUTH_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services not loaded. Cek script tag di layout.tsx."));
      return;
    }

    if (!clientId) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured"));
      return;
    }

    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => {
        const error = new Error(
          `Google OAuth timeout setelah ${Math.round(timeoutMs / 1000)}s. Popup mungkin tertutup tanpa interaksi.`
        );
        (error as Error & { type?: string }).type = "timeout";
        reject(error);
      });
    }, timeoutMs);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.appdata",

      callback: (response: { access_token?: string }) => {
        if (response.access_token) {
          settle(() => resolve(response.access_token!));
        } else {
          settle(() => reject(new Error("No access_token in GIS response")));
        }
      },

      error_callback: (err: { message?: string; type?: string }) => {
        // err.type bisa: "popup_closed", "access_denied", "immediate_failed"
        const error = new Error(err.message || "GIS error") as Error & { type?: string };
        error.type = err.type;
        settle(() => reject(error));
      },
    });

    client.requestAccessToken();
  });
}

async function findExistingBackup(accessToken: string) {
  // Escape backslash and single-quote in the q value: Drive search
  // treats both as special characters in name='...' queries. The
  // filename is currently a hard-coded constant, but encoding it
  // here is defense-in-depth against future calls that pass
  // user-controlled filenames.
  const escapedName = BACKUP_FILE_NAME.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${escapedName}'`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!searchRes.ok) throw new Error("Failed to search existing backup");
  const searchData = await searchRes.json();
  return searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;
}

export async function uploadBackup(accessToken: string) {
  try {
    const data = await exportAllData();
    const fileContent = JSON.stringify(data);
    const fileBlob = new Blob([fileContent], { type: "application/json" });

    const existingFileId = await findExistingBackup(accessToken);

    if (existingFileId) {
      // UPDATE existing file content. fileId comes from Drive's API
      // response (opaque token) so encodeURIComponent is defensive —
      // future code paths that pass user input must not break the URL.
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=media`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: fileBlob
      });
      if (!res.ok) throw new Error("Failed to update backup");
      return await res.json();
    } else {
      // CREATE new file
      const metadata = {
        name: BACKUP_FILE_NAME,
        parents: ["appDataFolder"]
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", fileBlob);

      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: form
      });

      if (!res.ok) throw new Error("Failed to create backup");
      return await res.json();
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error("Backup error:", error);
    throw error;
  }
}

export async function downloadBackup(accessToken: string) {
  try {
    const fileId = await findExistingBackup(accessToken);
    if (!fileId) {
      throw new Error("Backup file not found in Google Drive");
    }

    // Same defense as uploadBackup: encodeURIComponent on fileId in
    // the URL path. A malformed/hostile fileId from a tampered DB or
    // a future caller would otherwise let the value break out of
    // the path segment.
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!downloadRes.ok) throw new Error("Failed to download backup");
    const backupData = await downloadRes.json();

    await importAllData(backupData);

    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error("Restore error:", error);
    throw error;
  }
}

export async function getUserEmail(accessToken: string) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email as string;
  } catch {
    return null;
  }
}
