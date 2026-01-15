import React from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface LoginProps {
    user: User | null;
}

const Login: React.FC<LoginProps> = ({ user }) => {

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    if (user) {
        return (
            <div className="flex flex-col items-center gap-4 p-6 bg-surface rounded-xl border border-surfaceHighlight">
                {user.photoURL && (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-16 h-16 rounded-full border-2 border-primary"
                    />
                )}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                    <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 w-full h-screen bg-[url('/login-bg-mobile.png')] md:bg-[url('/login-background-desktop.png')] bg-cover bg-center bg-no-repeat fixed top-0 left-0 z-50">
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />

            <div className="text-center space-y-2 relative z-10 p-6 rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl">
                <h1 className="text-4xl font-bold text-white drop-shadow-md font-['Outfit'] tracking-tight">Bienvenido</h1>
                <p className="text-gray-100 font-medium drop-shadow-sm">Inicia sesión para registrar tus macros</p>
            </div>

            <button
                onClick={handleLogin}
                className="relative z-10 flex items-center gap-3 px-8 py-4 bg-white text-gray-800 rounded-2xl hover:bg-gray-50 transition-all font-bold shadow-2xl hover:scale-105 active:scale-95 text-lg"
            >
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-6 h-6"
                />
                Inicia Sesión con Google
            </button>
        </div>
    );
};

export default Login;
