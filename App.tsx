import React, { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc, QuerySnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './src/firebase';
// Login component removed
import { Icons } from './components/ui/Icons';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Stats from './components/Stats';
import { Food, LogEntry, UserGoals } from './types';
import { INITIAL_FOODS } from './constants';

type View = 'dashboard' | 'library' | 'stats' | 'profile' | 'edit-goals';

function App() {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [currentView, setCurrentView] = useState<View>('dashboard');
   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
   const [autoOpenAdd, setAutoOpenAdd] = useState(false);
   const [isMenuHidden, setIsMenuHidden] = useState(false);

   // Persistent State
   const [userFoods, setUserFoods] = useState<Food[]>([]);
   const [userRecipes, setUserRecipes] = useState<Food[]>([]);
   const [baseFoods, setBaseFoods] = useState<Food[]>([]);

   // Combine static, base, user foods and recipes, and sort alphabetically
   const foods = useMemo(() => {
      const allFoods = [...INITIAL_FOODS, ...baseFoods, ...userFoods, ...userRecipes];
      return allFoods.sort((a, b) => a.name.localeCompare(b.name));
   }, [baseFoods, userFoods, userRecipes]);

   const [logs, setLogs] = useState<LogEntry[]>([]);

   const [guestLogs, setGuestLogs] = useState<LogEntry[]>([]);
   const [goals, setGoals] = useState<UserGoals | null>(null);

   // Edit Goals State
   const [currentWeight, setCurrentWeight] = useState('');
   const [desiredWeight, setDesiredWeight] = useState('');
   const [startingWeight, setStartingWeight] = useState('');
   const [timeframe, setTimeframe] = useState('');
   const [isEditingProfile, setIsEditingProfile] = useState(false);

   const weeklyChange = useMemo(() => {
      const start = parseFloat(startingWeight);
      const desired = parseFloat(desiredWeight);
      const weeks = parseFloat(timeframe);

      if (!start || !desired || !weeks || weeks === 0) return 0;

      const totalChange = desired - start; // Negative for loss, positive for gain
      const changePerWeek = (totalChange / weeks) * 1000; // Convert to grams
      return Math.round(changePerWeek);
   }, [startingWeight, desiredWeight, timeframe]);

   const progressPercentage = useMemo(() => {
      const start = parseFloat(startingWeight);
      const current = parseFloat(currentWeight);
      const target = parseFloat(desiredWeight);

      if (!start || !current || !target) return 0;
      if (start === target) return 100;

      const totalDiff = Math.abs(target - start);
      const currentDiff = Math.abs(current - start);

      // If we've passed the target (e.g. lost more weight than intended), cap at 100%
      // Determine direction
      const isWeightLoss = target < start;

      // Check if we're moving in the right direction
      if (isWeightLoss) {
         if (current > start) return 0; // Gained weight instead of lost
         if (current <= target) return 100;
      } else {
         // Weight gain
         if (current < start) return 0; // Lost weight instead of gained
         if (current >= target) return 100;
      }

      const progress = (currentDiff / totalDiff) * 100;
      return Math.round(Math.min(100, Math.max(0, progress)));
   }, [startingWeight, currentWeight, desiredWeight]);

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

   // Listen for user_recipes from Firestore
   useEffect(() => {
      if (!user) {
         setUserRecipes([]);
         return;
      }

      const q = query(collection(db, 'user_recipes'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
         const fetchedRecipes: Food[] = [];
         snapshot.forEach((doc) => {
            fetchedRecipes.push(doc.data() as Food);
         });
         setUserRecipes(fetchedRecipes);
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

   // Listen for user goals
   useEffect(() => {
      if (!user) {
         setGoals(null);
         return;
      }
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
         if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            // Check if it has goal data
            if (data.kcalObjetivo && data.macrosPct) {
               setGoals(data as UserGoals);
            }

            // Check for Weight Goals
            if (data.weightGoals) {
               setStartingWeight(data.weightGoals.startingWeight?.toString() || '');
               setCurrentWeight(data.weightGoals.currentWeight?.toString() || '');
               setDesiredWeight(data.weightGoals.desiredWeight?.toString() || '');
               setTimeframe(data.weightGoals.timeframe?.toString() || '');
            }
         }
      });
      return () => unsubscribe();
   }, [user]);

   const updateGoals = async (newGoals: UserGoals) => {
      if (!user) return;
      try {
         await setDoc(doc(db, 'users', user.uid), newGoals, { merge: true });
      } catch (error) {
         console.error("Error updating goals:", error);
      }
   };

   const saveWeightGoals = async () => {
      if (!user) return;

      const newWeightGoals = {
         startingWeight: parseFloat(startingWeight) || 0,
         currentWeight: parseFloat(currentWeight) || 0,
         desiredWeight: parseFloat(desiredWeight) || 0,
         timeframe: parseFloat(timeframe) || 0,
         updatedAt: new Date().toISOString()
      };

      try {
         await setDoc(doc(db, 'users', user.uid), { weightGoals: newWeightGoals }, { merge: true });
         setIsEditingProfile(false);
      } catch (error) {
         console.error("Error saving weight goals:", error);
      }
   };










































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
         // Store in different collections based on category
         const collectionName = food.category === 'Recetas' ? 'user_recipes' : 'user_foods';
         await setDoc(doc(db, collectionName, food.id), foodWithUser);
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
         const collectionName = foodToDelete.category === 'Recetas' ? 'user_recipes' : 'user_foods';
         await deleteDoc(doc(db, collectionName, id));
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
         <div className={`fixed inset-0 z-0 ${currentView === 'profile' ? 'hidden' : ''}`}>
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
         </div>         {/* Desktop Pinterest-style Sidebar - Fixed Left */}
         <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center py-6 bg-white z-50 border-r border-gray-100">
            {/* Logo */}
            <div className="mb-8">
               <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center transition-all hover:bg-stone-200 cursor-pointer shadow-sm">
                  <Icons.Utensils className="text-stone-800" size={24} />
               </div>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col gap-6 w-full items-center">
               <button
                  onClick={() => handleChangeView('dashboard')}
                  className={`p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center ${currentView === 'dashboard' ? 'bg-black text-white' : 'text-stone-500 hover:bg-stone-100'}`}
               >
                  <Icons.Dashboard size={24} strokeWidth={currentView === 'dashboard' ? 3 : 2} />
               </button>

               <button
                  onClick={() => handleChangeView('library')}
                  className={`p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center ${currentView === 'library' ? 'bg-black text-white' : 'text-stone-500 hover:bg-stone-100'}`}
               >
                  <Icons.Fridge size={24} strokeWidth={currentView === 'library' ? 3 : 2} />
               </button>

               <button
                  onClick={() => handleChangeView('stats')}
                  className={`p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center ${currentView === 'stats' ? 'bg-black text-white' : 'text-stone-500 hover:bg-stone-100'}`}
               >
                  <Icons.Stats size={24} strokeWidth={currentView === 'stats' ? 3 : 2} />
               </button>
            </div>

            {/* Spacer to push Profile to bottom if needed, or just keep it close like Pinterest side rail */}
            {/* In Pinterest desktop image, profile/settings is at the bottom, or there are more icons. I'll put Profile at the bottom for "Account" */}

            <div className="mt-auto mb-4">
               <button
                  onClick={() => handleChangeView('profile')}
                  className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 flex items-center justify-center ${currentView === 'profile' ? 'ring-2 ring-black' : 'hover:bg-stone-100'}`}
               >
                  {user?.photoURL ? (
                     <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                     <Icons.User size={24} className="text-stone-600" />
                  )}
               </button>
            </div>
         </aside>

         {/* Mobile Pinterest-style Bottom Navigation */}
         <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-50 px-2 pb-safe-area">
            <div className="flex flex-row justify-around items-center h-20">
               <button
                  onClick={() => handleChangeView('dashboard')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Dashboard
                     size={28}
                     className={`transition-all ${currentView === 'dashboard' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'dashboard' ? 0 : 2}
                  />
                  <span className={`text-xs font-medium ${currentView === 'dashboard' ? 'text-black' : 'text-stone-500'}`}>
                     Diario
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('library')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Fridge
                     size={28}
                     className={`transition-all ${currentView === 'library' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'library' ? 0 : 2}
                  />
                  <span className={`text-xs font-medium ${currentView === 'library' ? 'text-black' : 'text-stone-500'}`}>
                     Nevera
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('stats')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Stats
                     size={28}
                     className={`transition-all ${currentView === 'stats' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'stats' ? 0 : 2}
                  />
                  <span className={`text-xs font-medium ${currentView === 'stats' ? 'text-black' : 'text-stone-500'}`}>
                     Estadísticas
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('profile')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  {user?.photoURL ? (
                     <div className={`w-7 h-7 rounded-full overflow-hidden ${currentView === 'profile' ? 'ring-2 ring-black' : ''}`}>
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                     <Icons.User
                        size={28}
                        className={`transition-all ${currentView === 'profile' ? 'text-black fill-current' : 'text-stone-500'}`}
                        strokeWidth={currentView === 'profile' ? 0 : 2}
                     />
                  )}
                  <span className={`text-xs font-medium ${currentView === 'profile' ? 'text-black' : 'text-stone-500'}`}>
                     Cuenta
                  </span>
               </button>
            </div>
         </div>

         {/* Main Content Area - Adjusted margin for desktop sidebar */}
         <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10 relative z-0 md:ml-20">
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
                     goals={goals}
                  />
               )}
               {currentView === 'library' && (
                  <Library
                     isGuest={!user}
                     foods={foods}
                     onAddFood={addFood}
                     onDeleteFood={deleteFood}
                     autoOpenAdd={autoOpenAdd}
                     onToggleMenu={setIsMenuHidden}
                  />
               )}
               {currentView === 'stats' && (
                  <Stats logs={logs} goals={goals} onUpdateGoals={updateGoals} />
               )}
               {currentView === 'profile' && (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-300 w-full bg-white">
                     {/* Clean White Background Container */}
                     <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center p-8 md:p-12">

                        <div className="animate-in slide-in-from-bottom-8 duration-500 flex flex-col items-center w-full">
                           {user ? (
                              <>
                                 <div className="w-40 h-40 rounded-full mx-auto mb-6 p-1 bg-gradient-to-tr from-stone-200 to-white shadow-xl">
                                    <img
                                       src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
                                       className="w-full h-full rounded-full object-cover border-4 border-white"
                                       alt={user.displayName || 'User'}
                                    />
                                 </div>
                                 <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-2 font-[Outfit] tracking-tight">{user.displayName}</h2>
                                 <p className="text-stone-500 mb-6 font-medium text-lg">@{user.email?.split('@')[0] || 'usuario'}</p>

                                 {!isEditingProfile ? (
                                    <>
                                       {/* Progress Bar View */}
                                       <div className="w-full max-w-xs mb-8">
                                          <div className="flex justify-between text-sm font-medium text-stone-600 mb-2">
                                             <span>Progreso</span>
                                             <span>{progressPercentage}%</span>
                                          </div>
                                          <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                                             <div
                                                className="h-full bg-stone-800 transition-all duration-1000"
                                                style={{ width: `${progressPercentage}%` }}
                                             />
                                          </div>
                                          {parseFloat(startingWeight) > 0 && parseFloat(desiredWeight) > 0 && (
                                             <p className="text-xs text-stone-400 mt-2">
                                                Meta: {desiredWeight}kg (Inicio: {startingWeight}kg)
                                             </p>
                                          )}
                                       </div>

                                       <div className="flex gap-4 w-full max-w-md justify-center">
                                          <button
                                             onClick={() => setIsEditingProfile(true)}
                                             className="bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold py-3 px-6 rounded-full transition-all text-base active:scale-95"
                                          >
                                             Editar Peso Objetivo
                                          </button>
                                       </div>
                                    </>
                                 ) : (
                                    /* Inline Editing View */
                                    <div className="w-full max-w-md my-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                       <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1 text-left">
                                             <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Peso Inicial</label>
                                             <input
                                                type="number"
                                                value={startingWeight}
                                                onChange={(e) => setStartingWeight(e.target.value)}
                                                placeholder="0"
                                                className="w-full p-3 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 outline-none transition-all bg-stone-50"
                                             />
                                          </div>
                                          <div className="space-y-1 text-left">
                                             <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Peso Actual</label>
                                             <input
                                                type="number"
                                                value={currentWeight}
                                                onChange={(e) => setCurrentWeight(e.target.value)}
                                                placeholder="0"
                                                className="w-full p-3 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 outline-none transition-all bg-stone-50"
                                             />
                                          </div>
                                          <div className="space-y-1 text-left">
                                             <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Peso Objetivo</label>
                                             <input
                                                type="number"
                                                value={desiredWeight}
                                                onChange={(e) => setDesiredWeight(e.target.value)}
                                                placeholder="0"
                                                className="w-full p-3 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 outline-none transition-all bg-stone-50"
                                             />
                                          </div>
                                          <div className="space-y-1 text-left">
                                             <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Semanas</label>
                                             <input
                                                type="number"
                                                value={timeframe}
                                                onChange={(e) => setTimeframe(e.target.value)}
                                                placeholder="0"
                                                className="w-full p-3 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 outline-none transition-all bg-stone-50"
                                             />
                                          </div>
                                       </div>

                                       {(weeklyChange !== 0 && !isNaN(weeklyChange)) && (
                                          <div className="py-4">
                                             <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100 mb-2">
                                                <p className="text-stone-500 text-xs mb-1 text-center font-bold uppercase tracking-wide">Cambio semanal estimado</p>
                                                <p className={`text-3xl font-bold text-center ${weeklyChange > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                                   {weeklyChange > 0 ? '+' : ''}{weeklyChange}g <span className="text-lg text-stone-400 font-normal">/ semana</span>
                                                </p>
                                             </div>
                                             {parseFloat(startingWeight) > 0 && parseFloat(desiredWeight) > 0 && (
                                                <p className="text-xs text-stone-400 text-center font-medium">
                                                   Meta: {desiredWeight}kg (Inicio: {startingWeight}kg)
                                                </p>
                                             )}
                                          </div>
                                       )}

                                       <div className="flex gap-4 pt-2">
                                          <button
                                             onClick={() => setIsEditingProfile(false)}
                                             className="flex-1 bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 font-bold py-3 rounded-full transition-all active:scale-95"
                                          >
                                             Cancelar
                                          </button>
                                          <button
                                             onClick={saveWeightGoals}
                                             className="flex-1 bg-stone-800 hover:bg-black text-white font-bold py-3 rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95"
                                          >
                                             Guardar Cambios
                                          </button>
                                       </div>
                                    </div>
                                 )}


                                 <div className="mt-12">
                                    <button
                                       onClick={() => auth.signOut()}
                                       className="text-stone-400 hover:text-red-500 transition-colors text-sm font-medium"
                                    >
                                       Cerrar Sesión
                                    </button>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <div className="w-40 h-40 rounded-full mx-auto mb-8 bg-stone-100/80 flex items-center justify-center text-stone-400 border-[6px] border-white/50 shadow-xl backdrop-blur-sm">
                                    <Icons.User size={80} />
                                 </div>
                                 <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4 font-[Outfit]">Invitado</h2>
                                 <p className="text-stone-500 mb-10 font-medium text-xl">Inicia sesión para desbloquear todas las funciones</p>
                                 <div className="w-full max-w-md">
                                    <button
                                       onClick={handleLogin}
                                       className="w-full flex items-center justify-center gap-4 bg-white hover:bg-stone-50 text-stone-900 border border-stone-100 font-bold py-6 px-10 rounded-3xl transition-all shadow-lg hover:shadow-xl text-xl active:scale-95 transform hover:-translate-y-1"
                                    >
                                       <img
                                          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                          alt="Google"
                                          className="w-8 h-8"
                                       />
                                       Inicia Sesión con Google
                                    </button>
                                 </div>
                              </>
                           )}

                           <div className="mt-16">
                              <p className="text-xs text-stone-400 uppercase tracking-[0.3em] font-bold">Neverita v1.0</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {currentView === 'edit-goals' && (
                  <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
                     {/* Header */}
                     <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <button
                           onClick={() => handleChangeView('profile')}
                           className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                           <Icons.ChevronLeft size={28} className="text-stone-800" />
                        </button>
                        <h2 className="text-lg font-bold text-stone-900">Editar objetivos</h2>
                        <button
                           onClick={saveWeightGoals}
                           className="bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold py-2 px-4 rounded-full text-sm transition-colors"
                        >
                           Hecho
                        </button>
                     </div>

                     {/* Content */}
                     <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-2xl mx-auto w-full">
                        <div className="flex flex-col items-center mb-10">
                           <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                              {user?.photoURL ? (
                                 <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                 <Icons.User size={40} className="text-stone-400" />
                              )}
                           </div>
                           <button className="bg-stone-200 hover:bg-stone-300 text-stone-900 font-bold py-2 px-4 rounded-full text-sm transition-colors">
                              Modificar
                           </button>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-sm font-medium text-stone-500 ml-1">Peso Actual (kg)</label>
                              <input
                                 type="number"
                                 value={currentWeight}
                                 onChange={(e) => setCurrentWeight(e.target.value)}
                                 placeholder="Ej: 75"
                                 className="w-full p-4 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 text-lg outline-none transition-all"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-sm font-medium text-stone-500 ml-1">Peso Deseado (kg)</label>
                              <input
                                 type="number"
                                 value={desiredWeight}
                                 onChange={(e) => setDesiredWeight(e.target.value)}
                                 placeholder="Ej: 70"
                                 className="w-full p-4 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 text-lg outline-none transition-all"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-sm font-medium text-stone-500 ml-1">Tiempo (semanas)</label>
                              <input
                                 type="number"
                                 value={timeframe}
                                 onChange={(e) => setTimeframe(e.target.value)}
                                 placeholder="Ej: 8"
                                 className="w-full p-4 rounded-2xl border border-stone-200 focus:border-stone-400 focus:ring-0 text-lg outline-none transition-all"
                              />
                           </div>

                           {weeklyChange !== 0 && !isNaN(weeklyChange) && (
                              <div className="mt-8 p-6 bg-stone-50 rounded-3xl border border-stone-100">
                                 <p className="text-stone-500 text-sm mb-1 text-center font-medium uppercase tracking-wide">Cambio semanal estimado</p>
                                 <p className={`text-3xl font-bold text-center ${weeklyChange > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                    {weeklyChange > 0 ? '+' : ''}{weeklyChange}g <span className="text-lg text-stone-400 font-normal">/ semana</span>
                                 </p>
                              </div>
                           )}
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