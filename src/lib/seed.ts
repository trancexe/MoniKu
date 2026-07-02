import { db } from "./db";

export async function seedDatabase() {
  const categoriesCount = await db.categories.count();
  const walletsCount = await db.wallets.count();

  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'income', name: 'Gaji', icon: 'Briefcase' },
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'income', name: 'Bonus', icon: 'Gift' },
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'expense', name: 'Makan', icon: 'Utensils' },
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'expense', name: 'Transport', icon: 'Car' },
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'expense', name: 'Belanja', icon: 'ShoppingCart' },
      { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)), type: 'expense', name: 'Tagihan', icon: 'FileText' },
    ]);
  }

  if (walletsCount === 0) {
    await db.wallets.add({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
      name: 'Dompet Tunai',
      icon: 'Wallet',
      current_balance: 0,
      updated_at: Date.now(),
    });
  }

  // Ensure system categories exist (for debt, repayment, and transfer)
  const systemCategories = [
    { id: 'system-debt-creation', type: 'expense' as const, name: 'Hutang / Piutang', icon: 'Handshake' },
    { id: 'system-repayment', type: 'income' as const, name: 'Pelunasan', icon: 'CheckCircle' },
    { id: 'system-transfer', type: 'expense' as const, name: 'Transfer', icon: 'ArrowsLeftRight' }
  ];

  for (const sysCat of systemCategories) {
    const exists = await db.categories.get(sysCat.id);
    if (!exists) {
      await db.categories.add(sysCat);
    }
  }
}
