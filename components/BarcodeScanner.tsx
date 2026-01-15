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
    // Unique ID for the scanner container
    const [mountNodeId] = useState(`reader-${Date.now()}`);

    // Refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isMountedRef = useRef(true);
    const processingScanRef = useRef(false);

    // State
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [product, setProduct] = useState<ScannedProduct | null>(null);
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<string>('Desayuno');
    const [hasFlash, setHasFlash] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);

    const cleanupScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Cleanup error:", err);
            }
            scannerRef.current = null;
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        processingScanRef.current = false;

        const startScanner = async () => {
            // Wait for mount node to be present in DOM (standard React rendering timing)
            const element = document.getElementById(mountNodeId);
            if (!element) {
                // If not ready, rely on next render or small natural delay. 
                // But typically in useEffect, the DOM is ready. 
                // We will try once after a microtask.
                await new Promise(r => setTimeout(r, 50));
            }

            if (!isMountedRef.current) return;

            // Simple cleanup of any previous instance
            await cleanupScanner();

            try {
                const html5QrCode = new Html5Qrcode(mountNodeId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 30,
                    qrbox: { width: 300, height: 150 },
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
                    focusMode: "continuous"
                };

                // DIRECT START - No timeouts, no pre-emptive errors. 
                // The browser will handle the permission prompt here.
                await html5QrCode.start(
                    constraints,
                    config,
                    (decodedText) => {
                        handleBarcodeDetected(decodedText);
                    },
                    (errorMessage) => {
                        // Scan error (frame didn't have barcode), ignore.
                    }
                );

                // Success
                try {
                    const track = html5QrCode.getRunningTrackCameraCapabilities();
                    // @ts-ignore
                    if (track && track.torchFeature && track.torchFeature.isSupported()) {
                        setHasFlash(true);
                    }
                } catch (e) { }

            } catch (err) {
                console.error("Camera start failed:", err);
                // ONLY set error if specifically rejected by the browser/lib
                if (isMountedRef.current && scanState === 'scanning') {
                    setScanState('error');
                }
            }
        };

        if (scanState === 'scanning') {
            startScanner();
        } else {
            cleanupScanner();
        }

        return () => {
            isMountedRef.current = false;
            cleanupScanner();
        };
    }, [scanState, mountNodeId]);

    const handleRetry = () => {
        setScanState('scanning');
    };

    const handleBarcodeDetected = async (barcode: string) => {
        if (processingScanRef.current || scanState !== 'scanning') return;
        processingScanRef.current = true;

        if (navigator.vibrate) navigator.vibrate(200);

        setScanState('searching');

        // Network Timeout
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current) {
                onNavigateToManual();
            }
        }, 6000);

        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            clearTimeout(timeoutId);
            const data = await response.json();

            if ((data.status === 1 || data.status === 'success') && data.product) {
                const p = data.product;
                const newProduct: ScannedProduct = {
                    code: barcode,
                    name: p.product_name || 'Producto Desconocido',
                    brand: p.brands || '',
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
            clearTimeout(timeoutId);
            setScanState('not-found');
        }
    };

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;
        try {
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: !isFlashOn }]
            } as any);
            setIsFlashOn(!isFlashOn);
        } catch (err) {
            console.error(err);
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
        onAddLog({
            id: Date.now().toString(),
            date: selectedDate,
            foodId: `scanned-${product.code}`,
            foodName: `${product.name} ${product.brand ? `(${product.brand})` : ''}`,
            meal: mealType,
            grams: grams,
            calculated
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                    <Icons.Plus className="rotate-45" size={24} />
                </button>
                <h3 className="text-white font-bold text-lg drop-shadow-md">Escanear Código</h3>
                <div className="w-10"></div>
            </div>

            {/* Scanning View */}
            <div className={`relative w-full h-full flex flex-col items-center justify-center bg-black ${scanState !== 'scanning' ? 'hidden' : ''}`}>
                <div id={mountNodeId} className="w-full h-full" />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="w-[320px] h-[170px] border-2 border-white/50 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
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
                        className={`absolute bottom-20 p-4 rounded-full transition-all z-20 ${isFlashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white backdrop-blur-md'}`}
                    >
                        <Icons.Sparkles size={24} className={isFlashOn ? 'fill-current' : ''} />
                    </button>
                )}
            </div>

            {/* Loading Overlay (Searching) */}
            {scanState === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-lg">Buscando...</p>
                </div>
            )}

            {/* Error Overlay */}
            {scanState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30 px-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                        <Icons.AlertCircle size={32} />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Error de Cámara</h3>
                    <p className="text-gray-400 mb-6">No se pudo acceder a la cámara. Por favor permite el acceso y reintenta.</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 bg-white/10 rounded-xl text-white font-bold hover:bg-white/20 transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleRetry} className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all">
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Product Found / Not Found results logic (same as before) */}
            {scanState === 'found' && product && (
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
            )}

            {scanState === 'not-found' && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-8 animate-in slide-in-from-bottom duration-300 z-30 flex flex-col items-center text-center pb-12">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
                        <Icons.AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
                    <p className="text-gray-500 mb-8 max-w-xs">El código de barras no existe en la base de datos pública.</p>

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
                            Reintentar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarcodeScanner;
