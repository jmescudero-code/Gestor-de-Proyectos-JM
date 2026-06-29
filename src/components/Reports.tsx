import React, { useState } from 'react';
import { StatusBadge } from './ui/Badge';
import { useStore } from '../store/StoreContext';
import { User, Calendar, Target, Activity, Filter } from 'lucide-react';

export const Reports: React.FC = () => {
  const { groups: allG, projects: allP, actions: allA, subtasks: allS, logs } = useStore();
  const activeGroups = new Set(allG.filter(g => g.active !== false).map(g => g.id));
  const projects = allP.filter(p => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
  
  const activeProjects = new Set(projects.map(p => p.id));
  const actions = allA.filter(a => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));
  
  const activeActions = new Set(actions.map(a => a.id));
  const subtasks = allS.filter(s => s.active !== false && (!s.actionId || activeActions.has(s.actionId)));
  const [userFilter, setUserFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');

  const mockUsers = [
    { name: 'Ana Torres', role: 'Operaciones', completed: 12, inProgress: 4 },
    { name: 'José Escudero', role: 'Administrador', completed: 8, inProgress: 9 },
    { name: 'Carlos Díaz', role: 'Calidad', completed: 3, inProgress: 2 }
  ];

  const uniqueUsers = Array.from(new Set(logs.map(l => l.user).filter(Boolean)));

  const filteredLogs = logs.filter(log => {
      const matchUser = userFilter ? log.user === userFilter : true;
      let matchWeek = true;
      if (weekFilter) {
          const date = new Date(log.createdAt?.seconds ? log.createdAt.seconds * 1000 : log.createdAt || new Date());
          const w = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7);
          matchWeek = w.toString() === weekFilter;
      }
      return matchUser && matchWeek;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Informes Ejecutivos</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Métricas y trazabilidad semanal</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-gray-50 rounded-[8px] p-1 border border-gray-200">
             <Filter className="w-4 h-4 text-gray-400 mx-2" />
             <select 
               className="bg-transparent border-none text-sm focus:outline-none font-medium text-gray-600 mr-2"
               value={userFilter} onChange={e => setUserFilter(e.target.value)}
             >
                <option value="">Todas las Personas</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
             <select 
               className="bg-transparent border-none text-sm focus:outline-none font-medium text-gray-600"
               value={weekFilter} onChange={e => setWeekFilter(e.target.value)}
             >
                <option value="">Todas las Semanas</option>
                <option value="9">S09</option>
                <option value="10">S10</option>
                <option value="11">S11</option>
                <option value="12">S12</option>
             </select>
          </div>
          <button 
            onClick={() => window.print()}
            className="h-10 px-4 py-2 bg-brand-dark text-white rounded-[8px] text-sm font-bold shadow-sm hover:bg-brand-dark/90 transition-colors"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
           <h3 className="flex items-center gap-2 font-bold text-brand-dark mb-4">
             <Target className="w-5 h-5 text-brand-light" /> Tareas Finalizadas W10
           </h3>
           <p className="text-4xl font-bold text-brand-dark">23</p>
           <p className="text-xs text-green-600 mt-2 font-bold">+15% comparado con la semana W09</p>
        </div>
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
           <h3 className="flex items-center gap-2 font-bold text-brand-dark mb-4">
             <Calendar className="w-5 h-5 text-brand-orange" /> Horas Reportadas
           </h3>
           <p className="text-4xl font-bold text-brand-dark">142h</p>
           <p className="text-xs text-gray-500 mt-2 font-medium">85% del tiempo útil estimado</p>
        </div>
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
           <h3 className="flex items-center gap-2 font-bold text-brand-dark mb-4">
             <Target className="w-5 h-5 text-red-500" /> Tareas en Riesgo
           </h3>
           <p className="text-4xl font-bold text-brand-dark">4</p>
           <p className="text-xs text-gray-500 mt-2 font-medium">Sin actualización en los últimos 7 días</p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-xl text-brand-dark flex items-center gap-2">
            <Activity className="w-5 h-5" /> Trazabilidad de Acciones (Log)
          </h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
           {filteredLogs.length === 0 && <div className="p-6 text-center text-gray-500 text-sm">No hay registros recientes.</div>}
           {filteredLogs.map((log) => (
             <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
               <div className="flex items-start justify-between">
                 <div>
                   <p className="text-sm font-bold text-brand-dark">{log.user}</p>
                   <p className="text-xs text-gray-500 font-medium capitalize mt-1">
                     Actualizó {log.entityType} • {new Date(log.createdAt?.seconds ? log.createdAt.seconds * 1000 : log.createdAt).toLocaleString()}
                   </p>
                 </div>
                 <div className="text-right">
                    <StatusBadge status={log.newStatus || 'En curso'} />
                    <p className="text-xs font-bold text-brand-light mt-1">Avance: {log.newProgress}%</p>
                 </div>
               </div>
               <div className="mt-4 p-4 bg-brand-gray/50 rounded-[12px] text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {log.finalText}
                  {log.blockers && (
                     <div className="mt-3 text-red-600">
                       <span className="font-bold">Bloqueo:</span> {log.blockers}
                     </div>
                  )}
                  {log.nextSteps && (
                     <div className="mt-2 text-brand-light">
                       <span className="font-bold">Próximos pasos:</span> {log.nextSteps}
                     </div>
                  )}
                  {log.attachments && log.attachments.length > 0 && (
                     <div className="mt-3 flex flex-wrap gap-2">
                       {log.attachments.map((att: any, i: number) => (
                         <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded text-brand-light hover:underline font-medium">
                           📎 {att.name}
                         </a>
                       ))}
                     </div>
                  )}
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
