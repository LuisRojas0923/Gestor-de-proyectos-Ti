import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  Clock3,
  RefreshCw,
  Save,
  Scale,
  Settings2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Skeleton, Text, Textarea, Title } from '../../../../components/atoms';
import Callout from '../../../../components/molecules/Callout';
import Modal from '../../../../components/molecules/Modal';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  actualizarParametrosCalculo,
  obtenerParametrosCalculo,
} from '../../../../services/horasExtrasService';
import type { ParametroCalculo } from '../../../../types/horasExtras';

type ParametroEditable = ParametroCalculo & { editado: string; observacionEditada: string };

const ordenGrupos = ['Jornada semanal', 'Valor hora', 'Jornada nocturna', 'Topes'];
const metadataGrupos: Record<string, { icono: LucideIcon; descripcion: string }> = {
  'Jornada semanal': {
    icono: CalendarDays,
    descripcion: 'Define la jornada ordinaria que sirve como base del cálculo.',
  },
  'Valor hora': {
    icono: Calculator,
    descripcion: 'Controla el divisor usado para obtener el valor de la hora ordinaria.',
  },
  'Jornada nocturna': {
    icono: Clock3,
    descripcion: 'Establece la franja que activa recargos y horas nocturnas.',
  },
  Topes: {
    icono: Scale,
    descripcion: 'Centraliza los límites legales diarios, semanales y anuales.',
  },
};
const parametrosHistoricosOcultos = new Set([
  'HORAS_ORDINARIAS_SEMANALES_PREVIAS',
  'DIVISOR_HORA_ORDINARIA_PREVIO',
]);
const layoutGrupos: Record<string, string> = {
  'Jornada semanal': 'xl:col-span-4',
  'Valor hora': 'xl:col-span-3',
  'Jornada nocturna': 'xl:col-span-5',
  Topes: 'xl:col-span-12',
};
const layoutReglas: Record<string, string> = {
  'Jornada semanal': 'xl:grid-cols-2',
  'Jornada nocturna': 'xl:grid-cols-2',
  Topes: 'xl:grid-cols-4',
};

const obtenerNumero = (parametros: ParametroEditable[], codigo: string) => {
  const valor = parametros.find((parametro) => parametro.codigo === codigo)?.editado;
  return valor === undefined || valor.trim() === '' ? null : Number(valor);
};

const validarValorParametro = (parametro: ParametroEditable, parametros: ParametroEditable[]) => {
  const valor = parametro.editado.trim();
  if (!valor) return 'El valor es obligatorio.';
  if (parametro.tipo_dato === 'NUMERICO') {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) return 'Ingresa un número mayor que cero.';
  }
  if (parametro.tipo_dato === 'FECHA' && Number.isNaN(Date.parse(`${valor}T00:00:00`))) {
    return 'Ingresa una fecha válida.';
  }
  if (parametro.tipo_dato === 'HORA' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) {
    return 'Ingresa una hora válida.';
  }
  const maxDiarias = obtenerNumero(parametros, 'MAX_HE_DIARIAS');
  const maxSemanales = obtenerNumero(parametros, 'MAX_HE_SEMANALES');
  const maxAnuales = obtenerNumero(parametros, 'MAX_HE_ANUALES');
  if (parametro.codigo === 'MAX_HE_DIARIAS' && maxDiarias !== null && maxSemanales !== null && maxDiarias > maxSemanales) {
    return 'El tope diario no puede superar el semanal.';
  }
  if (parametro.codigo === 'MAX_HE_SEMANALES' && maxSemanales !== null) {
    if (maxDiarias !== null && maxSemanales < maxDiarias) return 'El tope semanal no puede ser menor que el diario.';
    if (maxAnuales !== null && maxSemanales > maxAnuales) return 'El tope semanal no puede superar el anual.';
  }
  if (parametro.codigo === 'MAX_HE_ANUALES' && maxAnuales !== null && maxSemanales !== null && maxAnuales < maxSemanales) {
    return 'El tope anual no puede ser menor que el semanal.';
  }
  return null;
};

