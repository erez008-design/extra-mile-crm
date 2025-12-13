export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "לא צוין";
  
  if (price >= 1000000) {
    return `₪${(price / 1000000).toFixed(1)}M`;
  }
  
  return `₪${price.toLocaleString("he-IL")}`;
}
