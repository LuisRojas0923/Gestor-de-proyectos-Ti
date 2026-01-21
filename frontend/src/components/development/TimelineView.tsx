import React from 'react';
import { Calendar } from 'lucide-react';
import DevelopmentTimeline from './DevelopmentTimeline';
import { DevelopmentWithCurrentStatus } from '../../types';
import { Title, Text, MaterialCard } from '../atoms';

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
      <MaterialCard className="p-6">
        <div className="text-center">
          <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <Title variant="h3" weight="medium" className="mb-2">
            Selecciona un Desarrollo
          </Title>
          <Text color="secondary">
            Haz clic en un desarrollo de la lista para ver su timeline
          </Text>
        </div>
      </MaterialCard>
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
