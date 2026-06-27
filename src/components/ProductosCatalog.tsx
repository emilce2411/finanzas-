import React, { useState } from "react";
import { Product } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Plus, Trash2, Search, Sliders, ShoppingBag, ArrowUpRight, TrendingUp } from "lucide-react";

interface ProductosCatalogProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onProductsChange: () => void;
}

export default function ProductosCatalog({ products, setProducts, onProductsChange }: ProductosCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Manual Product Form States
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  // Filter products list
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProductManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !stock || !price || !cost) {
      setErrorMsg("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await apiService.createProduct({
        name: name.trim(),
        stock: parseInt(stock),
        price: parseFloat(price),
        cost: parseFloat(cost),
      });

      setName("");
      setStock("");
      setPrice("");
      setCost("");
      setSuccessMsg("¡Producto manual cargado al catálogo!");
      onProductsChange();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo registrar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (id: number, delta: number) => {
    // 1. Optimistic update (instantaneous UI response)
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, stock: p.stock + delta } : p))
    );

    try {
      // 2. Perform background database update
      await apiService.updateProductStockDelta(id, delta);
      // 3. Silently sync other components/data
      onProductsChange();
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo ajustar el stock.");
      // Rollback on failure
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, stock: p.stock - delta } : p))
      );
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este producto del catálogo?")) return;
    try {
      await apiService.deleteProduct(id);
      onProductsChange();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al eliminar el producto.");
    }
  };

  return (
    <div id="catalog-section" class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Col 1: Add Manual Resale Product */}
      <div class="lg:col-span-1">
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm sticky top-4">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus class="w-5 h-5 text-indigo-600" />
            Cargar Producto Directo (Reventa)
          </h2>

          <form onSubmit={handleCreateProductManual} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre Comercial *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Gaseosa Cola 500ml"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div class="col-span-1">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Stock Inicial *</label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="Ej. 10"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div class="col-span-1">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Costo Unit *</label>
                <input
                  type="number"
                  step="any"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="Ej. 1.20"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div class="col-span-1">
                <label class="block text-xs font-semibold text-slate-600 mb-1">PVP Venta *</label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Ej. 2.50"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>
            </div>

            {errorMsg && <div class="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}
            {successMsg && <div class="text-xs text-emerald-500 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cargar Producto
            </button>
          </form>
        </div>
      </div>

      {/* Col 2-3: Catalog interactive table */}
      <div class="lg:col-span-2 space-y-4">
        
        {/* Search header bar */}
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos finales de venta..."
              class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Catalog Table */}
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div class="p-12 text-center text-slate-400">
              <ShoppingBag class="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p class="text-sm font-bold text-slate-700">Catálogo vacío.</p>
              <p class="text-xs mt-1">Crea fórmulas en el taller de fabricación o registra productos de reventa manuales para comenzar.</p>
            </div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th class="px-5 py-3">Producto</th>
                    <th class="px-5 py-3">Procedencia</th>
                    <th class="px-5 py-3">Stock Disponible</th>
                    <th class="px-5 py-3">Cálculo Margen</th>
                    <th class="px-5 py-3 text-right">Acciones de Stock</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {filteredProducts.map(prod => {
                    const profit = prod.price - prod.cost;
                    const marginPercent = prod.cost > 0 ? (profit / prod.cost) * 100 : 0;

                    return (
                      <tr key={prod.id} class="hover:bg-slate-50/40 transition-colors">
                        <td class="px-5 py-4 font-medium text-slate-900">
                          <div class="font-bold text-slate-800">{prod.name}</div>
                          <div class="text-[10px] text-slate-400 font-mono mt-0.5">
                            Costo Ref: ${prod.cost.toFixed(2)} | PVP: ${prod.price.toFixed(2)}
                          </div>
                        </td>

                        <td class="px-5 py-4 text-xs">
                          {prod.recipeId ? (
                            <span class="bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-full font-semibold">
                              🛠️ Receta Taller
                            </span>
                          ) : (
                            <span class="bg-blue-50 text-blue-700 border border-blue-200/50 px-2 py-0.5 rounded-full font-semibold">
                              📦 Compra Reventa
                            </span>
                          )}
                        </td>

                        <td class="px-5 py-4">
                          <span class={`font-mono font-bold ${prod.stock < 0 ? "text-rose-600" : prod.stock === 0 ? "text-slate-400" : "text-slate-700"}`}>
                            {prod.stock} u.
                          </span>
                          {prod.stock < 0 && (
                            <div class="text-[8px] text-rose-500 font-bold tracking-wider uppercase mt-0.5 animate-pulse">Negativo transitorio</div>
                          )}
                        </td>

                        <td class="px-5 py-4">
                          <div class="flex items-center gap-1">
                            <span class="text-xs font-semibold text-emerald-600 font-mono">+${profit.toFixed(2)}</span>
                            <span class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">
                              {marginPercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        <td class="px-5 py-4 text-right">
                          <div class="flex items-center justify-end gap-2">
                            {/* Stock speed adjust buttons */}
                            <div class="flex bg-slate-50 border border-slate-200 rounded-lg">
                              <button
                                onClick={() => handleAdjustStock(prod.id, -1)}
                                class="px-2 py-1 text-slate-600 hover:text-rose-600 font-bold hover:bg-slate-100/50 rounded-l-lg border-r border-slate-200"
                                title="Restar 1 unidad"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleAdjustStock(prod.id, 1)}
                                class="px-2 py-1 text-slate-600 hover:text-emerald-600 font-bold hover:bg-slate-100/50 rounded-r-lg"
                                title="Sumar 1 unidad"
                              >
                                +1
                              </button>
                            </div>

                            {/* Delete product */}
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              class="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar Producto"
                            >
                              <Trash2 class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
