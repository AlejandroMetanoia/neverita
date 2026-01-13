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
  "Alimentos de Origen Vegetal": [
    "Frutas",
    "Verduras y Hortalizas",
    "Legumbres",
    "Cereales",
    "Pseudocereales",
    "Tubérculos y Raíces",
    "Frutos Secos",
    "Semillas",
    "Hongos y Setas"
  ],
  "Alimentos de Origen Animal": [
    "Carnes Blancas",
    "Carnes Rojas",
    "Pescado Blanco",
    "Pescado Azul",
    "Mariscos",
    "Huevos",
    "Lácteos"
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
    "Procesados"
  ]
};

export const SUB_CATEGORIES: Record<string, string[]> = {
  "Cereales": [
    "Grano Entero",
    "Cereal Procesado",
    "Cereal Molido",
    "Cereal Fermentado"
  ]
};

export const INITIAL_FOODS: Food[] = [
  { id: '1', name: 'Filetes de Pollo', category: 'Carnes Blancas', calories: 110, protein: 23, carbs: 0, fat: 1.9 },
  { id: '2', name: 'Arroz Blanco (Cocido)', category: 'Cereales', subCategory: 'Cereal Procesado', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: '3', name: 'Huevo Mediano', category: 'Huevos', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { id: '4', name: 'Avena', category: 'Cereales', subCategory: 'Grano Entero', calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { id: '5', name: 'Aguacate', category: 'Grasas de Frutas', calories: 160, protein: 2, carbs: 8.5, fat: 15 },
  { id: '6', name: 'Proteína Whey (Polvo)', category: 'Procesados', calories: 370, protein: 78, carbs: 6, fat: 4 },
  { id: '7', name: 'Manzana', category: 'Frutas', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: '8', name: 'Atún en lata', category: 'Pescado Azul', calories: 100, protein: 23, carbs: 0, fat: 1 },
];