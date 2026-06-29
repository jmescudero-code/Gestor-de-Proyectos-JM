import React from 'react';
import { useStore } from '../store/StoreContext';
import { CheckCircle2, CircleDashed, Clock, Briefcase, AlertCircle, AlertTriangle } from 'lucide-react';
import { getHealthStatus } from '../utils/health';

export const Dashboard: React.FC = () => {
  const { groups: allG, projects: allP, actions: allA, subtasks: allS, logs, allUsers } = useStore();
  const activeGroups = new Set(allG.filter(g => g.active !== false).map(g => g.id));
  const projects = allP.filter(p => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
  
  const activeProjects = new Set(projects.map(p => p.id));
  const actions = allA.filter(a => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));
  
  const activeActions = new Set(actions.map(a => a.id));
  const subtasks = allS.filter(s => s.active !== false && (!s.actionId || activeActions.has(s.actionId)));

  const getResponsibleName = (email: string) => {
      if (!email || typeof email !== 'string') return '-';
      try {
        const user = (allUsers || []).find(u => u?.email && String(u.email).toLowerCase() === email.toLowerCase());
        return user?.name || email;
      } catch(e) {
        return email;
      }
  };

  const getStatsFor = (items: any[]) => ({
    total: items.length,
    inProgress: items.filter(i => i.status === 'En curso').length,
    paused: items.filter(i => i.status === 'Pausado' || i.status === 'Aplazado').length,
    notStarted: items.filter(i => i.status === 'No iniciada').length,
    ready: items.filter(i => i.status === 'Listo').length,
  });

  const pStats = getStatsFor(projects);
  const aStats = getStatsFor(actions);
  const sStats = getStatsFor(subtasks);

  const StatBox = ({ title, stats }: { title: string, stats: any }) => (
    <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
       <h3 className="font-bold text-lg text-brand-dark mb-4">{title}</h3>
       <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-[8px]">
             <div className="text-2xl font-bold text-brand-dark">{stats.total}</div>
             <div className="text-xs text-gray-500 font-medium uppercase mt-1">Total</div>
          </div>
          <div className="p-3 bg-brand-light/10 rounded-[8px]">
             <div className="text-2xl font-bold text-brand-light">{stats.inProgress}</div>
             <div className="text-xs text-brand-light/70 font-bold uppercase mt-1">En Curso</div>
          </div>
          <div className="p-3 bg-gray-100 rounded-[8px]">
             <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
             <div className="text-xs text-gray-500 font-medium uppercase mt-1">Sin Iniciar</div>
          </div>
          <div className="p-3 bg-green-50 rounded-[8px]">
             <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
             <div className="text-xs text-green-600/70 font-bold uppercase mt-1">Listos</div>
          </div>
          <div className="p-3 bg-brand-orange/10 rounded-[8px]">
             <div className="text-2xl font-bold text-brand-orange">{stats.paused}</div>
             <div className="text-xs text-brand-orange/70 font-bold uppercase mt-1">Pausados</div>
          </div>
       </div>
    </div>
  );

  const recentLogs = [...logs].slice(0, 5);

  const getCriticalItems = () => {
     const critical: any[] = [];
     const checkItem = (item: any, typeName: string) => {
        const health = getHealthStatus(item);
        if (health.status === 'red') {
           critical.push({ ...item, typeName, healthReason: health.reason });
        }
     };
     projects.forEach(p => checkItem(p, 'Proyecto'));
     actions.forEach(a => checkItem(a, 'Acción'));
     subtasks.forEach(s => checkItem(s, 'Subtarea'));
     return critical;
  };

  const criticalItems = getCriticalItems();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Dashboard Ejecutivo</h2>
          <p className="text-gray-500 mt-1 font-medium text-sm">Visión rápida del estado general de la corporación</p>
        </div>
      </div>

      <div className="space-y-4">
        <StatBox title="Proyectos" stats={pStats} />
        <StatBox title="Acciones" stats={aStats} />
        <StatBox title="Subtareas" stats={sStats} />
      </div>

      {criticalItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[16px] p-6 shadow-sm">
           <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5" /> Alertas y sugerencias
           </h3>
           <div className="space-y-3">
              {criticalItems.slice(0, 5).map((item, idx) => (
                 <div key={`${item.id}-${idx}`} className="bg-white p-4 rounded-[8px] flex items-start gap-3 shadow-sm border border-red-100/50">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                       <p className="font-bold text-gray-800 text-sm">
                          {item.typeName} <span className="font-mono text-xs text-gray-500 mx-1">{item.code}</span> - {item.name}
                       </p>
                       <p className="text-sm text-gray-600 mt-1">
                          {item.healthReason}
                       </p>
                       {item.responsible && (
                          <p className="text-xs font-medium text-brand-light mt-2">
                             Responsable: {getResponsibleName(item.responsible)}
                          </p>
                       )}
                    </div>
                 </div>
              ))}
              {criticalItems.length > 5 && (
                 <p className="text-sm text-red-600 font-medium pt-2 text-center">
                    + {criticalItems.length - 5} elementos críticos adicionales
                 </p>
              )}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg text-brand-dark mb-4 filter drop-shadow-sm">Proyectos en curso</h3>
          <div className="space-y-4">
            {projects.filter(p => p.status === 'En curso').map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 hover:bg-brand-light/5 transition-colors rounded-[12px]">
                 <div>
                    <p className="font-semibold text-sm text-brand-dark">{p.code} - {p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Resp: {getResponsibleName(p.responsible || '')}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="w-24 bg-gray-200 rounded-[4px] h-2 overflow-hidden">
                     <div className="bg-brand-light h-2 rounded-[4px]" style={{width: `${p.progress}%`}}></div>
                   </div>
                   <span className="text-xs font-bold text-brand-dark">{p.progress}%</span>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg text-brand-dark mb-4">Actividad Reciente</h3>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-[12px]">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No hay registros de avance recientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map(log => {
                const entityName = log.entityType === 'project' ? projects.find(p => p.id === log.entityId)?.name :
                                  log.entityType === 'action' ? actions.find(a => a.id === log.entityId)?.name :
                                  subtasks.find(s => s.id === log.entityId)?.name;
                const d = new Date(log.date || log.createdAt?.toMillis?.() || Date.now());
                const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                return (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-[12px] border border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-brand-dark">{entityName}</span>
                      <span className="text-[10px] text-gray-500">{dateStr}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{log.text || log.finalText}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-2">{log.user}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
