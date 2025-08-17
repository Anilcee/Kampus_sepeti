import {
  users,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  addresses,
  exams,
  examBooklets,
  examSessions,
  productExams,
  userExamAccess,
  type User,
  type UpsertUser,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type CartItemWithProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type ProductWithCategory,
  type Address,
  type InsertAddress,
  type Exam,
  type InsertExam,
  type ExamBooklet,
  type InsertExamBooklet,
  type ExamSession,
  type InsertExamSession,
  type ExamWithBooklets,
  type ExamSessionWithExam,
  type ExamResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations for custom authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profileData: Partial<User>): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getProducts(filters?: {
    categoryId?: string;
    search?: string;
    sortBy?: string;
  }): Promise<ProductWithCategory[]>;
  getProduct(id: string): Promise<ProductWithCategory | undefined>;
  getProductBySlug(slug: string): Promise<ProductWithCategory | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Address operations
  getAddresses(userId: string): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string): Promise<boolean>;
  setDefaultAddress(userId: string, addressId: string): Promise<boolean>;
  
  // Cart operations
  getCartItems(userId: string): Promise<CartItemWithProduct[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;
  
  // Order operations
  createOrder(order: InsertOrder, orderItems: InsertOrderItem[]): Promise<Order>;
  getOrders(userId?: string): Promise<(Order & { items?: Array<OrderItem & { product: Product }> })[]>;
  getOrderDetails(orderId: string): Promise<{order: Order, items: Array<OrderItem & {product: Product}>} | null>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  // Exam operations
  getExams(): Promise<ExamWithBooklets[]>;
  getExam(id: string): Promise<ExamWithBooklets | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<boolean>;
  
  // Exam session operations
  startExamSession(examId: string, studentId: string, bookletType: string): Promise<ExamSession>;
  getExamSession(sessionId: string): Promise<ExamSessionWithExam | undefined>;
  updateExamSession(sessionId: string, answers: Record<string, string>): Promise<ExamSession | undefined>;
  submitExamSession(sessionId: string, answers: Record<string, string>): Promise<ExamResult>;
  getStudentExamSessions(studentId: string): Promise<ExamSessionWithExam[]>;
  
  // Exam booklet operations
  createExamBooklet(booklet: InsertExamBooklet): Promise<ExamBooklet>;
  createOrUpdateExamBooklet(booklet: InsertExamBooklet): Promise<ExamBooklet>;
  getExamBooklets(examId: string): Promise<ExamBooklet[]>;
  
  // Product-Exam relationship operations
  addProductExam(data: { productId: string; examId: string }): Promise<void>;
  removeProductExams(productId: string): Promise<void>;
  getProductExams(productId: string): Promise<ExamWithBooklets[]>;
  
  // User exam access operations
  grantExamAccess(userId: string, examId: string, orderId?: string): Promise<void>;
  getUserExamAccess(userId: string): Promise<ExamWithBooklets[]>;
  hasExamAccess(userId: string, examId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profileData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.displayOrder, categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getProducts(filters?: {
    categoryId?: string;
    search?: string;
    sortBy?: string;
  }): Promise<ProductWithCategory[]> {
    try {
      let whereConditions = [eq(products.isActive, true)];

      if (filters?.categoryId) {
        whereConditions.push(eq(products.categoryId, filters.categoryId));
      }

      if (filters?.search) {
        const searchCondition = or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        );
        if (searchCondition) {
          whereConditions.push(searchCondition);
        }
      }

      const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

      const results = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause);
    
      const mappedResults = results.map((result: any) => ({
        ...result.products,
        category: result.categories,
      }));
      
      return mappedResults;
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }

  async getProduct(id: string): Promise<ProductWithCategory | undefined> {
    const [result] = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    
    if (!result) return undefined;
    
    return {
      ...result.products,
      category: result.categories,
    } as ProductWithCategory;
  }

  async getProductBySlug(slug: string): Promise<ProductWithCategory | undefined> {
    const [result] = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));
    
    if (!result) return undefined;
    
    return {
      ...result.products,
      category: result.categories,
    } as ProductWithCategory;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Address operations
  async getAddresses(userId: string): Promise<Address[]> {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    return await db.transaction(async (tx) => {
      // If this is the first address or marked as default, unset other defaults
      if (address.isDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userId, address.userId));
      } else {
        // If no default address exists, make this the default
        const existingAddresses = await tx
          .select()
          .from(addresses)
          .where(eq(addresses.userId, address.userId));
        
        if (existingAddresses.length === 0) {
          address.isDefault = true;
        }
      }

      const [newAddress] = await tx.insert(addresses).values(address).returning();
      return newAddress;
    });
  }

  async updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined> {
    return await db.transaction(async (tx) => {
      // If setting as default, unset other defaults for this user
      if (address.isDefault) {
        const [currentAddress] = await tx
          .select()
          .from(addresses)
          .where(eq(addresses.id, id));
        
        if (currentAddress) {
          await tx
            .update(addresses)
            .set({ isDefault: false })
            .where(and(
              eq(addresses.userId, currentAddress.userId),
              eq(addresses.isDefault, true)
            ));
        }
      }

      const [updatedAddress] = await tx
        .update(addresses)
        .set({ ...address, updatedAt: new Date() })
        .where(eq(addresses.id, id))
        .returning();
      
      return updatedAddress;
    });
  }

  async deleteAddress(id: string): Promise<boolean> {
    const result = await db.delete(addresses).where(eq(addresses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Unset all default addresses for this user
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));

      // Set the specified address as default
      const result = await tx
        .update(addresses)
        .set({ isDefault: true })
        .where(and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId)
        ));

      return (result.rowCount || 0) > 0;
    });
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItemWithProduct[]> {
    const results = await db
      .select()
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
    
    return results.map(result => ({
      ...result.cart_items,
      product: result.products!,
    }));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Get product to check stock
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, cartItem.productId));

    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.stock || product.stock <= 0) {
      throw new Error("Product is out of stock");
    }

    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, cartItem.userId),
          eq(cartItems.productId, cartItem.productId)
        )
      );

    if (existingItem) {
      // Check if new quantity would exceed stock
      const newQuantity = (existingItem.quantity || 0) + (cartItem.quantity || 0);
      if (newQuantity > product.stock) {
        throw new Error(`Cannot add ${cartItem.quantity} more items. You already have ${existingItem.quantity} in cart. Only ${product.stock} items available in stock`);
      }

      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({ 
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Check if requested quantity exceeds stock
      if ((cartItem.quantity || 0) > product.stock) {
        throw new Error(`Cannot add ${cartItem.quantity} items. Only ${product.stock} items available in stock`);
      }

      // Create new cart item
      const [newItem] = await db.insert(cartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    // Get cart item with product info
    const [cartItem] = await db
      .select({
        cartItem: cartItems,
        product: products
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.id, id));

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    if (!cartItem.product) {
      throw new Error("Product not found");
    }

    // Check if requested quantity exceeds stock
    if (quantity > (cartItem.product.stock || 0)) {
      throw new Error(`Cannot update quantity to ${quantity}. Only ${cartItem.product.stock} items available in stock`);
    }

    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.rowCount || 0) > 0;
  }

  // Order operations
  async createOrder(order: InsertOrder, orderItemsData: InsertOrderItem[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      // Check stock for all items before proceeding
      for (const item of orderItemsData) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (!product.stock || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.stock || 0}`);
        }
      }

      const [newOrder] = await tx.insert(orders).values(order).returning();

      const orderItemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        orderId: newOrder.id,
      }));

      await tx.insert(orderItems).values(orderItemsWithOrderId);

      // Reduce stock for all items
      for (const item of orderItemsData) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (product && typeof product.stock === 'number') {
          const newStock = product.stock - item.quantity;
          await tx.update(products)
            .set({ stock: newStock, updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }
      }

      return newOrder;
    });
  }

  async getOrders(userId?: string): Promise<(Order & { items?: Array<OrderItem & { product: Product }> })[]> {
    let ordersQuery;
    if (userId) {
      ordersQuery = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    } else {
      ordersQuery = await db.select().from(orders).orderBy(desc(orders.createdAt));
    }
    
    // Her sipariş için ürünleri de getir
    const ordersWithItems = await Promise.all(
      ordersQuery.map(async (order) => {
        const items = await db
          .select({
            // OrderItem fields
            id: orderItems.id,
            orderId: orderItems.orderId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            price: orderItems.price,
            createdAt: orderItems.createdAt,
            // Product fields
            product: products
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, order.id))
          .limit(3); // Sadece ilk 3 ürünü göster

        const formattedItems = items.map(item => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          createdAt: item.createdAt,
          product: item.product!
        }));

        return {
          ...order,
          items: formattedItems
        };
      })
    );

    return ordersWithItems;
  }

  async getOrderDetails(orderId: string): Promise<{order: Order, items: Array<OrderItem & {product: Product}>} | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    
    if (!order) {
      return null;
    }

    const items = await db
      .select({
        // OrderItem fields
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        createdAt: orderItems.createdAt,
        // Product fields
        product: products
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    const formattedItems = items.map(item => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      createdAt: item.createdAt,
      product: item.product!
    }));

    return {
      order,
      items: formattedItems
    };
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // EXAM OPERATIONS
  async getExams(): Promise<ExamWithBooklets[]> {
    const results = await db
      .select()
      .from(exams)
      .leftJoin(examBooklets, eq(exams.id, examBooklets.examId))
      .where(eq(exams.isActive, true))
      .orderBy(desc(exams.createdAt));

    const examMap = new Map<string, ExamWithBooklets>();
    
    results.forEach((row) => {
      const exam = row.exams;
      const booklet = row.exam_booklets;
      
      if (!examMap.has(exam.id)) {
        examMap.set(exam.id, { ...exam, booklets: [] });
      }
      
      if (booklet) {
        examMap.get(exam.id)!.booklets.push(booklet);
      }
    });
    
    return Array.from(examMap.values());
  }

  async getExam(id: string): Promise<ExamWithBooklets | undefined> {
    const results = await db
      .select()
      .from(exams)
      .leftJoin(examBooklets, eq(exams.id, examBooklets.examId))
      .where(and(eq(exams.id, id), eq(exams.isActive, true)));

    if (results.length === 0) return undefined;

    const exam = results[0].exams;
    const booklets = results
      .filter(row => row.exam_booklets)
      .map(row => row.exam_booklets!);

    return { ...exam, booklets };
  }

  async createExam(examData: InsertExam): Promise<Exam> {
    const [exam] = await db.insert(exams).values(examData).returning();
    return exam;
  }

  async updateExam(id: string, examData: Partial<InsertExam>): Promise<Exam | undefined> {
    const [updatedExam] = await db
      .update(exams)
      .set({ ...examData, updatedAt: new Date() })
      .where(eq(exams.id, id))
      .returning();
    return updatedExam;
  }

  async deleteExam(id: string): Promise<boolean> {
    const [updatedExam] = await db
      .update(exams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(exams.id, id))
      .returning();
    return !!updatedExam;
  }

  // EXAM SESSION OPERATIONS
  async startExamSession(examId: string, studentId: string, bookletType: string): Promise<ExamSession> {
    // Check if student already has an active session for this exam
    const existingSession = await db
      .select()
      .from(examSessions)
      .where(
        and(
          eq(examSessions.examId, examId),
          eq(examSessions.studentId, studentId),
          eq(examSessions.status, "started")
        )
      )
      .limit(1);

    if (existingSession.length > 0) {
      return existingSession[0];
    }

    const [session] = await db
      .insert(examSessions)
      .values({
        examId,
        studentId,
        bookletType,
        status: "started",
        studentAnswers: {},
      })
      .returning();
    
    return session;
  }

  async getExamSession(sessionId: string): Promise<ExamSessionWithExam | undefined> {
    const [result] = await db
      .select()
      .from(examSessions)
      .leftJoin(exams, eq(examSessions.examId, exams.id))
      .where(eq(examSessions.id, sessionId));

    if (!result) return undefined;

    return {
      ...result.exam_sessions,
      exam: result.exams!,
    };
  }

  async updateExamSession(sessionId: string, answers: Record<string, string>): Promise<ExamSession | undefined> {
    const [updatedSession] = await db
      .update(examSessions)
      .set({ 
        studentAnswers: answers,
      })
      .where(eq(examSessions.id, sessionId))
      .returning();
    
    return updatedSession;
  }

  async submitExamSession(sessionId: string, answers: Record<string, string>): Promise<ExamResult> {
    return await db.transaction(async (tx) => {
      // Get session with exam data
      const [sessionWithExam] = await tx
        .select()
        .from(examSessions)
        .leftJoin(exams, eq(examSessions.examId, exams.id))
        .where(eq(examSessions.id, sessionId));

      if (!sessionWithExam) {
        throw new Error("Session not found");
      }

      const session = sessionWithExam.exam_sessions;
      const exam = sessionWithExam.exams!;
      
      // Calculate score
      const correctAnswers = Object.entries(answers).filter(
        ([question, answer]) => {
          const correctAnswer = (exam.answerKey as Record<string, string>)[question];
          return answer && answer === correctAnswer;
        }
      ).length;
      
      const totalQuestions = exam.totalQuestions;
      const incorrectAnswers = Object.entries(answers).filter(
        ([question, answer]) => {
          const correctAnswer = (exam.answerKey as Record<string, string>)[question];
          return answer && answer !== correctAnswer;
        }
      ).length;
      
      const emptyAnswers = totalQuestions - Object.values(answers).filter(a => a && a.trim() !== "").length;
      const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Update session
      const [updatedSession] = await tx
        .update(examSessions)
        .set({
          studentAnswers: answers,
          score: correctAnswers,
          percentage: percentage.toString(),
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(examSessions.id, sessionId))
        .returning();

      return {
        session: updatedSession,
        exam,
        correctAnswers,
        incorrectAnswers,
        emptyAnswers,
      };
    });
  }

  async getStudentExamSessions(studentId: string): Promise<ExamSessionWithExam[]> {
    const results = await db
      .select()
      .from(examSessions)
      .leftJoin(exams, eq(examSessions.examId, exams.id))
      .where(eq(examSessions.studentId, studentId))
      .orderBy(desc(examSessions.createdAt));

    return results.map(result => ({
      ...result.exam_sessions,
      exam: result.exams!,
    }));
  }

  // EXAM BOOKLET OPERATIONS
  async createExamBooklet(bookletData: InsertExamBooklet): Promise<ExamBooklet> {
    const [booklet] = await db.insert(examBooklets).values(bookletData).returning();
    return booklet;
  }

  async createOrUpdateExamBooklet(bookletData: InsertExamBooklet): Promise<ExamBooklet> {
    // Check if booklet already exists
    const [existingBooklet] = await db
      .select()
      .from(examBooklets)
      .where(
        and(
          eq(examBooklets.examId, bookletData.examId),
          eq(examBooklets.bookletCode, bookletData.bookletCode)
        )
      );

    if (existingBooklet) {
      // Update existing booklet
      const [updatedBooklet] = await db
        .update(examBooklets)
        .set({ questionOrder: bookletData.questionOrder })
        .where(eq(examBooklets.id, existingBooklet.id))
        .returning();
      return updatedBooklet;
    } else {
      // Create new booklet
      const [newBooklet] = await db.insert(examBooklets).values(bookletData).returning();
      return newBooklet;
    }
  }

  async getExamBooklets(examId: string): Promise<ExamBooklet[]> {
    return await db
      .select()
      .from(examBooklets)
      .where(eq(examBooklets.examId, examId))
      .orderBy(examBooklets.bookletCode);
  }

  // Product-Exam relationship operations
  async addProductExam(data: { productId: string; examId: string }): Promise<void> {
    await db.insert(productExams).values(data);
  }

  async removeProductExams(productId: string): Promise<void> {
    await db.delete(productExams).where(eq(productExams.productId, productId));
  }

  async getProductExams(productId: string): Promise<ExamWithBooklets[]> {
    const result = await db
      .select({
        exam: exams,
        booklets: examBooklets,
      })
      .from(productExams)
      .innerJoin(exams, eq(productExams.examId, exams.id))
      .leftJoin(examBooklets, eq(exams.id, examBooklets.examId))
      .where(eq(productExams.productId, productId));

    // Group booklets by exam
    const examMap = new Map<string, ExamWithBooklets>();
    
    for (const row of result) {
      if (!examMap.has(row.exam.id)) {
        examMap.set(row.exam.id, { ...row.exam, booklets: [] });
      }
      
      if (row.booklets) {
        examMap.get(row.exam.id)!.booklets.push(row.booklets);
      }
    }

    return Array.from(examMap.values());
  }

  // User exam access operations
  async grantExamAccess(userId: string, examId: string, orderId?: string): Promise<void> {
    await db.insert(userExamAccess).values({
      userId,
      examId,
      orderId,
    });
  }

  async getUserExamAccess(userId: string): Promise<ExamWithBooklets[]> {
    const result = await db
      .select({
        exam: exams,
        booklets: examBooklets,
      })
      .from(userExamAccess)
      .innerJoin(exams, eq(userExamAccess.examId, exams.id))
      .leftJoin(examBooklets, eq(exams.id, examBooklets.examId))
      .where(eq(userExamAccess.userId, userId));

    // Group booklets by exam
    const examMap = new Map<string, ExamWithBooklets>();
    
    for (const row of result) {
      if (!examMap.has(row.exam.id)) {
        examMap.set(row.exam.id, { ...row.exam, booklets: [] });
      }
      
      if (row.booklets) {
        examMap.get(row.exam.id)!.booklets.push(row.booklets);
      }
    }

    return Array.from(examMap.values());
  }

  async hasExamAccess(userId: string, examId: string): Promise<boolean> {
    const [access] = await db
      .select()
      .from(userExamAccess)
      .where(
        and(
          eq(userExamAccess.userId, userId),
          eq(userExamAccess.examId, examId)
        )
      )
      .limit(1);
    
    return !!access;
  }
}

export const storage = new DatabaseStorage();
