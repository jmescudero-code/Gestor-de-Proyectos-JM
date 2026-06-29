import React from 'react';
import { useAuth } from '../AuthContext';
import { Network, LogIn, Lock } from 'lucide-react';

export const LoginScreen = () => {
    const { signIn } = useAuth();
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-gray">
            <div className="bg-white p-12 rounded-[24px] shadow-sm border border-gray-100 max-w-md w-full text-center">
                <div className="flex items-center justify-center mb-6">
                   <div className="bg-brand-medium/10 p-4 rounded-[16px]">
                       <Network className="w-12 h-12 text-brand-dark" />
                   </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Proyectos Grupamar</h1>
                <p className="text-gray-500 font-medium mb-8">Gestión operativa y seguimiento</p>
                
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
