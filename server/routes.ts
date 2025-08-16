import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword, comparePassword } from "./customAuth";
import { z } from "zod";
import { insertProductSchema, insertCategorySchema, loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@shared/schema";

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
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.put('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json(cartItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
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
      res.status(500).json({ message: "Failed to create order" });
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
