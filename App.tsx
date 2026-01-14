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
   const [userFoods, setUserFoods] = useState<Food[]>([]);
   const foods = [...INITIAL_FOODS, ...userFoods]; // Combine static and user foods

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

   // Listen for user_foods from Firestore
   useEffect(() => {
      if (!user) {
         setUserFoods([]);
         return;
      }

      const q = query(collection(db, 'user_foods'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
         const fetchedFoods: Food[] = [];
         snapshot.forEach((doc) => {
            fetchedFoods.push(doc.data() as Food);
         });
         setUserFoods(fetchedFoods);
      });

      return () => unsubscribe();
   }, [user]);

   // Handlers
   const addFood = async (food: Food) => {
      if (!user) return;
      try {
         const foodWithUser = { ...food, userId: user.uid };
         await setDoc(doc(db, 'user_foods', food.id), foodWithUser);
      } catch (error) {
         console.error("Error adding food:", error);
      }
   };

   const deleteFood = async (id: string) => {
      if (!user) return;
      // Only allow deleting user-created foods
      const foodToDelete = foods.find(f => f.id === id);
      if (!foodToDelete?.userId) {
         console.warn("Cannot delete static food");
         return;
      }
      try {
         await deleteDoc(doc(db, 'user_foods', id));
      } catch (error) {
         console.error("Error deleting food:", error);
      }
   };

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
      <div className="min-h-screen text-gray-100 flex flex-col md:flex-row relative overflow-hidden">
         {/* Background Elements for depth */}
         <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
         <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

         {/* Sidebar Navigation */}
         <aside className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:translate-x-0 md:left-0 md:bottom-0 md:w-24 md:h-screen md:static bg-black/20 backdrop-blur-xl border border-white/10 rounded-full md:rounded-none z-50 flex md:flex-col justify-around md:justify-center items-center py-4 md:py-0 md:gap-10 shadow-glass">
            <button
               onClick={() => setCurrentView('profile')}
               className="hidden md:flex absolute top-10 w-12 h-12 rounded-2xl items-center justify-center overflow-hidden ring-1 ring-white/10 hover:ring-primary/50 transition-all shadow-lg"
            >
               {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl">
                     {user.displayName?.[0] || 'U'}
                  </div>
               )}
            </button>

            <button
               onClick={() => setCurrentView('dashboard')}
               className={`p-3.5 rounded-2xl transition-all duration-300 group relative ${currentView === 'dashboard' ? 'text-white bg-white/10 shadow-neon' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
               <Icons.Utensils size={26} className="relative z-10" />
               {currentView === 'dashboard' && <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />}
            </button>

            <button
               onClick={() => setCurrentView('library')}
               className={`p-3.5 rounded-2xl transition-all duration-300 group relative ${currentView === 'library' ? 'text-white bg-white/10 shadow-neon' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
               <Icons.Fridge size={26} className="relative z-10" />
               {currentView === 'library' && <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />}
            </button>

            <button
               onClick={() => setCurrentView('stats')}
               className={`p-3.5 rounded-2xl transition-all duration-300 group relative ${currentView === 'stats' ? 'text-white bg-white/10 shadow-neon' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
               <Icons.Stats size={26} className="relative z-10" />
               {currentView === 'stats' && <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />}
            </button>

            {/* Mobile Profile Link */}
            <button
               onClick={() => setCurrentView('profile')}
               className={`md:hidden p-3 rounded-full transition-all ${currentView === 'profile' ? 'ring-2 ring-primary shadow-neon' : 'opacity-70'}`}
            >
               <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 ring-1 ring-white/20">
                  {user.photoURL && <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />}
               </div>
            </button>
         </aside>

         {/* Main Content Area */}
         <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10 relative z-0">
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
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">
                     <Login user={user} />
                  </div>
               </div>
            )}
         </main>
      </div>
   );
}

export default App;