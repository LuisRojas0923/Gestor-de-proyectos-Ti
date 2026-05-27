import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Edit2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Title, Subtitle, Text, Input, Select, Button } from '../../../../components/atoms';
import {
  getAreas,
  crearArea,
  actualizarArea,
  getCargos,
  crearCargo,
  actualizarCargo,
  sincronizarJerarquia,
  getAprobadores
} from '../RequisicionPersonal/services/requisicionService';
import type { AreaRP, CargoRP, AprobadorRP } from '../RequisicionPersonal/types/requisicion.types';

interface PerfilesCargoProps {
  onVolver: () => void;
}

const PerfilesCargo: React.FC<PerfilesCargoProps> = ({ onVolver }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'cargos'>('areas');

  // --- Estados de Áreas ---
  const [areas, setAreas] = useState<AreaRP[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('');
  const [editingArea, setEditingArea] = useState<AreaRP | null>(null);
  const [editAreaNombre, setEditAreaNombre] = useState('');

  // --- Estados de Cargos ---
  const [cargos, setCargos] = useState<CargoRP[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(true);
  const [nuevoCargoNombre, setNuevoCargoNombre] = useState('');
  const [nuevoCargoAreaId, setNuevoCargoAreaId] = useState<string>('');
  const [nuevoCargoSuperiorId, setNuevoCargoSuperiorId] = useState<string>('');
  const [editingCargo, setEditingCargo] = useState<CargoRP | null>(null);
  const [editCargoNombre, setEditCargoNombre] = useState('');
  const [editCargoAreaId, setEditCargoAreaId] = useState<string>('');
  const [editCargoSuperiorId, setEditCargoSuperiorId] = useState<string>('');

  // --- Filtro de directores por área ---
  const [mostrarTodosDirectoresNuevo, setMostrarTodosDirectoresNuevo] = useState(false);
  const [mostrarTodosDirectoresEdit, setMostrarTodosDirectoresEdit] = useState(false);

  // --- Estados de Directores (Aprobadores) ---
  const [aprobadores, setAprobadores] = useState<AprobadorRP[]>([]);
  const [loadingAprobadores, setLoadingAprobadores] = useState(true);

  const [filtroArea, setFiltroArea] = useState<string>('todos');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const handleSincronizar = async () => {
    try {
      setSincronizando(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await sincronizarJerarquia();
      setSuccessMsg('Sincronización con la Jerarquía Organizacional completada exitosamente.');
      await cargarAreas();
      await cargarCargos();
      await cargarAprobadores();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || 'Error al sincronizar con la jerarquía.');
    } finally {
      setSincronizando(false);
    }
  };

  const cargarAprobadores = async () => {
    try {
      setLoadingAprobadores(true);
      const data = await getAprobadores();
      setAprobadores(data);
    } catch (e) {
      setErrorMsg('Error al cargar directores');
    } finally {
      setLoadingAprobadores(false);
    }
  };

  // --- Carga de Datos ---
  const cargarAreas = async () => {
    try {
      setLoadingAreas(true);
      const data = await getAreas(false); // Obtener todas, incluidas inactivas
      setAreas(data);
    } catch (e) {
      setErrorMsg('Error al cargar áreas');
    } finally {
      setLoadingAreas(false);
    }
  };

  const cargarCargos = async () => {
    try {
      setLoadingCargos(true);
      const data = await getCargos(null, false); // Obtener todos, incluidos inactivos
      setCargos(data);
    } catch (e) {
      setErrorMsg('Error al cargar cargos');
    } finally {
      setLoadingCargos(false);
    }
  };

  useEffect(() => {
    cargarAreas();
    cargarCargos();
    cargarAprobadores();
  }, []);

  const handleCrearArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAreaNombre.trim()) return;
    try {
      setErrorMsg(null);
      await crearArea(nuevaAreaNombre);
      setNuevaAreaNombre('');
      setSuccessMsg('Área creada exitosamente');
      await cargarAreas();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear área');
    }
  };

  const handleActualizarArea = async (area: AreaRP, nuevoNombre: string, activo: boolean) => {
    try {
      setErrorMsg(null);
      await actualizarArea(area.id, nuevoNombre, activo);
      setEditingArea(null);
      setSuccessMsg('Área actualizada exitosamente');
      await cargarAreas();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al actualizar área');
    }
  };

  const handleCrearCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCargoNombre.trim() || !nuevoCargoAreaId) return;
    try {
      setErrorMsg(null);
      const supId = nuevoCargoSuperiorId ? Number(nuevoCargoSuperiorId) : null;
      await crearCargo(Number(nuevoCargoAreaId), nuevoCargoNombre, supId);
      setNuevoCargoNombre('');
      setNuevoCargoSuperiorId('');
      setSuccessMsg('Cargo creado exitosamente');
      await cargarCargos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear cargo');
    }
  };

  const handleActualizarCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCargo) return;
    try {
      setErrorMsg(null);
      const supId = editCargoSuperiorId ? Number(editCargoSuperiorId) : null;
      await actualizarCargo(editingCargo.id, {
        nombre: editCargoNombre,
        activo: editingCargo.activo,
        cargo_superior_id: supId,
      });
      setEditingCargo(null);
      setSuccessMsg('Cargo actualizado exitosamente');
      await cargarCargos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al actualizar cargo');
    }
  };

  const toggleEstadoCargo = async (cargo: CargoRP) => {
    try {
      setErrorMsg(null);
      await actualizarCargo(cargo.id, { activo: !cargo.activo });
      setSuccessMsg('Estado del cargo modificado');
      await cargarCargos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al modificar estado');
    }
  };

  const getAreaNombre = (areaId: number) => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.nombre : `Área ${areaId}`;
  };

  const getDirectorNombre = (aprobadorId?: number | null) => {
    if (!aprobadorId) return 'Ninguno';
    const aprobador = aprobadores.find(a => a.id === aprobadorId);
    return aprobador ? `${aprobador.nombre_aprobador} (${getAreaNombre(aprobador.area_id)})` : `Director ${aprobadorId}`;
  };

  const cargosFiltrados = cargos.filter(c => {
    if (filtroArea === 'todos') return true;
    return c.area_id === Number(filtroArea);
  });

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <Button variant="ghost" onClick={onVolver} icon={ArrowLeft} className="font-bold p-0">
        Volver al Portal
      </Button>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 text-white flex justify-between items-center">
        <div>
          <Text variant="caption" className="text-blue-200 uppercase tracking-widest font-bold mb-1">
            Administración del Sistema
          </Text>
          <Title variant="h3" weight="bold" color="white">Perfiles de Cargo y Áreas</Title>
          <Text className="text-blue-200 mt-2">
            Configure las áreas de la empresa, cargos, y configure las reglas de jefatura por defecto.
          </Text>
        </div>
        <Button
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10"
          onClick={handleSincronizar}
          disabled={sincronizando}
          icon={RefreshCw}
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-200 flex items-center justify-between">
          <Text className="font-medium">{errorMsg}</Text>
          <Button variant="ghost" size="sm" onClick={() => setErrorMsg(null)} className="text-red-800 hover:bg-red-100">Cerrar</Button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <Text className="font-medium">{successMsg}</Text>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMsg(null)} className="text-emerald-800 hover:bg-emerald-100">Cerrar</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => { setActiveTab('areas'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'areas'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Áreas de la Empresa
        </button>
        <button
          onClick={() => { setActiveTab('cargos'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'cargos'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Cargos y Jerarquía
        </button>
      </div>

      {/* Tab: Áreas */}
      {activeTab === 'areas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Crear Área */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 h-fit space-y-4">
            <Subtitle weight="bold">Nueva Área</Subtitle>
            <form onSubmit={handleCrearArea} className="space-y-4">
              <Input
                label="Nombre del Área"
                value={nuevaAreaNombre}
                onChange={(e) => setNuevaAreaNombre(e.target.value)}
                placeholder="Ej. CONTABILIDAD"
                isRequired
              />
              <Button type="submit" icon={Plus} className="w-full justify-center">
                Crear Área
              </Button>
            </form>
          </div>

          {/* Listado de Áreas */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <Subtitle weight="bold">Áreas Existentes</Subtitle>
            {loadingAreas ? (
              <div className="h-32 flex items-center justify-center">
                <span className="text-gray-500 animate-pulse">Cargando áreas...</span>
              </div>
            ) : areas.length === 0 ? (
              <div className="h-32 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl">
                <Text color="secondary">No hay áreas registradas.</Text>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Área</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {areas.map(area => (
                      <tr key={area.id} className="hover:bg-[var(--color-surface-secondary)]/30">
                        <td className="py-3.5 px-4 text-sm font-mono text-gray-400">#{area.id}</td>
                        <td className="py-3.5 px-4">
                          {editingArea?.id === area.id ? (
                            <input
                              type="text"
                              value={editAreaNombre}
                              onChange={(e) => setEditAreaNombre(e.target.value)}
                              className="px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-transparent w-full"
                            />
                          ) : (
                            <Text weight="semibold">{area.nombre}</Text>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            area.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${area.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {area.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {editingArea?.id === area.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" onClick={() => handleActualizarArea(area, editAreaNombre, area.activo)}>
                                Guardar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingArea(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingArea(area); setEditAreaNombre(area.nombre); }}
                                icon={Edit2}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className={area.activo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                                onClick={() => handleActualizarArea(area, area.nombre, !area.activo)}
                              >
                                {area.activo ? 'Desactivar' : 'Activar'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Cargos */}
      {activeTab === 'cargos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Crear/Editar Cargo */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 h-fit space-y-4">
            <Subtitle weight="bold">{editingCargo ? 'Editar Cargo' : 'Nuevo Cargo'}</Subtitle>
            {editingCargo ? (
              <form onSubmit={handleActualizarCargoSubmit} className="space-y-4">
                <Input
                  label="Nombre del Cargo"
                  value={editCargoNombre}
                  onChange={(e) => setEditCargoNombre(e.target.value)}
                  isRequired
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Reporta a Director
                  </label>
                  <select
                    value={editCargoSuperiorId}
                    onChange={(e) => setEditCargoSuperiorId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm transition-all focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="">Ninguno</option>
                    {aprobadores
                      .filter(a => {
                        if (!a.activo) return false;
                        if (mostrarTodosDirectoresEdit || !editCargoAreaId) return true;
                        return a.area_id === Number(editCargoAreaId);
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_aprobador} ({getAreaNombre(a.area_id)})
                        </option>
                      ))}
                  </select>
                  {editCargoAreaId && (
                    <button
                      type="button"
                      onClick={() => setMostrarTodosDirectoresEdit(v => !v)}
                      className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    >
                      {mostrarTodosDirectoresEdit ? '← Ver solo los del área' : '🔍 Ver directores de otras áreas'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 justify-center">
                    Guardar
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingCargo(null)} className="flex-1 justify-center">
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCrearCargo} className="space-y-4">
                <Input
                  label="Nombre del Cargo"
                  value={nuevoCargoNombre}
                  onChange={(e) => setNuevoCargoNombre(e.target.value)}
                  placeholder="Ej. Auxiliar de Cuentas por Cobrar"
                  isRequired
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Área Asociada
                  </label>
                  <select
                    value={nuevoCargoAreaId}
                    onChange={(e) => { setNuevoCargoAreaId(e.target.value); setMostrarTodosDirectoresNuevo(false); }}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm transition-all focus:border-[var(--color-primary)] focus:outline-none"
                    required
                  >
                    <option value="">Seleccione un área...</option>
                    {areas.filter(a => a.activo).map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Reporta a Director
                  </label>
                  <select
                    value={nuevoCargoSuperiorId}
                    onChange={(e) => setNuevoCargoSuperiorId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm transition-all focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="">Ninguno</option>
                    {aprobadores
                      .filter(a => {
                        if (!a.activo) return false;
                        if (mostrarTodosDirectoresNuevo || !nuevoCargoAreaId) return true;
                        return a.area_id === Number(nuevoCargoAreaId);
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_aprobador} ({getAreaNombre(a.area_id)})
                        </option>
                      ))}
                  </select>
                  {nuevoCargoAreaId && (
                    <button
                      type="button"
                      onClick={() => setMostrarTodosDirectoresNuevo(v => !v)}
                      className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    >
                      {mostrarTodosDirectoresNuevo ? '← Ver solo los del área' : '🔍 Ver directores de otras áreas'}
                    </button>
                  )}
                </div>
                <Button type="submit" icon={Plus} className="w-full justify-center">
                  Crear Cargo
                </Button>
              </form>
            )}
          </div>

          {/* Listado de Cargos */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <Subtitle weight="bold">Cargos Existentes</Subtitle>
              {/* Filtro por Área */}
              <div className="flex items-center gap-2">
                <Text size="xs" color="secondary" className="font-semibold uppercase tracking-wider">Filtrar por Área:</Text>
                <select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs transition-all focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="todos">Todas las Áreas</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingCargos ? (
              <div className="h-32 flex items-center justify-center">
                <span className="text-gray-500 animate-pulse">Cargando cargos...</span>
              </div>
            ) : cargosFiltrados.length === 0 ? (
              <div className="h-32 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl">
                <Text color="secondary">No hay cargos registrados en este filtro.</Text>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="py-3 px-4">Cargo</th>
                      <th className="py-3 px-4">Área</th>
                      <th className="py-3 px-4">Reporta a Director</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {cargosFiltrados.map(cargo => (
                      <tr key={cargo.id} className="hover:bg-[var(--color-surface-secondary)]/30">
                        <td className="py-3.5 px-4">
                          <Text weight="semibold">{cargo.nombre}</Text>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">
                          {getAreaNombre(cargo.area_id)}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-indigo-700 font-medium">
                          {getDirectorNombre(cargo.cargo_superior_id)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            cargo.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cargo.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {cargo.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCargo(cargo);
                                setEditCargoNombre(cargo.nombre);
                                setEditCargoAreaId(String(cargo.area_id));
                                setEditCargoSuperiorId(cargo.cargo_superior_id ? String(cargo.cargo_superior_id) : '');
                                setMostrarTodosDirectoresEdit(false);
                              }}
                              icon={Edit2}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cargo.activo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                              onClick={() => toggleEstadoCargo(cargo)}
                            >
                              {cargo.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilesCargo;
