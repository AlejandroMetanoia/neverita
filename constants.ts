import { Food, MealType } from './types';

export const MEAL_TYPES: MealType[] = ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena'];

export const MEAL_COLORS: Record<MealType, { border: string; text: string; bg: string }> = {
  Desayuno: { border: 'border-l-zinc-300', text: 'text-zinc-300', bg: 'bg-zinc-300/10' },
  Almuerzo: { border: 'border-l-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Comida: { border: 'border-l-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10' },
  Merienda: { border: 'border-l-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10' },
  Cena: { border: 'border-l-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
};

export const FOOD_CATEGORIES = {
  "Recetas": [
    "Frecuentes",
    "Platos",
    "Batidos",
    "Postres"
  ],
  "Alimentos de Origen Vegetal": [
    "Frutas",
    "Verduras",
    "Legumbres",
    "Cereales",
    "Pseudocereales",
    "Tubérculos y Raíces",
    "Frutos Secos",
    "Semillas",
    "Hongos y Setas",
    "Postres Vegetales"
  ],
  "Alimentos de Origen Animal": [
    "Carnes Blancas",
    "Carnes Rojas",
    "Pescado Blanco",
    "Pescado Azul",
    "Mariscos",
    "Huevos",
    "Lácteos",
    "Postres Lácteos",
    "Embutidos y Charcutería"
  ],
  "Grasas, Aceites y Condimentos": [
    "Aceites Vegetales",
    "Grasas Animales",
    "Grasas de Frutas",
    "Especias y Hierbas"
  ],
  "Otros Grupos": [
    "Azúcares y Dulces",
    "Bebidas",
    "Alimentos Fermentados",
    "Procesados",
    "Comida Preparada"
  ]

};

export const SUB_CATEGORIES: Record<string, string[]> = {
  "Cereales": [
    "Grano Entero",
    "Cereal Procesado",
    "Cereal Molido",
    "Cereal Fermentado"
  ],
  "Carnes Rojas": [
    "Ternera",
    "Cerdo",
    "Vacuno"
  ],
  "Lácteos": []
};

export const INITIAL_FOODS: Food[] = [];