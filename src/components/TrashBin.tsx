import React from 'react';
import { useStore } from '../store/StoreContext';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

export const TrashBin = () => {
    const { projects, actions, subtasks, users, groups, restoreEntity } = useStore() as any;
    
    // In StoreContext, we didn't export users, we exported allUsers
    const { allUsers } = useStore();

    const deletedGroups = groups.filter((g: any) => g.active === false);
    const deletedProjects = projects.filter((p: any) => p.active === false);
    const deletedActions = actions.filter((a: any) => a.active === false);
    const deletedSubtasks = subtasks.filter((s: any) => s.active === false);
    const deletedUsers = allUsers.filter((u: any) => u.active === false || u.status === 'Desactivado');

    const handleRestore = (type: string, id: string) => {
        restoreEntity(type, id);
    };

    const hasDeletedItems = deletedGroups.length > 0 || deletedProjects.length > 0 || deletedActions.length > 0 || deletedSubtasks.length > 0 || deletedUsers.length > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Papelera</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">Elementos eliminados que pueden ser restaurados.</p>
            </div>

            {!hasDeletedItems ? (
                <div className="bg-white p-10 rounded-[16px] text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium">La papelera está vacía.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {deletedGroups.length > 0 && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Grupos Eliminados</h3>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {deletedGroups.map((g: any) => (
                                    <li key={g.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div>
                                            <p className="font-bold text-brand-dark">{g.name}</p>
                                            <p className="text-xs text-gray-400">Eliminado por {g.deletedBy}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleRestore('group', g.id)} title="Restaurar" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            Restaurar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {deletedProjects.length > 0 && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Proyectos Eliminados</h3>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {deletedProjects.map((p: any) => (
                                    <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div>
                                            <p className="font-bold text-brand-dark">{p.name}</p>
                                            <p className="text-xs text-gray-400">Eliminado por {p.deletedBy}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleRestore('project', p.id)} title="Restaurar" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <RefreshCw className="w-4 h-4 mr-2"/> Restaurar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {deletedActions.length > 0 && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Acciones Eliminadas</h3>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {deletedActions.map((a: any) => (
                                    <li key={a.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div>
                                            <p className="font-bold text-brand-dark">{a.name}</p>
                                            <p className="text-xs text-gray-400">Eliminado por {a.deletedBy}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleRestore('action', a.id)} title="Restaurar" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <RefreshCw className="w-4 h-4 mr-2"/> Restaurar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {deletedSubtasks.length > 0 && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Subtareas Eliminadas</h3>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {deletedSubtasks.map((s: any) => (
                                    <li key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div>
                                            <p className="font-bold text-brand-dark">{s.name}</p>
                                            <p className="text-xs text-gray-400">Eliminado por {s.deletedBy}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleRestore('subtask', s.id)} title="Restaurar" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <RefreshCw className="w-4 h-4 mr-2"/> Restaurar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {deletedUsers.length > 0 && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Usuarios Desactivados</h3>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {deletedUsers.map((u: any) => (
                                    <li key={u.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                        <div>
                                            <p className="font-bold text-brand-dark">{u.name || u.email}</p>
                                            <p className="text-xs text-gray-400">Estado: {u.status}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleRestore('user', u.id)} title="Restaurar" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <RefreshCw className="w-4 h-4 mr-2"/> Reactivar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
