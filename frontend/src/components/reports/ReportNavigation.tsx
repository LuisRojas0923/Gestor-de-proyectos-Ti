import React from 'react';
import {
  BarChart3,
  FileText,
  Shield,
  Users,
  LucideIcon
} from 'lucide-react';
import { Button, MaterialCard } from '../atoms';

export interface ReportTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface ReportNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  darkMode: boolean;
}

const ReportNavigation: React.FC<ReportNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {

  const tabs: ReportTab[] = [
    {
      id: 'portal',
      label: 'Tickets del Portal',
      icon: FileText,
    },
    {
      id: 'executive',
      label: 'Reporte Ejecutivo',
      icon: BarChart3,
    },
    {
      id: 'quality',
      label: 'Calidad',
      icon: Shield,
    },
    {
      id: 'performance',
      label: 'Rendimiento',
      icon: Users,
    },
  ];

  return (
    <MaterialCard className="p-2 mb-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Button
              key={tab.id}
              variant={isActive ? 'primary' : 'outline'}
              icon={Icon}
              onClick={() => onTabChange(tab.id)}
              className={`transition-all duration-200 ${isActive
                ? 'shadow-md'
                : 'hover:shadow-sm'
                }`}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>
    </MaterialCard>
  );
};

export default ReportNavigation;
