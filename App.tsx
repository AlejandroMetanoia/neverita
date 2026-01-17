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

   // BATCH 22 IMPORT (IDs 481-515 - Processed, Sweets, Prepared)
   useEffect(() => {
      const importBatch22 = async () => {
         console.log("Starting Batch 22 Operations (Other Groups)...");

         const batch22: Food[] = [
            { name: "Crema de Avellanas y Cacao", id: "481", brand: "Hacendado", category: "Procesados", subCategory: "", calories: 547, protein: 6.5, carbs: 54, fat: 33 },
            { name: "Crema Cacao 1 Sabor", id: "482", brand: "Hacendado", category: "Procesados", subCategory: "", calories: 547, protein: 4.4, carbs: 56, fat: 33 },
            { name: "Crema Cacao 2 Sabores", id: "483", brand: "Hacendado", category: "Procesados", subCategory: "", calories: 550, protein: 4.5, carbs: 57, fat: 33 },
            { name: "Crema Cacao Chocoleche", id: "484", brand: "Nocilla", category: "Procesados", subCategory: "", calories: 539, protein: 4.2, carbs: 60, fat: 31 },
            { name: "Crema Cacao Original", id: "485", brand: "Nocilla", category: "Procesados", subCategory: "", calories: 545, protein: 4.8, carbs: 58, fat: 32 },
            { name: "Cacao Soluble Instantáneo", id: "486", brand: "Hacendado", category: "Procesados", subCategory: "", calories: 383, protein: 4.8, carbs: 80, fat: 3.2 },
            { name: "Cacao Soluble Instantáneo", id: "487", brand: "Nesquik", category: "Procesados", subCategory: "", calories: 386, protein: 5.1, carbs: 78.9, fat: 3.6 },
            { name: "Cacao Soluble", id: "488", brand: "Cola Cao", category: "Procesados", subCategory: "", calories: 377, protein: 6.6, carbs: 78, fat: 2.5 },
            { name: "Cacao Soluble", id: "489", brand: "Hacendado", category: "Procesados", subCategory: "", calories: 383, protein: 6.9, carbs: 79, fat: 2.6 },
            { name: "Chocolate Polvo a la Taza", id: "490", brand: "Valor", category: "Azúcares y Dulces", subCategory: "", calories: 383, protein: 5.6, carbs: 80, fat: 3.1 },
            { name: "Cacao Preparado Líquido a la Taza", id: "491", brand: "Hacendado", category: "Azúcares y Dulces", subCategory: "", calories: 110, protein: 2, carbs: 22, fat: 1.6 },
            { name: "Flautas de Bacon y Queso", id: "492", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 317, protein: 13.8, carbs: 26.5, fat: 16.9 },
            { name: "Flautas de Pollo y Queso", id: "493", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 232, protein: 7.9, carbs: 31.5, fat: 7.9 },
            { name: "Pizza Congelada Masa Fina 4 Quesos", id: "494", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 252, protein: 11.2, carbs: 29.6, fat: 9.9 },
            { name: "Pizza Congelada Sin Gluten 4 Quesos", id: "495", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 290, protein: 11.3, carbs: 34.3, fat: 11.9 },
            { name: "Pizza Congelada Americana", id: "496", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 236, protein: 12, carbs: 29, fat: 7.7 },
            { name: "Pizza Congelada Atún", id: "497", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 262, protein: 12.7, carbs: 25.1, fat: 12.3 },
            { name: "Pizza Congelada Masa Fina Jamón y Queso", id: "498", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 232, protein: 9.7, carbs: 27.2, fat: 9.4 },
            { name: "Pizza Congelada Tomate y Queso", id: "499", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 234, protein: 8.7, carbs: 35.7, fat: 6.3 },
            { name: "Focaccia", id: "500", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 276, protein: 6.1, carbs: 40.5, fat: 9.6 },
            { name: "Calzone Jamón Cocido y Queso", id: "501", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 235, protein: 13.4, carbs: 21.5, fat: 10.3 },
            { name: "Pizza Fresca 4 Quesos", id: "502", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 267, protein: 14.4, carbs: 27.6, fat: 11 },
            { name: "Pizza Fresca Atún y Bacon", id: "503", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 263, protein: 14, carbs: 27, fat: 11 },
            { name: "Pizza Fresca Barbacoa", id: "504", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 250, protein: 11.9, carbs: 30.1, fat: 9.1 },
            { name: "Pizza Fresca Carbonara", id: "505", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 253, protein: 12.1, carbs: 29.8, fat: 9.1 },
            { name: "Pizza Fresca Frankfurt", id: "506", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 254, protein: 12.7, carbs: 23.5, fat: 11.8 },
            { name: "Pizza Fresca Jamón y Queso Sin Gluten", id: "507", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 206, protein: 9.3, carbs: 26.8, fat: 6.8 },
            { name: "Pizza Fresca Jamón Serrano", id: "508", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 261, protein: 15.5, carbs: 28.6, fat: 9.4 },
            { name: "Pizza Fresca Jamón y Queso", id: "509", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 224, protein: 14, carbs: 25.2, fat: 7.5 },
            { name: "Pizza Fresca Margarita", id: "510", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 253, protein: 14, carbs: 30.2, fat: 8.5 },
            { name: "Pizza Fresca Pollo y Bacon", id: "511", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 245, protein: 14.7, carbs: 26, fat: 9.1 },
            { name: "Pizza Fresca Prosciutto", id: "512", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 198, protein: 13.7, carbs: 22.3, fat: 5.6 },
            { name: "Pizza Fresca Formaggi", id: "513", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 280, protein: 14.7, carbs: 27, fat: 12.3 },
            { name: "Pizza Fresca Pepperoni", id: "514", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 296, protein: 14.4, carbs: 27.6, fat: 14.2 },
            { name: "Pizza Fresca Pollo", id: "515", brand: "Hacendado", category: "Comida Preparada", subCategory: "", calories: 229, protein: 11.2, carbs: 31.5, fat: 6.5 }
         ];

         for (const item of batch22) {
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
         console.log("Batch 22 Import complete.");
      };

      importBatch22();
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