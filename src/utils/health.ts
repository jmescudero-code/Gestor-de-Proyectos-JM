import { Blocker, Decision } from '../types';

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface HealthResult {
    status: HealthStatus;
    reason: string;
}

export const getHealthStatus = (
    entity: any, 
    blockers: Blocker[] = [], 
    decisions: Decision[] = []
): HealthResult => {
    // 1. Rojo: Está vencido.
    if (entity.plannedEndDate && entity.status !== 'Listo' && entity.status !== 'Cancelado') {
        const endDate = typeof entity.plannedEndDate.toDate === 'function' ? entity.plannedEndDate.toDate() : new Date(entity.plannedEndDate);
        if (!isNaN(endDate.getTime()) && new Date().getTime() > endDate.getTime() + 86400000) {
            return { status: 'red', reason: 'Elemento vencido.' };
        }
    }

    // 2. Rojo: No tiene responsable.
    if (!entity.responsible) {
        return { status: 'red', reason: 'Falta responsable.' };
    }

    // 3. Rojo: Está en curso sin actividad reciente (ej. > 10 días).
    // Amarillo: Poca actividad (ej. > 5 días).
    if (entity.status === 'En curso' && entity.updatedAt) {
        const lastUpdate = typeof entity.updatedAt.toDate === 'function' ? entity.updatedAt.toDate() : new Date(entity.updatedAt);
        if (!isNaN(lastUpdate.getTime())) {
            const diffDays = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 10) {
                return { status: 'red', reason: 'En curso sin avance reciente (> 10 días).' };
            } else if (diffDays > 5) {
                return { status: 'yellow', reason: 'Poca actividad reciente (> 5 días).' };
            }
        }
    }

    // 4. Bloqueos
    const openBlockers = blockers.filter(b => b.entityId === entity.id && b.status === 'Abierto');
    if (openBlockers.length > 0) {
        // Find if old blocker
        // Simplification: Any open blocker puts it in red or yellow depending on days
        const oldestBlocker = Math.max(...openBlockers.map(b => {
             const d = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate() : (new Date(b.dateDetected || Date.now()));
             if (isNaN(d.getTime())) return 0;
             return (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24);
        }));
        if (oldestBlocker > 7) {
            return { status: 'red', reason: `Bloqueos abiertos hace más de 7 días.` };
        } else {
             return { status: 'yellow', reason: 'Tiene bloqueos abiertos.' };
        }
    }

    // 5. Decisiones pendientes
    const openDecisions = decisions.filter(d => d.entityId === entity.id && d.status === 'Pendiente');
    if (openDecisions.length > 0) {
        return { status: 'red', reason: 'Requiere decisión y no fue resuelta.' };
    }

    // 6. Próximo paso
    if (entity.status === 'En curso' && !entity.next_step_description) {
        // Redifining default
        return { status: 'red', reason: 'No tiene próximo paso definido.' };
    }

    if (entity.next_step_due_date && entity.next_step_status !== 'Realizado' && entity.next_step_status !== 'Cancelado') {
        const nextStepDate = new Date(entity.next_step_due_date);
        if (!isNaN(nextStepDate.getTime()) && new Date().getTime() > nextStepDate.getTime() + 86400000) {
            return { status: 'red', reason: 'Próximo paso vencido.' };
        }
    }

    // 7. Amarillo: Próximo a vencer. (ej. < 3 días)
    if (entity.plannedEndDate && entity.status !== 'Listo' && entity.status !== 'Cancelado') {
        const endDate = typeof entity.plannedEndDate.toDate === 'function' ? entity.plannedEndDate.toDate() : new Date(entity.plannedEndDate);
        if (!isNaN(endDate.getTime())) {
             const diffDays = (endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
             if (diffDays >= 0 && diffDays <= 3) {
                 return { status: 'yellow', reason: 'Próximo a vencer (<= 3 días).' };
             }
        }
    }

    return { status: 'green', reason: 'Saludable.' };
};
