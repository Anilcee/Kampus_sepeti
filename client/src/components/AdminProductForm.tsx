import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { insertProductSchema } from "@shared/schema";
import type { Category, InsertProduct, ExamWithBooklets } from "@shared/schema";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur"),
  description: z.string().optional(),
  price: z.string().min(1, "Fiyat zorunludur").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Geçerli bir fiyat girin"
  }),
  originalPrice: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Geçerli bir fiyat girin"
  }),
  categoryId: z.string().min(1, "Kategori seçimi zorunludur"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  stock: z.number().int().min(0).default(0),
  hasCoaching: z.boolean().default(false),
  discountPercentage: z.number().int().min(0).max(100).default(0),
  slug: z.string().optional(),
  selectedExams: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface AdminProductFormProps {
  categories: Category[];
  editProduct?: InsertProduct & { id: string };
  onCancel?: () => void;
}

export default function AdminProductForm({ categories, editProduct, onCancel }: AdminProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // Fetch available exams
  const { data: exams = [] } = useQuery<ExamWithBooklets[]>({
    queryKey: ["/api/exams"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/exams");
      return response.json();
    },
  });

  // Fetch product's current exams when editing
  const { data: productExams = [] } = useQuery<ExamWithBooklets[]>({
    queryKey: ["/api/products", editProduct?.id, "exams"],
    queryFn: async () => {
      if (!editProduct?.id) return [];
      const response = await apiRequest("GET", `/api/products/${editProduct.id}/exams`);
      return response.json();
    },
    enabled: !!editProduct?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editProduct?.name || "",
      description: editProduct?.description || "",
      price: editProduct?.price?.toString() || "",
      originalPrice: editProduct?.originalPrice?.toString() || "",
      categoryId: editProduct?.categoryId || "",
      imageUrl: editProduct?.imageUrl || "",
      isActive: editProduct?.isActive ?? true,
      stock: editProduct?.stock || 0,
      hasCoaching: editProduct?.hasCoaching || false,
      discountPercentage: editProduct?.discountPercentage || 0,
      selectedExams: [],
    },
  });

  // Update form values when editProduct changes
  useEffect(() => {
    if (editProduct) {
      form.reset({
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: editProduct.price?.toString() || "",
        originalPrice: editProduct.originalPrice?.toString() || "",
        categoryId: editProduct.categoryId || "",
        imageUrl: editProduct.imageUrl || "",
        isActive: editProduct.isActive ?? true,
        stock: editProduct.stock || 0,
        hasCoaching: editProduct.hasCoaching || false,
        discountPercentage: editProduct.discountPercentage || 0,
        selectedExams: productExams.map(exam => exam.id), // Load product's current exams
      });
    }
  }, [editProduct, form, productExams]);

  const saveProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Calculate discount percentage if original price is provided
      let discountPercentage = 0;
      if (data.originalPrice && parseFloat(data.originalPrice) > parseFloat(data.price)) {
        const original = parseFloat(data.originalPrice);
        const current = parseFloat(data.price);
        discountPercentage = Math.round(((original - current) / original) * 100);
      }

      // Generate slug from name
      const slug = data.name
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const productData: InsertProduct = {
        name: data.name,
        description: data.description || null,
        price: data.price, // Keep as string since API expects it
        originalPrice: data.originalPrice || data.price, // Default to price if not provided
        categoryId: data.categoryId,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        stock: data.stock,
        hasCoaching: data.hasCoaching,
        discountPercentage,
        slug,
      };

      let productId: string;
      
      if (editProduct) {
        // Update existing product
        await apiRequest("PUT", `/api/products/${editProduct.id}`, productData);
        productId = editProduct.id;
      } else {
        // Create new product
        const response = await apiRequest("POST", "/api/products", productData);
        const result = await response.json();
        productId = result.id;
      }

      // Update product-exam relationships
      await apiRequest("POST", "/api/products/exams", {
        productId,
        examIds: data.selectedExams,
      });
    },
    onSuccess: () => {
      toast({
        title: editProduct ? "Ürün Güncellendi" : "Ürün Eklendi",
        description: editProduct 
          ? "Ürün başarıyla güncellendi." 
          : "Yeni deneme kitabı başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (editProduct?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/products", editProduct.id, "exams"] });
      }
      if (!editProduct) {
        form.reset();
      }
      if (onCancel && editProduct) {
        onCancel();
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: editProduct 
          ? "Ürün güncellenirken bir hata oluştu." 
          : "Ürün eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveProductMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kitap Adı *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Örn: 7. Sınıf Matematik Denemesi" 
                    {...field} 
                    data-testid="input-product-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kategori *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-category">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiyat (TL) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="9500.00" 
                    {...field} 
                    data-testid="input-product-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="originalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Orijinal Fiyat (TL)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="12000.00" 
                    {...field} 
                    data-testid="input-product-original-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stok Miktarı</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="100" 
                    {...field}
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-product-stock"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Görsel URL'si</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com/image.jpg" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-product-image"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Kitap açıklaması..." 
                  className="min-h-20"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-product-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-6">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-product-active"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Aktif</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasCoaching"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-product-coaching"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Koçluk Desteği</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Exam Selection */}
        <FormField
          control={form.control}
          name="selectedExams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pakete Dahil Denemeler</FormLabel>
              <FormControl>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {exams.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Henüz deneme oluşturulmamış</p>
                  ) : (
                    <div className="space-y-3">
                      {exams.map((exam) => (
                        <div key={exam.id} className="flex items-center space-x-3">
                          <Checkbox
                            checked={field.value?.includes(exam.id) || false}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, exam.id]);
                              } else {
                                field.onChange(currentValue.filter(id => id !== exam.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{exam.name}</div>
                            <div className="text-sm text-gray-500">
                              {exam.subject} • {exam.totalQuestions} soru • {exam.durationMinutes} dk
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm text-gray-600">
                  Seçilen: {field.value?.length || 0} deneme
                </span>
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {field.value.slice(0, 3).map(examId => {
                      const exam = exams.find(e => e.id === examId);
                      return exam ? (
                        <Badge key={examId} variant="secondary" className="text-xs">
                          {exam.name.length > 20 ? exam.name.slice(0, 20) + '...' : exam.name}
                        </Badge>
                      ) : null;
                    })}
                    {field.value.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{field.value.length - 3} tane daha
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          {editProduct && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-edit"
            >
              İptal
            </Button>
          )}
          {!editProduct && (
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              data-testid="button-reset-form"
            >
              Temizle
            </Button>
          )}
          <Button
            type="submit"
            disabled={saveProductMutation.isPending}
            className="bg-primary hover:bg-blue-700"
            data-testid="button-save-product"
          >
            {saveProductMutation.isPending ? (
              <i className="fas fa-spinner fa-spin mr-1"></i>
            ) : (
              <i className="fas fa-save mr-1"></i>
            )}
            {editProduct ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
