export const VENDOR_CATEGORY_OPTIONS = [
  { value: 'Coconut', label: '🥥 Coconut' },
  { value: 'Coffee', label: '☕ Coffee' },
  { value: 'Ice Cream', label: '🍦 Ice Cream' },
  { value: 'Dessert', label: '🍰 Dessert' },
  { value: 'Juice & Smoothies', label: '🍹 Juice & Smoothies' },
  { value: 'Snacks', label: '🍟 Snacks' },
  { value: 'Food Trucks', label: '🚚 Food Trucks' },
  { value: 'Market Stalls', label: '🛍️ Market Stalls' },
  { value: 'Street Food', label: '🌮 Street Food' },
  { value: 'Bakery', label: '🥐 Bakery' },
  { value: 'Handmade Jewelry', label: '📿 Handmade Jewelry' },
  { value: 'Beads & Accessories', label: '🧿 Beads & Accessories' },
  { value: 'Hair Braiding', label: '🪮 Hair Braiding' },
  { value: 'Beauty & Self Care', label: '💄 Beauty & Self Care' },
  { value: 'Crafts', label: '🧵 Crafts' },
  { value: 'Souvenirs', label: '🎁 Souvenirs' },
  { value: 'Beachwear', label: '🩴 Beachwear' },
  { value: 'Clothing & Fashion', label: '👗 Clothing & Fashion' },
] as const;

export type VendorCategoryValue = (typeof VENDOR_CATEGORY_OPTIONS)[number]['value'];

export function getVendorCategoryLabel(value: string) {
  const exactMatch = VENDOR_CATEGORY_OPTIONS.find((option) => option.value === value.trim());
  return exactMatch?.label ?? value;
}
