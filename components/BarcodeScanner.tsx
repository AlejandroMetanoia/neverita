import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Icons } from './ui/Icons';
import { LogEntry } from '../types';
import { MEAL_TYPES } from '../constants';

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

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onClose,
    onAddLog,
    onNavigateToManual,
    onNavigateToNewFood,
    selectedDate
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserMultiFormatReader | null>(null);

    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [product, setProduct] = useState<ScannedProduct | null>(null);

    // Form states
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<string>('Desayuno');

    // Initialize ZXing Reader
    useEffect(() => {
        if (scanState !== 'scanning') return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.UPC_A
        ]);

        codeReader.current = new BrowserMultiFormatReader(hints);

        codeReader.current.decodeFromVideoDevice(
            undefined, // undefined = user preference / default (usually back camera on mobile if 'environment' not explicit in this method, but ZXing tries smart)
            videoRef.current!,
            (result, err) => {
                if (result) {
                    handleBarcodeDetected(result.getText());
                }
                // We ignore errors for continuous scanning
            }
        ).catch(err => {
            console.error("ZXing Init Error:", err);
            setScanState('error');
        });

        return () => {
            if (codeReader.current) {
                codeReader.current.reset(); // Stops camera
            }
        };
    }, [scanState]); // Re-run only if we go back to scanning

    const stopCamera = () => {
        if (codeReader.current) {
            codeReader.current.reset();
        }
    };

    const handleBarcodeDetected = async (barcode: string) => {
        // Stop scanning immediately on detection
        stopCamera();

        // Haptic & Visual Feedback
        if (navigator.vibrate) navigator.vibrate(200);

        setScanState('searching');
        console.log("Barcode Detected:", barcode);

        try {
            // Speed over Saftey: Direct Fetch
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            const data = await response.json();

            if ((data.status === 1 || data.status === 'success') && data.product) {
                const p = data.product;

                setProduct({
                    code: barcode,
                    name: p.product_name || 'Producto Desconocido',
                    brand: p.brands || '',
                    calories: p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0,
                    protein: p.nutriments?.proteins_100g || 0,
                    carbs: p.nutriments?.carbohydrates_100g || 0,
                    fat: p.nutriments?.fat_100g || 0,
                    image_url: p.image_front_small_url || p.image_front_url
                });

                setScanState('found');
            } else {
                setProduct({
                    code: barcode,
                    name: 'Unknown',
                    brand: '',
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                }); // Pass barcode to 'not found' view logic via product state if needed or just use param
                setScanState('not-found');
            }

        } catch (error) {
            console.error("Fetch API Error:", error);
            // Even on error, we offer the manual path
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

    // Close handler ensuring camera stops
    const handleClose = () => {
        stopCamera();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={handleClose} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                    <Icons.Plus className="rotate-45" size={24} />
                </button>
                <h3 className="text-white font-bold text-lg drop-shadow-md tracking-wide">Escanear Barcode</h3>
                <div className="w-10" />
            </div>

            {/* SCANNING STATE & VIEWFINDER */}
            <div className={`relative w-full h-full flex items-center justify-center bg-black ${scanState !== 'scanning' ? 'hidden' : ''}`}>
                {/* The actual video element */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(1)' }} // Sometimes mirroring is needed, but usually not for back camera
                />

                {/* Professional Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="relative w-72 h-48 border-2 border-white/50 rounded-2xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 z-10"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 z-10"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 z-10"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 z-10"></div>

                        {/* Red Laser Animation */}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_infinite_linear]"></div>
                    </div>
                    <p className="text-white/80 mt-8 font-medium text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                        Alinea el código dentro del marco
                    </p>
                </div>
            </div>

            {/* SEARCHING STATE */}
            {scanState === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-xl animate-pulse">Buscando producto...</p>
                </div>
            )}

            {/* FOUND STATE */}
            {scanState === 'found' && product && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-6 animate-in slide-in-from-bottom duration-300 z-30 h-[85vh] flex flex-col overflow-y-auto">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                    <div className="flex items-start gap-4 mb-6">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 shadow-sm border border-gray-100" />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400">
                                <Icons.Package size={32} />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{product.name}</h2>
                            <p className="text-gray-500 font-medium mb-2">{product.brand}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold border border-blue-100">{Math.round(product.protein)}g Prot</span>
                                <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold border border-orange-100">{Math.round(product.calories)} kcal</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {/* Macros Grid */}
                        <div className="text-center">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Kcal</p>
                            <p className="text-gray-800 font-black text-lg">{Math.round(product.calories)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Prot</p>
                            <p className="text-protein font-black text-lg">{product.protein}g</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Carb</p>
                            <p className="text-carbs font-black text-lg">{product.carbs}g</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Grasa</p>
                            <p className="text-fat font-black text-lg">{product.fat}g</p>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Cantidad (g)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={grams}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-gray-800 focus:outline-none focus:border-red-500 transition-colors font-mono"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">g</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Comida</label>
                            <div className="relative">
                                <select
                                    value={mealType}
                                    onChange={(e) => setMealType(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 font-medium appearance-none focus:outline-none focus:border-red-500 transition-colors"
                                >
                                    {MEAL_TYPES.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-auto space-y-3">
                        <button
                            onClick={handleSave}
                            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            <Icons.Check size={20} />
                            Registrar Comida
                        </button>

                        <button
                            onClick={() => setScanState('scanning')}
                            className="w-full bg-transparent text-gray-400 font-semibold py-3 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* NOT FOUND STATE */}
            {scanState === 'not-found' && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-8 animate-in slide-in-from-bottom duration-300 z-30 flex flex-col items-center text-center pb-12">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-sm">
                        <Icons.AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
                    <p className="text-gray-500 mb-8 max-w-xs leading-relaxed">
                        Este código no está en nuestra base de datos.
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={() => onNavigateToManual(product?.code)}
                            className="w-full bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-800 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <Icons.Edit2 size={18} className="text-gray-400" />
                            Registro Manual Rápido
                        </button>
                        <button
                            onClick={onNavigateToNewFood}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <Icons.Plus size={18} />
                            Añadir a mi NEVERA
                        </button>

                        <button
                            onClick={() => setScanState('scanning')}
                            className="w-full py-4 text-gray-400 font-medium hover:text-gray-600 transition-colors mt-2"
                        >
                            Escanear otro código
                        </button>
                    </div>
                </div>
            )}

            {/* Global Styles for Laser Animation */}
            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;
