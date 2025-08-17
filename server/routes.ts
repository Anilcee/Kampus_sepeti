import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword, comparePassword } from "./customAuth";
import { z } from "zod";
import { insertProductSchema, insertCategorySchema, loginSchema, registerSchema, updateProfileSchema, insertAddressSchema, insertExamSchema, startExamSchema, submitExamSchema, submitAnswerSchema, uploadExcelAnswerKeySchema, type LoginInput, type RegisterInput, type UpdateProfileInput } from "@shared/schema";
import * as XLSX from 'xlsx';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel dosyaları (.xlsx, .xls) kabul edilir'));
    }
  }
});

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

  // Product-Exam relationship routes
  app.post('/api/products/exams', isAdmin, async (req, res) => {
    try {
      const { productId, examIds } = req.body;
      
      if (!productId || !Array.isArray(examIds)) {
        return res.status(400).json({ message: "Product ID ve exam IDs gerekli" });
      }

      // Remove existing relationships for this product
      await storage.removeProductExams(productId);
      
      // Add new relationships
      for (const examId of examIds) {
        await storage.addProductExam({ productId, examId });
      }
      
      res.json({ message: "Ürün-deneme ilişkileri güncellendi", count: examIds.length });
    } catch (error) {
      console.error("Error updating product-exam relationships:", error);
      res.status(500).json({ message: "Ürün-deneme ilişkileri güncellenirken hata oluştu" });
    }
  });

  app.get('/api/products/:id/exams', async (req, res) => {
    try {
      const productExams = await storage.getProductExams(req.params.id);
      res.json(productExams);
    } catch (error) {
      console.error("Error fetching product exams:", error);
      res.status(500).json({ message: "Ürün denemeleri yüklenirken hata oluştu" });
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
      
      // If order is confirmed, grant exam access to user
      if (status === 'confirmed') {
        try {
          const orderDetails = await storage.getOrderDetails(req.params.id);
          if (orderDetails) {
            // For each product in the order, grant access to associated exams
            for (const item of orderDetails.items) {
              const productExams = await storage.getProductExams(item.productId);
              
              for (const exam of productExams) {
                // Check if user already has access to prevent duplicates
                const hasAccess = await storage.hasExamAccess(orderDetails.order.userId, exam.id);
                if (!hasAccess) {
                  await storage.grantExamAccess(orderDetails.order.userId, exam.id, req.params.id);
                }
              }
            }
            console.log(`Granted exam access for order ${req.params.id} to user ${orderDetails.order.userId}`);
          }
        } catch (accessError) {
          console.error("Error granting exam access:", accessError);
          // Don't fail the order status update if exam access fails
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // EXAM SYSTEM ROUTES
  // Get all active exams (admin sees all, students see only accessible ones)
  app.get('/api/exams', async (req, res) => {
    try {
      const isAdmin = req.session.userId && (await storage.getUser(req.session.userId))?.role === 'admin';
      
      if (isAdmin) {
        // Admin sees all exams
        const exams = await storage.getExams();
        res.json(exams);
      } else if (req.session.userId) {
        // Student sees only accessible exams
        const exams = await storage.getUserExamAccess(req.session.userId);
        res.json(exams);
      } else {
        // Not authenticated - no exams
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      res.status(500).json({ message: "Sınavlar yüklenirken bir hata oluştu" });
    }
  });

  // Get exam by ID (check access for students)
  app.get('/api/exams/:id', async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ message: "Sınav bulunamadı" });
      }

      // Check access for non-admin users
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        const isAdmin = user?.role === 'admin';
        
        if (!isAdmin) {
          const hasAccess = await storage.hasExamAccess(req.session.userId, req.params.id);
          if (!hasAccess) {
            return res.status(403).json({ message: "Bu sınava erişim izniniz yok" });
          }
        }
      }
      
      res.json(exam);
    } catch (error) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Sınav yüklenirken bir hata oluştu" });
    }
  });

  // Create exam (admin only)
  app.post('/api/exams', isAdmin, async (req, res) => {
    try {
      const examData = insertExamSchema.parse({
        ...req.body,
        createdByAdminId: req.session.userId,
      });
      const exam = await storage.createExam(examData);
      res.status(201).json(exam);
    } catch (error) {
      console.error("Error creating exam:", error);
      res.status(500).json({ message: "Sınav oluşturulurken bir hata oluştu" });
    }
  });

  // Update exam (admin only)
  app.put('/api/exams/:id', isAdmin, async (req, res) => {
    try {
      const examData = insertExamSchema.partial().parse(req.body);
      const exam = await storage.updateExam(req.params.id, examData);
      if (!exam) {
        return res.status(404).json({ message: "Sınav bulunamadı" });
      }
      res.json(exam);
    } catch (error) {
      console.error("Error updating exam:", error);
      res.status(500).json({ message: "Sınav güncellenirken bir hata oluştu" });
    }
  });

  // Delete exam (admin only)
  app.delete('/api/exams/:id', isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteExam(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Sınav bulunamadı" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Sınav silinirken bir hata oluştu" });
    }
  });

  // Start exam session
  app.post('/api/exam-sessions/start', isAuthenticated, async (req, res) => {
    try {
      const { examId, bookletType } = startExamSchema.parse(req.body);
      
      // Check if user has access to this exam (unless admin)
      const user = await storage.getUser(req.session.userId!);
      const isAdmin = user?.role === 'admin';
      
      if (!isAdmin) {
        const hasAccess = await storage.hasExamAccess(req.session.userId!, examId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Bu sınava erişim izniniz yok. Önce ilgili paketi satın alınız." });
        }
      }
      
      const session = await storage.startExamSession(examId, req.session.userId!, bookletType);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error starting exam session:", error);
      res.status(500).json({ message: "Sınav oturumu başlatılırken bir hata oluştu" });
    }
  });

  // Get exam session
  app.get('/api/exam-sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getExamSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Sınav oturumu bulunamadı" });
      }
      
      // Check if user owns this session or is admin
      const user = req.session.user!;
      if (session.studentId !== req.session.userId && (user as any)?.role !== 'admin') {
        return res.status(403).json({ message: "Bu sınav oturumuna erişim izniniz yok" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching exam session:", error);
      res.status(500).json({ message: "Sınav oturumu yüklenirken bir hata oluştu" });
    }
  });

  // Update exam session answers (save progress)
  app.put('/api/exam-sessions/:id/answers', isAuthenticated, async (req, res) => {
    try {
      const { answers } = req.body;
      const session = await storage.updateExamSession(req.params.id, answers);
      if (!session) {
        return res.status(404).json({ message: "Sınav oturumu bulunamadı" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating exam session:", error);
      res.status(500).json({ message: "Cevaplar kaydedilirken bir hata oluştu" });
    }
  });

  // Submit exam (complete)
  app.post('/api/exam-sessions/:id/submit', isAuthenticated, async (req, res) => {
    try {
      const { studentAnswers } = submitExamSchema.parse({
        sessionId: req.params.id,
        studentAnswers: req.body.studentAnswers,
      });
      
      const result = await storage.submitExamSession(req.params.id, studentAnswers);
      res.json(result);
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Sınav teslim edilirken bir hata oluştu" });
    }
  });

  // Upload Excel answer key (admin only)
  app.post('/api/exams/:id/upload-answer-key', isAdmin, upload.single('excelFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Excel dosyası yüklenmemiş" });
      }

      const examId = req.params.id;
      const bookletType = req.body.bookletType;

      if (!bookletType || !['A', 'B', 'C', 'D'].includes(bookletType)) {
        return res.status(400).json({ message: "Geçerli bir kitapçık türü seçiniz (A, B, C, D)" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Parse answer key and acquisitions from Excel
      const answerKey: Record<string, string> = {};
      const acquisitions: Record<string, string> = {};
      
      // Skip header row, start from row 1 (index 1)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (row && row.length >= 3) {
          const questionNum = row[0]?.toString().trim();
          const answer = row[1]?.toString().trim().toUpperCase();
          const acquisition = row[2]?.toString().trim();
          
          if (questionNum && answer && ['A', 'B', 'C', 'D'].includes(answer)) {
            answerKey[questionNum] = answer;
            if (acquisition) {
              acquisitions[questionNum] = acquisition;
            }
          }
        }
      }

      if (Object.keys(answerKey).length === 0) {
        return res.status(400).json({ 
          message: "Excel dosyasında geçerli cevap anahtarı bulunamadı. Format: Soru No | Cevap | Kazanım" 
        });
      }

      // Update exam with new answer key and acquisitions
      const updatedExam = await storage.updateExam(examId, {
        answerKey,
        acquisitions,
        totalQuestions: Object.keys(answerKey).length
      });

      if (!updatedExam) {
        return res.status(404).json({ message: "Sınav bulunamadı" });
      }

      // Create or update booklet
      await storage.createOrUpdateExamBooklet({
        examId,
        bookletCode: bookletType,
        questionOrder: Object.keys(answerKey).map(q => parseInt(q)).sort((a, b) => a - b)
      });

      res.json({ 
        message: "Cevap anahtarı başarıyla yüklendi",
        answerCount: Object.keys(answerKey).length,
        acquisitionCount: Object.keys(acquisitions).length
      });

    } catch (error) {
      console.error("Error uploading Excel answer key:", error);
      res.status(500).json({ message: "Excel dosyası yüklenirken bir hata oluştu" });
    }
  });

  // Upload Excel and create a single exam (admin only)
  app.post('/api/exams/upload', isAdmin, upload.single('excelFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Excel dosyası yüklenmemiş" });
      }

      const name = (req.body.name || '').toString().trim();
      const durationMinutes = parseInt(req.body.durationMinutes || '0', 10) || 0;
      if (!name || !durationMinutes) {
        return res.status(400).json({ message: "Sınav adı ve süre zorunludur" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!rows || rows.length < 3) {
        return res.status(400).json({ message: "Excel sayfası boş veya geçersiz" });
      }

      const lowerTr = (v:any) => (v ?? '').toString().toLocaleLowerCase('tr-TR');
      const upperTr = (v:any) => (v ?? '').toString().toLocaleUpperCase('tr-TR');

      // Başlık satırını bul (genelde 1. satır)
      let headerIndex = 0;
      const headerRow = rows[headerIndex] as string[];
      
      // Yeni sütun yapısına göre indeksleri sabit tanımla
      // 1. sütun (0): Kitapçık - geçilecek
      // 2. sütun (1): Test
      // 3. sütun (2): Ders  
      // 4. sütun (3): A Soru
      // 5. sütun (4): B Soru
      // 6. sütun (5): Cevap
      // 7. sütun (6): Kazanım Kodu
      // 8. sütun (7): Kazanım Adı
      
      const idxTest = 1;
      const idxDers = 2;
      const idxASoru = 3;
      const idxBSoru = 4;
      const idxCevap = 5;
      const idxKazanimKodu = 6;
      const idxKazanimAdi = 7;

      if (rows.length < 2) {
        return res.status(400).json({ message: "Excel dosyasında yeterli veri yok" });
      }

      const startIndex = headerIndex + 1;
      const parsed: Array<{
        canonical: number;
        answer?: string;
        acquisition?: string;
        acquisitionCode?: string;
        subject?: string;
        test?: string;
        posByBooklet: Record<string, number>;
      }> = [];

      const readInt = (val: any): number | null => {
        if (typeof val === 'number' && Number.isFinite(val)) return Math.trunc(val);
        const s = (val ?? '').toString().trim();
        if (/^\d{1,3}$/.test(s)) return parseInt(s, 10);
        return null;
      };

      // Test bazlı organizasyon için
      const testGroups: Record<string, any[]> = {};
      const testOrder: string[] = []; // Excel'deki test sırasını korumak için

      for (let i = startIndex; i < rows.length; i++) {
        const r = rows[i] as any[];
        if (!r || r.every(c => (c === null || c === undefined || c === ''))) continue;

        // Test adı
        const test = (r[idxTest] ?? '').toString().trim();
        if (!test) continue;

        // Ders
        const subject = (r[idxDers] ?? '').toString().trim();

        // A ve B Soru değerleri
        const aSoruVal = readInt(r[idxASoru]);
        const bSoruVal = readInt(r[idxBSoru]);
        
        if (aSoruVal == null) continue;

        // Cevap
        let answer: string | undefined;
        const raw = r[idxCevap];
        const v = upperTr(raw).trim();
        if (/^[A-E]$/.test(v)) answer = v;

        // Kazanım kodu ve adı
        const acquisitionCode = (r[idxKazanimKodu] ?? '').toString().trim();
        const acquisition = (r[idxKazanimAdi] ?? '').toString().trim();

        // Kitapçık pozisyonları
        const posByBooklet: Record<string, number> = {};
        if (aSoruVal != null) posByBooklet['A'] = aSoruVal;
        if (bSoruVal != null) posByBooklet['B'] = bSoruVal;

        // Test grubuna ekle
        if (!testGroups[test]) {
          testGroups[test] = [];
          testOrder.push(test); // Excel'deki sırayı koru
        }

        testGroups[test].push({
          canonical: 0, // Sonradan ayarlanacak
          answer,
          acquisition,
          acquisitionCode,
          subject,
          test,
          posByBooklet,
          originalRowIndex: i
        });
      }

      // Her test için canonical numaraları yeniden düzenle - Excel sırasına göre
      let globalCanonical = 1;
      for (const testName of testOrder) {
        const testQuestions = testGroups[testName];
        
        // A kitapçığı sırasına göre sırala
        testQuestions.sort((a, b) => (a.posByBooklet['A'] || 999) - (b.posByBooklet['A'] || 999));
        
        // Canonical numaraları ata
        testQuestions.forEach((q, idx) => {
          q.canonical = globalCanonical++;
          parsed.push(q);
        });
      }

      if (parsed.length === 0) {
        return res.status(400).json({ message: "Excel'de geçerli soru bulunamadı" });
      }

      // Artık kanonik numaralar zaten 1..N sıralı
      const totalQuestions = parsed.length;

      // Sınav verilerini hazırla
      const answerKey: Record<string, string> = {};
      const acquisitions: Record<string, string> = {};
      const acquisitionCodes: Record<string, string> = {};
      const questionSubjects: Record<string, string> = {};
      const questionTests: Record<string, string> = {};
      
      for (const p of parsed) {
        if (p.answer) answerKey[String(p.canonical)] = p.answer;
        if (p.acquisition) acquisitions[String(p.canonical)] = p.acquisition;
        if (p.acquisitionCode) acquisitionCodes[String(p.canonical)] = p.acquisitionCode;
        if (p.subject) questionSubjects[String(p.canonical)] = p.subject;
        if (p.test) questionTests[String(p.canonical)] = p.test;
      }

      // Sınavı oluştur
      const exam = await storage.createExam({
        name,
        description: req.body.description || '',
        subject: 'Karma',
        durationMinutes,
        totalQuestions,
        answerKey,
        acquisitions,
        acquisitionCodes,
        questionSubjects,
        questionTests,
        createdByAdminId: req.session.userId!,
        isActive: true,
      });

      // Kitapçıkları oluştur
      const usedBooklets = new Set<string>();
      parsed.forEach(p => Object.keys(p.posByBooklet).forEach(c => usedBooklets.add(c)));

      if (usedBooklets.size === 0) {
        await storage.createOrUpdateExamBooklet({
          examId: exam.id,
          bookletCode: 'A',
          questionOrder: Array.from({length: totalQuestions}, (_, i) => i + 1),
        });
      } else {
        for (const code of Array.from(usedBooklets).sort()) {
          const withPos = parsed
            .filter(p => typeof p.posByBooklet[code] === 'number')
            .sort((a,b) => (a.posByBooklet[code] || 999) - (b.posByBooklet[code] || 999));
          const order = withPos.map(p => p.canonical);
          const finalOrder = order.length > 0 ? order : Array.from({length: totalQuestions}, (_, i) => i + 1);
          await storage.createOrUpdateExamBooklet({
            examId: exam.id,
            bookletCode: code,
            questionOrder: finalOrder,
          });
        }
      }

      res.status(201).json({ 
        message: "Sınav oluşturuldu", 
        examId: exam.id, 
        totalQuestions, 
        booklets: Array.from(usedBooklets),
        answerCount: Object.keys(answerKey).length
      });
    } catch (error) {
      console.error('Error uploading exam via Excel:', error);
      res.status(500).json({ message: "Excel'den sınav oluşturulurken hata oluştu" });
    }
  });

  // Get student's exam history
  app.get('/api/my-exam-sessions', isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getStudentExamSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching student exam sessions:", error);
      res.status(500).json({ message: "Sınav geçmişi yüklenirken bir hata oluştu" });
    }
  });

  // Alternative endpoint for exam history (compatibility)
  app.get('/api/exams/gecmis', isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getStudentExamSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching student exam sessions:", error);
      res.status(500).json({ message: "Sınav geçmişi yüklenirken bir hata oluştu" });
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

      // Add sample exams if none exist
      const exams = await storage.getExams();
      if (exams.length === 0 && categories.length > 0) {
        // LGS Matematik Deneme Sınavı - Gerçekçi cevap anahtarı
        const mathExam = await storage.createExam({
          name: "LGS Matematik Deneme Sınavı - 2024",
          description: "8. sınıf öğrencileri için kapsamlı matematik deneme sınavı. Sayılar, cebir, geometri, veri analizi konularını kapsar. MEB müfredatına uygun hazırlanmıştır.",
          subject: "Matematik", 
          durationMinutes: 80,
          totalQuestions: 20,
          answerKey: {
            "1": "B", "2": "A", "3": "D", "4": "C", "5": "A",
            "6": "D", "7": "B", "8": "C", "9": "A", "10": "D", 
            "11": "C", "12": "B", "13": "D", "14": "A", "15": "C",
            "16": "A", "17": "B", "18": "D", "19": "C", "20": "A"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2",
          isActive: true,
        });

        // YKS Türkçe Deneme Sınavı - Gerçekçi cevap anahtarı
        const turkishExam = await storage.createExam({
          name: "YKS Türkçe Deneme Sınavı - 2024",
          description: "12. sınıf öğrencileri için kapsamlı Türkçe deneme sınavı. Dil ve anlatım, edebiyat, okuma anlama konularını içerir. YKS formatında hazırlanmıştır.",
          subject: "Türkçe",
          durationMinutes: 120,
          totalQuestions: 40,
          answerKey: {
            "1": "C", "2": "A", "3": "B", "4": "D", "5": "A", "6": "C", "7": "B", "8": "D",
            "9": "A", "10": "D", "11": "C", "12": "B", "13": "A", "14": "D", "15": "C", "16": "B",
            "17": "D", "18": "A", "19": "C", "20": "B", "21": "A", "22": "D", "23": "C", "24": "B",
            "25": "D", "26": "A", "27": "B", "28": "C", "29": "A", "30": "D", "31": "B", "32": "C",
            "33": "A", "34": "D", "35": "C", "36": "B", "37": "A", "38": "D", "39": "C", "40": "B"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2", 
          isActive: true,
        });

        // AYT Fizik Deneme Sınavı
        const physicsExam = await storage.createExam({
          name: "AYT Fizik Deneme Sınavı - 2024",
          description: "12. sınıf öğrencileri için fizik deneme sınavı. Mekanik, termodinamik, elektrik-manyetizma, modern fizik konularını kapsar.",
          subject: "Fizik",
          durationMinutes: 180,
          totalQuestions: 14,
          answerKey: {
            "1": "B", "2": "D", "3": "A", "4": "C", "5": "D", "6": "A", "7": "B",
            "8": "C", "9": "D", "10": "A", "11": "B", "12": "C", "13": "D", "14": "A"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2",
          isActive: true,
        });

        // KPSS Genel Kültür Deneme Sınavı
        const kpssExam = await storage.createExam({
          name: "KPSS Genel Kültür Deneme Sınavı",
          description: "KPSS sınavına hazırlanan adaylar için genel kültür deneme sınavı. Türkçe, tarih, coğrafya, vatandaşlık konularını içerir.",
          subject: "Genel Kültür",
          durationMinutes: 135,
          totalQuestions: 60,
          answerKey: {
            "1": "A", "2": "C", "3": "B", "4": "D", "5": "A", "6": "B", "7": "D", "8": "C",
            "9": "A", "10": "D", "11": "B", "12": "C", "13": "D", "14": "A", "15": "C", "16": "B",
            "17": "A", "18": "D", "19": "C", "20": "B", "21": "D", "22": "A", "23": "B", "24": "C",
            "25": "A", "26": "D", "27": "C", "28": "B", "29": "A", "30": "D", "31": "B", "32": "C",
            "33": "D", "34": "A", "35": "C", "36": "B", "37": "D", "38": "A", "39": "B", "40": "C",
            "41": "A", "42": "D", "43": "C", "44": "B", "45": "A", "46": "D", "47": "B", "48": "C",
            "49": "D", "50": "A", "51": "C", "52": "B", "53": "A", "54": "D", "55": "C", "56": "B",
            "57": "D", "58": "A", "59": "B", "60": "C"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2",
          isActive: true,
        });

        // LGS Fen Bilimleri Deneme Sınavı
        const scienceExam = await storage.createExam({
          name: "LGS Fen Bilimleri Deneme Sınavı",
          description: "8. sınıf öğrencileri için fen bilimleri deneme sınavı. Fizik, kimya, biyoloji ve yer bilimleri konularını kapsar.",
          subject: "Fen Bilimleri",
          durationMinutes: 80,
          totalQuestions: 20,
          answerKey: {
            "1": "D", "2": "B", "3": "A", "4": "C", "5": "D", "6": "A", "7": "C", "8": "B",
            "9": "D", "10": "A", "11": "B", "12": "C", "13": "A", "14": "D", "15": "B", "16": "C",
            "17": "A", "18": "D", "19": "C", "20": "B"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2",
          isActive: true,
        });

        // DGS Sayısal Deneme Sınavı
        const dgsExam = await storage.createExam({
          name: "DGS Sayısal Deneme Sınavı",
          description: "DGS sınavına hazırlanan adaylar için sayısal bölüm deneme sınavı. Matematik ve geometri konularını içerir.",
          subject: "Matematik",
          durationMinutes: 150,
          totalQuestions: 30,
          answerKey: {
            "1": "B", "2": "A", "3": "D", "4": "C", "5": "A", "6": "D", "7": "B", "8": "C",
            "9": "A", "10": "D", "11": "C", "12": "B", "13": "D", "14": "A", "15": "C", "16": "B",
            "17": "A", "18": "D", "19": "B", "20": "C", "21": "D", "22": "A", "23": "C", "24": "B",
            "25": "A", "26": "D", "27": "B", "28": "C", "29": "D", "30": "A"
          },
          createdByAdminId: "540c3948-dd72-40cf-ba11-fdf0eb5d10a2",
          isActive: true,
        });

        // Create booklets for exams
        if (mathExam) {
          await storage.createExamBooklet({
            examId: mathExam.id,
            bookletCode: "A",
            questionOrder: Array.from({length: 20}, (_, i) => i + 1),
          });
          await storage.createExamBooklet({
            examId: mathExam.id,
            bookletCode: "B", 
            questionOrder: Array.from({length: 20}, (_, i) => i + 1).reverse(),
          });
        }

        if (turkishExam) {
          await storage.createExamBooklet({
            examId: turkishExam.id,
            bookletCode: "A",
            questionOrder: Array.from({length: 40}, (_, i) => i + 1),
          });
          await storage.createExamBooklet({
            examId: turkishExam.id,
            bookletCode: "B",
            questionOrder: Array.from({length: 40}, (_, i) => i + 1).reverse(),
          });
        }

        message.push("Sample exams initialized");
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
