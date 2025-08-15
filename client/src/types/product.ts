export interface ProductFilters {
  categoryId?: string;
  search?: string;
  sortBy?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductSortOption {
  value: string;
  label: string;
}

export const SORT_OPTIONS: ProductSortOption[] = [
  { value: "recommended", label: "Önerilen Sıralama" },
  { value: "newest", label: "Yeniden > Eskiye" },
  { value: "oldest", label: "Eskiden > Yeniye" },
  { value: "price_asc", label: "Ucuzdan > Pahalıya" },
  { value: "price_desc", label: "Pahalıdan > Ucuza" },
  { value: "popular", label: "En Çok Satılanlar" },
  { value: "rating", label: "En Yüksek Puanlı" },
];

export const PRICE_RANGES = [
  { min: 0, max: 5000, label: "0 - 5,000 TL" },
  { min: 5000, max: 15000, label: "5,000 - 15,000 TL" },
  { min: 15000, max: Infinity, label: "15,000 TL üzeri" },
];
