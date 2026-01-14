import React, { useState, useMemo, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    const [entryMode, setEntryMode] = useState<'search' | 'manual' | 'ai' | null>(null);

    // AI State
    const [aiDescription, setAiDescription] = useState('');
    const [aiImage, setAiImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<MealType>('Desayuno');
    const [foodSearch, setFoodSearch] = useState('');

    // Manual Entry State
    const [manualEntry, setManualEntry] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        name: 'Comida Fuera'
    });

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

        let newLog: LogEntry;

        if (entryMode === 'search') {
            if (!selectedFood || !calculatedMacros) return;
            newLog = {
                id: Date.now().toString(),
                date: selectedDate,
                foodId: selectedFood.id,
                foodName: selectedFood.name,
                meal: mealType,
                grams: grams,
                calculated: calculatedMacros
            };
        } else {
            // Manual Mode
            newLog = {
                id: Date.now().toString(),
                date: selectedDate,
                foodId: `manual-${Date.now()}`,
                foodName: manualEntry.name || "Comida Fuera",
                meal: mealType,
                grams: 1, // Dummy value
                calculated: {
                    calories: manualEntry.calories,
                    protein: manualEntry.protein,
                    carbs: manualEntry.carbs,
                    fat: manualEntry.fat
                }
            };
        }

        onAddLog(newLog);
        setEntryMode(null);
        // Reset minimal state
        setGrams(100);
        setFoodSearch('');
        setManualEntry({ calories: 0, protein: 0, carbs: 0, fat: 0, name: 'Comida Fuera' });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAiImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const apiKey = import.meta.env.GEMINI_API_NEVERITA;
            if (!apiKey) {
                alert("API Key not found (GEMINI_API_NEVERITA)");
                setIsAnalyzing(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `Act as an expert nutritionist. Estimate the macros (kcal, protein, carbs, fat) per 100g of the described or photographed dish.
            Description: ${aiDescription}
            
            IMPORTANT: Return ONLY a raw JSON object (no markdown formatting, no code blocks) with this exact format:
            {"kcal": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0}`;

            let result;
            if (aiImage) {
                const base64Data = aiImage.split(',')[1];
                const imagePart = {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    },
                };
                result = await model.generateContent([prompt, imagePart]);
            } else {
                result = await model.generateContent(prompt);
            }

            const response = result.response;
            const text = response.text();

            // Cleanup
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            setManualEntry({
                name: aiDescription || 'Plato analizado',
                calories: data.kcal || 0,
                protein: data.proteinas || 0,
                carbs: data.carbohidratos || 0,
                fat: data.grasas || 0
            });
            setEntryMode('manual');

            // Reset AI state
            setAiDescription('');
            setAiImage(null);

        } catch (error) {
            console.error("Error analyzing food:", error);
            alert("Error al analizar. Por favor intenta de nuevo.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredFoods = foods.filter(f =>
        f.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .includes(foodSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Registro Diario</h2>
                    <p className="text-gray-400 text-sm font-medium">Resumen y seguimiento nutricional</p>
                </div>
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="relative z-10 bg-black/40 backdrop-blur-md text-white border border-white/10 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 appearance-none text-right shadow-lg transition-all"
                    />
                    <Icons.Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-20" />
                </div>
            </div>

            {/* Unified Summary Card - GLASS */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center shadow-glass relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                {/* Chart Side with Calories in Center */}
                <div className="h-72 relative flex justify-center items-center order-1 md:order-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                <filter id="shadow" height="200%">
                                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffffff33" />
                                </filter>
                            </defs>
                            <Pie
                                data={macroData}
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={110}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                            >
                                {macroData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: 'url(#shadow)' }} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text for Calories */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="p-3 rounded-full bg-white/5 backdrop-blur-sm mb-2 shadow-inner border border-white/5">
                            <Icons.Calories size={24} className="text-primary/80" />
                        </div>
                        <span className="text-5xl font-extrabold text-white tracking-tighter drop-shadow-lg">{Math.round(totals.calories)}</span>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Kcal</span>
                    </div>
                </div>

                {/* Macros List Side */}
                <div className="flex flex-col justify-center space-y-5 order-2 md:order-1 relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Icons.Stats className="text-primary" />
                        Desglose Nutricional
                    </h3>

                    <div className="bg-black/20 p-5 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-black/30 hover:border-white/10 transition-all hover:scale-[1.02] group">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)] group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all">
                                <Icons.Protein size={26} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300">Proteínas</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-white">{totals.protein.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500 font-bold">g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/20 p-5 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-black/30 hover:border-white/10 transition-all hover:scale-[1.02] group">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-orange-500/10 rounded-xl text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.15)] group-hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all">
                                <Icons.Carbs size={26} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300">Carbohidratos</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-white">{totals.carbs.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500 font-bold">g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/20 p-5 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-black/30 hover:border-white/10 transition-all hover:scale-[1.02] group">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-yellow-500/10 rounded-xl text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.15)] group-hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all">
                                <Icons.Fat size={26} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium group-hover:text-gray-300">Grasas</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-white">{totals.fat.toFixed(1)}</span>
                                    <span className="text-xs text-gray-500 font-bold">g</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setEntryMode('search')}
                    className="py-6 px-4 bg-primary/90 hover:bg-primary rounded-2xl text-black font-bold text-lg shadow-[0_0_20px_rgba(228,228,231,0.3)] hover:shadow-[0_0_30px_rgba(228,228,231,0.5)] hover:scale-[1.03] transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Icons.Plus size={32} />
                    <span>Añadir Alimento</span>
                </button>
                <button
                    onClick={() => setEntryMode('manual')}
                    className="py-6 px-4 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-white font-semibold text-lg hover:border-white/30 hover:scale-[1.03] transition-all flex flex-col items-center justify-center gap-2 shadow-glass"
                >
                    <Icons.Plus size={28} className="text-gray-400 group-hover:text-white" />
                    <span>Registro Manual</span>
                </button>
                <button
                    onClick={() => setEntryMode('ai')}
                    className="py-6 px-4 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-2xl text-white font-bold text-lg shadow-[0_0_25px_rgba(147,51,234,0.4)] hover:shadow-[0_0_40px_rgba(147,51,234,0.6)] hover:scale-[1.03] transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <Icons.Sparkles size={32} className="animate-pulse" />
                    <span>Asistente IA</span>
                </button>
            </div>

            {/* Log List by Meal */}
            <div className="space-y-8">
                {MEAL_TYPES.map(meal => {
                    const mealLogs = dailyLogs.filter(l => l.meal === meal);
                    if (mealLogs.length === 0) return null;

                    const style = MEAL_COLORS[meal];

                    return (
                        <div key={meal} className="space-y-4">
                            <h4 className={`text-xl font-bold flex items-center gap-3 ${style.text} pl-2`}>
                                <span className={`w-3 h-3 rounded-full ${style.bg.replace('/10', '')} shadow-[0_0_10px_currentColor]`}></span>
                                {meal}
                            </h4>
                            <div className="grid gap-3">
                                {mealLogs.map(log => (
                                    <div key={log.id} className={`bg-black/20 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:border-white/15 hover:bg-black/30 transition-all flex justify-between items-center group relative overflow-hidden`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg.replace('/10', '')} opacity-60`} />

                                        <div className="pl-3">
                                            <p className="font-bold text-lg text-white mb-0.5">{log.foodName}</p>
                                            <p className="text-sm text-gray-500 font-medium">{log.grams}g</p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-white">{log.calculated.calories} <span className="text-sm text-gray-500 font-normal">kcal</span></p>
                                                <div className="flex gap-3 text-xs text-gray-500 font-medium mt-1">
                                                    <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">P: {log.calculated.protein}</span>
                                                    <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">C: {log.calculated.carbs}</span>
                                                    <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">G: {log.calculated.fat}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onDeleteLog(log.id)}
                                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Icons.Trash size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
                {dailyLogs.length === 0 && (
                    <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
                        <Icons.Utensils className="mx-auto mb-4 opacity-20" size={48} />
                        <p className="text-lg">No hay registros hoy.</p>
                        <p className="text-sm opacity-60">¡Empieza añadiendo tu primera comida!</p>
                    </div>
                )}
            </div>

            {/* Modal - GLASS */}
            {entryMode && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#121212]/90 backdrop-blur-xl w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                {entryMode === 'search' && <Icons.Search className="text-primary" />}
                                {entryMode === 'manual' && <Icons.Plus className="text-primary" />}
                                {entryMode === 'ai' && <Icons.Sparkles className="text-purple-400" />}
                                {entryMode === 'search' ? 'Calculadora' : entryMode === 'manual' ? 'Comida Fuera' : 'Asistente Nutricional'}
                            </h3>
                            <button onClick={() => setEntryMode(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Icons.Plus className="rotate-45" size={20} /></button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {/* Content remains mostly the same, just styled inputs */}
                            {entryMode === 'search' ? (
                                <>
                                    {/* Food Selector */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">1. Buscar Alimento</label>
                                        <div className="relative group">
                                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Ej. Arroz con pollo..."
                                                value={foodSearch}
                                                onChange={(e) => {
                                                    setFoodSearch(e.target.value);
                                                    setSelectedFoodId(''); // Reset selection on search
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                        {foodSearch && !selectedFoodId && (
                                            <div className="mt-2 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20">
                                                {filteredFoods.map(f => (
                                                    <div
                                                        key={f.id}
                                                        onClick={() => {
                                                            setSelectedFoodId(f.id);
                                                            setFoodSearch(f.name);
                                                        }}
                                                        className="p-4 hover:bg-white/5 cursor-pointer text-sm text-gray-200 flex justify-between border-b border-white/5 last:border-0"
                                                    >
                                                        <span className="font-medium">{f.name}</span>
                                                        <span className="text-gray-500 font-mono bg-black/40 px-2 py-0.5 rounded-md">{f.calories} kcal</span>
                                                    </div>
                                                ))}
                                                {filteredFoods.length === 0 && <div className="p-4 text-sm text-gray-500 text-center">No encontrado</div>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Grams Input */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">2. Cantidad (g)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={grams}
                                                    onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-lg"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none">g</span>
                                            </div>
                                        </div>
                                        {/* Meal Select */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">3. Comida</label>
                                            <div className="relative">
                                                <select
                                                    value={mealType}
                                                    onChange={(e) => setMealType(e.target.value as MealType)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer"
                                                >
                                                    {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Calculator Result */}
                                    {calculatedMacros && (
                                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-inner relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                                <Icons.Stats size={64} />
                                            </div>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-bold">Resultado Automático</p>
                                            <div className="grid grid-cols-4 gap-4 text-center divide-x divide-white/10">
                                                <div>
                                                    <p className="text-2xl font-black text-white">{calculatedMacros.calories}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Kcal</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-emerald-400">{calculatedMacros.protein}g</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Prot</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-orange-400">{calculatedMacros.carbs}g</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Carbs</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-yellow-400">{calculatedMacros.fat}g</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Grasa</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : entryMode === 'manual' ? (
                                /* MANUAL MODE */
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre del plato</label>
                                        <input
                                            type="text"
                                            value={manualEntry.name}
                                            onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                            placeholder="Ej. Comida con amigos"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Calorías Total</label>
                                            <input
                                                type="number"
                                                value={manualEntry.calories || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, calories: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 font-mono text-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Comida</label>
                                            <div className="relative">
                                                <select
                                                    value={mealType}
                                                    onChange={(e) => setMealType(e.target.value as MealType)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 appearance-none"
                                                >
                                                    {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider">Proteína (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.protein || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, protein: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-orange-400 mb-2 uppercase tracking-wider">Carbs (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.carbs || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, carbs: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-yellow-400 mb-2 uppercase tracking-wider">Grasa (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.fat || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, fat: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* AI MODE */
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Describe tu plato</label>
                                        <textarea
                                            value={aiDescription}
                                            onChange={(e) => setAiDescription(e.target.value)}
                                            placeholder="Ej: Filete a la vilaroy con patatas y un poco de ensalada..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 min-h-[120px] resize-none placeholder:text-gray-600 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">O sube una foto</label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-white/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                                        >
                                            {aiImage ? (
                                                <div className="relative w-full h-48 group-hover:scale-[1.02] transition-transform">
                                                    <img src={aiImage} alt="Preview" className="w-full h-full object-contain rounded-xl shadow-lg" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAiImage(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-red-500 text-white transition-colors"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-white/5 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                                        <Icons.Sparkles className="text-purple-400" size={32} />
                                                    </div>
                                                    <p className="text-sm text-gray-400 font-medium">Clic para subir o tomar foto</p>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleImageUpload}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Action Button */}
                            {entryMode === 'ai' ? (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || (!aiDescription && !aiImage)}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] flex items-center justify-center gap-3"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Analizando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Sparkles size={20} />
                                            <span>Analizar con IA</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleAddLog}
                                    disabled={entryMode === 'search' && !selectedFood}
                                    className="w-full bg-primary hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
                                >
                                    <Icons.Plus size={24} />
                                    {entryMode === 'search' ? 'Añadir al Diario' : 'Registrar Comida'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;