import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { User, CartItemWithProduct } from "@shared/schema";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCartClick: () => void;
  user?: User;
}

export default function Header({ searchQuery, onSearchChange, onCartClick, user }: HeaderProps) {
  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-white shadow-md border-b-2 border-primary sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary text-white py-2">
        <div className="container mx-auto px-4 text-center text-sm">
          <span className="font-medium">9.000 TL Üstüne Peşin Fiyatına 6 Taksit Avantajını Kaçırmayın!</span>
        </div>
      </div>
      
      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xl">
              <i className="fas fa-graduation-cap mr-2"></i>
              Kampüs Sepeti
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <input 
                type="search" 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Deneme kitabı ara..." 
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 outline-none"
                data-testid="input-search"
              />
              <button className="absolute right-0 top-0 h-full px-4 bg-primary text-white rounded-r-lg hover:bg-blue-700 transition-colors">
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4 text-sm">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Merhaba, {user.firstName || user.email}</span>
                  <Button
                    onClick={() => window.location.href = '/api/logout'}
                    variant="ghost"
                    size="sm"
                    data-testid="button-logout"
                  >
                    Çıkış Yap
                  </Button>
                </div>
              ) : (
                <>
                  <a href="/api/login" className="text-gray-600 hover:text-primary transition-colors">
                    <i className="fas fa-user mr-1"></i>Giriş Yap
                  </a>
                  <span className="text-gray-400">|</span>
                  <a href="/api/login" className="text-gray-600 hover:text-primary transition-colors">Kayıt Ol</a>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="relative p-2 text-gray-600 hover:text-primary transition-colors">
                <i className="fas fa-heart text-lg"></i>
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
              </button>
              
              <button 
                onClick={onCartClick}
                className="relative p-2 text-gray-600 hover:text-primary transition-colors"
                data-testid="button-cart"
              >
                <i className="fas fa-shopping-cart text-lg"></i>
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="text-cart-count">
                  {cartItemCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
