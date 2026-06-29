import React from 'react';
import { useStore } from '../store/StoreContext';
import { StatusBadge } from './ui/Badge';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

import { useAuth } from '../AuthContext';

export const DecisionsView: React.FC = () => {
    const { groups: allG, decisions, projects: allP, actions: allA, subtasks: allS, allUsers } = useStore() as any;
    const { user } = useAuth();
    
    const activeGroups = new Set(allG.filter((g:any) => g.active !== false).map((g:any) => g.id));
    const projects = allP.filter((p:any) => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
    
    const activeProjects = new Set(projects.map((p:any) => p.id));
    const actions = allA.filter((a:any) => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));
    
    const activeActions = new Set(actions.map((a:any) => a.id));
    const subtasks = allS.filter((s:any) => s.active !== false && (!s.actionId || activeActions.has(s.actionId)));

    const getEntityInfo = (d: any) => {
        let entity = null;
        if (d.entityType === 'project') entity = projects.find(p => p.id === d.entityId);
        if (d.entityType === 'action') entity = actions.find(a => a.id === d.entityId);
        if (d.entityType === 'subtask') entity = subtasks.find(s => s.id === d.entityId);
        return entity ? `${entity.code} - ${entity.name}` : d.entityId;
    };

    const getResponsibleName = (email: string) => {
        if (!email) return '-';
        const u = allUsers?.find(u => u?.email && String(u.email).toLowerCase() === String(email).toLowerCase());
        return u?.name || email;
    };

    const markAsDecided = async (id: string) => {
        const text = prompt("Comentario de la decisión tomada:");
        if (text === null) return;
        await updateDoc(doc(db, 'decisions', id), {
            status: 'Decidida',
            decisionDate: new Date().toISOString().split('T')[0],
            comment: text
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Decisiones Pendientes</h2>
                <p className="text-gray-500 mt-1 font-medium text-sm">Registro de decisiones críticas para desbloquear el progreso de los proyectos.</p>
            </div>
            
            {decisions.length === 0 ? (
                <div className="bg-white p-10 rounded-[16px] text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium">No hay decisiones registradas actualmente.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100/80 text-gray-500">
                            <tr>
                                <th className="p-4 font-bold text-xs uppercase">Elemento</th>
                                <th className="p-4 font-bold text-xs uppercase">Decisión Requerida</th>
                                <th className="p-4 font-bold text-xs uppercase">Razón / Impacto</th>
                                <th className="p-4 font-bold text-xs uppercase">Estado</th>
                                <th className="p-4 font-bold text-xs uppercase text-right">Opciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm font-medium">
                            {decisions.map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="text-brand-dark font-bold">{getEntityInfo(d)}</div>
                                        <div className="text-gray-500 text-xs mt-1 uppercase tracker-wider">{d.entityType}</div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-brand-dark">{d.decisionRequired}</p>
                                        <p className="text-xs text-gray-400 mt-1">Solicitado el: {d.requestDate}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-gray-600 line-clamp-2 max-w-xs" title={d.reason}>{d.reason || '-'}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-xs font-bold ${d.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : d.status === 'Decidida' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {d.status !== 'Decidida' && user?.appRole !== 'viewer' && (
                                            <button onClick={() => markAsDecided(d.id)} className="p-2 text-brand-light hover:bg-brand-light/10 rounded-[8px] transition-colors" title="Informar decisión">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
