import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword, comparePassword } from "./customAuth";
import { z } from "zod";
import { insertProductSchema, insertCategorySchema, loginSchema, registerSchema, updateProfileSchema, insertAddressSchema, type LoginInput, type RegisterInput, type UpdateProfileInput } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = req.session.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile route
  app.put('/api/auth/profile', isAuthenticated, async (req, res) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Geçersiz profil bilgileri" });
      }

      const userId = req.session.userId!;
      const updatedUser = await storage.updateUserProfile(userId, result.data);
      
      // Update session user
      req.session.user = updatedUser;
      
      res.json({ message: "Profil güncellendi", user: { ...updatedUser, password: undefined } });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Profil güncellenirken bir hata oluştu" });
    }
  });

  // Address routes
  app.get('/api/addresses', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const addresses = await storage.getAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ message: "Adresler yüklenirken bir hata oluştu" });
    }
  });

  app.post('/api/addresses', isAuthenticated, async (req, res) => {
    try {
      console.log("Address creation request body:", req.body);
      const userId = req.session.userId!;
      
      // Add userId to the data before validation
      const dataWithUserId = {
        ...req.body,
        userId,
      };
      
      const result = insertAddressSchema.safeParse(dataWithUserId);
      if (!result.success) {
        console.log("Address validation failed:", result.error);
        return res.status(400).json({ 
          message: "Geçersiz adres bilgileri",
          errors: result.error.errors 
        });
      }

      const address = await storage.createAddress(result.data);
      
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(500).json({ message: "Adres oluşturulurken bir hata oluştu" });
    }
  });

  app.put('/api/addresses/:id', isAuthenticated, async (req, res) => {
    try {
      // For updates, we don't need userId validation since we're updating existing address
      const result = insertAddressSchema.omit({ userId: true }).safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Geçersiz adres bilgileri" });
      }

      const address = await storage.updateAddress(req.params.id, result.data);
      if (!address) {
        return res.status(404).json({ message: "Adres bulunamadı" });
      }
      
      res.json(address);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ message: "Adres güncellenirken bir hata oluştu" });
    }
  });

  app.delete('/api/addresses/:id', isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteAddress(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Adres bulunamadı" });
      }
      
      res.json({ message: "Adres silindi" });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Adres silinirken bir hata oluştu" });
    }
  });

  app.put('/api/addresses/:id/default', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const success = await storage.setDefaultAddress(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Adres bulunamadı" });
      }
      
      res.json({ message: "Varsayılan adres güncellendi" });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ message: "Varsayılan adres ayarlanırken bir hata oluştu" });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Geçersiz giriş bilgileri" });
      }

      const { email, password } = result.data;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !await comparePassword(password, user.password)) {
        return res.status(401).json({ message: "E-posta veya şifre hatalı" });
      }

      req.session.userId = user.id;
      req.session.user = user;
      
      res.json({ message: "Giriş başarılı", user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Giriş sırasında bir hata oluştu" });
    }
  });

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Geçersiz kayıt bilgileri" });
      }

      const { email, password, firstName, lastName } = result.data;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "user"
      });

      res.status(201).json({ message: "Hesap başarıyla oluşturuldu", user: { ...newUser, password: undefined } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Kayıt sırasında bir hata oluştu" });
    }
  });

  // Logout routes
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Çıkış sırasında bir hata oluştu" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Çıkış başarılı" });
    });
  });

  // GET logout route for compatibility (redirects to home page)
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      console.log("API Products request:", req.query);
      const { categoryId, search, sortBy } = req.query;
      const filters = {
        categoryId: categoryId as string,
        search: search as string,
        sortBy: sortBy as string,
      };
      
      const products = await storage.getProducts(filters);
      console.log("API Products response length:", products.length);
      
      // Prevent caching for now
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get product by slug
  app.get('/api/products/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await storage.getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product by slug:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAdmin, async (req, res) => {
    try {

      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Cart routes
  app.get('/api/cart', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post('/api/cart', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { productId, quantity = 1 } = req.body;
      
      const cartItem = await storage.addToCart({
        userId,
        productId,
        quantity,
      });
      
      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      const message = error instanceof Error ? error.message : "Failed to add to cart";
      
      if (message.includes("out of stock")) {
        return res.status(400).json({ message: "Bu ürün şu anda stokta bulunmamaktadır." });
      }
      if (message.includes("Cannot add") && message.includes("more items")) {
        // Extract numbers from error message for better user experience
        return res.status(400).json({ message: "Sepetinizde bu üründen zaten var. Stok sınırını aştınız." });
      }
      if (message.includes("Cannot add") && message.includes("items available")) {
        return res.status(400).json({ message: "İstediğiniz miktar stok sınırını aşıyor." });
      }
      if (message.includes("Product not found")) {
        return res.status(404).json({ message: "Ürün bulunamadı." });
      }
      
      res.status(500).json({ message: "Sepete ekleme işlemi başarısız oldu." });
    }
  });

  app.put('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Sepet öğesi bulunamadı." });
      }
      
      res.json(cartItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      const message = error instanceof Error ? error.message : "Failed to update cart item";
      
      if (message.includes("Cannot update quantity") && message.includes("items available")) {
        return res.status(400).json({ message: "İstediğiniz miktar stok sınırını aşıyor." });
      }
      if (message.includes("Cart item not found")) {
        return res.status(404).json({ message: "Sepet öğesi bulunamadı." });
      }
      if (message.includes("Product not found")) {
        return res.status(404).json({ message: "Ürün bulunamadı." });
      }
      
      res.status(500).json({ message: "Sepet güncelleme işlemi başarısız oldu." });
    }
  });

  app.delete('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.removeFromCart(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.delete('/api/cart', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Order routes
  app.post('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { items } = req.body;
      
      // Calculate total amount
      let totalAmount = 0;
      const orderItems = items.map((item: any) => {
        totalAmount += parseFloat(item.price) * item.quantity;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        };
      });
      
      const order = await storage.createOrder(
        {
          userId,
          totalAmount: totalAmount.toString(),
          status: 'pending',
        },
        orderItems
      );
      
      // Clear user's cart after successful order
      await storage.clearCart(userId);
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      const message = error instanceof Error ? error.message : "Failed to create order";
      
      if (message.includes("Insufficient stock")) {
        return res.status(400).json({ message: "Sepetinizdeki bazı ürünler için yeterli stok bulunmamaktadır. Lütfen sepetinizi güncelleyiniz." });
      }
      if (message.includes("not found")) {
        return res.status(404).json({ message: "Sepetinizdeki bazı ürünler artık mevcut değil." });
      }
      
      res.status(500).json({ message: "Sipariş oluşturulurken bir hata oluştu." });
    }
  });

  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = req.session.user!;
      
      // Admins can see all orders, users can only see their own
      const orders = await storage.getOrders(
        user?.role === 'admin' ? undefined : userId
      );
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = req.session.user!;
      const orderId = req.params.id;
      
      const orderDetails = await storage.getOrderDetails(orderId);
      
      if (!orderDetails) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Users can only see their own orders, admins can see all
      if (user?.role !== 'admin' && orderDetails.order.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(orderDetails);
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  app.put('/api/orders/:id/status', isAdmin, async (req, res) => {
    try {

      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Initialize default categories and products if none exist
  app.get('/api/init', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const products = await storage.getProducts();
      let message = [];
      
      if (categories.length === 0) {
        const defaultCategories = [
          { name: "İlkokul", slug: "ilkokul", displayOrder: 1 },
          { name: "5. Sınıf", slug: "5-sinif", parentId: null, displayOrder: 2 },
          { name: "6. Sınıf", slug: "6-sinif", parentId: null, displayOrder: 3 },
          { name: "7. Sınıf", slug: "7-sinif", parentId: null, displayOrder: 4 },
          { name: "LGS", slug: "lgs", parentId: null, displayOrder: 5 },
          { name: "Lise", slug: "lise", displayOrder: 6 },
          { name: "YKS", slug: "yks", parentId: null, displayOrder: 7 },
          { name: "DGS", slug: "dgs", parentId: null, displayOrder: 8 },
          { name: "KPSS", slug: "kpss", parentId: null, displayOrder: 9 },
        ];
        
        for (const category of defaultCategories) {
          await storage.createCategory(category);
        }
        message.push("Categories initialized");
      }

      // Add sample products if none exist - this runs independently
      if (products.length === 0) {
        const updatedCategories = await storage.getCategories();
        const lgsCategory = updatedCategories.find(c => c.slug === "lgs");
        const sinif7Category = updatedCategories.find(c => c.slug === "7-sinif");
        const yksCategory = updatedCategories.find(c => c.slug === "yks");
        const kpssCategory = updatedCategories.find(c => c.slug === "kpss");
        const sinif5Category = updatedCategories.find(c => c.slug === "5-sinif");

        const sampleProducts = [
          {
            name: "LGS Matematik Denemesi - 20 Deneme",
            slug: "lgs-matematik-denemesi-20-deneme",
            description: "LGS sınavına hazırlık için özel olarak hazırlanmış 20 adet matematik denemesi. Güncel müfredata uygun, detaylı çözümlü.",
            price: "89.50",
            originalPrice: "120.00",
            categoryId: lgsCategory?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400",
            isActive: true,
            stock: 150,
            hasCoaching: true,
            discountPercentage: 25
          },
          {
            name: "7. Sınıf Türkçe Deneme Seti",
            slug: "7-sinif-turkce-deneme-seti",
            description: "7. sınıf Türkçe dersi için hazırlanmış kapsamlı deneme seti. 15 farklı deneme ve detaylı açıklamalar.",
            price: "65.90",
            originalPrice: "85.00",
            categoryId: sinif7Category?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
            isActive: true,
            stock: 89,
            hasCoaching: false,
            discountPercentage: 22
          },
          {
            name: "YKS Geometri Deneme Kitabı",
            slug: "yks-geometri-deneme-kitabi",
            description: "Üniversite sınavına hazırlık için geometri alanında 25 adet deneme. Video çözümler dahil.",
            price: "134.99",
            originalPrice: "180.00",
            categoryId: yksCategory?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=400",
            isActive: true,
            stock: 76,
            hasCoaching: true,
            discountPercentage: 25
          },
          {
            name: "KPSS Genel Kültür Deneme Soru Bankası",
            slug: "kpss-genel-kultur-deneme-soru-bankasi",
            description: "KPSS genel kültür bölümü için 1000+ soru ve 10 adet deneme sınavı içeren kapsamlı kaynak.",
            price: "156.75",
            originalPrice: "195.00",
            categoryId: kpssCategory?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400",
            isActive: true,
            stock: 45,
            hasCoaching: false,
            discountPercentage: 20
          },
          {
            name: "5. Sınıf Matematik Denemesi",
            slug: "5-sinif-matematik-denemesi",
            description: "5. sınıf öğrencileri için hazırlanmış 12 adet matematik denemesi. Oyunlaştırılmış çözüm teknikleri.",
            price: "42.50",
            originalPrice: "55.00",
            categoryId: sinif5Category?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            isActive: true,
            stock: 120,
            hasCoaching: false,
            discountPercentage: 23
          },
          {
            name: "LGS Fen Bilimleri Mega Deneme",
            slug: "lgs-fen-bilimleri-mega-deneme",
            description: "LGS Fen Bilimleri için 30 adet deneme içeren mega set. Interaktif deneyimler ve AR destekli açıklamalar.",
            price: "198.90",
            originalPrice: "250.00",
            categoryId: lgsCategory?.id || "",
            imageUrl: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=400",
            isActive: true,
            stock: 67,
            hasCoaching: true,
            discountPercentage: 20
          }
        ];

        for (const product of sampleProducts) {
          if (product.categoryId) {
            await storage.createProduct(product);
          }
        }
        message.push("Sample products created");
      }
      
      if (message.length === 0) {
        message.push("Database already initialized");
      }
      
      res.json({ message: message.join(", ") });
    } catch (error) {
      console.error("Error initializing database:", error);
      res.status(500).json({ message: "Failed to initialize database" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
