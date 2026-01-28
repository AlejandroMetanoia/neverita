export type MealType = 'Desayuno' | 'Almuerzo' | 'Comida' | 'Merienda' | 'Cena';

export interface Food {
  id: string;
  name: string;
  brand?: string; // Optional brand name
  category: string; // New field for organization
  subCategory?: string; // Optional sub-grouping
  calories: number; // per 100g
  protein: number; // per 100g
  carbs: number; // per 100g
  fat: number; // per 100g
  userId?: string; // Present if user-created food
  ingredients?: Ingredient[]; // Present if it's a recipe
}

export interface Ingredient {
  id: string;
  foodId?: string; // If linked to an existing food
  name: string;
  quantity: number; // grams
  calories: number; // per 100g
  protein: number; // per 100g
  carbs: number; // per 100g
  fat: number; // per 100g
}

export interface LogEntry {
  id: string;
  date: string; // ISO Date String YYYY-MM-DD
  foodId: string;
  foodName: string; // Cached name in case library changes
  meal: MealType;
  grams: number;
  calculated: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DayStats {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface UserGoals {
  kcalObjetivo: number;
  macrosPct: {
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
  weightGoals?: {
    startingWeight: number;
    currentWeight: number;
    desiredWeight: number;
    timeframe: number;
    updatedAt?: string;
  };
  updatedAt?: string;
}