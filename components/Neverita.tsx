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
    // State for view mode or sorting could go here

    return (
        <div className="flex flex-col h-full bg-background relative pb-20 md:pb-0">
            {/* Decoration similar to Dashboard */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-stone-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

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
                    // onClick to open Add Modal
                    className="w-12 h-12 bg-black hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                    <Icons.Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Main Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 animate-in fade-in duration-700 delay-150">

                {/* Quick Stats / Overview */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-stone-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <Icons.Fridge size={20} />
                            </div>
                            <span className="text-sm font-bold text-stone-400 uppercase tracking-wider">Total</span>
                        </div>
                        <p className="text-3xl font-bold text-stone-800">{fridgeItems.reduce((acc, item) => acc + item.quantity, 0)} <span className="text-base font-medium text-stone-400">unidades</span></p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-stone-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                <Icons.Clock size={20} />
                            </div>
                            <span className="text-sm font-bold text-stone-400 uppercase tracking-wider">Caducan Pronto</span>
                        </div>
                        <p className="text-3xl font-bold text-stone-800">{fridgeItems.filter(i => {
                            if (!i.expirationDate) return false;
                            const days = Math.ceil((new Date(i.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return days <= 3 && days >= 0;
                        }).length} <span className="text-base font-medium text-stone-400">items</span></p>
                    </div>
                </div>

                {/* Suggested Shopping / Predictive (Placeholder) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-stone-800">Sugerencias de Compra</h2>
                        <button className="text-sm font-bold text-stone-400 hover:text-stone-600">Ver todo</button>
                    </div>
                    <div className="bg-white/50 border border-stone-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-300">
                            <Icons.Sparkles size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-stone-600 mb-2">Aprendiendo tus hábitos...</h3>
                        <p className="text-stone-400 text-sm max-w-xs">Usa la Neverita durante un par de semanas para recibir sugerencias inteligentes.</p>
                    </div>
                </section>

                {/* Inventory List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-stone-800">En la Nevera</h2>
                        <div className="flex gap-2">
                            {/* Sort controls could go here */}
                        </div>
                    </div>

                    {fridgeItems.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-dashed border-stone-200">
                            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-4 text-stone-300">
                                <Icons.Fridge size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-700 mb-2">Tu nevera está vacía</h3>
                            <p className="text-stone-400 mb-6 max-w-xs">Añade tu compra semanal para olvidarte de pesar la comida cada día.</p>
                            <button className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">
                                Añadir primera compra
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* List of Fridge Items will go here */}
                            {fridgeItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
                                    <span>{item.name}</span>
                                    <span>{item.quantity} units</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Neverita;
