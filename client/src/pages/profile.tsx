import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateProfileSchema, type UpdateProfileInput, type User, type Order, type OrderItem, type Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import ShoppingCart from "@/components/ShoppingCart";
import AddressList from "@/components/AddressList";

type OrderDetails = {
  order: Order;
  items: Array<OrderItem & { product: Product }>;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCart, setShowCart] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  const { data: orders = [] } = useQuery<(Order & { items?: Array<OrderItem & { product: Product }> })[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: orderDetails } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", selectedOrderId],
    enabled: !!selectedOrderId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: userProfile?.firstName || "",
      lastName: userProfile?.lastName || "",
      phone: userProfile?.phone || "",
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (userProfile) {
      reset({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
      });
    }
  }, [userProfile, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      return apiRequest("PUT", "/api/auth/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profil Güncellendi",
        description: "Profil bilgileriniz başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Profil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    updateProfileMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Beklemede", variant: "secondary" as const },
      confirmed: { label: "Onaylandı", variant: "default" as const },
      shipped: { label: "Kargoya Verildi", variant: "default" as const },
      delivered: { label: "Teslim Edildi", variant: "success" as const },
      cancelled: { label: "İptal Edildi", variant: "destructive" as const },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Giriş Gerekli</h1>
          <p className="text-gray-600 mb-6">Bu sayfayı görüntülemek için giriş yapmalısınız.</p>
          <Button onClick={() => window.location.href = '/login'}>
            Giriş Yap
          </Button>
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
        user={userProfile}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {(user as User).firstName?.charAt(0) || (user as User).email.charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-2xl" data-testid="text-profile-title">
                    Hoş Geldin, {(user as User).firstName || "Kullanıcı"}!
                  </CardTitle>
                  <p className="text-muted-foreground" data-testid="text-user-email">
                    {(user as User).email}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs Navigation */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <i className="fas fa-user"></i>
                Profil Bilgileri
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt"></i>
                Adreslerim
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <i className="fas fa-shopping-bag"></i>
                Siparişlerim ({orders.length})
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-edit text-primary"></i>
                    Profil Bilgilerini Düzenle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Kişisel Bilgiler */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-user-circle text-primary"></i>
                        Kişisel Bilgiler
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Ad *</Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Adınız"
                            {...register("firstName")}
                            className="mt-1"
                            data-testid="input-firstName"
                          />
                          {errors.firstName && (
                            <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="lastName">Soyad *</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Soyadınız"
                            {...register("lastName")}
                            className="mt-1"
                            data-testid="input-lastName"
                          />
                          {errors.lastName && (
                            <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone">Telefon Numarası</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="0555 123 45 67"
                          {...register("phone")}
                          className="mt-1"
                          data-testid="input-phone"
                        />
                        {errors.phone && (
                          <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex space-x-4 pt-4">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="flex-1 bg-primary text-white hover:bg-blue-700"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Güncelleniyor...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Değişiklikleri Kaydet
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.history.back()}
                        className="px-8"
                        data-testid="button-cancel"
                      >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Geri
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-primary"></i>
                    Adres Yönetimi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressList />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-shopping-bag text-primary"></i>
                    Siparişlerim
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-shopping-bag text-4xl text-gray-400"></i>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Henüz Siparişiniz Bulunmuyor
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Alışverişe başlamak için ürünleri incelemeye başlayın!
                      </p>
                      <Button
                        onClick={() => window.location.href = '/'}
                        className="bg-primary hover:bg-blue-700"
                      >
                        <i className="fas fa-shopping-cart mr-2"></i>
                        Alışverişe Başla
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Card 
                          key={order.id} 
                          className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            console.log('Order clicked:', order.id);
                            setSelectedOrderId(order.id);
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-semibold text-lg">
                                  Sipariş #{order.id.slice(-8).toUpperCase()}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(order.createdAt || '')}
                                </p>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(order.status)}
                                <div className="text-lg font-bold text-primary mt-2">
                                  ₺{parseFloat(order.totalAmount).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Ürün Görselleri */}
                            {order.items && order.items.length > 0 && (
                              <div className="mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <i className="fas fa-box text-gray-500 text-sm"></i>
                                  <span className="text-sm text-muted-foreground">
                                    Sipariş İçeriği ({order.items.length} ürün)
                                  </span>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                  {order.items.map((item, index) => (
                                    <div key={index} className="flex-shrink-0 relative group">
                                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                                        {item.product.imageUrl ? (
                                          <img 
                                            src={item.product.imageUrl} 
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <i className="fas fa-book text-gray-400 text-lg"></i>
                                        )}
                                      </div>
                                      {item.quantity > 1 && (
                                        <div className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                          {item.quantity}
                                        </div>
                                      )}
                                      {/* Tooltip on hover */}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {item.product.name}
                                      </div>
                                    </div>
                                  ))}
                                  {order.items.length > 3 && (
                                    <div className="flex-shrink-0 w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                      <span className="text-xs text-gray-500">+{order.items.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <i className="fas fa-calendar"></i>
                                <span>Sipariş Tarihi: {formatDate(order.createdAt || '')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <i className="fas fa-truck"></i>
                                <span>
                                  {order.status === 'delivered' ? 'Teslim Edildi' :
                                   order.status === 'shipped' ? 'Kargoda' :
                                   order.status === 'confirmed' ? 'Hazırlanıyor' :
                                   order.status === 'cancelled' ? 'İptal Edildi' :
                                   'İşleniyor'}
                                </span>
                              </div>
                            </div>

                            {order.status === 'shipped' && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-800">
                                  <i className="fas fa-shipping-fast"></i>
                                  <span className="font-medium">Kargo Bilgisi</span>
                                </div>
                                <p className="text-sm text-blue-700 mt-1">
                                  Siparişiniz kargoya verildi ve yakında adresinize teslim edilecek.
                                </p>
                              </div>
                            )}

                            {order.status === 'delivered' && (
                              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 text-green-800">
                                  <i className="fas fa-check-circle"></i>
                                  <span className="font-medium">Teslim Edildi</span>
                                </div>
                                <p className="text-sm text-green-700 mt-1">
                                  Siparişiniz başarıyla teslim edilmiştir. Teşekkür ederiz!
                                </p>
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-primary hover:text-blue-700">
                                <i className="fas fa-eye text-sm"></i>
                                <span className="text-sm font-medium">Sipariş detaylarını görüntüle</span>
                                <i className="fas fa-chevron-right text-xs"></i>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ShoppingCart 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />

      {/* Order Details Modal */}
      <Dialog 
        open={!!selectedOrderId} 
        onOpenChange={(open) => {
          console.log('Modal state changing:', open, 'Selected Order ID:', selectedOrderId);
          if (!open) setSelectedOrderId(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="fas fa-shopping-bag text-primary"></i>
              {orderDetails ? `Sipariş #${orderDetails.order.id.slice(-8).toUpperCase()} Detayları` : 'Sipariş Detayları'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrderId && !orderDetails && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
                <p className="text-muted-foreground">Sipariş detayları yükleniyor...</p>
              </div>
            </div>
          )}
          
          {orderDetails && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Sipariş Bilgileri</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Sipariş No:</span>
                          <span className="font-medium">#{orderDetails.order.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tarih:</span>
                          <span>{formatDate(orderDetails.order.createdAt || '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Durum:</span>
                          <span>{getStatusBadge(orderDetails.order.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Ödeme Bilgileri</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Toplam Tutar:</span>
                          <span className="font-bold text-lg text-primary">
                            ₺{parseFloat(orderDetails.order.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-list text-primary"></i>
                    Sipariş İçeriği ({orderDetails.items.length} ürün)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderDetails.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product.imageUrl ? (
                            <img 
                              src={item.product.imageUrl} 
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <i className="fas fa-book text-gray-400 text-xl"></i>
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">{item.product.name}</h5>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.product.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <i className="fas fa-times text-gray-400"></i>
                              {item.quantity} adet
                            </span>
                            <span className="flex items-center gap-1">
                              <i className="fas fa-tag text-gray-400"></i>
                              ₺{parseFloat(item.price).toFixed(2)} / adet
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-primary">
                            ₺{(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Toplam:</span>
                    <span className="text-primary">
                      ₺{parseFloat(orderDetails.order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-clock text-primary"></i>
                    Sipariş Durumu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        ['pending', 'confirmed', 'shipped', 'delivered'].includes(orderDetails.order.status) 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium">Sipariş Alındı</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(orderDetails.order.createdAt || '')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        ['confirmed', 'shipped', 'delivered'].includes(orderDetails.order.status) 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium">Sipariş Onaylandı</div>
                        <div className="text-sm text-muted-foreground">
                          {['confirmed', 'shipped', 'delivered'].includes(orderDetails.order.status) 
                            ? 'Siparişiniz onaylandı ve hazırlanıyor' 
                            : 'Henüz onaylanmadı'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        ['shipped', 'delivered'].includes(orderDetails.order.status) 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium">Kargoya Verildi</div>
                        <div className="text-sm text-muted-foreground">
                          {['shipped', 'delivered'].includes(orderDetails.order.status) 
                            ? 'Siparişiniz kargo firmasına teslim edildi' 
                            : 'Henüz kargoya verilmedi'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        orderDetails.order.status === 'delivered' 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium">Teslim Edildi</div>
                        <div className="text-sm text-muted-foreground">
                          {orderDetails.order.status === 'delivered' 
                            ? 'Siparişiniz başarıyla teslim edildi' 
                            : 'Henüz teslim edilmedi'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}