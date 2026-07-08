import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, Settings2 } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Text, Textarea, Title } from '../../../../components/atoms';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  actualizarParametrosCalculo,
  obtenerParametrosCalculo,
} from '../../../../services/horasExtrasService';
import type { ParametroCalculo } from '../../../../types/horasExtras';

type ParametroEditable = ParametroCalculo & { editado: string; observacionEditada: string };

const ordenGrupos = ['Jornada semanal', 'Valor hora', 'Jornada nocturna', 'Topes'];
const parametrosHistoricosOcultos = new Set([
  'HORAS_ORDINARIAS_SEMANALES_PREVIAS',
  'DIVISOR_HORA_ORDINARIA_PREVIO',
]);

const ConfiguracionHorasExtrasView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [parametros, setParametros] = useState<ParametroEditable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const respuesta = await obtenerParametrosCalculo(localStorage.getItem('token') || '');
      setParametros(
        respuesta.parametros.map((parametro) => ({
          ...parametro,
          editado: parametro.valor,
          observacionEditada: parametro.observaciones || '',
        })),
      );
    } catch (error) {
      addNotification('error', error instanceof Error ? error.message : 'Error al cargar reglas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarCampo = (codigo: string, patch: Partial<ParametroEditable>) => {
    setParametros((prev) => prev.map((parametro) => (
      parametro.codigo === codigo ? { ...parametro, ...patch } : parametro
    )));
  };

  const guardar = async () => {
    const modificados = parametros.filter((parametro) => (
      parametro.editado !== parametro.valor || parametro.observacionEditada !== (parametro.observaciones || '')
    ));
    if (modificados.length === 0) {
      addNotification('info', 'No hay cambios para guardar');
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await actualizarParametrosCalculo(
        {
          parametros: modificados.map((parametro) => ({
            codigo: parametro.codigo,
            valor: parametro.editado,
            observaciones: parametro.observacionEditada || null,
          })),
        },
        localStorage.getItem('token') || '',
      );
      setParametros(
        respuesta.parametros.map((parametro) => ({
          ...parametro,
          editado: parametro.valor,
          observacionEditada: parametro.observaciones || '',
        })),
      );
      addNotification('success', 'Reglas de horas extras actualizadas');
    } catch (error) {
      addNotification('error', error instanceof Error ? error.message : 'Error al guardar reglas');
    } finally {
      setGuardando(false);
    }
  };

  const parametrosVisibles = parametros.filter((parametro) => !parametrosHistoricosOcultos.has(parametro.codigo));

  const parametrosPorGrupo = parametrosVisibles.reduce<Record<string, ParametroEditable[]>>((acc, parametro) => {
    if (!acc[parametro.grupo]) acc[parametro.grupo] = [];
    acc[parametro.grupo].push(parametro);
    return acc;
  }, {});

  const grupos = ordenGrupos.filter((grupo) => parametrosPorGrupo[grupo]?.length);

  return (
    <MaterialCard className="m-2 overflow-visible border-[var(--color-primary)]/20 p-0 shadow-md shadow-[var(--color-primary)]/5 md:m-4">
      <MaterialCard elevation={0} className="rounded-t-[1.5rem] border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-surface-variant)] p-3 shadow-none md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate('/service-portal/horas-extras')}
              className="h-10 w-10 shrink-0 !rounded-full !p-0 shadow-sm md:h-9 md:w-9"
              aria-label="Volver al planificador"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Badge size="sm" variant="info">Reglas vigentes</Badge>
              <Title level={2} className="!m-0 mt-1 !text-xl leading-tight md:!text-2xl">Configuración de Horas Extras</Title>
              <Text className="max-w-3xl text-xs text-[var(--color-text-secondary)] md:text-sm">
                Edita las reglas usadas por el cálculo semanal: jornada ordinaria, divisor mensual,
                jornada nocturna y topes legales.
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={cargar} disabled={cargando || guardando} className="min-h-10 md:min-h-0">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Recargar
            </Button>
            <Button size="sm" onClick={guardar} disabled={cargando || guardando || parametros.length === 0} className="min-h-10 md:min-h-0">
              <Save className="mr-1.5 h-3.5 w-3.5" />{guardando ? 'Guardando...' : 'Guardar reglas'}
            </Button>
          </div>
        </div>
      </MaterialCard>

      <div className="grid gap-3 p-3 md:p-4 xl:grid-cols-2">
        {cargando ? (
          <MaterialCard className="p-4 xl:col-span-2">
            <Text className="text-[var(--color-text-secondary)]">Cargando reglas de cálculo...</Text>
          </MaterialCard>
        ) : grupos.map((grupo) => (
          <MaterialCard key={grupo} elevation={0} className="border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <Title level={3} className="!m-0 !text-base">{grupo}</Title>
              </div>
              <Badge size="xs" variant="default">{parametrosPorGrupo[grupo].length} reglas</Badge>
            </div>

            <div className="grid gap-2">
              {parametrosPorGrupo[grupo].map((parametro) => (
                <MaterialCard key={parametro.codigo} elevation={0} className="border border-[var(--color-border)] bg-[var(--color-surface-variant)]/40 p-2.5 shadow-none">
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px] lg:items-start xl:grid-cols-[minmax(0,1fr)_150px_minmax(160px,0.75fr)]">
                    <div>
                      <Text className="text-sm font-semibold leading-snug text-[var(--color-text)]">{parametro.nombre}</Text>
                      {parametro.norma_soporte && (
                        <Text className="mt-0.5 text-[11px] leading-tight text-[var(--color-text-secondary)]">Soporte: {parametro.norma_soporte}</Text>
                      )}
                    </div>
                    <Input
                      type={parametro.tipo_dato === 'NUMERICO' ? 'number' : parametro.tipo_dato === 'FECHA' ? 'date' : parametro.tipo_dato === 'HORA' ? 'time' : 'text'}
                      size="sm"
                      inputClassName="md:h-8 md:px-2 md:py-1 md:text-[11px]"
                      aria-label={`Valor de ${parametro.nombre}`}
                      value={parametro.editado}
                      onChange={(event) => actualizarCampo(parametro.codigo, { editado: event.target.value })}
                      disabled={!parametro.editable || guardando}
                    />
                    <Textarea
                      value={parametro.observacionEditada}
                      onChange={(event) => actualizarCampo(parametro.codigo, { observacionEditada: event.target.value })}
                      placeholder="Observación del cambio"
                      aria-label={`Observación del cambio para ${parametro.nombre}`}
                      rows={1}
                      className="lg:col-span-2 xl:col-span-1"
                      textareaClassName="min-h-10 py-1 leading-tight md:min-h-8"
                      disabled={guardando}
                    />
                  </div>
                </MaterialCard>
              ))}
            </div>
          </MaterialCard>
        ))}
      </div>
    </MaterialCard>
  );
};

export default ConfiguracionHorasExtrasView;
