import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/StoreContext';

interface EntityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'project' | 'action' | 'subtask';
  parentId?: string; // groupId for project, projectId for action, actionId for subtask
  entityToEdit?: any;
}

export const EntityFormModal: React.FC<EntityFormModalProps> = ({ isOpen, onClose, type, parentId, entityToEdit }) => {
  const { addProject, addAction, addSubtask, updateEntity, groups, projects, actions, allUsers } = useStore();
  
  const [name, setName] = useState('');
  const [errorName, setErrorName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [errorGroupId, setErrorGroupId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [responsible, setResponsible] = useState('');
  const [secondaryResponsibles, setSecondaryResponsibles] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<any>('Mejora de proceso');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [complexity, setComplexity] = useState<any>('Media');
  const [impact_level, setImpact_level] = useState<'Bajo' | 'Medio' | 'Alto' | 'Crítico'>('Medio');
  const [urgency_level, setUrgency_level] = useState<'Bajo' | 'Medio' | 'Alto' | 'Crítico'>('Medio');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [nextStepDesc, setNextStepDesc] = useState('');
  const [nextStepResp, setNextStepResp] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [blockerDesc, setBlockerDesc] = useState('');
  const [decisionDesc, setDecisionDesc] = useState('');

  const [projectTemplate, setProjectTemplate] = useState('');

  useEffect(() => {
    if (isOpen && entityToEdit) {
      setName(entityToEdit.name || '');
      setGroupId(entityToEdit.groupId || '');
      setResponsible(entityToEdit.responsible || '');
      setSecondaryResponsibles(entityToEdit.secondary_responsibles || []);
      setDescription(entityToEdit.description || '');
      setProjectType(entityToEdit.projectType || 'Mejora de proceso');
      setEstimatedHours(entityToEdit.estimated_hours?.toString() || '');
      setComplexity(entityToEdit.complexity || 'Media');
      setImpact_level(entityToEdit.impact_level || 'Medio');
      setUrgency_level(entityToEdit.urgency_level || 'Medio');
      setStartDate(entityToEdit.plannedStartDate || '');
      setEndDate(entityToEdit.plannedEndDate || '');
      setNextStepDesc(entityToEdit.next_step_description || '');
      setNextStepResp(entityToEdit.next_step_responsible_user_id || '');
      setNextStepDate(entityToEdit.next_step_due_date || '');
    } else if (isOpen && !entityToEdit) {
      // Reset if not editing
      setName('');
      setGroupId('');
      setResponsible('');
      setSecondaryResponsibles([]);
      setDescription('');
      setEstimatedHours('');
      setComplexity('Media');
      setProjectType('Mejora de proceso');
      setImpact_level('Medio');
      setUrgency_level('Medio');
      setStartDate('');
      setEndDate('');
      setNextStepDesc('');
      setNextStepResp('');
      setNextStepDate('');
      setBlockerDesc('');
      setDecisionDesc('');
    }
  }, [isOpen, entityToEdit]);

  if (!isOpen) return null;

  const typeLabels = {
    project: 'Proyecto',
    action: 'Acción',
    subtask: 'Subtarea'
  };

  const handleApplyTemplate = (template: string) => {
    setProjectTemplate(template);
    if (template === 'impl_herramienta') {
        setName('Implantación de herramienta');
        setProjectType('Desarrollo tecnológico');
        setDescription('Creación de flujo desde plantilla: Relevar necesidad, definir alcance, etc.');
        setComplexity('Media');
    } else {
        setName('');
        setDescription('');
    }
  };

  const handleSave = async () => {
    console.log("handleSave triggered! Name:", name, "type:", type, "parentId:", parentId);
    if (!name.trim()) {
      setErrorName("El Nombre / Tema es un campo obligatorio.");
      return;
    }
    setErrorName('');

    if (type === 'project' && !groupId && !parentId) {
      setErrorGroupId("El Grupo de Proyecto es un campo obligatorio.");
      return;
    }
    setErrorGroupId('');

    const baseData: any = {
        name,
        description,
        responsible,
        secondary_responsibles: secondaryResponsibles,
        impact_level,
        urgency_level,
        ...(estimatedHours ? { estimated_hours: Number(estimatedHours) } : {}),
        complexity,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        next_step_description: nextStepDesc,
        next_step_responsible_user_id: nextStepResp,
        next_step_due_date: nextStepDate,
    };

    if (startDate) baseData.startDate = startDate;
    if (endDate) baseData.endDate = endDate;

    try {
      if (entityToEdit) {
        if (type === 'project') baseData.projectType = projectType;
        await updateEntity(type, entityToEdit.id, baseData);
      } else {
        baseData.status = 'No iniciada';
        baseData.progress = 0;
        baseData.initial_blocker = blockerDesc;
        baseData.initial_decision = decisionDesc;
        
        if (type === 'project') {
          baseData.projectType = projectType;
          await addProject({
            groupId: parentId || groupId,
            ...baseData
          });
        } else if (type === 'action') {
          await addAction({
            projectId: parentId || (projects[0]?.id || ''),
            ...baseData
          });
        } else if (type === 'subtask') {
          await addSubtask({
            actionId: parentId || (actions[0]?.id || ''),
            ...baseData
          });
        }
      }
      
      setName('');
      setGroupId('');
      setErrorGroupId('');
      setResponsible('');
      setSecondaryResponsibles([]);
      setDescription('');
      setEstimatedHours('');
      setComplexity('Media');
      setProjectType('Mejora de proceso');
      setImpact_level('Medio');
      setUrgency_level('Medio');
      setStartDate('');
      setEndDate('');
      setNextStepDesc('');
      setNextStepResp('');
      setNextStepDate('');
      setBlockerDesc('');
      setDecisionDesc('');
      onClose();
    } catch (err: any) {
      console.error("Error saving entity:", err);
      setSaveError("Error al guardar: " + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pt-10">
      <div className="bg-white rounded-[16px] w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-xl font-bold text-brand-dark">{entityToEdit ? 'Editar' : 'Nuevo/a'} {typeLabels[type]}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-[8px] text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {type === 'project' && (
             <div className="space-y-2 bg-gray-50 p-4 rounded-[12px] border border-gray-100">
                <label className="text-xs font-bold text-brand-dark uppercase tracking-wide flex items-center gap-2">
                   Crear desde plantilla
                </label>
                <select 
                  value={projectTemplate}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-[8px] text-sm focus:outline-none focus:border-brand-light bg-white"
                >
                  <option value="">Proyecto en blanco</option>
                  <option value="impl_herramienta">Implantación de herramienta</option>
                 </select>
             </div>
          )}
           {type === 'project' && !parentId && (
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Grupo de Proyecto <span className="text-red-500">*</span></label>
                <select 
                  value={groupId}
                  onChange={(e) => { setGroupId(e.target.value); setErrorGroupId(''); }}
                  className={`w-full h-11 px-3 border rounded-[12px] text-sm focus:outline-none focus:ring-1 ${errorGroupId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-brand-light focus:ring-brand-light'} bg-white`}
                >
                  <option value="">Seleccione un grupo...</option>
                  {groups.filter(g => g.active !== false).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {errorGroupId && <p className="text-xs text-red-500 font-medium">{errorGroupId}</p>}
             </div>
           )}
           
           <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre / Tema <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => { setName(e.target.value); setErrorName(''); }}
              placeholder={`Ej: Nuevo ${typeLabels[type]}`}
              className={`w-full h-11 px-3 border rounded-[12px] text-sm focus:outline-none focus:ring-1 ${errorName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-brand-light focus:ring-brand-light'}`}
            />
            {errorName && <p className="text-xs text-red-500 font-medium">{errorName}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Responsable</label>
               <select 
                 value={responsible}
                 onChange={(e) => setResponsible(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
               >
                 <option value="">Seleccione un usuario...</option>
                 {allUsers.map(u => (
                   <option key={u.id} value={u.email}>{u.name || u.email}</option>
                 ))}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Responsables Secundarios</label>
               <select 
                 multiple
                 value={secondaryResponsibles}
                 onChange={(e) => setSecondaryResponsibles(Array.from(e.target.selectedOptions, (option: any) => option.value))}
                 className="w-full min-h-[5rem] px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white py-2"
               >
                 {allUsers.filter(u => u.email !== responsible).map(u => (
                   <option key={u.id} value={u.email}>{u.name || u.email}</option>
                 ))}
               </select>
               <p className="text-[10px] text-gray-400">Mantenga presionada la tecla Ctrl/Cmd para seleccionar varios</p>
             </div>
             {type === 'project' && (
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tipo de Proyecto</label>
                   <select 
                     value={projectType}
                     onChange={(e) => setProjectType(e.target.value)}
                     className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
                   >
                     <option value="Mejora de proceso">Mejora de proceso</option>
                     <option value="Desarrollo tecnológico">Desarrollo tecnológico</option>
                     <option value="RRHH">RRHH</option>
                     <option value="KPI / reporting">KPI / reporting</option>
                     <option value="Formación">Formación</option>
                     <option value="Calidad">Calidad</option>
                     <option value="Operativo">Operativo</option>
                     <option value="Cliente">Cliente</option>
                     <option value="Proveedor">Proveedor</option>
                     <option value="Programación / SATI">Programación / SATI</option>
                     <option value="Automatización">Automatización</option>
                     <option value="Documentación">Documentación</option>
                     <option value="Otro">Otro</option>
                   </select>
                 </div>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-4">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Impacto y Urgencia</label>
               <div className="flex gap-4">
                 <select 
                   value={impact_level}
                   onChange={(e) => setImpact_level(e.target.value as any)}
                   className="w-1/2 h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                 >
                   <option value="Bajo">Impacto Bajo</option>
                   <option value="Medio">Impacto Medio</option>
                   <option value="Alto">Impacto Alto</option>
                   <option value="Crítico">Impacto Crítico</option>
                 </select>
                 <select 
                   value={urgency_level}
                   onChange={(e) => setUrgency_level(e.target.value as any)}
                   className="w-1/2 h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                 >
                   <option value="Bajo">Urgencia Baja</option>
                   <option value="Medio">Urgencia Media</option>
                   <option value="Alto">Urgencia Alto</option>
                   <option value="Crítico">Urgencia Crítico</option>
                 </select>
               </div>
             </div>
             
             <div className="space-y-4">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estimación (Opcional)</label>
               <div className="flex gap-4">
                 <input 
                   type="number"
                   value={estimatedHours}
                   onChange={(e) => setEstimatedHours(e.target.value)}
                   placeholder="Horas est."
                   className="w-1/2 h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                 />
                 <select 
                   value={complexity}
                   onChange={(e) => setComplexity(e.target.value as any)}
                   className="w-1/2 h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
                 >
                   <option value="Baja">Comp. Baja</option>
                   <option value="Media">Comp. Media</option>
                   <option value="Alta">Comp. Alta</option>
                   <option value="Muy alta">Comp. Muy alta</option>
                 </select>
               </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Inicio Previsto</label>
               <input 
                 type="date" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light text-gray-700"
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fin Previsto</label>
               <input 
                 type="date" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light text-gray-700"
               />
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
             <h4 className="text-sm font-bold text-brand-dark mb-3">Opcional: Próximos pasos</h4>
             <div className="space-y-3">
               <input 
                 type="text" 
                 placeholder="¿Cuál es el próximo paso?"
                 value={nextStepDesc}
                 onChange={(e) => setNextStepDesc(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
               />
               <div className="grid grid-cols-2 gap-4">
                 <select 
                   value={nextStepResp}
                   onChange={(e) => setNextStepResp(e.target.value)}
                   className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
                 >
                   <option value="">Responsable...</option>
                   {allUsers.map(u => (
                     <option key={u.id} value={u.email}>{u.name || u.email}</option>
                   ))}
                 </select>
                 <input 
                   type="date" 
                   value={nextStepDate}
                   onChange={(e) => setNextStepDate(e.target.value)}
                   className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light text-gray-700"
                 />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bloqueo Inicial</label>
               <input 
                 type="text" 
                 placeholder="Ej: Falta de servidor..."
                 value={blockerDesc}
                 onChange={(e) => setBlockerDesc(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Decisión Requerida</label>
               <input 
                 type="text" 
                 placeholder="Ej: Aprobar presupuesto..."
                 value={decisionDesc}
                 onChange={(e) => setDecisionDesc(e.target.value)}
                 className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light bg-white"
               />
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción (Opcional)</label>
            <textarea 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              className="w-full p-3 border border-gray-200 rounded-[12px] text-sm resize-none focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
            ></textarea>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 items-center">
          {(errorName || saveError) && <span className="text-sm font-medium text-red-500 mr-auto max-w-[60%] truncate" title={errorName || saveError}>{errorName || saveError}</span>}
          <Button variant="ghost" onClick={onClose} className="px-4">Cancelar</Button>
          <Button 
            onClick={handleSave} 
            className="gap-2"
            disabled={!name.trim()}
          >
             <Save className="w-4 h-4" />
             Crear {typeLabels[type]}
          </Button>
        </div>
      </div>
    </div>
  );
};
