import { Insumo, Recipe, Product, Transaction, Client, User } from "../types.ts";

const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage.getItem blocked, falling back to memory:", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage.setItem blocked, falling back to memory:", e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage.removeItem blocked, falling back to memory:", e);
      delete memoryStorage[key];
    }
  }
};

let isLocalMode = false;
let currentToken: string | null = null;
let currentUserId = "local-demo-user";
let currentBizName = "Mi Emprendimiento de Pastelería";

export function setApiAuth(token: string | null, userId: string, bizName?: string | null) {
  currentToken = token;
  currentUserId = userId;
  if (bizName) {
    currentBizName = bizName;
  }
  isLocalMode = !token;
}

export function setLocalModeOnly(enabled: boolean) {
  isLocalMode = enabled;
  if (enabled) {
    currentToken = null;
    currentUserId = "local-demo-user";
  }
}

export function getIsLocalMode() {
  return isLocalMode;
}

export function getBizName() {
  if (isLocalMode) {
    return safeStorage.getItem(`es_biz_profile_user_${currentUserId}`) || "Emprendimiento Demo";
  }
  return currentBizName;
}

export function setBizNameLocally(name: string) {
  currentBizName = name;
  if (isLocalMode) {
    safeStorage.setItem(`es_biz_profile_user_${currentUserId}`, name);
  }
}

// Helper to handle fetch headers
function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }
  return headers;
}

// Seeding standard local demo data to make sure Local Mode is also pre-loaded
function ensureLocalDemoDataSeeded() {
  const keyCheck = `es_biz_insumos_user_${currentUserId}`;
  if (!safeStorage.getItem(keyCheck)) {
    const defaultInsumos: Insumo[] = [
      { id: 101, name: "Harina de Trigo", quantity: 15000, unit: "g", totalCost: 15, unitCost: 15 / 15000 },
      { id: 102, name: "Dulce de Leche", quantity: 8000, unit: "g", totalCost: 40, unitCost: 40 / 8000 },
      { id: 103, name: "Mantequilla", quantity: 3000, unit: "g", totalCost: 24, unitCost: 24 / 3000 },
      { id: 104, name: "Chocolate de Cobertura", quantity: 2000, unit: "g", totalCost: 36, unitCost: 36 / 2000 },
      { id: 105, name: "Azúcar", quantity: 10000, unit: "g", totalCost: 10, unitCost: 10 / 10000 },
    ];
    safeStorage.setItem(keyCheck, JSON.stringify(defaultInsumos));

    const defaultRecipes: Recipe[] = [
      {
        id: 201,
        name: "Alfajor de Dulce de Leche Premium",
        yield: 24,
        marginPercent: 150,
        costPerPiece: 0.225,
        suggestedPrice: 3.50,
        ingredients: [
          { insumoId: 101, quantityUsed: 300, insumoName: "Harina de Trigo", insumoUnit: "g", insumoUnitCost: 15 / 15000 },
          { insumoId: 102, quantityUsed: 400, insumoName: "Dulce de Leche", insumoUnit: "g", insumoUnitCost: 40 / 8000 },
          { insumoId: 103, quantityUsed: 150, insumoName: "Mantequilla", insumoUnit: "g", insumoUnitCost: 24 / 3000 },
          { insumoId: 104, quantityUsed: 100, insumoName: "Chocolate de Cobertura", insumoUnit: "g", insumoUnitCost: 36 / 2000 },
          { insumoId: 105, quantityUsed: 100, insumoName: "Azúcar", insumoUnit: "g", insumoUnitCost: 10 / 10000 },
        ]
      }
    ];
    safeStorage.setItem(`es_biz_recipes_user_${currentUserId}`, JSON.stringify(defaultRecipes));

    const defaultProducts: Product[] = [
      { id: 301, recipeId: 201, name: "Alfajor Premium Maicena x Unid", stock: 36, price: 3.50, cost: 0.225 },
      { id: 302, recipeId: null, name: "Conito de Dulce de Leche x Unid", stock: 15, price: 2.80, cost: 0.90 }
    ];
    safeStorage.setItem(`es_biz_products_user_${currentUserId}`, JSON.stringify(defaultProducts));

    const defaultTransactions: Transaction[] = [
      { id: 401, type: "purchase", amount: -125, description: "Compra inicial de materias primas (Local Offline)", date: "2026-06-25" },
      { id: 402, type: "expense", amount: -45, description: "Gastos operativos taller (Local Offline)", date: "2026-06-26" },
      { id: 403, type: "sale", amount: 84, description: "Venta: 24 Alfajores Premium (Local)", date: "2026-06-27" },
      { id: 404, type: "sale", amount: 42, description: "Venta: 15 Conitos de Dulce de Leche (Local)", date: "2026-06-27" },
    ];
    safeStorage.setItem(`es_biz_transactions_user_${currentUserId}`, JSON.stringify(defaultTransactions));

    const defaultClients: Client[] = [
      { id: 501, name: "Café de las Artes (Local)", phone: "+54 11 4455-8899", email: "artes@cafe.com", lat: -34.6037, lng: -58.3816 },
      { id: 502, name: "Panadería San José (Local)", phone: "+54 11 9988-7766", email: "contacto@sanjose.com", lat: -34.6150, lng: -58.4120 },
    ];
    safeStorage.setItem(`es_biz_clients_user_${currentUserId}`, JSON.stringify(defaultClients));

    safeStorage.setItem(`es_biz_profile_user_${currentUserId}`, "Emprendimiento Demo (Offline)");
  }
}

