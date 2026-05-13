import { useState } from 'react';

export interface UseViewsReturn {
  // Vista principal
  activeView: 'list' | 'phases' | 'timeline';
  setActiveView: React.Dispatch<React.SetStateAction<'list' | 'phases' | 'timeline'>>;
  
  // Tab de fases
  activePhaseTab: 'phases' | 'gantt' | 'controls' | 'activities' | 'requirements';
  setActivePhaseTab: React.Dispatch<React.SetStateAction<'phases' | 'gantt' | 'controls' | 'activities' | 'requirements'>>;
  
  // Helper functions
  switchToList: () => void;
  switchToPhases: () => void;
  switchToTimeline: () => void;
}

/**
 * Hook para manejar el estado de las vistas y navegación
 */
export const useViews = (): UseViewsReturn => {
  const [activeView, setActiveView] = useState<'list' | 'phases' | 'timeline'>('list');
  const [activePhaseTab, setActivePhaseTab] = useState<'phases' | 'gantt' | 'controls' | 'activities' | 'requirements'>('phases');

  const switchToList = () => setActiveView('list');
  const switchToPhases = () => setActiveView('phases');
  const switchToTimeline = () => setActiveView('timeline');

  return {
    activeView,
    setActiveView,
    activePhaseTab,
    setActivePhaseTab,
    switchToList,
    switchToPhases,
    switchToTimeline,
  };
};
