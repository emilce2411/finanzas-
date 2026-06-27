import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { db } from "./src/db/index.ts";
import {
  users,
  insumos,
  recipes,
  recipeIngredients,
  products,
  transactions,
  clients,
} from "./src/db/schema.ts";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest, getOrCreateUser } from "./src/middleware/auth.ts";

dotenv.config();

const PORT = 3000;

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to seed gorgeous demo data for new or anonymous users to avoid empty screen
async function seedUserDemoData(userId: number) {
  try {
    // 1. Check if user already has data to prevent duplicate seeding
    const existingInsumos = await db.select().from(insumos).where(eq(insumos.userId, userId));
    if (existingInsumos.length > 0) return;

    console.log(`Seeding demo data for user ID: ${userId}`);

    // 2. Insert Insumos (Raw Materials)
    const insList = await db.insert(insumos).values([
      { userId, name: "Harina de Trigo", quantity: 15000, unit: "g", totalCost: 15, unitCost: 15 / 15000 },
      { userId, name: "Dulce de Leche", quantity: 8000, unit: "g", totalCost: 40, unitCost: 40 / 8000 },
      { userId, name: "Mantequilla", quantity: 3000, unit: "g", totalCost: 24, unitCost: 24 / 3000 },
      { userId, name: "Chocolate de Cobertura", quantity: 2000, unit: "g", totalCost: 36, unitCost: 36 / 2000 },
      { userId, name: "Azúcar", quantity: 10000, unit: "g", totalCost: 10, unitCost: 10 / 10000 },
    ]).returning();

    // Find insumo IDs
    const harina = insList.find(i => i.name === "Harina de Trigo")!;
    const dulce = insList.find(i => i.name === "Dulce de Leche")!;
    const mantequilla = insList.find(i => i.name === "Mantequilla")!;
    const chocolate = insList.find(i => i.name === "Chocolate de Cobertura")!;
    const azucar = insList.find(i => i.name === "Azúcar")!;

    // 3. Create a Demo Recipe
    const recList = await db.insert(recipes).values([
      {
        userId,
        name: "Alfajor de Dulce de Leche Premium",
        yield: 24, // Rinde 24 unidades
        marginPercent: 150, // 150% sobre costo
        costPerPiece: 1.25, // Will update or use calculated
        suggestedPrice: 3.12,
      }
    ]).returning();
    const recipeAlfajor = recList[0];

    // 4. Insert Recipe Ingredients (Linking recipe to insumos)
    // Para 24 alfajores: 300g harina, 400g dulce de leche, 150g mantequilla, 100g chocolate, 100g azucar
    await db.insert(recipeIngredients).values([
      { recipeId: recipeAlfajor.id, insumoId: harina.id, quantityUsed: 300 },
      { recipeId: recipeAlfajor.id, insumoId: dulce.id, quantityUsed: 400 },
      { recipeId: recipeAlfajor.id, insumoId: mantequilla.id, quantityUsed: 150 },
      { recipeId: recipeAlfajor.id, insumoId: chocolate.id, quantityUsed: 100 },
      { recipeId: recipeAlfajor.id, insumoId: azucar.id, quantityUsed: 100 },
    ]);

    // Recalculate true cost for safety
    // cost = (300*0.001) + (400*0.005) + (150*0.008) + (100*0.018) + (100*0.001) = 0.3 + 2.0 + 1.2 + 1.8 + 0.1 = $5.40 total tanda / 24 = $0.225 por alfajor
    const totalCostTanda = (300 * harina.unitCost) + (400 * dulce.unitCost) + (150 * mantequilla.unitCost) + (100 * chocolate.unitCost) + (100 * azucar.unitCost);
    const costPerPieceReal = totalCostTanda / 24;
    const suggestedPriceReal = costPerPieceReal * 2.5; // cost + 150% profit margin

    await db.update(recipes)
      .set({ costPerPiece: costPerPieceReal, suggestedPrice: suggestedPriceReal })
      .where(eq(recipes.id, recipeAlfajor.id));

    // 5. Create Final Product
    await db.insert(products).values([
      {
        userId,
        recipeId: recipeAlfajor.id,
        name: "Alfajor Premium Maicena x Unid",
        stock: 36, // Stock inicial fabricado
        price: 3.50, // Precio de venta real
        cost: costPerPieceReal,
      },
      {
        userId,
        name: "Conito de Dulce de Leche x Unid",
        stock: 15,
        price: 2.80,
        cost: 0.90, // manual cost
      }
    ]);

    // 6. Insert Demo Transactions (Balances)
    await db.insert(transactions).values([
      { userId, type: "purchase", amount: -125, description: "Compra inicial de materias primas (Harina, Dulce de Leche, etc.)", date: "2026-06-25" },
      { userId, type: "expense", amount: -45, description: "Gastos operativos taller (Gas y moldes descartables)", date: "2026-06-26" },
      { userId, type: "sale", amount: 84, description: "Venta: 24 Alfajores Premium", date: "2026-06-27" },
      { userId, type: "sale", amount: 42, description: "Venta: 15 Conitos de Dulce de Leche", date: "2026-06-27" },
    ]);

    // 7. Insert Demo Clients for map
    // Coordinates near central Buenos Aires/Santiago/etc for Leaflet demonstration
    await db.insert(clients).values([
      { userId, name: "Café de las Artes", phone: "+54 11 4455-8899", email: "artes@cafe.com", lat: -34.6037, lng: -58.3816 }, // Obelisco
      { userId, name: "Panadería San José", phone: "+54 11 9988-7766", email: "contacto@sanjose.com", lat: -34.6150, lng: -58.4120 },
      { userId, name: "La Dulcería Taller", phone: "+54 9 11 3214-5678", email: "taller@dulceria.com", lat: -34.5895, lng: -58.4320 }, // Palermo
    ]);

    console.log("Demo data successfully seeded for user!");
  } catch (err) {
    console.error("Error seeding demo data:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ------------------ API ROUTES ------------------

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Auth check & Seed trigger (Client calls this after sign-in to sync user & verify/seed demo data)
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      // Seed if the user has no existing data
      await seedUserDemoData(user.id);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Error in auth sync:", error);
      res.status(500).json({ error: "Failed to synchronize profile. Please try again." });
    }
  });

  // 2. Profile endpoints
  app.post("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { bizName } = req.body;
      if (!bizName || bizName.trim() === "") {
        return res.status(400).json({ error: "El nombre del emprendimiento es requerido" });
      }

      await db.update(users)
        .set({ bizName: bizName.trim() })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true, bizName });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "No se pudo actualizar el perfil" });
    }
  });

  // 3. Insumos (Raw Materials)
  app.get("/api/insumos", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userInsumos = await db.select()
        .from(insumos)
        .where(eq(insumos.userId, req.user!.id))
        .orderBy(desc(insumos.createdAt));
      res.json(userInsumos);
    } catch (error: any) {
      console.error("Error getting insumos:", error);
      res.status(500).json({ error: "Error de base de datos al obtener insumos" });
    }
  });

  app.post("/api/insumos", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, quantity, unit, totalCost } = req.body;
      if (!name || quantity === undefined || !unit || totalCost === undefined) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      const q = parseFloat(quantity);
      const cost = parseFloat(totalCost);
      const unitCost = q > 0 ? cost / q : 0;

      const result = await db.insert(insumos).values({
        userId: req.user!.id,
        name: name.trim(),
        quantity: q,
        unit: unit.trim(),
        totalCost: cost,
        unitCost: unitCost,
      }).returning();

      // Log purchase in transactions
      if (cost > 0) {
        await db.insert(transactions).values({
          userId: req.user!.id,
          type: "purchase",
          amount: -cost,
          description: `Compra de Materia Prima: ${q}${unit} de ${name.trim()}`,
          date: new Date().toISOString().split("T")[0],
        });
      }

      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating insumo:", error);
      res.status(500).json({ error: "Error al registrar el insumo" });
    }
  });

  app.put("/api/insumos/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, quantity, unit, totalCost } = req.body;

      // Verify ownership
      const existing = await db.select()
        .from(insumos)
        .where(and(eq(insumos.id, parseInt(id)), eq(insumos.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Insumo no encontrado o no autorizado" });
      }

      const q = parseFloat(quantity);
      const cost = parseFloat(totalCost);
      const unitCost = q > 0 ? cost / q : 0;

      const result = await db.update(insumos)
        .set({
          name: name ? name.trim() : existing[0].name,
          quantity: q,
          unit: unit ? unit.trim() : existing[0].unit,
          totalCost: cost,
          unitCost: unitCost,
        })
        .where(eq(insumos.id, parseInt(id)))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating insumo:", error);
      res.status(500).json({ error: "Error al actualizar el insumo" });
    }
  });

  app.delete("/api/insumos/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      // Verify ownership
      const existing = await db.select()
        .from(insumos)
        .where(and(eq(insumos.id, parseInt(id)), eq(insumos.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Insumo no encontrado o no autorizado" });
      }

      await db.delete(insumos).where(eq(insumos.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting insumo:", error);
      res.status(500).json({ error: "No se puede eliminar porque está referenciado en una receta activa." });
    }
  });

  // 4. Recipes (Recetas / Formulaciones)
  app.get("/api/recipes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRecipes = await db.select()
        .from(recipes)
        .where(eq(recipes.userId, req.user!.id))
        .orderBy(desc(recipes.createdAt));

      const responseRecipes = [];
      for (const recipe of userRecipes) {
        const ingredients = await db.select({
          id: recipeIngredients.id,
          insumoId: recipeIngredients.insumoId,
          quantityUsed: recipeIngredients.quantityUsed,
          insumoName: insumos.name,
          insumoUnit: insumos.unit,
          insumoUnitCost: insumos.unitCost,
        })
        .from(recipeIngredients)
        .innerJoin(insumos, eq(recipeIngredients.insumoId, insumos.id))
        .where(eq(recipeIngredients.recipeId, recipe.id));

        responseRecipes.push({
          ...recipe,
          ingredients,
        });
      }

      res.json(responseRecipes);
    } catch (error: any) {
      console.error("Error getting recipes:", error);
      res.status(500).json({ error: "No se pudieron obtener las recetas" });
    }
  });

  app.post("/api/recipes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, yield: recipeYield, marginPercent, ingredients } = req.body;
      if (!name || !recipeYield || marginPercent === undefined || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Faltan campos requeridos o ingredientes incorrectos" });
      }

      const parsedYield = parseInt(recipeYield);
      const parsedMargin = parseFloat(marginPercent);

      // Fetch insumos to calculate total cost
      let totalCostOfIngredients = 0;
      for (const ing of ingredients) {
        const ins = await db.select()
          .from(insumos)
          .where(and(eq(insumos.id, ing.insumoId), eq(insumos.userId, req.user!.id)));

        if (ins.length > 0) {
          totalCostOfIngredients += ins[0].unitCost * parseFloat(ing.quantityUsed);
        }
      }

      const costPerPiece = parsedYield > 0 ? totalCostOfIngredients / parsedYield : 0;
      const suggestedPrice = costPerPiece * (1 + parsedMargin / 100);

      // Insert Recipe
      const newRecipe = await db.insert(recipes).values({
        userId: req.user!.id,
        name: name.trim(),
        yield: parsedYield,
        marginPercent: parsedMargin,
        costPerPiece: costPerPiece,
        suggestedPrice: suggestedPrice,
      }).returning();

      const recipeId = newRecipe[0].id;

      // Insert Recipe Ingredients
      for (const ing of ingredients) {
        await db.insert(recipeIngredients).values({
          recipeId: recipeId,
          insumoId: ing.insumoId,
          quantityUsed: parseFloat(ing.quantityUsed),
        });
      }

      // Automatically register a Product linked to this recipe in the Sales Catalog
      const existingProduct = await db.select()
        .from(products)
        .where(and(eq(products.name, name.trim()), eq(products.userId, req.user!.id)));

      let createdProduct;
      if (existingProduct.length === 0) {
        const prod = await db.insert(products).values({
          userId: req.user!.id,
          recipeId: recipeId,
          name: name.trim(),
          stock: 0,
          price: parseFloat(suggestedPrice.toFixed(2)),
          cost: costPerPiece,
        }).returning();
        createdProduct = prod[0];
      }

      res.status(201).json({
        ...newRecipe[0],
        ingredients,
        product: createdProduct,
      });
    } catch (error: any) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ error: "No se pudo registrar la receta" });
    }
  });

  app.delete("/api/recipes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await db.select()
        .from(recipes)
        .where(and(eq(recipes.id, parseInt(id)), eq(recipes.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      await db.delete(recipes).where(eq(recipes.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ error: "Error al eliminar la receta" });
    }
  });

  // 5. Products (Final Goods for Sale)
  app.get("/api/products", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProducts = await db.select()
        .from(products)
        .where(eq(products.userId, req.user!.id))
        .orderBy(desc(products.createdAt));
      res.json(userProducts);
    } catch (error: any) {
      console.error("Error getting products:", error);
      res.status(500).json({ error: "Error al obtener los productos" });
    }
  });

  app.post("/api/products", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, stock, price, cost } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ error: "Nombre y precio son requeridos" });
      }

      const result = await db.insert(products).values({
        userId: req.user!.id,
        name: name.trim(),
        stock: stock ? parseInt(stock) : 0,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : 0,
      }).returning();

      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Error al registrar el producto" });
    }
  });

  app.put("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, stock, price, cost } = req.body;

      const existing = await db.select()
        .from(products)
        .where(and(eq(products.id, parseInt(id)), eq(products.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const result = await db.update(products)
        .set({
          name: name ? name.trim() : existing[0].name,
          stock: stock !== undefined ? parseInt(stock) : existing[0].stock,
          price: price !== undefined ? parseFloat(price) : existing[0].price,
          cost: cost !== undefined ? parseFloat(cost) : existing[0].cost,
        })
        .where(eq(products.id, parseInt(id)))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "No se pudo actualizar el producto" });
    }
  });

  app.put("/api/products/:id/stock", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { delta } = req.body; // e.g. +1 or -1

      if (delta === undefined) {
        return res.status(400).json({ error: "Delta stock es requerido" });
      }

      const existing = await db.select()
        .from(products)
        .where(and(eq(products.id, parseInt(id)), eq(products.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const newStock = existing[0].stock + parseInt(delta);

      const result = await db.update(products)
        .set({ stock: newStock })
        .where(eq(products.id, parseInt(id)))
        .returning();

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating product stock:", error);
      res.status(500).json({ error: "No se pudo actualizar el stock del producto" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await db.select()
        .from(products)
        .where(and(eq(products.id, parseInt(id)), eq(products.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      await db.delete(products).where(eq(products.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Error al eliminar el producto" });
    }
  });

  // 6. Taller de Fabricación (Manufacturing Controller)
  app.post("/api/fabricacion", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { recipeId, batches } = req.body;
      if (!recipeId || !batches) {
        return res.status(400).json({ error: "Faltan parámetros: receta y cantidad de tandas" });
      }

      const numBatches = parseInt(batches);
      if (numBatches <= 0) {
        return res.status(400).json({ error: "La cantidad de tandas debe ser mayor que cero" });
      }

      // Fetch Recipe details
      const recipeList = await db.select()
        .from(recipes)
        .where(and(eq(recipes.id, parseInt(recipeId)), eq(recipes.userId, req.user!.id)));

      if (recipeList.length === 0) {
        return res.status(404).json({ error: "Receta no encontrada" });
      }
      const recipe = recipeList[0];

      // Fetch ingredients
      const ingredients = await db.select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, recipe.id));

      if (ingredients.length === 0) {
        return res.status(400).json({ error: "La receta no contiene ingredientes asignados" });
      }

      // Check ingredient availability
      const missingIngredients: string[] = [];
      const insumoUpdates: { insumoId: number; name: string; currentQty: number; newQty: number }[] = [];

      for (const ing of ingredients) {
        const ins = await db.select()
          .from(insumos)
          .where(and(eq(insumos.id, ing.insumoId), eq(insumos.userId, req.user!.id)));

        if (ins.length === 0) {
          return res.status(400).json({ error: "Materia prima utilizada en la receta ya no existe" });
        }

        const requiredQty = ing.quantityUsed * numBatches;
        if (ins[0].quantity < requiredQty) {
          missingIngredients.push(
            `${ins[0].name}: Necesitas ${requiredQty}${ins[0].unit}, tienes ${ins[0].quantity}${ins[0].unit}`
          );
        } else {
          insumoUpdates.push({
            insumoId: ins[0].id,
            name: ins[0].name,
            currentQty: ins[0].quantity,
            newQty: ins[0].quantity - requiredQty,
          });
        }
      }

      if (missingIngredients.length > 0) {
        return res.status(400).json({
          error: "Insumos insuficientes para la fabricación de la tanda",
          details: missingIngredients,
        });
      }

      // All ingredients are sufficient! Proceed to deduct stocks
      for (const update of insumoUpdates) {
        await db.update(insumos)
          .set({ quantity: update.newQty })
          .where(eq(insumos.id, update.insumoId));
      }

      // Add to product stock
      const finalQtyProduced = recipe.yield * numBatches;

      // Find if we have a linked product
      const linkedProduct = await db.select()
        .from(products)
        .where(and(eq(products.recipeId, recipe.id), eq(products.userId, req.user!.id)));

      let productResult;
      if (linkedProduct.length > 0) {
        productResult = await db.update(products)
          .set({
            stock: linkedProduct[0].stock + finalQtyProduced,
            cost: recipe.costPerPiece, // Keep cost sync'd
          })
          .where(eq(products.id, linkedProduct[0].id))
          .returning();
      } else {
        // Fallback or create if missing
        productResult = await db.insert(products).values({
          userId: req.user!.id,
          recipeId: recipe.id,
          name: recipe.name,
          stock: finalQtyProduced,
          price: parseFloat(recipe.suggestedPrice.toFixed(2)),
          cost: recipe.costPerPiece,
        }).returning();
      }

      // Log manufacturing in Cash ledger as non-impact adjustment
      await db.insert(transactions).values({
        userId: req.user!.id,
        type: "expense",
        amount: 0, // No impact directly on current cash since ingredients are already purchased
        description: `Fabricación Taller: ${numBatches} tanda(s) de ${recipe.name} (+${finalQtyProduced} unidades fabricadas)`,
        date: new Date().toISOString().split("T")[0],
      });

      res.json({
        success: true,
        batchesManufactured: numBatches,
        qtyProduced: finalQtyProduced,
        product: productResult ? productResult[0] : null,
      });
    } catch (error: any) {
      console.error("Error manufacturing batches:", error);
      res.status(500).json({ error: "Error en el taller de fabricación" });
    }
  });

  // 7. Transactions (Libro de Caja Ledger)
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, req.user!.id))
        .orderBy(desc(transactions.date), desc(transactions.createdAt));
      res.json(userTransactions);
    } catch (error: any) {
      console.error("Error getting transactions:", error);
      res.status(500).json({ error: "Error de base de datos al obtener transacciones" });
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, amount, description, date } = req.body;
      if (!type || amount === undefined || !description) {
        return res.status(400).json({ error: "Faltan campos requeridos en la transacción" });
      }

      const val = parseFloat(amount);
      const result = await db.insert(transactions).values({
        userId: req.user!.id,
        type: type,
        amount: val,
        description: description.trim(),
        date: date || new Date().toISOString().split("T")[0],
      }).returning();

      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "No se pudo registrar el movimiento" });
    }
  });

  // Checkout (Cart sales handler)
  app.post("/api/checkout", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { items, clientName } = req.body; // array of { productId, qty }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío" });
      }

      let totalSaleRevenue = 0;
      const salesDescriptions: string[] = [];

      for (const item of items) {
        const prod = await db.select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.userId, req.user!.id)));

        if (prod.length === 0) {
          return res.status(400).json({ error: "Producto no encontrado en el catálogo" });
        }

        const product = prod[0];
        const qtyToSell = parseInt(item.qty);

        // Deduct product stock (supports negative transient as requested with confirmation dialog)
        const updatedStock = product.stock - qtyToSell;
        await db.update(products)
          .set({ stock: updatedStock })
          .where(eq(products.id, product.id));

        const itemRevenue = product.price * qtyToSell;
        totalSaleRevenue += itemRevenue;
        salesDescriptions.push(`${qtyToSell}x ${product.name}`);
      }

      const finalDescription = `Venta Caja: ${salesDescriptions.join(", ")}` + (clientName ? ` (Cliente: ${clientName})` : "");

      // Register revenue transaction
      const transactionRecord = await db.insert(transactions).values({
        userId: req.user!.id,
        type: "sale",
        amount: totalSaleRevenue,
        description: finalDescription,
        date: new Date().toISOString().split("T")[0],
      }).returning();

      res.json({
        success: true,
        revenue: totalSaleRevenue,
        transaction: transactionRecord[0],
      });
    } catch (error: any) {
      console.error("Error in checkout:", error);
      res.status(500).json({ error: "Error al procesar el pago" });
    }
  });

  // Reset database from the cloud for this user (Clear ledger and re-seed defaults)
  app.post("/api/transactions/reset", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Clean up everything for this user recursively (cascaded by DB relations)
      await db.delete(transactions).where(eq(transactions.userId, userId));
      await db.delete(clients).where(eq(clients.userId, userId));
      await db.delete(products).where(eq(products.userId, userId));
      await db.delete(recipes).where(eq(recipes.userId, userId));
      await db.delete(insumos).where(eq(insumos.userId, userId));

      // Re-seed demo data
      await seedUserDemoData(userId);

      res.json({ success: true, message: "Base de datos reiniciada con datos de ejemplo" });
    } catch (error: any) {
      console.error("Error resetting user DB:", error);
      res.status(500).json({ error: "No se pudo reiniciar la base de datos de la nube" });
    }
  });

  // 8. Clients (Geographic locations)
  app.get("/api/clients", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userClients = await db.select()
        .from(clients)
        .where(eq(clients.userId, req.user!.id))
        .orderBy(desc(clients.createdAt));
      res.json(userClients);
    } catch (error: any) {
      console.error("Error getting clients:", error);
      res.status(500).json({ error: "No se pudieron obtener los clientes" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, phone, email, lat, lng } = req.body;
      if (!name) {
        return res.status(400).json({ error: "El nombre del cliente es obligatorio" });
      }

      const result = await db.insert(clients).values({
        userId: req.user!.id,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }).returning();

      res.status(201).json(result[0]);
    } catch (error: any) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "No se pudo registrar el cliente" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const existing = await db.select()
        .from(clients)
        .where(and(eq(clients.id, parseInt(id)), eq(clients.userId, req.user!.id)));

      if (existing.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      await db.delete(clients).where(eq(clients.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Error al eliminar el cliente" });
    }
  });

  // 9. AI Smart Assistant endpoint
  app.post("/api/assistant", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "El mensaje es requerido" });
      }

      const userId = req.user!.id;

      // 1. Fetch current metrics to populate system context
      const userInsumos = await db.select().from(insumos).where(eq(insumos.userId, userId));
      const userProducts = await db.select().from(products).where(eq(products.userId, userId));
      const userTx = await db.select().from(transactions).where(eq(transactions.userId, userId));

      // 2. Format business stats
      const totalInsumosList = userInsumos.map(i => `- ${i.name}: Stock ${i.quantity}${i.unit}, costo unitario $${i.unitCost.toFixed(4)}`).join("\n");
      const totalProductsList = userProducts.map(p => `- ${p.name}: Stock ${p.stock}, precio venta $${p.price.toFixed(2)}, costo producción $${p.cost.toFixed(2)} (Margen: +${(((p.price - p.cost) / (p.cost || 1)) * 100).toFixed(0)}% s/costo)`).join("\n");
      
      let totalSales = 0;
      let totalPurchases = 0;
      let totalExpenses = 0;
      userTx.forEach(t => {
        if (t.type === "sale") totalSales += t.amount;
        else if (t.type === "purchase") totalPurchases += Math.abs(t.amount);
        else totalExpenses += Math.abs(t.amount);
      });
      const netCaja = totalSales - totalPurchases - totalExpenses;

      const businessContext = `
INFORMACIÓN DEL NEGOCIO ("${req.user!.bizName || "Mi Emprendimiento"}"):
- Caja Neta Libre Actual: $${netCaja.toFixed(2)}
- Ventas Totales: $${totalSales.toFixed(2)}
- Compras de Insumos: $${totalPurchases.toFixed(2)}
- Gastos Operativos: $${totalExpenses.toFixed(2)}

MATERIAS PRIMAS / INSUMOS:
${totalInsumosList || "No hay materias primas cargadas."}

PRODUCTOS DEL CATÁLOGO:
${totalProductsList || "No hay productos en venta."}
`;

      const systemInstruction = `
Eres FinanzasPro AI, el asesor financiero inteligente de este taller/emprendimiento.
Utiliza un lenguaje amigable, motivador, profesional y directo en español.
Te proporcionamos los datos reales del negocio del usuario para que respondas de forma altamente contextualizada.
Identifica problemas de forma proactiva:
- Si un insumo tiene stock menor a 1000g o unidades y es clave, avísale.
- Si un producto tiene márgenes de rentabilidad muy bajos (< 30%), sugiérele subir el precio basándote en su costo.
- No inventes números fuera del contexto, habla de sus datos.
Sé breve e incluye recomendaciones específicas de máximo 3-4 párrafos.
`;

      // 3. Query Gemini API
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { text: businessContext },
          { text: `Pregunta del usuario: ${prompt}` }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ response: geminiResponse.text });
    } catch (error: any) {
      console.error("Error in AI assistant:", error);
      res.status(500).json({ error: "El asesor inteligente no está disponible temporalmente. Verifique su API Key en Secrets." });
    }
  });

  // ------------------ FRONTEND SERVING ------------------

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static compiled assets in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FinanzasPro Server] Running full-stack on http://0.0.0.0:${PORT}`);
  });
}

startServer();
