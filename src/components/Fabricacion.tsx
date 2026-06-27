import React, { useState } from "react";
import { Insumo, Recipe, RecipeIngredient } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Layers, Percent, Sliders, Play, ChefHat, HelpCircle } from "lucide-react";

interface FabricacionProps {
  insumos: Insumo[];
  recipes: Recipe[];
  onFabricacionComplete: () => void;
}

export default function Fabricacion({ insumos, recipes, onFabricacionComplete }: FabricacionProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Recipe Creation States
  const [recipeName, setRecipeName] = useState("");
  const [recipeYield, setRecipeYield] = useState("12"); // Default rinde 12 piezas
  const [recipeMargin, setRecipeMargin] = useState("150"); // Default +150% ganancia

  // Temporary list of ingredients being added to the new recipe
  const [tempIngredients, setTempIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState("");
  const [qtyUsed, setQtyUsed] = useState("");

  // Fabrication states (Batch production)
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [batchesToProduce, setBatchesToProduce] = useState(1);

  // Helper to get full info of a raw material
  const getInsumoInfo = (id: number) => {
    return insumos.find(i => i.id === id);
  };

  const handleAddIngredientToTemp = () => {
    if (!selectedInsumoId || !qtyUsed) return;
    const insId = parseInt(selectedInsumoId);
    const amount = parseFloat(qtyUsed);

    if (amount <= 0) return;

    // Check duplicate
    const exists = tempIngredients.some(i => i.insumoId === insId);
    if (exists) {
      setErrorMsg("Este insumo ya fue agregado a la receta.");
      return;
    }

    const matchedInsumo = getInsumoInfo(insId);
    const newIng: RecipeIngredient = {
      insumoId: insId,
      quantityUsed: amount,
      insumoName: matchedInsumo?.name,
      insumoUnit: matchedInsumo?.unit,
      insumoUnitCost: matchedInsumo?.unitCost,
    };

    setTempIngredients([...tempIngredients, newIng]);
    setQtyUsed("");
    setErrorMsg("");
  };

  const handleRemoveTempIngredient = (idx: number) => {
    setTempIngredients(tempIngredients.filter((_, i) => i !== idx));
  };

  // On-the-fly calculations for new recipe creation
  const calculateTempRecipeCost = () => {
    let total = 0;
    tempIngredients.forEach(ing => {
      const ins = getInsumoInfo(ing.insumoId);
      const unitCost = ins ? ins.unitCost : 0;
      total += unitCost * ing.quantityUsed;
    });
    return total;
  };

  const tempTotalCost = calculateTempRecipeCost();
  const tempYield = parseFloat(recipeYield) || 0;
  const tempMargin = parseFloat(recipeMargin) || 0;
  const tempCostPerPiece = tempYield > 0 ? tempTotalCost / tempYield : 0;
  const tempSuggestedPrice = tempCostPerPiece * (1 + tempMargin / 100);

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!recipeName.trim() || tempIngredients.length === 0) {
      setErrorMsg("Por favor ingresa un nombre y agrega al menos un ingrediente.");
      return;
    }

    setLoading(true);

    try {
      await apiService.createRecipe({
        name: recipeName.trim(),
        yield: tempYield,
        marginPercent: tempMargin,
        ingredients: tempIngredients.map(i => ({
          insumoId: i.insumoId,
          quantityUsed: i.quantityUsed,
        })),
      });

      // Clear states
      setRecipeName("");
      setRecipeYield("12");
      setRecipeMargin("150");
      setTempIngredients([]);
      setSuccessMsg("¡Receta registrada y vinculada al catálogo de venta!");
      onFabricacionComplete();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al crear la receta de taller.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta fórmula? Se desvinculará del taller.")) return;
    try {
      await apiService.deleteRecipe(id);
      onFabricacionComplete();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al eliminar receta.");
    }
  };

  // Production batch validation analysis
  const getAbastecimientoAnalysis = (recipe: Recipe) => {
    const analysis: { insumoName: string; required: number; has: number; unit: string; ok: boolean }[] = [];
    let isAbastecido = true;

    recipe.ingredients.forEach(ing => {
      const ins = getInsumoInfo(ing.insumoId);
      const totalRequired = ing.quantityUsed * batchesToProduce;
      const actualStock = ins ? ins.quantity : 0;
      const ok = actualStock >= totalRequired;

      if (!ok) isAbastecido = false;

      analysis.push({
        insumoName: ing.insumoName || ins?.name || "Insumo",
        required: totalRequired,
        has: actualStock,
        unit: ing.insumoUnit || ins?.unit || "unidades",
        ok,
      });
    });

    return { analysis, isAbastecido };
  };

  const activeRecipe = recipes.find(r => r.id === selectedRecipeId);
  const abastecimiento = activeRecipe ? getAbastecimientoAnalysis(activeRecipe) : null;

  const handleFabricar = async () => {
    if (!selectedRecipeId || !abastecimiento) return;
    if (!abastecimiento.isAbastecido) {
      setErrorMsg("No puedes fabricar esta tanda. Te faltan materias primas.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await apiService.executeFabricacion(selectedRecipeId, batchesToProduce);
      setSuccessMsg(`¡Fabricación Exitosa! Se añadieron +${res.qtyProduced} unidades de "${activeRecipe?.name}" al catálogo de ventas.`);
      setBatchesToProduce(1);
      setSelectedRecipeId(null);
      onFabricacionComplete();

      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al procesar la fabricación en taller.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="fabricacion-section" class="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Col 1: Formula Creator Form */}
      <div class="lg:col-span-1 space-y-6">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h2 class="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ChefHat class="w-5 h-5 text-indigo-600" />
            Nueva Fórmula / Receta
          </h2>

          <form onSubmit={handleCreateRecipe} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre de la Receta *</label>
              <input
                type="text"
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder="Ej. Alfajor de Maicena"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Rendimiento (Unidades) *</label>
                <input
                  type="number"
                  value={recipeYield}
                  onChange={e => setRecipeYield(e.target.value)}
                  placeholder="Ej. 24"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Margen Ganancia (%) *</label>
                <input
                  type="number"
                  value={recipeMargin}
                  onChange={e => setRecipeMargin(e.target.value)}
                  placeholder="Ej. 150"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Ingredients sub-builder */}
            <div class="border-t border-slate-100 pt-3">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ingredientes de Despensa</label>
              
              <div class="flex gap-2 mb-2">
                <select
                  value={selectedInsumoId}
                  onChange={e => setSelectedInsumoId(e.target.value)}
                  class="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">-- Elegir Insumo --</option>
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (${i.unitCost.toFixed(4)}/{i.unit})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="any"
                  value={qtyUsed}
                  onChange={e => setQtyUsed(e.target.value)}
                  placeholder="Cant."
                  class="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddIngredientToTemp}
                  class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-150 cursor-pointer"
                >
                  Añadir
                </button>
              </div>

              {/* Temporary Ingredients Checklist list */}
              <div class="space-y-1 max-h-[140px] overflow-y-auto mt-2">
                {tempIngredients.length === 0 ? (
                  <p class="text-[10px] text-slate-400 italic text-center py-4">Agrega insumos de arriba para componer la fórmula.</p>
                ) : (
                  tempIngredients.map((ing, idx) => (
                    <div key={idx} class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span class="font-medium text-slate-800">{ing.insumoName}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-slate-500 font-semibold">
                          {ing.quantityUsed}{ing.insumoUnit} (${((ing.insumoUnitCost || 0) * ing.quantityUsed).toFixed(2)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempIngredient(idx)}
                          class="text-rose-500 hover:text-rose-700 font-bold px-1"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dynamic Formula financial calculations */}
            {tempIngredients.length > 0 && (
              <div class="bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-1.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-slate-500">Costo total de tanda:</span>
                  <span class="font-mono font-bold text-slate-800">${tempTotalCost.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Costo Unitario Pieza:</span>
                  <span class="font-mono font-bold text-slate-850">${tempCostPerPiece.toFixed(2)}</span>
                </div>
                <div class="flex justify-between border-t border-indigo-100/50 pt-1.5">
                  <span class="font-bold text-slate-700">Precio Sugerido Venta:</span>
                  <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 rounded">${tempSuggestedPrice.toFixed(2)}</span>
                </div>
                <p class="text-[9px] text-indigo-500 mt-1">Margen aplicado: {tempMargin}% sobre costo de fabricación.</p>
              </div>
            )}

            {errorMsg && <div class="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}
            {successMsg && <div class="text-xs text-emerald-500 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}

            <button
              type="submit"
              disabled={loading || tempIngredients.length === 0}
              class={`w-full font-semibold py-2.5 rounded-xl text-sm transition-colors text-white cursor-pointer ${
                tempIngredients.length === 0 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-slate-900 hover:bg-slate-850"
              }`}
            >
              Registrar Fórmula
            </button>
          </form>
        </div>

      </div>

      {/* Col 2-3: Recipes listing & Live batch fabrication tool */}
      <div class="lg:col-span-2 space-y-6">
        
        {/* Active formulas */}
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Fórmulas del Taller</h2>

          {recipes.length === 0 ? (
            <p class="text-xs text-slate-400 italic py-8 text-center">No hay recetas cargadas. Crea una fórmula a la izquierda.</p>
          ) : (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  class={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRecipeId === recipe.id 
                    ? "border-indigo-500 bg-indigo-50/10 shadow-sm" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                  }`}
                >
                  <div>
                    <div class="flex items-start justify-between">
                      <h3 class="text-sm font-bold text-slate-900">{recipe.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecipe(recipe.id);
                        }}
                        class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p class="text-[10px] text-indigo-600 font-bold bg-indigo-50/80 px-2 py-0.5 rounded-full inline-block mt-1">
                      Rinde: {recipe.yield} u. / Margen: +{recipe.marginPercent}%
                    </p>

                    <div class="mt-3 space-y-1 text-xs">
                      <p class="text-slate-500 flex justify-between font-mono">
                        <span>Costo Pieza:</span>
                        <b>${recipe.costPerPiece.toFixed(2)}</b>
                      </p>
                      <p class="text-slate-500 flex justify-between font-mono">
                        <span>Precio Venta:</span>
                        <b class="text-slate-800">${recipe.suggestedPrice.toFixed(2)}</b>
                      </p>
                    </div>
                  </div>

                  <div class="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Ingredientes: {recipe.ingredients.length}</span>
                    <span class="font-semibold text-indigo-600 hover:underline">Seleccionar para Fabricar &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Batch Fabrication Panel */}
        {activeRecipe && (
          <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <Sliders class="w-5 h-5 text-amber-400" />
                <div>
                  <h3 class="text-sm font-bold">Taller de Fabricación Activo</h3>
                  <p class="text-[10px] text-slate-400">Produciendo: <b>{activeRecipe.name}</b></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecipeId(null)}
                class="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {/* Slider Batch Control */}
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300">Tandas a fabricar:</span>
                <span class="font-bold text-amber-400 text-sm font-mono">{batchesToProduce} tanda(s) (= {activeRecipe.yield * batchesToProduce} unidades terminadas)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={batchesToProduce}
                onChange={e => setBatchesToProduce(parseInt(e.target.value))}
                class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Abastecimiento Checklist */}
            <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chequeo de Disponibilidad de Despensa</h4>
              
              <div class="space-y-1.5">
                {abastecimiento?.analysis.map((item, idx) => (
                  <div key={idx} class="flex items-center justify-between text-xs">
                    <span class="text-slate-300">{item.insumoName}</span>
                    <div class="flex items-center gap-2 font-mono">
                      <span class="text-[10px] text-slate-400">Req: {item.required}{item.unit} / Tienes: {item.has}{item.unit}</span>
                      {item.ok ? (
                        <span class="text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 class="w-3.5 h-3.5 inline" /> Ok
                        </span>
                      ) : (
                        <span class="text-rose-500 font-bold flex items-center gap-0.5">
                          <AlertTriangle class="w-3.5 h-3.5 inline animate-pulse" /> Faltante
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit execution */}
            <div class="flex items-center justify-between pt-2">
              <p class="text-[10px] text-slate-400 max-w-[250px]">
                Al confirmar, se descontarán automáticamente los insumos en despensa e ingresarán las unidades terminadas al inventario de ventas.
              </p>
              
              <button
                onClick={handleFabricar}
                disabled={loading || !abastecimiento?.isAbastecido}
                class={`flex items-center gap-1.5 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors shadow cursor-pointer ${
                  abastecimiento?.isAbastecido 
                  ? "bg-amber-500 hover:bg-amber-450 text-slate-950 active:bg-amber-600" 
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                }`}
              >
                <Play class="w-3.5 h-3.5 fill-current" />
                {loading ? "Fabricando..." : "Fabricar Tanda Ahora"}
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
