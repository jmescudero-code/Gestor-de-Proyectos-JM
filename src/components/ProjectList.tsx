import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { ChevronRight, ChevronDown, Plus, Play, Pause, Check, AlertCircle, Search, Filter, Clock, Activity, Trash2, Edit2 } from 'lucide-react';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/Badge';
import { Project, Action, Subtask } from '../types';
import { ProgressModal } from './ProgressModal';
import { EntityFormModal } from './EntityFormModal';
import { EntityDetailModal } from './EntityDetailModal';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../AuthContext';
import { getHealthStatus } from '../utils/health';
import { HealthBadge } from './HealthBadge';

const isDelayed = (updatedAt: any, status: string) => {
  if (status !== 'En curso') return false;
  if (!updatedAt) return false;
  try {
    const lastUpdate = typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : new Date(updatedAt);
    if (!lastUpdate || isNaN(lastUpdate.getTime())) return false;
    const diffDays = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    return diffDays > 7;
  } catch (e) {
    return false;
  }
};

const isOverdue = (plannedEndDate: string | Date | any, status: string) => {
  if (status === 'Listo' || status === 'Cancelado') return false;
  if (!plannedEndDate) return false;
  try {
    const endDate = typeof plannedEndDate.toDate === 'function' ? plannedEndDate.toDate() : new Date(plannedEndDate);
    if (!endDate || isNaN(endDate.getTime())) return false;
    return new Date().getTime() > endDate.getTime() + 86400000; // Adding 1 day of grace
  } catch (e) {
    return false;
  }
};

