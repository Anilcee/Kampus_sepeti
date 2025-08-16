import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import ShoppingCart from "@/components/ShoppingCart";
import AddressList from "@/components/AddressList";
import type { CartItemWithProduct, User, Address } from "@shared/schema";

// Turkish educational/study images
const productImages = [
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
];

export default function Checkout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  
  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  // Set default address when addresses are loaded
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [addresses, selectedAddress]);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Ödeme sayfasına erişmek için giriş yapmalısınız.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 1500);
    } else if (cartItems.length === 0) {
      toast({
        title: "Sepet Boş",
        description: "Sepetinizde ürün bulunmamaktadır.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    }
  }, [user, cartItems, toast, setLocation]);

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
        title: "Sipariş Tamamlandı!",
        description: "Siparişiniz başarıyla oluşturuldu. Teşekkür ederiz!",
      });
      setLocation("/");
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

  const shippingCost = totalAmount >= 150 ? 0 : 29.99;
  const finalTotal = totalAmount + shippingCost;

  const handlePayment = () => {
    if (!selectedAddress) {
      toast({
        title: "Adres Seçimi Gerekli",
        description: "Lütfen bir teslimat adresi seçiniz.",
        variant: "destructive",
      });
      return;
    }
    
    createOrderMutation.mutate();
  };

  if (!user || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        searchQuery=""
        onSearchChange={() => {}}
        onCartClick={() => setShowCart(true)}
        user={user as any}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8" data-testid="text-checkout-title">
            <i className="fas fa-credit-card mr-3 text-primary"></i>
            Ödeme
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Payment & Address Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-map-marker-alt mr-2 text-primary"></i>
                  Teslimat Adresi
                </h2>
                
                {addresses.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <i className="fas fa-map-marker-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Adres Bulunamadı</h3>
                    <p className="text-gray-600 mb-4">Sipariş verebilmek için en az bir adres eklemelisiniz.</p>
                    <Button 
                      onClick={() => setLocation("/profile")}
                      className="bg-primary hover:bg-blue-700"
                    >
                      Adres Ekle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AddressList 
                      onSelectAddress={setSelectedAddress}
                      selectedAddressId={selectedAddress?.id}
                      showSelection={true}
                    />
                    {selectedAddress && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">Seçili Teslimat Adresi:</h4>
                        <div className="text-sm text-green-700">
                          <p className="font-medium">{selectedAddress.firstName} {selectedAddress.lastName}</p>
                          <p>{selectedAddress.phone}</p>
                          <p>{selectedAddress.address}</p>
                          <p>{selectedAddress.district}, {selectedAddress.city} {selectedAddress.postalCode}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-credit-card mr-2 text-primary"></i>
                  Ödeme Yöntemi
                </h2>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="credit_card"
                        name="payment_method"
                        value="credit_card"
                        checked={paymentMethod === "credit_card"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-primary"
                        data-testid="radio-credit-card"
                      />
                      <label htmlFor="credit_card" className="flex items-center cursor-pointer">
                        <i className="fas fa-credit-card mr-2 text-blue-600"></i>
                        <span className="font-medium text-gray-800">Kredi/Banka Kartı</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 ml-7 mt-1">
                      İyzico güvenli ödeme sistemi ile
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="transfer"
                        name="payment_method"
                        value="transfer"
                        checked={paymentMethod === "transfer"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-primary"
                        data-testid="radio-transfer"
                      />
                      <label htmlFor="transfer" className="flex items-center cursor-pointer">
                        <i className="fas fa-university mr-2 text-green-600"></i>
                        <span className="font-medium text-gray-800">Havale/EFT</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 ml-7 mt-1">
                      Banka hesabımıza havale/EFT ile ödeme
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-receipt mr-2 text-primary"></i>
                  Sipariş Özeti
                </h2>

                <div className="space-y-4">
                  {cartItems.map((item, index) => {
                    const imageUrl = item.product.imageUrl || productImages[index % productImages.length];
                    const itemTotal = parseFloat(item.product.price) * item.quantity;
                    
                    return (
                      <div key={item.id} className="flex items-center space-x-3 pb-3 border-b border-gray-100" data-testid={`checkout-item-${item.id}`}>
                        <img 
                          src={imageUrl} 
                          alt={item.product.name} 
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 text-sm" data-testid={`text-item-name-${item.id}`}>
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {item.quantity} adet × {parseFloat(item.product.price).toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} TL
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary" data-testid={`text-item-total-${item.id}`}>
                            {itemTotal.toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} TL
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Ara Toplam:</span>
                    <span data-testid="text-subtotal">
                      {totalAmount.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} TL
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Kargo:</span>
                    <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""} data-testid="text-shipping">
                      {shippingCost === 0 ? "Ücretsiz" : `${shippingCost.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} TL`}
                    </span>
                  </div>
                  {shippingCost === 0 && (
                    <p className="text-xs text-green-600">
                      <i className="fas fa-truck mr-1"></i>
                      150 TL üzeri ücretsiz kargo
                    </p>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Toplam:</span>
                  <span className="text-primary" data-testid="text-final-total">
                    {finalTotal.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} TL
                  </span>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={createOrderMutation.isPending || !selectedAddress}
                  className="w-full bg-primary text-white hover:bg-blue-700 transition-colors font-semibold py-3 mt-6 disabled:bg-gray-400"
                  data-testid="button-complete-order"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock mr-2"></i>
                      Siparişi Tamamla
                    </>
                  )}
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    <i className="fas fa-shield-alt mr-1"></i>
                    Güvenli ödeme sistemi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ShoppingCart 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />
    </div>
  );
}