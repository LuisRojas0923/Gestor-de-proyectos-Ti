import React from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button, MaterialCard as Card, Text, Input } from '../../../../../components/atoms';
import { RangoPeriodo } from '../hooks/useAuditoriaStats';

interface PeriodSelectorProps {
  periodo: RangoPeriodo;
  setPeriodo: (p: RangoPeriodo) => void;
  fechaDesde: string;
  setFechaDesde: (f: string) => void;
  fechaHasta: string;
  setFechaHasta: (f: string) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periodo,
  setPeriodo,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta
}) => {
  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        <Filter className="w-5 h-5 text-[var(--color-primary)]" />
        <Text variant="body2" weight="bold">Filtro de Período</Text>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <Button 
          variant={periodo === 'hoy' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setPeriodo('hoy')}
        >
          Hoy
        </Button>
        <Button 
          variant={periodo === '7dias' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setPeriodo('7dias')}
        >
          Últimos 7 días
        </Button>
        <Button 
          variant={periodo === '30dias' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setPeriodo('30dias')}
        >
          Últimos 30 días
        </Button>
        <Button 
          variant={periodo === 'personalizado' ? 'primary' : 'ghost'} 
          size="sm" 
          onClick={() => setPeriodo('personalizado')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Personalizado
        </Button>
      </div>

      {periodo === 'personalizado' && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 w-full lg:w-auto">
          <Input 
            type="date" 
            aria-label="Fecha inicial"
            className="w-full h-9 text-sm"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
          <Text variant="caption" color="text-secondary">a</Text>
          <Input 
            type="date" 
            aria-label="Fecha final"
            className="w-full h-9 text-sm"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
      )}
    </Card>
  );
};

export default PeriodSelector;
