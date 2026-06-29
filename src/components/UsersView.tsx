import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Button } from './ui/Button';
import { Plus, Mail, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

import { useStore } from '../store/StoreContext';

export const UsersView = () => {
    const { user } = useAuth();
    const { projects: allProjects, actions: allActions, subtasks: allSubtasks, deleteEntity } = useStore();
    const projects = allProjects.filter((p:any) => p.active !== false);
    const actions = allActions.filter((a:any) => a.active !== false);
    const subtasks = allSubtasks.filter((s:any) => s.active !== false);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'viewer', status: 'Pendiente de invitación' });
    const [deleteUser, setDeleteUser] = useState<{isOpen: boolean, id: string, name: string} | null>(null);

    useEffect(() => {
        if (user?.appRole !== 'admin') return;
        const unsub = onSnapshot(collection(db, 'users'), (snap) => {
           setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data()})));
        });
        return () => unsub();
    }, [user]);

    const handleRoleUpdate = async (id: string, newRole: string) => {
        await updateDoc(doc(db, 'users', id), { role: newRole });
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const updates: any = { status: newStatus };
        if (newStatus === 'Activo' || newStatus === 'Invitado') updates.active = true;
        if (newStatus === 'Desactivado') updates.active = false;
        await updateDoc(doc(db, 'users', id), updates);
    };

    const handleAddUser = async () => {
        if (!newUserForm.email || !newUserForm.name) return alert("Nombre y correo son obligatorios");
        
        try {
            await setDoc(doc(db, 'users', newUserForm.email.toLowerCase()), {
                email: newUserForm.email.toLowerCase(),
                name: newUserForm.name,
                role: newUserForm.role,
                status: newUserForm.status,
                active: false,
                createdAt: Date.now()
            });
            setShowAddForm(false);
            setNewUserForm({ name: '', email: '', role: 'viewer', status: 'Pendiente de invitación' });
        } catch(e) {
            console.error(e);
            alert("Error al agregar usuario");
        }
    };

    const handleInvite = async (id: string) => {
         await updateDoc(doc(db, 'users', id), { status: 'Invitado' });
         alert(`Se envió un correo de invitación a ${id} (simulación)`);
    };

    if (user?.appRole !== 'admin') {
        return <div className="p-8 text-center text-gray-500 font-medium">No tienes permisos para ver esta sección.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
                <div>
                  <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Usuarios</h2>
                  <p className="text-gray-500 text-sm mt-1 font-medium">Gestión de Accesos, Perfiles e Invitaciones</p>
                </div>
                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                </Button>
            </div>

            {showAddForm && (
                 <div className="bg-white p-6 rounded-[16px] shadow-sm border border-brand-light/30 space-y-4">
                     <h3 className="font-bold text-lg text-brand-dark">Agregar Nuevo Usuario</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <input 
                           type="text" placeholder="Nombre completo" 
                           value={newUserForm.name} onChange={e => setNewUserForm(prev => ({...prev, name: e.target.value}))}
                           className="border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-brand-light"
                         />
                         <input 
                           type="email" placeholder="Correo electrónico" 
                           value={newUserForm.email} onChange={e => setNewUserForm(prev => ({...prev, email: e.target.value}))}
                           className="border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-brand-light"
                         />
                         <select 
                           value={newUserForm.role} onChange={e => setNewUserForm(prev => ({...prev, role: e.target.value}))}
                           className="border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-brand-light bg-white"
                         >
                            <option value="viewer">Visualizador</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                         </select>
                         <select 
                           value={newUserForm.status} onChange={e => setNewUserForm(prev => ({...prev, status: e.target.value}))}
                           className="border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-brand-light bg-white"
                         >
                            <option value="Pendiente de invitación">Pendiente de invitación</option>
                            <option value="Invitado">Invitado</option>
                            <option value="Activo">Activo</option>
                            <option value="Desactivado">Desactivado</option>
                         </select>
                     </div>
                     <div className="flex justify-end gap-3 pt-2">
                         <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                         <Button onClick={handleAddUser}>Guardar Usuario</Button>
                     </div>
                 </div>
            )}

            <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100/80 text-gray-500">
                        <tr>
                            <th className="p-4 font-bold text-xs uppercase">Nombre / Email</th>
                            <th className="p-4 font-bold text-xs uppercase">Asignaciones</th>
                            <th className="p-4 font-bold text-xs uppercase">Rol</th>
                            <th className="p-4 font-bold text-xs uppercase">Estado</th>
                            <th className="p-4 font-bold text-xs uppercase text-right">Opciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm font-medium">
                        {usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="text-brand-dark font-bold">{u.name || '-'}</div>
                                    <div className="text-gray-500 text-xs">{u.email}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <div className="text-center" title="Proyectos"><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 rounded-full">{projects.filter(p => p.responsible === u.email || (p.secondary_responsibles && p.secondary_responsibles.includes(u.email))).length} P</span></div>
                                        <div className="text-center" title="Acciones"><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 rounded-full">{actions.filter(a => a.responsible === u.email || (a.secondary_responsibles && a.secondary_responsibles.includes(u.email))).length} A</span></div>
                                        <div className="text-center" title="Subtareas"><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 rounded-full">{subtasks.filter(s => s.responsible === u.email || (s.secondary_responsibles && s.secondary_responsibles.includes(u.email))).length} T</span></div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <select 
                                      value={u.role}
                                      onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                      className="border border-gray-200 rounded-[8px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-light text-sm"
                                    >
                                        <option value="pending">Sin asignar</option>
                                        <option value="viewer">Visualizador</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <select 
                                      value={u.status || 'Activo'}
                                      onChange={(e) => handleStatusUpdate(u.id, e.target.value)}
                                      className={`border border-gray-200 rounded-[8px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-light text-sm ${u.status === 'Desactivado' ? 'text-red-500 bg-red-50' : 'text-gray-700'}`}
                                    >
                                        <option value="Pendiente de invitación">Pendiente de invitación</option>
                                        <option value="Invitado">Invitado</option>
                                        <option value="Activo">Activo</option>
                                        <option value="Desactivado">Desactivado</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right flex justify-end items-center gap-1">
                                    <Button variant="ghost" className="text-xs" onClick={() => handleInvite(u.id)} title="Enviar invitación">
                                        <Mail className="w-4 h-4 text-brand-light" />
                                    </Button>
                                    <Button variant="ghost" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteUser({isOpen: true, id: u.id, name: u.name})} title="Eliminar/Desactivar">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {deleteUser && (
                <ConfirmModal
                    isOpen={deleteUser.isOpen}
                    title="Desactivar y Eliminar Usuario"
                    message={`¿Estás seguro de que deseas desactivar a ${deleteUser.name}? Perderá sus permisos de acceso.`}
                    onConfirm={async () => {
                        await deleteEntity('user', deleteUser.id, user?.email || '');
                        setDeleteUser(null);
                    }}
                    onCancel={() => setDeleteUser(null)}
                />
            )}
        </div>
    );
};
