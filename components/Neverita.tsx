import React, { useState, useMemo } from 'react';
import { Icons } from './ui/Icons';
import { Food, FridgeItem } from '../types';


interface NeveritaProps {
    isGuest: boolean;
    foods: Food[];
    fridgeItems: FridgeItem[];
    onAddToFridge: (item: FridgeItem) => void;
    onUpdateFridgeItem: (item: FridgeItem) => void;
    onDeleteFridgeItem: (id: string) => void;
    onConsume: (item: FridgeItem, quantityToConsume: number) => void;
    onToggleMenu?: (hidden: boolean) => void;
}

const Neverita: React.FC<NeveritaProps> = ({
    isGuest,
    foods,
    fridgeItems = [],
    onAddToFridge,
    onUpdateFridgeItem,
    onDeleteFridgeItem,
    onConsume,
    onToggleMenu
}) => {
    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [unitWeight, setUnitWeight] = useState('');
    const [quantity, setQuantity] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    // Filtered Foods for Search
    const filteredFoods = useMemo(() => {
        if (!searchQuery) return [];
        return foods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
    }, [searchQuery, foods]);

    const handleAdd = () => {
        if (!selectedFood) return;

        const newItem: FridgeItem = {
            id: crypto.randomUUID(),
            foodId: selectedFood.id,
            name: selectedFood.name,
            unitWeight: parseFloat(unitWeight),
            quantity: parseFloat(quantity),
            expirationDate: expirationDate || undefined,
            purchasedDate: new Date().toISOString(),
            category: selectedFood.category // Optional
        };

        onAddToFridge(newItem);

        // Reset and Close
        setIsAddModalOpen(false);
        setSelectedFood(null);
        setSearchQuery('');
        setUnitWeight('');
        setQuantity('');
        setExpirationDate('');
    };

    return (
        <div className="flex flex-col h-full bg-background relative pb-20 md:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-4xl font-bold text-stone-900 font-[Outfit] tracking-tight">
                        Neverita
                    </h1>
                    <p className="text-stone-500 font-medium">
                        Tu inventario inteligente
                    </p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-12 h-12 bg-black hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                    <Icons.Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-stone-800">Añadir Compra</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-stone-100/50 hover:bg-stone-200/50 rounded-full transition-colors">
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Food Search */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase">Alimento</label>
                                {!selectedFood ? (
                                    <div className="relative">
                                        <Icons.Search className="absolute left-3 top-3 text-stone-400" size={20} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Buscar alimento..."
                                            className="w-full pl-10 p-3 bg-white/50 border border-white/40 rounded-xl focus:bg-white focus:border-stone-300 outline-none transition-all"
                                            autoFocus
                                        />
                                        {searchQuery && filteredFoods.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/40 overflow-hidden z-20 max-h-48 overflow-y-auto">
                                                {filteredFoods.map(food => (
                                                    <button
                                                        key={food.id}
                                                        className="w-full text-left p-3 hover:bg-stone-100/50 border-b border-stone-100/50 last:border-0"
                                                        onClick={() => {
                                                            setSelectedFood(food);
                                                            setSearchQuery('');
                                                        }}
                                                    >
                                                        <p className="font-bold text-stone-800">{food.name}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-stone-900 text-white rounded-xl shadow-lg">
                                        <span className="font-bold">{selectedFood.name}</span>
                                        <button onClick={() => setSelectedFood(null)} className="p-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                            <Icons.X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Unit Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Peso / Unidad (g)</label>
                                    <input
                                        type="number"
                                        value={unitWeight}
                                        onChange={e => setUnitWeight(e.target.value)}
                                        placeholder="Ej. 125"
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-xl focus:bg-white focus:border-stone-300 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Cantidad (uds)</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        placeholder="Ej. 4"
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-xl focus:bg-white focus:border-stone-300 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Expiration */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-500 uppercase">Caducidad (Opcional)</label>
                                <input
                                    type="date"
                                    value={expirationDate}
                                    onChange={e => setExpirationDate(e.target.value)}
                                    className="w-full p-3 bg-white/50 border border-white/40 rounded-xl focus:bg-white focus:border-stone-300 outline-none transition-all"
                                />
                            </div>

                            <button
                                disabled={!selectedFood || !unitWeight || !quantity}
                                onClick={handleAdd}
                                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                Añadir a la Nevera
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 animate-in fade-in duration-700 delay-150">

                {/* Quick Stats / Overview */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white/40 transition-all hover:bg-white/70">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50/80 text-blue-600 rounded-xl border border-blue-100">
                                <Icons.Fridge size={20} />
                            </div>
                            <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">Total</span>
                        </div>
                        <p className="text-3xl font-bold text-stone-800">{fridgeItems.reduce((acc, item) => acc + item.quantity, 0)} <span className="text-base font-medium text-stone-400">unidades</span></p>
                    </div>

                    <div className="bg-white/60 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white/40 transition-all hover:bg-white/70">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50/80 text-orange-600 rounded-xl border border-orange-100">
                                <Icons.Clock size={20} />
                            </div>
                            <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">Caducan Pronto</span>
                        </div>
                        <p className="text-3xl font-bold text-stone-800">{fridgeItems.filter(i => {
                            if (!i.expirationDate) return false;
                            const days = Math.ceil((new Date(i.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return days <= 3 && days >= 0;
                        }).length} <span className="text-base font-medium text-stone-400">items</span></p>
                    </div>
                </div>

                {/* Suggested Shopping / Predictive */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-stone-800">Sugerencias de Compra</h2>
                        {fridgeItems.filter(i => i.quantity === 0).length > 0 && (
                            <button className="text-sm font-bold text-stone-400 hover:text-stone-600">Ver todo</button>
                        )}
                    </div>

                    {fridgeItems.filter(i => i.quantity === 0).length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {fridgeItems.filter(i => i.quantity === 0).slice(0, 4).map(item => (
                                <div key={item.id} className="bg-white/60 backdrop-blur-xl p-3 rounded-2xl border border-white/40 shadow-sm flex flex-col gap-2 group hover:bg-white/80 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-stone-50/80 text-stone-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            {item.category === 'Recetas' ? <Icons.ChefHat size={16} /> : <Icons.Carrot size={16} />}
                                        </div>
                                        <button
                                            onClick={() => onUpdateFridgeItem({ ...item, quantity: 1, purchasedDate: new Date().toISOString() })}
                                            className="p-1.5 bg-black text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 shadow-lg"
                                        >
                                            <Icons.Plus size={14} />
                                        </button>
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-stone-700 line-clamp-1">{item.name}</span>
                                        <span className="text-xs text-stone-400">{item.unitWeight}g / ud</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mb-4 text-stone-300 backdrop-blur-sm">
                                <Icons.Sparkles size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-stone-600 mb-2">Aprendiendo tus hábitos...</h3>
                            <p className="text-stone-400 text-sm max-w-xs">Usa la Neverita durante un par de semanas para recibir sugerencias inteligentes.</p>
                        </div>
                    )}
                </section>

                {/* Inventory List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-stone-800">En la Nevera</h2>
                        <div className="flex gap-2">
                            {/* Sort controls could go here */}
                        </div>
                    </div>

                    {fridgeItems.filter(i => i.quantity > 0).length === 0 ? (
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-dashed border-white/40 shadow-sm">
                            <div className="w-20 h-20 bg-stone-50/50 rounded-full flex items-center justify-center mb-4 text-stone-300">
                                <Icons.Fridge size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-700 mb-2">Tu nevera está vacía</h3>
                            <p className="text-stone-400 mb-6 max-w-xs">Añade tu compra semanal para olvidarte de pesar la comida cada día.</p>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
                            >
                                Añadir primera compra
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
                                        <div key={item.id} className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/40 shadow-sm flex items-center justify-between group hover:bg-white/80 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/50 ${isExpired ? 'bg-red-50/80 text-red-500' : isExpiringSoon ? 'bg-orange-50/80 text-orange-500' : 'bg-stone-50/80 text-stone-500'}`}>
                                                    {item.category === 'Recetas' ? <Icons.ChefHat size={24} /> : <Icons.Carrot size={24} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-stone-800">{item.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
                                                        <span>{item.quantity} uds × {item.unitWeight}g</span>
                                                        {item.expirationDate && (
                                                            <span className={`${isExpired ? 'text-red-500 font-bold' : isExpiringSoon ? 'text-orange-500 font-bold' : ''}`}>
                                                                • {isExpired ? 'Caducado' : daysToExpiry === 0 ? 'Caduca hoy' : `Caduca en ${daysToExpiry} días`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onConsume(item, 1)}
                                                    className="bg-stone-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all"
                                                >
                                                    Comer (1)
                                                </button>
                                                <button
                                                    onClick={() => onDeleteFridgeItem(item.id)}
                                                    className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                                                >
                                                    <Icons.Trash size={18} />
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