const formatDateObj = (dateVal: any) => {
  if (!dateVal) return '-';
  try {
    const d = typeof dateVal.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (!d || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  } catch (e) {
    return '-';
  }
};

export const getResponsibleName = (email: string, allUsers: any[]) => {
    if (!email || typeof email !== 'string') return '-';
    try {
      const user = (allUsers || []).find(u => u?.email && String(u.email).toLowerCase() === email.toLowerCase());
      return user?.name || email;
    } catch (e) {
      return email;
    }
};

export const sortEntities = (a: any, b: any) => {
  const codeA = String(a.code || '').split('.').map(n => isNaN(Number(n)) ? 0 : Number(n));
  const codeB = String(b.code || '').split('.').map(n => isNaN(Number(n)) ? 0 : Number(n));
  
  for (let i = 0; i < Math.max(codeA.length, codeB.length); i++) {
    const numA = codeA[i] || 0;
    const numB = codeB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
};

export const ProjectList: React.FC = () => {
  const { groups, projects, actions, subtasks, allUsers, deleteEntity } = useStore();
  const { user } = useAuth();
  const [modalData, setModalData] = useState<{isOpen: boolean, type: 'project' | 'action' | 'subtask', id: string, name: string, status: string, progress: number} | null>(null);
  const [formModal, setFormModal] = useState<{isOpen: boolean, type: 'project' | 'action' | 'subtask', parentId?: string, entityToEdit?: any} | null>(null);
  const [detailModal, setDetailModal] = useState<{isOpen: boolean, type: 'project' | 'action' | 'subtask', id: string} | null>(null);
  const [deleteData, setDeleteData] = useState<{isOpen: boolean, type: 'project' | 'action' | 'subtask' | 'group', id: string, name: string} | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);

  const activeProjects = projects.filter(p => p.active !== false);
  const activeActions = actions.filter(a => a.active !== false);
  const activeSubtasks = subtasks.filter(s => s.active !== false);

  const filterItem = (item: any) => {
    if (item.active === false) return false;
    const respName = getResponsibleName(item.responsible || '', allUsers || []);
    const safeName = item.name ? String(item.name).toLowerCase() : '';
    const safeCode = item.code ? String(item.code).toLowerCase() : '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = safeName.includes(term) || 
                          safeCode.includes(term) || 
                          respName.toLowerCase().includes(term) ||
                          String(item.responsible || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    const matchesDelayed = showDelayedOnly ? isDelayed(item.updatedAt, item.status) : true;
    return matchesSearch && matchesStatus && matchesDelayed;
  };

  const openModal = (type: any, id: string, name: string, status: string, progress: number) => {
    setModalData({ isOpen: true, type, id, name, status, progress });
  };

  const openFormModal = (type: 'project' | 'action' | 'subtask', parentId?: string, entityToEdit?: any) => {
    setFormModal({ isOpen: true, type, parentId, entityToEdit });
  };

  const openDetailModal = (type: 'project' | 'action' | 'subtask', id: string) => {
    setDetailModal({ isOpen: true, type, id });
  };

  const openDeleteModal = (type: 'project' | 'action' | 'subtask' | 'group', id: string, name: string) => {
    setDeleteData({ isOpen: true, type, id, name });
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Lista de Proyectos</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Estructura Jerárquica y Seguimiento</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-[8px] focus:outline-none focus:ring-1 focus:ring-brand-light"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-[8px] focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="En curso">En curso</option>
            <option value="Pausado">Pausado</option>
            <option value="No iniciada">No iniciada</option>
            <option value="Listo">Listo</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-[8px] border border-gray-200 cursor-pointer">
            <input type="checkbox" checked={showDelayedOnly} onChange={e => setShowDelayedOnly(e.target.checked)} />
            Atrasados
          </label>
          {user?.appRole !== 'viewer' && (
             <Button onClick={() => openFormModal('project')} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Proyecto</Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex text-xs font-bold text-gray-500 uppercase tracking-wide px-4 pb-2 border-b border-gray-100">
           <div className="w-[3rem]"></div>
           <div className="w-16">Código</div>
           <div className="flex-1">Nombre / Tema</div>
           <div className="w-12 text-center">Salud</div>
           <div className="w-32">Responsable</div>
           <div className="w-24">Inicio</div>
           <div className="w-24">Fin</div>
           <div className="w-32">Estado</div>
           <div className="w-40">Avance</div>
           <div className="w-12"></div>
        </div>
        
        {(() => {
          const activeGroupsList = groups.filter(g => g.active !== false);
          return (
            <>
              {activeGroupsList.map(group => (
                <GroupSection key={group.id} group={group} onOpenModal={openModal} onOpenForm={openFormModal} onOpenDetail={openDetailModal} onDeleteModal={openDeleteModal} userRole={user?.appRole} filterItem={filterItem} />
              ))}
              
              {/* Show unassigned projects or when no groups exist */}
              {projects.some(p => p.active !== false && !p.groupId && filterItem(p)) && (
                <GroupSection 
                  key="unassigned" 
                  group={{ id: '', name: 'Proyectos Generales', active: true, priority: 'Media', description: 'Proyectos sin agrupación' } as any} 
                  onOpenModal={openModal} onOpenForm={openFormModal} onOpenDetail={openDetailModal} onDeleteModal={openDeleteModal} userRole={user?.appRole} filterItem={filterItem} 
                />
              )}
            </>
          );
        })()}
        
      </div>

      {modalData && (
        <ProgressModal
          isOpen={modalData.isOpen}
          onClose={() => setModalData(null)}
          entityType={modalData.type}
          entityId={modalData.id}
          entityName={modalData.name}
          currentStatus={modalData.status}
          currentProgress={modalData.progress}
        />
      )}

      {formModal && (
        <EntityFormModal 
          isOpen={formModal.isOpen} 
          onClose={() => setFormModal(null)} 
          type={formModal.type}
          parentId={formModal.parentId}
          entityToEdit={formModal.entityToEdit}
        />
      )}
      {detailModal && (
        <EntityDetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(null)}
          entityId={detailModal.id}
          entityType={detailModal.type}
        />
      )}

      {deleteData && (
        <ConfirmModal
          isOpen={deleteData.isOpen}
          title="Confirmar Eliminación"
          message={`¿Estás seguro que deseas eliminar: "${deleteData.name}"?`}
          onConfirm={async () => {
            await deleteEntity(deleteData.type, deleteData.id, user?.email || '');
            setDeleteData(null);
          }}
          onCancel={() => setDeleteData(null)}
        />
      )}
    </div>
  );
};

const GroupSection: React.FC<{ group: any, onOpenModal: any, onOpenForm: any, onOpenDetail: any, onDeleteModal: any, userRole: any, filterItem: (i:any)=>boolean }> = ({ group, onOpenModal, onOpenForm, onOpenDetail, onDeleteModal, userRole, filterItem }) => {
  const { projects, actions, subtasks } = useStore();
  const groupProjects = projects.filter(p => (p.groupId === group.id || (!p.groupId && !group.id)) && p.active !== false).sort(sortEntities);
  const hasVisibleProject = groupProjects.some(p => {
     if (filterItem(p)) return true;
     const projActions = actions.filter(a => a.projectId === p.id && a.active !== false);
     return projActions.some(a => {
        if (filterItem(a)) return true;
        const actSubtasks = subtasks.filter(s => s.actionId === a.id && s.active !== false);
        return actSubtasks.some(s => filterItem(s));
     });
  });

  const [expanded, setExpanded] = useState(true);

  if (!hasVisibleProject && groupProjects.length > 0) return null;

  return (
    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
      <div 
        className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown className="w-5 h-5 text-brand-dark" /> : <ChevronRight className="w-5 h-5 text-brand-dark"/>}
          <h3 className="font-bold text-xl text-brand-dark">{group.name}</h3>
        </button>
        <div className="flex items-center gap-2">
            <span className="bg-white px-3 py-1 rounded-[8px] text-xs font-bold text-brand-dark border border-gray-200 shadow-sm">
              {groupProjects.length} Proyectos
            </span>
            {userRole !== 'viewer' && group.name !== 'Largo plazo' && group.name !== 'Corto plazo' && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteModal('group', group.id, group.name); }}
                className="p-1.5 rounded-[8px] hover:bg-red-50 text-red-500 transition-colors"
                title="Eliminar Grupo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {groupProjects.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm font-medium">No hay proyectos en este grupo.</div>
          ) : (
            groupProjects.map(proj => <ProjectRow key={proj.id} project={proj} onOpenModal={onOpenModal} onOpenForm={onOpenForm} onOpenDetail={onOpenDetail} onDeleteModal={onDeleteModal} userRole={userRole} filterItem={filterItem} />)
          )}
        </div>
      )}
    </div>
  );
};

