import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogEntry, UserGoals } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Icons } from './ui/Icons';
import { HelpModal } from './ui/HelpModal';

interface StatsProps {
    logs: LogEntry[];
    goals: UserGoals | null;
    onUpdateGoals: (goals: UserGoals) => Promise<void>;
}

const Stats: React.FC<StatsProps> = ({ logs, goals, onUpdateGoals }) => {
    const [showHelp, setShowHelp] = useState(false);
    const [showGoalsModal, setShowGoalsModal] = useState(false);

    // Goal Editing State
    const [targetKcal, setTargetKcal] = useState(2000);
    const [targetMacros, setTargetMacros] = useState({ proteinas: 30, carbohidratos: 40, grasas: 30 });

    // Initialize state when modal opens
    useEffect(() => {
        if (showGoalsModal) {
            if (goals) {
                setTargetKcal(goals.kcalObjetivo);
                setTargetMacros(goals.macrosPct);
            } else {
                setTargetKcal(2000);
                setTargetMacros({ proteinas: 30, carbohidratos: 40, grasas: 30 });
            }
        }
    }, [showGoalsModal, goals]);

    const totalPct = targetMacros.proteinas + targetMacros.carbohidratos + targetMacros.grasas;
    const isValid = totalPct === 100;

    const handleSave = async () => {
        if (!isValid) return;
        await onUpdateGoals({
            kcalObjetivo: targetKcal,
            macrosPct: targetMacros,
            updatedAt: new Date().toISOString()
        });
        setShowGoalsModal(false);
    };

    const calcGrams = (pct: number, factor: number) => Math.round((targetKcal * (pct / 100)) / factor);

    const weeklyData = useMemo(() => {
        const data: Record<string, { date: string; calories: number; protein: number; carbs: number; fat: number; hasRecord: boolean }> = {};

        // Get current week's Monday
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysFromMonday);
        monday.setHours(0, 0, 0, 0);

        // Generate Monday through Sunday (7 days)
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, '0'),
                String(d.getDate()).padStart(2, '0')
            ].join('-');
            // Short format for label "Lun", "Mar", etc.
            const label = d.toLocaleDateString('es-ES', { weekday: 'short' });

            data[dateStr] = {
                date: label.charAt(0).toUpperCase() + label.slice(1),
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                hasRecord: false
            };
        }

        logs.forEach(log => {
            if (data[log.date]) {
                data[log.date].calories += log.calculated.calories;
                data[log.date].protein += log.calculated.protein;
                data[log.date].carbs += log.calculated.carbs;
                data[log.date].fat += log.calculated.fat;
                data[log.date].hasRecord = true;
            }
        });

        return Object.values(data);
    }, [logs]);

    const averages = useMemo(() => {
        const daysWithRecords = weeklyData.filter(day => day.hasRecord);
        const totalDays = daysWithRecords.length || 1; // Prevent division by zero

        const sums = daysWithRecords.reduce((acc, curr) => ({
            calories: acc.calories + curr.calories,
            protein: acc.protein + curr.protein,
            carbs: acc.carbs + curr.carbs,
            fat: acc.fat + curr.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return {
            calories: Math.round(sums.calories / totalDays),
            protein: Math.round(sums.protein / totalDays),
            carbs: Math.round(sums.carbs / totalDays),
            fat: Math.round(sums.fat / totalDays),
        }
    }, [weeklyData]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-1">
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Registro Semanal</h2>
                        <button
                            onClick={() => setShowHelp(true)}
                            className="text-gray-800 hover:text-black transition-colors mt-1"
                        >
                            <Icons.Help size={18} />
                        </button>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Resumen y tendencias de los últimos 7 días</p>
                </div>
                <button
                    onClick={() => setShowGoalsModal(true)}
                    className="group flex items-center gap-2 bg-gradient-to-r from-stone-700 to-stone-800 text-white pl-4 pr-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                    <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Icons.Edit2 size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-sm">Editar Objetivos</span>
                </button>
            </div>

            <HelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Estadísticas Semanales"
            >
                <div className="space-y-4">
                    <p>Analiza tu progreso y tendencias a medio plazo:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Medias Diarias:</strong> Tarjetas superiores que muestran tus promedios de la última semana.</li>
                        <li><strong>Tendencia Calórica:</strong> Gráfico de barras para ver la fluctuación de tu consumo día a día.</li>
                        <li><strong>Tabla Detallada:</strong> Desglose numérico exacto de cada día de la semana actual.</li>
                    </ul>
                </div>
            </HelpModal>

            {/* Averages Cards - Ethereal Light */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-gray-200 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Calorías Media</p>
                    <div className="flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
                        <p className="text-3xl font-black text-gray-800">{averages.calories}</p>
                        {goals && <p className="text-xs font-bold text-gray-400">/{goals.kcalObjetivo}</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">kcal/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-300 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Proteína Media</p>
                    <div className="flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
                        <p className="text-3xl font-black text-stone-600">{averages.protein}g</p>
                        {goals && <p className="text-xs font-bold text-stone-400">/{Math.round(goals.kcalObjetivo * goals.macrosPct.proteinas / 100 / 4)}</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-400 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">Carbs Media</p>
                    <div className="flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
                        <p className="text-3xl font-black text-stone-700">{averages.carbs}g</p>
                        {goals && <p className="text-xs font-bold text-stone-400">/{Math.round(goals.kcalObjetivo * goals.macrosPct.carbohidratos / 100 / 4)}</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-500 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-600 text-xs font-bold uppercase tracking-wider mb-2">Grasas Media</p>
                    <div className="flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
                        <p className="text-3xl font-black text-stone-800">{averages.fat}g</p>
                        {goals && <p className="text-xs font-bold text-stone-400">/{Math.round(goals.kcalObjetivo * goals.macrosPct.grasas / 100 / 9)}</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Main Chart - LIGHT GLASS */}
                <div className="bg-white/50 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 h-[500px] shadow-glass relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-stone-100/50 blur-[80px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
                    <h3 className="text-xl font-bold text-gray-800 mb-6 relative z-10">Tendencia Calórica</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    cursor={{ fill: '#00000005' }}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', color: '#1f2937' }}
                                    itemStyle={{ color: '#1f2937' }}
                                />
                                <Bar
                                    dataKey="calories"
                                    fill="url(#colorGradient)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={32}
                                    animationDuration={1500}
                                />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#78716c" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#a8a29e" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Table - LIGHT GLASS */}
                <div className="bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/60 shadow-glass overflow-hidden h-[500px] flex flex-col">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex-shrink-0">Detalle Diario</h3>
                    <div className="-mx-4 px-4 h-full flex flex-col justify-center">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-2 md:px-6 py-4 rounded-tl-xl font-bold tracking-wider text-gray-500 text-center md:text-left">Día</th>
                                    <th className="px-2 md:px-6 py-4 font-bold tracking-wider text-gray-500 text-center md:text-left">Kcal</th>
                                    <th className="px-2 md:px-6 py-4 font-bold tracking-wider text-gray-500 text-center md:text-left">Prot</th>
                                    <th className="px-2 md:px-6 py-4 font-bold tracking-wider text-gray-500 text-center md:text-left">Carb</th>
                                    <th className="px-2 md:px-6 py-4 rounded-tr-xl font-bold tracking-wider text-gray-500 text-center md:text-left">Grasa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/50">
                                {weeklyData.map((day, idx) => (
                                    <tr key={idx} className="hover:bg-white/40 transition-colors">
                                        <td className="px-2 md:px-6 py-4 md:py-3 font-bold text-gray-800 text-xs md:text-sm text-center md:text-left">{day.date}</td>
                                        <td className="px-2 md:px-6 py-4 md:py-3 font-bold text-gray-700 text-xs md:text-sm text-center md:text-left">{Math.round(day.calories)}</td>
                                        <td className="px-2 md:px-6 py-4 md:py-3 text-gray-600 font-medium text-xs md:text-sm text-center md:text-left">{Math.round(day.protein)}<span className="md:hidden"></span><span className="hidden md:inline">g</span></td>
                                        <td className="px-2 md:px-6 py-4 md:py-3 text-gray-500 font-medium text-xs md:text-sm text-center md:text-left">{Math.round(day.carbs)}<span className="md:hidden"></span><span className="hidden md:inline">g</span></td>
                                        <td className="px-2 md:px-6 py-4 md:py-3 text-gray-400 font-medium text-xs md:text-sm text-center md:text-left">{Math.round(day.fat)}<span className="md:hidden"></span><span className="hidden md:inline">g</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Goals Modal */}
            {showGoalsModal && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 md:p-8 pb-2 md:pb-4 flex-shrink-0">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center justify-between">
                                Preferencias Nutricionales
                                <button
                                    onClick={() => setShowGoalsModal(false)}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <Icons.Plus className="rotate-45" size={24} />
                                </button>
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">Ajusta tus objetivos diarios</p>
                        </div>

                        <div className="p-5 md:p-8 pt-2 md:pt-4 space-y-4 md:space-y-8 overflow-y-auto custom-scrollbar">
                            {/* Calories Input */}
                            <div>
                                <label className="flex items-center justify-between text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">
                                    Objetivo Calórico
                                    <span className="text-xs font-normal normal-case bg-stone-100 px-2 py-1 rounded-full text-stone-500">Todo se calcula en base a esto</span>
                                </label>
                                <div className="relative group">
                                    <Icons.Calories className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-stone-600 transition-colors" size={20} />
                                    <input
                                        type="number"
                                        value={targetKcal}
                                        onChange={(e) => setTargetKcal(Number(e.target.value))}
                                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-4 text-3xl font-black text-gray-800 focus:outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-100 transition-all text-center"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">Kcal</span>
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="space-y-4 md:space-y-6">
                                {/* Protein */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-sm font-bold text-protein uppercase tracking-wider">Proteína</label>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-800">{calcGrams(targetMacros.proteinas, 4)}g</span>
                                            <span className="text-sm text-gray-400 ml-1">({targetMacros.proteinas}%)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={targetMacros.proteinas}
                                        onChange={(e) => setTargetMacros({ ...targetMacros, proteinas: Number(e.target.value) })}
                                        className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-protein [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md transition-all hover:[&::-webkit-slider-thumb]:scale-110"
                                    />
                                </div>

                                {/* Carbs */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-sm font-bold text-carbs uppercase tracking-wider">Carbohidratos</label>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-800">{calcGrams(targetMacros.carbohidratos, 4)}g</span>
                                            <span className="text-sm text-gray-400 ml-1">({targetMacros.carbohidratos}%)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={targetMacros.carbohidratos}
                                        onChange={(e) => setTargetMacros({ ...targetMacros, carbohidratos: Number(e.target.value) })}
                                        className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-carbs [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md transition-all hover:[&::-webkit-slider-thumb]:scale-110"
                                    />
                                </div>

                                {/* Fat */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-sm font-bold text-fat uppercase tracking-wider">Grasas</label>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-800">{calcGrams(targetMacros.grasas, 9)}g</span>
                                            <span className="text-sm text-gray-400 ml-1">({targetMacros.grasas}%)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={targetMacros.grasas}
                                        onChange={(e) => setTargetMacros({ ...targetMacros, grasas: Number(e.target.value) })}
                                        className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fat [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md transition-all hover:[&::-webkit-slider-thumb]:scale-110"
                                    />
                                </div>
                            </div>

                            {/* Total Validation */}
                            <div className={`p-4 rounded-xl flex items-center justify-between border ${!isValid ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                <span className="font-bold text-sm">Total Porcentaje</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black">{totalPct}%</span>
                                    <span className="text-xs opacity-70">/ 100%</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleSave}
                                disabled={!isValid}
                                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${!isValid ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-xl hover:scale-[1.02]'}`}
                            >
                                <Icons.Check size={20} />
                                Guardar Objetivos
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Stats;