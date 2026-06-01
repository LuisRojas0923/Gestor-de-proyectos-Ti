import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Title, Text, Button } from '../../../../components/atoms';
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
import AreasTab from './components/AreasTab';
import CargosTab from './components/CargosTab';

interface PerfilesCargoProps {
  onVolver: () => void;
}

const PerfilesCargo: React.FC<PerfilesCargoProps> = ({ onVolver }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'cargos'>('areas');

  // --- Estados de Áreas ---
  const [areas, setAreas] = useState<AreaRP[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // --- Estados de Cargos ---
  const [cargos, setCargos] = useState<CargoRP[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(true);

  // --- Estados de Directores (Aprobadores) ---
  const [aprobadores, setAprobadores] = useState<AprobadorRP[]>([]);

  // --- Mensajes de Feedback ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

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

  const cargarAprobadores = async () => {
    try {
      const data = await getAprobadores();
      setAprobadores(data);
    } catch (e) {
      setErrorMsg('Error al cargar directores');
    }
  };

  useEffect(() => {
    cargarAreas();
    cargarCargos();
    cargarAprobadores();
  }, []);

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

  // --- Handlers de Áreas ---
  const handleCrearArea = async (nombre: string) => {
    try {
      await crearArea(nombre);
      setSuccessMsg('Área creada exitosamente');
      await cargarAreas();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Error al crear área');
    }
  };

  const handleActualizarArea = async (area: AreaRP, nuevoNombre: string, activo: boolean) => {
    try {
      await actualizarArea(area.id, nuevoNombre, activo);
      setSuccessMsg('Área actualizada exitosamente');
      await cargarAreas();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Error al actualizar área');
    }
  };

  // --- Handlers de Cargos ---
  const handleCrearCargo = async (areaId: number, nombre: string, superiorId: number | null) => {
    try {
      await crearCargo(areaId, nombre, superiorId);
      setSuccessMsg('Cargo creado exitosamente');
      await cargarCargos();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Error al crear cargo');
    }
  };

  const handleActualizarCargo = async (
    id: number,
    data: { nombre?: string; activo?: boolean; cargo_superior_id?: number | null }
  ) => {
    try {
      await actualizarCargo(id, data);
      setSuccessMsg('Cargo actualizado exitosamente');
      await cargarCargos();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Error al actualizar cargo');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-4">
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
              Perfiles de Cargo y Áreas
            </Title>
            <Text
              variant="caption"
              color="text-secondary"
              className="block text-[10px] leading-none uppercase tracking-widest opacity-70 mt-1"
            >
              ADMINISTRACIÓN DEL SISTEMA / PERFILES Y JERARQUÍAS
            </Text>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSincronizar}
          disabled={sincronizando}
          loading={sincronizando}
          icon={RefreshCw}
        >
          Sincronizar
        </Button>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-200 flex items-center justify-between dark:bg-red-950/30 dark:text-red-200 dark:border-red-900/50">
          <Text className="font-medium" color="inherit">
            {errorMsg}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMsg(null)}
            className="text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            Cerrar
          </Button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/50">
          <Text className="font-medium" color="inherit">
            {successMsg}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => {
            setActiveTab('areas');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'areas'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Áreas de la Empresa
        </button>
        <button
          onClick={() => {
            setActiveTab('cargos');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'cargos'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Cargos y Jerarquía
        </button>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'areas' ? (
        <AreasTab
          areas={areas}
          loadingAreas={loadingAreas}
          onCrearArea={handleCrearArea}
          onActualizarArea={handleActualizarArea}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
        />
      ) : (
        <CargosTab
          cargos={cargos}
          loadingCargos={loadingCargos}
          areas={areas}
          aprobadores={aprobadores}
          onCrearCargo={handleCrearCargo}
          onActualizarCargo={handleActualizarCargo}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
        />
      )}
    </div>
  );
};

export default PerfilesCargo;
