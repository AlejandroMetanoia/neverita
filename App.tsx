import React, { useState, useEffect } from 'react';
import { Icons } from './components/ui/Icons';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Stats from './components/Stats';
import { Food, LogEntry } from './types';
import { INITIAL_FOODS } from './constants';

type View = 'dashboard' | 'library' | 'stats';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Persistent State
  const [foods, setFoods] = useState<Food[]>(() => {
    const saved = localStorage.getItem('macrotrack_foods');
    return saved ? JSON.parse(saved) : INITIAL_FOODS;
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('macrotrack_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('macrotrack_foods', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    localStorage.setItem('macrotrack_logs', JSON.stringify(logs));
  }, [logs]);

  // Handlers
  const addFood = (food: Food) => setFoods([...foods, food]);
  const deleteFood = (id: string) => setFoods(foods.filter(f => f.id !== id));
  
  const addLog = (log: LogEntry) => setLogs([...logs, log]);
  const deleteLog = (id: string) => setLogs(logs.filter(l => l.id !== id));

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="fixed bottom-0 w-full md:w-20 md:h-screen md:static bg-surface/90 backdrop-blur-lg md:bg-surface border-t md:border-t-0 md:border-r border-surfaceHighlight z-40 flex md:flex-col justify-around md:justify-center items-center py-3 md:py-0 md:gap-8">
         <div className="hidden md:flex absolute top-8 w-10 h-10 bg-white rounded-xl items-center justify-center text-black font-bold text-xl mb-10">
            M
         </div>
         
         <button 
            onClick={() => setCurrentView('dashboard')}
            className={`p-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-surfaceHighlight'}`}
         >
            <Icons.Utensils size={24} />
         </button>
         
         <button 
            onClick={() => setCurrentView('library')}
            className={`p-3 rounded-xl transition-all ${currentView === 'library' ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-surfaceHighlight'}`}
         >
            <Icons.Fridge size={24} />
         </button>

         <button 
            onClick={() => setCurrentView('stats')}
            className={`p-3 rounded-xl transition-all ${currentView === 'stats' ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-surfaceHighlight'}`}
         >
            <Icons.Stats size={24} />
         </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
         {currentView === 'dashboard' && (
            <Dashboard 
               foods={foods} 
               logs={logs} 
               onAddLog={addLog} 
               onDeleteLog={deleteLog} 
            />
         )}
         {currentView === 'library' && (
            <Library 
               foods={foods} 
               onAddFood={addFood} 
               onDeleteFood={deleteFood} 
            />
         )}
         {currentView === 'stats' && (
            <Stats logs={logs} />
         )}
      </main>
    </div>
  );
}

export default App;