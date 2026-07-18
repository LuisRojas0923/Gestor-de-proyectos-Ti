import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Upload, LayoutGrid, ReceiptText, FileSpreadsheet, Smartphone, Users, Download } from 'lucide-react';
import { useCorporateLines, CorporateLine } from './useCorporateLines';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import { useAppContext } from '../../context/AppContext';

// Componentes del Sistema de Diseño
import {
  Button,
  Input,
  Title,
  Text,
  Icon,
  Badge,
  Select,
} from '../../components/atoms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Sub-componentes modulares
import { StatsCards } from './components/StatsCards';
import { LinesTable } from './components/LinesTable';
import { LineDetailForm } from './components/LineDetailForm';
import { InvoiceDispersionView } from './components/InvoiceDispersionView';
import { InvoiceRawDataView } from './components/InvoiceRawDataView';
import { EquiposManager } from './components/EquiposManager';
import { PersonasManager } from './components/PersonasManager';
import { CorporateDeleteConfirmModal } from './components/CorporateDeleteConfirmModal';

export const CorporateLinesManager: React.FC = () => {
  const { state } = useAppContext();
  const isAdmin = state.user?.role === 'admin';
  const ctx = useCorporateLines();
  const {
    lines, equipos, personas, employeeAlerts, isLoading, error, stats,
    loadData, createLine, updateLine, deleteLine,
    createEquipo, updateEquipo, deleteEquipo,
    createPersona, updatePersona, deletePersona,
    importarFactura, obtenerReporteCO, obtenerAlertasFactura,
    importarMatrizLegacy, obtenerDetalleFactura
  } = ctx;

  const { addNotification } = useNotifications();

  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
  const [mode, setMode] = useState<'inventory' | 'billing' | 'rawdata' | 'equipos' | 'personas'>('inventory');
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLegacyImporting, setIsLegacyImporting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Filtros adicionales
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado del formulario actual
  const [formData, setFormData] = useState<Partial<CorporateLine>>({
    estatus: 'ACTIVA',
    estado_asignacion: 'POR_ASIGNAR',
    cobro_fijo_coef: 0.5,
    cobro_especiales_coef: 1,
    empresa: 'REFRIDCOL'
  });
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'tecnico' | 'finanzas'>('general');

  useEffect(() => {
    loadData();
  }, [loadData]);

  const companyOptions = useMemo(() => {
    const empresas = [...new Set(['RDC', 'CRUZTOR', 'GTC', ...lines.map(l => l.empresa).filter(Boolean)])];
    return [
      { label: 'Todas las Empresas', value: 'all' },
      ...empresas.sort().map(e => ({ label: e, value: e }))
    ];
  }, [lines]);

  const statusOptions = useMemo(() => {
    const estados = [...new Set(lines.map(l => l.estatus).filter(Boolean))];
    return [
      { label: 'Todos los Estados', value: 'all' },
      ...estados.sort().map(e => ({ label: e, value: e }))
    ];
  }, [lines]);

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      const matchesSearch =
        l.linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.asignado?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.responsable_cobro?.nombre.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompany = companyFilter === 'all' || l.empresa === companyFilter;
      const matchesStatus = statusFilter === 'all' || l.estatus === statusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [lines, searchTerm, companyFilter, statusFilter]);

  const selectedLine = useMemo(() => {
    if (isCreating) return null;
    return lines.find(l => l.id === selectedLineId) || null;
  }, [lines, selectedLineId, isCreating]);

  useEffect(() => {
    if (selectedLine) {
      setFormData(selectedLine);
      setView('detail');
    } else if (isCreating) {
      setFormData({
        linea: '',
        empresa: '',
        estatus: 'ACTIVA',
        estado_asignacion: 'ASIGNADA',
        fecha_actualizacion: new Date().toISOString().split('T')[0],
        cfm_con_iva: 0,
        cfm_sin_iva: 0,
        vr_factura: 0,
        pago_empleado: 0
      });
      setView('detail');
    }
  }, [selectedLine, isCreating]);

  const handleSave = async () => {
    if (!formData.linea?.trim() || !formData.empresa?.trim()) {
      addNotification('warning', 'El número de línea y la empresa son campos obligatorios.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isCreating) {
        await createLine(formData);
        addNotification('success', 'Línea creada correctamente');
        setIsCreating(false);
        setView('dashboard');
      } else if (selectedLineId) {
        await updateLine(selectedLineId, formData);
        addNotification('success', 'Línea actualizada correctamente');
      }
    } catch (err: unknown) {
      addNotification('error', err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLineId) return;
    setIsProcessing(true);
    try {
      await deleteLine(selectedLineId);
      addNotification('success', 'Línea eliminada del inventario');
      setSelectedLineId(null);
      setView('dashboard');
      setIsDeleteOpen(false);
    } catch {
      addNotification('error', 'Error al eliminar la línea');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setSelectedLineId(null);
    setIsCreating(false);
    setView('dashboard');
  };

  const onLegacyImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLegacyImporting) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`¿Está seguro de importar la matriz legacy? Esta acción cargará los registros históricos y requiere que la base de datos esté limpia.`)) {
      e.target.value = '';
      return;
    }

    try {
      setIsLegacyImporting(true);
      addNotification('info', 'Iniciando migración masiva... esto puede tardar unos segundos.');
      const res = await importarMatrizLegacy(file);
      addNotification('success', `${res.mensaje || 'Migración exitosa'}: ${res.lineas_procesadas} líneas procesadas.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      addNotification('error', `Error en migración: ${message}`);
    } finally {
      setIsLegacyImporting(false);
      e.target.value = '';
    }
  };

  const exportCatalogToPDF = () => {
    if (filteredLines.length === 0) {
      addNotification('warning', 'No hay datos para exportar.');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.text(`Catálogo de Líneas Corporativas`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Filtros: Empresa: ${companyFilter} | Estado: ${statusFilter}`, 14, 22);
    const tableColumn = ["Línea", "Empresa", "Asignado A", "C.C / C.O", "Equipo", "Estado", "Pago Empleado"];
    const tableRows = filteredLines.map(line => [
      line.linea,
      line.empresa,
      line.asignado?.nombre || 'No asignada',
      line.asignado?.centro_costo || 'N/A',
      line.equipo?.modelo || 'Sin equipo',
      line.estatus,
      `$${(line.pago_empleado || 0).toLocaleString('es-CO')}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 128] } // Azul corporativo (Navy)
    });

    doc.save(`Catalogo_Lineas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      {view === 'dashboard' ? (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          {/* HEADER DASHBOARD */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Title variant="h2" weight="bold" color="text-primary" className="mb-1 tracking-tight">Gestión Corporativa de Líneas</Title>
              <Text variant="body1" color="text-secondary" className="opacity-70">Monitoreo de inventario móvil y asignación de recursos.</Text>
            </div>
            <div className="flex gap-3">
              {isAdmin && (
                <div className="relative">
                  <Input
                    type="file"
                    id="legacy-import-input"
                    className="hidden"
                    accept=".xlsx, .xls, .xlsm"
                    onChange={onLegacyImport}
                    disabled={isLegacyImporting}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('legacy-import-input')?.click()}
                    icon={Upload}
                    disabled={isLegacyImporting}
                    loading={isLegacyImporting}
                    className="px-6 rounded-2xl h-12 border-dashed border-2 hover:border-primary hover:text-primary transition-all"
                  >
                    Importar Matriz
                  </Button>
                </div>
              )}
              {isAdmin && <Button
                variant="primary"
                onClick={() => setIsCreating(true)}
                icon={Plus}
                className="px-8 shadow-lg shadow-primary-500/20 rounded-2xl h-12"
              >
                Nueva Línea
              </Button>}
            </div>
          </div>

          <StatsCards stats={stats} isLoading={isLoading} />

          {/* TABS DE MODO */}
          <div className="flex w-full overflow-x-auto p-1.5 rounded-2xl mb-8 shadow-inner border border-[var(--color-border)] bg-[var(--color-surface)] md:w-fit">
            <Button
              variant={mode === 'inventory' ? 'primary' : 'ghost'}
              onClick={() => setMode('inventory')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${mode === 'inventory'
                ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm scale-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 scale-95'
                }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={LayoutGrid} size="sm" />
                <Text weight="bold" variant="subtitle2" className="text-sm">Catálogo Maestro</Text>
              </div>
            </Button>
            <Button
              variant={mode === 'billing' ? 'primary' : 'ghost'}
              onClick={() => setMode('billing')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${mode === 'billing'
                ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm scale-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 scale-95'
                }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={ReceiptText} size="sm" />
                <Text weight="bold" variant="subtitle2" className="text-sm">Dispersión de Factura</Text>
                <Badge variant="primary" className="text-[10px] px-1.5 py-0.5 rounded-full uppercase">Pro</Badge>
              </div>
            </Button>
            <Button
              variant={mode === 'rawdata' ? 'primary' : 'ghost'}
              onClick={() => setMode('rawdata')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${mode === 'rawdata'
                ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm scale-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 scale-95'
                }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={FileSpreadsheet} size="sm" />
                <Text weight="bold" variant="subtitle2" className="text-sm">Detalle Factura</Text>
              </div>
            </Button>
            {isAdmin && (
              <>
                <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
                <Button
                  variant={mode === 'equipos' ? 'primary' : 'ghost'}
                  onClick={() => setMode('equipos')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${mode === 'equipos'
                    ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm scale-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 scale-95'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={Smartphone} size="sm" />
                    <Text weight="bold" variant="subtitle2" className="text-sm">Equipos</Text>
                  </div>
                </Button>
                <Button
                  variant={mode === 'personas' ? 'primary' : 'ghost'}
                  onClick={() => setMode('personas')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${mode === 'personas'
                    ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm scale-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 scale-95'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={Users} size="sm" />
                    <Text weight="bold" variant="subtitle2" className="text-sm">Personas</Text>
                  </div>
                </Button>
              </>
            )}
          </div>

          {mode === 'inventory' ? (
            <>
              {/* FILTROS INTEGRADOS Y ACCIONES */}
              <div className="flex flex-col xl:flex-row gap-4 mb-6 justify-between items-start xl:items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                  <Input
                    placeholder="Buscar línea, nombre o ID..."
                    icon={Search}
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="!rounded-xl border-none bg-neutral-100 dark:bg-neutral-700"
                  />
                  <Select
                    value={companyFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompanyFilter(e.target.value)}
                    options={companyOptions}
                    className="!rounded-xl"
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                    options={statusOptions}
                    className="!rounded-xl"
                  />
                </div>
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={exportCatalogToPDF}
                  className="rounded-xl h-12 px-6 shadow-sm whitespace-nowrap"
                >
                  Exportar PDF
                </Button>
              </div>

              <LinesTable
                lines={filteredLines}
                onSelect={(id) => setSelectedLineId(id)}
                employeeAlerts={employeeAlerts}
                isLoading={isLoading}
              />
            </>
          ) : mode === 'billing' ? (
            <InvoiceDispersionView
              onImport={importarFactura}
              onFetchReport={obtenerReporteCO}
              onFetchAlerts={obtenerAlertasFactura}
              onSelectLine={(id) => setSelectedLineId(id)}
              canImport={isAdmin}
            />
          ) : mode === 'equipos' ? (
            <EquiposManager
              equipos={equipos}
              isLoading={isLoading}
              error={error}
              onRetry={loadData}
              onCreate={createEquipo}
              onUpdate={updateEquipo}
              onDelete={deleteEquipo}
            />
          ) : mode === 'personas' ? (
            <PersonasManager
              personas={personas}
              isLoading={isLoading}
              error={error}
              onRetry={loadData}
              onCreate={createPersona}
              onUpdate={updatePersona}
              onDelete={deletePersona}
            />
          ) : (
            <InvoiceRawDataView
              onFetchDetalle={obtenerDetalleFactura}
            />
          )}
        </div>
      ) : (
        <LineDetailForm
          formData={formData}
          equipos={equipos}
          employeeAlerts={employeeAlerts}
          isCreating={isCreating}
          onBack={handleBack}
          onSave={handleSave}
          onDelete={() => setIsDeleteOpen(true)}
          canEdit={isAdmin}
          isProcessing={isProcessing}
          onInputChange={(field, value) => setFormData((prev: Partial<CorporateLine>) => ({ ...prev, [field]: value }))}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          companyOptions={companyOptions.filter(c => c.value !== 'all')}
        />
      )}
      <CorporateDeleteConfirmModal
        isOpen={isDeleteOpen}
        title="¿Dar de baja la línea?"
        description={selectedLine ? `Se eliminará la línea ${selectedLine.linea}. La operación se bloqueará si tiene facturación.` : ''}
        isProcessing={isProcessing}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </main>
  );
};
