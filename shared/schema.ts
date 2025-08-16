import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // "user" or "admin"
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  district: varchar("district"),
  postalCode: varchar("postal_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  parentId: varchar("parent_id"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(), // "Ev", "İş", "Okul" etc.
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phone: varchar("phone").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  district: varchar("district").notNull(),
  postalCode: varchar("postal_code"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discountPercentage: integer("discount_percentage").default(0),
  categoryId: varchar("category_id").notNull(),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  stock: integer("stock").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  hasCoaching: boolean("has_coaching").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending").notNull(), // "pending", "confirmed", "shipped", "delivered", "cancelled"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// EXAM SYSTEM TABLES
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  subject: varchar("subject").notNull(), // "Matematik", "Türkçe", etc.
  durationMinutes: integer("duration_minutes").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answerKey: jsonb("answer_key").notNull(), // JSON: {"1": "A", "2": "B", ...}
  acquisitions: jsonb("acquisitions"), // JSON: {"1": "Kazanım", ...}
  questionSubjects: jsonb("question_subjects"), // JSON: {"1": "Türkçe", "2": "Matematik", ...}
  createdByAdminId: varchar("created_by_admin_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const examBooklets = pgTable("exam_booklets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  bookletCode: varchar("booklet_code").notNull(), // "A", "B", "C", "D"
  questionOrder: jsonb("question_order").notNull(), // JSON: [1,15,3,20,5,18,...]
  createdAt: timestamp("created_at").defaultNow(),
});

export const examSessions = pgTable("exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull().references(() => exams.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  bookletType: varchar("booklet_type").notNull(), // "A", "B", "C", "D"
  studentAnswers: jsonb("student_answers"), // JSON: {"1": "A", "2": "B", ...}
  score: integer("score"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  status: varchar("status").default("started").notNull(), // "started", "completed", "abandoned"
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// EXAM RELATIONS
export const examsRelations = relations(exams, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [exams.createdByAdminId],
    references: [users.id],
  }),
  booklets: many(examBooklets),
  sessions: many(examSessions),
}));

export const examBookletsRelations = relations(examBooklets, ({ one }) => ({
  exam: one(exams, {
    fields: [examBooklets.examId],
    references: [exams.id],
  }),
}));

export const examSessionsRelations = relations(examSessions, ({ one }) => ({
  exam: one(exams, {
    fields: [examSessions.examId],
    references: [exams.id],
  }),
  student: one(users, {
    fields: [examSessions.studentId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  orders: many(orders),
  addresses: many(addresses),
  createdExams: many(exams),
  examSessions: many(examSessions),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

// Authentication schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// User profile schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  phone: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type CartItemWithProduct = CartItem & { product: Product };
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type ProductWithCategory = Product & { category: Category };

// EXAM SYSTEM SCHEMAS AND TYPES
export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Excel upload schema for answer keys
export const uploadExcelAnswerKeySchema = z.object({
  examId: z.string().min(1, "Sınav ID gerekli"),
  bookletType: z.enum(["A", "B", "C", "D"], {
    required_error: "Kitapçık türü seçiniz",
  }),
});

export const insertExamBookletSchema = createInsertSchema(examBooklets).omit({
  id: true,
  createdAt: true,
});

export const insertExamSessionSchema = createInsertSchema(examSessions).omit({
  id: true,
  createdAt: true,
});

export const startExamSchema = z.object({
  examId: z.string().min(1, "Sınav ID gerekli"),
  bookletType: z.enum(["A", "B", "C", "D"], {
    required_error: "Kitapçık türü seçiniz",
  }),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().min(1, "Oturum ID gerekli"),
  questionNumber: z.number().min(1).max(200),
  answer: z.enum(["A", "B", "C", "D", "E", ""]).optional(),
});

export const submitExamSchema = z.object({
  sessionId: z.string().min(1, "Oturum ID gerekli"),
  studentAnswers: z.record(z.string(), z.enum(["A", "B", "C", "D", "E", ""])),
});

// EXAM TYPES
export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type ExamBooklet = typeof examBooklets.$inferSelect;
export type InsertExamBooklet = z.infer<typeof insertExamBookletSchema>;
export type ExamSession = typeof examSessions.$inferSelect;
export type InsertExamSession = z.infer<typeof insertExamSessionSchema>;
export type StartExamInput = z.infer<typeof startExamSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
export type UploadExcelAnswerKeyInput = z.infer<typeof uploadExcelAnswerKeySchema>;

export type ExamWithBooklets = Exam & { booklets: ExamBooklet[] };
export type ExamSessionWithExam = ExamSession & { exam: Exam };
export type ExamResult = {
  session: ExamSession;
  exam: Exam;
  correctAnswers: number;
  incorrectAnswers: number;
  emptyAnswers: number;
};
