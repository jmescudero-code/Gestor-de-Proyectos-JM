import React from 'react';
import { useStore } from '../store/StoreContext';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { getHealthStatus } from '../utils/health';
import { StatusBadge } from './ui/Badge';

export const WeeklyReview: React.FC = () => {
    const { groups: allG, projects: allP, actions: allA, subtasks: allS, allUsers, blockers, decisions } = useStore();
    const activeGroups = new Set(allG.filter(g => g.active !== false).map(g => g.id));
    const projects = allP.filter(p => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
    
    const activeProjects = new Set(projects.map(p => p.id));
    const actions = allA.filter(a => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));
    
    const activeActions = new Set(actions.map(a => a.id));
    const subtasks = allS.filter(s => s.active !== false && (!s.actionId || activeActions.has(s.actionId)));

    const getResponsibleName = (email: string) => {
        if (!email) return '-';
        const user = allUsers?.find(u => u?.email && String(u.email).toLowerCase() === String(email).toLowerCase());
        return user?.name || email;
    };

    const getItemsRequiringAttention = () => {
        const issues: any[] = [];
        
        const checkItem = (item: any, typeName: string) => {
            const health = getHealthStatus(item, blockers, decisions);
            if (health.status === 'red' || health.status === 'yellow') {
                issues.push({ ...item, typeName, health });
            }
        };

        projects.forEach(p => checkItem(p, 'Proyecto'));
        actions.forEach(a => checkItem(a, 'Acción'));
        subtasks.forEach(s => checkItem(s, 'Subtarea'));

        return issues.sort((a, b) => {
            if (a.health.status === 'red' && b.health.status !== 'red') return -1;
            if (a.health.status !== 'red' && b.health.status === 'red') return 1;
            return 0;
        });
    };

    const issues = getItemsRequiringAttention();

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Revisión Semanal</h2>
                <p className="text-gray-500 mt-1 font-medium text-sm">Elementos que requieren atención para asegurar la correcta ejecución del portfolio.</p>
            </div>

            {issues.length === 0 ? (
                <div className="bg-green-50 p-6 rounded-[16px] text-center justify-center flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                    <p className="text-lg font-bold text-green-800">¡Todo está al día!</p>
                    <p className="text-sm text-green-600 mt-1">No hay elementos que requieran revisión esta semana.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Elemento</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Responsable</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Salud</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Motivo</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {issues.map((item, index) => (
                                    <tr key={`${item.id}-${index}`} className="hover:bg-brand-light/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
                                                <span className="font-semibold text-brand-dark text-sm">{item.name}</span>
                                            </div>
                                            <div className="text-[10px] text-brand-light font-bold uppercase mt-1 tracking-wider">{item.typeName}</div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-600">
                                            {getResponsibleName(item.responsible)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full shadow-sm ${item.health.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-xs font-bold capitalize text-gray-600">{item.health.status === 'red' ? 'Crítico' : 'En riesgo'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-start gap-1.5">
                                                {item.health.status === 'red' ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
                                                <span className="text-sm text-gray-700 max-w-[250px] leading-snug">{item.health.reason}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={item.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
