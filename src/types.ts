export interface User {
  id: number;
  uid: string;
  email: string;
  bizName: string | null;
}

export interface Insumo {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  totalCost: number;
  unitCost: number;
  createdAt?: string;
}

export interface RecipeIngredient {
  id?: number;
  insumoId: number;
  quantityUsed: number;
  insumoName?: string;
  insumoUnit?: string;
  insumoUnitCost?: number;
}

export interface Recipe {
  id: number;
  name: string;
  yield: number;
  marginPercent: number;
  costPerPiece: number;
  suggestedPrice: number;
  ingredients: RecipeIngredient[];
  createdAt?: string;
}

export interface Product {
  id: number;
  recipeId: number | null;
  name: string;
  stock: number;
  price: number;
  cost: number;
  createdAt?: string;
}

export interface Transaction {
  id: number;
  type: "sale" | "purchase" | "expense" | "adjustment";
  amount: number;
  description: string;
  date: string;
  createdAt?: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  createdAt?: string;
}
