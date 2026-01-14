import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatsProps {
    logs: LogEntry[];
}

const Stats: React.FC<StatsProps> = ({ logs }) => {
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
    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Registro Semanal</h2>
                <p className="text-gray-400 text-sm font-medium">Resumen y tendencias de los últimos 7 días</p>
            </div>

            {/* Averages Cards - GLASS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-glass group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Calorías Media</p>
                    <p className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">{averages.calories}</p>
                    <p className="text-xs text-gray-500 mt-1">kcal/día</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all shadow-glass group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Proteína Media</p>
                    <p className="text-3xl font-black text-emerald-400 group-hover:scale-105 transition-transform origin-left">{averages.protein}g</p>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-all shadow-glass group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Carbs Media</p>
                    <p className="text-3xl font-black text-orange-400 group-hover:scale-105 transition-transform origin-left">{averages.carbs}g</p>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all shadow-glass group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Grasas Media</p>
                    <p className="text-3xl font-black text-cyan-400 group-hover:scale-105 transition-transform origin-left">{averages.fat}g</p>
                    <p className="text-xs text-gray-500 mt-1">g/día</p>
                </div>
            </div>

            {/* Main Chart - GLASS */}
            <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 h-96 shadow-glass relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <h3 className="text-xl font-bold text-white mb-6 relative z-10">Tendencia Calórica</h3>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
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
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
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
                                <stop offset="0%" stopColor="#e4e4e7" stopOpacity={1} />
                                <stop offset="100%" stopColor="#e4e4e7" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Table - GLASS */}
            <div className="bg-black/20 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-glass overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-6">Detalle Diario</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl font-bold tracking-wider">Día</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Kcal</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Prot</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Carb</th>
                                <th className="px-6 py-4 rounded-tr-xl font-bold tracking-wider">Grasa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {weeklyData.map((day, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-5 font-medium text-white">{day.date}</td>
                                    <td className="px-6 py-5 font-bold">{Math.round(day.calories)}</td>
                                    <td className="px-6 py-5 text-emerald-400 font-medium">{Math.round(day.protein)}g</td>
                                    <td className="px-6 py-5 text-orange-400 font-medium">{Math.round(day.carbs)}g</td>
                                    <td className="px-6 py-5 text-cyan-400 font-medium">{Math.round(day.fat)}g</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Stats;