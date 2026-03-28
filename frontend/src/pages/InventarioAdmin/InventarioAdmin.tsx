import React from 'react';
import { Title, Text, Badge, Button } from '../../components/atoms';
import { useInventarioAdmin } from './hooks/useInventarioAdmin';
import ConfiguracionSeccion from './components/ConfiguracionSeccion';
import MonitorMaestroTab from './components/MonitorMaestroTab';
import AsignacionSeccion from './components/AsignacionSeccion';
import CargaLegacy from './components/CargaLegacy';
import { API_CONFIG } from '../../config/api';

const InventarioAdmin: React.FC = () => {
    const {
        activeTab, setActiveTab, stats,
        // Config State
        conteoName, setConteoName, file, setFile, isUploading,
        limpiarPrevio, setLimpiarPrevio, uploadResult, setUploadResult,
        rondaActiva, isUpdatingConfig, isUploadingTransito,
        // Asig State
        coverage, newAsig, setNewAsig, isSearchingEmpleado, isSavingAsig, asignaciones,
        // Monitor State
        inventoryList, isLoadingData, filters, setFilters,
        // Handlers
        handleUploadMaestra, handleUploadTransito, handleSaveAsig, 
        handleDeleteAsig, handleEditAsig, cancelEdit, handleUpdateRonda, fetchStats, fetchInventoryList,
        editingAsigId, uploadProgress,
        // Helpers
        getBodegaOptions, getBloqueOptions, getEstanteOptions, getNivelOptions
    } = useInventarioAdmin();

    return (
        <div className="space-y-8 animate-in fade-in duration-500 px-2 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="space-y-1">
                    <Title variant="h4" weight="bold">Inventario Anual 2026</Title>
                    <Text variant="body2" color="text-secondary">Gestión centralizada de la toma física, asignaciones y monitorización en tiempo real.</Text>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 w-fit">
                    {(['config', 'monitor', 'validation'] as const).map(tab => (
                        <Button 
                            key={tab}
                            variant={activeTab === tab ? 'primary' : 'ghost'}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-2 !px-6 !py-2 !rounded-xl !text-xs !font-bold transition-all ${
                                activeTab === tab 
                                ? '!bg-white dark:!bg-neutral-700 !shadow-md !text-primary-500 !border-none' 
                                : '!text-neutral-500 hover:!text-neutral-900 border-none'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {tab === 'config' ? 'Configuración' : tab === 'monitor' ? 'Monitor Maestro' : 'Validación'}
                                {tab === 'monitor' && <Badge size="sm" variant={stats.discrepantes > 0 ? 'error' : 'success'} className="ml-1 scale-90">{stats.discrepantes}</Badge>}
                            </div>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Tab: Configuración */}
            {activeTab === 'config' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <ConfiguracionSeccion 
                        {...{conteoName, setConteoName, file, setFile, handleUploadMaestra, isUploading, 
                            handleUploadTransito, isUploadingTransito, uploadResult, setUploadResult, 
                            limpiarPrevio, setLimpiarPrevio, rondaActiva, isUpdatingConfig, handleUpdateRonda,
                            uploadProgress}}
                    />
                    <AsignacionSeccion 
                        {...{coverage, newAsig, setNewAsig, isSearchingEmpleado, isSavingAsig, asignaciones,
                            handleSaveAsig, handleDeleteAsig, handleEditAsig, cancelEdit, editingAsigId,
                            getBodegaOptions, getBloqueOptions, getEstanteOptions, getNivelOptions}}
                    />
                </div>
            )}

            {/* Tab: Monitor Maestro */}
            {activeTab === 'monitor' && (
                <MonitorMaestroTab 
                    {...{stats, inventoryList, isLoadingData, filters, setFilters, fetchStats, fetchInventoryList}}
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
    );
};

export default InventarioAdmin;
