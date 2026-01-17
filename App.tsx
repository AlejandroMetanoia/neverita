import React, { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc, QuerySnapshot } from 'firebase/firestore';
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

   // BATCH 12 IMPORT (IDs 223-250 - Vacuno, Cerdo, Pollo)
   useEffect(() => {
      const importBatch12 = async () => {
         console.log("Starting Batch 12 Operations (Carnes)...");

         const batch12: Food[] = [
            { name: "Lomo Bajo de Vaca Madurada", id: "223", brand: "", category: "Carnes Rojas", subCategory: "Vacuno", calories: 230, protein: 21, carbs: 0, fat: 15 },
            { name: "Chuletón de Vacuno Mayor", id: "224", brand: "", category: "Carnes Rojas", subCategory: "Vacuno", calories: 260, protein: 18, carbs: 0, fat: 21 },
            { name: "Solomillo de Vacuno Mayor", id: "225", brand: "", category: "Carnes Rojas", subCategory: "Vacuno", calories: 190, protein: 21, carbs: 0, fat: 11 },
            { name: "Hamburguesa de Vacuno Mayor", id: "226", brand: "", category: "Carnes Rojas", subCategory: "Vacuno", calories: 210, protein: 15, carbs: 0, fat: 16 },
            { name: "Carne Picada de Vacuno Mayor", id: "227", brand: "", category: "Carnes Rojas", subCategory: "Vacuno", calories: 210, protein: 15, carbs: 0, fat: 16 },
            { name: "Cinta de Lomo Adobada", id: "228", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 130, protein: 20, carbs: 0, fat: 5 },
            { name: "Solomillo de Cerdo", id: "229", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 140, protein: 22, carbs: 0, fat: 5 },
            { name: "Panceta Ibérica Salada", id: "230", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 550, protein: 15, carbs: 1, fat: 54 },
            { name: "Chorizo de Cerdo", id: "231", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 350, protein: 20, carbs: 1, fat: 30 },
            { name: "Chuletas de Lomo de Cerdo", id: "232", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 160, protein: 21, carbs: 0, fat: 8 },
            { name: "Chuleta de Aguja de Cerdo", id: "233", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 200, protein: 18, carbs: 0, fat: 14 },
            { name: "Chuletas de Sajonia", id: "234", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 130, protein: 17, carbs: 0, fat: 6 },
            { name: "Cintas de Lomo de Cerdo", id: "235", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 150, protein: 21, carbs: 0, fat: 7 },
            { name: "Morcilla de Arroz", id: "236", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 320, protein: 5, carbs: 20, fat: 25 },
            { name: "Morcilla de Cebolla", id: "237", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 300, protein: 11, carbs: 5, fat: 22 },
            { name: "Panceta", id: "238", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 400, protein: 16, carbs: 0, fat: 36 },
            { name: "Salchicha de Cerdo", id: "239", brand: "", category: "Carnes Rojas", subCategory: "Cerdo", calories: 200, protein: 13, carbs: 1, fat: 17 },
            { name: "Albóndigas de Cerdo", id: "240", brand: "Tradigust", category: "Carnes Rojas", subCategory: "Cerdo", calories: 232, protein: 16, carbs: 0.5, fat: 19 },
            { name: "Albóndigas de Pollo", id: "241", brand: "Aldelís", category: "Carnes Blancas", subCategory: "", calories: 167, protein: 17.9, carbs: 1.4, fat: 9.6 },
            { name: "Carne Picada de Cerdo", id: "242", brand: "Embutidos Martínez", category: "Carnes Rojas", subCategory: "Cerdo", calories: 195, protein: 17, carbs: 2, fat: 12 },
            { name: "Carne Picada Mixta Vacuno / Cerdo", id: "243", brand: "Embutidos Martínez", category: "Carnes Rojas", subCategory: "Cerdo", calories: 195, protein: 17, carbs: 2, fat: 12 },
            { name: "Carne Picada de Pollo", id: "244", brand: "Embutidos Martínez", category: "Carnes Blancas", subCategory: "", calories: 125, protein: 16, carbs: 1, fat: 6.8 },
            { name: "Carne Picada de Vacuno", id: "245", brand: "ECMedina", category: "Carnes Rojas", subCategory: "Vacuno", calories: 204, protein: 19, carbs: 0.5, fat: 14 },
            { name: "Carne Picada de Vacuno", id: "246", brand: "Embutidos Martínez", category: "Carnes Rojas", subCategory: "Vacuno", calories: 180, protein: 17, carbs: 3, fat: 12 },
            { name: "Carpaccio de Vacuno", id: "247", brand: "ECMedina", category: "Carnes Rojas", subCategory: "Vacuno", calories: 108, protein: 20, carbs: 2.2, fat: 2 },
            { name: "Hamburguesa de Vaca", id: "248", brand: "ECMedina", category: "Carnes Rojas", subCategory: "Vacuno", calories: 250, protein: 17, carbs: 0.5, fat: 20 },
            { name: "Hamburguesa de Cerdo", id: "249", brand: "CB Mediterranean Foods", category: "Carnes Rojas", subCategory: "Cerdo", calories: 216, protein: 14.6, carbs: 3.5, fat: 16 },
            { name: "Hamburguesa de Pollo", id: "250", brand: "CB Mediterranean Foods", category: "Carnes Blancas", subCategory: "", calories: 123, protein: 16, carbs: 1.6, fat: 5.8 }
         ];

         for (const item of batch12) {
            try {
               const { getDoc, doc, setDoc } = await import('firebase/firestore');
               const docRef = doc(db, 'base_foods', item.id);
               const docSnap = await getDoc(docRef);

               if (docSnap.exists()) {
                  console.log(`Skipping existing ID: ${item.id} (${item.name})`);
                  continue;
               }

               await setDoc(docRef, item);
               console.log(`Imported: ${item.name} (ID: ${item.id})`);
            } catch (error) {
               console.error(`Error importing ${item.name}:`, error);
            }
         }
         console.log("Batch 12 Import complete.");
      };

      importBatch12();
   }, []);
















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
      <div className="min-h-screen text-textMain font-family-sans flex flex-col md:flex-row relative overflow-hidden bg-background">
         {/* Airy Gradients for Light Mode */}
         <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-sky-50/50 to-white/0 pointer-events-none" />
         <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none" />
         <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />

         {/* Sidebar Navigation - Floating Light Dock */}
         <aside className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] md:translate-x-0 md:left-6 md:top-1/2 md:-translate-y-1/2 md:w-24 md:h-[90vh] md:bottom-auto bg-surface backdrop-blur-xl border border-white/50 rounded-3xl z-50 flex md:flex-col justify-around md:justify-center items-center py-2 md:py-8 md:gap-8 shadow-glass transition-all duration-300 ${isMenuHidden ? 'translate-y-[200%] md:translate-y-[-50%] md:-translate-x-[200%]' : ''}`}>

            {/* Logo / Brand */}
            <div className="hidden md:flex flex-col items-center gap-2 mb-auto">
               <div className="w-12 h-12 bg-gradient-to-tr from-secondary to-accent rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <Icons.Utensils className="text-white" size={24} />
               </div>
            </div>

            <button
               onClick={() => handleChangeView('dashboard')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
               <Icons.Dashboard size={28} className={`transition-transform duration-300 ${currentView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'dashboard' && <div className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full hidden md:block -ml-[2px]" />}
            </button>

            <button
               onClick={() => handleChangeView('library')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'library' ? 'bg-sky-50 text-sky-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
               <Icons.Library size={28} className={`transition-transform duration-300 ${currentView === 'library' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'library' && <div className="absolute left-0 w-1 h-8 bg-sky-500 rounded-r-full hidden md:block -ml-[2px]" />}
            </button>

            <button
               onClick={() => handleChangeView('stats')}
               className={`p-4 rounded-xl transition-all duration-300 group relative flex items-center justify-center ${currentView === 'stats' ? 'bg-fuchsia-50 text-fuchsia-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
               <Icons.Stats size={28} className={`transition-transform duration-300 ${currentView === 'stats' ? 'scale-110' : 'group-hover:scale-110'}`} />
               {currentView === 'stats' && <div className="absolute left-0 w-1 h-8 bg-fuchsia-500 rounded-r-full hidden md:block -ml-[2px]" />}
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
                     foods={foods}
                     logs={logs}
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
                           <img src={user?.photoURL || 'https://ui-avatars.com/api/?name=User'} className="w-28 h-28 rounded-full mx-auto mb-6 border-[6px] border-white shadow-xl" />
                           <h2 className="text-3xl font-bold text-gray-800 mb-2 font-[Outfit]">{user?.displayName}</h2>
                           <p className="text-gray-500 mb-8 font-medium">{user?.email}</p>
                           <button onClick={() => auth.signOut()} className="w-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold py-4 px-8 rounded-2xl transition-all shadow-sm hover:shadow text-lg">
                              Cerrar Sesión
                           </button>
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