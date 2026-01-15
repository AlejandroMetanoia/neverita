import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Icons } from './ui/Icons';
import { LogEntry } from '../types';

interface BarcodeScannerProps {
    onClose: () => void;
    onAddLog: (log: LogEntry) => void;
    onNavigateToManual: () => void;
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

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onClose,
    onAddLog,
    onNavigateToManual,
    onNavigateToNewFood,
    selectedDate
}) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [product, setProduct] = useState<ScannedProduct | null>(null);
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<string>('Desayuno');
    const [hasFlash, setHasFlash] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [mountNodeId] = useState(`reader-${Date.now()}`);

    // Cleanup function to stop camera
    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner", err);
            }
        }
    };

    useEffect(() => {
        // Only initialize scanner if we are in 'scanning' state
        if (scanState !== 'scanning') {
            stopScanner();
            return;
        }

        const initializeScanner = async () => {
            // Give the DOM a moment to render the div
            await new Promise(r => setTimeout(r, 100));

            try {
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(mountNodeId);
                }

                const config = {
                    fps: 30, // Increased FPS for faster scanning
                    qrbox: { width: 300, height: 150 }, // Rectangular box fits barcodes better
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.UPC_A
                    ]
                };

                const constraints = {
                    facingMode: "environment",
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    focusMode: "continuous" // Attempt to force autofocus
                };

                await scannerRef.current.start(
                    constraints,
                    config,
                    (decodedText) => {
                        handleBarcodeDetected(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore parse errors
                    }
                );

                // Check flash capability
                try {
                    const track = scannerRef.current.getRunningTrackCameraCapabilities();
                    // @ts-ignore
                    if (track && track.torchFeature && track.torchFeature.isSupported()) {
                        setHasFlash(true);
                    }
                } catch (e) {
                    console.warn("Flash capability check failed", e);
                }

            } catch (err) {
                console.error("Error starting scanner", err);
                setScanState('error');
            }
        };

        initializeScanner();

        return () => {
            stopScanner();
        };
    }, [scanState, mountNodeId]);

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;
        try {
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: !isFlashOn }]
            } as any);
            setIsFlashOn(!isFlashOn);
        } catch (err) {
            console.error("Error toggling flash", err);
        }
    };

    const handleBarcodeDetected = async (barcode: string) => {
        if (scanState !== 'scanning') return;

        // 1. Debug Alert (Safety Check)
        // window.alert('Barcode detected: ' + barcode); // Comment out for production/speed

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(200);

        setScanState('searching');

        // 2. Hardcoded Safety Timeout (5 seconds)
        const timeoutId = setTimeout(() => {
            console.warn("API Timeout - redirecting to manual");
            // Automatically redirect to manual entry if API hangs
            onNavigateToManual();
        }, 5000);

        try {
            // 3. Fallback API URL (.json)
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

            // Clear timeout if fetch succeeds
            clearTimeout(timeoutId);

            const data = await response.json();
            console.log('API Response:', data);

            // Robust check using optional chaining
            if ((data.status === 1 || data.status === 'success') && data.product) {
                const p = data.product;
                const newProduct: ScannedProduct = {
                    code: barcode,
                    name: p.product_name || 'Producto Desconocido',
                    brand: p.brands || '',
                    // Safety chain
                    calories: p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0,
                    protein: p.nutriments?.proteins_100g || p.nutriments?.proteins || 0,
                    carbs: p.nutriments?.carbohydrates_100g || p.nutriments?.carbohydrates || 0,
                    fat: p.nutriments?.fat_100g || p.nutriments?.fat || 0,
                    image_url: p.image_front_small_url || p.image_front_url
                };

                setProduct(newProduct);
                setScanState('found');
            } else {
                console.warn("Product not found in API");
                setScanState('not-found');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("API Error", error);
            setScanState('not-found');
        }
    };

    const handleSaveLog = () => {
        if (!product) return;

        const ratio = grams / 100;
        const calculated = {
            calories: Math.round(product.calories * ratio),
            protein: Number((product.protein * ratio).toFixed(1)),
            carbs: Number((product.carbs * ratio).toFixed(1)),
            fat: Number((product.fat * ratio).toFixed(1))
        };

        const newLog: LogEntry = {
            id: Date.now().toString(),
            date: selectedDate,
            foodId: `scanned-${product.code}`,
            foodName: `${product.name} ${product.brand ? `(${product.brand})` : ''}`,
            meal: mealType,
            grams: grams,
            calculated
        };

        onAddLog(newLog);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center">
            {/* Header/Close */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                    <Icons.Plus className="rotate-45" size={24} />
                </button>
                <h3 className="text-white font-bold text-lg drop-shadow-md">Escanear Código</h3>
                <div className="w-10" />
            </div>

            {/* Viewfinder Scope */}
            {scanState === 'scanning' && (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div id={mountNodeId} className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Modified Rectangular Frame for Barcodes */}
                        <div className="w-[320px] h-[170px] border-2 border-white/50 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden">
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-xl" />

                            {/* Red Scanning Line Animation */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                        <style>{`
                            @keyframes scan {
                                0% { top: 0%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { top: 100%; opacity: 0; }
                            }
                        `}</style>
                    </div>

                    {hasFlash && (
                        <button
                            onClick={toggleFlash}
                            className={`absolute bottom-20 p-4 rounded-full transition-all ${isFlashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white backdrop-blur-md'}`}
                        >
                            <Icons.Sparkles size={24} className={isFlashOn ? 'fill-current' : ''} />
                        </button>
                    )}
                </div>
            )}

            {/* Loading / Searching State */}
            {scanState === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-lg">Buscando producto...</p>
                </div>
            )}

            {/* Found Product Card - Render SAFELY using conditional rendering */}
            {scanState === 'found' ? (
                product ? (
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-6 animate-in slide-in-from-bottom duration-300 z-30 h-[80vh] flex flex-col overflow-y-auto">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                        <div className="flex items-start gap-4 mb-6">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 shadow-md" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400">
                                    <Icons.Package size={32} />
                                </div>
                            )}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{product.name}</h2>
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
                                <input
                                    type="number"
                                    value={grams}
                                    onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Comida</label>
                                <div className="relative">
                                    <select
                                        value={mealType}
                                        onChange={(e) => setMealType(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 font-medium appearance-none focus:outline-none focus:border-indigo-500"
                                    >
                                        {['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Pre-Entreno', 'Post-Entreno'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveLog}
                            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl mt-8 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Icons.Check size={20} />
                            Registrar Comida
                        </button>

                        <button
                            onClick={() => setScanState('scanning')}
                            className="w-full bg-transparent text-gray-500 font-bold py-4 rounded-xl mt-2 hover:text-gray-800 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    // Fallback if state is found but product is null (Shouldn't happen but safe)
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                        <p className="text-white">Cargando datos...</p>
                    </div>
                )
            ) : null}

            {/* Not Found View */}
            {scanState === 'not-found' && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-8 animate-in slide-in-from-bottom duration-300 z-30 flex flex-col items-center text-center pb-12">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
                        <Icons.AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
                    <p className="text-gray-500 mb-8 max-w-xs">El código de barras no existe en la base de datos pública o hubo un error.</p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={onNavigateToManual}
                            className="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-800 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                        >
                            <Icons.Edit2 size={18} />
                            Registro Manual Rápido
                        </button>
                        <button
                            onClick={onNavigateToNewFood}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
                        >
                            <Icons.Plus size={18} />
                            Añadir a mi NEVERA
                        </button>

                        <button
                            onClick={() => setScanState('scanning')}
                            className="w-full py-4 text-gray-400 font-medium hover:text-gray-600 transition-colors mt-2"
                        >
                            Intentar escanear de nuevo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarcodeScanner;
