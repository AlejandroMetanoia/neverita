import React, { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc, QuerySnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './src/firebase';
// Login component removed
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
   const [autoOpenAdd, setAutoOpenAdd] = useState(false);
   const [isMenuHidden, setIsMenuHidden] = useState(false);

   // Persistent State
   const [userFoods, setUserFoods] = useState<Food[]>([]);
   const [baseFoods, setBaseFoods] = useState<Food[]>([]);

   // Combine static, base, and user foods and sort alphabetically
   const foods = useMemo(() => {
      const allFoods = [...INITIAL_FOODS, ...baseFoods, ...userFoods];
      return allFoods.sort((a, b) => a.name.localeCompare(b.name));
   }, [baseFoods, userFoods]);

   const [logs, setLogs] = useState<LogEntry[]>([]);

   const [guestLogs, setGuestLogs] = useState<LogEntry[]>([]);

   const handleNavigateToLibraryAdd = () => {
      setCurrentView('library');
      setAutoOpenAdd(true);
   };

   const handleChangeView = (view: View) => {
      setCurrentView(view);
      setAutoOpenAdd(false);
   };

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

      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
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



   // Listen for base_foods from Firestore
   useEffect(() => {
      // Base foods are global
      const q = query(collection(db, 'base_foods'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
         const fetchedFoods: Food[] = [];
         snapshot.forEach((doc) => {
            fetchedFoods.push(doc.data() as Food);
         });
         setBaseFoods(fetchedFoods);
      });

      return () => unsubscribe();
   }, []);










































   // Handlers
   const handleLogin = async () => {
      try {
         await signInWithPopup(auth, googleProvider);
      } catch (error) {
         console.error("Error signing in with Google", error);
      }
   };

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
      if (!user) {
         setGuestLogs(prev => [...prev, log]);
         return;
      }
      try {
         // Add userId to the log entry before saving
         const logWithUser = { ...log, userId: user.uid };
         await setDoc(doc(db, 'daily_logs', log.id), logWithUser);
      } catch (error) {
         console.error("Error adding log:", error);
      }
   };

   const deleteLog = async (id: string) => {
      if (!user) {
         setGuestLogs(prev => prev.filter(l => l.id !== id));
         return;
      }
      try {
         await deleteDoc(doc(db, 'daily_logs', id));
      } catch (error) {
         console.error("Error deleting log:", error);
      }
   };

   if (loading) {
      return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>;
   }



   return (
      <div className="min-h-screen text-textMain font-family-sans flex flex-col md:flex-row relative overflow-hidden bg-background">
         {/* Background Images */}
         <div className="fixed inset-0 z-0">
            <img
               src={
                  currentView === 'library' ? "/library-bg-mobile.jpg" :
                     currentView === 'stats' ? "/stats-bg-mobile.png" :
                        "/dashboard-bg-mobile.jpg"
               }
               alt="Background"
               className="block md:hidden w-full h-full object-cover opacity-80"
            />
            <img
               src={
                  currentView === 'library' ? "/library-bg-desktop.jpg" :
                     currentView === 'stats' ? "/stats-bg-desktop.jpg" :
                        "/dashboard-bg-desktop.jpg"
               }
               alt="Background"
               className="hidden md:block w-full h-full object-cover opacity-80"
            />
         </div>         {/* Sidebar Navigation - Floating Light Dock */}
         <aside className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] md:translate-x-0 md:left-6 md:top-1/2 md:-translate-y-1/2 md:w-24 md:h-[90vh] md:bottom-auto bg-white/50 backdrop-blur-xl border border-white/40 rounded-xl z-50 flex md:flex-col justify-around md:justify-center items-center py-2 md:py-8 md:gap-8 transition-all duration-300 ${isMenuHidden ? 'translate-y-[200%] md:translate-y-[-50%] md:-translate-x-[200%]' : ''}`}>

            {/* Logo / Brand */}
            <div className="hidden md:flex flex-col items-center gap-2 mb-auto">
               <div className="w-12 h-12 bg-gradient-to-tr from-stone-400 to-stone-600 rounded-2xl flex items-center justify-center transition-all hover:scale-105">
                  <Icons.Utensils className="text-white" size={24} />
               </div>
            </div>

            <button
               onClick={() => handleChangeView('dashboard')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'dashboard' ? 'bg-stone-200 text-stone-700' : 'text-gray-400 hover:text-stone-600 hover:bg-white/40'}`}
            >
               <Icons.Dashboard size={28} className={`transition-transform duration-300 ${currentView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'dashboard' && <div className="absolute left-0 w-1 h-8 bg-stone-500 rounded-r-full hidden md:block -ml-[2px]" />}
            </button>

            <button
               onClick={() => handleChangeView('library')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'library' ? 'bg-stone-200 text-stone-700' : 'text-gray-400 hover:text-stone-600 hover:bg-white/40'}`}
            >
               <Icons.Fridge size={28} className={`transition-transform duration-300 ${currentView === 'library' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'library' && <div className="absolute left-0 w-1 h-8 bg-stone-500 rounded-r-full hidden md:block -ml-[2px]" />}
            </button>

            <button
               onClick={() => handleChangeView('stats')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'stats' ? 'bg-stone-200 text-stone-700' : 'text-gray-400 hover:text-stone-600 hover:bg-white/40'}`}
            >
               <Icons.Stats size={28} className={`transition-transform duration-300 ${currentView === 'stats' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'stats' && <div className="absolute left-0 w-1 h-8 bg-stone-500 rounded-r-full hidden md:block -ml-[2px]" />}
            </button>

            {/* Profile */}
            <button
               onClick={() => handleChangeView('profile')}
               className="hidden md:flex mt-auto w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md hover:shadow-lg transition-transform hover:scale-105"
            >
               {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold">
                     {user?.displayName?.[0] || 'U'}
                  </div>
               )}
            </button>

            {/* Mobile Profile Link */}
            <button
               onClick={() => handleChangeView('profile')}
               className={`md:hidden p-3 rounded-full transition-all ${currentView === 'profile' ? 'ring-2 ring-secondary shadow-md' : 'opacity-80'}`}
            >
               <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm">
                  {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">U</div>}
               </div>
            </button>
         </aside>

         {/* Main Content Area */}
         <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto w-full pb-32 md:pb-10 relative z-0 md:ml-32">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
               {currentView === 'dashboard' && (
                  <Dashboard
                     isGuest={!user}
                     foods={foods}
                     logs={user ? logs : guestLogs.filter(l => l.date === selectedDate)}
                     onAddLog={addLog}
                     onDeleteLog={deleteLog}
                     selectedDate={selectedDate}
                     onDateChange={setSelectedDate}
                     onNavigateToLibrary={handleNavigateToLibraryAdd}
                     onToggleMenu={setIsMenuHidden}
                  />
               )}
               {currentView === 'library' && (
                  <Library
                     foods={foods}
                     onAddFood={addFood}
                     onDeleteFood={deleteFood}
                     autoOpenAdd={autoOpenAdd}
                     onToggleMenu={setIsMenuHidden}
                  />
               )}
               {currentView === 'stats' && (
                  <Stats logs={logs} />
               )}
               {currentView === 'profile' && (
                  <div className="flex items-center justify-center h-[80vh]">
                     <div className="bg-surface backdrop-blur-xl border border-white/60 p-12 rounded-[2rem] shadow-glass max-w-md w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent opacity-50 pointer-events-none left-0" />
                        <div className="relative z-10">
                           {user ? (
                              <>
                                 <img src={user.photoURL || 'https://ui-avatars.com/api/?name=User'} className="w-28 h-28 rounded-full mx-auto mb-6 border-[6px] border-white shadow-xl" />
                                 <h2 className="text-3xl font-bold text-gray-800 mb-2 font-[Outfit]">{user.displayName}</h2>
                                 <p className="text-gray-500 mb-8 font-medium">{user.email}</p>
                                 <button onClick={() => auth.signOut()} className="w-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold py-4 px-8 rounded-2xl transition-all shadow-sm hover:shadow text-lg">
                                    Cerrar Sesión
                                 </button>
                              </>
                           ) : (
                              <>
                                 <div className="w-28 h-28 rounded-full mx-auto mb-6 bg-gray-200 flex items-center justify-center text-gray-400 text-4xl font-bold border-[6px] border-white shadow-xl">
                                    ?
                                 </div>
                                 <h2 className="text-3xl font-bold text-gray-800 mb-2 font-[Outfit]">Invitado</h2>
                                 <p className="text-gray-500 mb-8 font-medium">Inicia sesión para guardar tus datos</p>
                                 <button
                                    onClick={handleLogin}
                                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-bold py-4 px-8 rounded-2xl transition-all shadow-sm hover:shadow text-lg"
                                 >
                                    <img
                                       src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                       alt="Google"
                                       className="w-6 h-6"
                                    />
                                    Inicia Sesión con Google
                                 </button>
                              </>
                           )}
                           <div className="mt-8 pt-8 border-t border-gray-100">
                              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Neverita v1.0</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}

export default App;