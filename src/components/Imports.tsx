import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, History, Loader2, Users } from 'lucide-react';
import { Button } from './ui/Button';
import * as XLSX from 'xlsx';
import { useStore } from '../store/StoreContext';
import { db } from '../firebase';
import { doc, setDoc, writeBatch, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export const Imports: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { groups, projects, actions, subtasks, allUsers, importData } = useStore();
  const { user: currentUser } = useAuth();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
       setFile(e.target.files[0]);
       parseFile(e.target.files[0]);
    }
  };

  const parseFile = (fileToParse: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          setPreviewData(json);
          setShowPreview(true);
      };
      reader.readAsBinaryString(fileToParse);
  };

   const processImport = async () => {
      if (!previewData || previewData.length === 0) return;
      setLoading(true);
      
      try {
         const data = previewData;
         const { newGroups, newProjects, newActions, newSubtasks, newUsers } = await importData(data);
         
         let logs: string[] = [`Leídas ${data.length} filas del archivo.`];
         logs.push(`Importados Nuevos: ${newGroups} grupos, ${newProjects} proyectos, ${newActions} acciones, ${newSubtasks} tareas.`);
         if (newUsers > 0) logs.push(`Se crearon ${newUsers} usuarios pendientes de invitación.`);
         
         setImportLogs(prev => [...logs, ...prev]);
         alert("Importación completada con éxito!");
      } catch (err: any) {
         console.error(err);
         const errorMsg = err?.message || JSON.stringify(err);
         setImportLogs(prev => [`Error durante la importación: ${errorMsg}`, ...prev]);
         alert("Hubo un error al procesar la importación: " + errorMsg);
      } finally {
         setFile(null);
         setPreviewData([]);
         setShowPreview(false);
         setLoading(false);
      }
   };

    const downloadTemplate = () => {
        const templateData = [
            {
                "Grupo de proyecto": "Largo plazo",
                "Código proyecto": "1",
                "Nombre proyecto": "Planificador de rutas",
                "Descripción proyecto": "Sistema de optimización de rutas",
                "Código acción": "1.1",
                "Nombre acción": "Análisis de requisitos",
                "Descripción acción": "",
                "Código tarea": "",
                "Nombre tarea": "",
                "Descripción tarea": "",
                "Responsable principal (Email o Nombre)": "carlos.olmos@grupamar.es",
                "Responsables secundarios (Emails o Nombres)": "juan@grupamar.es;",
                "Estado": "No iniciada",
                "Porcentaje avance": "0",
                "Prioridad": "Alta",
                "Fecha registro": "",
                "Fecha inicio prevista": "2024-01-01",
                "Fecha fin prevista": "2024-01-31",
                "Notas": "",
                "Documentos / enlaces": ""
            },
            {
                "Grupo de proyecto": "Largo plazo",
                "Código proyecto": "1",
                "Nombre proyecto": "Planificador de rutas",
                "Descripción proyecto": "Sistema de optimización de rutas",
                "Código acción": "1.1",
                "Nombre acción": "Análisis de requisitos",
                "Descripción acción": "",
                "Código tarea": "1.1.1",
                "Nombre tarea": "Reunión de kickoff",
                "Descripción tarea": "Reunión para definir alcance",
                "Responsable principal (Email o Nombre)": "ana.lopez@grupamar.es",
                "Responsables secundarios (Emails o Nombres)": "",
                "Estado": "Listo",
                "Porcentaje avance": "100",
                "Prioridad": "Media",
                "Fecha registro": "",
                "Fecha inicio prevista": "2024-01-02",
                "Fecha fin prevista": "2024-01-02",
                "Notas": "Completada temprano",
                "Documentos / enlaces": ""
            }
        ];
        
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Importacion_Grupamar.xlsx");
    };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[16px] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Importación de Datos</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Carga y sincronización desde Excel (.xlsx)</p>
        </div>
        <Button variant="outline" className="gap-2 text-sm font-bold" onClick={downloadTemplate}>
           <Download className="w-4 h-4 text-brand-light" />
           Descargar Plantilla Excel
        </Button>
      </div>

      <div className="bg-white p-8 rounded-[16px] shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg text-brand-dark mb-4">Carga Inicial / Incremental</h3>
        
        {!showPreview ? (
            <form 
               onDragEnter={handleDrag} 
               onDragLeave={handleDrag} 
               onDragOver={handleDrag} 
               onDrop={handleDrop}
               className={`relative p-8 border-2 border-dashed rounded-[16px] text-center transition-colors ${dragActive ? 'border-brand-light bg-brand-light/5' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-lg font-bold text-brand-dark">Arrastra tu archivo Excel aquí</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">o haz clic para seleccionar (formatos soportados: .xlsx, .csv)</p>
              </div>
            </form>
        ) : (
            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-brand-light/5 p-4 rounded-[12px] border border-brand-light/20">
                     <FileSpreadsheet className="w-8 h-8 text-brand-light" />
                     <div className="flex-1">
                         <p className="font-bold text-brand-dark">{file?.name}</p>
                         <p className="text-sm text-gray-500">{previewData.length} filas detectadas</p>
                     </div>
                     <Button variant="ghost" onClick={() => { setFile(null); setShowPreview(false); setPreviewData([]); }}>
                         Cambiar Archivo
                     </Button>
                     <Button className="gap-2" onClick={processImport} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} 
                        Confirmar e Importar
                     </Button>
                </div>
                
                <div className="border border-gray-200 rounded-[12px] overflow-hidden">
                    <div className="max-h-[300px] overflow-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0 shadow-sm border-b border-gray-200">
                                <tr>
                                   <th className="p-3 font-bold">Grupo</th>
                                   <th className="p-3 font-bold">Cód. Proyecto</th>
                                   <th className="p-3 font-bold">Proyecto</th>
                                   <th className="p-3 font-bold">Cód. Acción</th>
                                   <th className="p-3 font-bold">Acción</th>
                                   <th className="p-3 font-bold">Cód. Tarea</th>
                                   <th className="p-3 font-bold">Tarea</th>
                                   <th className="p-3 font-bold">Responsable (Email o Nombre)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {previewData.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-600">{row['Grupo de proyecto'] || row['Carpeta']}</td>
                                        <td className="p-3 font-medium">{row['Código proyecto']}</td>
                                        <td className="p-3 text-brand-dark font-medium">{row['Nombre proyecto']}</td>
                                        <td className="p-3 font-medium">{row['Código acción']}</td>
                                        <td className="p-3 text-brand-dark font-medium">{row['Nombre acción'] || row['Descripción proyecto']}</td>
                                        <td className="p-3 font-medium">{row['Código tarea']}</td>
                                        <td className="p-3 text-gray-700">{row['Nombre tarea']}</td>
                                        <td className="p-3 text-brand-light">{row['Responsable principal (Email o Nombre)'] || row['Responsable principal email']}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {previewData.length > 10 && (
                        <div className="bg-gray-50 p-2 text-center text-xs text-gray-500 font-medium border-t border-gray-200">
                            Mostrando 10 de {previewData.length} filas...
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
           <History className="w-5 h-5 text-gray-400" />
           <h3 className="font-bold text-brand-dark">Historial de Importaciones</h3>
        </div>
        <div className="p-6">
           {importLogs.length === 0 ? (
             <div className="text-center text-gray-500 font-medium text-sm">No hay importaciones registradas.</div>
           ) : (
             <ul className="space-y-3 text-sm text-gray-700">
               {importLogs.map((log, idx) => (
                   <li key={idx} className="bg-gray-50 p-4 rounded-[12px] border border-gray-100/80 flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                       <span className="leading-relaxed font-medium">{log}</span>
                   </li>
               ))}
             </ul>
           )}
        </div>
      </div>
    </div>
  );
};
