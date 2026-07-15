import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, MaterialCard, Text, Title } from '../../../../components/atoms';
import Callout from '../../../../components/molecules/Callout';
import { useAppContext } from '../../../../context/AppContext';
import GestionTiempoAsistenciaSection from './GestionTiempoAsistenciaSection';
import {
  obtenerOpcionesTiempoAsistencia,
  SECCIONES_TIEMPO_ASISTENCIA,
} from './gestionTiempoAsistenciaConfig';

interface GestionTiempoAsistenciaProps {
  moduleStatus?: Record<string, boolean>;
}

const GestionTiempoAsistencia = ({ moduleStatus = {} }: GestionTiempoAsistenciaProps) => {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const opciones = obtenerOpcionesTiempoAsistencia(state.user?.permissions, moduleStatus);

  return (
    <Text as="div" className="space-y-7 py-4">
      <Text as="div" className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Text as="div" className="space-y-2">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/service-portal/inicio')} className="-ml-2">
            Volver al inicio
          </Button>
          <Text as="div" className="flex items-center gap-3">
            <MaterialCard elevation={0} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Clock className="h-7 w-7" aria-hidden="true" />
            </MaterialCard>
            <Text as="div">
              <Title variant="h3" weight="bold">Gestión de Tiempo y Asistencia</Title>
              <Text color="text-secondary">Horarios, asistencia biométrica y horas extras en un solo lugar.</Text>
            </Text>
          </Text>
        </Text>
      </Text>

      {opciones.length === 0 ? (
        <MaterialCard className="mx-auto max-w-2xl p-6">
          <Callout variant="info" title="No hay opciones disponibles">
            Tu perfil no tiene funciones de tiempo y asistencia habilitadas.
          </Callout>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/service-portal/inicio')}>
            Volver al inicio
          </Button>
        </MaterialCard>
      ) : (
        <Text as="div" className="space-y-4">
          {SECCIONES_TIEMPO_ASISTENCIA.map((seccion) => {
            const opcionesSeccion = opciones.filter((opcion) => opcion.seccion === seccion.id);
            if (opcionesSeccion.length === 0) return null;
            return (
              <GestionTiempoAsistenciaSection
                key={seccion.id}
                titulo={seccion.titulo}
                descripcion={seccion.descripcion}
                opciones={opcionesSeccion}
                onNavigate={navigate}
              />
            );
          })}
        </Text>
      )}
    </Text>
  );
};

export default GestionTiempoAsistencia;
