export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "לא צוין";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(price);
};
