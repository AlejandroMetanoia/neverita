import React, { useState, useEffect } from 'react';
import { Food, LogEntry } from '../types';
import { getCategoryIcon } from './ui/CategoryIconHelper';
import { Icons } from './ui/Icons';
import { FOOD_CATEGORIES, SUB_CATEGORIES } from '../constants';
import { HelpModal } from './ui/HelpModal';
import { RecipeCreator } from './RecipeCreator';

interface LibraryProps {
  isGuest?: boolean;
  foods: Food[];
  logs: LogEntry[];
  onAddFood: (food: Food) => void;
  onUpdateFood: (food: Food) => void;
  onDeleteFood: (id: string, isCustomUnlink?: boolean) => void;
  onLogFood: (food: Food, quantity: number, mealType: string, date: Date) => void;
  onNavigate: (view: 'library' | 'stats' | 'dashboard') => void;
}

const Library: React.FC<LibraryProps> = ({
  isGuest = false,
  foods,
  logs,
  onAddFood,
  onUpdateFood,
  onDeleteFood,
  onLogFood,
  onNavigate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [subscriptionMode, setSubscriptionMode] = useState<'teaser' | 'details' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);

  // Toggle Menu Visibility
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen]);

  // Derived state for filtering
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? food.category === selectedCategory : true;
    const matchesSubCategory = selectedSubCategory ? food.subCategory === selectedSubCategory : true;

    if (selectedSubCategory) {
      return matchesSearch && matchesSubCategory; // Strict subcategory match
    }

    if (selectedCategory) {
      if (SUB_CATEGORIES[selectedCategory]) {
        // If category has subcategories, only show items that don't belong to any subcategory yet (orphans)
        return matchesSearch && matchesCategory && !food.subCategory;
      }
      return matchesSearch && matchesCategory;
    }

    return matchesSearch;
  });

  return (
    <div className="pb-24 pt-6 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 flex items-center gap-3">
            Nevera<span className="text-stone-400 font-normal text-2xl">©</span>
            <button onClick={() => setShowHelp(true)} className="text-stone-300 hover:text-stone-500 transition-colors">
              <Icons.Help size={24} />
            </button>
          </h1>
          <p className="text-gray-500 font-medium">Organiza tus alimentos por carpetas</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {/* Mobile Menu Toggle - Could be added here */}
        </div>
      </div>

      {/* Persistent Search Bar */}
      <div className="sticky top-4 z-40 mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-gray-800 transition-colors">
            <Icons.Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Buscar alimento en todas las carpetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-stone-200/40 rounded-2xl py-5 pl-12 pr-4 text-gray-800 font-bold placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-stone-100/50 transition-all text-lg"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {selectedCategory ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedSubCategory(null);
            }}
            className="mb-6 flex items-center gap-2 text-stone-500 hover:text-gray-900 font-bold transition-colors group"
          >
            <div className="p-2 bg-white rounded-xl shadow-sm border border-stone-100 group-hover:border-stone-300 transition-all">
              <Icons.Back size={18} />
            </div>
            Volver a Categorías
          </button>

          <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
            {(() => {
              const Icon = getCategoryIcon(selectedCategory);
              return <Icon className="text-stone-600" />;
            })()}
            {selectedCategory}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Render Filtered Foods */}
            {filteredFoods.map(food => (
              <div key={food.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-stone-200 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-6">
                    <h3 className="font-bold text-gray-800 truncate text-lg group-hover:text-gray-900 transition-colors">{food.name}</h3>
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
            ))}
            {filteredFoods.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Search className="text-stone-300" size={32} />
                </div>
                <p className="text-stone-400 font-medium">No se encontraron alimentos en esta carpeta.</p>
              </div>
            )}
          </div>
        </div>
      ) : searchTerm ? (
        // Search Results View
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-6">Resultados de búsqueda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFoods.map(food => (
              <div key={food.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-stone-200 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                {/* ... Same Card Structure ... */}
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-6">
                    <h3 className="font-bold text-gray-800 truncate text-lg group-hover:text-gray-900 transition-colors">{food.name}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">{food.category} {food.subCategory ? `• ${food.subCategory}` : ''}</p>
                  </div>
                </div>
                {/* ... Rest of card ... */}
                <div className="flex justify-between items-center text-sm mt-4 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-800 font-black">{food.calories} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                  <div className="flex gap-2 text-xs text-gray-500 font-medium">
                    <span title="Proteína" className="hover:text-blue-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">P: {food.protein}</span>
                    <span title="Carbohidratos" className="hover:text-indigo-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">C: {food.carbs}</span>
                    <span title="Grasas" className="hover:text-pink-500 transition-colors bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">G: {food.fat}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Main Categories View
        <div className="space-y-10 animate-in fade-in duration-700">

          {/* Add Food / Recipe Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => {
                if (isGuest) {
                  setSubscriptionMode('teaser');
                } else {
                  setIsAdding(!isAdding);
                }
              }}
              className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Icons.Plus size={20} />
              {isAdding ? 'Cancelar' : 'Nuevo Alimento'}
            </button>
            <button
              onClick={() => {
                if (isGuest) {
                  setSubscriptionMode('teaser');
                } else {
                  setIsCreatingRecipe(true);
                }
              }}
              className="bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm border border-gray-200 hover:border-gray-300 hover:scale-105"
            >
              <Icons.ChefHat size={20} />
              Crear Receta
            </button>
          </div>

          {Object.entries(FOOD_CATEGORIES).map(([group, subcategories]) => (
            <div key={group}>
              <h3 className="text-black text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-gray-100 pb-2 pl-1">{group}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subcategories.map(sub => {
                  const count = foods.filter(f => f.category === sub).length;
                  const IconComponent = getCategoryIcon(sub);

                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedCategory(sub)}
                      className="bg-white/60 backdrop-blur-sm p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-200 hover:bg-white/90 transition-all flex flex-col items-center justify-center gap-4 text-center group h-40 shadow-sm hover:shadow-lg hover:-translate-y-1 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-stone-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="p-4 bg-white rounded-full group-hover:bg-stone-100 group-hover:text-stone-600 transition-colors text-gray-400 shadow-sm border border-gray-100 group-hover:border-stone-200">
                        <IconComponent size={28} />
                      </div>
                      <div className="relative z-10">
                        <span className="text-base font-bold text-gray-700 block mb-1 group-hover:text-gray-900">{sub}</span>
                        <span className="text-xs text-gray-400 font-medium group-hover:text-stone-400 transition-colors">{count} alimentos</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Show items directly if category has no subcategories (e.g. Recetas) */}
              {subcategories.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {foods.filter(f => f.category === group).map(food => (
                    <div key={food.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-stone-200 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-6">
                          <h3 className="font-bold text-gray-800 truncate text-lg group-hover:text-gray-900 transition-colors">{food.name}</h3>
                          {/* If it's a recipe, maybe show ingredient count or just brand if set? */}
                          {food.ingredients ? (
                            <p className="text-xs text-stone-500 mt-0.5">{food.ingredients.length} ingredientes</p>
                          ) : (
                            food.brand && <p className="text-xs text-gray-400 mt-0.5">{food.brand}</p>
                          )}
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
                  ))}
                  {foods.filter(f => f.category === group).length === 0 && (
                    <p className="text-gray-400 italic text-sm col-span-full py-2 ml-1">No hay {group.toLowerCase()} guardadas aún.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Subscription Teaser Modal */}
      {subscriptionMode === 'teaser' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setSubscriptionMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <Icons.X size={24} />
            </button>
            <div className="text-center">
              <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Lock size={32} className="text-stone-400" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Función Premium</h3>
              <p className="text-gray-500 mb-6">Esta función está reservada para usuarios Pro. Suscríbete para desbloquear el potencial completo de Neverita.</p>
              <button className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
                Ver Planes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Icons.Trash size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">¿Eliminar alimento?</h3>
            <p className="text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-3 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
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
                className="flex-1 py-3 bg-red-500 font-bold text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg hover:shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Creator Modal */}
      {isCreatingRecipe && (
        <RecipeCreator
          onClose={() => setIsCreatingRecipe(false)}
          onSave={onAddFood}
          availableFoods={foods}
        />
      )}
    </div>
  );
};

export default Library;