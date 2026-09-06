/** Shop items available for buy/sell/inventory. */
export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  /** Resale value (usually a fraction of price). */
  sell: number;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'fishingrod', emoji: '🎣', name: 'Fishing Rod', price: 500, sell: 250, description: 'Needed to .fish effectively.' },
  { id: 'pickaxe', emoji: '⛏️', name: 'Pickaxe', price: 800, sell: 400, description: 'Needed to .mine.' },
  { id: 'rifle', emoji: '🔫', name: 'Hunting Rifle', price: 1000, sell: 500, description: 'Needed to .hunt.' },
  { id: 'laptop', emoji: '💻', name: 'Laptop', price: 3000, sell: 1500, description: 'Boosts your .work income.' },
  { id: 'lockpick', emoji: '🔓', name: 'Lockpick', price: 1500, sell: 700, description: 'Improves .rob success.' },
  { id: 'ring', emoji: '💍', name: 'Diamond Ring', price: 10000, sell: 6000, description: 'A flex item. Pure status.' },
  { id: 'car', emoji: '🚗', name: 'Sports Car', price: 25000, sell: 15000, description: 'Ultimate flex.' },
];

export function findItem(idOrName: string): ShopItem | undefined {
  const q = idOrName.toLowerCase().trim();
  return SHOP_ITEMS.find(
    (i) => i.id === q || i.name.toLowerCase() === q,
  );
}
