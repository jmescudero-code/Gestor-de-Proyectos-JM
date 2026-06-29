export type EntityStatus = 'No iniciada' | 'En curso' | 'Listo' | 'Aplazado' | 'Cancelado' | 'Sati' | 'Pausado';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface Group {
  id: string;
  name: string;
}

export type ProjectType = 'Mejora de proceso' | 'Desarrollo tecnológico' | 'RRHH' | 'KPI / reporting' | 'Formación' | 'Calidad' | 'Operativo' | 'Cliente' | 'Proveedor' | 'Programación / SATI' | 'Automatización' | 'Documentación' | 'Otro';

export interface BaseEntityFields {
  active?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  secondary_responsibles?: string[];
  impact_level?: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  urgency_level?: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  next_step_description?: string;
  next_step_responsible_user_id?: string;
  next_step_due_date?: string;
  next_step_status?: 'Pendiente' | 'En curso' | 'Realizado' | 'Vencido' | 'Cancelado';
  
  // 16. Cierre formal
  closure_summary?: string;
  closure_evidence_url?: string;
  closed_by_user_id?: string;
  closed_at?: string;
  lessons_learned?: string;
  generates_new_action?: boolean;

  // 19. Carga estimada vs real
  estimated_hours?: number;
  actual_hours?: number;
  complexity?: 'Baja' | 'Media' | 'Alta' | 'Muy alta';

  health_status?: 'green' | 'yellow' | 'red';
  health_reason?: string;
}

export interface Project extends BaseEntityFields {
  id: string;
  groupId: string;
  code: number;
  name: string;
  description?: string;
  projectType?: ProjectType;
  status: EntityStatus;
  progress: number;
  responsible?: string;
  priority?: 'Baja' | 'Media' | 'Alta';
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface Action extends BaseEntityFields {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description?: string;
  status: EntityStatus;
  progress: number;
  responsible?: string;
  priority?: 'Baja' | 'Media' | 'Alta';
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface Subtask extends BaseEntityFields {
  id: string;
  actionId: string;
  code: string;
  name: string;
  description?: string;
  status: EntityStatus;
  progress: number;
  responsible?: string;
  priority?: 'Baja' | 'Media' | 'Alta';
  startDate?: string;
  endDate?: string;
  createdAt?: any;
  updatedAt?: any;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface ProgressLog {
  id: string;
  entityType: 'project' | 'action' | 'subtask';
  entityId: string;
  date: string;
  user: string;
  text: string;
  createdAt?: any;
}

export interface Blocker {
  id: string;
  entityType: 'project' | 'action' | 'subtask';
  entityId: string;
  blockerType: 'Falta de decisión' | 'Falta de información' | 'Falta de recurso' | 'Dependencia de otro departamento' | 'Dependencia de programación / SATI' | 'Dependencia de cliente' | 'Dependencia de proveedor' | 'Falta de validación' | 'Falta de datos' | 'Otro';
  description: string;
  responsible: string;
  area: string;
  dateDetected: string;
  targetDate?: string;
  status: 'Abierto' | 'En revisión' | 'Escalado' | 'Resuelto' | 'Descartado';
  resolvedDate?: string;
  resolutionComment?: string;
  createdAt?: any;
}

export interface Decision {
  id: string;
  entityType: 'project' | 'action' | 'subtask';
  entityId: string;
  decisionRequired: string;
  reason: string;
  requester: string;
  responsible: string;
  requestDate: string;
  dueDate?: string;
  impactIfDelayed: string;
  status: 'Pendiente' | 'En análisis' | 'Decidida' | 'Escalada' | 'Descartada';
  decisionTaken?: string;
  decisionDate?: string;
  comment?: string;
  createdAt?: any;
}
