import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Food, Ingredient } from '../types';
import { Icons } from './ui/Icons';

interface RecipeCreatorProps {
    onClose: () => void;
    onSave: (recipe: Food) => void;
    availableFoods: Food[]; // For searching ingredients
}

export const RecipeCreator: React.FC<RecipeCreatorProps> = ({ onClose, onSave, availableFoods }) => {
    const [name, setName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, []);

    // Temporary state for adding a custom ingredient
    const [customIngredient, setCustomIngredient] = useState<{
        name: string;
        calories: string;
        protein: string;
        carbs: string;
        fat: string;
    } | null>(null);

    // Filter foods for search
    const filteredFoods = useMemo(() => {
        if (!searchTerm) return [];
        return availableFoods.filter(f =>
            f.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Limit to 5 results
    }, [searchTerm, availableFoods]);

    const addIngredient = (food: Food) => {
        const newIngredient: Ingredient = {
            id: Date.now().toString(),
            foodId: food.id,
            name: food.name,
            quantity: 100, // Default 100g
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
        };
        setIngredients([...ingredients, newIngredient]);
        setSearchTerm('');
        setIsSearching(false);
    };

    const addCustomIngredient = () => {
        if (!searchTerm) return;
        setCustomIngredient({
            name: searchTerm,
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
        });
        setSearchTerm('');
        setIsSearching(false);
    };

    const saveCustomIngredient = () => {
        if (!customIngredient) return;
        const newIngredient: Ingredient = {
            id: Date.now().toString(),
            name: customIngredient.name,
            quantity: 100,
            calories: Number(customIngredient.calories) || 0,
            protein: Number(customIngredient.protein) || 0,
            carbs: Number(customIngredient.carbs) || 0,
            fat: Number(customIngredient.fat) || 0,
        };
        setIngredients([...ingredients, newIngredient]);
        setCustomIngredient(null);
    };

    const updateIngredientQuantity = (id: string, newQuantity: number) => {
        setIngredients(ingredients.map(ing =>
            ing.id === id ? { ...ing, quantity: newQuantity } : ing
        ));
    };

    const removeIngredient = (id: string) => {
        setIngredients(ingredients.filter(ing => ing.id !== id));
    };

    // Calculate totals
    const totals = useMemo(() => {
        return ingredients.reduce((acc, ing) => {
            const factor = ing.quantity / 100;
            return {
                grams: acc.grams + ing.quantity,
                calories: acc.calories + (ing.calories * factor),
                protein: acc.protein + (ing.protein * factor),
                carbs: acc.carbs + (ing.carbs * factor),
                fat: acc.fat + (ing.fat * factor),
            };
        }, { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [ingredients]);

    // Calculate per 100g for the final recipe
    const per100g = useMemo(() => {
        if (totals.grams === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const factor = 100 / totals.grams;
        return {
            calories: Math.round(totals.calories * factor),
            protein: parseFloat((totals.protein * factor).toFixed(1)),
            carbs: parseFloat((totals.carbs * factor).toFixed(1)),
            fat: parseFloat((totals.fat * factor).toFixed(1)),
        }
    }, [totals]);

    const handleSave = () => {
        if (!name || ingredients.length === 0) return;

        // Create the Recipe object (which matches Food interface but with ingredients)
        const newRecipe: Food = {
            id: Date.now().toString(), // Will be overwritten by DB ID usually, but good for local
            name,
            category: 'Recetas',
            calories: per100g.calories,
            protein: per100g.protein,
            carbs: per100g.carbs,
            fat: per100g.fat,
            ingredients: ingredients,
        };

        onSave(newRecipe);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/90 backdrop-blur-xl w-full max-w-3xl rounded-[2rem] border border-white/60 shadow-2xl relative flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icons.ChefHat className="text-gray-800" />
                        Crear Receta
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                        <Icons.X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-20 md:pb-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre de la Receta</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 font-bold text-lg focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all placeholder:text-gray-400"
                            placeholder="Ej. Bizcocho de Avena..."
                        />
                    </div>

                    {/* Ingredients List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Ingredientes</label>
                            <span className="text-xs text-stone-500 font-medium bg-stone-100 px-2 py-1 rounded-lg">{totals.grams}g totales</span>
                        </div>

                        {ingredients.map((ing, i) => (
                            <div key={ing.id} className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch md:items-center animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex-1 bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex justify-between items-center">
                                    <span className="font-medium text-gray-700 truncate">{ing.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{ing.calories} kcal/100g</span>
                                        <button onClick={() => removeIngredient(ing.id)} className="w-8 h-8 flex md:hidden items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Icons.Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1 md:w-24 relative">
                                        <input
                                            type="number"
                                            value={ing.quantity}
                                            onChange={(e) => updateIngredientQuantity(ing.id, Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-8 text-gray-800 font-bold focus:outline-none focus:border-stone-300 transition-all text-right"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">g</span>
                                    </div>
                                    <button onClick={() => removeIngredient(ing.id)} className="w-10 h-10 hidden md:flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                        <Icons.Trash size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Ingredient Input */}
                        {!customIngredient ? (
                            <div className="relative">
                                <div className="relative">
                                    <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsSearching(true);
                                        }}
                                        onFocus={() => setIsSearching(true)}
                                        className="w-full bg-gray-50 border border-gray-200/50 rounded-xl pl-11 pr-4 py-3 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all placeholder:text-gray-400"
                                        placeholder="Buscar ingrediente o añadir nuevo..."
                                    />
                                </div>

                                {/* Search Results Dropdown */}
                                {isSearching && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[110] animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                                        {filteredFoods.map(food => (
                                            <button
                                                key={food.id}
                                                onClick={() => addIngredient(food)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                            >
                                                <span className="font-medium text-gray-700">{food.name}</span>
                                                <span className="text-xs text-gray-400">{Math.round(food.calories)} kcal</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={addCustomIngredient}
                                            className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center gap-2 text-stone-600 font-medium"
                                        >
                                            <Icons.Plus size={16} />
                                            Añadir "{searchTerm}" como nuevo
                                        </button>
                                    </div>
                                )}

                                {/* Close search only if clicked outside - implemented simply by overlay for now or rely on selection */}
                                {isSearching && (
                                    <div className="fixed inset-0 z-10" onClick={() => setIsSearching(false)} />
                                )}
                            </div>
                        ) : (
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-stone-700">Nuevo Ingrediente: {customIngredient.name}</h4>
                                    <button onClick={() => setCustomIngredient(null)} className="text-stone-400 hover:text-stone-600"><Icons.X size={18} /></button>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Kcal"
                                        value={customIngredient.calories}
                                        onChange={(e) => setCustomIngredient({ ...customIngredient, calories: e.target.value })}
                                        className="bg-white border-2 border-transparent focus:border-stone-300 rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Prot"
                                        value={customIngredient.protein}
                                        onChange={(e) => setCustomIngredient({ ...customIngredient, protein: e.target.value })}
                                        className="bg-white border-2 border-transparent focus:border-blue-300 rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Carb"
                                        value={customIngredient.carbs}
                                        onChange={(e) => setCustomIngredient({ ...customIngredient, carbs: e.target.value })}
                                        className="bg-white border-2 border-transparent focus:border-orange-300 rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Gras"
                                        value={customIngredient.fat}
                                        onChange={(e) => setCustomIngredient({ ...customIngredient, fat: e.target.value })}
                                        className="bg-white border-2 border-transparent focus:border-pink-300 rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none"
                                    />
                                </div>
                                <button
                                    onClick={saveCustomIngredient}
                                    className="w-full mt-3 bg-stone-800 text-white rounded-lg py-2 font-bold text-sm hover:bg-stone-900 transition-colors"
                                >
                                    Añadir Ingrediente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Live Totals Preview */}
                    {ingredients.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Información Nutricional (Total)</h4>
                            <div className="flex justify-between items-center px-2">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-800">{Math.round(totals.calories)}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kcal</p>
                                </div>
                                <div className="w-px h-8 bg-gray-100" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-protein">{parseFloat(totals.protein.toFixed(1))}g</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Prot</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-carbs">{parseFloat(totals.carbs.toFixed(1))}g</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Carb</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-fat">{parseFloat(totals.fat.toFixed(1))}g</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Gras</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name || ingredients.length === 0}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gray-900 hover:bg-black shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        <Icons.Save size={18} />
                        Guardar en Nevera
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
