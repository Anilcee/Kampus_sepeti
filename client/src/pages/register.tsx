import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { registerSchema, type RegisterInput } from "@shared/schema";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Kayıt başarılı!",
        description: "Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Kayıt hatası",
        description: error.message || "Kayıt sırasında bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
           <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Kampüs Sepeti" 
              className="h-36 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Hesap oluşturun</h2>
          <p className="mt-2 text-gray-600">
            Deneme kitapları dünyasına katılın
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Ad</Label>
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
                <Label htmlFor="lastName">Soyad</Label>
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
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...register("email")}
                className="mt-1"
                data-testid="input-email"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="En az 6 karakter"
                {...register("password")}
                className="mt-1"
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Şifre Tekrarı</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                {...register("confirmPassword")}
                className="mt-1"
                data-testid="input-confirmPassword"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            Kayıt olarak <a href="#" className="text-primary hover:text-primary/90">Kullanım Koşulları</a> ve{" "}
            <a href="#" className="text-primary hover:text-primary/90">Gizlilik Politikası</a>'nı kabul etmiş olursunuz.
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Hesap oluşturuluyor...
              </>
            ) : (
              <>
                <i className="fas fa-user-plus mr-2"></i>
                Hesap Oluştur
              </>
            )}
          </Button>
        </form>

        {/* Login link */}
        <div className="text-center">
          <Link href="/login" className="text-primary hover:text-primary/90">
            Zaten hesabınız var mı? <span className="font-medium">Giriş yapın</span>
          </Link>
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
            <i className="fas fa-arrow-left mr-2"></i>
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}