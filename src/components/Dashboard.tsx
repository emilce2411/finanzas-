import { useState } from "react";
import { Insumo, Product, Transaction } from "../types.ts";
import { apiService } from "../lib/api.ts";
import {
  TrendingUp,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  Layers,
  Wrench,
  Send,
  HelpCircle,
  Clock,
  Briefcase
} from "lucide-react";

interface DashboardProps {
  insumos: Insumo[];
  products: Product[];
  transactions: Transaction[];
  onTabChange: (tab: string) => void;
  bizName: string;
}

export default function Dashboard({ insumos, products, transactions, onTabChange, bizName }: DashboardProps) {
  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Financial calculations
  let totalSales = 0;
  let totalPurchases = 0;
  let totalExpenses = 0;

  transactions.forEach((tx) => {
    if (tx.type === "sale") {
      totalSales += Math.abs(tx.amount);
    } else if (tx.type === "purchase") {
      totalPurchases += Math.abs(tx.amount);
    } else if (tx.type === "expense") {
      totalExpenses += Math.abs(tx.amount);
    }
  });

  const netCaja = totalSales - totalPurchases - totalExpenses;

  // Alerts: items with stock under 1500g/ml or units
  const lowStockInsumos = insumos.filter((i) => i.quantity < 1500);

  // Quick preset questions for AI Advisor
  const presetPrompts = [
    "¿Qué insumos tienen el stock más crítico y cuándo debo reponerlos?",
    "¿Cuáles de mis productos tienen el mejor margen y cómo puedo maximizar ventas?",
    "Dame un diagnóstico de mi caja neta libre actual y cómo reducir costos operativos.",
    "Sugiéreme un precio óptimo para mis alfajores si la harina sube un 20%."
  ];

  const handleAskAi = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const response = await apiService.askAiAdvisor(promptText);
      setAiResponse(response);
    } catch (err: any) {
      console.error(err);
      setAiResponse("Lo siento, no pude contactar al asesor inteligente. Revisa tu conexión.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="dashboard-section" class="space-y-8 font-sans">
      
      {/* Welcome & Fast Action Header */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-6 rounded-2xl border border-slate-800 text-white shadow-md">
        <div>
          <div class="flex items-center gap-2">
            <span class="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/35 font-bold uppercase tracking-wider">Taller Activo</span>
            <span class="text-xs text-slate-400 flex items-center gap-1">
              <Clock class="w-3.5 h-3.5" /> UTC {new Date().toISOString().slice(0, 10)}
            </span>
          </div>
          <h1 class="text-2xl font-bold text-white mt-2 font-display">¡Hola, {bizName || "Emprendedor"}!</h1>
          <p class="text-xs text-slate-300 mt-1">Este es tu centro de operaciones para controlar producción, insumos y utilidades netas.</p>
        </div>

        {/* Action Triggers */}
        <div class="flex flex-wrap gap-2.5">
          <button
            onClick={() => onTabChange("ventas")}
            class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <ShoppingBag class="w-3.5 h-3.5" />
            Registrar Venta (🟢)
          </button>
          <button
            onClick={() => onTabChange("insumos")}
            class="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <Layers class="w-3.5 h-3.5" />
            Comprar Insumos (🔴)
          </button>
          <button
            onClick={() => onTabChange("fabricacion")}
            class="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-450 active:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <Wrench class="w-3.5 h-3.5" />
            Fabricar Tanda (🛠️)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Ventas Totales</p>
            <h3 class="text-xl font-bold text-slate-900 mt-0.5">${totalSales.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
            <p class="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">🟢 Ingresos de caja</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Layers class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Inversión Insumos</p>
            <h3 class="text-xl font-bold text-slate-900 mt-0.5">${totalPurchases.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
            <p class="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-0.5">🔴 Compra de materias</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ArrowRightLeft class="w-6 h-6" />
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Gastos Operativos</p>
            <h3 class="text-xl font-bold text-slate-900 mt-0.5">${totalExpenses.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
            <p class="text-[10px] text-indigo-500 font-semibold mt-1 flex items-center gap-0.5">🔵 Luz, gas, alquileres</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <DollarSign class="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Caja Neta Libre</p>
            <h3 class={`text-xl font-bold mt-0.5 ${netCaja >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ${netCaja.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </h3>
            <p class="text-[10px] font-semibold mt-1 flex items-center gap-0.5">
              {netCaja >= 0 ? "🟢 Balance positivo" : "⚠️ Saldo negativo"}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Stock Warning */}
      {lowStockInsumos.length > 0 && (
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-amber-900">Alerta de Abastecimiento de Materias Primas</h4>
            <div class="mt-1 flex flex-wrap gap-2">
              {lowStockInsumos.map((i) => (
                <span key={i.id} class="inline-flex items-center gap-1 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-amber-800">
                  ⚠️ {i.name}: {i.quantity.toLocaleString()}{i.unit}
                </span>
              ))}
            </div>
            <p class="text-[10px] text-amber-700/85 mt-1.5">Sugerimos registrar una nueva compra de insumos desde el Taller para evitar detener la fabricación.</p>
          </div>
        </div>
      )}

      {/* Intelligent AI Advisor Panel */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Advisor Section */}
        <div class="lg:col-span-2 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800 p-6 flex flex-col shadow-lg">
          <div class="flex items-center gap-2 mb-4">
            <div class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles class="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 class="text-sm font-bold font-display uppercase tracking-wider text-white">Asesor de Negocios Inteligente</h2>
              <p class="text-[10px] text-slate-400">Desarrollado con Gemini 3.5 y PostgreSQL para diagnóstico predictivo</p>
            </div>
          </div>

          {/* Preset Prompts Bubble Grid */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(p);
                  handleAskAi(p);
                }}
                class="text-left bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-3 rounded-xl text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer flex gap-1.5 items-start group"
              >
                <HelpCircle class="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 group-hover:text-emerald-400 transition-colors" />
                <span>{p}</span>
              </button>
            ))}
          </div>

          {/* AI Response Box */}
          <div class="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 overflow-y-auto max-h-[220px] text-xs leading-relaxed text-slate-300 font-mono scrollbar-thin">
            {aiLoading ? (
              <div class="flex flex-col items-center justify-center py-10 gap-3">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-[10px] text-indigo-400 tracking-wider uppercase animate-pulse">Analizando flujos, recetas y costos de inventario...</p>
              </div>
            ) : aiResponse ? (
              <div class="whitespace-pre-wrap select-all selection:bg-indigo-600">
                {aiResponse}
              </div>
            ) : (
              <div class="text-center py-8 text-slate-500">
                <Sparkles class="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p class="text-[11px]">Haz una consulta arriba o redacta una pregunta sobre tus márgenes, balance o necesidades de taller.</p>
              </div>
            )}
          </div>

          {/* Chat Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAi(aiPrompt);
            }}
            class="mt-4 flex items-center gap-2"
          >
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej. ¿Cómo puedo optimizar la receta del Alfajor Premium?"
              class="flex-1 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:border-indigo-500 placeholder-slate-500 font-mono"
            />
            <button
              type="submit"
              disabled={aiLoading}
              class="p-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 text-white rounded-xl transition-all cursor-pointer"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Business Summary Card */}
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
          <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase class="w-4 h-4 text-indigo-600" />
            Resumen de Activos
          </h2>

          <div class="grid grid-cols-2 gap-3 flex-1">
            <div class="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span class="text-[10px] text-slate-400 font-medium">Insumos Registrados</span>
              <span class="text-xl font-bold text-slate-800 mt-2">{insumos.length}</span>
              <span class="text-[9px] text-slate-500 mt-1">Materias en despensa</span>
            </div>
            
            <div class="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span class="text-[10px] text-slate-400 font-medium">Catálogo de Productos</span>
              <span class="text-xl font-bold text-slate-800 mt-2">{products.length}</span>
              <span class="text-[9px] text-slate-500 mt-1">Bienes listos de venta</span>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span class="text-[10px] text-slate-400 font-medium">Movimientos de Caja</span>
              <span class="text-xl font-bold text-slate-800 mt-2">{transactions.length}</span>
              <span class="text-[9px] text-slate-500 mt-1">Transacciones históricas</span>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span class="text-[10px] text-slate-400 font-medium">Stock Total de Venta</span>
              <span class="text-xl font-bold text-slate-850 mt-2">
                {products.reduce((acc, p) => acc + p.stock, 0)} u.
              </span>
              <span class="text-[9px] text-slate-500 mt-1">Unidades físicas listas</span>
            </div>
          </div>

          <div class="border-t pt-3.5 flex items-center justify-between text-xs text-slate-500">
            <span>Última Transacción:</span>
            <span class="font-semibold text-slate-800 truncate max-w-[150px]">
              {transactions[0] ? transactions[0].description : "Ninguna registrada"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
