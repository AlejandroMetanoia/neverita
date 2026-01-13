import React, { useState, useMemo } from 'react';
import { Food, LogEntry, MealType } from '../types';
import { MEAL_TYPES, MEAL_COLORS } from '../constants';
import { Icons } from './ui/Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
    foods: Food[];
    logs: LogEntry[];
    onAddLog: (entry: LogEntry) => void;
    onDeleteLog: (id: string) => void;
    selectedDate: string;
    onDateChange: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ foods, logs, onAddLog, onDeleteLog, selectedDate, onDateChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal State
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<MealType>('Desayuno');
    const [foodSearch, setFoodSearch] = useState('');

    // Daily Stats Calculation - logs are already filtered by App.tsx
    const dailyLogs = logs;
    const totals = useMemo(() => {
        return dailyLogs.reduce((acc, curr) => ({
            calories: acc.calories + curr.calculated.calories,
            protein: acc.protein + curr.calculated.protein,
            carbs: acc.carbs + curr.calculated.carbs,
            fat: acc.fat + curr.calculated.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [dailyLogs]);

    // Chart Data
    const macroData = [
        { name: 'Proteína', value: totals.protein, color: '#34d399' }, // Emerald
        { name: 'Carbs', value: totals.carbs, color: '#fb923c' }, // Orange
        { name: 'Grasas', value: totals.fat, color: '#facc15' }, // Yellow
    ];

    // Calculator Logic
    const selectedFood = foods.find(f => f.id === selectedFoodId);
    const calculatedMacros = useMemo(() => {
        if (!selectedFood) return null;
        const ratio = grams / 100;
        return {
            calories: Math.round(selectedFood.calories * ratio),
            protein: Number((selectedFood.protein * ratio).toFixed(1)),
            carbs: Number((selectedFood.carbs * ratio).toFixed(1)),
            fat: Number((selectedFood.fat * ratio).toFixed(1)),
        };
    }, [selectedFood, grams]);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFood || !calculatedMacros) return;

        const newLog: LogEntry = {
            id: Date.now().toString(),
            date: selectedDate,
            foodId: selectedFood.id,
            foodName: selectedFood.name,
            meal: mealType,
            grams: grams,
            calculated: calculatedMacros
        };

        onAddLog(newLog);
        setIsModalOpen(false);
        // Reset minimal state
        setGrams(100);
        setFoodSearch('');
    };

    const filteredFoods = foods.filter(f =>
        f.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .includes(foodSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Registro Diario</h2>
                    <p className="text-gray-400 text-sm">Registro y resumen diario</p>
                </div>
                <div className="relative">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-surface text-white border border-surfaceHighlight rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-primary appearance-none text-right"
                    />
                    <Icons.Calendar size={18} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Unified Summary Card */}
            <div className="bg-surface p-6 rounded-2xl border border-surfaceHighlight grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                {/* Chart Side with Calories in Center */}
                <div className="h-64 relative flex justify-center items-center order-1 md:order-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={macroData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {macroData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1E2330', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text for Calories */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <Icons.Calories size={24} className="text-gray-500 mb-1" />
                        <span className="text-4xl font-bold text-white">{Math.round(totals.calories)}</span>
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Kcal</span>
                    </div>
                </div>

                {/* Macros List Side */}
                <div className="flex flex-col justify-center space-y-4 order-2 md:order-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Desglose Nutricional</h3>

                    <div className="bg-surfaceHighlight/30 p-4 rounded-xl flex items-center justify-between border border-surfaceHighlight/50 hover:bg-surfaceHighlight/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Icons.Protein size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Proteínas</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{totals.protein.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500">g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surfaceHighlight/30 p-4 rounded-xl flex items-center justify-between border border-surfaceHighlight/50 hover:bg-surfaceHighlight/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                                <Icons.Carbs size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Carbohidratos</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{totals.carbs.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500">g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surfaceHighlight/30 p-4 rounded-xl flex items-center justify-between border border-surfaceHighlight/50 hover:bg-surfaceHighlight/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                                <Icons.Fat size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Grasas</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{totals.fat.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500">g</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-4 bg-primary hover:bg-gray-200 rounded-2xl text-black font-bold text-lg shadow-lg hover:shadow-gray-500/20 transition-all flex items-center justify-center gap-2"
            >
                <Icons.Plus size={24} />
                Añadir Alimento
            </button>

            {/* Log List by Meal */}
            <div className="space-y-6">
                {MEAL_TYPES.map(meal => {
                    const mealLogs = dailyLogs.filter(l => l.meal === meal);
                    if (mealLogs.length === 0) return null;

                    const style = MEAL_COLORS[meal];

                    return (
                        <div key={meal} className="space-y-3">
                            <h4 className={`text-lg font-bold flex items-center gap-2 ${style.text}`}>
                                <span className={`w-3 h-3 rounded-full ${style.bg.replace('/10', '')}`}></span>
                                {meal}
                            </h4>
                            {mealLogs.map(log => (
                                <div key={log.id} className={`bg-surface p-4 rounded-xl border-l-4 ${style.border} border-t border-r border-b border-surfaceHighlight flex justify-between items-center group`}>
                                    <div>
                                        <p className="font-semibold text-white">{log.foodName}</p>
                                        <p className="text-sm text-gray-500">{log.grams}g</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-bold text-white">{log.calculated.calories} kcal</p>
                                            <div className="flex gap-2 text-xs text-gray-500">
                                                <span>P:{log.calculated.protein}</span>
                                                <span>C:{log.calculated.carbs}</span>
                                                <span>G:{log.calculated.fat}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onDeleteLog(log.id)}
                                            className="text-gray-600 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Icons.Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                })}
                {dailyLogs.length === 0 && (
                    <div className="text-center py-10 text-gray-500 border-2 border-dashed border-surfaceHighlight rounded-2xl">
                        No hay registros para este día.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl border border-surfaceHighlight shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-surfaceHighlight flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Calculadora</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><Icons.Plus className="rotate-45" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Food Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">1. Buscar Alimento</label>
                                <div className="relative">
                                    <Icons.Search className="absolute left-3 top-3 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Escribe para buscar..."
                                        value={foodSearch}
                                        onChange={(e) => {
                                            setFoodSearch(e.target.value);
                                            setSelectedFoodId(''); // Reset selection on search
                                        }}
                                        className="w-full bg-background border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                {foodSearch && !selectedFoodId && (
                                    <div className="mt-2 max-h-40 overflow-y-auto bg-background border border-surfaceHighlight rounded-lg">
                                        {filteredFoods.map(f => (
                                            <div
                                                key={f.id}
                                                onClick={() => {
                                                    setSelectedFoodId(f.id);
                                                    setFoodSearch(f.name);
                                                }}
                                                className="p-3 hover:bg-surfaceHighlight cursor-pointer text-sm text-gray-200 flex justify-between"
                                            >
                                                <span>{f.name}</span>
                                                <span className="text-gray-500">{f.calories} kcal/100g</span>
                                            </div>
                                        ))}
                                        {filteredFoods.length === 0 && <div className="p-3 text-sm text-gray-500">No encontrado</div>}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Grams Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">2. Cantidad (g)</label>
                                    <input
                                        type="number"
                                        value={grams}
                                        onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                {/* Meal Select */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">3. Comida</label>
                                    <select
                                        value={mealType}
                                        onChange={(e) => setMealType(e.target.value as MealType)}
                                        className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary appearance-none"
                                    >
                                        {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Live Calculator Result */}
                            {calculatedMacros && (
                                <div className="bg-surfaceHighlight/30 rounded-xl p-4 border border-dashed border-gray-700">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">Resultado Automático</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-white">{calculatedMacros.calories}</p>
                                            <p className="text-[10px] text-gray-500">Kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-emerald-400">{calculatedMacros.protein}g</p>
                                            <p className="text-[10px] text-gray-500">Prot</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-orange-400">{calculatedMacros.carbs}g</p>
                                            <p className="text-[10px] text-gray-500">Carbs</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-yellow-400">{calculatedMacros.fat}g</p>
                                            <p className="text-[10px] text-gray-500">Grasa</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAddLog}
                                disabled={!selectedFood}
                                className="w-full bg-primary hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors"
                            >
                                Añadir al Diario
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;