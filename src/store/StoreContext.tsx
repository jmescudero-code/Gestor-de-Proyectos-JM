import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Group, Project, Action, Subtask, ProgressLog } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

interface StoreContextType {
  groups: Group[];
  projects: Project[];
  actions: Action[];
  subtasks: Subtask[];
  logs: ProgressLog[];
  allUsers: any[]; // Include users for assignation
  blockers: any[];
  decisions: any[];
  addProject: (p: Omit<Project, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => Promise<void>;
  addAction: (a: Omit<Action, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => Promise<void>;
  addSubtask: (s: Omit<Subtask, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => Promise<void>;
  updateStatus: (type: 'project'|'action'|'subtask', id: string, status: any, progress: number, text?: string, blockers?: string, nextSteps?: string, attachments?: {name: string, url: string}[], nextStepResponsible?: string, nextStepDueDate?: string, closureSummary?: string, closureEvidenceUrl?: string, lessonsLearned?: string) => Promise<void>;
  updateEntity: (type: 'project'|'action'|'subtask', id: string, data: any) => Promise<void>;
  deleteEntity: (type: 'project'|'action'|'subtask'|'user'|'group', id: string, userEmail: string) => Promise<void>;
  restoreEntity: (type: 'project'|'action'|'subtask'|'user'|'group', id: string) => Promise<void>;
  importData: (data: any[]) => Promise<{ newGroups: number, newProjects: number, newActions: number, newSubtasks: number, newUsers: number }>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const { user } = useAuth();

  const isMock = localStorage.getItem('mockUser') === 'admin';

  useEffect(() => {
    if (isMock) {
      setGroups([
        { id: 'g1', name: 'Largo plazo', active: true, priority: 'Media', description: 'Proyectos a largo plazo' },
        { id: 'g2', name: 'Corto plazo', active: true, priority: 'Alta', description: 'Proyectos de ejecución rápida' }
      ]);
      setAllUsers([
        { id: 'u1', email: 'escuderojuanmartin@gmail.com', name: 'Juan Martin Escudero', role: 'admin', status: 'Activo', active: true },
        { id: 'u2', email: 'carlos.olmos@virtual.local', name: 'Carlos Olmos', role: 'editor', status: 'Activo', active: true },
        { id: 'u3', email: 'ana.lopez@virtual.local', name: 'Ana López', role: 'editor', status: 'Activo', active: true }
      ]);
      setProjects([]);
      setActions([]);
      setSubtasks([]);
      setLogs([]);
      setBlockers([]);
      setDecisions([]);
      return;
    }

    if (!user || !user.isActive) return;

    // We can fetch data here
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, 'groups'), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)))));
    unsubs.push(onSnapshot(collection(db, 'projects'), (snap) => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))));
    unsubs.push(onSnapshot(collection(db, 'actions'), (snap) => setActions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Action)))));
    unsubs.push(onSnapshot(collection(db, 'subtasks'), (snap) => setSubtasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subtask)))));
    unsubs.push(onSnapshot(collection(db, 'users'), (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'blockers'), (snap) => setBlockers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'decisions'), (snap) => setDecisions(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    
    const logsQuery = query(collection(db, 'progressLogs'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(logsQuery, (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))));

    return () => unsubs.forEach(u => u());
  }, [user]);

  const handleInitialBlockerAndDecision = (entityType: 'project'|'action'|'subtask', entityId: string, initial_blocker?: string, initial_decision?: string) => {
      if (initial_blocker) {
          const newB = doc(collection(db, 'blockers'));
          setDoc(newB, {
              entityType, entityId, blockerType: 'Otro', description: initial_blocker,
              responsible: '', area: '', dateDetected: new Date().toISOString().split('T')[0], status: 'Abierto', createdAt: serverTimestamp()
          });
      }
      if (initial_decision) {
          const newD = doc(collection(db, 'decisions'));
          setDoc(newD, {
              entityType, entityId, decisionRequired: initial_decision, reason: '', requester: '', responsible: '',
              requestDate: new Date().toISOString().split('T')[0], impactIfDelayed: '', status: 'Pendiente', createdAt: serverTimestamp()
          });
      }
  };

  const cleanData = (obj: any) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

  const addProject = async (p: Omit<Project, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => {
    console.log("addProject triggered in Store! isMock:", isMock, "Payload:", p);
    const code = projects.length > 0 ? Math.max(...projects.map(pr => pr.code)) + 1 : 1;
    const { initial_blocker, initial_decision, ...projectData } = p;
    
    if (isMock) {
      const newId = `mock-project-${Date.now()}`;
      const newProj = {
        id: newId,
        ...projectData,
        code,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      setProjects(prev => [...prev, newProj]);
      
      if (initial_blocker) {
        setBlockers(prev => [...prev, {
          id: `mock-blocker-${Date.now()}`,
          entityType: 'project', entityId: newId, blockerType: 'Otro', description: initial_blocker,
          responsible: '', area: '', dateDetected: new Date().toISOString().split('T')[0], status: 'Abierto', createdAt: new Date().toISOString()
        }]);
      }
      if (initial_decision) {
        setDecisions(prev => [...prev, {
          id: `mock-decision-${Date.now()}`,
          entityType: 'project', entityId: newId, decisionRequired: initial_decision, reason: '', requester: '', responsible: '',
          requestDate: new Date().toISOString().split('T')[0], impactIfDelayed: '', status: 'Pendiente', createdAt: new Date().toISOString()
        }]);
      }
      return;
    }

    const newDoc = doc(collection(db, 'projects'));
    await setDoc(newDoc, { ...cleanData(projectData), code, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    handleInitialBlockerAndDecision('project', newDoc.id, initial_blocker, initial_decision);
  };

  const addAction = async (a: Omit<Action, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => {
    const projActions = actions.filter(ac => ac.projectId === a.projectId);
    const parent = projects.find(pr => pr.id === a.projectId);
    const parentCode = parent?.code || 0;
    const nextSub = projActions.length > 0 ? Math.max(...projActions.map(ac => Number(ac.code.split('.')[1]))) + 1 : 1;
    const { initial_blocker, initial_decision, ...actionData } = a;

    if (isMock) {
      const newId = `mock-action-${Date.now()}`;
      const newAction = {
        id: newId,
        ...actionData,
        groupId: parent?.groupId || '',
        code: `${parentCode}.${nextSub}`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      setActions(prev => [...prev, newAction]);
      
      if (initial_blocker) {
        setBlockers(prev => [...prev, {
          id: `mock-blocker-${Date.now()}`,
          entityType: 'action', entityId: newId, blockerType: 'Otro', description: initial_blocker,
          responsible: '', area: '', dateDetected: new Date().toISOString().split('T')[0], status: 'Abierto', createdAt: new Date().toISOString()
        }]);
      }
      if (initial_decision) {
        setDecisions(prev => [...prev, {
          id: `mock-decision-${Date.now()}`,
          entityType: 'action', entityId: newId, decisionRequired: initial_decision, reason: '', requester: '', responsible: '',
          requestDate: new Date().toISOString().split('T')[0], impactIfDelayed: '', status: 'Pendiente', createdAt: new Date().toISOString()
        }]);
      }
      return;
    }

    const newDoc = doc(collection(db, 'actions'));
    await setDoc(newDoc, { ...cleanData(actionData), groupId: parent?.groupId || '', code: `${parentCode}.${nextSub}`, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    handleInitialBlockerAndDecision('action', newDoc.id, initial_blocker, initial_decision);
  };

  const addSubtask = async (s: Omit<Subtask, 'id' | 'code'> & {initial_blocker?: string, initial_decision?: string}) => {
    const actSubtasks = subtasks.filter(st => st.actionId === s.actionId);
    const parent = actions.find(ac => ac.id === s.actionId);
    const parentCode = parent?.code || "0.0";
    const nextSub = actSubtasks.length > 0 ? Math.max(...actSubtasks.map(st => Number(st.code.split('.')[2]))) + 1 : 1;
    const { initial_blocker, initial_decision, ...subtaskData } = s;

    if (isMock) {
      const newId = `mock-subtask-${Date.now()}`;
      const newSub = {
        id: newId,
        ...subtaskData,
        projectId: parent?.projectId || '',
        groupId: parent?.groupId || '',
        code: `${parentCode}.${nextSub}`,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      setSubtasks(prev => [...prev, newSub]);
      
      if (initial_blocker) {
        setBlockers(prev => [...prev, {
          id: `mock-blocker-${Date.now()}`,
          entityType: 'subtask', entityId: newId, blockerType: 'Otro', description: initial_blocker,
          responsible: '', area: '', dateDetected: new Date().toISOString().split('T')[0], status: 'Abierto', createdAt: new Date().toISOString()
        }]);
      }
      if (initial_decision) {
        setDecisions(prev => [...prev, {
          id: `mock-decision-${Date.now()}`,
          entityType: 'subtask', entityId: newId, decisionRequired: initial_decision, reason: '', requester: '', responsible: '',
          requestDate: new Date().toISOString().split('T')[0], impactIfDelayed: '', status: 'Pendiente', createdAt: new Date().toISOString()
        }]);
      }
      return;
    }

    const newDoc = doc(collection(db, 'subtasks'));
    await setDoc(newDoc, { ...cleanData(subtaskData), projectId: parent?.projectId || '', groupId: parent?.groupId || '', code: `${parentCode}.${nextSub}`, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    handleInitialBlockerAndDecision('subtask', newDoc.id, initial_blocker, initial_decision);
  };

  const computeParentStats = (siblings: any[], currentParent: any, updatingId?: string, newProgress?: number, newStatus?: string) => {
    let count = siblings.length;
    if (count === 0) return null;

    let totalProgress = 0;
    let allListo = true;
    let anyEnCurso = false;
    let minStart = '';
    let maxEnd = '';

    siblings.forEach(s => {
      const p = (s.id === updatingId && newProgress !== undefined) ? newProgress : s.progress || 0;
      const st = (s.id === updatingId && newStatus !== undefined) ? newStatus : s.status;
      
      totalProgress += p;
      if (st !== 'Listo') allListo = false;
      if (st === 'En curso') anyEnCurso = true;
      
      const sStart = s.plannedStartDate;
      const sEnd = s.plannedEndDate;
      if (sStart) {
        if (!minStart || new Date(sStart) < new Date(minStart)) minStart = sStart;
      }
      if (sEnd) {
        if (!maxEnd || new Date(sEnd) > new Date(maxEnd)) maxEnd = sEnd;
      }
    });

    const progress = Math.round(totalProgress / count);
    let status = currentParent?.status || 'No iniciada';
    if (allListo) status = 'Listo';
    else if (anyEnCurso && status !== 'En curso') status = 'En curso';
    else if (!allListo && status === 'Listo') status = 'En curso';

    return { 
      progress, 
      status, 
      ...(minStart ? { plannedStartDate: minStart } : {}), 
      ...(maxEnd ? { plannedEndDate: maxEnd } : {}) 
    };
  };

  const recalculateTreeProgress = async (type: 'project'|'action'|'subtask', id: string, newProgress: number, newStatus: string, batch: any) => {
     if (type === 'subtask') {
        const sub = subtasks.find(s => s.id === id);
        if (sub) {
           const actionIdToRecalc = sub.actionId;
           const actSiblings = subtasks.filter(s => s.actionId === actionIdToRecalc);
           const act = actions.find(a => a.id === actionIdToRecalc);
           const actStats = computeParentStats(actSiblings, act, id, newProgress, newStatus);
           
           if (actStats && act) {
              const actRef = doc(db, 'actions', actionIdToRecalc);
              batch.update(actRef, { ...actStats, updatedAt: serverTimestamp() });
              
              const pId = act.projectId;
              const projSiblings = actions.filter(a => a.projectId === pId);
              const proj = projects.find(p => p.id === pId);
              const projStats = computeParentStats(projSiblings, proj, actionIdToRecalc, actStats.progress, actStats.status);
              if (projStats && proj) {
                 const projRef = doc(db, 'projects', pId);
                 batch.update(projRef, { ...projStats, updatedAt: serverTimestamp() });
              }
           }
        }
     } else if (type === 'action') {
        const act = actions.find(a => a.id === id);
        if (act) {
           const pId = act.projectId;
           const projSiblings = actions.filter(a => a.projectId === pId);
           const proj = projects.find(p => p.id === pId);
           const projStats = computeParentStats(projSiblings, proj, id, newProgress, newStatus);
           if (projStats && proj) {
              const projRef = doc(db, 'projects', pId);
              batch.update(projRef, { ...projStats, updatedAt: serverTimestamp() });
           }
        }
     }
  };

  const updateStatus = async (type: 'project'|'action'|'subtask', id: string, status: any, progress: number, text?: string, blockers?: string, nextSteps?: string, attachments?: {name: string, url: string}[], nextStepResponsible?: string, nextStepDueDate?: string, closureSummary?: string, closureEvidenceUrl?: string, lessonsLearned?: string) => {
    if (isMock) {
      const setFn = type === 'project' ? setProjects : (type === 'action' ? setActions : setSubtasks);
      const updateData: any = { status, progress, updatedAt: new Date().toISOString() };
      if (nextSteps) updateData.next_step_description = nextSteps;
      if (nextStepResponsible) updateData.next_step_responsible_user_id = nextStepResponsible;
      if (nextStepDueDate) updateData.next_step_due_date = nextStepDueDate;
      if (status === 'En curso' && !updateData.next_step_status) updateData.next_step_status = 'Pendiente';
      
      if (status === 'Listo') {
          if (closureSummary) updateData.closure_summary = closureSummary;
          if (closureEvidenceUrl) updateData.closure_evidence_url = closureEvidenceUrl;
          if (lessonsLearned) updateData.lessons_learned = lessonsLearned;
          updateData.closed_at = new Date().toISOString();
          updateData.closed_by_user_id = 'mock-admin-uid';
      }

      setFn((prev: any[]) => prev.map(item => item.id === id ? { ...item, ...updateData } : item));

      // Recalculate tree
      if (type === 'subtask') {
        const sub = subtasks.find(s => s.id === id);
        if (sub) {
          const actionId = sub.actionId;
          const actSiblings = subtasks.filter(s => s.actionId === actionId);
          const act = actions.find(a => a.id === actionId);
          const actStats = computeParentStats(actSiblings, act, id, progress, status);
          if (actStats && act) {
             setActions(prev => prev.map(a => a.id === actionId ? { ...a, ...actStats, updatedAt: new Date().toISOString() } : a));
             
             const pId = act.projectId;
             const projSiblings = actions.filter(a => a.projectId === pId);
             const proj = projects.find(p => p.id === pId);
             const projStats = computeParentStats(projSiblings, proj, actionId, actStats.progress, actStats.status);
             if (projStats && proj) {
                setProjects(prev => prev.map(p => p.id === pId ? { ...p, ...projStats, updatedAt: new Date().toISOString() } : p));
             }
          }
        }
      } else if (type === 'action') {
        const act = actions.find(a => a.id === id);
        if (act) {
          const pId = act.projectId;
          const projSiblings = actions.filter(a => a.projectId === pId);
          const proj = projects.find(p => p.id === pId);
          const projStats = computeParentStats(projSiblings, proj, id, progress, status);
          if (projStats && proj) {
            setProjects(prev => prev.map(p => p.id === pId ? { ...p, ...projStats, updatedAt: new Date().toISOString() } : p));
          }
        }
      }

      if (text || blockers || nextSteps || (attachments && attachments.length > 0)) {
        setLogs((prev: any[]) => [
          {
            id: `mock-log-${Date.now()}`,
            entityType: type,
            entityId: id,
            userId: 'mock-admin-uid',
            user: user?.email || 'escuderojuanmartin@gmail.com',
            finalText: text || '',
            blockers: blockers || '',
            nextSteps: nextSteps || '',
            attachments: attachments || [],
            newStatus: status,
            newProgress: progress,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      }
      return;
    }

    const batch = writeBatch(db);
    
    // 1. Update element
    const colName = type === 'project' ? 'projects' : (type === 'action' ? 'actions' : 'subtasks');
    const ref = doc(db, colName, id);
    
    const updateData: any = { status, progress, updatedAt: serverTimestamp() };
    if (nextSteps) updateData.next_step_description = nextSteps;
    if (nextStepResponsible) updateData.next_step_responsible_user_id = nextStepResponsible;
    if (nextStepDueDate) updateData.next_step_due_date = nextStepDueDate;
    if (status === 'En curso' && !updateData.next_step_status) updateData.next_step_status = 'Pendiente';
    
    if (status === 'Listo') {
        if (closureSummary) updateData.closure_summary = closureSummary;
        if (closureEvidenceUrl) updateData.closure_evidence_url = closureEvidenceUrl;
        if (lessonsLearned) updateData.lessons_learned = lessonsLearned;
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by_user_id = user?.uid;
    }

    batch.update(ref, updateData);

    // 2. Add progress log
    if (text || blockers || nextSteps || (attachments && attachments.length > 0)) {
      const logRef = doc(collection(db, 'progressLogs'));
      batch.set(logRef, {
         entityType: type,
         entityId: id,
         userId: user?.uid,
         user: user?.email,
         finalText: text || '',
         blockers: blockers || '',
         nextSteps: nextSteps || '',
         attachments: attachments || [],
         newStatus: status,
         newProgress: progress,
         createdAt: serverTimestamp()
      });
    }

    // 3. Recalculate ancestors Progress Automatically
    if (type !== 'project') {
       await recalculateTreeProgress(type, id, progress, status, batch);
    }
    
    await batch.commit();
  };

  const updateEntity = async (type: 'project'|'action'|'subtask', id: string, data: any) => {
    if (isMock) {
      const setFn = type === 'project' ? setProjects : (type === 'action' ? setActions : setSubtasks);
      setFn((prev: any[]) => prev.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item));
      return;
    }

    try {
      let collName = type === 'project' ? 'projects' : (type === 'action' ? 'actions' : 'subtasks');
      const entityRef = doc(db, collName, id);
      const cleanDataToUpdate = cleanData(data);
      // Ensure we set updatedAt
      cleanDataToUpdate.updatedAt = serverTimestamp();
      
      await updateDoc(entityRef, cleanDataToUpdate);
    } catch(err) {
      console.error("Error al actualizar (updateEntity):", err);
      throw err;
    }
  };

  const deleteEntity = async (type: 'project'|'action'|'subtask'|'user'|'group', id: string, userEmail: string) => {
    if (isMock) {
      const setFn = type === 'project' ? setProjects : (type === 'action' ? setActions : (type === 'subtask' ? setSubtasks : type === 'group' ? setGroups : setAllUsers));
      setFn((prev: any[]) => prev.map(item => item.id === id ? { ...item, active: false, deletedAt: new Date().toISOString(), deletedBy: userEmail } : item));
      
      if (type !== 'user' && type !== 'group') {
        setLogs((prev: any[]) => [
          {
            id: `mock-log-${Date.now()}`,
            entityId: id,
            entityType: type,
            user: userEmail || '',
            userId: 'mock-admin-uid',
            date: new Date().toISOString().split('T')[0],
            text: `El elemento ha sido eliminado por ${userEmail}.`,
            status: 'Eliminado',
            progress: 0,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      }
      return;
    }

    try {
      let collName = '';
      if (type === 'project') collName = 'projects';
      else if (type === 'action') collName = 'actions';
      else if (type === 'subtask') collName = 'subtasks';
      else if (type === 'user') collName = 'users';
      else if (type === 'group') collName = 'groups';

      const entityRef = doc(db, collName, id);
      let payload: any = { active: false, deletedAt: new Date().toISOString(), deletedBy: userEmail };
      if (type === 'user') {
        payload.status = 'Desactivado'; // Or keep it to 'active: false' mainly
      }
      await updateDoc(entityRef, payload);

      // If it's a non-user entity, add a log
      if (type !== 'user' && type !== 'group') {
        const logRef = doc(collection(db, 'progressLogs'));
        await setDoc(logRef, {
          entityId: id,
          entityType: type,
          user: userEmail || '',
          userId: user?.uid || '',
          date: new Date().toISOString().split('T')[0],
          text: `El elemento ha sido eliminado por ${userEmail}.`,
          status: 'Eliminado',
          progress: 0,
          createdAt: serverTimestamp()
        });
      }
    } catch(err: any) {
      console.error("Error al eliminar (deleteEntity):", err);
      alert("Error al eliminar el elemento: " + (err.message || JSON.stringify(err)));
    }
  };

  const restoreEntity = async (type: 'project'|'action'|'subtask'|'user'|'group', id: string) => {
    let collName = '';
    if (type === 'project') collName = 'projects';
    else if (type === 'action') collName = 'actions';
    else if (type === 'subtask') collName = 'subtasks';
    else if (type === 'user') collName = 'users';
    else if (type === 'group') collName = 'groups';

    const entityRef = doc(db, collName, id);
    let payload: any = { active: true, deletedAt: null, deletedBy: null };
    if (type === 'user') {
      payload.status = 'Pendiente de invitación'; // Simple reset if needed or just let it stay whatever
    }
    await updateDoc(entityRef, payload);

    if (type !== 'user' && type !== 'group') {
      const logRef = doc(collection(db, 'progressLogs'));
      await setDoc(logRef, {
        entityId: id,
        entityType: type,
        user: 'Sistema',
        userId: user?.uid || '',
        date: new Date().toISOString().split('T')[0],
        text: `El elemento ha sido restaurado desde la papelera.`,
        status: 'Restaurado',
        progress: 0,
        createdAt: serverTimestamp()
      });
    }
  };

  const importData = async (data: any[]) => {
    let newGroups = 0;
    let newProjects = 0;
    let newActions = 0;
    let newSubtasks = 0;
    let newUsers = 0;

    if (isMock) {
       // Mock Mode local state updates
       const tempGroups = [...groups];
       const tempProjects = [...projects];
       const tempActions = [...actions];
       const tempSubtasks = [...subtasks];
       const tempUsers = [...allUsers];

       const resolveResponsible = (identifier: string | undefined) => {
          if (!identifier) return '';
          const rawId = identifier.split(';')[0].trim();
          if (!rawId) return '';
          let email = rawId.toLowerCase().replace(/\s+/g, '.').replace(/\//g, '-').replace(/\\/g, '-');
          if (!email.includes('@')) {
             email = `${email}@virtual.local`;
          }
          if (!tempUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
             tempUsers.push({
                id: email, email: email, name: rawId, role: 'viewer', status: 'Pendiente de invitación', active: true
             });
             newUsers++;
          }
          return email;
       };

       const resolveSecondaryResponsibles = (identifiersStr: string | undefined) => {
          if (!identifiersStr) return [];
          const identifiers = identifiersStr.split(';').map(e => e.trim()).filter(e => !!e);
          return identifiers.map(identifier => {
             let email = identifier.toLowerCase().replace(/\s+/g, '.').replace(/\//g, '-').replace(/\\/g, '-');
             if (!email.includes('@')) {
                email = `${email}@virtual.local`;
             }
             if (!tempUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                tempUsers.push({
                   id: email, email: email, name: identifier, role: 'viewer', status: 'Pendiente de invitación', active: true
                });
                newUsers++;
             }
             return email;
          });
       };

       for (const row of data) {
          const groupName = (row['Grupo de proyecto'] || row['Carpeta']) ? String(row['Grupo de proyecto'] || row['Carpeta']).trim() : '';
          const projCode = row['Código proyecto'] ? String(row['Código proyecto']).trim() : '';
          const projName = row['Nombre proyecto'] ? String(row['Nombre proyecto']).trim() : '';
          const projDesc = row['Descripción proyecto'] ? String(row['Descripción proyecto']).trim() : '';
          const actCode = row['Código acción'] ? String(row['Código acción']).trim() : '';
          const actName = row['Nombre acción'] ? String(row['Nombre acción']).trim() : (row['Descripción proyecto'] ? String(row['Descripción proyecto']).trim() : '');
          const actDesc = row['Descripción acción'] ? String(row['Descripción acción']).trim() : '';
          const taskCode = row['Código tarea'] ? String(row['Código tarea']).trim() : '';
          const taskName = row['Nombre tarea'] ? String(row['Nombre tarea']).trim() : '';
          const taskDesc = row['Descripción tarea'] ? String(row['Descripción tarea']).trim() : '';
          const respEmail = row['Responsable principal (Email o Nombre)'] ? String(row['Responsable principal (Email o Nombre)']).trim() : (row['Responsable principal email'] ? String(row['Responsable principal email']).trim() : '');
          const secRespEmail = row['Responsables secundarios (Emails o Nombres)'] ? String(row['Responsables secundarios (Emails o Nombres)']).trim() : (row['Responsables secundarios emails'] ? String(row['Responsables secundarios emails']).trim() : '');
          const state = row['Estado'] ? String(row['Estado']).trim() : 'No iniciada';
          const progress = parseInt(row['Porcentaje avance']) || 0;
          const priority = row['Prioridad'] ? String(row['Prioridad']).trim() : 'Media';
          
          const parseExcelDate = (val: string) => {
              if (!val) return '';
              if (!isNaN(Number(val)) && Number(val) > 10000) {
                  const date = new Date((Number(val) - (25567 + 2)) * 86400 * 1000);
                  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
              }
              return val;
          }
          const startDate = parseExcelDate(row['Fecha inicio prevista'] ? String(row['Fecha inicio prevista']).trim() : '');
          const endDate = parseExcelDate(row['Fecha fin prevista'] ? String(row['Fecha fin prevista']).trim() : '');

          if (!groupName) continue;

          let group = tempGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
          if (!group) {
             group = { id: `mock-group-${Date.now()}-${Math.random()}`, name: groupName, active: true } as any;
             tempGroups.push(group!);
             newGroups++;
          }

          let project = null;
          if (projCode && projName) {
             project = tempProjects.find(p => p.groupId === group!.id && String(p.code) === projCode);
             if (!project) {
                project = {
                   id: `mock-project-${Date.now()}-${Math.random()}`,
                   groupId: group!.id,
                   name: projName,
                   code: parseInt(projCode) || projCode,
                   description: projDesc || '',
                   status: state,
                   progress,
                   priority,
                   responsible: resolveResponsible(respEmail),
                   secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                   startDate,
                   endDate,
                   plannedStartDate: startDate,
                   plannedEndDate: endDate,
                   active: true,
                   createdAt: new Date().toISOString(),
                   updatedAt: new Date().toISOString()
                } as any;
                tempProjects.push(project!);
                newProjects++;
             }
          }

          let action = null;
          if (project && actCode && actName) {
             action = tempActions.find(a => a.projectId === project!.id && a.code === actCode);
             if (!action) {
                action = {
                   id: `mock-action-${Date.now()}-${Math.random()}`,
                   projectId: project!.id,
                   groupId: group!.id,
                   name: actName,
                   code: actCode,
                   description: actDesc || '',
                   status: state,
                   progress,
                   priority,
                   responsible: resolveResponsible(respEmail),
                   secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                   startDate,
                   endDate,
                   plannedStartDate: startDate,
                   plannedEndDate: endDate,
                   active: true,
                   createdAt: new Date().toISOString(),
                   updatedAt: new Date().toISOString()
                } as any;
                tempActions.push(action!);
                newActions++;
             }
          }

          if (action && taskCode && taskName) {
             let subtask = tempSubtasks.find(s => s.actionId === action!.id && s.code === taskCode);
             if (!subtask) {
                subtask = {
                   id: `mock-subtask-${Date.now()}-${Math.random()}`,
                   actionId: action!.id,
                   projectId: project!.id,
                   groupId: group!.id,
                   name: taskName,
                   code: taskCode,
                   description: taskDesc || '',
                   status: state,
                   progress,
                   priority,
                   responsible: resolveResponsible(respEmail),
                   secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                   startDate,
                   endDate,
                   plannedStartDate: startDate,
                   plannedEndDate: endDate,
                   active: true,
                   createdAt: new Date().toISOString(),
                   updatedAt: new Date().toISOString()
                } as any;
                tempSubtasks.push(subtask);
                newSubtasks++;
             }
          }
       }

       setGroups(tempGroups);
       setProjects(tempProjects);
       setActions(tempActions);
       setSubtasks(tempSubtasks);
       setAllUsers(tempUsers);

       return { newGroups, newProjects, newActions, newSubtasks, newUsers };
    } else {
       // Real Firebase implementation (moved from Imports.tsx)
       const batch = writeBatch(db);
       
       const localGroups = new Map(groups.map(g => [g.name, g.id]));
       const localProjects = new Map(projects.map(p => [`${p.groupId}-${p.code}`, p.id]));
       const localActions = new Map(actions.map(a => [`${a.projectId}-${a.code}`, a.id]));
       const localSubtasks = new Map(subtasks.map(s => [`${s.actionId}-${s.code}`, s.id]));
       const localUsers = new Map(allUsers.map(u => [u.email.toLowerCase(), u.id]));

       const resolveResponsible = (identifier: string | undefined) => {
          if (!identifier) return '';
          const rawId = identifier.split(';')[0].trim();
          if (!rawId) return '';
          let email = rawId.toLowerCase().replace(/\s+/g, '.').replace(/\//g, '-').replace(/\\/g, '-');
          if (!email.includes('@')) {
             email = `${email}@virtual.local`;
          }
          if (!localUsers.has(email)) {
             const newUserId = email;
             localUsers.set(email, newUserId);
             batch.set(doc(db, 'users', newUserId), {
                email: email, name: rawId, role: 'viewer', status: 'Pendiente de invitación', active: true
             }, { merge: true });
             newUsers++;
          }
          return email;
       };

       const resolveSecondaryResponsibles = (identifiersStr: string | undefined) => {
          if (!identifiersStr) return [];
          const identifiers = identifiersStr.split(';').map(e => e.trim()).filter(e => !!e);
          return identifiers.map(identifier => {
              let email = identifier.toLowerCase().replace(/\s+/g, '.').replace(/\//g, '-').replace(/\\/g, '-');
              if (!email.includes('@')) {
                 email = `${email}@virtual.local`;
              }
              if (!localUsers.has(email)) {
                 localUsers.set(email, email);
                 batch.set(doc(db, 'users', email), {
                    email: email, name: identifier, role: 'viewer', status: 'Pendiente de invitación', active: true
                 }, { merge: true });
                 newUsers++;
              }
              return email;
          });
       };

       for (const row of data) {
           const groupName = (row['Grupo de proyecto'] || row['Carpeta']) ? String(row['Grupo de proyecto'] || row['Carpeta']).trim() : '';
           const projCode = row['Código proyecto'] ? String(row['Código proyecto']).trim() : '';
           const projName = row['Nombre proyecto'] ? String(row['Nombre proyecto']).trim() : '';
           const projDesc = row['Descripción proyecto'] ? String(row['Descripción proyecto']).trim() : '';
           const actCode = row['Código acción'] ? String(row['Código acción']).trim() : '';
           const actName = row['Nombre acción'] ? String(row['Nombre acción']).trim() : (row['Descripción proyecto'] ? String(row['Descripción proyecto']).trim() : '');
           const actDesc = row['Descripción acción'] ? String(row['Descripción acción']).trim() : '';
           const taskCode = row['Código tarea'] ? String(row['Código tarea']).trim() : '';
           const taskName = row['Nombre tarea'] ? String(row['Nombre tarea']).trim() : '';
           const taskDesc = row['Descripción tarea'] ? String(row['Descripción tarea']).trim() : '';
           const respEmail = row['Responsable principal (Email o Nombre)'] ? String(row['Responsable principal (Email o Nombre)']).trim() : (row['Responsable principal email'] ? String(row['Responsable principal email']).trim() : '');
           const secRespEmail = row['Responsables secundarios (Emails o Nombres)'] ? String(row['Responsables secundarios (Emails o Nombres)']).trim() : (row['Responsables secundarios emails'] ? String(row['Responsables secundarios emails']).trim() : '');
           const state = row['Estado'] ? String(row['Estado']).trim() : 'No iniciada';
           const progress = parseInt(row['Porcentaje avance']) || 0;
           const priority = row['Prioridad'] ? String(row['Prioridad']).trim() : 'Media';
           
           const parseExcelDate = (val: string) => {
               if (!val) return '';
               if (!isNaN(Number(val)) && Number(val) > 10000) {
                   const date = new Date((Number(val) - (25567 + 2)) * 86400 * 1000);
                   if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
               }
               return val;
           }
           const startDate = parseExcelDate(row['Fecha inicio prevista'] ? String(row['Fecha inicio prevista']).trim() : '');
           const endDate = parseExcelDate(row['Fecha fin prevista'] ? String(row['Fecha fin prevista']).trim() : '');

           if (!groupName) continue;

           let groupId = localGroups.get(groupName);
           if (!groupId) {
              groupId = doc(collection(db, 'groups')).id;
              localGroups.set(groupName, groupId);
              newGroups++;
           }
           batch.set(doc(db, 'groups', groupId as string), { name: groupName, active: true }, { merge: true });

           let projectId = null;
           if (projCode && projName) {
              projectId = localProjects.get(`${groupId}-${projCode}`);
              if (!projectId) {
                 projectId = doc(collection(db, 'projects')).id;
                 localProjects.set(`${groupId}-${projCode}`, projectId);
                 newProjects++;
              }
              batch.set(doc(db, 'projects', projectId as string), {
                 groupId, name: projName, code: parseInt(projCode) || projCode,
                 description: projDesc || '', status: state, progress, priority,
                 responsible: resolveResponsible(respEmail),
                 secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                 startDate, endDate, plannedStartDate: startDate, plannedEndDate: endDate,
                 active: true, updatedAt: serverTimestamp()
              }, { merge: true });
           }

           let actionId = null;
           if (projectId && actCode && actName) {
              actionId = localActions.get(`${projectId}-${actCode}`);
              if (!actionId) {
                 actionId = doc(collection(db, 'actions')).id;
                 localActions.set(`${projectId}-${actCode}`, actionId);
                 newActions++;
              }
              batch.set(doc(db, 'actions', actionId as string), {
                 projectId, groupId, name: actName, code: actCode,
                 description: actDesc || '', status: state, progress, priority,
                 responsible: resolveResponsible(respEmail),
                 secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                 startDate, endDate, plannedStartDate: startDate, plannedEndDate: endDate,
                 active: true, updatedAt: serverTimestamp()
              }, { merge: true });
           }

           if (actionId && taskCode && taskName) {
               let subtaskId = localSubtasks.get(`${actionId}-${taskCode}`);
               if (!subtaskId) {
                   subtaskId = doc(collection(db, 'subtasks')).id;
                   localSubtasks.set(`${actionId}-${taskCode}`, subtaskId);
                   newSubtasks++;
               }
               batch.set(doc(db, 'subtasks', subtaskId as string), {
                  actionId, projectId, groupId, name: taskName, code: taskCode,
                  description: taskDesc || '', status: state, progress, priority,
                  responsible: resolveResponsible(respEmail),
                  secondary_responsibles: resolveSecondaryResponsibles(secRespEmail),
                  startDate, endDate, plannedStartDate: startDate, plannedEndDate: endDate,
                  active: true, updatedAt: serverTimestamp()
               }, { merge: true });
           }
       }

       await batch.commit();
       return { newGroups, newProjects, newActions, newSubtasks, newUsers };
    }
  };

  // Dynamically compute derived dates for actions and projects to ensure UI is always correct
  const derivedActions = useMemo(() => {
    return actions.map(act => {
      const actSubs = subtasks.filter(s => s.actionId === act.id && s.active !== false);
      if (actSubs.length === 0) return act;
      const startDates = actSubs.map(s => s.plannedStartDate).filter(Boolean);
      const endDates = actSubs.map(s => s.plannedEndDate).filter(Boolean);
      const minStart = startDates.length > 0 ? startDates.reduce((a, b) => new Date(a) < new Date(b) ? a : b) : act.plannedStartDate;
      const maxEnd = endDates.length > 0 ? endDates.reduce((a, b) => new Date(a) > new Date(b) ? a : b) : act.plannedEndDate;
      return { ...act, plannedStartDate: minStart, plannedEndDate: maxEnd };
    });
  }, [actions, subtasks]);

  const derivedProjects = useMemo(() => {
    return projects.map(proj => {
      const projActs = derivedActions.filter(a => a.projectId === proj.id && a.active !== false);
      if (projActs.length === 0) return proj;
      const startDates = projActs.map(a => a.plannedStartDate).filter(Boolean);
      const endDates = projActs.map(a => a.plannedEndDate).filter(Boolean);
      const minStart = startDates.length > 0 ? startDates.reduce((a, b) => new Date(a) < new Date(b) ? a : b) : proj.plannedStartDate;
      const maxEnd = endDates.length > 0 ? endDates.reduce((a, b) => new Date(a) > new Date(b) ? a : b) : proj.plannedEndDate;
      return { ...proj, plannedStartDate: minStart, plannedEndDate: maxEnd };
    });
  }, [projects, derivedActions]);

  return (
    <StoreContext.Provider value={{ groups, projects: derivedProjects, actions: derivedActions, subtasks, logs, allUsers, blockers, decisions, addProject, addAction, addSubtask, updateStatus, updateEntity, deleteEntity, restoreEntity, importData }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
