import React, { createContext, useContext, useState, useEffect } from 'react';
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
        { id: 'u1', email: 'jmescudero@grupamar.es', name: 'José Escudero', role: 'admin', status: 'Activo', active: true },
        { id: 'u2', email: 'carlos.olmos@grupamar.es', name: 'Carlos Olmos', role: 'editor', status: 'Activo', active: true },
        { id: 'u3', email: 'ana.lopez@grupamar.es', name: 'Ana López', role: 'editor', status: 'Activo', active: true }
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

  const recalculateTreeProgress = async (type: 'project'|'action'|'subtask', id: string, newProgress: number, batch: any) => {
     let actionIdToRecalc = null;
     
     if (type === 'subtask') {
        const sub = subtasks.find(s => s.id === id);
        if (sub) {
           actionIdToRecalc = sub.actionId;
        }
     } else if (type === 'action') {
        actionIdToRecalc = id;
     }

     if (actionIdToRecalc) {
        // Find all subtasks for this action (including our uncommitted update logic here: assume current snapshot for siblings)
        const siblings = subtasks.filter(s => s.actionId === actionIdToRecalc);
        let totalProgress = 0;
        let count = 0;
        siblings.forEach(s => {
           totalProgress += (s.id === id) ? newProgress : s.progress;
           count++;
        });
        
        let actionProgress = count > 0 ? Math.round(totalProgress / count) : 0;
        if (type === 'action') actionProgress = newProgress; // Override if direct action update

        const actRef = doc(db, 'actions', actionIdToRecalc);
        batch.update(actRef, { progress: actionProgress, updatedAt: serverTimestamp() });
        
        const act = actions.find(a => a.id === actionIdToRecalc);
        if (act) {
           const projectId = act.projectId;
           const actSiblings = actions.filter(a => a.projectId === projectId);
           let projTotal = 0;
           let projCount = 0;
           actSiblings.forEach(a => {
              projTotal += (a.id === actionIdToRecalc) ? actionProgress : a.progress;
              projCount++;
           });
           const projProgress = projCount > 0 ? Math.round(projTotal / projCount) : 0;
           
           const projRef = doc(db, 'projects', projectId);
           batch.update(projRef, { progress: projProgress, updatedAt: serverTimestamp() });
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
          const siblings = subtasks.map(s => s.id === id ? { ...s, progress } : s).filter(s => s.actionId === actionId);
          const actProgress = siblings.length > 0 ? Math.round(siblings.reduce((acc, s) => acc + s.progress, 0) / siblings.length) : 0;
          setActions(prev => prev.map(a => a.id === actionId ? { ...a, progress: actProgress, updatedAt: new Date().toISOString() } : a));
          
          const act = actions.find(a => a.id === actionId);
          if (act) {
            const pId = act.projectId;
            const actSiblings = actions.map(a => a.id === actionId ? { ...a, progress: actProgress } : a).filter(a => a.projectId === pId);
            const projProgress = actSiblings.length > 0 ? Math.round(actSiblings.reduce((acc, a) => acc + a.progress, 0) / actSiblings.length) : 0;
            setProjects(prev => prev.map(p => p.id === pId ? { ...p, progress: projProgress, updatedAt: new Date().toISOString() } : p));
          }
        }
      } else if (type === 'action') {
        const act = actions.find(a => a.id === id);
        if (act) {
          const pId = act.projectId;
          const actSiblings = actions.map(a => a.id === id ? { ...a, progress } : a).filter(a => a.projectId === pId);
          const projProgress = actSiblings.length > 0 ? Math.round(actSiblings.reduce((acc, a) => acc + a.progress, 0) / actSiblings.length) : 0;
          setProjects(prev => prev.map(p => p.id === pId ? { ...p, progress: projProgress, updatedAt: new Date().toISOString() } : p));
        }
      }

      if (text || blockers || nextSteps || (attachments && attachments.length > 0)) {
        setLogs((prev: any[]) => [
          {
            id: `mock-log-${Date.now()}`,
            entityType: type,
            entityId: id,
            userId: 'mock-admin-uid',
            user: user?.email || 'jmescudero@grupamar.es',
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
       await recalculateTreeProgress(type, id, progress, batch);
    }
    
    await batch.commit();
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
             email = `${email}@virtual.grupamar.local`;
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
                email = `${email}@virtual.grupamar.local`;
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
             email = `${email}@virtual.grupamar.local`;
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
                 email = `${email}@virtual.grupamar.local`;
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

  return (
    <StoreContext.Provider value={{ groups, projects, actions, subtasks, logs, allUsers, blockers, decisions, addProject, addAction, addSubtask, updateStatus, deleteEntity, restoreEntity, importData }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
