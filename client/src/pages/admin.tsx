import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminProductForm from "@/components/AdminProductForm";
import AdminProductTable from "@/components/AdminProductTable";
import type { ProductWithCategory, Category, Order } from "@shared/schema";

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Yetkisiz Erişim",
        description: "Admin paneline erişmek için yönetici hesabı gerekli.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: products = [] } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const handleEditProduct = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setActiveTab("edit-product");
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setActiveTab("products");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-accent">
        <div className="bg-accent text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <span className="font-medium">Admin Paneli - Kampüs Sepeti Yönetim Sistemi</span>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-accent text-white px-4 py-2 rounded-lg font-bold text-xl">
                <i className="fas fa-shield-alt mr-2"></i>
                Admin Paneli
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hoş geldin, {(user as any)?.firstName || (user as any)?.email}</span>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white"
                data-testid="button-back-to-site"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Siteye Dön
              </Button>
              <Button
                onClick={() => window.location.href = '/api/logout'}
                variant="outline"
                className="border-accent text-accent hover:bg-accent hover:text-white"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
              <i className="fas fa-book text-primary"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-products">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kategori</CardTitle>
              <i className="fas fa-tags text-primary"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-categories">{categories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
              <i className="fas fa-shopping-cart text-primary"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-orders">{orders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen Sipariş</CardTitle>
              <i className="fas fa-clock text-accent"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-orders">
                {orders.filter(order => order.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${editingProduct ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="products" data-testid="tab-products">
              <i className="fas fa-book mr-2"></i>
              Ürün Yönetimi
            </TabsTrigger>
            <TabsTrigger value="add-product" data-testid="tab-add-product">
              <i className="fas fa-plus mr-2"></i>
              Yeni Ürün
            </TabsTrigger>
            {editingProduct && (
              <TabsTrigger value="edit-product" data-testid="tab-edit-product">
                <i className="fas fa-edit mr-2"></i>
                Ürün Düzenle
              </TabsTrigger>
            )}
            <TabsTrigger value="orders" data-testid="tab-orders">
              <i className="fas fa-shopping-cart mr-2"></i>
              Siparişler
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <i className="fas fa-chart-bar mr-2"></i>
              İstatistikler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Ürün Yönetimi</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminProductTable 
                  products={products} 
                  categories={categories} 
                  onEditProduct={handleEditProduct}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-product">
            <Card>
              <CardHeader>
                <CardTitle>Yeni Deneme Kitabı Ekle</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminProductForm categories={categories} />
              </CardContent>
            </Card>
          </TabsContent>

          {editingProduct && (
            <TabsContent value="edit-product">
              <Card>
                <CardHeader>
                  <CardTitle>Ürün Düzenle: {editingProduct.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminProductForm 
                    categories={categories} 
                    editProduct={editingProduct}
                    onCancel={handleCancelEdit}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Sipariş Yönetimi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-shopping-cart text-4xl mb-4"></i>
                      <p>Henüz sipariş bulunmuyor.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Sipariş ID</th>
                            <th className="text-left py-2 px-4">Kullanıcı</th>
                            <th className="text-left py-2 px-4">Tutar</th>
                            <th className="text-left py-2 px-4">Durum</th>
                            <th className="text-left py-2 px-4">Tarih</th>
                            <th className="text-left py-2 px-4">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-4 font-medium" data-testid={`text-order-id-${order.id}`}>
                                {order.id.slice(0, 8)}
                              </td>
                              <td className="py-2 px-4">{order.userId.slice(0, 8)}</td>
                              <td className="py-2 px-4 font-semibold">{order.totalAmount} TL</td>
                              <td className="py-2 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {new Date(order.createdAt!).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="py-2 px-4">
                                <select 
                                  value={order.status}
                                  className="text-sm border rounded px-2 py-1"
                                  data-testid={`select-order-status-${order.id}`}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      const res = await fetch(`/api/orders/${order.id}/status`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ status: newStatus }),
                                        });
                                      if (res.ok) {
                                        toast({ title: "Durum güncellendi", description: `Sipariş durumu: ${newStatus}` });
                                        window.location.reload();
                                      } else {
                                        toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
                                      }
                                    } catch {
                                      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
                                    }
                                  }}
                                >
                                  <option value="pending">Bekliyor</option>
                                  <option value="confirmed">Onaylandı</option>
                                  <option value="shipped">Kargoda</option>
                                  <option value="delivered">Teslim Edildi</option>
                                  <option value="cancelled">İptal Edildi</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Satış Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Toplam Satış:</span>
                      <span className="font-bold text-green-600">
                        {orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0).toFixed(2)} TL
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Ortalama Sipariş:</span>
                      <span className="font-bold">
                        {orders.length > 0 
                          ? (orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0) / orders.length).toFixed(2)
                          : 0
                        } TL
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kategori Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories.map((category) => {
                      const categoryProducts = products.filter(p => p.categoryId === category.id);
                      const percentage = products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0;
                      
                      return (
                        <div key={category.id} className="flex justify-between items-center">
                          <span className="text-sm">{category.name}:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{categoryProducts.length}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
