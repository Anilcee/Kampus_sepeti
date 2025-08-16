import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddressForm from "./AddressForm";
import type { Address } from "@shared/schema";

interface AddressListProps {
  onSelectAddress?: (address: Address) => void;
  selectedAddressId?: string;
  showSelection?: boolean;
}

export default function AddressList({ onSelectAddress, selectedAddressId, showSelection = false }: AddressListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest("DELETE", `/api/addresses/${addressId}`);
    },
    onSuccess: () => {
      toast({
        title: "Adres Silindi",
        description: "Adres başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Adres silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest("PUT", `/api/addresses/${addressId}/default`);
    },
    onSuccess: () => {
      toast({
        title: "Varsayılan Adres Güncellendi",
        description: "Varsayılan adres başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Varsayılan adres güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAddress = (address: Address) => {
    if (window.confirm(`"${address.title}" adresini silmek istediğinizden emin misiniz?`)) {
      deleteAddressMutation.mutate(address.id);
    }
  };

  const handleSetDefault = (address: Address) => {
    setDefaultMutation.mutate(address.id);
  };

  const handleEditSuccess = () => {
    setEditingAddress(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Adreslerim</h3>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-blue-700" data-testid="button-add-address">
              <i className="fas fa-plus mr-2"></i>
              Yeni Adres Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Adres Ekle</DialogTitle>
            </DialogHeader>
            <AddressForm
              onSuccess={handleEditSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <i className="fas fa-map-marker-alt text-4xl text-gray-400 mb-4"></i>
            <h4 className="text-lg font-medium text-gray-800 mb-2">Henüz Adres Yok</h4>
            <p className="text-gray-600 mb-4">İlk adresinizi ekleyerek başlayın.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card 
              key={address.id} 
              className={`cursor-pointer transition-all ${
                showSelection && selectedAddressId === address.id
                  ? 'ring-2 ring-primary border-primary'
                  : showSelection
                  ? 'hover:border-primary'
                  : ''
              }`}
              onClick={() => showSelection && onSelectAddress?.(address)}
              data-testid={`address-card-${address.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base flex items-center">
                    {address.title}
                    {address.isDefault && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Varsayılan
                      </Badge>
                    )}
                    {showSelection && selectedAddressId === address.id && (
                      <Badge className="ml-2 text-xs bg-primary">
                        Seçili
                      </Badge>
                    )}
                  </CardTitle>
                  {!showSelection && (
                    <div className="flex space-x-1">
                      <Dialog 
                        open={editingAddress?.id === address.id} 
                        onOpenChange={(open) => !open && setEditingAddress(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAddress(address);
                            }}
                            className="text-primary hover:text-blue-700"
                            data-testid={`button-edit-address-${address.id}`}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Adresi Düzenle</DialogTitle>
                          </DialogHeader>
                          <AddressForm
                            address={editingAddress!}
                            onSuccess={handleEditSuccess}
                            onCancel={() => setEditingAddress(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(address);
                        }}
                        className="text-accent hover:text-red-700"
                        data-testid={`button-delete-address-${address.id}`}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium">{address.firstName} {address.lastName}</p>
                  <p>{address.phone}</p>
                  <p>{address.address}</p>
                  <p>{address.district}, {address.city} {address.postalCode}</p>
                </div>
                {!showSelection && !address.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(address);
                    }}
                    className="mt-3 text-xs"
                    data-testid={`button-set-default-${address.id}`}
                  >
                    Varsayılan Yap
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
