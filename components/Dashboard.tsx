import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Food, LogEntry, MealType } from '../types';
import { MEAL_TYPES, MEAL_COLORS } from '../constants';
import { Icons } from './ui/Icons';
import BarcodeScanner from './BarcodeScanner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
    foods: Food[];
    logs: LogEntry[];
    onAddLog: (entry: LogEntry) => void;
    onDeleteLog: (id: string) => void;
    selectedDate: string;
    onDateChange: (date: string) => void;
    onNavigateToLibrary: () => void;
    onToggleMenu: (hidden: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ foods, logs, onAddLog, onDeleteLog, selectedDate, onDateChange, onNavigateToLibrary, onToggleMenu }) => {
    const [entryMode, setEntryMode] = useState<'search' | 'scan' | 'manual' | 'ai' | null>(null);

    // Toggle Menu Visibility
    useEffect(() => {
        onToggleMenu(entryMode !== null);
        return () => onToggleMenu(false); // Reset on unmount
    }, [entryMode, onToggleMenu]);

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
    // COLORS[0] -> Proteína (White)
    // COLORS[1] -> Carbs (Stone-400)
    // COLORS[2] -> Grasas (Stone-500)
    const COLORS = ['#ffffff', '#a8a29e', '#78716c'];
    const macroData = [
        { name: 'Proteína', value: totals.protein, color: COLORS[0] },
        { name: 'Carbohidratos', value: totals.carbs, color: COLORS[1] },
        { name: 'Grasas', value: totals.fat, color: COLORS[2] },
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
        <div className="space-y-4 animate-fade-in pb-20">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 tracking-tight drop-shadow-sm">Registro Diario</h2>
                    <p className="text-gray-600 text-sm font-medium">Resumen y seguimiento nutricional</p>
                </div>
                <div className="relative group">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="relative z-10 bg-white/50 backdrop-blur-md text-gray-800 border border-white/40 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-stone-400 appearance-none text-right transition-all"
                    />
                    <Icons.Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-20" />
                </div>
            </div>

            {/* Refactored Stats Grid - Consolidated for Desktop */}
            <div className="mb-4">
                <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center gap-6">

                    {/* Left Section: Calories & Chart */}
                    <div className="flex-1 flex justify-between items-center relative z-10">
                        <div className="flex flex-col">
                            <p className="text-gray-600 font-bold mb-1 ml-1 text-sm">Calorías Consumidas</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-black text-gray-800 tracking-tighter leading-none">{Math.round(totals.calories)}</span>
                                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Kcal</span>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="w-24 h-24 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={macroData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="70%"
                                        outerRadius="100%"
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={4}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {macroData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                                <Icons.Calories size={24} className="opacity-50" />
                            </div>
                        </div>
                    </div>

                    {/* Divider (Desktop Only) */}
                    <div className="hidden md:block w-px h-20 bg-gray-200/50"></div>

                    {/* Right Section: Macros List */}
                    <div className="flex-1 grid grid-cols-3 divide-x-2 divide-stone-300 md:divide-x-0 md:flex md:justify-between">
                        {/* Protein */}
                        <div className="flex flex-col items-start pl-4 md:pl-0 md:items-start pr-1 md:pr-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-white ring-1 ring-black/5" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Proteína</span>
                            </div>
                            <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.protein)}<span className="text-xs text-gray-400 font-bold ml-0.5">g</span></p>
                        </div>

                        {/* Carbs */}
                        <div className="flex flex-col items-center md:items-center px-1 md:px-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-stone-400" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Carbohidratos</span>
                            </div>
                            <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.carbs)}<span className="text-xs text-gray-400 font-bold ml-0.5">g</span></p>
                        </div>

                        {/* Fat */}
                        <div className="flex flex-col items-end pr-4 md:pr-0 md:items-end pl-1 md:pl-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-stone-500" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Grasas</span>
                            </div>
                            <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.fat)}<span className="text-xs text-gray-400 font-bold ml-0.5">g</span></p>
                        </div>
                    </div>

                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <button
                    onClick={() => setEntryMode('scan')}
                    className="w-full py-3 bg-white/50 backdrop-blur-md border border-white/40 hover:bg-white/70 rounded-xl text-gray-600 hover:text-stone-600 font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3"
                >
                    <div className="p-2 bg-stone-200/50 rounded-lg group-hover:scale-110 transition-transform">
                        <Icons.ScanBarcode size={18} className="text-stone-500" />
                    </div>
                    <span>Escanear</span>
                </button>

                <button
                    onClick={() => setEntryMode('search')}
                    className="group relative w-full py-3 bg-white/50 backdrop-blur-md border border-white/40 hover:bg-white/70 rounded-xl text-gray-600 hover:text-stone-600 font-bold text-sm transition-all flex items-center justify-center gap-3"
                >
                    <div className="p-2 bg-stone-200/50 rounded-lg group-hover:scale-110 transition-transform">
                        <Icons.Plus size={18} className="text-stone-500" />
                    </div>
                    <span>Añadir Alimento</span>
                </button>

                <button
                    onClick={() => setEntryMode('manual')}
                    className="w-full py-3 bg-white/50 backdrop-blur-md border border-white/40 hover:bg-white/70 rounded-xl text-gray-600 hover:text-gray-800 font-semibold text-sm transition-all flex items-center justify-center gap-3"
                >
                    <div className="p-2 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">
                        <Icons.Edit2 size={16} className="text-gray-500" />
                    </div>
                    <span>Registro Manual</span>
                </button>

                <button
                    onClick={() => setEntryMode('ai')}
                    className="group w-full py-3 bg-gradient-to-br from-stone-500/80 to-stone-700/80 hover:from-stone-600 hover:to-stone-800 backdrop-blur-xl rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden border border-white/20"
                >
                    <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Icons.Sparkles size={16} className="animate-pulse" />
                    <span className="relative z-10">Asistente IA</span>
                </button>
            </div>

            {/* Log List by Meal */}
            {/* Log List by Meal */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl mt-8 shadow-sm">
                <h3 className="text-2xl font-bold text-gray-800 px-1 mb-2">Resumen de Comidas</h3>

                <div className="space-y-6">
                    {MEAL_TYPES.map(meal => {
                        const mealLogs = dailyLogs.filter(l => l.meal === meal);
                        if (mealLogs.length === 0) return null;

                        // Color Mapping based on User Request
                        // Red, Orange, Green (from image), then Blue, Purple
                        let cardGradient = "";
                        let shadowColor = "";

                        switch (meal) {
                            case 'Desayuno':
                                cardGradient = "bg-gradient-to-br from-[#FF4B4B] to-[#F76B6B]"; // Vibrant Red
                                shadowColor = "shadow-red-200";
                                break;
                            case 'Almuerzo': // Morning Snack / Brunch
                                cardGradient = "bg-gradient-to-br from-orange-400 to-amber-500"; // Orange
                                shadowColor = "shadow-orange-200";
                                break;
                            case 'Comida': // Lunch
                                cardGradient = "bg-gradient-to-br from-emerald-500 to-green-600"; // Green
                                shadowColor = "shadow-emerald-200";
                                break;
                            case 'Merienda': // Afternoon Snack
                                cardGradient = "bg-gradient-to-br from-blue-400 to-sky-500"; // Blue
                                shadowColor = "shadow-blue-200";
                                break;
                            case 'Cena': // Dinner
                                cardGradient = "bg-gradient-to-br from-purple-500 to-violet-600"; // Purple
                                shadowColor = "shadow-purple-200";
                                break;
                            default:
                                cardGradient = "bg-gradient-to-br from-gray-500 to-gray-600";
                                shadowColor = "shadow-gray-200";
                        }

                        return (
                            <div key={meal} className="space-y-3">
                                <h4 className="text-lg font-bold flex items-center gap-2 text-gray-600 pl-2">
                                    {meal}
                                </h4>
                                <div className="grid gap-3">
                                    {mealLogs.map(log => (
                                        <div key={log.id} className={`${cardGradient}/80 backdrop-blur-md border border-white/20 p-4 rounded-xl flex justify-between items-center group relative overflow-hidden`}>

                                            <div className="flex-1 min-w-0 pr-3 relative z-10">
                                                <p className="font-bold text-base text-white truncate leading-tight mb-1">{log.foodName}</p>
                                                <div className="flex items-center gap-2 text-xs text-white/90 font-medium">
                                                    <span>{log.grams}g</span>
                                                    <span className="opacity-60">•</span>
                                                    <div className="flex gap-2">
                                                        <span>P: {log.calculated.protein}</span>
                                                        <span>C: {log.calculated.carbs}</span>
                                                        <span>G: {log.calculated.fat}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
                                                <p className="font-black text-lg text-white">{log.calculated.calories} <span className="text-xs text-white/80 font-medium">kcal</span></p>
                                                <button
                                                    onClick={() => onDeleteLog(log.id)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white transition-all shadow-sm"
                                                >
                                                    <Icons.Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                    }
                                </div>
                            </div>
                        )
                    })}
                </div>
                {dailyLogs.length === 0 && (
                    <div className="text-center py-20 text-gray-400 mt-4 border-2 border-dashed border-white/40 rounded-3xl bg-white/30 backdrop-blur-sm">
                        <Icons.Utensils className="mx-auto mb-4 opacity-30 text-gray-400" size={48} />
                        <p className="text-lg font-medium text-gray-500">No hay registros hoy.</p>
                        <p className="text-sm opacity-60 text-gray-500">¡Empieza añadiendo tu primera comida!</p>
                    </div>
                )}
            </div>

            {/* Modal - Ethereal Light */}
            {entryMode && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-xl rounded-[2rem] border border-white/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                {entryMode === 'search' && <Icons.Search className="text-indigo-500" />}
                                {entryMode === 'manual' && <Icons.Plus className="text-indigo-500" />}
                                {entryMode === 'ai' && <Icons.Sparkles className="text-purple-500" />}
                                {entryMode === 'search' ? 'Calculadora' : entryMode === 'manual' ? 'Comida Fuera' : 'Asistente Nutricional'}
                            </h3>
                            <button onClick={() => setEntryMode(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"><Icons.Plus className="rotate-45" size={20} /></button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {/* Content remains mostly the same, just styled inputs */}
                            {entryMode === 'search' ? (
                                <>
                                    {/* Food Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">1. Buscar Alimento</label>
                                        <div className="relative group">
                                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Ej. Arroz con pollo..."
                                                value={foodSearch}
                                                onChange={(e) => {
                                                    setFoodSearch(e.target.value);
                                                    setSelectedFoodId(''); // Reset selection on search
                                                }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-gray-400 font-medium"
                                            />
                                        </div>
                                        {foodSearch && !selectedFoodId && (
                                            <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-20">
                                                {filteredFoods.map(f => (
                                                    <div
                                                        key={f.id}
                                                        onClick={() => {
                                                            setSelectedFoodId(f.id);
                                                            setFoodSearch(f.name);
                                                        }}
                                                        className="p-4 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex justify-between border-b border-gray-50 last:border-0"
                                                    >
                                                        <span className="font-medium">{f.name}</span>
                                                        <span className="text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md">{f.calories} kcal</span>
                                                    </div>
                                                ))}
                                                {filteredFoods.length === 0 && <div className="p-4 text-sm text-gray-500 text-center">No encontrado</div>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Grams Input */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">2. Cantidad (g)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={grams}
                                                    onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-lg font-bold"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">g</span>
                                            </div>
                                        </div>
                                        {/* Meal Select */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">3. Comida</label>
                                            <div className="relative">
                                                <select
                                                    value={mealType}
                                                    onChange={(e) => setMealType(e.target.value as MealType)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 appearance-none transition-all cursor-pointer font-medium"
                                                >
                                                    {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Calculator Result */}
                                    {calculatedMacros && (
                                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-5 text-indigo-500">
                                                <Icons.Stats size={64} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4 font-bold">Resultado Automático</p>
                                            <div className="grid grid-cols-4 gap-4 text-center divide-x divide-gray-100">
                                                <div>
                                                    <p className="text-2xl font-black text-gray-800">{calculatedMacros.calories}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Kcal</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-protein">{calculatedMacros.protein}g</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Prot</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-carbs">{calculatedMacros.carbs}g</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Carbohidratos</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-fat">{calculatedMacros.fat}g</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Grasa</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : entryMode === 'manual' ? (
                                /* MANUAL MODE */
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre del plato</label>
                                        <input
                                            type="text"
                                            value={manualEntry.name}
                                            onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                                            placeholder="Ej. Comida con amigos"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Calorías Total</label>
                                            <input
                                                type="number"
                                                value={manualEntry.calories || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, calories: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 font-mono text-lg font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Comida</label>
                                            <div className="relative">
                                                <select
                                                    value={mealType}
                                                    onChange={(e) => setMealType(e.target.value as MealType)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 appearance-none font-medium"
                                                >
                                                    {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-protein mb-2 uppercase tracking-wider">Proteína (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.protein || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, protein: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-protein focus:ring-4 focus:ring-sky-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-carbs mb-2 uppercase tracking-wider">Carbohidratos (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.carbs || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, carbs: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-carbs focus:ring-4 focus:ring-indigo-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-fat mb-2 uppercase tracking-wider">Grasa (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.fat || ''}
                                                onChange={(e) => setManualEntry({ ...manualEntry, fat: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-fat focus:ring-4 focus:ring-fuchsia-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* AI MODE */
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Describe tu plato</label>
                                        <textarea
                                            value={aiDescription}
                                            onChange={(e) => setAiDescription(e.target.value)}
                                            placeholder="Ej: Filete a la vilaroy con patatas y un poco de ensalada..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-50 min-h-[120px] resize-none placeholder:text-gray-400 transition-all font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">O sube una foto</label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                                        >
                                            {aiImage ? (
                                                <div className="relative w-full h-48 group-hover:scale-[1.02] transition-transform">
                                                    <img src={aiImage} alt="Preview" className="w-full h-full object-contain rounded-xl shadow-lg" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAiImage(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-red-50 text-gray-600 hover:text-red-500 transition-colors shadow-sm"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-purple-50 rounded-full mb-4 group-hover:scale-110 transition-transform text-purple-400">
                                                        <Icons.Sparkles size={32} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium">Clic para subir o tomar foto</p>
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
                                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
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
                                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
                                >
                                    <Icons.Plus size={24} />
                                    {entryMode === 'search' ? 'Añadir al Diario' : 'Registrar Comida'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {entryMode === 'scan' && (
                <BarcodeScanner
                    onClose={() => setEntryMode(null)}
                    onAddLog={onAddLog}
                    selectedDate={selectedDate}
                    onNavigateToManual={(code) => {
                        if (code) {
                            setManualEntry(prev => ({ ...prev, name: `Producto desconocido (${code})` }));
                        }
                        setEntryMode('manual');
                    }}
                    onNavigateToNewFood={onNavigateToLibrary}
                />
            )}
        </div>
    );
};

export default Dashboard;