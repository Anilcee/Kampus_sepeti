import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import SimpleHeader from "@/components/SimpleHeader";
import ShoppingCart from "@/components/ShoppingCart";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProductWithCategory } from "@shared/schema";

// Turkish educational/study images from Unsplash
const productImages = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
];

export default function Product() {
  const [, params] = useRoute("/product/:slug");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCart, setShowCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery<ProductWithCategory>({
    queryKey: ["/api/products/slug", params?.slug],
    queryFn: async () => {
      const response = await fetch(`/api/products/slug/${params?.slug}`);
      if (!response.ok) {
        throw new Error("Product not found");
      }
      return response.json();
    },
    enabled: !!params?.slug,
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cart", {
        productId: product?.id,
        quantity: quantity,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sepete Eklendi",
        description: `${product?.name} (${quantity} adet) sepetinize eklendi.`,
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
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
        window.location.href = "/login";
      }, 500);
      return;
    }

    // Check stock availability
    if (!product?.stock || product.stock <= 0) {
      toast({
        title: "Stokta Yok",
        description: "Bu ürün şu anda stokta bulunmamaktadır.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > product.stock) {
      toast({
        title: "Yetersiz Stok",
        description: `Maksimum ${product.stock} adet ekleyebilirsiniz.`,
        variant: "destructive",
      });
      return;
    }

    addToCartMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user ? (
          <Header 
            searchQuery=""
            onSearchChange={() => {}}
            onCartClick={() => setShowCart(true)}
            user={user as any}
          />
        ) : (
          <SimpleHeader 
            searchQuery=""
            onSearchChange={() => {}}
            onCartClick={() => window.location.href = '/login'}
          />
        )}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="animate-pulse flex space-x-8">
              <div className="bg-gray-300 rounded-lg w-96 h-96"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
                <div className="h-12 bg-gray-300 rounded w-40"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user ? (
          <Header 
            searchQuery=""
            onSearchChange={() => {}}
            onCartClick={() => setShowCart(true)}
            user={user as any}
          />
        ) : (
          <SimpleHeader 
            searchQuery=""
            onSearchChange={() => {}}
            onCartClick={() => window.location.href = '/login'}
          />
        )}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Ürün Bulunamadı</h1>
            <p className="text-gray-600 mb-8">Aradığınız ürün bulunmamaktadır.</p>
            <Link href="/">
              <Button className="bg-primary hover:bg-blue-700">
                <i className="fas fa-home mr-2"></i>
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = product.imageUrl || productImages[Math.floor(Math.random() * productImages.length)];
  const discountPercentage = product.discountPercentage || 0;
  const originalPrice = parseFloat(product.originalPrice || product.price);
  const currentPrice = parseFloat(product.price);

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        <Header 
          searchQuery=""
          onSearchChange={() => {}}
          onCartClick={() => setShowCart(true)}
          user={user as any}
        />
      ) : (
        <SimpleHeader 
          searchQuery=""
          onSearchChange={() => {}}
          onCartClick={() => window.location.href = '/login'}
        />
      )}

      {/* Breadcrumb */}
      <nav className="bg-gray-100 py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-primary">Ana Sayfa</Link>
            <i className="fas fa-chevron-right text-xs"></i>
            <Link href="/" className="hover:text-primary">Ürünler</Link>
            <i className="fas fa-chevron-right text-xs"></i>
            <span className="text-primary font-medium">{product.category?.name}</span>
            <i className="fas fa-chevron-right text-xs"></i>
            <span className="text-gray-800">{product.name}</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="relative">
              <img 
                src={imageUrl} 
                alt={product.name} 
                className="w-full h-96 object-cover rounded-lg"
                data-testid="img-product-detail"
              />
              {discountPercentage > 0 && (
                <div className="absolute top-4 left-4 bg-accent text-white px-3 py-2 rounded-md text-lg font-bold">
                  %{discountPercentage} İndirim
                </div>
              )}
              {product.hasCoaching && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-md text-sm font-medium">
                  DENEME + KOÇLUK
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2" data-testid="text-product-name">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const rating = parseFloat(product.rating || "0");
                      return (
                        <i 
                          key={index}
                          className={`${
                            index < Math.floor(rating) 
                              ? "fas fa-star" 
                              : index < rating 
                              ? "fas fa-star-half-alt" 
                              : "far fa-star"
                          }`}
                        ></i>
                      );
                    })}
                  </div>
                  <span className="text-gray-600">({product.reviewCount || 0} değerlendirme)</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-green-600 font-medium">{product.stock || 0} stokta</span>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  {discountPercentage > 0 && (
                    <span className="text-gray-500 line-through text-xl" data-testid="text-original-price">
                      {originalPrice.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} TL
                    </span>
                  )}
                  <span className="text-3xl font-bold text-primary" data-testid="text-current-price">
                    {currentPrice.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} TL
                  </span>
                </div>
                {discountPercentage > 0 && (
                  <p className="text-green-600 font-medium">
                    {(originalPrice - currentPrice).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} TL tasarruf!
                  </p>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Ürün Açıklaması</h3>
                  <p className="text-gray-600 leading-relaxed" data-testid="text-product-description">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Özellikler</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Kategori: {product.category?.name}</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Güncel müfredata uygun</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Detaylı çözümler</span>
                  </li>
                  {product.hasCoaching && (
                    <li className="flex items-center">
                      <i className="fas fa-star text-green-500 mr-3"></i>
                      <span className="text-gray-700 font-medium">Ücretsiz koçluk desteği dahil</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label htmlFor="quantity" className="text-gray-700 font-medium">Adet:</label>
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                      data-testid="button-decrease-quantity"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      id="quantity"
                      value={quantity} 
                      onChange={(e) => {
                        const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                        const maxStock = product?.stock || 0;
                        setQuantity(Math.min(newQuantity, maxStock));
                      }}
                      className="w-16 text-center py-2 border-none focus:outline-none"
                      min="1"
                      max={product?.stock || 1}
                      data-testid="input-quantity"
                    />
                    <button 
                      onClick={() => setQuantity(Math.min(quantity + 1, product?.stock || 1))}
                      disabled={quantity >= (product?.stock || 0)}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-increase-quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isPending || !product?.stock || product.stock <= 0 || quantity > product.stock}
                    className="flex-1 bg-primary text-white hover:bg-blue-700 transition-colors text-lg py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    data-testid="button-add-to-cart"
                  >
                    {addToCartMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-shopping-cart mr-2"></i>
                    )}
                    Sepete Ekle ({(currentPrice * quantity).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} TL)
                  </Button>
                  <Button variant="outline" className="px-6">
                    <i className="fas fa-heart mr-2"></i>
                    Favorile
                  </Button>
                </div>
              </div>

              {/* Shipping Info */}
              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <i className="fas fa-truck text-green-500 mr-3"></i>
                  <span>Ücretsiz kargo (150 TL ve üzeri siparişlerde)</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-undo text-blue-500 mr-3"></i>
                  <span>30 gün iade garantisi</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-headset text-purple-500 mr-3"></i>
                  <span>7/24 müşteri desteği</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {user && (
        <ShoppingCart 
          isOpen={showCart}
          onClose={() => setShowCart(false)}
        />
      )}
    </div>
  );
}