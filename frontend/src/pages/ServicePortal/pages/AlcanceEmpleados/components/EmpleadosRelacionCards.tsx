import { Badge, Checkbox, MaterialCard, Text } from '../../../../../components/atoms';
import type { EmpleadoErpAlcance } from '../types';
import EmpleadoDatos from './EmpleadoDatos';

interface EmpleadosRelacionCardsProps {
  items: EmpleadoErpAlcance[];
  seleccionado: (empleado: EmpleadoErpAlcance) => boolean;
  onToggle: (empleado: EmpleadoErpAlcance) => void;
}

const EmpleadosRelacionCards = ({ items, seleccionado, onToggle }: EmpleadosRelacionCardsProps) => (
  <div className="space-y-3">
    {items.map((item) => (
      <MaterialCard key={item.cedula} className="p-4">
        <div className="flex min-h-11 items-start gap-3">
          <Checkbox checked={seleccionado(item)} onChange={() => onToggle(item)} aria-label={`${seleccionado(item) ? 'Quitar' : 'Relacionar'} ${item.nombre ?? item.cedula}`} className="min-h-11 min-w-11 justify-center" />
          <div className="min-w-0 flex-1"><Text className="font-semibold">{item.nombre ?? 'Sin nombre'}</Text><EmpleadoDatos etiqueta="Cédula" valor={item.cedula} mono /><EmpleadoDatos etiqueta="Cargo" valor={item.cargo} /></div>
        </div>
        <div className="mt-3 border-t border-[var(--color-border)] pt-3"><EmpleadoDatos etiqueta="Área" valor={item.area} /><EmpleadoDatos etiqueta="Ciudad" valor={item.ciudadcontratacion} /><EmpleadoDatos etiqueta="Jefe" valor={item.jefe} /></div>
        <div className="mt-3 flex flex-wrap gap-2"><Badge variant={item.autoriza_he ? 'success' : 'warning'}>{item.autoriza_he ? 'Autoriza HE' : 'No autoriza HE'}</Badge><Badge variant={item.disponible_semana ? 'info' : 'warning'}>{item.disponible_semana ? 'Disponible' : item.motivo_no_disponible?.replaceAll('_', ' ') || 'No disponible'}</Badge></div>
      </MaterialCard>
    ))}
  </div>
);

export default EmpleadosRelacionCards;
