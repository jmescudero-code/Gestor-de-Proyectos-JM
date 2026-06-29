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
      <div className="p-8">
        <h1 className="text-3xl font-bold flex items-center gap-1.5 tracking-tight">
          <div className="grid grid-cols-2 gap-1 w-6 h-6 rotate-45 mr-1">
             <div className="bg-white rounded-[4px]"></div>
             <div className="bg-brand-light rounded-[4px]"></div>
             <div className="bg-brand-light rounded-[4px]"></div>
             <div className="bg-white rounded-[4px]"></div>
          </div>
          GrupaMar
        </h1>
        <p className="text-sm font-medium text-brand-light mt-2 ml-9">Proyectos Grupamar</p>
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
