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
         </div>         {/* Desktop Pinterest-style Sidebar - Fixed Left */}
         <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center py-6 bg-white z-50 border-r border-gray-100">
            {/* Logo */}
            <div className="mb-8">
               <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center transition-all hover:bg-red-700 cursor-pointer shadow-sm">
                  <Icons.Utensils className="text-white" size={20} />
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
            <div className="flex flex-row justify-around items-center h-16">
               <button
                  onClick={() => handleChangeView('dashboard')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Dashboard
                     size={24}
                     className={`transition-all ${currentView === 'dashboard' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'dashboard' ? 0 : 2}
                  />
                  <span className={`text-[10px] font-medium ${currentView === 'dashboard' ? 'text-black' : 'text-stone-500'}`}>
                     Diario
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('library')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Fridge
                     size={24}
                     className={`transition-all ${currentView === 'library' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'library' ? 0 : 2}
                  />
                  <span className={`text-[10px] font-medium ${currentView === 'library' ? 'text-black' : 'text-stone-500'}`}>
                     Nevera
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('stats')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  <Icons.Stats
                     size={24}
                     className={`transition-all ${currentView === 'stats' ? 'text-black fill-current' : 'text-stone-500'}`}
                     strokeWidth={currentView === 'stats' ? 0 : 2}
                  />
                  <span className={`text-[10px] font-medium ${currentView === 'stats' ? 'text-black' : 'text-stone-500'}`}>
                     Estadísticas
                  </span>
               </button>

               <button
                  onClick={() => handleChangeView('profile')}
                  className="flex flex-col items-center justify-center gap-1 w-16"
               >
                  {user?.photoURL ? (
                     <div className={`w-6 h-6 rounded-full overflow-hidden ${currentView === 'profile' ? 'ring-2 ring-black' : ''}`}>
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                     <Icons.User
                        size={24}
                        className={`transition-all ${currentView === 'profile' ? 'text-black fill-current' : 'text-stone-500'}`}
                        strokeWidth={currentView === 'profile' ? 0 : 2}
                     />
                  )}
                  <span className={`text-[10px] font-medium ${currentView === 'profile' ? 'text-black' : 'text-stone-500'}`}>
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
                  <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-300 w-full">
                     {/* Light Mode Blurred Background Container */}
                     <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center p-8 md:p-12 bg-white/30 backdrop-blur-xl rounded-[3rem] border border-white/40 shadow-xl">

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
                                 <p className="text-stone-500 mb-10 font-medium text-xl">{user.email}</p>

                                 <div className="w-full max-w-sm">
                                    <button
                                       onClick={() => auth.signOut()}
                                       className="w-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 hover:border-red-300 font-bold py-5 px-8 rounded-2xl transition-all shadow-sm hover:shadow-md text-lg active:scale-95"
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
            </div>
         </main>
      </div>
   );
}

export default App;