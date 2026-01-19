import React, { useState, useEffect } from 'react';
import { Food, LogEntry } from '../types';
import { FOOD_CATEGORIES, SUB_CATEGORIES } from '../constants';
import { Icons } from './ui/Icons';

interface LibraryProps {
  foods: Food[];
  onAddLog?: (log: LogEntry) => void;
  onAddFood: (food: Food) => void;
  onDeleteFood: (id: string) => void;
  autoOpenAdd?: boolean;
  onToggleMenu: (hidden: boolean) => void;
}

const Library: React.FC<LibraryProps> = ({ foods, onAddFood, onDeleteFood, autoOpenAdd = false, onToggleMenu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(autoOpenAdd);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Toggle Menu Visibility
  useEffect(() => {
    onToggleMenu(isAdding);
    return () => onToggleMenu(false);
  }, [isAdding, onToggleMenu]);

  /* MODIFIED: Changed numeric fields to string | number to allow decimal input */
  const [newFood, setNewFood] = useState<{
    name: string;
    brand: string;
    category: string;
    subCategory: string;
    calories: string | number;
    protein: string | number;
    carbs: string | number;
    fat: string | number;
  }>({
    name: '',
    brand: '',
    category: 'Otros', // Default
    subCategory: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync autoOpenAdd prop
  useEffect(() => {
    if (autoOpenAdd) setIsAdding(true);
  }, [autoOpenAdd]);

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
    /* MODIFIED: Parse values before submitting */
    onAddFood({
      id: Date.now().toString(),
      name: newFood.name,
      brand: newFood.brand,
      category: newFood.category,
      subCategory: newFood.subCategory,
      calories: Number(newFood.calories) || 0,
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fat: Number(newFood.fat) || 0,
    });
    setIsAdding(false);
    // Reset form but keep category
    setNewFood({ ...newFood, name: '', brand: '', calories: '', protein: '', carbs: '', fat: '' });
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
      case "Verduras": return Icons.Carrot;
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
      case "Lácteos": return Icons.Milk;
      case "Postres Lácteos": return Icons.IceCream;
      case "Embutidos y Charcutería": return Icons.BeefIcon; // Fallback or Specific
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
      case "Comida Preparada": return Icons.Utensils;

      default: return Icons.Folder;
    }
  };

  // If searching, we show a flat list. If not searching, we show folders or the specific folder content.
  const isSearching = debouncedSearchTerm.length > 0;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {selectedCategory && !isSearching && (
            <button
              onClick={() => {
                if (selectedSubCategory) {
                  setSelectedSubCategory(null);
                } else {
                  setSelectedCategory(null);
                }
              }}
              className="bg-white hover:bg-gray-100 p-3 rounded-xl border border-gray-200 text-gray-600 transition-all hover:scale-105 shadow-sm"
            >
              <Icons.Back size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
              {isSearching ? 'Buscando...' : (selectedSubCategory || selectedCategory || 'Nevera')}
            </h2>
            <p className="text-gray-500 text-sm font-medium ml-1">
              {selectedSubCategory ? 'Explorando sub-carpeta' : selectedCategory ? 'Explorando carpeta' : 'Organiza tus alimentos por carpetas'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Icons.Plus size={20} />
          {isAdding ? 'Cancelar' : 'Nuevo Alimento'}
        </button>
      </div>

      {/* Add Food Form - Ethereal Light */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300 shadow-glass relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-[60px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />

          <div className="md:col-span-2 border-b border-gray-100 pb-4 mb-2">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Añadir Nuevo Alimento</h3>
            <p className="text-gray-500 text-sm">Completa los datos nutricionales por cada 100g.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre del Alimento</label>
            <input
              required
              type="text"
              value={newFood.name}
              onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-400 font-medium"
              placeholder="Ej. Pechuga de Pavo"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Marca (Opcional)</label>
            <input
              type="text"
              value={newFood.brand}
              onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-400 font-medium"
              placeholder="Ej. Hacendado, Carrefour..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Carpeta / Categoría</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <select
                  required
                  value={newFood.category}
                  onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 appearance-none focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 cursor-pointer font-medium"
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
                  <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <select
                    value={newFood.subCategory || ''}
                    onChange={(e) => setNewFood({ ...newFood, subCategory: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 appearance-none focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 cursor-pointer font-medium"
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
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Kcal (por 100g)</label>
            <input
              required
              type="number"
              min="0"
              value={newFood.calories}
              onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 font-mono text-lg font-bold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-protein mb-2 uppercase tracking-wider">Proteína (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.protein}
              onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-protein focus:ring-4 focus:ring-sky-50 font-bold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-carbs mb-2 uppercase tracking-wider">Carbohidratos (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.carbs}
              onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-carbs focus:ring-4 focus:ring-indigo-50 font-bold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-fat mb-2 uppercase tracking-wider">Grasas (g)</label>
            <input
              required
              type="number"
              min="0"
              step="0.1"
              value={newFood.fat}
              onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-fat focus:ring-4 focus:ring-fuchsia-50 font-bold"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            className="md:col-span-2 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg hover:shadow-xl text-lg relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10">Guardar en Nevera</span>
          </button>
        </form>
      )}

      {/* Search Bar - Light */}
      <div className="relative group">
        <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar alimento en todas las carpetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl pl-12 pr-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-400 shadow-sm hover:shadow-md"
        />
      </div>

      {/* VIEW: Folder Grid (Default when not searching and no category selected) */}
      {!isSearching && !selectedCategory && (
        <div className="space-y-10">
          {Object.entries(FOOD_CATEGORIES).map(([group, subcategories]) => (
            <div key={group}>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-gray-100 pb-2 pl-1">{group}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subcategories.map(sub => {
                  // Optional: Count items in category
                  const count = foods.filter(f => f.category === sub).length;
                  const IconComponent = getCategoryIcon(sub);

                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedCategory(sub)}
                      className="bg-white/60 backdrop-blur-sm p-6 rounded-[1.5rem] border border-white/60 hover:border-indigo-200 hover:bg-white/90 transition-all flex flex-col items-center justify-center gap-4 text-center group h-40 shadow-sm hover:shadow-lg hover:-translate-y-1 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="p-4 bg-white rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors text-gray-400 shadow-sm border border-gray-100 group-hover:border-indigo-100">
                        <IconComponent size={28} />
                      </div>
                      <div className="relative z-10">
                        <span className="text-base font-bold text-gray-700 block mb-1 group-hover:text-gray-900">{sub}</span>
                        <span className="text-xs text-gray-400 font-medium group-hover:text-indigo-400 transition-colors">{count} alimentos</span>
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
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-gray-100 pb-2 pl-1">{selectedCategory}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUB_CATEGORIES[selectedCategory].map(sub => {
              const count = foods.filter(f => f.category === selectedCategory && f.subCategory === sub).length;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className="bg-white/60 backdrop-blur-sm p-6 rounded-[1.5rem] border border-white/60 hover:border-indigo-200 hover:bg-white/90 transition-all flex flex-col items-center justify-center gap-4 text-center group h-40 shadow-sm hover:shadow-lg hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-4 bg-white rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors text-gray-400 shadow-sm border border-gray-100 group-hover:border-indigo-100">
                    <Icons.Folder size={28} />
                  </div>
                  <div className="relative z-10">
                    <span className="text-base font-bold text-gray-700 block mb-1 group-hover:text-gray-900">{sub}</span>
                    <span className="text-xs text-gray-400 font-medium group-hover:text-indigo-400 transition-colors">{count} alimentos</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Also show orphaned items below, if any exist in the main category without a subcategory */}
          {foods.some(f => f.category === selectedCategory && !f.subCategory) && (
            <div className="mt-12 animate-in slide-in-from-bottom-4">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-gray-100 pb-2 pl-1">Otros en {selectedCategory}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {foods
                  .filter(f => f.category === selectedCategory && !f.subCategory)
                  .map(food => (
                    <div key={food.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-indigo-100 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                      {/* Food Card Content (Reused) */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-6">
                          <h3 className="font-bold text-gray-800 truncate text-lg group-hover:text-indigo-900 transition-colors">{food.name}</h3>
                          {food.brand && <p className="text-xs text-gray-400 mt-0.5">{food.brand}</p>}
                        </div>
                        <button
                          onClick={() => setDeleteConfirmation(food.id)}
                          className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all absolute top-5 right-5 scale-90 hover:scale-110"
                        >
                          <Icons.Trash size={18} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-4 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-800 font-black">{food.calories} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                        <div className="flex gap-2 text-xs text-gray-500 font-medium">
                          <span title="Proteína" className="hover:text-blue-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">P: {food.protein}</span>
                          <span title="Carbohidratos" className="hover:text-indigo-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">C: {food.carbs}</span>
                          <span title="Grasas" className="hover:text-pink-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">G: {food.fat}</span>
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
              <div key={food.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-indigo-100 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-6">
                    <h3 className="font-bold text-gray-800 truncate text-lg group-hover:text-indigo-900 transition-colors">{food.name}</h3>
                    {food.brand && <p className="text-xs text-gray-400 mt-0.5">{food.brand}</p>}
                    {isSearching && <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md mt-2 inline-block shadow-sm">{food.category} {food.subCategory ? `> ${food.subCategory}` : ''}</span>}
                  </div>
                  <button
                    onClick={() => setDeleteConfirmation(food.id)}
                    className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all absolute top-5 right-5 scale-90 hover:scale-110"
                  >
                    <Icons.Trash size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm mt-4 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-800 font-black">{food.calories} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                  <div className="flex gap-2 text-xs text-gray-500 font-medium">
                    <span title="Proteína" className="hover:text-blue-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">P: {food.protein}</span>
                    <span title="Carbohidratos" className="hover:text-indigo-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">C: {food.carbs}</span>
                    <span title="Grasas" className="hover:text-pink-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">G: {food.fat}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-gray-500 flex flex-col items-center gap-4 border-2 border-dashed border-gray-200 rounded-3xl bg-white/30 backdrop-blur-sm">
              {selectedCategory && (
                <>
                  <div className="p-4 bg-white/50 rounded-full mb-2 border border-white/50">
                    {React.createElement(getCategoryIcon(selectedCategory), { size: 32, className: "text-gray-400" })}
                  </div>
                  <p className="text-lg">No hay alimentos en la carpeta {selectedCategory}.</p>
                </>
              )}
              {isSearching && <p className="text-lg">No se encontraron alimentos.</p>}

              <button onClick={() => setIsAdding(true)} className="text-indigo-500 hover:text-indigo-600 font-bold text-sm tracking-wide uppercase border-b border-indigo-200 hover:border-indigo-500 transition-all pb-0.5">Crear nuevo alimento aquí</button>
            </div>
          )}
        </div>
      )}


      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-white/60">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-red-50 text-red-500 rounded-full mb-2">
                <Icons.AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">¿Eliminar alimento?</h3>
                <p className="text-gray-500 text-sm">
                  ¿Estás seguro de que quieres eliminar este alimento de tu nevera?
                </p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmation) {
                      onDeleteFood(deleteConfirmation);
                      setDeleteConfirmation(null);
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;