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
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                <p className="text-gray-400">Sign in to track your macros</p>
            </div>

            <button
                onClick={handleLogin}
                className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-xl hover:bg-gray-100 transition-all font-medium shadow-lg shadow-white/5"
            >
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                />
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;
