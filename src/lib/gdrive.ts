import { exportAllData, importAllData } from "./sync-utils";

export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const BACKUP_FILE_NAME = "fintrack_backup.json";

async function findExistingBackup(accessToken: string) {
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'`, {
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
      // UPDATE existing file content
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
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

    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
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
