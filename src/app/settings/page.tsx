import { WalletList } from "@/components/master-data/WalletList";
import { CategoryList } from "@/components/master-data/CategoryList";
import { SyncSettings } from "@/components/settings/SyncSettings";
import { ThemeSettings } from "@/components/settings/ThemeSettings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col p-4 space-y-8">
      <header className="py-6">
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola aplikasi dan master data Anda</p>
      </header>

      <ThemeSettings />

      <div className="border-t pt-8">
        <SyncSettings />
      </div>
      
      <div className="border-t pt-8">
        <WalletList />
      </div>
      <div className="border-t pt-8">
        <CategoryList />
      </div>
    </div>
  );
}
