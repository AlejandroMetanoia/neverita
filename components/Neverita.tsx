import React, { useState, useMemo } from 'react';
import { Icons } from './ui/Icons';
import { Food, FridgeItem } from '../types';
import BarcodeScanner from './BarcodeScanner';
import { FOOD_CATEGORIES } from '../constants';

interface NeveritaProps {
    isGuest: boolean;
    foods: Food[];
    fridgeItems: FridgeItem[];
    onAddToFridge: (item: FridgeItem) => void;
    onUpdateFridgeItem: (item: FridgeItem) => void;
    onDeleteFridgeItem: (id: string) => void;
    onConsume: (item: FridgeItem, quantityToConsume: number) => void;
    onToggleMenu?: (hidden: boolean) => void;
    onAddFood?: (food: Food) => void;
}

const Neverita: React.FC<NeveritaProps> = ({
    isGuest,
    foods,
    fridgeItems = [],
    onAddToFridge,
    onUpdateFridgeItem,
    onDeleteFridgeItem,
    onConsume,
    onToggleMenu,
    onAddFood
}) => {
    // Mode Selection State
    const [entryMode, setEntryMode] = useState<'select' | 'search' | 'scan' | 'new' | null>(null);

    // Common State
    const [unitWeight, setUnitWeight] = useState('');
    const [quantity, setQuantity] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    // Search Mode State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);

    // New Food Mode State
    const [newFood, setNewFood] = useState<{
        name: string;
        brand: string;
        category: string;
        subCategory: string; // Not used in simplified UI but good to have
        calories: string;
        protein: string;
        carbs: string;
        fat: string;
    }>({
        name: '',
        brand: '',
        category: '',
        subCategory: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: ''
    });

    // Scanner State
    const [scannedCode, setScannedCode] = useState<string | null>(null);

    const resetStates = () => {
        setEntryMode(null);
        setUnitWeight('');
        setQuantity('');
        setExpirationDate('');
        setSearchQuery('');
        setSelectedFood(null);
        setScannedCode(null);
        setNewFood({
            name: '', brand: '', category: '', subCategory: '', calories: '', protein: '', carbs: '', fat: ''
        });
    };

    // Derived: Search Filter
    const filteredFoods = useMemo(() => {
        if (!searchQuery) return [];
        return foods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
    }, [searchQuery, foods]);

    // Derived: Check if New Food Form is valid
    const isNewFoodValid = newFood.name && newFood.category && unitWeight && quantity;

    // Handlers
    const handleAddExisting = () => {
        if (!selectedFood) return;
        const newItem: FridgeItem = {
            id: crypto.randomUUID(),
            foodId: selectedFood.id,
            name: selectedFood.name,
            unitWeight: parseFloat(unitWeight),
            quantity: parseFloat(quantity),
            expirationDate: expirationDate || undefined,
            purchasedDate: new Date().toISOString(),
            category: selectedFood.category
        };
        onAddToFridge(newItem);
        resetStates();
    };

    const handleAddNew = () => {
        if (!onAddFood) return;

        // 1. Create Food in Library
        const newFoodId = Date.now().toString();
        const createdFood: Food = {
            id: newFoodId,
            name: newFood.name,
            brand: newFood.brand,
            category: newFood.category,
            subCategory: newFood.subCategory, // Empty string if unused
            calories: parseFloat(newFood.calories) || 0,
            protein: parseFloat(newFood.protein) || 0,
            carbs: parseFloat(newFood.carbs) || 0,
            fat: parseFloat(newFood.fat) || 0
        };
        onAddFood(createdFood);

        // 2. Add to Fridge
        const newItem: FridgeItem = {
            id: crypto.randomUUID(),
            foodId: newFoodId,
            name: newFood.name,
            unitWeight: parseFloat(unitWeight),
            quantity: parseFloat(quantity),
            expirationDate: expirationDate || undefined,
            purchasedDate: new Date().toISOString(),
            category: newFood.category
        };
        onAddToFridge(newItem);
        resetStates();
    };

    const handleScanSuccess = (code: string) => {
        setScannedCode(code);
        // Try to find in library
        const found = foods.find(f => f.brand?.includes(code)); // Simple mock check, real world would need barcode field
        if (found) {
            setSelectedFood(found);
            setEntryMode('search'); // Switch to confirmation mode
        } else {
            // Not found -> Go to New Food mode pre-filled with barcode (mocking brand as place for it)
            setNewFood(prev => ({ ...prev, brand: `Barcode: ${code}` }));
            setEntryMode('new');
        }
    };

    return (
        <div className="flex flex-col h-full relative pb-20 md:pb-0 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
                        Neverita
                    </h2>
                    <p className="text-gray-500 text-sm font-medium ml-1">
                        Tu inventario inteligente
                    </p>
                </div>

                <button
                    onClick={() => setEntryMode('select')}
                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                    <Icons.Plus size={20} />
                    Añadir Compra
                </button>
            </div>

            {/* MAIN MODAL WRAPPER */}
            {entryMode && (
                <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] w-full max-w-md p-8 shadow-glass animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {entryMode === 'select' && 'Añadir Compra'}
                                {entryMode === 'search' && 'Buscar en Neverita'}
                                {entryMode === 'scan' && 'Escanear Código'}
                                {entryMode === 'new' && 'Nuevo Registro'}
                            </h2>
                            <button onClick={resetStates} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                                <Icons.X size={20} />
                            </button>
                        </div>

                        {/* MODE: SELECT */}
                        {entryMode === 'select' && (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => setEntryMode('scan')}
                                    className="flex items-center gap-4 p-5 bg-white/50 border border-gray-200 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="p-3 bg-stone-100 rounded-xl text-stone-600 group-hover:bg-black group-hover:text-white transition-colors">
                                        <Icons.Scan size={24} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-800 block text-lg">Escanear</span>
                                        <span className="text-sm text-gray-400">Lector de código de barras</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setEntryMode('search')}
                                    className="flex items-center gap-4 p-5 bg-white/50 border border-gray-200 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="p-3 bg-stone-100 rounded-xl text-stone-600 group-hover:bg-black group-hover:text-white transition-colors">
                                        <Icons.Search size={24} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-800 block text-lg">Añadir de Neverita</span>
                                        <span className="text-sm text-gray-400">Buscar en tu base de datos</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setEntryMode('new')}
                                    className="flex items-center gap-4 p-5 bg-white/50 border border-gray-200 rounded-2xl hover:bg-white hover:border-gray-300 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="p-3 bg-stone-100 rounded-xl text-stone-600 group-hover:bg-black group-hover:text-white transition-colors">
                                        <Icons.Plus size={24} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-800 block text-lg">Nuevo Registro</span>
                                        <span className="text-sm text-gray-400">Crear alimento manual</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* MODE: SCAN */}
                        {entryMode === 'scan' && (
                            <div className="space-y-4">
                                <div className="h-64 bg-black rounded-2xl overflow-hidden relative">
                                    <BarcodeScanner onDetected={handleScanSuccess} />
                                    <div className="absolute inset-0 border-2 border-white/30 pointer-events-none rounded-2xl"></div>
                                    <div className="absolute top-1/2 left-4 right-4 h-px bg-red-500/50"></div>
                                </div>
                                <p className="text-center text-sm text-gray-500">Apunta la cámara al código de barras</p>
                                <button onClick={() => setEntryMode('select')} className="w-full py-3 text-gray-500 font-bold hover:text-gray-800">
                                    Volver
                                </button>
                            </div>
                        )}

                        {/* MODE: SEARCH (Existing Logic) */}
                        {entryMode === 'search' && (
                            <div className="space-y-6">
                                {/* Food Search */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Alimento</label>
                                    {!selectedFood ? (
                                        <div className="relative">
                                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder="Buscar alimento..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pl-12 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all placeholder:text-gray-400 font-medium"
                                                autoFocus
                                            />
                                            {searchQuery && filteredFoods.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/60 overflow-hidden z-20 max-h-48 overflow-y-auto">
                                                    {filteredFoods.map(food => (
                                                        <button
                                                            key={food.id}
                                                            className="w-full text-left p-4 hover:bg-stone-50 border-b border-gray-50 last:border-0 transition-colors"
                                                            onClick={() => {
                                                                setSelectedFood(food);
                                                                setSearchQuery('');
                                                            }}
                                                        >
                                                            <p className="font-bold text-gray-800">{food.name}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl shadow-lg">
                                            <span className="font-bold">{selectedFood.name}</span>
                                            <button onClick={() => setSelectedFood(null)} className="p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                                <Icons.X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Unit Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Peso / Unidad (g)</label>
                                        <input
                                            type="number"
                                            value={unitWeight}
                                            onChange={e => setUnitWeight(e.target.value)}
                                            placeholder="Ej. 125"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Cantidad (uds)</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            placeholder="Ej. 4"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Expiration */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Caducidad (Opcional)</label>
                                    <input
                                        type="date"
                                        value={expirationDate}
                                        onChange={e => setExpirationDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 font-medium"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setEntryMode('select')} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                        Volver
                                    </button>
                                    <button
                                        disabled={!selectedFood || !unitWeight || !quantity}
                                        onClick={handleAddExisting}
                                        className="flex-[2] py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* MODE: NEW ENTRY */}
                        {entryMode === 'new' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nombre</label>
                                    <input
                                        type="text"
                                        value={newFood.name}
                                        onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none focus:border-stone-400"
                                        placeholder="Nombre del producto"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Categoría</label>
                                    <select
                                        value={newFood.category}
                                        onChange={e => setNewFood({ ...newFood, category: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium focus:outline-none focus:border-stone-400"
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {Object.keys(FOOD_CATEGORIES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option> // Ideally flatten/map properly if we need subcats
                                        ))}
                                        {/* Simplified categories for now, or assume keys are main groups */}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">kcal (100g)</label>
                                        <input type="number" value={newFood.calories} onChange={e => setNewFood({ ...newFood, calories: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Proteína</label>
                                        <input type="number" value={newFood.protein} onChange={e => setNewFood({ ...newFood, protein: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none focus:border-protein" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Carbs</label>
                                        <input type="number" value={newFood.carbs} onChange={e => setNewFood({ ...newFood, carbs: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none focus:border-carbs" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Grasas</label>
                                        <input type="number" value={newFood.fat} onChange={e => setNewFood({ ...newFood, fat: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none focus:border-fat" placeholder="0" />
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 my-4" />

                                {/* Fridge Data for New Item */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Peso Unitario</label>
                                        <input type="number" value={unitWeight} onChange={e => setUnitWeight(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none" placeholder="g" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Cantidad</label>
                                        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-bold focus:outline-none" placeholder="ud" />
                                    </div>
                                </div>
                                <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 font-medium focus:outline-none" />


                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setEntryMode('select')} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                        Volver
                                    </button>
                                    <button
                                        disabled={!isNewFoodValid}
                                        onClick={handleAddNew}
                                        className="flex-[2] py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Main Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-10 animate-in fade-in duration-700 delay-150">

                {/* Quick Stats / Overview - Matched to Stats/Library style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-[1.5rem] shadow-sm border border-white/60">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-white rounded-full border border-gray-100 shadow-sm text-gray-400">
                                <Icons.Fridge size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Almacenado</span>
                        </div>
                        <p className="text-4xl font-black text-gray-800">{fridgeItems.reduce((acc, item) => acc + item.quantity, 0)} <span className="text-lg font-bold text-gray-400">unidades</span></p>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-[1.5rem] shadow-sm border border-white/60">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-white rounded-full border border-gray-100 shadow-sm text-gray-400">
                                <Icons.Clock size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Caducan Pronto</span>
                        </div>
                        <p className="text-4xl font-black text-gray-800">{fridgeItems.filter(i => {
                            if (!i.expirationDate) return false;
                            const days = Math.ceil((new Date(i.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return days <= 3 && days >= 0;
                        }).length} <span className="text-lg font-bold text-gray-400">items</span></p>
                    </div>
                </div>

                {/* Suggested Shopping / Predictive */}
                <section>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                        <h2 className="text-black text-xs font-bold uppercase tracking-[0.2em]">Sugerencias de Compra</h2>
                        {fridgeItems.filter(i => i.quantity === 0).length > 0 && (
                            <button className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider">Ver todo</button>
                        )}
                    </div>

                    {fridgeItems.filter(i => i.quantity === 0).length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {fridgeItems.filter(i => i.quantity === 0).slice(0, 4).map(item => (
                                <div key={item.id} className="bg-white/60 backdrop-blur-sm p-5 rounded-[1.5rem] border border-white/60 hover:bg-white/80 transition-all shadow-sm group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-3 bg-white rounded-full text-gray-400 border border-gray-100 shadow-sm group-hover:text-stone-600 transition-colors">
                                            {item.category === 'Recetas' ? <Icons.ChefHat size={20} /> : <Icons.Carrot size={20} />}
                                        </div>
                                        <button
                                            onClick={() => onUpdateFridgeItem({ ...item, quantity: 1, purchasedDate: new Date().toISOString() })}
                                            className="p-2 bg-gray-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                                        >
                                            <Icons.Plus size={16} />
                                        </button>
                                    </div>
                                    <div>
                                        <span className="text-base font-bold text-gray-700 block mb-1 truncate">{item.name}</span>
                                        <span className="text-xs text-gray-400 font-medium">{item.unitWeight}g / ud</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mb-4 text-gray-400 backdrop-blur-sm border border-white/50">
                                <Icons.Sparkles size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-600 mb-2">Aprendiendo tus hábitos...</h3>
                            <p className="text-gray-400 text-sm max-w-xs font-medium">Usa la Neverita durante un par de semanas para recibir sugerencias inteligentes.</p>
                        </div>
                    )}
                </section>

                {/* Inventory List */}
                <section>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                        <h2 className="text-black text-xs font-bold uppercase tracking-[0.2em]">En la Nevera</h2>
                    </div>

                    {fridgeItems.filter(i => i.quantity > 0).length === 0 ? (
                        <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] p-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/60">
                            <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                                <Icons.Fridge size={48} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Tu nevera está vacía</h3>
                            <p className="text-gray-400 mb-8 max-w-xs font-medium">Añade tu compra semanal para olvidarte de pesar la comida cada día.</p>
                            <button
                                onClick={() => setEntryMode('select')}
                                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm uppercase tracking-wide"
                            >
                                Añadir primera compra
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fridgeItems
                                .filter(i => i.quantity > 0)
                                .sort((a, b) => {
                                    // Sort by expiration date (if exists), then by purchased date
                                    if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
                                    if (a.expirationDate) return -1;
                                    if (b.expirationDate) return 1;
                                    return new Date(b.purchasedDate).getTime() - new Date(a.purchasedDate).getTime();
                                })
                                .map(item => {
                                    const daysToExpiry = item.expirationDate
                                        ? Math.ceil((new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                        : null;

                                    const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 3 && daysToExpiry >= 0;
                                    const isExpired = daysToExpiry !== null && daysToExpiry < 0;

                                    return (
                                        <div key={item.id} className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 hover:border-stone-200 hover:bg-white transition-all group relative hover:-translate-y-1 hover:shadow-md shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 bg-white rounded-full border border-gray-100 shadow-sm ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`}>
                                                        {item.category === 'Recetas' ? <Icons.ChefHat size={24} /> : <Icons.Carrot size={24} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-lg">{item.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-0.5">
                                                            <span>{item.quantity} uds × {item.unitWeight}g</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => onDeleteFridgeItem(item.id)}
                                                    className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-110"
                                                >
                                                    <Icons.Trash size={18} />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100/50">
                                                {item.expirationDate ? (
                                                    <span className={`text-xs font-bold ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`}>
                                                        {isExpired ? 'Caducado' : daysToExpiry === 0 ? 'Caduca hoy' : `Caduca en ${daysToExpiry} días`}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300 font-medium">Sin fecha</span>
                                                )}

                                                <button
                                                    onClick={() => onConsume(item, 1)}
                                                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all"
                                                >
                                                    Comer (1)
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Neverita;
