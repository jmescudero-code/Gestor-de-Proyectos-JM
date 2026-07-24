import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { AlertCircle, Calendar, CalendarClock, Activity, CheckCircle2, ChevronRight, Clock, Plus } from 'lucide-react';
import { StatusBadge } from './ui/Badge';
import { EntityDetailModal } from './EntityDetailModal';
import { ProgressModal } from './ProgressModal';
import { getResponsibleName } from './ProjectList';

export const WeeklyReview: React.FC = () => {
    const { groups: allG, projects: allP, actions: allA, subtasks: allS, allUsers } = useStore();
    
    const [detailModal, setDetailModal] = useState<{isOpen: boolean, type: 'project' | 'action' | 'subtask', id: string} | null>(null);
    const [progressModal, setProgressModal] = useState<{isOpen: boolean, type: any, id: string, name: string, status: string, progress: number} | null>(null);

    // Filtrar elementos activos
    const activeGroups = new Set(allG.filter(g => g.active !== false).map(g => g.id));
    const projects = allP.filter(p => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
    const activeProjects = new Set(projects.map(p => p.id));
    const actions = allA.filter(a => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));
    const activeActions = new Set(actions.map(a => a.id));
    const subtasks = allS.filter(s => s.active !== false && (!s.actionId || activeActions.has(s.actionId)));

    // Obtener "Nodos Hoja" (Elementos sin hijos) para que sean accionables
    const leafNodes: any[] = [];
    
    subtasks.forEach(s => leafNodes.push({...s, typeName: 'subtask'}));
    
    actions.forEach(a => {
        const hasSubtasks = subtasks.some(s => s.actionId === a.id);
        if (!hasSubtasks) leafNodes.push({...a, typeName: 'action'});
    });
    
    projects.forEach(p => {
        const hasActions = actions.some(a => a.projectId === p.id);
        if (!hasActions) leafNodes.push({...p, typeName: 'project'});
    });

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const todayItems: any[] = [];
    const tomorrowItems: any[] = [];
    const overdueItems: any[] = [];

    leafNodes.forEach(item => {
        if (item.status === 'Listo' || item.status === 'Cancelado') return;
        
        const start = item.plannedStartDate || '';
        const end = item.plannedEndDate || '';
        
        if (!start && !end) return; // Ignorar sin fecha
        
        // Vencida
        if (end && end < todayStr) {
            overdueItems.push(item);
            return;
        }
        
        const isToday = (start <= todayStr && (!end || end >= todayStr));
        if (isToday) {
            todayItems.push(item);
            return;
        }
        
        const isTomorrow = (start <= tomorrowStr && (!end || end >= tomorrowStr));
        if (isTomorrow) {
            tomorrowItems.push(item);
        }
    });

    // Función auxiliar para ordenar priorizando la fecha de fin más cercana
    const sortByDate = (a: any, b: any) => {
        const dateA = a.plannedEndDate || '9999-12-31';
        const dateB = b.plannedEndDate || '9999-12-31';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        // Si la fecha de fin es igual, ordenar por fecha de inicio
        const startA = a.plannedStartDate || '9999-12-31';
        const startB = b.plannedStartDate || '9999-12-31';
        return startA.localeCompare(startB);
    };

    todayItems.sort(sortByDate);
    tomorrowItems.sort(sortByDate);
    overdueItems.sort(sortByDate);

    const ItemCard = ({ item }: { item: any }) => (
        <div 
            onClick={() => setDetailModal({ isOpen: true, type: item.typeName, id: item.id })}
            className="group bg-white border border-gray-100 rounded-[12px] p-4 hover:border-brand-light/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-light opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
                    <span className="text-[10px] uppercase font-bold text-brand-light tracking-wider">
                        {item.typeName === 'project' ? 'Proyecto' : item.typeName === 'action' ? 'Acción' : 'Subtarea'}
                    </span>
                </div>
                <StatusBadge status={item.status} />
            </div>
            
            <h4 className="font-bold text-brand-dark leading-tight mb-3 pr-8">{item.name}</h4>
            
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium mt-auto">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Inicio: {item.plannedStartDate ? new Date(item.plannedStartDate + 'T00:00:00').toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Fin: {item.plannedEndDate ? new Date(item.plannedEndDate + 'T00:00:00').toLocaleDateString() : '-'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2 w-20">
                     <div className="w-full bg-gray-100 rounded-full h-1.5">
                       <div className="bg-brand-light h-1.5 rounded-full" style={{width: `${item.progress}%`}}></div>
                     </div>
                     <span className="text-[10px] font-bold">{item.progress}%</span>
                   </div>
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); setProgressModal({ isOpen: true, type: item.typeName, id: item.id, name: item.name, status: item.status, progress: item.progress }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-brand-light/10 text-brand-light opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-light hover:text-white"
                title="Registrar Avance"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Foco Diario</h2>
                <p className="text-gray-500 mt-1 font-medium text-sm">Tu plan de acción para hoy y mañana.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PANEL HOY */}
                <div className="bg-blue-50/30 rounded-[20px] p-6 border border-blue-100/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500 text-white rounded-[10px] shadow-sm">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-brand-dark">Lo que toca hoy</h3>
                            <p className="text-xs text-gray-500 font-medium">Elementos activos para {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {todayItems.length === 0 ? (
                            <div className="text-center py-8 bg-white/50 rounded-[12px] border border-blue-50">
                                <CheckCircle2 className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                                <p className="text-sm font-bold text-blue-800">¡Todo al día!</p>
                                <p className="text-xs text-blue-600 mt-1">No hay tareas programadas para hoy.</p>
                            </div>
                        ) : (
                            todayItems.map(item => <ItemCard key={item.id} item={item} />)
                        )}
                    </div>
                </div>

                {/* PANEL MAÑANA */}
                <div className="bg-purple-50/30 rounded-[20px] p-6 border border-purple-100/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-500 text-white rounded-[10px] shadow-sm">
                            <CalendarClock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-brand-dark">Lo de mañana (Adelantar)</h3>
                            <p className="text-xs text-gray-500 font-medium">Elementos que puedes ir avanzando</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {tomorrowItems.length === 0 ? (
                            <div className="text-center py-8 bg-white/50 rounded-[12px] border border-purple-50">
                                <Calendar className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                                <p className="text-sm font-bold text-purple-800">Agenda libre</p>
                                <p className="text-xs text-purple-600 mt-1">No hay tareas programadas para mañana.</p>
                            </div>
                        ) : (
                            tomorrowItems.map(item => <ItemCard key={item.id} item={item} />)
                        )}
                    </div>
                </div>
            </div>

            {/* PANEL VENCIDAS */}
            {overdueItems.length > 0 && (
                <div className="bg-red-50/30 rounded-[20px] p-6 border border-red-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-red-500 text-white rounded-[10px] shadow-sm">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-red-800">Alertas / Vencidas</h3>
                            <p className="text-xs text-red-600 font-medium">Elementos cuya fecha límite ya pasó</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {overdueItems.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setDetailModal({ isOpen: true, type: item.typeName, id: item.id })}
                                className="bg-white border-l-4 border-l-red-500 rounded-[12px] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
                                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Vencida
                                    </span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm leading-tight mb-2 pr-6">{item.name}</h4>
                                <div className="text-xs font-medium text-gray-500">
                                    Responsable: {getResponsibleName(item.responsible, allUsers)}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setProgressModal({ isOpen: true, type: item.typeName, id: item.id, name: item.name, status: item.status, progress: item.progress }); }}
                                    className="absolute right-3 bottom-3 p-1.5 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                    title="Registrar Avance"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {detailModal && (
                <EntityDetailModal
                    isOpen={detailModal.isOpen}
                    onClose={() => setDetailModal(null)}
                    entityId={detailModal.id}
                    entityType={detailModal.type}
                />
            )}

            {progressModal && (
                <ProgressModal
                    isOpen={progressModal.isOpen}
                    onClose={() => setProgressModal(null)}
                    entityType={progressModal.type}
                    entityId={progressModal.id}
                    entityName={progressModal.name}
                    currentStatus={progressModal.status}
                    currentProgress={progressModal.progress}
                />
            )}
        </div>
    );
};
