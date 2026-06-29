import React from 'react';
import { LayoutDashboard, ListTodo, FileBarChart, GanttChartSquare, UploadCloud, Users, LogOut, CalendarCheck, HelpCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (v: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { user, logOut } = useAuth();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Proyectos', icon: ListTodo },
    { id: 'gantt', label: 'Vista Gantt', icon: GanttChartSquare },
    { id: 'revision', label: 'Revisión Semanal', icon: CalendarCheck },
    { id: 'decisions', label: 'Decisiones', icon: HelpCircle },
    { id: 'reports', label: 'Informes', icon: FileBarChart },
    { id: 'imports', label: 'Importación', icon: UploadCloud }
  ];

  if (user?.appRole === 'admin') {
      navItems.push({ id: 'users', label: 'Usuarios', icon: Users });
      navItems.push({ id: 'trash', label: 'Papelera', icon: Trash2 });
  }

  return (
    <div className="w-64 bg-brand-dark text-white h-screen flex flex-col fixed left-0 top-0 rounded-r-[16px] shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="aura-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="aura-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            {/* Outer Aura Swirl Rings */}
            <circle cx="50" cy="50" r="40" stroke="url(#aura-grad-1)" strokeWidth="6" strokeLinecap="round" strokeDasharray="180 60" transform="rotate(-45 50 50)" />
            <circle cx="50" cy="50" r="32" stroke="url(#aura-grad-2)" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="140 80" transform="rotate(65 50 50)" />
            <circle cx="50" cy="50" r="24" stroke="url(#aura-grad-1)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="90 70" transform="rotate(180 50 50)" />
            {/* Center stylized letter A */}
            <path d="M43 60 L50 38 L57 60 M45.5 53 L54.5 53" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
              Aura<span className="text-brand-light">Tech</span>
            </h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 leading-tight">
              Humanizando la innovación
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] font-medium transition-colors ${currentView === item.id ? 'bg-brand-light text-white' : 'text-gray-300 hover:bg-white/10'}`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-white/10 bg-black/10">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4 text-left">
             <div className="w-10 h-10 rounded-[12px] bg-brand-orange flex items-center justify-center font-bold text-sm text-white">
               {user?.email?.charAt(0).toUpperCase() || 'U'}
             </div>
             <div className="text-sm leading-tight max-w-[120px]">
               <p className="font-semibold text-white truncate" title={user?.email || ''}>{user?.email?.split('@')[0] || 'Usuario'}</p>
               <p className="text-brand-light text-xs font-medium uppercase tracking-wide truncate">{user?.appRole}</p>
             </div>
           </div>
           <button onClick={logOut} className="text-gray-400 hover:text-white transition-colors" title="Cerrar sesión">
             <LogOut className="w-5 h-5"/>
           </button>
        </div>
      </div>
    </div>
  );
}
