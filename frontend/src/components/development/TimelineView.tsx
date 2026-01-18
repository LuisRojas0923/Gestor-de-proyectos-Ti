import React from 'react';
import { Calendar } from 'lucide-react';
import DevelopmentTimeline from './DevelopmentTimeline';
import { DevelopmentWithCurrentStatus } from '../../types';

interface TimelineViewProps {
  selectedDevelopment: DevelopmentWithCurrentStatus | null;
  darkMode: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  selectedDevelopment,
  darkMode,
}) => {
  if (!selectedDevelopment) {
    return (
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
        <div className="text-center">
          <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Selecciona un Desarrollo
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Haz clic en un desarrollo de la lista para ver su timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DevelopmentTimeline
        cycleFlow={[]} // Se cargará desde el componente
        currentDevelopment={selectedDevelopment}
      />
    </div>
  );
};
