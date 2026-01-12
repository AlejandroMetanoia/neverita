import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from './src/firebase';
import Login from './src/components/Login';
import { Icons } from './components/ui/Icons';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Stats from './components/Stats';
import { Food, LogEntry } from './types';
import { INITIAL_FOODS } from './constants';

type View = 'dashboard' | 'library' | 'stats' | 'profile';

function App() {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [currentView, setCurrentView] = useState<View>('dashboard');
   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

   // Persistent State
   const [foods, setFoods] = useState<Food[]>(() => {
      const saved = localStorage.getItem('macrotrack_foods');
      return saved ? JSON.parse(saved) : INITIAL_FOODS;
   });

   const [logs, setLogs] = useState<LogEntry[]>([]);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
         setUser(currentUser);
         setLoading(false);
      });
      return () => unsubscribe();
   }, []);

   // Listen for daily_logs from Firestore
   useEffect(() => {
      if (!user) {
         setLogs([]);
         return;
      }

      // For Dashboard: query only selected date
      // For Stats: query all logs for weekly calculations
      let q;
      if (currentView === 'dashboard') {
         q = query(
            collection(db, 'daily_logs'),
            where('userId', '==', user.uid),
            where('date', '==', selectedDate)
         );
      } else {
         q = query(collection(db, 'daily_logs'), where('userId', '==', user.uid));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
         const fetchedLogs: LogEntry[] = [];
         snapshot.forEach((doc) => {
            fetchedLogs.push(doc.data() as LogEntry);
         });
         setLogs(fetchedLogs);
      });

      return () => unsubscribe();
   }, [user, currentView, selectedDate]);

   useEffect(() => {
      localStorage.setItem('macrotrack_foods', JSON.stringify(foods));
   }, [foods]);

   // Handlers
   const addFood = (food: Food) => setFoods([...foods, food]);
   const deleteFood = (id: string) => setFoods(foods.filter(f => f.id !== id));

   const addLog = async (log: LogEntry) => {
      if (!user) return;
      try {
         // Add userId to the log entry before saving
         const logWithUser = { ...log, userId: user.uid };
         await setDoc(doc(db, 'daily_logs', log.id), logWithUser);
      } catch (error) {
         console.error("Error adding log:", error);
      }
   };

   const deleteLog = async (id: string) => {
      if (!user) return;
      try {
         await deleteDoc(doc(db, 'daily_logs', id));
      } catch (error) {
         console.error("Error deleting log:", error);
      }
   };

   if (loading) {
      return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>;
   }

   if (!user) {
      return (
         <div className="min-h-screen bg-background text-gray-100 flex flex-col items-center justify-center p-4">
            <Login user={null} />
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-background text-gray-100 flex flex-col md:flex-row">
         {/* Sidebar Navigation */}
         <aside className="fixed bottom-0 w-full md:w-20 md:h-screen md:static bg-surface/90 backdrop-blur-lg md:bg-surface border-t md:border-t-0 md:border-r border-surfaceHighlight z-40 flex md:flex-col justify-around md:justify-center items-center py-3 md:py-0 md:gap-8">
            <button
               onClick={() => setCurrentView('profile')}
               className="hidden md:flex absolute top-8 w-10 h-10 rounded-xl items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            >
               {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center text-black font-bold text-xl">
                     {user.displayName?.[0] || 'U'}
                  </div>
               )}
            </button>

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

            {/* Mobile Profile Link */}
            <button
               onClick={() => setCurrentView('profile')}
               className={`md:hidden p-3 rounded-xl transition-all ${currentView === 'profile' ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white hover:bg-surfaceHighlight'}`}
            >
               <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700">
                  {user.photoURL && <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />}
               </div>
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
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
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
            {currentView === 'profile' && (
               <div className="flex items-center justify-center h-full">
                  <Login user={user} />
               </div>
            )}
         </main>
      </div>
   );
}

export default App;