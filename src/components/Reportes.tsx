import { useState } from "react";
import { Transaction } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Trash2, ShieldAlert, Sparkles, Filter, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, Layers } from "lucide-react";

interface ReportesProps {
  transactions: Transaction[];
  onResetComplete: () => void;
}

export default function Reportes({ transactions, onResetComplete }: ReportesProps) {
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Calculations
  let totalInflow = 0;
  let totalOutflow = 0;

  transactions.forEach(tx => {
    if (tx.type === "sale") {
      totalInflow += Math.abs(tx.amount);
    } else {
      totalOutflow += Math.abs(tx.amount);
    }
  });

  const netProfit = totalInflow - totalOutflow;
  const marginPercent = totalOutflow > 0 ? (netProfit / totalOutflow) * 100 : 0;

  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    if (filterType === "all") return true;
    if (filterType === "sales") return tx.type === "sale";
    if (filterType === "purchases") return tx.type === "purchase";
    if (filterType === "expenses") return tx.type === "expense";
    return true;
  });

  const handleWipeDatabase = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setShowConfirmWipe(false);

    try {
      await apiService.resetDatabase();
      setSuccessMsg("¡Base de datos restablecida correctamente!");
      onResetComplete();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Fallo al restablecer base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="reportes-section" class="space-y-6 font-sans">
      
      {/* Financial Health Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Ingresos Acumulados</p>
          <div class="flex items-center justify-between mt-1">
            <h3 class="text-2xl font-bold text-slate-900">${totalInflow.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight class="w-4 h-4" />
            </div>
          </div>
          <p class="text-[10px] text-emerald-600 font-semibold mt-1">Ventas registradas en caja</p>
        </div>

        {/* Metric 2 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Egresos / Inversión</p>
          <div class="flex items-center justify-between mt-1">
            <h3 class="text-2xl font-bold text-slate-900">${totalOutflow.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
            <div class="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight class="w-4 h-4" />
            </div>
          </div>
          <p class="text-[10px] text-rose-500 font-semibold mt-1">Insumos y costos operativos</p>
        </div>

        {/* Metric 3 */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Rendimiento Neto</p>
          <div class="flex items-center justify-between mt-1">
            <h3 class={`text-2xl font-bold ${netProfit >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ${netProfit.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </h3>
            <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${netProfit >= 0 ? "bg-indigo-50 text-indigo-700" : "bg-rose-50 text-rose-700"}`}>
              {netProfit >= 0 ? `+${marginPercent.toFixed(0)}%` : "Déficit"}
            </span>
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Margen operativo neto de caja</p>
        </div>

      </div>

      {/* Historical Ledger & Filters */}
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText class="w-5 h-5 text-indigo-600" />
              Libro de Caja y Ledger Diario
            </h2>
            <p class="text-[10px] text-slate-400">Listado cronológico de compras de insumos, gastos operativos y cobro de ventas.</p>
          </div>

          {/* Filters controls */}
          <div class="flex items-center bg-slate-50 border border-slate-150 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterType("all")}
              class={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType("sales")}
              class={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "sales" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Ventas
            </button>
            <button
              onClick={() => setFilterType("purchases")}
              class={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "purchases" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Compras
            </button>
            <button
              onClick={() => setFilterType("expenses")}
              class={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "expenses" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Gastos
            </button>
          </div>
        </div>

        {/* Ledger logs List */}
        {filteredTxs.length === 0 ? (
          <p class="text-xs text-slate-400 text-center py-12">No hay movimientos registrados para este filtro.</p>
        ) : (
          <div class="overflow-x-auto">
            <div class="max-h-[350px] overflow-y-auto pr-1">
              <table class="w-full text-left text-xs text-slate-600 font-mono">
                <thead class="bg-slate-50 font-sans text-[10px] text-slate-400 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th class="px-4 py-2.5">Fecha</th>
                    <th class="px-4 py-2.5">Categoría</th>
                    <th class="px-4 py-2.5">Descripción de Operación</th>
                    <th class="px-4 py-2.5 text-right">Monto ($)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {filteredTxs.map(tx => (
                    <tr key={tx.id} class="hover:bg-slate-50/50">
                      <td class="px-4 py-2 text-slate-500 whitespace-nowrap">{tx.date}</td>
                      <td class="px-4 py-2 uppercase font-bold text-[9px] font-sans">
                        {tx.type === "sale" && <span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Cobro Venta</span>}
                        {tx.type === "purchase" && <span class="text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Inversión Insumos</span>}
                        {tx.type === "expense" && <span class="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Gasto Operativo</span>}
                        {tx.type === "adjustment" && <span class="text-slate-600 bg-slate-50 px-2 py-0.5 rounded">Ajuste</span>}
                      </td>
                      <td class="px-4 py-2 text-slate-700 font-sans">{tx.description}</td>
                      <td class={`px-4 py-2 text-right font-bold ${tx.type === "sale" ? "text-emerald-600" : "text-rose-500"}`}>
                        {tx.type === "sale" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Advanced Maintenance panel */}
      <div class="bg-rose-50/30 border border-rose-100 p-5 rounded-2xl space-y-4">
        <div>
          <h3 class="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert class="w-4 h-4 text-rose-600" />
            Panel de Mantenimiento y Recuperación
          </h3>
          <p class="text-[10px] text-rose-700 mt-1 leading-relaxed">
            Si deseas limpiar registros viejos de prueba para comenzar a auditar tus números de producción reales, o si quieres restablecer los datos demostrativos iniciales (harina, recetas, etc.), puedes gatillar un reinicio de base de datos desde la nube.
          </p>
        </div>

        {/* Feedback alerts */}
        {successMsg && <div class="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}
        {errorMsg && <div class="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}

        <div>
          <button
            onClick={() => setShowConfirmWipe(true)}
            disabled={loading}
            class="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5 animate-spin-hover" />
            Reiniciar y Seedear Base de Datos
          </button>
        </div>
      </div>

      {/* Database Wipe Overlay Modal */}
      {showConfirmWipe && (
        <div class="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div class="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full font-sans animate-in fade-in zoom-in-95">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert class="w-6 h-6" />
            </div>

            <h3 class="text-lg font-bold text-slate-900">¿Estás absolutamente seguro?</h3>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
              Esta acción eliminará todos tus clientes, transacciones, catálogo de productos, recetas e insumos cargados en tu cuenta (ya sea de la base de datos PostgreSQL en la nube o en tu almacenamiento Local seguro).
            </p>
            <p class="text-xs text-slate-500 mt-1 font-semibold text-rose-600">
              Posteriormente, se cargarán de forma segura los valores de demostración iniciales (Dulce de Leche, Alfajor de Maicena, Harina de Trigo, etc.).
            </p>

            <div class="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmWipe(false)}
                class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                No, Cancelar
              </button>
              <button
                onClick={handleWipeDatabase}
                disabled={loading}
                class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                Sí, Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
