import React from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-[2rem] border border-white/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Help className="text-gray-800" size={24} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <Icons.Plus className="rotate-45" size={20} />
                    </button>
                </div>

                <div className="p-6 text-gray-600 leading-relaxed overflow-y-auto max-h-[75vh] custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