const ConfiguracionHorasExtrasView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [parametros, setParametros] = useState<ParametroEditable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [accionPendiente, setAccionPendiente] = useState<'volver' | 'recargar' | null>(null);

  const cargar = async () => {
    setCargando(true);
    setErrorCarga(null);
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
      const mensaje = error instanceof Error ? error.message : 'Error al cargar reglas';
      setParametros([]);
      setErrorCarga(mensaje);
      addNotification('error', mensaje);
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
    if (!formularioValido) {
      addNotification('warning', 'Revisa los valores y agrega una justificación nueva para cada ajuste');
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
  const cambiosPendientes = parametrosVisibles.filter((parametro) => (
    parametro.editado !== parametro.valor
    || parametro.observacionEditada !== (parametro.observaciones || '')
  )).length;
  const erroresValores = new Map(
    parametrosVisibles.map((parametro) => [parametro.codigo, validarValorParametro(parametro, parametrosVisibles)]),
  );
  const codigosSinJustificacion = new Set(parametrosVisibles.filter((parametro) => (
    parametro.editado !== parametro.valor
    && (
      !parametro.observacionEditada.trim()
      || parametro.observacionEditada.trim() === (parametro.observaciones || '').trim()
    )
  )).map((parametro) => parametro.codigo));
  const formularioValido = !Array.from(erroresValores.values()).some(Boolean) && codigosSinJustificacion.size === 0;

  useEffect(() => {
    if (cambiosPendientes === 0) return undefined;
    const prevenirSalida = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevenirSalida);
    return () => window.removeEventListener('beforeunload', prevenirSalida);
  }, [cambiosPendientes]);

  const solicitarAccion = (accion: 'volver' | 'recargar') => {
    if (cambiosPendientes > 0) {
      setAccionPendiente(accion);
      return;
    }
    if (accion === 'volver') navigate('/service-portal/tiempo-asistencia');
    else cargar();
  };

  const descartarCambios = () => {
    const accion = accionPendiente;
    setAccionPendiente(null);
    if (accion === 'volver') navigate('/service-portal/tiempo-asistencia');
    if (accion === 'recargar') cargar();
  };

  return (
    <MaterialCard elevation={0} className="mx-auto my-2 max-w-[1500px] overflow-visible border-0 bg-transparent p-2 shadow-none md:my-3 md:p-3 xl:my-0 xl:p-0">
      <MaterialCard className="overflow-hidden border-[var(--color-primary)]/15 p-0 shadow-lg shadow-[var(--color-primary)]/5">
        <MaterialCard elevation={0} className="rounded-none border-0 border-b border-[var(--color-primary)]/15 bg-gradient-to-br from-[var(--color-primary)]/15 via-[var(--color-surface)] to-[var(--color-surface-variant)] p-3 shadow-none">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                onClick={() => solicitarAccion('volver')}
                className="h-11 w-11 shrink-0 !rounded-xl !border !border-[var(--color-border)]/70 !bg-[var(--color-surface)]/80 !p-0 shadow-sm backdrop-blur-sm"
                aria-label="Volver a Tiempo y Asistencia"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Title level={2} className="!m-0 !text-lg leading-tight md:!text-xl">Configuración de horas extras</Title>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge size="sm" variant="info">Administración</Badge>
                    <Text as="div" aria-live="polite">
                      <Badge size="sm" variant={errorCarga ? 'error' : cambiosPendientes > 0 ? 'warning' : 'success'}>
                        {errorCarga
                          ? 'No se pudieron cargar las reglas'
                          : cambiosPendientes > 0
                            ? `${cambiosPendientes} ${cambiosPendientes === 1 ? 'cambio pendiente' : 'cambios pendientes'}`
                            : 'Reglas sincronizadas'}
                      </Badge>
                    </Text>
                  </div>
                </div>
                <Text variant="caption" className="mt-0.5 max-w-3xl !text-[11px] leading-snug text-[var(--color-text-secondary)]">
                  Ajusta las reglas legales del cálculo semanal con trazabilidad de cada cambio.
                </Text>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button variant="secondary" size="sm" onClick={() => solicitarAccion('recargar')} disabled={cargando || guardando} className="min-h-11 !text-xs">
                <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />Recargar
              </Button>
              <Button size="sm" onClick={guardar} disabled={cargando || guardando || cambiosPendientes === 0 || !formularioValido} className="min-h-11 !text-xs shadow-md shadow-[var(--color-primary)]/15 dark:!text-[var(--color-background)]">
                <Save className="mr-2 h-4 w-4" />{guardando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </MaterialCard>

        <div className="bg-[var(--color-surface-secondary)]/45 p-2.5 md:p-3">
          {cargando ? (
            <div className="grid gap-2 xl:grid-cols-4" aria-label="Cargando reglas de cálculo" role="status" aria-busy="true">
              {[0, 1, 2, 3].map((item) => (
                <MaterialCard key={item} className="space-y-2 border-[var(--color-border)]/60 p-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <Skeleton variant="circular" width={36} height={36} />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" width="45%" />
                      <Skeleton variant="text" width="75%" />
                    </div>
                  </div>
                  <Skeleton height={72} />
                </MaterialCard>
              ))}
            </div>
          ) : errorCarga ? (
            <Callout variant="error" title="No pudimos cargar las reglas" role="alert">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Text color="inherit" className="text-sm">{errorCarga}</Text>
                <Button variant="secondary" size="sm" onClick={cargar}>Reintentar</Button>
              </div>
            </Callout>
          ) : (
            <div className="grid items-start gap-2.5 xl:grid-cols-12">
              {grupos.map((grupo) => {
                const metadata = metadataGrupos[grupo] ?? { icono: Settings2, descripcion: 'Parámetros del cálculo semanal.' };
                const IconoGrupo = metadata.icono;
                const camposEnFila = grupo === 'Topes' || parametrosPorGrupo[grupo].length === 1;
                return (
                  <MaterialCard key={grupo} className={`${layoutGrupos[grupo] ?? 'xl:col-span-12'} overflow-hidden border-[var(--color-border)]/70 p-0 shadow-sm`}>
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-variant)]/45 p-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                          <IconoGrupo className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <Title level={3} className="!m-0 !text-sm">{grupo}</Title>
                          <Text variant="caption" className="!text-[10px] leading-tight text-[var(--color-text-secondary)] xl:truncate">
                            {metadata.descripcion}
                          </Text>
                        </div>
                      </div>
                      <Badge size="sm" variant="default">{parametrosPorGrupo[grupo].length}</Badge>
                    </div>

                    <div className={`grid gap-2 p-2 ${layoutReglas[grupo] ?? ''}`}>
                      {parametrosPorGrupo[grupo].map((parametro) => {
                        const modificado = parametro.editado !== parametro.valor
                          || parametro.observacionEditada !== (parametro.observaciones || '');
                        const valorModificado = parametro.editado !== parametro.valor;
                        const errorValor = erroresValores.get(parametro.codigo) || undefined;
                        const faltaJustificacion = codigosSinJustificacion.has(parametro.codigo);
                        return (
                          <MaterialCard
                            key={parametro.codigo}
                            elevation={0}
                            className={`p-2.5 shadow-none transition-colors ${modificado
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                              : 'border-[var(--color-border)]/60 bg-[var(--color-surface)]'}`}
                          >
                            <div className="mb-1.5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 leading-tight">
                                <Text as="span" variant="caption" className="!text-xs font-semibold leading-tight text-[var(--color-text-primary)]">{parametro.nombre}</Text>
                                {parametro.norma_soporte && (
                                  <Text as="span" variant="caption" className="ml-1.5 !text-[10px] leading-tight text-[var(--color-text-secondary)]">
                                    · {parametro.norma_soporte}
                                  </Text>
                                )}
                              </div>
                              {modificado && <Badge size="xs" variant="warning">Cambio pendiente</Badge>}
                            </div>

                            <div className={`grid gap-1.5 ${camposEnFila ? 'xl:grid-cols-[minmax(88px,0.6fr)_minmax(0,1.4fr)]' : ''}`}>
                              <Input
                                label="Valor vigente"
                                type={parametro.tipo_dato === 'NUMERICO' ? 'number' : parametro.tipo_dato === 'FECHA' ? 'date' : parametro.tipo_dato === 'HORA' ? 'time' : 'text'}
                                size="sm"
                                className="[&_label]:!text-[11px]"
                                aria-label={`Valor vigente de ${parametro.nombre}`}
                                value={parametro.editado}
                                onChange={(event) => actualizarCampo(parametro.codigo, {
                                  editado: event.target.value,
                                  ...(event.target.value !== parametro.valor
                                    && parametro.observacionEditada === (parametro.observaciones || '')
                                    ? { observacionEditada: '' }
                                    : {}),
                                })}
                                disabled={!parametro.editable || guardando}
                                success={valorModificado && !errorValor}
                                error={!!errorValor}
                                errorMessage={errorValor}
                              />
                              <Textarea
                                label="Justificación"
                                className="[&_label]:!text-[11px] [&>span]:!text-[10px]"
                                value={parametro.observacionEditada}
                                onChange={(event) => actualizarCampo(parametro.codigo, { observacionEditada: event.target.value })}
                                placeholder="Describe brevemente el motivo del ajuste"
                                aria-label={`Justificación del cambio para ${parametro.nombre}`}
                                rows={1}
                                maxLength={500}
                                textareaClassName="h-10 min-h-10 resize-none py-2 leading-5"
                                disabled={guardando}
                                error={faltaJustificacion}
                                errorMessage={faltaJustificacion ? 'Agrega una justificación nueva para este valor.' : undefined}
                              />
                            </div>
                          </MaterialCard>
                        );
                      })}
                    </div>
                  </MaterialCard>
                );
              })}
            </div>
          )}

          {!cargando && !errorCarga && grupos.length === 0 && (
            <Callout variant="info" title="No hay reglas disponibles">
              No se encontraron parámetros editables para mostrar. Recarga la vista o consulta con un administrador.
            </Callout>
          )}

          {!cargando && cambiosPendientes > 0 && (
            <Callout variant={formularioValido ? 'info' : 'warning'} title="Revisión pendiente" icon={Sparkles} className="mt-3 xl:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Text color="inherit" className="text-sm">
                  Verifica {cambiosPendientes === 1 ? 'el ajuste' : `los ${cambiosPendientes} ajustes`} antes de guardar.
                  La actualización se aplicará al próximo cálculo.
                </Text>
                <Button onClick={guardar} disabled={guardando || !formularioValido} className="min-h-10 shrink-0 dark:!text-[var(--color-background)]">
                  <Save className="mr-2 h-4 w-4" />{guardando ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </Callout>
          )}
        </div>
      </MaterialCard>

      <Modal
        isOpen={accionPendiente !== null}
        onClose={() => setAccionPendiente(null)}
        title="¿Descartar cambios pendientes?"
        size="sm"
      >
        <Text className="mb-5 text-sm text-[var(--color-text-secondary)]">
          Los ajustes que todavía no guardaste se perderán. Esta acción no se puede deshacer.
        </Text>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setAccionPendiente(null)}>Seguir editando</Button>
          <Button variant="danger" onClick={descartarCambios}>Descartar cambios</Button>
        </div>
      </Modal>
    </MaterialCard>
  );
};

export default ConfiguracionHorasExtrasView;
