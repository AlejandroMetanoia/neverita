import { Icons } from './Icons';
import { LucideIcon } from 'lucide-react';

export const getCategoryIcon = (category: string | null): LucideIcon => {
    if (!category) return Icons.Folder;

    const mapping: Record<string, LucideIcon> = {
        // Main Categories
        "Recetas": Icons.ChefHat,
        "Alimentos de Origen Vegetal": Icons.Carrot,
        "Alimentos de Origen Animal": Icons.Drumstick,
        "Grasas, Aceites y Condimentos": Icons.Fat,
        "Otros Grupos": Icons.Cookie,

        // Subcategories (Vegetal)
        "Frutas": Icons.Apple,
        "Verduras": Icons.Carrot,
        "Legumbres": Icons.Bean,
        "Cereales": Icons.Carbs,
        "Pseudocereales": Icons.Carbs,
        "Tubérculos y Raíces": Icons.Carrot,
        "Frutos Secos": Icons.Nut,
        "Semillas": Icons.Sprout,
        "Hongos y Setas": Icons.Sprout,
        "Postres Vegetales": Icons.Cookie,

        // Subcategories (Animal)
        "Carnes Blancas": Icons.Drumstick,
        "Carnes Rojas": Icons.Protein,
        "Pescado Blanco": Icons.Fish,
        "Pescado Azul": Icons.Fish,
        "Mariscos": Icons.Shell,
        "Huevos": Icons.Egg,
        "Lácteos": Icons.Milk,
        "Postres Lácteos": Icons.IceCream,
        "Embutidos y Charcutería": Icons.Protein,

        // Subcategories (Grasas)
        "Aceites Vegetales": Icons.Fat,
        "Grasas Animales": Icons.Fat,
        "Grasas de Frutas": Icons.Apple, // Avocado?
        "Especias y Hierbas": Icons.Leaf,

        // Subcategories (Otros)
        "Azúcares y Dulces": Icons.Candy,
        "Bebidas": Icons.GlassWater,
        "Alimentos Fermentados": Icons.Wine,
        "Procesados": Icons.Package,
        "Comida Preparada": Icons.Utensils,
    };

    return mapping[category] || Icons.Folder;
};
