import React, { useState } from 'react';
import { X, Clock, BrainCircuit, Activity, CalendarCheck, AlertCircle } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { StatusBadge } from './ui/Badge';
import { HealthBadge } from './HealthBadge';
import { getHealthStatus } from '../utils/health';

interface EntityDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    entityType: 'project' | 'action' | 'subtask';
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ isOpen, onClose, entityId, entityType }) => {
    const { projects, actions, subtasks, logs, allUsers } = useStore();
    const [activeTab, setActiveTab] = useState<'timeline' | 'summary'>('timeline');
    const [aiSummary, setAiSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    let entity: any = null;
    if (entityType === 'project') entity = projects.find(p => p.id === entityId);
    if (entityType === 'action') entity = actions.find(a => a.id === entityId);
    if (entityType === 'subtask') entity = subtasks.find(s => s.id === entityId);

    if (!entity) return null;

    const entityLogs = logs.filter(l => l.entityId === entityId).sort((a, b) => new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.date).getTime() - new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.date).getTime());
    
    const getResponsibleName = (email: string) => {
        if (!email) return '-';
        const user = allUsers?.find(u => u?.email && String(u.email).toLowerCase() === String(email).toLowerCase());
        return user?.name || email;
    };

    const handleGenerateSummary = () => {
        setIsGenerating(true);
        // Simulate AI generation based on existing data
        setTimeout(() => {
            const health = getHealthStatus(entity);
            const recentLogs = entityLogs.slice(0, 2);
            let advances = "No hay avances recientes registrados.";
            if (recentLogs.length > 0) {
                advances = `Se registraron avances recientes: "${recentLogs[0].text}".`;
            }

            let nextStep = "No tiene próximo paso definido.";
            if (entity.next_step_description) {
                nextStep = `El próximo paso es "${entity.next_step_description}" a cargo de ${getResponsibleName(entity.next_step_responsible_user_id)}.`;
            }

            let statusText = "saludable";
            if (health.status === 'yellow') statusText = "en riesgo";
            if (health.status === 'red') statusText = "crítico";

            const summary = `El elemento "${entity.name}" se encuentra ${entity.status.toLowerCase()} y su estado de salud es ${statusText}. \n\n${advances} \n\n${nextStep} \n\nRecomendación: ${health.reason}`;
            setAiSummary(summary);
            setIsGenerating(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                           <h2 className="text-xl font-bold text-brand-dark">{entity.name}</h2>
                           <StatusBadge status={entity.status} />
                           {/* Using static blockers and decisions for now as they are not explicitly queried here, though the AI will soon use it */}
                           <HealthBadge result={getHealthStatus(entity, [], [])} />
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{entity.code}</p>
                            <p className="text-sm text-gray-600">
                                <span className="font-bold text-gray-800">Responsable principal:</span> {getResponsibleName(entity.responsible)}
                            </p>
                            {entity.secondary_responsibles && entity.secondary_responsibles.length > 0 && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold text-gray-800">Responsables secundarios:</span> {entity.secondary_responsibles.map(getResponsibleName).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 shrink-0 pt-2">
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Línea de Tiempo
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('summary')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'summary' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4" /> Resumen IA
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'timeline' && (
                        <div className="space-y-6">
                            {entityLogs.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No hay registros en la línea de tiempo.</p>
                            ) : (
                                <div className="space-y-4">
                                    {entityLogs.map((log) => (
                                        <div key={log.id} className="bg-white p-4 rounded-[12px] border border-gray-100 shadow-sm relative pl-6">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-light/30 rounded-l-[12px]"></div>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-xs font-bold text-gray-400">{getResponsibleName(log.user)}</p>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : new Date(log.date).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{log.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'summary' && (
                        <div className="space-y-4">
                            {!aiSummary && !isGenerating && (
                                <div className="text-center py-10 bg-white rounded-[16px] border border-gray-100 shadow-sm p-6">
                                    <BrainCircuit className="w-12 h-12 mx-auto text-brand-light mb-4" />
                                    <h3 className="text-lg font-bold text-brand-dark mb-2">Resumen Inteligente</h3>
                                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                                        Genera un resumen narrativo automático del estado actual, bloqueos, próximos pasos y recomendaciones basado en los datos del sistema.
                                    </p>
                                    <button 
                                        onClick={handleGenerateSummary}
                                        className="bg-brand-dark text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-black transition-colors shadow-sm"
                                    >
                                        Resumir situación
                                    </button>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-light border-t-transparent mx-auto mb-4"></div>
                                    <p className="text-sm font-medium text-brand-light animate-pulse">Analizando histórico y estado...</p>
                                </div>
                            )}

                            {aiSummary && !isGenerating && (
                                <div className="bg-gradient-to-br from-brand-light/10 to-transparent p-6 rounded-[16px] border border-brand-light/20 shadow-sm relative overflow-hidden">
                                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                                        <BrainCircuit className="w-48 h-48 -mt-6 -mr-6" />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-sm font-bold text-brand-light uppercase tracking-wider flex items-center gap-2 mb-4">
                                            <BrainCircuit className="w-4 h-4" /> Síntesis IA
                                        </h3>
                                        <div className="prose prose-sm prose-gray max-w-none">
                                            {aiSummary.split('\n\n').map((paragraph, index) => (
                                                <p key={index} className="text-gray-800 leading-relaxed font-medium">{paragraph}</p>
                                            ))}
                                        </div>
                                        <div className="mt-8">
                                            <button 
                                                onClick={handleGenerateSummary}
                                                className="text-xs font-bold text-gray-400 hover:text-brand-dark transition-colors uppercase tracking-wider"
                                            >
                                                Regenerar Resumen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
