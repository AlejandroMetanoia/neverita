import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import OpenAI from "openai";
import { Food, LogEntry, MealType, UserGoals, Ingredient } from '../types';
import { MEAL_TYPES, MEAL_COLORS } from '../constants';
import { Icons } from './ui/Icons';
import { HelpModal } from './ui/HelpModal';
import BarcodeScanner from './BarcodeScanner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useHybridPrediction } from '../src/hooks/useHybridPrediction';

interface DashboardProps {
    isGuest: boolean;
    foods: Food[];
    logs: LogEntry[];
    onAddLog: (entry: LogEntry) => void;
    onDeleteLog: (id: string) => void;
    selectedDate: string;
    onDateChange: (date: string) => void;
    onNavigateToLibrary: () => void;
    onToggleMenu: (hidden: boolean) => void;
    goals: UserGoals | null;
}

const Dashboard: React.FC<DashboardProps> = ({ isGuest, foods, logs, onAddLog, onDeleteLog, selectedDate, onDateChange, onNavigateToLibrary, onToggleMenu, goals }) => {
    const [entryMode, setEntryMode] = useState<'search' | 'scan' | 'manual' | 'ai' | 'subscription_teaser' | 'subscription_details' | null>(null);
    const [showHelp, setShowHelp] = useState(false);

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
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [grams, setGrams] = useState<string | number>(100);
    const [mealType, setMealType] = useState<MealType>('Desayuno');
    const [foodSearch, setFoodSearch] = useState('');


    // Manual Entry State
    const [manualEntry, setManualEntry] = useState<{
        calories: string | number;
        protein: string | number;
        carbs: string | number;
        fat: string | number;
        name: string;
    }>({
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        name: ''
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
        { name: 'Carbs', value: totals.carbs, color: COLORS[1] },
        { name: 'Grasas', value: totals.fat, color: COLORS[2] },
    ];

    // Calculator Logic
    const selectedFood = foods.find(f => f.id === selectedFoodId);
    const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);

    const calculatedMacros = useMemo(() => {
        if (!selectedFood) return null;

        // If it's a recipe and we have ingredients loaded
        if (selectedFood.ingredients && recipeIngredients.length > 0) {
            return recipeIngredients.reduce((acc, ing) => {
                const ratio = ing.quantity / 100;
                return {
                    calories: Math.round(acc.calories + (ing.calories * ratio)),
                    protein: Number((acc.protein + (ing.protein * ratio)).toFixed(1)),
                    carbs: Number((acc.carbs + (ing.carbs * ratio)).toFixed(1)),
                    fat: Number((acc.fat + (ing.fat * ratio)).toFixed(1)),
                };
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        }

        // Standard Food
        const ratio = (Number(grams) || 0) / 100;
        return {
            calories: Math.round(selectedFood.calories * ratio),
            protein: Number((selectedFood.protein * ratio).toFixed(1)),
            carbs: Number((selectedFood.carbs * ratio).toFixed(1)),
            fat: Number((selectedFood.fat * ratio).toFixed(1)),
        };
    }, [selectedFood, grams, recipeIngredients]);

    // Prediction Hook
    const { prediction, dismiss: dismissPrediction } = useHybridPrediction(dailyLogs);

    const handleAddPrediction = () => {
        if (!prediction) return;

        onAddLog({
            id: Date.now().toString(),
            date: selectedDate,
            foodId: prediction.foodId,
            foodName: prediction.foodName,
            meal: prediction.meal,
            grams: prediction.grams,
            calculated: prediction.calculated
        });

        dismissPrediction();
    };

    // Update ingredients when a recipe is selected
    useEffect(() => {
        if (selectedFood && selectedFood.ingredients) {
            // Deep copy to allow editing without affecting original until saved (though here we just log)
            setRecipeIngredients(JSON.parse(JSON.stringify(selectedFood.ingredients)));
        } else {
            setRecipeIngredients([]);
        }
    }, [selectedFoodId, foods]); // foods dependency in case it updates

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();

        let newLog: LogEntry;

        if (entryMode === 'search') {
            if (!selectedFood || !calculatedMacros) return;

            const isRecipe = selectedFood.ingredients && selectedFood.ingredients.length > 0;
            const hasModifiedIngredients = isRecipe && JSON.stringify(selectedFood.ingredients) !== JSON.stringify(recipeIngredients);

            if (isRecipe && hasModifiedIngredients) {
                // Add each ingredient as a separate log
                recipeIngredients.forEach(ing => {
                    const ratio = ing.quantity / 100;
                    const ingCalculated = {
                        calories: Math.round(ing.calories * ratio),
                        protein: Number((ing.protein * ratio).toFixed(1)),
                        carbs: Number((ing.carbs * ratio).toFixed(1)),
                        fat: Number((ing.fat * ratio).toFixed(1)),
                    };

                    onAddLog({
                        id: Date.now().toString() + Math.random().toString().slice(2, 6), // unique id
                        date: selectedDate,
                        foodId: ing.foodId || `ing-${Date.now()}-${Math.random()}`, // Use link or gen new
                        foodName: ing.name,
                        meal: mealType,
                        grams: ing.quantity,
                        calculated: ingCalculated
                    });
                });
                // We're done, skip the single log addition below
                setEntryMode(null);
                setGrams(100);
                setFoodSearch('');
                setRecipeIngredients([]);
                return;
            }

            // Valid for Standard Food OR Unmodified Recipe
            newLog = {
                id: Date.now().toString(),
                date: selectedDate,
                foodId: selectedFood.id,
                foodName: selectedFood.name,
                meal: mealType,
                grams: isRecipe ? 100 : (Number(grams) || 0), // Recipes logs are 1 unit (100g context usually) if unmodified
                calculated: {
                    calories: Math.round(calculatedMacros.calories),
                    protein: Number(calculatedMacros.protein.toFixed(1)),
                    carbs: Number(calculatedMacros.carbs.toFixed(1)),
                    fat: Number(calculatedMacros.fat.toFixed(1)),
                }
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
                    calories: Number(manualEntry.calories) || 0,
                    protein: Number(manualEntry.protein) || 0,
                    carbs: Number(manualEntry.carbs) || 0,
                    fat: Number(manualEntry.fat) || 0
                }
            };
        }

        onAddLog(newLog);
        setEntryMode(null);
        // Reset minimal state
        setGrams(100);
        setFoodSearch('');
        setRecipeIngredients([]);
        setManualEntry({ calories: '', protein: '', carbs: '', fat: '', name: '' });
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
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                alert("API Key not found (VITE_OPENAI_API_KEY)");
                setIsAnalyzing(false);
                return;
            }

            const openai = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true // Required for client-side usage
            });

            // Construct content array. Always text, optionally image.
            const content: any[] = [
                {
                    type: "text",
                    text: `Act as a Senior Digital Nutritionist. Your goal is to provide the most accurate macro estimation possible based on a text description or image.

CONTEXT:
The user says: "${aiDescription}"

INSTRUCTIONS:
1. If the quantity is missing, assume a standard adult restaurant portion.
2. If the cooking method is missing, assume the most common one (e.g., "chicken" -> grilled, "potatoes" -> boiled/roasted unless specified).
3. Calculate the TOTAL macros for the entire description provided, not just per 100g.
4. If the input is extremely vague, prioritize conservative, realistic estimates.

OUTPUT FORMAT:
Return ONLY a raw JSON object. 
{
  "kcal": 0, 
  "proteinas": 0, 
  "carbohidratos": 0, 
  "grasas": 0,
  "gramos_totales_estimados": 0,
  "inferencias": "Brief list of assumptions made (e.g., 'Assumed 200g chicken, 150g potatoes, grilled')"
}`
                }
            ];

            if (aiImage) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: aiImage,
                        detail: "low" // 'low' is cheaper and usually sufficient for food
                    }
                });
            }

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: content
                    }
                ],
                max_tokens: 150,
            });

            const text = response.choices[0].message.content || "{}";

            // Cleanup
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            setManualEntry({
                name: aiDescription || 'Plato analizado',
                calories: data.kcal || '',
                protein: data.proteinas || '',
                carbs: data.carbohidratos || '',
                fat: data.grasas || ''
            });
            setEntryMode('manual');

            // Reset AI state
            setAiDescription('');
            setAiImage(null);

        } catch (error) {
            console.error("Error analyzing food:", error);
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            alert(`Error al analizar: ${errorMessage}`);
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-1">
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight drop-shadow-sm">Registro Diario</h2>
                        <button
                            onClick={() => setShowHelp(true)}
                            className="text-gray-800 hover:text-black transition-colors mt-1"
                        >
                            <Icons.Help size={18} />
                        </button>
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Resumen y seguimiento nutricional</p>
                </div>
                <div className="relative group">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                        className="relative z-10 bg-white/50 backdrop-blur-md text-gray-800 border border-white/40 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-stone-400 appearance-none text-right transition-all [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer w-full"
                    />
                    <Icons.Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-20" />
                </div>
            </div>

            {/* Help Modal */}
            <HelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Guía del Registro Diario"
            >
                <div className="space-y-4">
                    <p>Bienvenido a tu panel principal. Aquí podrás llevar un control detallado de tu día a día:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Resumen de Macros:</strong> Visualiza tus calorías, proteínas, carbohidratos y grasas consumidas hoy.</li>
                        <li><strong>Añadir Comidas:</strong> Usa los botones de acceso rápido para escanear, buscar o usar nuestra IA.</li>
                        <li><strong>Historial:</strong> Revisa y edita las comidas que has registrado a lo largo del día.</li>
                        <li><strong>Navegación por Fecha:</strong> Usa el calendario superior para ver registros de días anteriores.</li>
                    </ul>
                </div>
            </HelpModal>

            {/* Refactored Stats Grid - Consolidated for Desktop */}
            <div className="mb-4">
                <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center gap-6">

                    {/* Left Section: Calories & Chart */}
                    <div className="flex-1 flex justify-between items-center relative z-10">
                        <div className="flex flex-col">
                            <p className="text-gray-600 font-bold mb-1 ml-1 text-sm">Calorías Consumidas</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-black text-gray-800 tracking-tighter leading-none">{Math.round(totals.calories)}</span>
                                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    <span className="hidden md:inline">Kcal</span>
                                    {goals && <span className="text-gray-400 text-xs ml-1">/{goals.kcalObjetivo}</span>}
                                </span>
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
                    <div className="flex-1 grid grid-cols-3 gap-4 md:gap-8">
                        {/* Protein */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-white ring-1 ring-black/5" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Proteína</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.protein)}{!goals && <span className="text-xs text-gray-400 font-bold ml-0.5">g</span>}</p>
                                {goals && <p className="text-xs md:text-sm text-gray-400 font-bold">/{Math.round(goals.kcalObjetivo * goals.macrosPct.proteinas / 100 / 4)}g</p>}
                            </div>
                        </div>

                        {/* Carbs */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-stone-400" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Carbs</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.carbs)}{!goals && <span className="text-xs text-gray-400 font-bold ml-0.5">g</span>}</p>
                                {goals && <p className="text-xs md:text-sm text-gray-400 font-bold">/{Math.round(goals.kcalObjetivo * goals.macrosPct.carbohidratos / 100 / 4)}g</p>}
                            </div>
                        </div>

                        {/* Fat */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-stone-500" />
                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Grasas</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl md:text-4xl font-black text-gray-800">{Math.round(totals.fat)}{!goals && <span className="text-xs text-gray-400 font-bold ml-0.5">g</span>}</p>
                                {goals && <p className="text-xs md:text-sm text-gray-400 font-bold">/{Math.round(goals.kcalObjetivo * goals.macrosPct.grasas / 100 / 9)}g</p>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Predictive One-Tap Log */}
            {prediction && (
                <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-gradient-to-r from-stone-500 to-stone-700 rounded-3xl p-1 shadow-lg shadow-stone-200">
                        <div className="bg-white/95 backdrop-blur-sm rounded-[20px] p-5 relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div>
                                    <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.Sparkles size={14} />
                                        ¿Lo de siempre?
                                    </h3>
                                    <p className="text-gray-500 text-xs mt-1 font-medium">Basado en tus hábitos de {prediction.meal?.toLowerCase()}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 relative z-10">
                                <div>
                                    <p className="text-xl font-bold text-gray-800 leading-tight">{prediction.foodName}</p>
                                    <div className="flex gap-3 text-xs text-gray-500 font-mono mt-1">
                                        <span>{prediction.grams}g</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{prediction.calculated.calories} kcal</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <button
                                        onClick={dismissPrediction}
                                        className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-wider py-1 px-2"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        onClick={handleAddPrediction}
                                        className="bg-stone-700 hover:bg-stone-800 text-white p-3 rounded-2xl shadow-stone-200 shadow-md transition-all active:scale-95 flex items-center gap-2 font-bold text-sm"
                                    >
                                        <Icons.Check size={20} />
                                        <span className="hidden sm:inline">Añadir</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <button
                    onClick={() => setEntryMode('scan')} // Unlocked for all users (Guests & Registered)
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
                    onClick={() => setEntryMode(isGuest ? 'subscription_teaser' : 'ai')}
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

            {/* Modal - Ethereal Light - Portaled to body for full screen cover */}
            {entryMode && entryMode !== 'scan' && createPortal(
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-xl rounded-[2rem] border border-white/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                {entryMode === 'search' && <Icons.Search className="text-gray-800" />}
                                {entryMode === 'manual' && <Icons.Plus className="text-gray-800" />}
                                {entryMode === 'ai' && <Icons.Sparkles className="text-gray-800" />}
                                {entryMode === 'subscription_teaser' && <Icons.Lock className="text-gray-800" />}
                                {entryMode === 'subscription_details' && <Icons.Star className="text-gray-800" />}

                                {entryMode === 'search' ? 'Calculadora' :
                                    entryMode === 'manual' ? 'Registro Manual' :
                                        entryMode === 'ai' ? 'Asistente Nutricional' :
                                            entryMode === 'subscription_teaser' ? 'Función Premium' : 'Ventajas Premium'}
                            </h3>
                            <button onClick={() => setEntryMode(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"><Icons.Plus className="rotate-45" size={20} /></button>
                        </div>

                        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {/* SUBSCRIPTION TEASER */}
                            {entryMode === 'subscription_teaser' && (
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icons.Sparkles size={40} className="text-stone-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800">Desbloquea el Asistente IA</h4>
                                    <p className="text-gray-600">
                                        Para disfrutar del Asistente IA, debes suscribirte. El precio es de <strong>0,99 € al mes</strong>, sin permanencia; cancela cuando quieras.
                                    </p>
                                    <p className="text-gray-600">
                                        Además de esta función, podrás disfrutar de la aplicación completa y guardar tus datos en la nube.
                                    </p>
                                    <button
                                        onClick={() => setEntryMode('subscription_details')}
                                        className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-lg text-lg"
                                    >
                                        Saber más
                                    </button>
                                </div>
                            )}

                            {/* SUBSCRIPTION DETAILS */}
                            {entryMode === 'subscription_details' && (
                                <div className="space-y-6">
                                    <p className="text-gray-600 text-center font-medium">Al registrarte obtendrás:</p>
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3">
                                            <div className="p-1 bg-green-100 rounded-full text-green-600 mt-0.5"><Icons.Check size={14} /></div>
                                            <span className="text-gray-700"><strong>Asistente IA sin límites:</strong> Olvídate de buscar ingredientes uno a uno. Haz una foto o describe tu plato y deja que la IA calcule los macros por ti en segundos.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="p-1 bg-green-100 rounded-full text-green-600 mt-0.5"><Icons.Check size={14} /></div>
                                            <span className="text-gray-700"><strong>Tu Nevera Personalizada:</strong> Crea tus propias recetas y añade alimentos a tu base de datos. Diseña una biblioteca a tu medida para registrar tus comidas en un solo clic.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="p-1 bg-green-100 rounded-full text-green-600 mt-0.5"><Icons.Check size={14} /></div>
                                            <span className="text-gray-700"><strong>Historial y Nube:</strong> No pierdas ni un gramo de progreso. Sincroniza tus datos entre dispositivos y accede a tu evolución histórica siempre que lo necesites.</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="p-1 bg-green-100 rounded-full text-green-600 mt-0.5"><Icons.Check size={14} /></div>
                                            <span className="text-gray-700"><strong>Soporte e Impulso:</strong> Recibe atención prioritaria y ayuda a que Neverita siga creciendo. Tu suscripción financia la mejora continua de la inteligencia de la app.</span>
                                        </li>
                                    </ul>
                                    <div className="pt-4 border-t border-gray-100 text-center">
                                        <p className="text-sm text-gray-500 mb-4">Solo 0,99 € / mes. Cancela cuando quieras.</p>
                                        <button
                                            onClick={() => setEntryMode('subscription_teaser')} // Temporary back loop or login trigger
                                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2"
                                        >
                                            <Icons.Star size={20} className="text-yellow-400" />
                                            Registrarme Ahora
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Content remains mostly the same, just styled inputs */}
                            {entryMode === 'search' && (
                                <>
                                    {/* Food Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">1. Buscar Alimento</label>
                                        <div className="relative group">
                                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-800 transition-colors" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Ej. Filetes de pollo..."
                                                value={foodSearch}
                                                onChange={(e) => {
                                                    setFoodSearch(e.target.value);
                                                    setSelectedFoodId(''); // Reset selection on search
                                                }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all placeholder:text-gray-400 font-medium"
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Grams Input OR Ingredients List */}
                                        <div>
                                            {selectedFood?.ingredients ? (
                                                <>
                                                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">2. Ajustar Ingredientes</label>
                                                    <div className="space-y-3 max-h-none md:max-h-60 overflow-y-visible md:overflow-y-auto pr-1 custom-scrollbar">
                                                        {recipeIngredients.map((ing, index) => (
                                                            <div key={index} className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mobile-ingredient-item">
                                                                <span className="text-sm font-medium text-gray-700 truncate mb-2 md:mb-0 md:flex-1 md:mr-2">{ing.name}</span>
                                                                <div className="relative w-full md:w-24">
                                                                    <input
                                                                        type="number"
                                                                        value={ing.quantity}
                                                                        onChange={(e) => {
                                                                            const newQty = Number(e.target.value) || 0;
                                                                            const newIngs = [...recipeIngredients];
                                                                            newIngs[index].quantity = newQty;
                                                                            setRecipeIngredients(newIngs);
                                                                        }}
                                                                        className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-3 pr-6 text-right text-sm font-bold focus:outline-none focus:border-stone-300"
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">g</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">2. Cantidad (g)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={grams}
                                                            onChange={(e) => setGrams(e.target.value)}
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all font-mono text-lg font-bold"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">g</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {/* Meal Select */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">3. Comida</label>
                                            <div className="relative">
                                                <select
                                                    value={mealType}
                                                    onChange={(e) => setMealType(e.target.value as MealType)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 appearance-none transition-all cursor-pointer font-medium"
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
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Carbs</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-fat">{calculatedMacros.fat}g</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Grasa</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {entryMode === 'manual' && (
                                /* MANUAL MODE */
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre del plato</label>
                                        <input
                                            type="text"
                                            value={manualEntry.name}
                                            onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 transition-all font-medium"
                                            placeholder="-"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Calorías Total</label>
                                            <input
                                                type="number"
                                                value={manualEntry.calories}
                                                onChange={(e) => setManualEntry({ ...manualEntry, calories: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 font-mono text-lg font-bold"
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
                                                value={manualEntry.protein}
                                                onChange={(e) => setManualEntry({ ...manualEntry, protein: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-protein focus:ring-4 focus:ring-sky-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-carbs mb-2 uppercase tracking-wider">Carbs (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.carbs}
                                                onChange={(e) => setManualEntry({ ...manualEntry, carbs: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-carbs focus:ring-4 focus:ring-indigo-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-fat mb-2 uppercase tracking-wider">Grasa (g)</label>
                                            <input
                                                type="number"
                                                value={manualEntry.fat}
                                                onChange={(e) => setManualEntry({ ...manualEntry, fat: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-fat focus:ring-4 focus:ring-fuchsia-50 font-mono font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {entryMode === 'ai' && (
                                /* AI MODE */
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Describe tu plato</label>
                                        <textarea
                                            value={aiDescription}
                                            onChange={(e) => setAiDescription(e.target.value)}
                                            placeholder="Ej. Solomillo de ternera a la brasa (tamaño palma de mano), con salsa a la pimienta y 1/4 de plato de patatas fritas."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-stone-100 min-h-[100px] resize-none placeholder:text-gray-400 placeholder:text-sm placeholder:leading-tight transition-all font-medium"
                                        />
                                        <p className="text-xs text-gray-400 mt-2 italic">
                                            Sugerencia: Detalla el cocinado (si se conoce), salsas y guarnición para maximizar la precisión del análisis.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">O sube una foto</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 transition-all group">
                                            {aiImage ? (
                                                <div className="relative w-full h-40 group-hover:scale-[1.02] transition-transform">
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
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-sm text-gray-500 font-medium text-center mb-1">Elige una opción</p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors flex flex-col items-center gap-2 group/btn"
                                                        >
                                                            <div className="p-2 bg-white rounded-full shadow-sm text-gray-600 group-hover/btn:text-gray-900 group-hover/btn:scale-110 transition-all">
                                                                <Icons.Image size={24} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-600">Galería</span>
                                                        </button>

                                                        <button
                                                            onClick={() => cameraInputRef.current?.click()}
                                                            className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors flex flex-col items-center gap-2 group/btn"
                                                        >
                                                            <div className="p-2 bg-white rounded-full shadow-sm text-gray-600 group-hover/btn:text-gray-900 group-hover/btn:scale-110 transition-all">
                                                                <Icons.Camera size={24} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-600">Cámara</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Gallery Input - No Capture */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                            {/* Camera Input - Force Environment Capture */}
                                            <input
                                                type="file"
                                                ref={cameraInputRef}
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
                                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
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
                            ) : (entryMode === 'search' || entryMode === 'manual') ? (
                                <button
                                    onClick={handleAddLog}
                                    disabled={entryMode === 'search' && !selectedFood}
                                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
                                >
                                    <Icons.Plus size={24} />
                                    {entryMode === 'search' ? 'Añadir al Diario' : 'Registrar Comida'}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>,
                document.body
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