import React from 'react';
import { useAuth } from '../AuthContext';
import { Network, LogIn, Lock } from 'lucide-react';

export const LoginScreen = () => {
    const { signIn } = useAuth();
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-gray">
            <div className="bg-white p-12 rounded-[24px] shadow-xl border border-gray-100 max-w-md w-full text-center">
                <div className="flex items-center justify-center mb-6">
                   <div className="relative">
                       <div className="absolute inset-0 bg-brand-light/20 blur-xl rounded-full"></div>
                       <svg className="w-24 h-24 relative z-10 filter drop-shadow-md" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="aura-login-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="50%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                            <linearGradient id="aura-login-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="50%" stopColor="#f43f5e" />
                              <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                          </defs>
                          {/* Outer Aura Swirl Rings */}
                          <circle cx="50" cy="50" r="40" stroke="url(#aura-login-grad-1)" strokeWidth="6" strokeLinecap="round" strokeDasharray="180 60" transform="rotate(-45 50 50)" />
                          <circle cx="50" cy="50" r="32" stroke="url(#aura-login-grad-2)" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="140 80" transform="rotate(65 50 50)" />
                          <circle cx="50" cy="50" r="24" stroke="url(#aura-login-grad-1)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="90 70" transform="rotate(180 50 50)" />
                          {/* Center stylized letter A */}
                          <path d="M43 60 L50 38 L57 60 M45.5 53 L54.5 53" stroke="url(#aura-login-grad-1)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                       </svg>
                   </div>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                  Aura<span className="text-brand-light">Tech</span>
                </h1>
                <p className="text-gray-500 font-bold text-sm tracking-wide uppercase mb-8">Humanizando la innovación</p>
                
                <button 
                  onClick={signIn}
                  className="w-full h-12 bg-brand-dark text-white rounded-[12px] font-bold flex items-center justify-center gap-2 hover:bg-brand-dark/90 transition-all font-sans text-sm"
                >
                   <LogIn className="w-5 h-5" />
                   Acceder con Google
                </button>
                
                <button 
                  onClick={() => {
                      localStorage.setItem('mockUser', 'admin');
                      window.location.reload();
                  }}
                  className="w-full mt-3 h-12 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-[12px] font-bold flex items-center justify-center gap-2 transition-all font-sans text-sm border border-gray-200"
                >
                   Acceso Desarrollador (Mock)
                </button>
            </div>
        </div>
    );
};

export const PendingApprovalScreen = () => {
    const { logOut, user } = useAuth();
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-gray">
            <div className="bg-white p-12 rounded-[24px] shadow-sm border border-gray-100 max-w-md w-full text-center">
                <div className="flex items-center justify-center mb-6">
                   <div className="bg-orange-50 p-4 rounded-[16px]">
                       <Lock className="w-12 h-12 text-orange-500" />
                   </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Acceso Restringido</h1>
                <p className="text-gray-600 font-medium mb-2">Tu cuenta corporativa ({user?.email}) se verificó correctamente.</p>
                <p className="text-gray-500 text-sm mb-8">Sin embargo, necesitas autorización de un administrador para ingresar. Por favor solicita tu alta.</p>
                
                <button 
                  onClick={logOut}
                  className="h-10 px-4 bg-gray-100 text-gray-700 rounded-[12px] font-bold hover:bg-gray-200 transition-all font-sans text-sm"
                >
                   Cerrar Sesión
                </button>
            </div>
        </div>
    );
};