// ------------------ LOCALSTORAGE HELPER GET/SET ------------------

function getLocalItems<T>(collection: string): T[] {
  ensureLocalDemoDataSeeded();
  const key = `es_biz_${collection}_user_${currentUserId}`;
  const data = safeStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveLocalItems<T>(collection: string, items: T[]) {
  const key = `es_biz_${collection}_user_${currentUserId}`;
  safeStorage.setItem(key, JSON.stringify(items));
}

// ------------------ API SERVICES ------------------

export const apiService = {
  // Sync after login
  async syncAuth() {
    if (isLocalMode) {
      ensureLocalDemoDataSeeded();
      return { success: true, isLocal: true };
    }
    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: getHeaders(),
    });
    return response.json();
  },

  // Update biz profile name
  async updateProfile(bizName: string) {
    if (isLocalMode) {
      setBizNameLocally(bizName);
      return { success: true, bizName };
    }
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ bizName }),
    });
    return response.json();
  },

  // Insumos
  async getInsumos(): Promise<Insumo[]> {
    if (isLocalMode) {
      return getLocalItems<Insumo>("insumos");
    }
    const response = await fetch("/api/insumos", { headers: getHeaders() });
    return response.json();
  },

  async createInsumo(data: { name: string; quantity: number; unit: string; totalCost: number }): Promise<Insumo> {
    if (isLocalMode) {
      const items = getLocalItems<Insumo>("insumos");
      const unitCost = data.quantity > 0 ? data.totalCost / data.quantity : 0;
      const newInsumo: Insumo = {
        id: Date.now(),
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        totalCost: data.totalCost,
        unitCost: unitCost,
      };
      items.unshift(newInsumo);
      saveLocalItems("insumos", items);

      // Log purchase movement offline
      if (data.totalCost > 0) {
        const txs = getLocalItems<Transaction>("transactions");
        txs.unshift({
          id: Date.now() + 1,
          type: "purchase",
          amount: -data.totalCost,
          description: `Compra de Materia Prima: ${data.quantity}${data.unit} de ${data.name}`,
          date: new Date().toISOString().split("T")[0],
        });
        saveLocalItems("transactions", txs);
      }

      return newInsumo;
    }

    const response = await fetch("/api/insumos", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateInsumo(id: number, data: { name: string; quantity: number; unit: string; totalCost: number }): Promise<Insumo> {
    if (isLocalMode) {
      const items = getLocalItems<Insumo>("insumos");
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        const unitCost = data.quantity > 0 ? data.totalCost / data.quantity : 0;
        items[idx] = {
          ...items[idx],
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          totalCost: data.totalCost,
          unitCost: unitCost,
        };
        saveLocalItems("insumos", items);
        return items[idx];
      }
      throw new Error("Not found");
    }

    const response = await fetch(`/api/insumos/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteInsumo(id: number): Promise<{ success: boolean }> {
    if (isLocalMode) {
      // Check if ingredient is used in local recipes
      const recs = getLocalItems<Recipe>("recipes");
      const isUsed = recs.some(r => r.ingredients.some(ing => ing.insumoId === id));
      if (isUsed) {
        throw new Error("No se puede eliminar porque está referenciado en una receta activa.");
      }

      let items = getLocalItems<Insumo>("insumos");
      items = items.filter(i => i.id !== id);
      saveLocalItems("insumos", items);
      return { success: true };
    }

    const response = await fetch(`/api/insumos/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const res = await response.json();
    if (response.status >= 400) {
      throw new Error(res.error || "Fallo al eliminar");
    }
    return res;
  },

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    if (isLocalMode) {
      return getLocalItems<Recipe>("recipes");
    }
    const response = await fetch("/api/recipes", { headers: getHeaders() });
    return response.json();
  },

  async createRecipe(data: { name: string; yield: number; marginPercent: number; ingredients: any[] }): Promise<Recipe> {
    if (isLocalMode) {
      const recs = getLocalItems<Recipe>("recipes");
      const insList = getLocalItems<Insumo>("insumos");

      let totalCostOfIngredients = 0;
      const ingredientsWithMeta = data.ingredients.map(ing => {
        const ins = insList.find(i => i.id === ing.insumoId);
        const insCost = ins ? ins.unitCost : 0;
        totalCostOfIngredients += insCost * ing.quantityUsed;
        return {
          ...ing,
          insumoName: ins ? ins.name : "Insumo",
          insumoUnit: ins ? ins.unit : "unidades",
          insumoUnitCost: insCost,
        };
      });

      const costPerPiece = data.yield > 0 ? totalCostOfIngredients / data.yield : 0;
      const suggestedPrice = costPerPiece * (1 + data.marginPercent / 100);

      const newRecipe: Recipe = {
        id: Date.now(),
        name: data.name,
        yield: data.yield,
        marginPercent: data.marginPercent,
        costPerPiece,
        suggestedPrice,
        ingredients: ingredientsWithMeta,
      };

      recs.unshift(newRecipe);
      saveLocalItems("recipes", recs);

      // Register or update product catalog
      const prods = getLocalItems<Product>("products");
      const existingProduct = prods.find(p => p.name.toLowerCase() === data.name.toLowerCase());
      if (!existingProduct) {
        prods.unshift({
          id: Date.now() + 10,
          recipeId: newRecipe.id,
          name: data.name,
          stock: 0,
          price: parseFloat(suggestedPrice.toFixed(2)),
          cost: costPerPiece,
        });
        saveLocalItems("products", prods);
      }

      return newRecipe;
    }

    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteRecipe(id: number): Promise<{ success: boolean }> {
    if (isLocalMode) {
      let recs = getLocalItems<Recipe>("recipes");
      recs = recs.filter(r => r.id !== id);
      saveLocalItems("recipes", recs);
      return { success: true };
    }

    const response = await fetch(`/api/recipes/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return response.json();
  },

  // Products
  async getProducts(): Promise<Product[]> {
    if (isLocalMode) {
      return getLocalItems<Product>("products");
    }
    const response = await fetch("/api/products", { headers: getHeaders() });
    return response.json();
  },

  async createProduct(data: { name: string; stock: number; price: number; cost: number }): Promise<Product> {
    if (isLocalMode) {
      const prods = getLocalItems<Product>("products");
      const newProduct: Product = {
        id: Date.now(),
        recipeId: null,
        name: data.name,
        stock: data.stock,
        price: data.price,
        cost: data.cost,
      };
      prods.unshift(newProduct);
      saveLocalItems("products", prods);
      return newProduct;
    }

    const response = await fetch("/api/products", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateProduct(id: number, data: { name?: string; stock?: number; price?: number; cost?: number }): Promise<Product> {
    if (isLocalMode) {
      const prods = getLocalItems<Product>("products");
      const idx = prods.findIndex(p => p.id === id);
      if (idx !== -1) {
        prods[idx] = {
          ...prods[idx],
          ...data,
        } as Product;
        saveLocalItems("products", prods);
        return prods[idx];
      }
      throw new Error("Product not found");
    }

    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateProductStockDelta(id: number, delta: number): Promise<Product> {
    if (isLocalMode) {
      const prods = getLocalItems<Product>("products");
      const idx = prods.findIndex(p => p.id === id);
      if (idx !== -1) {
        prods[idx].stock = prods[idx].stock + delta;
        saveLocalItems("products", prods);
        return prods[idx];
      }
      throw new Error("Product not found");
    }

    const response = await fetch(`/api/products/${id}/stock`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ delta }),
    });
    return response.json();
  },

  async deleteProduct(id: number): Promise<{ success: boolean }> {
    if (isLocalMode) {
      let prods = getLocalItems<Product>("products");
      prods = prods.filter(p => p.id !== id);
      saveLocalItems("products", prods);
      return { success: true };
    }

    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return response.json();
  },

  // Fabricar Tanda (Taller Production)
  async executeFabricacion(recipeId: number, batches: number): Promise<any> {
    if (isLocalMode) {
      const recs = getLocalItems<Recipe>("recipes");
      const insList = getLocalItems<Insumo>("insumos");
      const prods = getLocalItems<Product>("products");

      const recipe = recs.find(r => r.id === recipeId);
      if (!recipe) throw new Error("Receta no encontrada");

      // Verify availability
      const missing: string[] = [];
      const insumoUpdates: { id: number; required: number; has: number; name: string }[] = [];

      recipe.ingredients.forEach(ing => {
        const ins = insList.find(i => i.id === ing.insumoId);
        if (!ins) throw new Error("Materia prima no encontrada.");

        const required = ing.quantityUsed * batches;
        if (ins.quantity < required) {
          missing.push(`${ins.name}: Requieres ${required}${ins.unit}, tienes ${ins.quantity}${ins.unit}`);
        } else {
          insumoUpdates.push({ id: ins.id, required, has: ins.quantity, name: ins.name });
        }
      });

      if (missing.length > 0) {
        throw new Error("Insumos insuficientes:\n" + missing.join("\n"));
      }

      // Deduct ingredients
      insumoUpdates.forEach(update => {
        const ins = insList.find(i => i.id === update.id)!;
        ins.quantity = update.has - update.required;
      });
      saveLocalItems("insumos", insList);

      // Increase products stock
      const finalQtyProduced = recipe.yield * batches;
      let targetProduct = prods.find(p => p.recipeId === recipe.id);
      if (!targetProduct) {
        // Find by name
        targetProduct = prods.find(p => p.name.toLowerCase() === recipe.name.toLowerCase());
      }

      if (targetProduct) {
        targetProduct.stock += finalQtyProduced;
        targetProduct.cost = recipe.costPerPiece;
      } else {
        targetProduct = {
          id: Date.now(),
          recipeId: recipe.id,
          name: recipe.name,
          stock: finalQtyProduced,
          price: parseFloat(recipe.suggestedPrice.toFixed(2)),
          cost: recipe.costPerPiece,
        };
        prods.unshift(targetProduct);
      }
      saveLocalItems("products", prods);

      // Log transaction
      const txs = getLocalItems<Transaction>("transactions");
      txs.unshift({
        id: Date.now(),
        type: "expense",
        amount: 0,
        description: `Fabricación Taller: ${batches} tanda(s) de ${recipe.name} (+${finalQtyProduced} unidades fabricadas)`,
        date: new Date().toISOString().split("T")[0],
      });
      saveLocalItems("transactions", txs);

      return {
        success: true,
        batchesManufactured: batches,
        qtyProduced: finalQtyProduced,
        product: targetProduct,
      };
    }

    const response = await fetch("/api/fabricacion", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ recipeId, batches }),
    });

    const res = await response.json();
    if (response.status >= 400) {
      throw new Error(res.error || "Fallo en taller de fabricación");
    }
    return res;
  },

  // Transactions Ledger
  async getTransactions(): Promise<Transaction[]> {
    if (isLocalMode) {
      return getLocalItems<Transaction>("transactions");
    }
    const response = await fetch("/api/transactions", { headers: getHeaders() });
    return response.json();
  },

  async createTransaction(data: { type: string; amount: number; description: string; date?: string }): Promise<Transaction> {
    if (isLocalMode) {
      const txs = getLocalItems<Transaction>("transactions");
      const newTx: Transaction = {
        id: Date.now(),
        type: data.type as any,
        amount: data.amount,
        description: data.description,
        date: data.date || new Date().toISOString().split("T")[0],
      };
      txs.unshift(newTx);
      saveLocalItems("transactions", txs);
      return newTx;
    }

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async checkoutCart(items: { productId: number; qty: number }[], clientName?: string): Promise<any> {
    if (isLocalMode) {
      const prods = getLocalItems<Product>("products");
      let totalSaleRevenue = 0;
      const salesDescriptions: string[] = [];

      items.forEach(item => {
        const prod = prods.find(p => p.id === item.productId);
        if (!prod) throw new Error("Producto no encontrado");

        prod.stock -= item.qty; // Support negative transient stock
        const itemRevenue = prod.price * item.qty;
        totalSaleRevenue += itemRevenue;
        salesDescriptions.push(`${item.qty}x ${prod.name}`);
      });
      saveLocalItems("products", prods);

      // Log movement
      const description = `Venta Caja: ${salesDescriptions.join(", ")}` + (clientName ? ` (Cliente: ${clientName})` : "");
      const txs = getLocalItems<Transaction>("transactions");
      const newTx: Transaction = {
        id: Date.now(),
        type: "sale",
        amount: totalSaleRevenue,
        description,
        date: new Date().toISOString().split("T")[0],
      };
      txs.unshift(newTx);
      saveLocalItems("transactions", txs);

      return { success: true, revenue: totalSaleRevenue, transaction: newTx };
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ items, clientName }),
    });

    const res = await response.json();
    if (response.status >= 400) {
      throw new Error(res.error || "Fallo en caja de venta");
    }
    return res;
  },

  async resetDatabase(): Promise<{ success: boolean }> {
    if (isLocalMode) {
      // Clear localStorage specific tables and re-seed
      safeStorage.removeItem(`es_biz_insumos_user_${currentUserId}`);
      safeStorage.removeItem(`es_biz_recipes_user_${currentUserId}`);
      safeStorage.removeItem(`es_biz_products_user_${currentUserId}`);
      safeStorage.removeItem(`es_biz_transactions_user_${currentUserId}`);
      safeStorage.removeItem(`es_biz_clients_user_${currentUserId}`);
      safeStorage.removeItem(`es_biz_profile_user_${currentUserId}`);

      ensureLocalDemoDataSeeded();
      return { success: true };
    }

    const response = await fetch("/api/transactions/reset", {
      method: "POST",
      headers: getHeaders(),
    });
    return response.json();
  },

  // Clients
  async getClients(): Promise<Client[]> {
    if (isLocalMode) {
      return getLocalItems<Client>("clients");
    }
    const response = await fetch("/api/clients", { headers: getHeaders() });
    return response.json();
  },

  async createClient(data: { name: string; phone?: string; email?: string; lat?: number; lng?: number }): Promise<Client> {
    if (isLocalMode) {
      const list = getLocalItems<Client>("clients");
      const newClient: Client = {
        id: Date.now(),
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        lat: data.lat || null,
        lng: data.lng || null,
      };
      list.unshift(newClient);
      saveLocalItems("clients", list);
      return newClient;
    }

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteClient(id: number): Promise<{ success: boolean }> {
    if (isLocalMode) {
      let list = getLocalItems<Client>("clients");
      list = list.filter(c => c.id !== id);
      saveLocalItems("clients", list);
      return { success: true };
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return response.json();
  },

  // AI Assistant advice
  async askAiAdvisor(prompt: string): Promise<string> {
    if (isLocalMode) {
      // Offline fallback smart tips simulator using a standard lovely financial analysis
      const insList = getLocalItems<Insumo>("insumos");
      const prods = getLocalItems<Product>("products");
      const lowStockList = insList.filter(i => i.quantity < 1000).map(i => i.name);
      
      let tips = `**[MODO LOCAL SEGURO OFFLINE]**\n\n¡Hola! Como estás operando en el modo local seguro de FinanzasPro, he analizado tus datos actuales en el navegador:\n\n`;
      if (lowStockList.length > 0) {
        tips += `⚠️ **Alerta de Stock Crítico:** Tienes bajo stock de materia prima en: *${lowStockList.join(", ")}*. Sería aconsejable reponer antes de iniciar la próxima tanda de producción en el taller.\n\n`;
      } else {
        tips += `✅ **Inventario Estable:** Tus materias primas cargadas en tu despensa tienen buenos niveles de stock.\n\n`;
      }

      const lowMarginProds = prods.filter(p => p.price < p.cost * 1.5);
      if (lowMarginProds.length > 0) {
        tips += `📈 **Oportunidad de Margen:** Tus productos *${lowMarginProds.map(p => p.name).join(", ")}* tienen márgenes de ganancia menores al 50%. Te recomiendo recalcular tus recetas en el taller o ajustar su precio de venta sugerido.\n\n`;
      } else {
        tips += `🌟 **Márgenes de Excelencia:** Tu catálogo actual de ventas posee excelentes márgenes de rentabilidad sobre costo (+150% promedio).\n\n`;
      }

      tips += `Recuerda conectar tu cuenta de Google para activar el análisis predictivo por Inteligencia Artificial (Gemini AI) y guardar tus registros en la base de datos segura en la nube de PostgreSQL.`;
      return tips;
    }

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.response;
    } catch (err: any) {
      console.error("AI request error:", err);
      return "El asesor financiero inteligente (Gemini) no está disponible temporalmente. Por favor asegúrate de haber cargado una API Key de Gemini en el panel lateral de AI Studio (Secrets) o utiliza el simulador local de consejos.";
    }
  }
};
