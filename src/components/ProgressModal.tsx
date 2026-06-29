import React, { useState, useRef } from 'react';
import { X, Mic, Send, Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/StoreContext';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'project' | 'action' | 'subtask';
  entityId: string;
  entityName: string;
  currentStatus: string;
  currentProgress: number;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  currentStatus,
  currentProgress
}) => {
  const { updateStatus } = useStore();
  const [status, setStatus] = useState(currentStatus);
  const [progress, setProgress] = useState(currentProgress);
  const [text, setText] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const statuses = ['No iniciada', 'En curso', 'Listo', 'Aplazado', 'Cancelado', 'Sati', 'Pausado'];

  const [nextStepResponsible, setNextStepResponsible] = useState('');
  const [nextStepDueDate, setNextStepDueDate] = useState('');
  
  const [closureSummary, setClosureSummary] = useState('');
  const [closureEvidenceUrl, setClosureEvidenceUrl] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');

  const { allUsers } = useStore();

  const handleSave = () => {
    const attachments = attachmentUrl ? [{ name: attachmentName || 'Adjunto', url: attachmentUrl }] : [];
    updateStatus(entityType, entityId, status as any, progress, text, blockers, nextSteps, attachments, nextStepResponsible, nextStepDueDate, closureSummary, closureEvidenceUrl, lessonsLearned);
    onClose();
  };

  const processAudioOnServer = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        try {
           const response = await fetch('/api/transcribe', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  audioBase64: base64data,
                  mimeType: audioBlob.type
               })
           });
           
           if (!response.ok) {
              throw new Error('Error processing audio');
           }
           
           const data = await response.json();
           
           if (data.text) {
             setText((prev) => prev ? prev + '\n\n' + data.text : data.text);
           }
           if (data.blockers) {
             setBlockers((prev) => prev ? prev + ' | ' + data.blockers : data.blockers);
           }
           if (data.nextSteps) {
             setNextSteps((prev) => prev ? prev + ' | ' + data.nextSteps : data.nextSteps);
           }
        } catch (error) {
           console.error(error);
           alert("Hubo un problema al procesar el audio.");
        } finally {
           setIsProcessing(false);
        }
      };
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          await processAudioOnServer(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("No se pudo acceder al micrófono:", err);
        alert("No se pudo acceder al micrófono.");
      }
    } else {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-brand-dark">Registrar Avance</h3>
            <p className="text-sm text-gray-500 font-medium mt-1">{entityName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-[8px] text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Avance ({progress}%)</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-11"
              />
            </div>
          </div>

          <div className="space-y-3">
             <label className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wide">
                <span>Comentarios</span>
                <button 
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-colors ${isRecording ? 'bg-red-50 text-red-600' : 'bg-brand-light/10 text-brand-light hover:bg-brand-light/20'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                     <><Loader2 className="w-4 h-4 animate-spin text-brand-light" /> Procesando IA...</>
                  ) : (
                     <><Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                     {isRecording ? 'Detener y Procesar' : 'Dictar por voz'}</>
                  )}
                </button>
             </label>
             <textarea 
               rows={4}
               value={text}
               onChange={(e) => setText(e.target.value)}
               placeholder="Escribe o dicta el avance realizado..."
               className="w-full p-4 border border-gray-200 rounded-[12px] text-sm resize-none focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light"
             ></textarea>
             <input 
                 type="text" 
                 value={blockers}
                 onChange={(e) => setBlockers(e.target.value)}
                 placeholder="¿Hay algún bloqueo identificado?" 
                 className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light" 
               />
               <input 
                 type="text" 
                 value={nextSteps}
                 onChange={(e) => setNextSteps(e.target.value)}
                 placeholder="Definir Próximo paso" 
                 className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light" 
               />
               {status === 'En curso' && (
                 <div className="grid grid-cols-2 gap-3 mt-2 bg-brand-light/5 p-3 rounded-[8px] border border-brand-light/20">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Resp. próximo paso</label>
                      <select
                         value={nextStepResponsible}
                         onChange={(e) => setNextStepResponsible(e.target.value)}
                         className="w-full text-sm border border-gray-200 rounded-[8px] px-3 h-9 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 bg-white"
                      >
                         <option value="">Seleccionar...</option>
                         {allUsers?.map(u => (
                            <option key={u.id} value={u.email}>{u.name || u.email}</option>
                         ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Vencimiento próximo paso</label>
                      <input 
                         type="date"
                         value={nextStepDueDate}
                         onChange={(e) => setNextStepDueDate(e.target.value)}
                         className="w-full text-sm border border-gray-200 rounded-[8px] px-3 h-9 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1"
                      />
                    </div>
                    {(!nextSteps || !nextStepResponsible || !nextStepDueDate) && (
                       <p className="col-span-2 text-xs text-red-500 mt-1 flex items-center gap-1">
                         <AlertCircle className="w-3 h-3" /> Faltan datos obligatorios para el próximo paso.
                       </p>
                    )}
                 </div>
               )}

               {status === 'Listo' && (
                 <div className="grid grid-cols-1 gap-3 mt-2 bg-green-50/50 p-4 rounded-[8px] border border-green-100">
                    <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">Cierre Formal</h4>
                    <div className="space-y-1">
                      <input 
                         type="text"
                         value={closureSummary}
                         onChange={(e) => setClosureSummary(e.target.value)}
                         placeholder="Resultado obtenido / Resumen del cierre"
                         className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <input 
                         type="url"
                         value={closureEvidenceUrl}
                         onChange={(e) => setClosureEvidenceUrl(e.target.value)}
                         placeholder="URL de evidencia (Opcional)"
                         className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <textarea 
                         value={lessonsLearned}
                         onChange={(e) => setLessonsLearned(e.target.value)}
                         placeholder="Aprendizaje o nota final (Opcional)"
                         className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 bg-white resize-none"
                         rows={2}
                      />
                    </div>
                    {(!closureSummary) && (
                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                         <AlertCircle className="w-3 h-3" /> Debe completar el resultado obtenido.
                       </p>
                    )}
                 </div>
               )}

               <div className="grid grid-cols-2 gap-3 pt-2">
                 <input 
                   type="text" 
                   value={attachmentName}
                   onChange={(e) => setAttachmentName(e.target.value)}
                   placeholder="Nombre del adjunto (opcional)" 
                   className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light" 
                 />
                 <input 
                   type="text" 
                   value={attachmentUrl}
                   onChange={(e) => setAttachmentUrl(e.target.value)}
                   placeholder="URL del archivo (Drive, etc.)" 
                   className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light" 
                 />
               </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="px-4">Cancelar</Button>
          <Button onClick={handleSave} className="gap-2" disabled={isProcessing}>
             <Save className="w-4 h-4" />
             Guardar Avance
          </Button>
        </div>
      </div>
    </div>
  );
};

