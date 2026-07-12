import { MaterialCard, Text, Title } from '../../../../components/atoms';
import ServiceCard from '../../../../components/molecules/ServiceCard';
import type { OpcionTiempoAsistencia } from './gestionTiempoAsistenciaConfig';

interface GestionTiempoAsistenciaSectionProps {
  titulo: string;
  descripcion: string;
  opciones: OpcionTiempoAsistencia[];
  onNavigate: (ruta: string) => void;
}

const GestionTiempoAsistenciaSection = ({
  titulo,
  descripcion,
  opciones,
  onNavigate,
}: GestionTiempoAsistenciaSectionProps) => {
  const sectionId = `tiempo-asistencia-${titulo.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <MaterialCard elevation={0} role="region" aria-labelledby={sectionId} className="space-y-5 p-5 md:p-6">
      <Text as="div" className="space-y-1">
        <Title id={sectionId} variant="h4" weight="bold">{titulo}</Title>
        <Text color="text-secondary">{descripcion}</Text>
      </Text>
      <Text as="div" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {opciones.map((opcion) => {
          const OpcionIcon = opcion.icono;
          return (
            <ServiceCard
              key={opcion.id}
              title={opcion.titulo}
              description={opcion.descripcion}
              icon={<OpcionIcon className="h-7 w-7" aria-hidden="true" />}
              onClick={() => onNavigate(opcion.ruta)}
            />
          );
        })}
      </Text>
    </MaterialCard>
  );
};

export default GestionTiempoAsistenciaSection;
