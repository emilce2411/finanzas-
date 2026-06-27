import { useState } from "react";
import { Product } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Search, ShoppingCart, Trash2, Plus, Minus, Check, AlertTriangle, User } from "lucide-react";

interface VentasProps {
  products: Product[];
  onSaleComplete: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function Ventas({ products, onSaleComplete }: VentasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Negative Stock Modal States
  const [showNegativeModal, setShowNegativeModal] = useState(false);

  // Filtered Products List
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    setErrorMsg("");
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prevCart, { product, qty: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  };

  const checkHasNegativeStock = () => {
    return cart.some(item => item.qty > item.product.stock);
  };

  const handleCheckoutTrigger = () => {
    if (cart.length === 0) return;
    setErrorMsg("");
    
    // Check if any cart item exceeds physical ready stock
    if (checkHasNegativeStock()) {
      setShowNegativeModal(true);
    } else {
      executeCheckout();
    }
  };

  const executeCheckout = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setShowNegativeModal(false);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.product.id,
        qty: item.qty,
      }));

      await apiService.checkoutCart(itemsPayload, clientName.trim() || undefined);

      // Reset cart and states
      setCart([]);
      setClientName("");
      setSuccessMsg("¡Venta registrada con éxito!");
      onSaleComplete();

      // Clear success notification
      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("No se pudo procesar la venta. Verifique los stocks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ventas-section" class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Catalog Search & Grid Card List */}
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
          <span class="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider shrink-0">
            {filteredProducts.length} Productos
          </span>
        </div>

        {/* Catalog grid */}
        {filteredProducts.length === 0 ? (
          <div class="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
            <ShoppingCart class="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p class="text-sm font-bold text-slate-700">No hay productos que coincidan con la búsqueda.</p>
            <p class="text-xs text-slate-400 mt-1">Crea nuevos productos finales o fabrica recetas en el taller.</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(prod => {
              const inCartItem = cart.find(item => item.product.id === prod.id);
              const cartQty = inCartItem ? inCartItem.qty : 0;
              const remainingStock = prod.stock - cartQty;

              return (
                <div
                  key={prod.id}
                  class={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    remainingStock < 0 
                    ? "border-amber-200/80 bg-amber-50/10" 
                    : prod.stock === 0 
                    ? "border-rose-100 bg-rose-50/5" 
                    : "border-slate-100 hover:shadow-md hover:border-indigo-100"
                  }`}
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="text-sm font-bold text-slate-900 line-clamp-2">{prod.name}</h3>
                      <span class="text-sm font-bold text-indigo-600 shrink-0 bg-indigo-50/80 px-2.5 py-0.5 rounded-full font-mono border border-indigo-100">
                        ${prod.price.toFixed(2)}
                      </span>
                    </div>

                    <div class="flex items-center gap-1.5 mt-3">
                      <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        prod.stock > 10 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : prod.stock > 0 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {prod.stock > 0 ? `Stock: ${prod.stock} u.` : "Sin Stock Físico"}
                      </span>

                      {cartQty > 0 && (
                        <span class="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          En carrito: {cartQty} u.
                        </span>
                      )}
                    </div>

                    <p class="text-[10px] text-slate-400 mt-2 font-mono">Costo Unitario Ref: ${prod.cost ? prod.cost.toFixed(2) : "0.00"}</p>
                  </div>

                  <div class="mt-4 pt-4 border-t border-slate-100/70">
                    <button
                      onClick={() => handleAddToCart(prod)}
                      class="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      Añadir a Caja
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Ledger Panel */}
      <div class="lg:col-span-1">
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[480px] h-full justify-between sticky top-4">
          
          <div>
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingCart class="w-4 h-4 text-emerald-500" />
              Carrito de Facturación
            </h2>

            {/* Client register */}
            <div class="mb-4">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente (Opcional)</label>
              <div class="relative">
                <User class="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Panadería San José"
                  class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cart Items list */}
            <div class="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p class="text-xs text-slate-400 text-center py-12">El carrito de compras está vacío.</p>
              ) : (
                cart.map(item => {
                  const hasNegative = item.qty > item.product.stock;

                  return (
                    <div
                      key={item.product.id}
                      class={`p-3 rounded-xl border flex items-center justify-between ${
                        hasNegative 
                        ? "border-amber-200 bg-amber-50/30" 
                        : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div class="flex-1 min-w-0 pr-2">
                        <h4 class="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
                        <p class="text-[10px] text-indigo-600 font-mono mt-0.5">${item.product.price.toFixed(2)} c/u</p>
                        
                        {hasNegative && (
                          <span class="inline-flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 font-bold px-1 py-0.5 rounded border border-amber-100 mt-1">
                            <AlertTriangle class="w-2.5 h-2.5 shrink-0" /> Excede stock ({item.product.stock} u. disponible)
                          </span>
                        )}
                      </div>

                      <div class="flex items-center gap-2">
                        {/* Adjust quantities buttons */}
                        <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            class="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-l-lg"
                          >
                            <Minus class="w-3 h-3" />
                          </button>
                          <span class="px-2 text-xs font-bold font-mono text-slate-800">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            class="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-r-lg"
                          >
                            <Plus class="w-3 h-3" />
                          </button>
                        </div>

                        {/* Trash */}
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Subtotal & Action triggers */}
          <div class="border-t border-slate-100 pt-4 mt-4 space-y-4">
            
            {/* Feedbacks */}
            {successMsg && <div class="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}
            {errorMsg && <div class="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}

            <div class="flex items-center justify-between text-slate-700">
              <span class="text-xs font-bold uppercase tracking-wider">Total Venta</span>
              <span class="text-xl font-bold font-mono text-slate-900">${calculateTotal().toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckoutTrigger}
              disabled={loading || cart.length === 0}
              class={`w-full font-bold py-3 px-4 rounded-xl text-sm transition-colors text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                cart.length === 0 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-505 active:bg-emerald-700"
              }`}
            >
              <Check class="w-4 h-4" />
              {loading ? "Procesando pago..." : "Registrar Checkout (Cobro)"}
            </button>
          </div>

        </div>
      </div>

      {/* Negative Stock Warning Modal Overlay */}
      {showNegativeModal && (
        <div class="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div class="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full font-sans animate-in fade-in zoom-in-95">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle class="w-6 h-6 animate-bounce" />
            </div>

            <h3 class="text-lg font-bold text-slate-900">Confirmar Venta con Stock Insuficiente</h3>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
              Estás intentando vender productos que no poseen suficiente stock físico fabricado en el catálogo de productos terminados.
            </p>
            
            <div class="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mt-3">
              <p class="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
                ⚠️ Consecuencia de venta negativa transitoria:
              </p>
              <p class="text-[11px] text-amber-700 mt-1 font-medium">
                El stock del catálogo se reducirá por debajo de cero (ej. -2 unidades). Deberás registrar tandas de fabricación en el taller posteriormente para regularizar tus existencias.
              </p>
            </div>

            <div class="flex gap-3 mt-5">
              <button
                onClick={() => setShowNegativeModal(false)}
                class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver y Ajustar Carrito
              </button>
              <button
                onClick={executeCheckout}
                disabled={loading}
                class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                Vender en Negativo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
