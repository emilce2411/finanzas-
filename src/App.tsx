import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";
import { apiService, setApiAuth, setLocalModeOnly, getIsLocalMode, getBizName } from "./lib/api.ts";
import { Insumo, Recipe, Product, Transaction, Client } from "./types.ts";

// Views imports
import Dashboard from "./components/Dashboard.tsx";
import Ventas from "./components/Ventas.tsx";
import Insumos from "./components/Insumos.tsx";
import Fabricacion from "./components/Fabricacion.tsx";
import ProductosCatalog from "./components/ProductosCatalog.tsx";
import MapaClientes from "./components/MapaClientes.tsx";
import Reportes from "./components/Reportes.tsx";

import {
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Wrench,
  Package,
  MapPin,
  FileText,
  Clock,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Edit2,
  Check,
  RotateCcw,
  WifiOff,
  CloudLightning,
  AlertCircle
} from "lucide-react";

export default function App() {
  // Global Data States
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Auth / Session States
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [bizName, setBizName] = useState("Mi Taller Gastronómico");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingBizName, setEditingBizName] = useState(false);
  const [newBizNameInput, setNewBizNameInput] = useState("");

  // Navigation state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [systemError, setSystemError] = useState("");

  // Synchronize all data pools
  const loadAllData = async () => {
    try {
      const [insList, recsList, prodsList, txsList, clientsList] = await Promise.all([
        apiService.getInsumos(),
        apiService.getRecipes(),
        apiService.getProducts(),
        apiService.getTransactions(),
        apiService.getClients()
      ]);

      setInsumos(insList);
      setRecipes(recsList);
      setProducts(prodsList);
      setTransactions(txsList);
      setClients(clientsList);

      setBizName(getBizName());
    } catch (err: any) {
      console.error("Error loading data streams:", err);
      setSystemError("No se pudo cargar la base de datos de PostgreSQL en la nube.");
    }
  };

  // Firebase auth sync
  useEffect(() => {
    let isUnmounted = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      setSystemError("");

      if (firebaseUser) {
        try {
          // Fetch token to authorize server requests
          const idToken = await firebaseUser.getIdToken();
          setApiAuth(idToken, firebaseUser.uid, firebaseUser.displayName);
          setIsLocalMode(false);

          // Sync database user in Cloud SQL
          await apiService.syncAuth();
          
          if (!isUnmounted) {
            setUser(firebaseUser);
            setIsLocalMode(false);
          }
        } catch (err) {
          console.error("Authentication integration fail:", err);
          // Graceful degradation to secure offline LocalStorage
          setLocalModeOnly(true);
          if (!isUnmounted) {
            setUser({ uid: "local-demo-user", displayName: "Materia Prima Demo" });
            setIsLocalMode(true);
          }
        }
      } else {
        // Safe Offline Local mode by default if not signed in
        setLocalModeOnly(true);
        if (!isUnmounted) {
          setUser(null);
          setIsLocalMode(true);
        }
      }

      setIsAuthLoading(false);
    });

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, []);

  // Trigger loading state once auth mode is stabilized
  useEffect(() => {
    if (!isAuthLoading) {
      loadAllData();
    }
  }, [user, isAuthLoading, isLocalMode]);

  // Auth Action Handlers
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setSystemError("");
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.warn("Auth Popup blocked or failed. Degrading gracefully to Local Storage...", err);
      // Degrade to safe LocalStorage mode
      setLocalModeOnly(true);
      setIsLocalMode(true);
      setUser({ uid: "local-demo-user", displayName: "Materia Prima Demo" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleOfflineTrial = () => {
    setLocalModeOnly(true);
    setIsLocalMode(true);
    setUser({ uid: "local-demo-user", displayName: "Materia Prima Demo" });
    setIsAuthLoading(false);
    loadAllData();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    } finally {
      // Clear states completely
      setApiAuth(null, "local-demo-user", null);
      setLocalModeOnly(true);
      setIsLocalMode(true);
      setUser(null);
      setActiveTab("dashboard");
      setBizName("Mi Taller Gastronómico");
      try {
        localStorage.removeItem(`es_biz_insumos_user_local-demo-user`);
        localStorage.removeItem(`es_biz_recipes_user_local-demo-user`);
        localStorage.removeItem(`es_biz_products_user_local-demo-user`);
        localStorage.removeItem(`es_biz_transactions_user_local-demo-user`);
        localStorage.removeItem(`es_biz_clients_user_local-demo-user`);
        localStorage.removeItem(`es_biz_profile_user_local-demo-user`);
      } catch (storageErr) {
        console.warn("Could not clear localStorage due to security restrictions:", storageErr);
      }
    }
  };

  const handleUpdateBizName = async () => {
    if (!newBizNameInput.trim()) return;
    try {
      await apiService.updateProfile(newBizNameInput.trim());
      setBizName(newBizNameInput.trim());
      setEditingBizName(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Gateway Screen
  if (isAuthLoading) {
    return (
      <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h1 class="text-xl font-bold text-slate-950 font-display">FinanzasPro v5.0</h1>
            <p class="text-xs text-slate-400 mt-1 uppercase tracking-wider animate-pulse">Sincronizando sistemas y bases de datos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-indigo-600 selection:text-white">
        <div class="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
          <div class="text-center">
            <span class="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-150 uppercase tracking-wider">
              Sistema Multi-inquilino
            </span>
            <h1 class="text-3xl font-extrabold text-slate-900 mt-4 font-display">FinanzasPro</h1>
            <p class="text-xs text-slate-400 mt-1">Gestor de Negocios Inteligente de Taller y Producción</p>
          </div>

          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-500">
            <p class="font-bold text-slate-700 flex items-center gap-1">📊 Características de Producción:</p>
            <ul class="list-disc pl-4 space-y-1">
              <li>Materia prima de despensa con cálculo de costo por gramo/ml.</li>
              <li>Taller de fabricación con checklist de abastecimiento y mermas.</li>
              <li>Caja registradora con soporte de stock negativo transitorio.</li>
              <li>Geolocalización GPS e interactividad con Leaflet Map.</li>
              <li>Información y auditoría inteligente potenciada por Gemini AI.</li>
            </ul>
          </div>

          <div class="space-y-3">
            {/* Google Authentication */}
            <button
              onClick={handleGoogleSignIn}
              class="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Sparkles class="w-4 h-4 text-emerald-400 animate-pulse" />
              Ingresar con Cuenta de Google
            </button>

            <div class="flex items-center my-4">
              <div class="flex-1 border-t border-slate-150"></div>
              <span class="px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider">O también</span>
              <div class="flex-1 border-t border-slate-150"></div>
            </div>

            {/* Local Storage Offline Mode */}
            <button
              onClick={handleOfflineTrial}
              class="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-150 text-indigo-700 font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer border border-indigo-150"
            >
              <WifiOff class="w-4 h-4 text-indigo-500" />
              Probar sin Cuenta (Modo Local Seguro)
            </button>
          </div>

          <p class="text-[10px] text-slate-400 text-center leading-relaxed">
            FinanzasPro v5.0 protege la privacidad de tu negocio. Si ingresas con Google, tus datos se sincronizan con tu propio espacio aislado en PostgreSQL. En modo local, los datos residen únicamente en tu navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Resilient Mode top warning banner if in Local Storage mode */}
      {isLocalMode && (
        <div class="bg-indigo-50 text-indigo-700 border-b border-indigo-100/50 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff class="w-4 h-4 shrink-0 text-indigo-500" />
          <span>Estás operando en <b>Modo Almacenamiento Local Seguro</b>. Tus registros se conservarán únicamente en este navegador.</span>
          <button
            onClick={handleGoogleSignIn}
            class="underline text-[10px] hover:text-indigo-900 font-bold uppercase tracking-wider ml-1 cursor-pointer"
          >
            Sincronizar con la Nube (Google)
          </button>
        </div>
      )}

      {/* Main Core Header Bar */}
      <header class="bg-white border-b border-slate-100 sticky top-0 z-[100] shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md font-display font-black text-lg tracking-tight">
              FP
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                {editingBizName ? (
                  <div class="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newBizNameInput}
                      onChange={e => setNewBizNameInput(e.target.value)}
                      placeholder="Ej. Mi Taller"
                      class="px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                    />
                    <button
                      onClick={handleUpdateBizName}
                      class="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      <Check class="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 class="text-sm font-black text-slate-900 tracking-tight uppercase">{bizName}</h1>
                    <button
                      onClick={() => {
                        setNewBizNameInput(bizName);
                        setEditingBizName(true);
                      }}
                      class="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Editar nombre del taller"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p class="text-[10px] text-slate-400 font-medium">FinanzasPro v5.0 - Gestor Inteligente</p>
            </div>
          </div>

          {/* User Profile dropdown panel */}
          <div class="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              class="flex items-center gap-2 bg-slate-50 border border-slate-200/60 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div class="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center uppercase shadow">
                {user.displayName ? user.displayName.slice(0, 2) : "EM"}
              </div>
              <span class="text-xs font-semibold text-slate-700 hidden sm:inline">{user.displayName || "Emprendedor"}</span>
              <ChevronDown class="w-3.5 h-3.5 text-slate-400 mr-1" />
            </button>

            {showProfileMenu && (
              <div class="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-150 shadow-xl py-2 z-[9999] animate-in fade-in slide-in-from-top-1">
                <div class="px-4 py-2 border-b border-slate-50 text-xs">
                  <p class="font-bold text-slate-900 truncate">{user.displayName || "Invitado"}</p>
                  <p class="text-[10px] text-slate-400 truncate mt-0.5">{user.email || "modo-offline@demo.com"}</p>
                </div>
                
                <button
                  onClick={handleSignOut}
                  class="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 text-left transition-colors cursor-pointer"
                >
                  <LogOut class="w-4 h-4" />
                  Cerrar Sesión / Salir
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Navigation upper tab control */}
      <nav class="bg-white border-b border-slate-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
            
            {/* Nav tabs */}
            <button
              onClick={() => setActiveTab("dashboard")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "dashboard" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <LayoutDashboard class="w-3.5 h-3.5" />
              Panel Central
            </button>

            <button
              onClick={() => setActiveTab("ventas")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "ventas" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <ShoppingBag class="w-3.5 h-3.5" />
              Caja de Ventas
            </button>

            <button
              onClick={() => setActiveTab("insumos")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "insumos" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Layers class="w-3.5 h-3.5" />
              Despensa Insumos
            </button>

            <button
              onClick={() => setActiveTab("fabricacion")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "fabricacion" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Wrench class="w-3.5 h-3.5" />
              Taller Fabricación
            </button>

            <button
              onClick={() => setActiveTab("productos")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "productos" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Package class="w-3.5 h-3.5" />
              Productos Finales
            </button>

            <button
              onClick={() => setActiveTab("mapa")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "mapa" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <MapPin class="w-3.5 h-3.5" />
              Georreferencia
            </button>

            <button
              onClick={() => setActiveTab("reportes")}
              class={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "reportes" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <FileText class="w-3.5 h-3.5" />
              Balances y Ledger
            </button>

          </div>
        </div>
      </nav>

      {/* Main Content Stage View container */}
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* System level warning banner if any database offline */}
        {systemError && (
          <div class="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
            <span>⚠️ {systemError} Operando provisionalmente en almacenamiento local temporal.</span>
          </div>
        )}

        {/* Dynamic Route views resolver */}
        <div class="animate-in fade-in duration-200">
          {activeTab === "dashboard" && (
            <Dashboard
              insumos={insumos}
              products={products}
              transactions={transactions}
              onTabChange={setActiveTab}
              bizName={bizName}
            />
          )}

          {activeTab === "ventas" && (
            <Ventas
              products={products}
              onSaleComplete={loadAllData}
            />
          )}

          {activeTab === "insumos" && (
            <Insumos
              insumos={insumos}
              onInsumosChange={loadAllData}
            />
          )}

          {activeTab === "fabricacion" && (
            <Fabricacion
              insumos={insumos}
              recipes={recipes}
              onFabricacionComplete={loadAllData}
            />
          )}

          {activeTab === "productos" && (
            <ProductosCatalog
              products={products}
              setProducts={setProducts}
              onProductsChange={loadAllData}
            />
          )}

          {activeTab === "mapa" && (
            <MapaClientes
              clients={clients}
              onClientAdded={loadAllData}
              onClientDeleted={loadAllData}
            />
          )}

          {activeTab === "reportes" && (
            <Reportes
              transactions={transactions}
              onResetComplete={loadAllData}
            />
          )}
        </div>

      </main>

      {/* Humble aesthetic footer */}
      <footer class="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 FinanzasPro v5.0 — Diseñado para el taller productivo y el emprendimiento artesanal.</p>
        <p class="text-[9px] mt-1 font-mono text-slate-300">Base de datos PostgreSQL georreferenciada con OpenStreetMap y AI Studio.</p>
      </footer>

    </div>
  );
}
