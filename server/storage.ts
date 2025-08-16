import {
  users,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  addresses,
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
}

export const storage = new DatabaseStorage();
