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

type ScanState = 'scanning' | 'searching' | 'found' | 'not-found';

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
    const mountNodeId = "reader-camera";
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [product, setProduct] = useState<ScannedProduct | null>(null);

    // Form State
    const [grams, setGrams] = useState<number>(100);
    const [mealType, setMealType] = useState<string>('Desayuno');

    useEffect(() => {
        // Basic Initialization - No custom delays, no try-catch error UI
        const initScanner = async () => {
            // Cleanup if exists
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch (e) { }
                scannerRef.current = null;
            }

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

            // Start immediately - Let browser handle permissions
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleBarcodeDetected(decodedText);
                },
                (errorMessage) => {
                    // Ignore frame parse errors
                }
            ).catch(err => {
                console.error("Scanner failed to start", err);
                // Intentionally NOT showing an error UI to the user
                // per request: "Do not show any custom messages"
            });
        };

        if (scanState === 'scanning') {
            initScanner();
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current.clear();
            }
        };
    }, [scanState]);

    const handleBarcodeDetected = async (barcode: string) => {
        if (scanState !== 'scanning') return;

        // Vibration
        if (navigator.vibrate) navigator.vibrate(200);

        setScanState('searching');

        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
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
            console.error(error);
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

            {/* Basic Container for Scanner - Only visible when 'scanning' */}
            <div
                id={mountNodeId}
                className={`w-full h-full ${scanState !== 'scanning' ? 'hidden' : ''}`}
            />

            {scanState === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="w-[300px] h-[150px] border-2 border-white/50 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        {/* Simple Viewfinder UI */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
                    </div>
                </div>
            )}

            {/* Loading */}
            {scanState === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-lg">Buscando...</p>
                </div>
            )}

            {/* Found Product UI */}
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

            {/* Not Found */}
            {scanState === 'not-found' && (
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] p-8 animate-in slide-in-from-bottom duration-300 z-30 flex flex-col items-center text-center pb-12">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
                        <Icons.AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
                    <div className="w-full space-y-3 mt-8">
                        <button
                            onClick={onNavigateToManual}
                            className="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-800 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                        >
                            <Icons.Edit2 size={18} />
                            Registro Manual
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
