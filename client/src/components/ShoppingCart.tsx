import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import type { CartItemWithProduct } from "@shared/schema";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const productImages = [
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
];

export default function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: false, // Disable by default for non-authenticated users
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiRequest("PUT", `/api/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error) => {
      // Try to get error message from response
      let errorMessage = "Miktar güncellenirken bir hata oluştu.";
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

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Ürün Kaldırıldı",
        description: "Ürün sepetinizden kaldırıldı.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Ürün kaldırılırken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
      }));
      
      await apiRequest("POST", "/api/orders", { items: orderItems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Sipariş Oluşturuldu",
        description: "Siparişiniz başarıyla oluşturuldu.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Sipariş oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.product.price) * item.quantity);
  }, 0);

  const handleUpdateQuantity = (itemId: string, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) return;
    
    if (newQuantity > maxStock) {
      toast({
        title: "Stok Yetersiz",
        description: `Maksimum ${maxStock} adet ekleyebilirsiniz.`,
        variant: "destructive",
      });
      return;
    }
    
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Sepet Boş",
        description: "Sepetinizde ürün bulunmamaktadır.",
        variant: "destructive",
      });
      return;
    }
    onClose();
    setLocation("/checkout");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" data-testid="modal-cart">
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              <i className="fas fa-shopping-cart mr-2 text-primary"></i>Sepetim
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="button-close-cart"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto max-h-96">
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-shopping-cart text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">Sepetiniz boş</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item, index) => {
                const imageUrl = item.product.imageUrl || productImages[index % productImages.length];
                
                return (
                  <div key={item.id} className="flex items-center space-x-3 pb-4 border-b border-gray-100" data-testid={`cart-item-${item.id}`}>
                    <img 
                      src={imageUrl} 
                      alt={item.product.name} 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm" data-testid={`text-cart-item-name-${item.id}`}>
                        {item.product.name}
                      </h4>
                      <p className="text-primary font-semibold" data-testid={`text-cart-item-price-${item.id}`}>
                        {parseFloat(item.product.price).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} TL
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.product.stock || 0)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300"
                          data-testid={`button-decrease-quantity-${item.id}`}
                        >
                          -
                        </button>
                        <span className="text-sm" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.product.stock || 0)}
                          disabled={item.quantity >= (item.product.stock || 0)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid={`button-increase-quantity-${item.id}`}
                        >
                          +
                        </button>
                      </div>
                      {item.product.stock && (
                        <div className="text-xs text-gray-500 mt-1">
                          Stok: {item.product.stock}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-accent hover:text-red-700"
                      data-testid={`button-remove-item-${item.id}`}
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-800">Toplam:</span>
              <span className="text-xl font-bold text-primary" data-testid="text-cart-total">
                {totalAmount.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} TL
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={createOrderMutation.isPending}
              className="w-full bg-primary text-white hover:bg-blue-700 transition-colors font-semibold py-3"
              data-testid="button-checkout"
            >
              {createOrderMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-credit-card mr-2"></i>
              )}
              Ödemeye Geç
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full mt-2 border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors font-semibold py-3"
              data-testid="button-continue-shopping"
            >
              <i className="fas fa-shopping-basket mr-2"></i>
              Alışverişe Devam Et
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
