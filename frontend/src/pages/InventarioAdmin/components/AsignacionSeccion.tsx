import React, { useState } from 'react';
import { Title, Text, Button, Input, Select, Badge, ProgressBar } from '../../../components/atoms';
import { UserPlus, UserMinus, Trash2, Search, Loader2, Pencil } from 'lucide-react';
import CargaAsignacionesModal from './CargaAsignacionesModal';

interface AsignacionSeccionProps {
    coverage: any;
    newAsig: any;
    setNewAsig: (f: any) => void;
    isSearchingEmpleado: boolean;
    isSavingAsig: boolean;
    asignaciones: any[];
    handleSaveAsig: () => void;
    handleDeleteAsig: (id: number) => void;
    handleEditAsig: (asig: any) => void;
    cancelEdit: () => void;
    editingAsigId: number | null;
    getBodegaOptions: () => any[];
    inventoryList: any[];
    buscarEmpleadoERP: (cedula: string, tipo: 'titular' | 'companero') => void;
    handleBulkSaveAsignaciones: (parejas: any[]) => void;
    exportAsignacionesExcel: () => void;
}

const AsignacionSeccion: React.FC<AsignacionSeccionProps> = ({
    coverage,
    newAsig,
    setNewAsig,
    isSearchingEmpleado,
    isSavingAsig,
    asignaciones,
    handleSaveAsig,
    handleDeleteAsig,
    handleEditAsig,
    cancelEdit,
    editingAsigId,
    getBodegaOptions,
    inventoryList,
    buscarEmpleadoERP,
    handleBulkSaveAsignaciones,
    exportAsignacionesExcel
}) => {
    const isEditMode = editingAsigId !== null;
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Calcular ítems por pareja: total_bodega / parejas_en_bodega
    const getItemsPerPair = (bodega: string) => {
        const totalItems = inventoryList.filter(i =>
            String(i.bodega || '').trim().toUpperCase() === String(bodega || '').trim().toUpperCase()
        ).length;

        const parejasEnBodega = new Set(
            asignaciones
                .filter(a => String(a.bodega || '').trim().toUpperCase() === String(bodega || '').trim().toUpperCase())
                .map(a => a.numero_pareja)
        ).size;

        return {
            total: totalItems,
            parejas: parejasEnBodega,
            porPareja: parejasEnBodega > 0 ? Math.ceil(totalItems / parejasEnBodega) : totalItems
        };
    };

    // Agrupar asignaciones por número de pareja
    const groupedAsignaciones = Object.values(asignaciones.reduce((acc: any, asig: any) => {
        const key = asig.numero_pareja || asig.cedula;
        if (!acc[key]) {
            const info = getItemsPerPair(asig.bodega);
            acc[key] = {
                id: asig.id,
                numero_pareja: asig.numero_pareja,
                cedula: asig.cedula,
                nombre: asig.nombre,
                cargo: asig.cargo || '',
                cedula_companero: asig.cedula_companero || '',
                nombre_companero: asig.nombre_companero || '',
                bodega: asig.bodega,
                items_totales: info.porPareja,
                total_bodega: info.total,
                parejas_bodega: info.parejas
            };
        }
        return acc;
    }, {}));

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-sm space-y-6">
            <CargaAsignacionesModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                inventoryList={inventoryList}
                onConfirm={(parejas) => {
                    setIsModalOpen(false);
                    handleBulkSaveAsignaciones(parejas);
                }}
            />
            <div className="flex items-center justify-between">
                <div>
                    <Title variant="h6" weight="bold">Asignación de Personal</Title>
                    <Text variant="caption" color="text-secondary">Asigna parejas por bodega. Los ítems se dividen equitativamente.</Text>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={exportAsignacionesExcel} className="!text-xs !py-1 !px-3 font-bold text-green-600 hover:bg-green-50 border border-green-200">
                        Exportar XLSX
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="!text-xs !py-1 !px-3 font-bold shadow-sm">
                        Carga Automática
                    </Button>
                    <Badge variant="info" size="sm" className="font-bold">{asignaciones.length} Activas</Badge>
                </div>
            </div>

            {/* Monitor de Cobertura */}
            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center gap-6 mb-4 transition-all duration-500 ${coverage.cobertura === 100 ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${coverage.cobertura === 100 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                            <Text variant="caption" weight="bold" className="uppercase tracking-[0.2em] text-[10px]">Cobertura por Bodega</Text>
                        </div>
                        <Text variant="body2" weight="bold" className={coverage.cobertura === 100 ? 'text-green-600' : 'text-amber-600'}>{coverage.cobertura}%</Text>
                    </div>
                    <ProgressBar
                        progress={coverage.cobertura}
                        variant={coverage.cobertura === 100 ? 'success' : 'warning'}
                        className="h-2"
                    />
                </div>
                <div className="flex shrink-0 items-center gap-4 border-l border-neutral-200 dark:border-neutral-700 pl-6 h-12">
                    <div className="text-center">
                        <Text variant="body2" weight="bold" className="block text-xl leading-none">{coverage.total_ubicaciones_pendientes}</Text>
                        <Text variant="caption" color="text-secondary" className="text-[9px] uppercase font-bold opacity-60">Bodegas</Text>
                    </div>
                    <div className="text-center">
                        <Text variant="body2" weight="bold" className={`block text-xl leading-none ${coverage.faltantes?.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{coverage.total_ubicaciones_pendientes - coverage.cubiertos}</Text>
                        <Text variant="caption" color="text-secondary" className="text-[9px] uppercase font-bold opacity-60">Sin Asignar</Text>
                    </div>
                </div>
            </div>

            {/* Desglose por Bodega */}
            {coverage.desglose_bodega && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    {Object.entries(coverage.desglose_bodega).map(([name, data]: [string, any]) => (
                        <div key={name} className="bg-neutral-50 dark:bg-neutral-800/30 p-2 px-3 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase text-neutral-400 block mb-1">Bodega {name}</Text>
                            <div className="flex items-center justify-between">
                                <Text variant="body2" weight="bold" className="text-xs">{data.porcentaje}%</Text>
                                <Text variant="caption" className="text-[8px] opacity-40">
                                    {data.parejas || 0} parejas · {data.items_por_pareja || 0}/par
                                </Text>
                            </div>
                            <ProgressBar progress={data.porcentaje} variant={data.porcentaje === 100 ? 'success' : 'primary'} className="h-1 mt-1" />
                        </div>
                    ))}
                </div>
            )}

            {/* Formulario de Asignación Simplificado: Solo Bodega */}
            <div className="bg-neutral-50/50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-inner overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-700">

                    {/* Grupo A: Información de la Cuadrilla */}
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
                                <Search size={14} className="text-primary-500" />
                            </div>
                            <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Composición de Cuadrilla</Text>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Operario 1 */}
                            <div className="md:col-span-4 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Cédula Titular</Text>
                                <div className="relative">
                                    <Input
                                        value={newAsig.cedula}
                                        onChange={(e) => setNewAsig((prev: any) => ({ ...prev, cedula: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Tab') {
                                                if (newAsig.cedula.length >= 4) {
                                                    buscarEmpleadoERP(newAsig.cedula, 'titular');
                                                }
                                            }
                                        }}
                                        placeholder="Cédula"
                                        className="rounded-xl h-10 text-xs pr-9 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                        disabled={isSearchingEmpleado}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isSearchingEmpleado ? <Loader2 size={12} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-8 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Nombre Completo</Text>
                                <Input
                                    value={newAsig.nombre}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Nombre cargado del ERP..."
                                    className="rounded-xl h-10 text-xs disabled:opacity-80 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                    disabled={true}
                                />
                            </div>

                            {/* Operario 2 */}
                            <div className="md:col-span-4 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Cédula Compañero</Text>
                                <div className="relative">
                                    <Input
                                        value={newAsig.cedula_companero || ''}
                                        onChange={(e) => setNewAsig((prev: any) => ({ ...prev, cedula_companero: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Tab') {
                                                if (newAsig.cedula_companero && newAsig.cedula_companero.length >= 4) {
                                                    buscarEmpleadoERP(newAsig.cedula_companero, 'companero');
                                                }
                                            }
                                        }}
                                        placeholder="Opcional"
                                        className="rounded-xl h-10 text-xs pr-9 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                        disabled={isSearchingEmpleado}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isSearchingEmpleado ? <Loader2 size={12} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-8 space-y-1.5">
                                <Text variant="caption" weight="bold" color="text-secondary" className="text-[9px] uppercase tracking-wider ml-1">Nombre Compañero</Text>
                                <Input
                                    value={newAsig.nombre_companero || ''}
                                    onChange={(e) => setNewAsig((prev: any) => ({ ...prev, nombre_companero: e.target.value }))}
                                    placeholder="Nombre cargado del ERP..."
                                    className="rounded-xl h-10 text-xs disabled:opacity-80 !bg-white dark:!bg-neutral-800 border-neutral-200"
                                    disabled={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Grupo B: Bodega (sin bloque/estante/nivel) */}
                    <div className="p-6 space-y-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                                    <UserPlus size={14} className="text-amber-500" />
                                </div>
                                <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Bodega Asignada</Text>
                            </div>

                            <Select
                                label="Bodega"
                                options={getBodegaOptions()}
                                value={newAsig.bodega}
                                onChange={(e) => setNewAsig((prev: any) => ({ ...prev, bodega: e.target.value }))}
                                size="sm"
                                disabled={isSavingAsig}
                            />

                            {newAsig.bodega && (
                                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-500/10 rounded-2xl border border-primary-100 dark:border-primary-500/20">
                                    <Text variant="caption" weight="bold" className="text-primary-600 text-[10px] uppercase">
                                        Previsualización de División
                                    </Text>
                                    {(() => {
                                        const info = getItemsPerPair(newAsig.bodega);
                                        const newParejas = isEditMode ? info.parejas : info.parejas + 1;
                                        const newPorPareja = Math.ceil(info.total / newParejas);
                                        return (
                                            <div className="flex items-center gap-4 mt-2">
                                                <div>
                                                    <Text variant="caption" className="text-[9px] text-neutral-400 uppercase font-bold">Total Ítems</Text>
                                                    <Text variant="body2" weight="bold" className="text-primary-600">{info.total}</Text>
                                                </div>
                                                <div>
                                                    <Text variant="caption" className="text-[9px] text-neutral-400 uppercase font-bold">Parejas</Text>
                                                    <Text variant="body2" weight="bold" className="text-primary-600">{newParejas}</Text>
                                                </div>
                                                <div>
                                                    <Text variant="caption" className="text-[9px] text-neutral-400 uppercase font-bold">Ítems/Pareja</Text>
                                                    <Text variant="body2" weight="bold" className="text-primary-600">~{newPorPareja}</Text>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex items-center gap-3 border-t border-neutral-200 dark:border-neutral-700/50">
                            <Button
                                variant={isEditMode ? 'secondary' : 'primary'}
                                className="h-11 rounded-2xl w-full font-bold text-xs shadow-lg shadow-primary-500/20"
                                icon={isSavingAsig ? Loader2 : (isEditMode ? Search : UserPlus)}
                                onClick={handleSaveAsig}
                                disabled={isSavingAsig || !newAsig.cedula || !newAsig.bodega}
                            >
                                {isSavingAsig ? 'Procesando...' : (isEditMode ? 'Guardar Cambios' : 'Confirmar Asignación')}
                            </Button>
                            {isEditMode && (
                                <Button
                                    variant="ghost"
                                    className="h-11 px-4 rounded-2xl text-[10px] font-bold text-neutral-400 hover:text-neutral-600"
                                    onClick={cancelEdit}
                                >
                                    Descartar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Listado de Asignaciones */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <UserMinus size={14} className="text-neutral-400" />
                    <Text variant="caption" weight="bold" className="uppercase tracking-widest text-neutral-400">Personal Asignado</Text>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {groupedAsignaciones.length === 0 ? (
                        <div className="col-span-full py-10 text-center bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                            <Text variant="caption" color="text-secondary">No hay operarios asignados.</Text>
                        </div>
                    ) : (
                        groupedAsignaciones.map((grupo: any) => (
                            <div key={grupo.numero_pareja || grupo.nombre} className="flex flex-col p-5 bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:border-primary-500 hover:shadow-md transition-all">
                                {/* Encabezado */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-lg border border-primary-100 dark:border-primary-500/20">
                                            {grupo.nombre.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="primary" size="sm" className="bg-primary-500/10 text-primary-600 border-none px-2 scale-90 -ml-1">Pareja {grupo.numero_pareja || '?'}</Badge>
                                                <Text variant="caption" weight="bold" className="leading-tight text-[12px] truncate max-w-[200px]">{grupo.nombre}</Text>
                                            </div>
                                            {grupo.nombre_companero && (
                                                <Text variant="caption" color="text-secondary" className="text-[11px] uppercase font-medium tracking-tight mt-0.5">
                                                    + {grupo.nombre_companero}
                                                </Text>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost" size="sm"
                                            className="h-7 w-7 p-0 rounded-lg text-primary-500 bg-white hover:bg-primary-50 dark:bg-neutral-800 shadow-sm"
                                            onClick={() => handleEditAsig(grupo)} icon={Pencil} title="Editar Asignación"
                                        />
                                        <Button
                                            variant="ghost" size="sm"
                                            className="h-7 w-7 p-0 rounded-lg text-red-400 bg-white hover:text-red-600 hover:bg-red-50 dark:bg-neutral-800 shadow-sm"
                                            onClick={() => handleDeleteAsig(grupo.id)} icon={Trash2} title="Eliminar Asignación"
                                        />
                                    </div>
                                </div>

                                {/* Info compacta: Bodega + Ítems */}
                                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Bodega</Text>
                                            <Text variant="caption" weight="bold" className="text-[13px] text-primary-600">{grupo.bodega}</Text>
                                        </div>
                                        <div className="flex flex-col">
                                            <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Total Bodega</Text>
                                            <Text variant="caption" weight="bold" className="text-[11px] text-neutral-500">{grupo.total_bodega}</Text>
                                        </div>
                                        <div className="flex flex-col">
                                            <Text variant="caption" className="text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Parejas</Text>
                                            <Text variant="caption" weight="bold" className="text-[11px] text-neutral-500">{grupo.parejas_bodega}</Text>
                                        </div>
                                    </div>
                                    <Badge variant="info" className="text-[11px] font-bold">
                                        ~{grupo.items_totales} ítems
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AsignacionSeccion;