const ProjectRow: React.FC<{ project: any, onOpenModal: any, onOpenForm: any, onOpenDetail: any, onDeleteModal: any, userRole: any, filterItem: (i:any)=>boolean }> = ({ project, onOpenModal, onOpenForm, onOpenDetail, onDeleteModal, userRole, filterItem }) => {
  const { actions, subtasks, allUsers, deleteEntity } = useStore();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const projActions = actions.filter(a => a.projectId === project.id && a.active !== false).sort(sortEntities);
  const showDelayAlert = isDelayed(project.updatedAt, project.status);

  const hasVisibleAction = projActions.some(a => {
     if (filterItem(a)) return true;
     const actSubtasks = subtasks.filter(s => s.actionId === a.id);
     return actSubtasks.some(s => filterItem(s));
  });

  if (!filterItem(project) && !hasVisibleAction && projActions.length > 0) return null;

  return (
    <div>
      <div className="flex items-center p-4 hover:bg-brand-light/5 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-[2.5rem] p-1 text-gray-400">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
        <div className="w-16 font-mono font-medium text-sm text-gray-500">{project.code}</div>
        <div className="flex-1 font-bold text-brand-dark flex items-center gap-2">
           {project.name}
           {showDelayAlert && <AlertCircle className="w-4 h-4 text-red-500" title="Sin actividad reciente (> 7 días)" />}
        </div>
        <div className="w-12 flex justify-center"><HealthBadge result={getHealthStatus(project)} /></div>
        <div className="w-32 text-sm font-medium text-gray-600 truncate" title={(project.secondary_responsibles || []).map((e:string) => getResponsibleName(e, allUsers || [])).join(', ')}>
           {getResponsibleName(project.responsible || '', allUsers || [])}
           {project.secondary_responsibles && project.secondary_responsibles.length > 0 && <span className="ml-1 text-xs text-brand-orange font-bold">(+{project.secondary_responsibles.length})</span>}
        </div>
        <div className="w-24 text-xs font-medium text-gray-500">{formatDateObj(project.plannedStartDate)}</div>
        <div className="w-24 text-xs font-medium flex items-center gap-1">
           {isOverdue(project.plannedEndDate, project.status) ? (
               <span className="text-red-500 flex items-center gap-1" title="Proyecto vencido"><Clock className="w-3 h-3" /> {formatDateObj(project.plannedEndDate)}</span>
           ) : (
               <span className="text-gray-500">{formatDateObj(project.plannedEndDate)}</span>
           )}
        </div>
        <div className="w-32"><StatusBadge status={project.status} /></div>
        <div className="w-32 flex items-center gap-3 pr-4">
          <div className="w-full bg-gray-200 rounded-[4px] h-2">
            <div className="bg-brand-light h-2 rounded-[4px]" style={{width: `${project.progress}%`}}></div>
          </div>
          <span className="text-xs font-bold text-brand-dark w-8 text-right">{project.progress}%</span>
        </div>
        <div className="w-12 flex justify-end gap-1 pr-4">
           {userRole !== 'viewer' && (
              <>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenDetail('project', project.id); }}
                   className="p-1.5 rounded-[8px] hover:bg-brand-light/10 text-brand-light transition-colors" 
                   title="Ver Detalles"
                 >
                   <Activity className="w-4 h-4"/>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenForm('project', undefined, project); }}
                   className="p-1.5 rounded-[8px] hover:bg-gray-100 text-gray-500 transition-colors" 
                   title="Editar"
                 >
                   <Edit2 className="w-4 h-4"/>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenModal('project', project.id, project.name, project.status, project.progress); }}
                   className="p-1.5 rounded-[8px] hover:bg-brand-orange/10 text-brand-orange transition-colors" 
                   title="Registrar Avance"
                 >
                   <Plus className="w-4 h-4"/>
                 </button>
                 <button
                   onClick={(e) => { e.stopPropagation(); onDeleteModal('project', project.id, project.name); }}
                   className="p-1.5 rounded-[8px] hover:bg-red-50 text-red-500 transition-colors"
                   title="Eliminar"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </>
           )}
        </div>
      </div>
      {expanded && (
        <div className="bg-gray-50/50 border-y border-gray-100 divide-y divide-gray-100">
          {projActions.length === 0 ? (
             <div className="pl-[5.5rem] p-4 text-sm font-medium text-gray-500">Sin acciones registradas.</div>
          ) : (
             projActions.map(act => <ActionRow key={act.id} action={act} onOpenModal={onOpenModal} onOpenForm={onOpenForm} onOpenDetail={onOpenDetail} onDeleteModal={onDeleteModal} userRole={userRole} filterItem={filterItem} />)
          )}
          {userRole !== 'viewer' && (
            <div className="pl-[5.5rem] p-3">
              <Button onClick={() => onOpenForm('action', project.id)} variant="outline" className="text-xs py-1.5 h-8 gap-1.5"><Plus className="w-3 h-3"/> Nueva Acción</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ActionRow: React.FC<{ action: any, onOpenModal: any, onOpenForm: any, onOpenDetail: any, onDeleteModal: any, userRole: any, filterItem: (i:any)=>boolean }> = ({ action, onOpenModal, onOpenForm, onOpenDetail, onDeleteModal, userRole, filterItem }) => {
  const { subtasks, allUsers, deleteEntity } = useStore();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const actSubtasks = subtasks.filter(s => s.actionId === action.id && s.active !== false).sort(sortEntities);
  const showDelayAlert = isDelayed(action.updatedAt, action.status);

  const hasVisibleSubtask = actSubtasks.some(s => filterItem(s));
  
  if (!filterItem(action) && !hasVisibleSubtask && actSubtasks.length > 0) return null;

  return (
    <div>
      <div className="flex items-center p-3 pl-[3.5rem] hover:bg-white transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-[1.5rem] mr-2 text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="w-16 font-mono font-medium text-xs text-gray-500">{action.code}</div>
        <div className="flex-1 text-sm font-semibold text-gray-700 flex items-center gap-2">
           {action.name}
           {showDelayAlert && <AlertCircle className="w-4 h-4 text-red-500" title="Sin actividad reciente (> 7 días)" />}
        </div>
        <div className="w-12 flex justify-center"><HealthBadge result={getHealthStatus(action)} /></div>
        <div className="w-32 text-sm font-medium text-gray-600 truncate" title={(action.secondary_responsibles || []).map((e:string) => getResponsibleName(e, allUsers || [])).join(', ')}>
           {getResponsibleName(action.responsible || '', allUsers || [])}
           {action.secondary_responsibles && action.secondary_responsibles.length > 0 && <span className="ml-1 text-xs text-brand-orange font-bold">(+{action.secondary_responsibles.length})</span>}
        </div>
        <div className="w-24 text-xs font-medium text-gray-500">{formatDateObj(action.plannedStartDate)}</div>
        <div className="w-24 text-xs font-medium flex items-center gap-1">
           {isOverdue(action.plannedEndDate, action.status) ? (
               <span className="text-red-500 flex items-center gap-1" title="Acción vencida"><Clock className="w-3 h-3" /> {formatDateObj(action.plannedEndDate)}</span>
           ) : (
               <span className="text-gray-500">{formatDateObj(action.plannedEndDate)}</span>
           )}
        </div>
        <div className="w-32"><StatusBadge status={action.status} /></div>
        <div className="w-32 flex items-center gap-3 pr-4">
          <div className="w-full bg-gray-200 rounded-[4px] h-2">
            <div className="bg-brand-light h-2 rounded-[4px]" style={{width: `${action.progress}%`}}></div>
          </div>
          <span className="text-xs font-bold text-gray-600 w-8 text-right">{action.progress}%</span>
        </div>
        <div className="w-12 flex justify-end gap-1 pr-4">
           {userRole !== 'viewer' && (
              <>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenDetail('action', action.id); }}
                   className="p-1.5 rounded-[8px] hover:bg-brand-light/10 text-brand-light transition-colors" 
                   title="Ver Detalles"
                 >
                   <Activity className="w-4 h-4"/>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenForm('action', undefined, action); }}
                   className="p-1.5 rounded-[8px] hover:bg-gray-100 text-gray-500 transition-colors" 
                   title="Editar"
                 >
                   <Edit2 className="w-4 h-4"/>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onOpenModal('action', action.id, action.name, action.status, action.progress); }}
                   className="p-1.5 rounded-[8px] hover:bg-brand-orange/10 text-brand-orange transition-colors" 
                   title="Registrar Avance"
                 >
                   <Plus className="w-4 h-4"/>
                 </button>
                 <button
                   onClick={(e) => { e.stopPropagation(); onDeleteModal('action', action.id, action.name); }}
                   className="p-1.5 rounded-[8px] hover:bg-red-50 text-red-500 transition-colors"
                   title="Eliminar"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </>
           )}
        </div>
      </div>
      {expanded && (
        <div className="bg-white divide-y divide-gray-50 shadow-inner">
          {actSubtasks.map(sub => <SubtaskRow key={sub.id} subtask={sub} onOpenModal={onOpenModal} onOpenForm={onOpenForm} onOpenDetail={onOpenDetail} onDeleteModal={onDeleteModal} userRole={userRole} filterItem={filterItem} />)}
          {userRole !== 'viewer' && (
            <div className="pl-[7.5rem] p-3 relative before:absolute before:left-[4.5rem] before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
              <Button onClick={() => onOpenForm('subtask', action.id)} variant="ghost" className="text-xs py-1.5 h-8 gap-1.5 text-gray-500 hover:text-brand-dark"><Plus className="w-3 h-3"/> Nueva Subtarea</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SubtaskRow: React.FC<{ subtask: any, onOpenModal: any, onOpenForm: any, onOpenDetail: any, onDeleteModal: any, userRole: any, filterItem: (i:any)=>boolean }> = ({ subtask, onOpenModal, onOpenForm, onOpenDetail, onDeleteModal, userRole, filterItem }) => {
  const { allUsers, deleteEntity } = useStore();
  const { user } = useAuth();
  const showDelayAlert = isDelayed(subtask.updatedAt, subtask.status);

  if (!filterItem(subtask)) return null;

  return (
    <div className="flex items-center p-2.5 pl-[6.5rem] hover:bg-gray-50 transition-colors relative before:absolute before:left-[4.5rem] before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
      <div className="w-16 font-mono font-medium text-[11px] text-brand-orange">{subtask.code}</div>
      <div className="flex-1 text-sm font-medium text-gray-600 flex items-center gap-2">
         {subtask.name}
         {showDelayAlert && <AlertCircle className="w-4 h-4 text-red-500" title="Sin actividad reciente (> 7 días)" />}
      </div>
      <div className="w-12 flex justify-center"><HealthBadge result={getHealthStatus(subtask)} /></div>
      <div className="w-32 text-xs font-medium text-gray-500 truncate" title={(subtask.secondary_responsibles || []).map((e:string) => getResponsibleName(e, allUsers || [])).join(', ')}>
         {getResponsibleName(subtask.responsible || '', allUsers || [])}
         {subtask.secondary_responsibles && subtask.secondary_responsibles.length > 0 && <span className="ml-1 text-xs text-brand-orange font-bold">(+{subtask.secondary_responsibles.length})</span>}
      </div>
      <div className="w-24 text-xs font-medium text-gray-400">{formatDateObj(subtask.plannedStartDate)}</div>
      <div className="w-24 text-xs font-medium flex items-center gap-1">
         {isOverdue(subtask.plannedEndDate, subtask.status) ? (
             <span className="text-red-500 flex items-center gap-1" title="Subtarea vencida"><Clock className="w-3 h-3" /> {formatDateObj(subtask.plannedEndDate)}</span>
         ) : (
             <span className="text-gray-400">{formatDateObj(subtask.plannedEndDate)}</span>
         )}
      </div>
      <div className="w-32"><StatusBadge status={subtask.status} /></div>
      <div className="w-32 flex items-center gap-3 pr-4">
         <div className="w-full bg-gray-200 rounded-[4px] h-1.5">
            <div className="bg-brand-orange h-1.5 rounded-[4px]" style={{width: `${subtask.progress}%`}}></div>
          </div>
          <span className="text-[11px] font-bold text-gray-500 w-8 text-right">{subtask.progress}%</span>
      </div>
      <div className="w-12 flex justify-end gap-1 pr-4">
        {userRole !== 'viewer' && (
           <>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenDetail('subtask', subtask.id); }}
                className="p-1.5 rounded-[8px] hover:bg-brand-light/10 text-brand-light transition-colors" 
                title="Ver Detalles y Línea de Tiempo"
              >
                <Activity className="w-4 h-4"/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenForm('subtask', undefined, subtask); }}
                className="p-1.5 rounded-[8px] hover:bg-gray-100 text-gray-500 transition-colors" 
                title="Editar"
              >
                <Edit2 className="w-4 h-4"/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenModal('subtask', subtask.id, subtask.name, subtask.status, subtask.progress); }}
                className="p-1.5 rounded-[8px] hover:bg-brand-orange/10 text-brand-orange transition-colors" 
                title="Registrar Avance"
              >
                <Plus className="w-4 h-4"/>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteModal('subtask', subtask.id, subtask.name); }}
                className="p-1.5 rounded-[8px] hover:bg-red-50 text-red-500 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
           </>
        )}
      </div>
    </div>
  );
}
