import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table (linked to Firebase UID)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  bizName: text("biz_name"), // Name of the business
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Insumos table (Raw materials)
export const insumos = pgTable("insumos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").default(0).notNull(), // Current physical inventory stock
  unit: text("unit").notNull(), // g, ml, kg, litros, m, unidades
  totalCost: real("total_cost").default(0).notNull(), // Cost of purchase
  unitCost: real("unit_cost").default(0).notNull(), // Unit price (e.g. $/gram)
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Recipes table (Formulations for workshops)
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  yield: integer("yield").default(1).notNull(), // Number of individual items produced by this recipe batch
  suggestedPrice: real("suggested_price").default(0).notNull(),
  marginPercent: real("margin_percent").default(0).notNull(), // e.g. 150%
  costPerPiece: real("cost_per_piece").default(0).notNull(), // Recipe cost / yield
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Recipe Ingredients (Link table)
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  insumoId: integer("insumo_id")
    .references(() => insumos.id, { onDelete: "cascade" })
    .notNull(),
  quantityUsed: real("quantity_used").notNull(), // Amount used from raw material in this recipe batch
});

// 5. Products table (Catalog)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: integer("recipe_id")
    .references(() => recipes.id, { onDelete: "set null" }), // Optional recipe link
  name: text("name").notNull(),
  stock: integer("stock").default(0).notNull(), // Finished products ready to sell
  price: real("price").notNull(), // Selling price
  cost: real("cost").default(0).notNull(), // Production cost per piece
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Transactions table (Cash Ledger / Book of entries)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'sale', 'purchase', 'expense', 'adjustment'
  amount: real("amount").notNull(), // Positive for sale, negative for others
  description: text("description").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Clients table (Customers with geographic location)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations declarations
export const usersRelations = relations(users, ({ many }) => ({
  insumos: many(insumos),
  recipes: many(recipes),
  products: many(products),
  transactions: many(transactions),
  clients: many(clients),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  ingredients: many(recipeIngredients),
  products: many(products),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  insumo: one(insumos, { fields: [recipeIngredients.insumoId], references: [insumos.id] }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  recipe: one(recipes, { fields: [products.recipeId], references: [recipes.id] }),
}));

export const insumosRelations = relations(insumos, ({ one, many }) => ({
  user: one(users, { fields: [insumos.userId], references: [users.id] }),
  recipeIngredients: many(recipeIngredients),
}));
