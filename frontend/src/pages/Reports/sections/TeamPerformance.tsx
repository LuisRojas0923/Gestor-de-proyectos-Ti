import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, Award, Target } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { 
  MaterialCard, 
  MaterialTypography
} from '../../../components/atoms';

const TeamPerformance: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const { t } = useTranslation();

  const teamPerformanceData = [
    { name: 'Ana García', completados: 45, asignados: 52, sla: 92 },
    { name: 'Carlos López', completados: 38, asignados: 41, sla: 88 },
    { name: 'María Rodríguez', completados: 42, asignados: 48, sla: 95 },
    { name: 'Pedro Sánchez', completados: 35, asignados: 39, sla: 90 },
    { name: 'Laura Martín', completados: 29, asignados: 34, sla: 87 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <MaterialTypography variant="h5" darkMode={darkMode}>
              👥 Análisis de Rendimiento del Equipo
            </MaterialTypography>
          </div>
          <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
            Métricas de productividad, cumplimiento de SLA y análisis de rendimiento individual.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Métricas del Equipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                  Productividad Promedio
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                  87%
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-green-50 dark:bg-green-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-green-600 dark:text-green-400">
                  SLA Promedio
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-green-900 dark:text-green-100">
                  90%
                </MaterialTypography>
              </div>
              <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-yellow-50 dark:bg-yellow-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-yellow-600 dark:text-yellow-400">
                  Desarrollos Completados
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-yellow-900 dark:text-yellow-100">
                  189
                </MaterialTypography>
              </div>
              <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-purple-50 dark:bg-purple-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-purple-600 dark:text-purple-400">
                  Tiempo Promedio
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-purple-900 dark:text-purple-100">
                  2.1d
                </MaterialTypography>
              </div>
              <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Gráfico de Rendimiento */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
            Rendimiento por Miembro del Equipo
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }}
              />
              <YAxis tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#262626' : '#ffffff',
                  border: darkMode ? '1px solid #404040' : '1px solid #e5e5e5',
                  borderRadius: '8px',
                  color: darkMode ? '#ffffff' : '#000000',
                }}
              />
              <Bar dataKey="sla" fill="#0066A5" name="SLA %" />
            </BarChart>
          </ResponsiveContainer>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Detalle del Equipo */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
            Detalle de Rendimiento Individual
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="space-y-4">
            {teamPerformanceData.map((member, index) => (
              <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    member.sla >= 90 ? 'bg-green-100 dark:bg-green-900' :
                    member.sla >= 80 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    <MaterialTypography 
                      variant="h6" 
                      darkMode={darkMode}
                      className={
                        member.sla >= 90 ? 'text-green-600 dark:text-green-400' :
                        member.sla >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </MaterialTypography>
                  </div>
                  <div>
                    <MaterialTypography variant="subtitle1" darkMode={darkMode}>
                      {member.name}
                    </MaterialTypography>
                    <MaterialTypography variant="body2" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
                      {member.completados}/{member.asignados} desarrollos completados
                    </MaterialTypography>
                  </div>
                </div>
                <div className="text-right">
                  <MaterialTypography 
                    variant="h5" 
                    darkMode={darkMode}
                    className={
                      member.sla >= 90 ? 'text-green-500' : 
                      member.sla >= 80 ? 'text-yellow-500' : 'text-red-500'
                    }
                  >
                    {member.sla}%
                  </MaterialTypography>
                  <MaterialTypography variant="caption" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
                    SLA Cumplido
                  </MaterialTypography>
                </div>
              </div>
            ))}
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default TeamPerformance;
