import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import type { ProductWithCategory, User } from "@shared/schema";

// Turkish educational/study images from Unsplash
const productImages = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // students studying
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // books on desk
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // school supplies
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // teenagers studying
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // textbooks
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // students with notebooks
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // books on table
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300", // educational materials
];

interface ProductCardProps {
  product: ProductWithCategory;
  user?: User;
}

export default function ProductCard({ product, user }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const imageUrl = product.imageUrl || productImages[Math.floor(Math.random() * productImages.length)];
  const discountPercentage = product.discountPercentage || 0;
  const originalPrice = parseFloat(product.originalPrice || product.price);
  const currentPrice = parseFloat(product.price);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cart", {
        productId: product.id,
        quantity: 1,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sepete Eklendi",
        description: `${product.name} sepetinize eklendi.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Giriş Gerekli",
          description: "Sepete ürün eklemek için giriş yapmalısınız.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      // Try to get error message from response
      let errorMessage = "Ürün sepete eklenirken bir hata oluştu.";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Sepete ürün eklemek için giriş yapmalısınız.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    // Check if product is in stock
    if (!product.stock || product.stock <= 0) {
      toast({
        title: "Stokta Yok",
        description: "Bu ürün şu anda stokta bulunmamaktadır.",
        variant: "destructive",
      });
      return;
    }

    addToCartMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className="relative cursor-pointer">
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-48 object-cover"
          />
          {discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-accent text-white px-2 py-1 rounded-md text-sm font-bold">
              %{discountPercentage} İndirim
            </div>
          )}
          {product.hasCoaching && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium">
              DENEME + KOÇLUK
            </div>
          )}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fas fa-eye text-primary"></i>
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors" data-testid={`text-product-title-${product.id}`}>
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {discountPercentage > 0 && (
              <span className="text-gray-500 line-through text-sm" data-testid={`text-original-price-${product.id}`}>
                {originalPrice.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} TL
              </span>
            )}
            <span className="text-xl font-bold text-primary" data-testid={`text-price-${product.id}`}>
              {currentPrice.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })} TL
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex text-yellow-400">
            {Array.from({ length: 5 }).map((_, index) => {
              const rating = parseFloat(product.rating || "0");
              return (
                <i 
                  key={index}
                  className={`text-sm ${
                    index < Math.floor(rating) 
                      ? "fas fa-star" 
                      : index < rating 
                      ? "fas fa-star-half-alt" 
                      : "far fa-star"
                  }`}
                ></i>
              );
            })}
            <span className="text-gray-600 text-sm ml-1">({product.reviewCount || 0})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div></div> {/* Empty div for spacing */}
          
          <Button
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending || !product.stock || product.stock <= 0}
            className="bg-primary text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            size="sm"
            data-testid={`button-add-to-cart-${product.id}`}
          >
            {addToCartMutation.isPending ? (
              <i className="fas fa-spinner fa-spin mr-1"></i>
            ) : !product.stock || product.stock <= 0 ? (
              <i className="fas fa-times mr-1"></i>
            ) : (
              <i className="fas fa-shopping-cart mr-1"></i>
            )}
            {!product.stock || product.stock <= 0 ? "Stokta Yok" : "Sepete Ekle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
