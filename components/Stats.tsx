import React, { useMemo, useState } from 'react';
import { LogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Icons } from './ui/Icons';
import { HelpModal } from './ui/HelpModal';

interface StatsProps {
    logs: LogEntry[];
}

const Stats: React.FC<StatsProps> = ({ logs }) => {
    const [showHelp, setShowHelp] = useState(false);

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
            <div className="flex flex-col">
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
                    <p className="text-3xl font-black text-gray-800 group-hover:scale-105 transition-transform origin-left">{averages.calories}</p>
                    <p className="text-xs text-gray-500 mt-1">kcal/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-300 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Proteína Media</p>
                    <p className="text-3xl font-black text-stone-600 group-hover:scale-105 transition-transform origin-left">{averages.protein}g</p>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-400 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">Carbs Media</p>
                    <p className="text-3xl font-black text-stone-700 group-hover:scale-105 transition-transform origin-left">{averages.carbs}g</p>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white/60 hover:border-stone-500 hover:bg-white/80 transition-all shadow-sm hover:shadow-md group">
                    <p className="text-stone-600 text-xs font-bold uppercase tracking-wider mb-2">Grasas Media</p>
                    <p className="text-3xl font-black text-stone-800 group-hover:scale-105 transition-transform origin-left">{averages.fat}g</p>
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
        </div>
    );
};

export default Stats;