import React from 'react';

interface WizardStep1Props {
  stageId: number;
  activityType: string;
  actorType: string;
  status: string;
  startDate: string;
  stages: Array<{ id: number; stage_name: string }>;
  onStageChange: (stageId: number) => void;
  onActivityTypeChange: (type: string) => void;
  onActorTypeChange: (actor: string) => void;
  onStatusChange: (status: string) => void;
  onStartDateChange: (date: string) => void;
  darkMode: boolean;
}

export const WizardStep1: React.FC<WizardStep1Props> = ({
  stageId,
  activityType,
  actorType,
  status,
  startDate,
  stages,
  onStageChange,
  onActivityTypeChange,
  onActorTypeChange,
  onStatusChange,
  onStartDateChange,
  darkMode,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          Etapa *
        </label>
        <select
          value={stageId}
          onChange={(e) => onStageChange(Number(e.target.value))}
          className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
        >
          {stages.length === 0 && <option value={stageId}>{`${stageId}`}</option>}
          {stages.map(s => (
            <option key={s.id} value={s.id}>{`${s.id}. ${s.stage_name}`}</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Tipo de Actividad *
          </label>
          <select 
            value={activityType} 
            onChange={(e) => onActivityTypeChange(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
          >
            <option value="nueva_actividad">Nueva actividad</option>
            <option value="seguimiento">Seguimiento</option>
            <option value="cierre_etapa">Cierre de etapa</option>
            <option value="cambio_etapa">Cambio de etapa</option>
            <option value="observacion">Observación</option>
          </select>
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Actor *
          </label>
          <select 
            value={actorType} 
            onChange={(e) => onActorTypeChange(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
          >
            <option value="equipo_interno">Equipo Interno</option>
            <option value="proveedor">Proveedor</option>
            <option value="usuario">Usuario</option>
            <option value="sistema">Sistema</option>
          </select>
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Estado *
          </label>
          <select 
            value={status} 
            onChange={(e) => onStatusChange(e.target.value)} 
            className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          Fecha de Inicio *
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
          required
        />
      </div>
    </div>
  );
};
