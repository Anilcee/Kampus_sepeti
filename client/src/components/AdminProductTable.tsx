import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductWithCategory, Category } from "@shared/schema";

interface AdminProductTableProps {
  products: ProductWithCategory[];
  categories: Category[];
  onEditProduct?: (product: ProductWithCategory) => void;
}

export default function AdminProductTable({ products, categories, onEditProduct }: AdminProductTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      toast({
        title: "Ürün Silindi",
        description: "Ürün başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Ürün silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`"${productName}" ürününü silmek istediğinizden emin misiniz?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <i className="fas fa-box-open text-4xl text-gray-400 mb-4"></i>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Henüz Ürün Yok</h3>
        <p className="text-gray-600">İlk deneme kitabınızı ekleyerek başlayın.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ürün</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Fiyat</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <i className="fas fa-book text-gray-500"></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </p>
                    {product.hasCoaching && (
                      <Badge variant="secondary" className="text-xs">
                        Koçluk
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600" data-testid={`text-product-category-${product.id}`}>
                  {product.category?.name || "Kategorisiz"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold" data-testid={`text-product-price-${product.id}`}>
                    {parseFloat(product.price).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} TL
                  </span>
                  {product.discountPercentage && product.discountPercentage > 0 && (
                    <span className="text-xs text-gray-500 line-through">
                      {parseFloat(product.originalPrice || product.price).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} TL
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm" data-testid={`text-product-stock-${product.id}`}>
                  {product.stock || 0}
                </span>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={product.isActive ? "default" : "secondary"}
                  data-testid={`badge-product-status-${product.id}`}
                >
                  {product.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditProduct?.(product)}
                    className="text-primary hover:text-blue-700"
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="text-accent hover:text-red-700"
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
