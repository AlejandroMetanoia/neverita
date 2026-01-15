import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Icons } from './ui/Icons';
import { LogEntry } from '../types';

interface BarcodeScannerProps {
    onClose: () => void;
    onAddLog: (log: LogEntry) => void;
    onNavigateToManual: (code?: string) => void;
    onNavigateToNewFood: () => void;
    selectedDate: string;
}

type ScanState = 'scanning' | 'searching' | 'found' | 'not-found' | 'error';

interface ScannedProduct {
    code: string;
    name: string;
    brand: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url?: string;
}

// Dummy object to prevent null pointer exceptions during render if something slips through
const DUMMY_PRODUCT: ScannedProduct = {
    code: '000000',
    name: 'Cargando...',
    brand: '...',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
};

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onClose,
    onAddLog,
    onNavigateToManual,
    onNavigateToNewFood,
    selectedDate
}) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scanState, setScanState] = useState<ScanState>('scanning');

    // Initialize with DUMMY to be safe, though we check 'found' state
    const [product, setProduct] = useState<ScannedProduct>(DUMMY_PRODUCT);
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<string>('Desayuno');
    const [hasFlash, setHasFlash] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [mountNodeId] = useState(`reader-${Date.now()}`);

    // Robust cleanup to prevent memory leaks/blank screens on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(e => console.warn('Failed to stop scanner', e));
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    console.warn('Error clearing scanner', e);
                }
            }
        };
    }, []);

    useEffect(() => {
        if (scanState !== 'scanning') {
            // Stop scanning if we moved away from scanning state
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
            return;
        }

        const startScanner = async () => {
            // Artificial delay to ensure DOM is ready
            await new Promise(r => setTimeout(r, 150));

            try {
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(mountNodeId);
                }

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A]
                };

                await scannerRef.current.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => handleBarcodeDetected(decodedText),
                    () => { } // Ignore errors
                );

                // Flash check
                try {
                    const track = scannerRef.current.getRunningTrackCameraCapabilities();
                    // @ts-ignore
                    if (track?.torchFeature?.isSupported()) setHasFlash(true);
                } catch (e) { }

            } catch (err) {
                console.error("Scanner init error", err);
                setScanState('error');
            }
        };

        startScanner();
    }, [scanState, mountNodeId]);

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;
        try {
            await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: !isFlashOn }] } as any);
            setIsFlashOn(!isFlashOn);
        } catch (e) { console.error(e); }
    };

    const handleBarcodeDetected = async (barcode: string) => {
        if (scanState !== 'scanning') return;

        // 1. Debug Alert
        window.alert('Barcode detected: ' + barcode);
        if (navigator.vibrate) navigator.vibrate(200);

        setScanState('searching');

        // 2. Safety Timeout
        const safetyTimer = setTimeout(() => {
            console.warn("Safety Timeout Triggered");
            onNavigateToManual(barcode);
        }, 5000);

        try {
            // 3. Fallback API URL (Exact requested format)
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

            clearTimeout(safetyTimer);

            const data = await response.json();
            console.log('API Response:', data); // Log for debugging

            if ((data.status === 1 || data.status === 'success') && data.product) {
                const p = data.product;
                const newProduct: ScannedProduct = {
                    code: barcode,
                    name: p.product_name || 'Desconocido',
                    brand: p.brands || '',
                    // 4. Robust Optional Chaining
                    calories: p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0,
                    protein: p.nutriments?.proteins_100g || p.nutriments?.proteins || 0,
                    carbs: p.nutriments?.carbohydrates_100g || p.nutriments?.carbohydrates || 0,
                    fat: p.nutriments?.fat_100g || p.nutriments?.fat || 0,
                    image_url: p.image_front_small_url || p.image_front_url
                };

                setProduct(newProduct);
                setScanState('found');
            } else {
                setScanState('not-found');
            }

        } catch (error) {
            clearTimeout(safetyTimer);
            console.error("Fetch Error", error);
            // Don't crash, redirect or show error
            setScanState('not-found');
        }
    };

    const handleSave = () => {
        if (!product) return;
        const ratio = grams / 100;
        onAddLog({
            id: Date.now().toString(),
            date: selectedDate,
            foodId: `scanned-${product.code}`,
            foodName: `${product.name} ${product.brand ? `(${product.brand})` : ''}`,
            meal: mealType,
            grams,
            calculated: {
                calories: Math.round(product.calories * ratio),
                protein: Number((product.protein * ratio).toFixed(1)),
                carbs: Number((product.carbs * ratio).toFixed(1)),
                fat: Number((product.fat * ratio).toFixed(1))
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center">
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                    <Icons.Plus className="rotate-45" size={24} />
                </button>
                <h3 className="text-white font-bold text-lg drop-shadow-md">Escanear</h3>
                <div className="w-10" />
            </div>

            {scanState === 'scanning' && (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div id={mountNodeId} className="w-full h-full object-cover [&>video]:object-cover" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white/80 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-0.5 -ml-0.5 rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-0.5 -mr-0.5 rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-0.5 -ml-0.5 rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-0.5 -mr-0.5 rounded-br-xl" />
                        </div>
                    </div>
                    {hasFlash && (
                        <button onClick={toggleFlash} className={`absolute bottom-20 p-4 rounded-full ${isFlashOn ? 'bg-yellow-400' : 'bg-white/20 text-white'}`}>
                            <Icons.Sparkles size={24} className={isFlashOn ? 'fill-current' : ''} />
                        </button>
                    )}
                </div>
            )}

            {scanState === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold">Buscando...</p>
                </div>
            )}

            {/* 5. Conditional Rendering Wrapper */}
            {scanState === 'found' ? (
                product ? (
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-6 animate-in slide-in-from-bottom duration-300 z-30 h-[80vh] flex flex-col overflow-y-auto">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                        <div className="flex items-start gap-4 mb-6">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-100" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400"><Icons.Package size={32} /></div>
                            )}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 leading-tight">{product.name}</h2>
                                <p className="text-gray-500 font-medium">{product.brand}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{product.protein}g Prot</span>
                                    <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs font-bold border border-orange-100">{product.calories} kcal</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="text-center">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Kcal</p>
                                <p className="text-gray-800 font-black text-lg">{product.calories}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Prot</p>
                                <p className="text-protein font-black text-lg">{product.protein}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Carb</p>
                                <p className="text-carbs font-black text-lg">{product.carbs}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Grasa</p>
                                <p className="text-fat font-black text-lg">{product.fat}</p>
                            </div>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Cantidad (g)</label>
                                <input type="number" value={grams} onChange={(e) => setGrams(parseFloat(e.target.value) || 0)} className="w-full bg-gray-50 p-4 rounded-xl text-2xl font-bold text-gray-800" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Comida</label>
                                <div className="relative">
                                    <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl text-gray-800 appearance-none">
                                        {['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Pre-Entreno', 'Post-Entreno'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSave} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl mt-8 shadow-lg flex items-center justify-center gap-2">
                            <Icons.Check size={20} /> Registrar Comida
                        </button>
                        <button onClick={() => setScanState('scanning')} className="w-full py-4 text-gray-500 font-bold mt-2">Cancelar</button>
                    </div>
                ) : <div className="absolute inset-0 flex items-center justify-center bg-black/90"><p className="text-white">Rendering Error...</p></div>
            ) : null}

            {scanState === 'not-found' && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-8 z-30 flex flex-col items-center text-center pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4"><Icons.AlertCircle size={40} /></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No encontrado</h2>
                    <p className="text-gray-500 mb-6">No pudimos encontrar información de este producto.</p>

                    <button onClick={() => onNavigateToManual(product?.code)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold py-4 rounded-xl mb-3 flex items-center justify-center gap-3">
                        <Icons.Edit2 size={18} /> Registro Manual Rápido
                    </button>
                    <button onClick={onNavigateToNewFood} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3">
                        <Icons.Plus size={18} /> Añadir a mi NEVERA
                    </button>
                    <button onClick={() => setScanState('scanning')} className="w-full py-4 text-gray-400 mt-2">Intentar de nuevo</button>
                </div>
            )}
        </div>
    );
};

export default BarcodeScanner;
