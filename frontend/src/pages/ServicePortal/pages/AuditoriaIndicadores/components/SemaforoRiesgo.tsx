import React from 'react';
import { MaterialCard as Card, Title, Text, Badge } from '../../../../../components/atoms';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AuditoriaEstadisticas } from '../../../../../types/auditoria';

interface SemaforoRiesgoProps {
  stats: AuditoriaEstadisticas;
}

type NivelRiesgo = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

const SemaforoRiesgo: React.FC<SemaforoRiesgoProps> = ({ stats }) => {
  // Lógica de cálculo de nivel de riesgo
  const fallosAuth = stats.total_fallos_auth || 0;
  const denegados = stats.total_denegados || 0;
  const fallidos = stats.total_fallidos || 0; // Fallos de sistema (HTTP 500)

  const { nivel, significado, accion, motivo, colorClass, icon } = React.useMemo(() => {
    let nivel: NivelRiesgo = 'Bajo';

    if (denegados >= 5 || fallidos >= 3) {
      nivel = 'Crítico';
    } else if (denegados >= 3 || fallosAuth >= 5 || fallidos >= 1) {
      nivel = 'Alto';
    } else if (denegados >= 1 || fallosAuth >= 2) {
      nivel = 'Medio';
    }

    // Configuración según nivel
    switch (nivel) {
      case 'Crítico':
        return {
          nivel,
          significado: 'Posible incidente activo',
          accion: 'Escalar inmediatamente a seguridad de TI',
          motivo: `${denegados} accesos denegados y ${fallidos} errores críticos de sistema detectados.`,
          colorClass: {
            border: 'border-red-200 dark:border-red-900/30',
            bg: 'bg-red-50/40 dark:bg-red-950/10',
            text: 'text-red-600 dark:text-red-400',
            badge: 'error'
          },
          icon: <AlertOctagon className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
        };
      case 'Alto':
        return {
          nivel,
          significado: 'Riesgo operativo o seguridad',
          accion: 'Revisar logs del período inmediatamente',
          motivo: `${fallosAuth} fallos de autenticación y ${denegados} accesos denegados detectados.`,
          colorClass: {
            border: 'border-orange-200 dark:border-orange-900/30',
            bg: 'bg-orange-50/40 dark:bg-orange-950/10',
            text: 'text-orange-600 dark:text-orange-400',
            badge: 'warning'
          },
          icon: <ShieldAlert className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        };
      case 'Medio':
        return {
          nivel,
          significado: 'Requiere revisión',
          accion: 'Validar la causa de los bloqueos',
          motivo: `${fallosAuth} fallos de autenticación y ${denegados} acceso${denegados !== 1 ? 's' : ''} denegado${denegados !== 1 ? 's' : ''} en el período.`,
          colorClass: {
            border: 'border-amber-200 dark:border-amber-900/30',
            bg: 'bg-amber-50/40 dark:bg-amber-950/10',
            text: 'text-amber-600 dark:text-amber-500',
            badge: 'warning'
          },
          icon: <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
        };
      case 'Bajo':
      default:
        return {
          nivel,
          significado: 'Comportamiento normal',
          accion: 'Sin acción requerida',
          motivo: 'Todas las operaciones dentro de los umbrales de estabilidad del sistema.',
          colorClass: {
            border: 'border-emerald-200 dark:border-emerald-900/30',
            bg: 'bg-emerald-50/40 dark:bg-emerald-950/10',
            text: 'text-emerald-600 dark:text-emerald-400',
            badge: 'success'
          },
          icon: <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        };
    }
  }, [fallosAuth, denegados, fallidos]);

  return (
    <Card className={`p-5 border ${colorClass.border} ${colorClass.bg} shadow-sm rounded-xl mb-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Columna 1: Nivel de Riesgo */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-neutral-700">
            {icon}
          </div>
          <div>
            <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
              Estado de Riesgo del Sistema
            </Text>
            <div className="flex items-center gap-2 mt-1">
              <Title variant="h5" className={`font-extrabold ${colorClass.text}`}>
                Riesgo {nivel}
              </Title>
              <Badge variant={colorClass.badge as 'success' | 'warning' | 'error' | 'default' | 'info'} size="sm" className="font-semibold px-2 py-0.5">
                {significado.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Columna 2: Diagnóstico/Motivo */}
        <div className="flex-1 min-w-0 md:border-l md:border-[var(--color-border)] md:pl-6">
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">
            Diagnóstico / Motivo
          </Text>
          <Text variant="body2" className="text-[var(--color-text-primary)] font-medium leading-relaxed">
            {motivo}
          </Text>
        </div>

        {/* Columna 3: Sugerencia de Acción */}
        <div className="shrink-0 md:border-l md:border-[var(--color-border)] md:pl-6 min-w-[200px]">
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider block mb-1">
            Acción Sugerida
          </Text>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              nivel === 'Bajo' ? 'bg-emerald-500' :
              nivel === 'Medio' ? 'bg-amber-500' :
              nivel === 'Alto' ? 'bg-orange-500' : 'bg-red-500'
            }`} />
            <Text variant="body2" className="font-semibold text-[var(--color-text-primary)]">
              {accion}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SemaforoRiesgo;
