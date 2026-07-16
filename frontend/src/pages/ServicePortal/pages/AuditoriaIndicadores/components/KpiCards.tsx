import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { Activity, ShieldAlert, CheckCircle, UserX } from 'lucide-react';
import type { AuditoriaEstadisticas } from '../../../../../types/auditoria';

interface KpiCardsProps {
  stats: AuditoriaEstadisticas;
  onClickDenegados?: () => void;
  onClickFallosAuth?: () => void;
}

const KpiCards: React.FC<KpiCardsProps> = ({ stats, onClickDenegados, onClickFallosAuth }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Activity className="w-6 h-6" />
        </div>
        <div className="flex-1 w-full min-w-0">
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
            Total Eventos
          </Text>
          <Title variant="h4" className="font-bold leading-none mt-1 text-blue-600 dark:text-blue-400">
            {stats.total_eventos.toLocaleString()}
          </Title>
          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center text-[11px] sm:text-xs">
            <Text as="span" color="text-secondary" className="text-[11px] sm:text-xs">
              Generados por <Text as="span" color="text-primary" weight="semibold" className="text-[11px] sm:text-xs">{stats.usuarios_unicos.toLocaleString()}</Text> usuarios únicos
            </Text>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 w-full min-w-0">
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
            Tasa de Éxito
          </Text>
          <Title variant="h4" className="font-bold leading-none mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.tasa_exito.toFixed(1)}%
          </Title>
          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] sm:text-xs">
            <Text as="span" className="text-amber-600 dark:text-amber-500 text-[11px] sm:text-xs truncate" weight="medium">
              Fallos: {(100 - stats.tasa_exito).toFixed(1)}%
            </Text>
            <Text as="span" color="text-secondary" className="whitespace-nowrap pl-1 text-[11px] sm:text-xs">
              — {stats.total_eventos - stats.total_exitosos} eventos
            </Text>
          </div>
        </div>
      </Card>

      <Card
        className={`p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 ${onClickDenegados ? 'cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors' : ''}`}
        onClick={onClickDenegados}
      >
        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
            Accesos Denegados
          </Text>
          <Title variant="h4" className="font-bold leading-none mt-1">
            {stats.total_denegados.toLocaleString()}
          </Title>
        </div>
      </Card>

      <Card
        className={`p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex items-center gap-4 ${onClickFallosAuth ? 'cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors' : ''}`}
        onClick={onClickFallosAuth}
      >
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <UserX className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">
            Fallos Autenticación
          </Text>
          <Title variant="h4" className="font-bold leading-none mt-1 truncate capitalize">
            {stats.total_fallos_auth.toLocaleString()}
          </Title>
        </div>
      </Card>
    </div>
  );
};

export default KpiCards;
