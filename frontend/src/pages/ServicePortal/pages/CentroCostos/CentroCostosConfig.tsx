import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Edit2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button, Input, Select, Subtitle, Text, Title } from '../../../../components/atoms';
import { CentroCostoService, CostCenterItem } from '../../../../services/CentroCostoService';

interface CentroCostosConfigProps {
  onVolver: () => void;
}

const CentroCostosConfig: React.FC<CentroCostosConfigProps> = ({ onVolver }) => {
  const [activeTab, setActiveTab] = useState<'uen' | 'subcentro' | 'especialidad' | 'combinador'>('uen');

  // --- Estados de Datos ---
  const [uens, setUens] = useState<CostCenterItem[]>([]);
  const [subcentros, setSubcentros] = useState<CostCenterItem[]>([]);
  const [especialidades, setEspecialidades] = useState<CostCenterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Form Estados ---
  const [codigoInput, setCodigoInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');
  const [editingItem, setEditingItem] = useState<CostCenterItem | null>(null);

  // --- Estados del Combinador ---
  const [selUen, setSelUen] = useState<string>('');
  const [selSubcentro, setSelSubcentro] = useState<string>('');
  const [selEspecialidad, setSelEspecialidad] = useState<string>('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [u, s, e] = await Promise.all([
        CentroCostoService.getUens(),
        CentroCostoService.getSubcentros(),
        CentroCostoService.getEspecialidades()
      ]);
      setUens(u);
      setSubcentros(s);
      setEspecialidades(e);

      // Pre-seleccionar en el combinador si hay datos
      const activeU = u.find(x => x.activo);
      const activeS = s.find(x => x.activo);
      const activeE = e.find(x => x.activo);
      if (activeU) setSelUen(activeU.codigo);
      if (activeS) setSelSubcentro(activeS.codigo);
      if (activeE) setSelEspecialidad(activeE.codigo);

    } catch (err: any) {
      setErrorMsg('Error al cargar la configuración de Centros de Costos desde el ERP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resetForm = () => {
    setCodigoInput('');
    setNombreInput('');
    setEditingItem(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoInput.trim() || !nombreInput.trim()) return;

    try {
      setErrorMsg(null);
      setSuccessMsg(null);

      // Limpiar y formatear entrada (los códigos de CC suelen ser numéricos de 2 dígitos)
      const cleanCodigo = codigoInput.trim().replace(/\D/g, '').slice(0, 10);
      if (!cleanCodigo) {
        setErrorMsg('El código debe ser numérico.');
        return;
      }

      if (activeTab === 'uen') {
        await CentroCostoService.saveUen(cleanCodigo, nombreInput.trim(), true);
        setSuccessMsg(`UEN '${cleanCodigo}' guardada con éxito.`);
      } else if (activeTab === 'subcentro') {
        await CentroCostoService.saveSubcentro(cleanCodigo, nombreInput.trim(), true);
        setSuccessMsg(`Proceso '${cleanCodigo}' guardado con éxito.`);
      } else if (activeTab === 'especialidad') {
        await CentroCostoService.saveEspecialidad(cleanCodigo, nombreInput.trim(), true);
        setSuccessMsg(`Especialidad / Subcentro '${cleanCodigo}' guardada con éxito.`);
      }

      resetForm();
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al guardar el registro en el ERP.');
    }
  };

  const toggleEstado = async (item: CostCenterItem) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const nuevoEstado = !item.activo;

      if (activeTab === 'uen') {
        if (nuevoEstado) await CentroCostoService.activateUen(item.codigo);
        else await CentroCostoService.deleteUen(item.codigo);
      } else if (activeTab === 'subcentro') {
        if (nuevoEstado) await CentroCostoService.activateSubcentro(item.codigo);
        else await CentroCostoService.deleteSubcentro(item.codigo);
      } else if (activeTab === 'especialidad') {
        if (nuevoEstado) await CentroCostoService.activateEspecialidad(item.codigo);
        else await CentroCostoService.deleteEspecialidad(item.codigo);
      }

      setSuccessMsg(`Estado modificado para el código ${item.codigo}.`);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al cambiar estado.');
    }
  };

  const startEdit = (item: CostCenterItem) => {
    setEditingItem(item);
    setCodigoInput(item.codigo);
    setNombreInput(item.nombre);
  };

  // Obtener los datos actuales de la pestaña seleccionada
  const getTabItems = () => {
    if (activeTab === 'uen') return uens;
    if (activeTab === 'subcentro') return subcentros;
    if (activeTab === 'especialidad') return especialidades;
    return [];
  };

  const getTabTitle = () => {
    if (activeTab === 'uen') return 'UEN (Unidad Estratégica de Negocio)';
    if (activeTab === 'subcentro') return 'Proceso';
    if (activeTab === 'especialidad') return 'Especialidad / Subcentro';
    return '';
  };

  // Helper para el simulador de códigos
  const getSelectedUenLabel = () => uens.find(x => x.codigo === selUen)?.nombre || '---';
  const getSelectedSubcentroLabel = () => subcentros.find(x => x.codigo === selSubcentro)?.nombre || '---';
  const getSelectedEspecialidadLabel = () => especialidades.find(x => x.codigo === selEspecialidad)?.nombre || '---';

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto w-full px-4">
      {/* Header Estilo Requisición de Personal */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4 mb-6">
        <Button
          variant="ghost"
          onClick={onVolver}
          icon={ArrowLeft}
          className="font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl"
        />
        <div>
          <Title
            variant="h4"
            weight="bold"
            className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400"
          >
            Configurador de Centros de Costos
          </Title>
          <Text variant="caption" className="text-[var(--color-text-secondary)] mt-1">
            Administración del ERP — Configure los códigos maestros para UENs, Procesos y Especialidades / Subcentros del Ecosistema Solid.
          </Text>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-200 flex items-center justify-between shadow-sm">
          <Text className="font-medium">{errorMsg}</Text>
          <Button variant="ghost" size="sm" onClick={() => setErrorMsg(null)} className="text-red-800 hover:bg-red-100">Cerrar</Button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-sm">
          <Text className="font-medium">{successMsg}</Text>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMsg(null)} className="text-emerald-800 hover:bg-emerald-100">Cerrar</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/50">
        {(['uen', 'subcentro', 'especialidad', 'combinador'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onClick={() => { setActiveTab(tab); resetForm(); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-5 font-bold text-sm transition-all rounded-xl capitalize ${
              activeTab === tab 
                ? 'shadow-md shadow-blue-900/20' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab === 'uen' && '1. UEN'}
            {tab === 'subcentro' && '2. Proceso'}
            {tab === 'especialidad' && '3. Especialidad / Subcentro'}
            {tab === 'combinador' && '🔍 Simulador Combinador'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Text as="span" className="text-gray-500 animate-pulse">Cargando catálogos del ERP...</Text>
        </div>
      ) : activeTab !== 'combinador' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Formulario */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 h-fit space-y-4 shadow-sm">
            <Subtitle weight="bold">{editingItem ? 'Editar Código' : `Nuevo ${getTabTitle()}`}</Subtitle>
            <form onSubmit={handleGuardar} className="space-y-4">
              <Input
                label="Código (2 Dígitos)"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Ej. 10"
                disabled={!!editingItem} // Código de clave primaria no se edita directamente
                isRequired
              />
              <Input
                label="Descripción / Nombre"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                placeholder="Ej. ADMINISTRACIÓN"
                isRequired
              />
              <div className="flex gap-2">
                <Button type="submit" icon={Plus} className="flex-1 justify-center">
                  {editingItem ? 'Guardar' : 'Crear'}
                </Button>
                {editingItem && (
                  <Button variant="ghost" onClick={resetForm} className="flex-1 justify-center">
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Listado */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
            <Subtitle weight="bold">{getTabTitle()}s Existentes</Subtitle>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre / Descripción</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {getTabItems().map(item => (
                    <tr key={item.codigo} className="hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{item.codigo}</td>
                      <td className="py-3.5 px-4">
                        <Text weight="semibold">{item.nombre}</Text>
                      </td>
                      <td className="py-3.5 px-4">
                        <Text as="span" className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                        }`}>
                          <Text as="span" className={`w-1.5 h-1.5 rounded-full ${item.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Text>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            icon={Edit2}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={item.activo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                            onClick={() => toggleEstado(item)}
                          >
                            {item.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Combinador / Simulador */
        <div className="flex flex-col xl:flex-row items-start gap-4 animate-in fade-in duration-300">

          {/* Visualización Premium */}
          <div className="order-4 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl min-h-[300px] border border-indigo-900/30 w-full flex-[1.5] min-w-[300px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-300">
                <Info size={20} />
                <Text variant="body1" color="inherit" className="font-bold tracking-wide uppercase">Previsualización de Estructura</Text>
              </div>
              
              <div className="py-6 text-center">
                <Text color="inherit" className="text-xs uppercase tracking-[0.25em] text-indigo-300 font-bold mb-1">Código Resultante (XXXX-XX)</Text>
                <Title variant="h1" className="text-4xl sm:text-6xl tracking-tight font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200">
                  {selUen || 'XX'}{selSubcentro || 'XX'}-{selEspecialidad || 'XX'}
                </Title>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <Text as="span" color="inherit" className="opacity-60">UEN (Unidad Estratégica de Negocio):</Text>
                <Text as="span" color="inherit" className="font-bold">{getSelectedUenLabel()} ({selUen})</Text>
              </div>
              <div className="flex justify-between text-sm">
                <Text as="span" color="inherit" className="opacity-60">Proceso:</Text>
                <Text as="span" color="inherit" className="font-bold">{getSelectedSubcentroLabel()} ({selSubcentro})</Text>
              </div>
              <div className="flex justify-between text-sm">
                <Text as="span" color="inherit" className="opacity-60">Especialidad / Subcentro:</Text>
                <Text as="span" color="inherit" className="font-bold">{getSelectedEspecialidadLabel()} ({selEspecialidad})</Text>
              </div>
            </div>
          </div>

              {/* UEN */}
              <div className="order-1 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit w-full flex-1 min-w-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                        UEN
                      </th>
                    </tr>
                    <tr className="bg-blue-600 text-white text-xs font-semibold uppercase">
                      <th className="py-1.5 px-3 w-16 text-center">COD</th>
                      <th className="py-1.5 px-3">UEN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uens.filter(x => x.activo).map((x, i) => (
                      <tr
                        key={x.codigo}
                        className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                          selUen === x.codigo
                            ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                            : i % 2 === 0
                            ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                        onClick={() => setSelUen(x.codigo)}
                      >
                        <td className="py-1.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                        <td className="py-1.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                      </tr>
                    ))}
                    {uens.filter(x => x.activo).length === 0 && (
                      <tr><td colSpan={2} className="py-4 text-center text-[var(--color-text-secondary)] text-xs">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PROCESO */}
              <div className="order-2 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit w-full flex-1 min-w-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                        PROCESO
                      </th>
                    </tr>
                    <tr className="bg-blue-600 text-white text-xs font-semibold uppercase">
                      <th className="py-1.5 px-3 w-16 text-center">COD</th>
                      <th className="py-1.5 px-3">PROCESOS / GASTOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcentros.filter(x => x.activo).map((x, i) => (
                      <tr
                        key={x.codigo}
                        className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                          selSubcentro === x.codigo
                            ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                            : i % 2 === 0
                            ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                        onClick={() => setSelSubcentro(x.codigo)}
                      >
                        <td className="py-1.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                        <td className="py-1.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                      </tr>
                    ))}
                    {subcentros.filter(x => x.activo).length === 0 && (
                      <tr><td colSpan={2} className="py-4 text-center text-[var(--color-text-secondary)] text-xs">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ESPECIALIDAD / SUBCENTRO */}
              <div className="order-3 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit w-full flex-1 min-w-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                        SUBCENTRO
                      </th>
                    </tr>
                    <tr className="bg-blue-600 text-white text-xs font-semibold uppercase">
                      <th className="py-1.5 px-3 w-16 text-center">COD</th>
                      <th className="py-1.5 px-3">ESPECIALIDAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {especialidades.filter(x => x.activo).map((x, i) => (
                      <tr
                        key={x.codigo}
                        className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                          selEspecialidad === x.codigo
                            ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                            : i % 2 === 0
                            ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                        onClick={() => setSelEspecialidad(x.codigo)}
                      >
                        <td className="py-1.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                        <td className="py-1.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                      </tr>
                    ))}
                    {especialidades.filter(x => x.activo).length === 0 && (
                      <tr><td colSpan={2} className="py-4 text-center text-[var(--color-text-secondary)] text-xs">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
        </div>
      )}
    </div>
  );
};

export default CentroCostosConfig;
