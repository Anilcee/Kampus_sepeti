import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateProfileSchema, type UpdateProfileInput, type User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import ShoppingCart from "@/components/ShoppingCart";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCart, setShowCart] = useState(false);

  const { data: userProfile } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
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
      address: userProfile?.address || "",
      city: userProfile?.city || "",
      district: userProfile?.district || "",
      postalCode: userProfile?.postalCode || "",
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (userProfile) {
      reset({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
        address: userProfile.address || "",
        city: userProfile.city || "",
        district: userProfile.district || "",
        postalCode: userProfile.postalCode || "",
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {(user as User).firstName?.charAt(0) || (user as User).email.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800" data-testid="text-profile-title">
                  Profil Bilgileri
                </h1>
                <p className="text-gray-600" data-testid="text-user-email">
                  {(user as User).email}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <Label htmlFor="phone">Telefon</Label>
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

              <div>
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  placeholder="Mahalle, sokak, apartman adı, daire no..."
                  {...register("address")}
                  className="mt-1 min-h-[100px]"
                  data-testid="input-address"
                />
                {errors.address && (
                  <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">İl</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="İstanbul"
                    {...register("city")}
                    className="mt-1"
                    data-testid="input-city"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <Input
                    id="district"
                    type="text"
                    placeholder="Kadıköy"
                    {...register("district")}
                    className="mt-1"
                    data-testid="input-district"
                  />
                  {errors.district && (
                    <p className="text-sm text-destructive mt-1">{errors.district.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="postalCode">Posta Kodu</Label>
                  <Input
                    id="postalCode"
                    type="text"
                    placeholder="34710"
                    {...register("postalCode")}
                    className="mt-1"
                    data-testid="input-postalCode"
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-destructive mt-1">{errors.postalCode.message}</p>
                  )}
                </div>
              </div>

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
                      Kaydet
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
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-3">
              <i className="fas fa-info-circle text-blue-500 mt-1"></i>
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Bilgi</h3>
                <p className="text-blue-700 text-sm">
                  Adres bilgilerinizi eksiksiz doldurmak, siparişlerinizin hızlı ve doğru bir şekilde 
                  teslim edilmesini sağlar. Telefon numaranız kargo takibi için kullanılacaktır.
                </p>
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