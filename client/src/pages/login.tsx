import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, type LoginInput } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      toast({
        title: "Giriş başarılı!",
        description: "Hoş geldiniz.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Giriş hatası",
        description: error.message || "Giriş sırasında bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary text-white px-6 py-3 rounded-lg font-bold text-2xl">
              <i className="fas fa-graduation-cap mr-2"></i>
              Kampüs Sepeti
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Hesabınıza giriş yapın</h2>
          <p className="mt-2 text-gray-600">
            Deneme kitaplarını keşfetmeye devam edin
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
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
                placeholder="Şifrenizi girin"
                {...register("password")}
                className="mt-1"
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/register" className="text-primary hover:text-primary/90">
                Hesabınız yok mu? <span className="font-medium">Kayıt olun</span>
              </Link>
            </div>
            <div className="text-sm">
              <a href="#" className="text-primary hover:text-primary/90">
                Şifremi unuttum
              </a>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                Giriş Yap
              </>
            )}
          </Button>
        </form>

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