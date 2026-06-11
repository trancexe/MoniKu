import { db } from "./db";

export async function seedDatabase() {
  const categoriesCount = await db.categories.count();
  const walletsCount = await db.wallets.count();

  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), type: 'income', name: 'Gaji', icon: 'Briefcase' },
      { id: crypto.randomUUID(), type: 'income', name: 'Bonus', icon: 'Gift' },
      { id: crypto.randomUUID(), type: 'expense', name: 'Makan', icon: 'Utensils' },
      { id: crypto.randomUUID(), type: 'expense', name: 'Transport', icon: 'Car' },
      { id: crypto.randomUUID(), type: 'expense', name: 'Belanja', icon: 'ShoppingCart' },
      { id: crypto.randomUUID(), type: 'expense', name: 'Tagihan', icon: 'FileText' },
    ]);
  }

  if (walletsCount === 0) {
    await db.wallets.add({
      id: crypto.randomUUID(),
      name: 'Dompet Tunai',
      icon: 'Wallet',
      current_balance: 0,
      updated_at: Date.now(),
    });
  }
}
