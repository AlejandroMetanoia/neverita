import React, { useState, useEffect } from 'react';
import { Food } from '../types';
import { FOOD_CATEGORIES, SUB_CATEGORIES } from '../constants';
import { Icons } from './ui/Icons';

interface LibraryProps {
  foods: Food[];
  onAddFood: (food: Food) => void;
  onDeleteFood: (id: string) => void;
}

const Library: React.FC<LibraryProps> = ({ foods, onAddFood, onDeleteFood }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [newFood, setNewFood] = useState<Omit<Food, 'id' | 'userId'>>({
    name: '',
    brand: '',
    category: 'Otros', // Default
    subCategory: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Filter Logic
  const filteredFoods = foods.filter((f) => {
    const matchesSearch = f.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .includes(debouncedSearchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    const matchesSubCategory = selectedSubCategory ? f.subCategory === selectedSubCategory : true;

    // Simplified for the list view:
    return matchesSearch && matchesCategory && matchesSubCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddFood({ ...newFood, id: Date.now().toString() });
    setIsAdding(false);
    // Reset form but keep category if user wants to add multiple to same
    setNewFood({ ...newFood, name: '', brand: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Effect to reset subCategory when category changes in navigation
  useEffect(() => {
    setSelectedSubCategory(null);
  }, [selectedCategory]);

  // Effect to reset subCategory when category changes in form
  useEffect(() => {
    setNewFood(prev => ({ ...prev, subCategory: '' }));
  }, [newFood.category]);

  // Helper to get Icon based on category name
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      // Vegetal
      case "Frutas": return Icons.Apple;
      case "Verduras y Hortalizas": return Icons.Carrot;
      case "Legumbres": return Icons.Bean;
      case "Cereales": return Icons.Carbs; // Wheat
      case "Pseudocereales": return Icons.Carbs;
      case "Tubérculos y Raíces": return Icons.Carrot; // Fallback to Carrot (Root)
      case "Frutos Secos": return Icons.Nut;
      case "Semillas": return Icons.Sprout;
      case "Hongos y Setas": return Icons.Leaf; // Fallback for mushroom

      // Animal
      case "Carnes Blancas": return Icons.Drumstick;
      case "Carnes Rojas": return Icons.BeefIcon;
      case "Pescado Blanco": return Icons.Fish;
      case "Pescado Azul": return Icons.Fish;
      case "Mariscos": return Icons.Shell;
      case "Huevos": return Icons.Egg;
      case "Lácteos": return Icons.Milk;

      // Grasas
      case "Aceites Vegetales": return Icons.Fat; // Droplet
      case "Grasas Animales": return Icons.Cookie; // Butter representation
      case "Grasas de Frutas": return Icons.Nut; // Avocado replacement
      case "Especias y Hierbas": return Icons.Leaf;

      // Otros
      case "Azúcares y Dulces": return Icons.Candy;
      case "Bebidas": return Icons.GlassWater;
      case "Alimentos Fermentados": return Icons.Wine;
      case "Procesados": return Icons.Package;

      default: return Icons.Folder;
    }
  };

  // If searching, we show a flat list. If not searching, we show folders or the specific folder content.
  const isSearching = debouncedSearchTerm.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          {selectedCategory && !isSearching && (
            <button
              onClick={() => {
                if (selectedSubCategory) {
                  setSelectedSubCategory(null);
                } else {
                  setSelectedCategory(null);
                }
              }}
              className="bg-surfaceHighlight hover:bg-gray-700 p-2 rounded-lg transition-colors"
            >
              <Icons.Back size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Icons.Fridge className="text-primary" />
              {isSearching ? 'Buscando...' : (selectedSubCategory || selectedCategory || 'Nevera')}
            </h2>
            <p className="text-gray-400 text-sm">
              {selectedSubCategory ? 'Explorando sub-carpeta' : selectedCategory ? 'Explorando carpeta' : 'Organiza tus alimentos por carpetas'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-gray-200 text-black font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(229,231,235,0.3)]"
        >
          <Icons.Plus size={18} />
          {isAdding ? 'Cancelar' : 'Nuevo Alimento'}
        </button>
      </div>

      {/* Add Food Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl border border-surfaceHighlight grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Alimento</label>
            <input
              required
              type="text"
              value={newFood.name}
              onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="Ej. Pechuga de Pavo"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-1">Marca (Opcional)</label>
            <input
              type="text"
              value={newFood.brand}
              onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="Ej. Hacendado, Carrefour..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-1">Carpeta / Categoría</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Icons.ChevronDown className="absolute right-3 top-3.5 text-gray-500 pointer-events-none" size={16} />
                <select
                  required
                  value={newFood.category}
                  onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
                  className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white appearance-none focus:outline-none focus:border-primary"
                >
                  <option value="" disabled>Selecciona una carpeta...</option>
                  {Object.entries(FOOD_CATEGORIES).map(([group, subcategories]) => (
                    <optgroup key={group} label={group}>
                      {subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* SubCategory Select if available */}
              {newFood.category && SUB_CATEGORIES[newFood.category] && (
                <div className="relative animate-in fade-in zoom-in duration-200">
                  <Icons.ChevronDown className="absolute right-3 top-3.5 text-gray-500 pointer-events-none" size={16} />
                  <select
                    value={newFood.subCategory || ''}
                    onChange={(e) => setNewFood({ ...newFood, subCategory: e.target.value })}
                    className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white appearance-none focus:outline-none focus:border-primary"
                  >
                    <option value="">(General)</option>
                    {SUB_CATEGORIES[newFood.category].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Kcal (por 100g)</label>
            <input
              required
              type="number"
              min="0"
              value={newFood.calories || ''}
              onChange={(e) => setNewFood({ ...newFood, calories: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Proteína (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.protein || ''}
              onChange={(e) => setNewFood({ ...newFood, protein: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Carbohidratos (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.carbs || ''}
              onChange={(e) => setNewFood({ ...newFood, carbs: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Grasas (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.fat || ''}
              onChange={(e) => setNewFood({ ...newFood, fat: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-surfaceHighlight rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            className="md:col-span-2 bg-primary hover:bg-gray-200 text-black font-bold py-3 rounded-xl mt-2 transition-all"
          >
            Guardar en Nevera
          </button>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          placeholder="Buscar alimento en todas las carpetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface border border-surfaceHighlight rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* VIEW: Folder Grid (Default when not searching and no category selected) */}
      {!isSearching && !selectedCategory && (
        <div className="space-y-8">
          {Object.entries(FOOD_CATEGORIES).map(([group, subcategories]) => (
            <div key={group}>
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 border-b border-surfaceHighlight/50 pb-2">{group}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subcategories.map(sub => {
                  // Optional: Count items in category
                  const count = foods.filter(f => f.category === sub).length;
                  const IconComponent = getCategoryIcon(sub);

                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedCategory(sub)}
                      className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:border-primary/50 hover:bg-surfaceHighlight/50 transition-all flex flex-col items-center justify-center gap-3 text-center group h-32"
                    >
                      <div className="p-3 bg-surfaceHighlight rounded-full group-hover:bg-primary group-hover:text-black transition-colors text-gray-400">
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white block">{sub}</span>
                        <span className="text-xs text-gray-500">{count} alimentos</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: SubCategory Grid (When Category is selected but has subcategories and no subcategory is selected) */}
      {!isSearching && selectedCategory && SUB_CATEGORIES[selectedCategory] && !selectedSubCategory && (
        <div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 border-b border-surfaceHighlight/50 pb-2">{selectedCategory}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUB_CATEGORIES[selectedCategory].map(sub => {
              const count = foods.filter(f => f.category === selectedCategory && f.subCategory === sub).length;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:border-primary/50 hover:bg-surfaceHighlight/50 transition-all flex flex-col items-center justify-center gap-3 text-center group h-32"
                >
                  <div className="p-3 bg-surfaceHighlight rounded-full group-hover:bg-primary group-hover:text-black transition-colors text-gray-400">
                    <Icons.Folder size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white block">{sub}</span>
                    <span className="text-xs text-gray-500">{count} alimentos</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Also show orphaned items below, if any exist in the main category without a subcategory */}
          {foods.some(f => f.category === selectedCategory && !f.subCategory) && (
            <div className="mt-8">
              <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 border-b border-surfaceHighlight/50 pb-2">Otros en {selectedCategory}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {foods
                  .filter(f => f.category === selectedCategory && !f.subCategory)
                  .map(food => (
                    <div key={food.id} className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:border-gray-600 transition-colors group relative">
                      {/* Food Card Content (Reused) */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <h3 className="font-semibold text-white truncate">{food.name}</h3>
                        </div>
                        <button
                          onClick={() => onDeleteFood(food.id)}
                          className="text-gray-600 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                        >
                          <Icons.Trash size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-3">
                        <span className="text-orange-400 font-bold">{food.calories} kcal</span>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span title="Proteína">P: {food.protein}g</span>
                          <span title="Carbohidratos">C: {food.carbs}g</span>
                          <span title="Grasas">G: {food.fat}g</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Food List (When searching OR (category selected AND (no subcategories OR subcategory selected))) */}
      {(isSearching || (selectedCategory && (!SUB_CATEGORIES[selectedCategory] || selectedSubCategory))) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
          {filteredFoods.length > 0 ? (
            filteredFoods.map((food) => (
              <div key={food.id} className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:border-gray-600 transition-colors group relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-6">
                    <h3 className="font-semibold text-white truncate">{food.name}</h3>
                    {isSearching && <span className="text-[10px] text-gray-500 bg-surfaceHighlight px-2 py-0.5 rounded-full">{food.category} {food.subCategory ? `> ${food.subCategory}` : ''}</span>}
                  </div>
                  <button
                    onClick={() => onDeleteFood(food.id)}
                    className="text-gray-600 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                  >
                    <Icons.Trash size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm mt-3">
                  <span className="text-orange-400 font-bold">{food.calories} kcal</span>
                  <div className="flex gap-2 text-xs text-gray-400">
                    <span title="Proteína">P: {food.protein}g</span>
                    <span title="Carbohidratos">C: {food.carbs}g</span>
                    <span title="Grasas">G: {food.fat}g</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center gap-2">
              {selectedCategory && (
                <>
                  {React.createElement(getCategoryIcon(selectedCategory), { size: 48, className: "text-gray-700" })}
                  <p>No hay alimentos en la carpeta {selectedCategory}.</p>
                </>
              )}
              {isSearching && <p>No se encontraron alimentos.</p>}

              <button onClick={() => setIsAdding(true)} className="text-primary hover:underline text-sm">Crear nuevo alimento aquí</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Library;