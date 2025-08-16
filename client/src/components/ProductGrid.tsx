import ProductCard from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductWithCategory, User } from "@shared/schema";

interface ProductGridProps {
  products: ProductWithCategory[];
  isLoading: boolean;
  user?: User;
}

export default function ProductGrid({ products, isLoading, user }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full h-48" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Ürün Bulunamadı</h3>
          <p className="text-gray-600">Seçtiğiniz kriterlere uygun ürün bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} user={user} />
      ))}
    </div>
  );
}
