import { WalletList } from "@/components/master-data/WalletList";
import { CategoryList } from "@/components/master-data/CategoryList";
import { SyncSettings } from "@/components/settings/SyncSettings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col p-4 space-y-8">
      <header className="mb-2 mt-4">
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Kelola master data Anda</p>
      </header>

      <SyncSettings />
      
      <div className="border-t pt-8">
        <WalletList />
      </div>
      <div className="border-t pt-8">
        <CategoryList />
      </div>
    </div>
  );
}
