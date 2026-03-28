import React, { useEffect } from 'react';
import { Title, Text, Button, Badge } from '../../components/atoms';
import { RefreshCw } from 'lucide-react';
import { useInventarioAdmin } from './hooks/useInventarioAdmin';
import ConfiguracionSeccion from './components/ConfiguracionSeccion';
import AsignacionSeccion from './components/AsignacionSeccion';
import MonitorMaestroTab from './components/MonitorMaestroTab';
import CargaLegacy from './components/CargaLegacy';
import { API_CONFIG } from '../../config/api';

export const InventarioAdmin: React.FC = () => {
    const {
        stats, inventoryList, isLoadingData, filters, setFilters, fetchStats, fetchInventoryList,
        columnFilters, setColumnFilters,
        conteoName, setConteoName, file, setFile, handleUploadMaestra, isUploading,
        handleUploadTransito, isUploadingTransito, uploadResult, setUploadResult,
        limpiarPrevio, setLimpiarPrevio, rondaActiva, isUpdatingConfig, handleUpdateRonda,
        coverage, newAsig, setNewAsig, isSearchingEmpleado, isSavingAsig, asignaciones,
        handleSaveAsig, handleDeleteAsig, handleEditAsig, cancelEdit, editingAsigId,
        getBodegaOptions, getBloqueOptions, getEstanteOptions, getNivelOptions,
        uploadProgress, activeTab, setActiveTab, handleGeneratePlanilla0
    } = useInventarioAdmin();

    // Autosincronización cada 1 minuto
    useEffect(() => {
        const interval = setInterval(() => {
            fetchStats();
            fetchInventoryList();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchStats, fetchInventoryList]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 px-2 pb-10">
            <div className="max-w-[1300px] mx-auto w-full space-y-8">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                    <div className="space-y-1">
                        <Title variant="h4" weight="bold">Inventario Anual 2026</Title>
                        <Text variant="body2" color="text-secondary">Gestión centralizada de la toma física, asignaciones y monitorización en tiempo real.</Text>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botón de Sincronización Manual Reubicado */}
                        <Button
                            variant="ghost"
                            onClick={() => { fetchStats(); fetchInventoryList(); }}
                            title="Sincronizar Datos"
                            className="!text-[var(--color-text-secondary)] hover:!text-[var(--color-text-primary)] !p-2.5 !rounded-xl transition-colors"
                        >
                            <RefreshCw size={20} />
                        </Button>

                        {/* Tab Switcher */}
                        <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 w-fit shadow-sm">
                            {(['config', 'monitor', 'validation'] as const).map(tab => (
                                <Button 
                                    key={tab}
                                    variant={activeTab === tab ? 'primary' : 'ghost'}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-2 !px-6 !py-2 !rounded-xl !text-xs !font-bold transition-all ${
                                        activeTab === tab 
                                        ? '!bg-white dark:!bg-neutral-700 !shadow-sm !text-primary-500 !border-none' 
                                        : '!text-neutral-500 hover:!text-neutral-900 border-none'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {tab === 'config' ? 'Configuración' : tab === 'monitor' ? 'Monitor Maestro' : 'Validación'}
                                        {tab === 'monitor' && stats.discrepantes > 0 && (
                                            <Badge size="sm" variant="error" className="ml-1 scale-90">{stats.discrepantes}</Badge>
                                        )}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab: Configuración */}
                {activeTab === 'config' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ConfiguracionSeccion 
                            {...{conteoName, setConteoName, file, setFile, handleUploadMaestra, isUploading, 
                                handleUploadTransito, isUploadingTransito, uploadResult, setUploadResult, 
                                limpiarPrevio, setLimpiarPrevio, rondaActiva, isUpdatingConfig, handleUpdateRonda,
                                uploadProgress, handleGeneratePlanilla0}}
                        />
                        <AsignacionSeccion 
                            {...{coverage, newAsig, setNewAsig, isSearchingEmpleado, isSavingAsig, asignaciones,
                                handleSaveAsig, handleDeleteAsig, handleEditAsig, cancelEdit, editingAsigId,
                                getBodegaOptions, getBloqueOptions, getEstanteOptions, getNivelOptions, inventoryList}}
                        />
                    </div>
                )}

                {/* Tab: Monitor Maestro */}
                {activeTab === 'monitor' && (
                    <MonitorMaestroTab 
                        {...{stats, inventoryList, isLoadingData, filters, setFilters, columnFilters, setColumnFilters, fetchStats, fetchInventoryList, rondaActiva}}
                    />
                )}

                {/* Tab: Validación (Legacy) */}
                {activeTab === 'validation' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 shadow-sm">
                            <div className="mb-8">
                                <Title variant="h5" weight="bold">Módulo de Validación Legacy</Title>
                                <Text variant="caption" color="text-secondary">Sincroniza tus datos del año pasado para validar el motor actual.</Text>
                            </div>
                            <CargaLegacy 
                                apiBase={API_CONFIG.BASE_URL} 
                                onUploadSuccess={() => { fetchStats(); fetchInventoryList(); }} 
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventarioAdmin;
