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
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        <Filter className="w-5 h-5 text-[var(--color-primary)]" />
        <Text variant="body2" weight="bold">Filtro de Período</Text>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
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
          icon={<Calendar className="w-4 h-4" />}
        >
          Personalizado
        </Button>
      </div>

      {periodo === 'personalizado' && (
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            className="w-auto h-9 text-sm"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
          <Text variant="caption" color="text-secondary">a</Text>
          <Input 
            type="date" 
            className="w-auto h-9 text-sm"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
      )}
    </Card>
  );
};

export default PeriodSelector;
