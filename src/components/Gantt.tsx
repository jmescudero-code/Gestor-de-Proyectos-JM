import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { Calendar, ChevronRight, ChevronDown, User, AlertCircle, Info } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface PeriodColumn {
  start: Date;
  end: Date;
  label: string;
  subLabel?: string;
}

export const Gantt: React.FC = () => {
  const { groups: allG, projects: allP, actions: allA } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Filter out inactive items
  const activeGroups = new Set(allG.filter(g => g.active !== false).map(g => g.id));
  const projects = allP.filter(p => p.active !== false && (!p.groupId || activeGroups.has(p.groupId)));
  const activeProjects = new Set(projects.map(p => p.id));
  const actions = allA.filter(a => a.active !== false && (!a.projectId || activeProjects.has(a.projectId)));

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Generate periods for timeline
  const timelineData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const columns: PeriodColumn[] = [];
    
    if (viewMode === 'day') {
      // 30 days starting from today - 5 days
      const start = new Date(today);
      start.setDate(today.getDate() - 5);
      for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const nextD = new Date(d);
        nextD.setDate(d.getDate() + 1);
        columns.push({
          start: d,
          end: nextD,
          label: d.getDate().toString(),
          subLabel: d.toLocaleDateString('es-ES', { month: 'short' })
        });
      }
    } else if (viewMode === 'week') {
      // 12 weeks starting from today - 2 weeks
      // Find the start of the week (Monday) for today - 2 weeks
      const start = new Date(today);
      start.setDate(today.getDate() - 14);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(start.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      for (let i = 0; i < 12; i++) {
        const wStart = new Date(monday);
        wStart.setDate(monday.getDate() + i * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 7);
        
        // Calculate ISO Week number
        const tempDate = new Date(wStart.getTime());
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

        columns.push({
          start: wStart,
          end: wEnd,
          label: `S${weekNum}`,
          subLabel: wStart.toLocaleDateString('es-ES', { month: 'short' })
        });
      }
    } else if (viewMode === 'month') {
      // 12 months starting from today - 2 months
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const mEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
        columns.push({
          start: mStart,
          end: mEnd,
          label: mStart.toLocaleDateString('es-ES', { month: 'short' }),
          subLabel: mStart.getFullYear().toString()
        });
      }
    } else {
      // 'year' mode: 3 years starting from today - 1 year
      const start = new Date(today.getFullYear() - 1, 0, 1);
      for (let i = 0; i < 3; i++) {
        const yStart = new Date(start.getFullYear() + i, 0, 1);
        const yEnd = new Date(start.getFullYear() + i + 1, 0, 1);
        columns.push({
          start: yStart,
          end: yEnd,
          label: yStart.getFullYear().toString(),
          subLabel: 'Año'
        });
      }
    }

    const timelineStart = columns[0].start;
    const timelineEnd = columns[columns.length - 1].end;
    
    return { columns, timelineStart, timelineEnd };
  }, [viewMode]);

  const { columns, timelineStart, timelineEnd } = timelineData;
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

  // Helper to parse dates into Date objects, support string and firebase timestamp formats
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    if (typeof d === 'object' && d.toDate) return d.toDate();
    if (typeof d === 'string' && d.trim() !== '') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  // Helper to get left and width percentage for a date range
  const getBarPosition = (startVal: any, endVal: any) => {
    const start = parseDate(startVal);
    const end = parseDate(endVal);

    if (!start && !end) return null;

    // Default dates if one is missing
    const resolvedStart = start || new Date(timelineStart);
    const resolvedEnd = end || (start ? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date(timelineEnd));

    if (resolvedStart.getTime() > resolvedEnd.getTime()) return null;

    // Calculate boundary constraints relative to timeline
    const leftTime = Math.max(resolvedStart.getTime(), timelineStart.getTime());
    const rightTime = Math.min(resolvedEnd.getTime(), timelineEnd.getTime());

    if (rightTime < timelineStart.getTime() || leftTime > timelineEnd.getTime()) {
      // Out of view range
      return null;
    }

    const left = ((leftTime - timelineStart.getTime()) / totalDuration) * 100;
    const width = ((rightTime - leftTime) / totalDuration) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 1.5)}%`, // minimum width so it is always visible
      rawStart: resolvedStart,
      rawEnd: resolvedEnd,
      outOfRangeLeft: resolvedStart.getTime() < timelineStart.getTime(),
      outOfRangeRight: resolvedEnd.getTime() > timelineEnd.getTime()
    };
  };

  // Get Today line position
  const todayPosition = useMemo(() => {
    const now = new Date();
    if (now.getTime() < timelineStart.getTime() || now.getTime() > timelineEnd.getTime()) {
      return null;
    }
    const offset = ((now.getTime() - timelineStart.getTime()) / totalDuration) * 100;
    return `${offset}%`;
  }, [timelineStart, timelineEnd, totalDuration]);

  // Color mapper based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Listo':
        return {
          bg: 'bg-emerald-500',
          progressBg: 'bg-emerald-600',
          text: 'text-emerald-700',
          border: 'border-emerald-600/20'
        };
      case 'Sati':
        return {
          bg: 'bg-teal-500',
          progressBg: 'bg-teal-600',
          text: 'text-teal-700',
          border: 'border-teal-600/20'
        };
      case 'En curso':
        return {
          bg: 'bg-blue-500',
          progressBg: 'bg-blue-600',
          text: 'text-blue-700',
          border: 'border-blue-600/20'
        };
      case 'Aplazado':
      case 'Pausado':
        return {
          bg: 'bg-amber-500',
          progressBg: 'bg-amber-600',
          text: 'text-amber-700',
          border: 'border-amber-600/20'
        };
      case 'Cancelado':
        return {
          bg: 'bg-red-500',
          progressBg: 'bg-red-600',
          text: 'text-red-700',
          border: 'border-red-600/20'
        };
      default: // 'No iniciada' or default
        return {
          bg: 'bg-gray-400',
          progressBg: 'bg-gray-500',
          text: 'text-gray-600',
          border: 'border-gray-500/20'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header and Filter Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-[16px] shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-brand-light" />
            Planificador Gantt
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Cronograma de proyectos y acciones en base a fechas propuestas</p>
        </div>
        
        {/* Toggle buttons for view modes */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start md:self-auto shrink-0">
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        
        {/* Status Legend */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span> No iniciada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> En curso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Listo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span> Pausado / Aplazado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span> Cancelado
          </span>
          <span className="ml-auto flex items-center gap-1 text-gray-400 font-normal">
            <Info className="w-3.5 h-3.5" />
            Pasa el cursor sobre las barras para ver las fechas de inicio y fin.
          </span>
        </div>

        {/* The Grid Workspace */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px] flex flex-col">
            
            {/* Header Columns */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 select-none">
              {/* Left Side spacer */}
              <div className="w-[320px] p-4 border-r border-gray-200 shrink-0 font-bold text-xs uppercase tracking-widest text-gray-400">
                Estructura de Trabajo
              </div>
              {/* Timeline Header Cells */}
              <div className="flex-1 flex">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex-1 p-3 text-center border-r border-gray-100 last:border-0 flex flex-col justify-center min-w-[50px] overflow-hidden">
                    <span className="text-xs font-bold text-brand-dark">{col.label}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{col.subLabel}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tree and Timeline Rows */}
            <div className="divide-y divide-gray-100 relative">
              
              {/* Today indicator vertical line */}
              {todayPosition && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500/70 border-l border-dashed border-red-500 z-10 pointer-events-none" 
                  style={{ left: `calc(320px + ${todayPosition})` }}
                  title="Hoy"
                >
                  <span className="absolute top-0 -translate-x-1/2 bg-red-500 text-white font-bold text-[8px] px-1 rounded shadow">HOY</span>
                </div>
              )}

              {projects.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium text-sm">
                  No hay proyectos activos registrados con fechas.
                </div>
              ) : (
                projects.map(p => {
                  const pActions = actions.filter(a => a.projectId === p.id);
                  const isExpanded = !!expandedProjects[p.id];
                  const projPos = getBarPosition(p.startDate || p.plannedStartDate, p.endDate || p.plannedEndDate);
                  const pColors = getStatusColor(p.status);

                  return (
                    <React.Fragment key={p.id}>
                      {/* Project Row */}
                      <div className="flex hover:bg-gray-50/60 transition-colors group items-center">
                        {/* Project Header Left Cell */}
                        <div className="w-[320px] p-3 border-r border-gray-200 shrink-0 flex items-center gap-2 pr-4">
                          <button 
                            onClick={() => toggleProject(p.id)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded font-bold shrink-0">
                                P.{p.code}
                              </span>
                              <span className="font-bold text-sm text-brand-dark truncate" title={p.name}>
                                {p.name}
                              </span>
                            </div>
                            {p.responsible && (
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5 mt-0.5 truncate">
                                <User className="w-3 h-3" /> {p.responsible}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Project Gantt Timeline cell */}
                        <div className="flex-1 flex h-[58px] relative bg-gray-50/20 select-none">
                          {/* Grid Background columns */}
                          {columns.map((_, idx) => (
                            <div key={idx} className="flex-1 border-r border-gray-100/60 last:border-0"></div>
                          ))}

                          {/* Gantt Bar */}
                          {projPos && (
                            <div 
                              className={`absolute top-3 bottom-3 rounded-lg shadow-sm border ${pColors.bg} ${pColors.border} flex items-center overflow-hidden transition-all group/bar cursor-pointer z-0`}
                              style={{ left: projPos.left, width: projPos.width }}
                            >
                              {/* Inner progress fill bar */}
                              <div 
                                className={`h-full absolute left-0 top-0 ${pColors.progressBg} opacity-30`}
                                style={{ width: `${p.progress}%` }}
                              />
                              
                              {/* Labels inside the bar */}
                              <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold text-white truncate pointer-events-none">
                                <span className="truncate pr-1">{p.name}</span>
                                <span>{p.progress}%</span>
                              </div>

                              {/* Tooltip */}
                              <div className="invisible group-hover/bar:visible absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-brand-dark/95 text-white text-[11px] p-2.5 rounded-lg shadow-lg z-30 w-52 leading-relaxed pointer-events-none">
                                <p className="font-bold border-b border-white/10 pb-1 mb-1 text-xs">{p.name}</p>
                                <p><span className="text-gray-300 font-semibold">Responsable:</span> {p.responsible || 'Sin asignar'}</p>
                                <p><span className="text-gray-300 font-semibold">Estado:</span> {p.status} ({p.progress}%)</p>
                                <p><span className="text-gray-300 font-semibold">Inicio:</span> {projPos.rawStart.toLocaleDateString('es-ES')}</p>
                                <p><span className="text-gray-300 font-semibold">Límite:</span> {projPos.rawEnd.toLocaleDateString('es-ES')}</p>
                                {p.priority && <p><span className="text-gray-300 font-semibold">Prioridad:</span> {p.priority}</p>}
                              </div>
                              
                              {/* Boundary limit markers */}
                              {projPos.outOfRangeLeft && (
                                <div className="absolute left-0 top-0 bottom-0 bg-red-400/30 w-1 flex items-center justify-center font-bold text-[8px] text-red-700">◀</div>
                              )}
                              {projPos.outOfRangeRight && (
                                <div className="absolute right-0 top-0 bottom-0 bg-red-400/30 w-1 flex items-center justify-center font-bold text-[8px] text-red-700">▶</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Rows (expanded list) */}
                      {isExpanded && pActions.map(a => {
                        const actPos = getBarPosition(a.startDate || a.plannedStartDate, a.endDate || a.plannedEndDate);
                        const aColors = getStatusColor(a.status);

                        return (
                          <div key={a.id} className="flex hover:bg-gray-50/40 transition-colors group/row items-center bg-gray-50/10">
                            {/* Action Left Header Cell */}
                            <div className="w-[320px] p-2 pl-9 border-r border-gray-200 shrink-0 flex items-center pr-4">
                              <div className="truncate flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] bg-brand-light/10 text-brand-light px-1 py-0.5 rounded font-medium shrink-0">
                                    A.{a.code}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700 truncate" title={a.name}>
                                    {a.name}
                                  </span>
                                </div>
                                {a.responsible && (
                                  <span className="text-[9px] text-gray-400 flex items-center gap-0.5 mt-0.5 truncate">
                                    <User className="w-2.5 h-2.5" /> {a.responsible}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Gantt Timeline Cell */}
                            <div className="flex-1 flex h-[46px] relative bg-white select-none">
                              {/* Grid background columns */}
                              {columns.map((_, idx) => (
                                <div key={idx} className="flex-1 border-r border-gray-100/40 last:border-0"></div>
                              ))}

                              {/* Gantt Bar for Action */}
                              {actPos && (
                                <div 
                                  className={`absolute top-2.5 bottom-2.5 rounded shadow-sm border ${aColors.bg} ${aColors.border} flex items-center overflow-hidden transition-all group/bar cursor-pointer z-0`}
                                  style={{ left: actPos.left, width: actPos.width }}
                                >
                                  {/* Progress fill */}
                                  <div 
                                    className={`h-full absolute left-0 top-0 ${aColors.progressBg} opacity-30`}
                                    style={{ width: `${a.progress}%` }}
                                  />

                                  {/* Labels inside the bar */}
                                  <div className="absolute inset-0 flex items-center justify-between px-1.5 text-[9px] font-bold text-white truncate pointer-events-none">
                                    <span className="truncate pr-1">{a.name}</span>
                                    <span>{a.progress}%</span>
                                  </div>

                                  {/* Tooltip */}
                                  <div className="invisible group-hover/bar:visible absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-brand-dark/95 text-white text-[11px] p-2.5 rounded-lg shadow-lg z-30 w-52 leading-relaxed pointer-events-none">
                                    <p className="font-bold border-b border-white/10 pb-1 mb-1 text-xs">{a.name}</p>
                                    <p><span className="text-gray-300 font-semibold">Acción Código:</span> {a.code}</p>
                                    <p><span className="text-gray-300 font-semibold">Responsable:</span> {a.responsible || 'Sin asignar'}</p>
                                    <p><span className="text-gray-300 font-semibold">Estado:</span> {a.status} ({a.progress}%)</p>
                                    <p><span className="text-gray-300 font-semibold">Inicio:</span> {actPos.rawStart.toLocaleDateString('es-ES')}</p>
                                    <p><span className="text-gray-300 font-semibold">Límite:</span> {actPos.rawEnd.toLocaleDateString('es-ES')}</p>
                                  </div>

                                  {/* Boundary markers */}
                                  {actPos.outOfRangeLeft && (
                                    <div className="absolute left-0 top-0 bottom-0 bg-red-400/30 w-1 flex items-center justify-center font-bold text-[7px] text-red-700">◀</div>
                                  )}
                                  {actPos.outOfRangeRight && (
                                    <div className="absolute right-0 top-0 bottom-0 bg-red-400/30 w-1 flex items-center justify-center font-bold text-[7px] text-red-700">▶</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
