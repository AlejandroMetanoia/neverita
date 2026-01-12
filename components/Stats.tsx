import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatsProps {
  logs: LogEntry[];
}

const Stats: React.FC<StatsProps> = ({ logs }) => {
  const weeklyData = useMemo(() => {
    const data: Record<string, { date: string; calories: number; protein: number; carbs: number; fat: number }> = {};
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // Short format for label "Mon 12"
        const label = d.toLocaleDateString('es-ES', { weekday: 'short' }); 
        
        data[dateStr] = {
            date: label.charAt(0).toUpperCase() + label.slice(1),
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
    }

    logs.forEach(log => {
        if (data[log.date]) {
            data[log.date].calories += log.calculated.calories;
            data[log.date].protein += log.calculated.protein;
            data[log.date].carbs += log.calculated.carbs;
            data[log.date].fat += log.calculated.fat;
        }
    });

    return Object.values(data);
  }, [logs]);

  const averages = useMemo(() => {
      const totalDays = weeklyData.length;
      const sums = weeklyData.reduce((acc, curr) => ({
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
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-white">Registro Semanal</h2>
          <p className="text-gray-400 text-sm">Resumen de los últimos 7 días</p>
        </div>

        {/* Averages Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight">
                <p className="text-gray-400 text-xs uppercase">Media Calórica</p>
                <p className="text-2xl font-bold text-white mt-1">{averages.calories}</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight">
                <p className="text-gray-400 text-xs uppercase">Media Proteína</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{averages.protein}g</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight">
                <p className="text-gray-400 text-xs uppercase">Media Carbs</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{averages.carbs}g</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight">
                <p className="text-gray-400 text-xs uppercase">Media Grasas</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{averages.fat}g</p>
            </div>
        </div>

        {/* Main Chart */}
        <div className="bg-surface p-6 rounded-2xl border border-surfaceHighlight h-80">
            <h3 className="text-lg font-bold text-white mb-4">Tendencia Calórica</h3>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1E2330', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                        cursor={{fill: '#334155', opacity: 0.2}}
                    />
                    <Bar dataKey="calories" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* Macro Stacked Chart could go here, keeping it simple for now */}
        <div className="bg-surface p-6 rounded-2xl border border-surfaceHighlight">
             <h3 className="text-lg font-bold text-white mb-4">Detalle Diario</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-400">
                     <thead className="text-xs text-gray-500 uppercase bg-surfaceHighlight/50">
                         <tr>
                             <th className="px-4 py-3 rounded-l-lg">Día</th>
                             <th className="px-4 py-3">Kcal</th>
                             <th className="px-4 py-3">Prot</th>
                             <th className="px-4 py-3">Carb</th>
                             <th className="px-4 py-3 rounded-r-lg">Grasa</th>
                         </tr>
                     </thead>
                     <tbody>
                         {weeklyData.map((day, idx) => (
                             <tr key={idx} className="border-b border-surfaceHighlight/30 hover:bg-surfaceHighlight/20 transition-colors">
                                 <td className="px-4 py-4 font-medium text-white">{day.date}</td>
                                 <td className="px-4 py-4">{Math.round(day.calories)}</td>
                                 <td className="px-4 py-4 text-emerald-400">{Math.round(day.protein)}g</td>
                                 <td className="px-4 py-4 text-orange-400">{Math.round(day.carbs)}g</td>
                                 <td className="px-4 py-4 text-cyan-400">{Math.round(day.fat)}g</td>
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