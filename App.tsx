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

   // BATCH 20 IMPORT (IDs 444-475 - More Postres Lácteos/Yogurts)
   useEffect(() => {
      const importBatch20 = async () => {
         console.log("Starting Batch 20 Operations (More Postres Lácteos/Yogurts)...");

         const batch20: Food[] = [
            { name: "Yogur Líquido Fresa", id: "444", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 75, protein: 2.3, carbs: 12.3, fat: 1.9 },
            { name: "Yogur Cremoso con Frutos Silvestres", id: "445", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 98, protein: 3.7, carbs: 13.7, fat: 3.2 },
            { name: "Yogur Cremoso con Melocotón y Maracuyá", id: "446", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 96, protein: 3.6, carbs: 13.1, fat: 3.2 },
            { name: "Yogur con Frutas", id: "447", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 91, protein: 3.6, carbs: 13.1, fat: 2.7 },
            { name: "Yogur Sabor Chocolate +Proteínas", id: "448", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 81, protein: 8.4, carbs: 8.7, fat: 1.1 },
            { name: "Yogur Sabor Mango y Maracuyá +Proteínas", id: "449", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 56, protein: 8.3, carbs: 5.8, fat: 0.5 },
            { name: "Yogur Natural +Proteínas", id: "450", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 52, protein: 10, carbs: 3.1, fat: 0.5 },
            { name: "Yogur Sabor Coco +Proteínas", id: "451", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 61, protein: 8.3, carbs: 5.7, fat: 0.5 },
            { name: "Yogur Sabor Arándanos +Proteínas", id: "452", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 53, protein: 8.3, carbs: 5, fat: 0.5 },
            { name: "Yogur Sabor Fresa +Proteínas", id: "453", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 53, protein: 8.3, carbs: 5, fat: 0.5 },
            { name: "Yogur Natural Cremoso Edulcorado", id: "454", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 42, protein: 4.9, carbs: 5.6, fat: 0 },
            { name: "Yogur Desnatado Natural Edulcorado", id: "455", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 39, protein: 4.5, carbs: 4.9, fat: 0.1 },
            { name: "Yogur Desnatado Natural", id: "456", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 36, protein: 4.3, carbs: 4.5, fat: 0.1 },
            { name: "Yogur Desnatado Sabores", id: "457", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 35, protein: 4.3, carbs: 4.4, fat: 0.1 },
            { name: "Yogur Griego Ligero Natural", id: "458", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 60, protein: 5.8, carbs: 4.7, fat: 2 },
            { name: "Yogur Griego Natural con Azúcar Caña", id: "459", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 150, protein: 3.7, carbs: 11.3, fat: 10 },
            { name: "Yogur Griego Natural", id: "460", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 129, protein: 3.9, carbs: 3.9, fat: 10.8 },
            { name: "Yogur Natural", id: "461", brand: "Danone", category: "Postres Lácteos", subCategory: "", calories: 60, protein: 3.3, carbs: 4.3, fat: 3.3 },
            { name: "Yogur Natural con Azúcar de Caña", id: "462", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 94, protein: 3.3, carbs: 11.6, fat: 3.8 },
            { name: "Yogur Natural Cabra", id: "463", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 73, protein: 4.1, carbs: 3, fat: 4.9 },
            { name: "Yogur Natural", id: "464", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 62, protein: 3.7, carbs: 4.1, fat: 3.4 },
            { name: "Yogur Sabor Coco", id: "465", brand: "Danone", category: "Postres Lácteos", subCategory: "", calories: 72, protein: 3, carbs: 10, fat: 2.2 },
            { name: "Yogur Sabor Coco", id: "466", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 82, protein: 3.6, carbs: 11.4, fat: 2.5 },
            { name: "Yogur Sabor Fresa sin Lactosa", id: "467", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 86, protein: 3.2, carbs: 11, fat: 3.2 },
            { name: "Yogur Sabor Fresa", id: "468", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 82, protein: 3.6, carbs: 11.4, fat: 2.5 },
            { name: "Yogur Sabor Fresa", id: "469", brand: "Danone", category: "Postres Lácteos", subCategory: "", calories: 72, protein: 3, carbs: 10, fat: 2.2 },
            { name: "Yogur Sabor Galleta", id: "470", brand: "Danone", category: "Postres Lácteos", subCategory: "", calories: 72, protein: 3, carbs: 10, fat: 2.2 },
            { name: "Yogur Griego Sabor Fresa", id: "471", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 142, protein: 3.2, carbs: 14, fat: 8.1 },
            { name: "Yogur Griego Sabor Limón", id: "472", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 135, protein: 3.3, carbs: 12.9, fat: 7.8 },
            { name: "Yogur Griego Sabor Stracciatella", id: "473", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 159, protein: 3.4, carbs: 15.4, fat: 9.3 },
            { name: "Yogur Sabor Macedonia", id: "474", brand: "Danone", category: "Postres Lácteos", subCategory: "", calories: 72, protein: 3, carbs: 10, fat: 2.2 },
            { name: "Yogur Sabor Macedonia", id: "475", brand: "Hacendado", category: "Postres Lácteos", subCategory: "", calories: 82, protein: 3.6, carbs: 11.4, fat: 2.5 }
         ];

         for (const item of batch20) {
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
         console.log("Batch 20 Import complete.");
      };

      importBatch20();
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