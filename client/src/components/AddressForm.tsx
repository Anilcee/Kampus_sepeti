import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { insertAddressSchema } from "@shared/schema";
import type { Address } from "@shared/schema";
import { z } from "zod";

const addressFormSchema = insertAddressSchema.omit({ userId: true });
type AddressFormData = z.infer<typeof addressFormSchema>;

interface AddressFormProps {
  address?: Address;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      title: address?.title || "",
      firstName: address?.firstName || "",
      lastName: address?.lastName || "",
      phone: address?.phone || "",
      address: address?.address || "",
      city: address?.city || "",
      district: address?.district || "",
      postalCode: address?.postalCode || "",
      isDefault: address?.isDefault || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      if (address) {
        // Update existing address
        await apiRequest("PUT", `/api/addresses/${address.id}`, data);
      } else {
        // Create new address
        await apiRequest("POST", "/api/addresses", data);
      }
    },
    onSuccess: () => {
      toast({
        title: address ? "Adres Güncellendi" : "Adres Eklendi",
        description: address 
          ? "Adres başarıyla güncellendi." 
          : "Yeni adres başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: address 
          ? "Adres güncellenirken bir hata oluştu." 
          : "Adres eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddressFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres Başlığı</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ev, İş, Okul vb." 
                  {...field} 
                  data-testid="input-address-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ad</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Adınız" 
                    {...field} 
                    data-testid="input-address-first-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soyad</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Soyadınız" 
                    {...field} 
                    data-testid="input-address-last-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0555 123 45 67" 
                  {...field} 
                  data-testid="input-address-phone"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tam adresinizi yazınız..." 
                  className="min-h-20"
                  {...field}
                  data-testid="textarea-address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şehir</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="İstanbul" 
                    {...field} 
                    data-testid="input-address-city"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İlçe</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Beyoğlu" 
                    {...field} 
                    data-testid="input-address-district"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posta Kodu</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="34000" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-address-postal-code"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-address-default"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Varsayılan adres olarak ayarla</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-address"
            >
              İptal
            </Button>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary hover:bg-blue-700"
            data-testid="button-save-address"
          >
            {mutation.isPending ? (
              <i className="fas fa-spinner fa-spin mr-1"></i>
            ) : (
              <i className="fas fa-save mr-1"></i>
            )}
            {address ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
