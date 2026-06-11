import { db } from "./db";

export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const BACKUP_FILE_NAME = "fintrack_backup.json";

// We use appDataFolder so it's isolated and hidden from user's main drive
export async function uploadBackup(accessToken: string) {
  try {
    // 1. Export Data from Dexie
    const data = {
      wallets: await db.wallets.toArray(),
      categories: await db.categories.toArray(),
      transactions: await db.transactions.toArray(),
      debt_loans: await db.debt_loans.toArray(),
      exportDate: Date.now()
    };
    const jsonStr = JSON.stringify(data);
    const file = new Blob([jsonStr], { type: "application/json" });

    // 2. Upload to Google Drive (appDataFolder)
    const metadata = {
      name: BACKUP_FILE_NAME,
      parents: ["appDataFolder"]
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });

    if (!res.ok) throw new Error("Failed to upload backup");
    return await res.json();
  } catch (error) {
    console.error("Backup error:", error);
    throw error;
  }
}

export async function downloadBackup(accessToken: string) {
  try {
    // 1. Find file in appDataFolder
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}'`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const searchData = await searchRes.json();
    
    if (!searchData.files || searchData.files.length === 0) {
      throw new Error("Backup file not found in Google Drive");
    }

    const fileId = searchData.files[0].id;

    // 2. Download file content
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!downloadRes.ok) throw new Error("Failed to download backup");
    const backupData = await downloadRes.json();

    // 3. Restore to Dexie
    await db.transaction('rw', db.wallets, db.categories, db.transactions, db.debt_loans, async () => {
      await db.wallets.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.debt_loans.clear();

      if (backupData.wallets) await db.wallets.bulkAdd(backupData.wallets);
      if (backupData.categories) await db.categories.bulkAdd(backupData.categories);
      if (backupData.transactions) await db.transactions.bulkAdd(backupData.transactions);
      if (backupData.debt_loans) await db.debt_loans.bulkAdd(backupData.debt_loans);
    });

    return true;
  } catch (error) {
    console.error("Restore error:", error);
    throw error;
  }
}
