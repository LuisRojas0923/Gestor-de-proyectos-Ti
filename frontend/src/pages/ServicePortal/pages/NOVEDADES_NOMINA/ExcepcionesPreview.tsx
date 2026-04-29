import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, Select, Input, Badge, Checkbox } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Minus, Trash2, History, AlertTriangle, User, Calendar, CreditCard, DollarSign, ShieldOff, Percent } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';
import ExcepcionesIcon from '../../../../assets/images/categories/EXCEPCIONES.png';

interface Excepcion {
    id?: number;
    cedula: string;
    nombre_asociado?: string;
    subcategoria: string;
    tipo: 'SALDO_FAVOR' | 'PAGO_TERCERO' | 'RETIRADO_AUTORIZADO' | 'CONTRATISTAS' | 'EXONERACION' | 'PORCENTAJE_EMPRESA';
    estado: 'ACTIVO' | 'INACTIVO' | 'AGOTADO';
    valor_configurado: number;
    saldo_actual: number;
    pagador_cedula?: string;
    fecha_inicio: string;
    fecha_fin?: string;
    observacion?: string;
    creado_por: string;
}

const TIPOS_EXCEPCION = [
    { value: 'SALDO_FAVOR', label: 'Saldo a Favor' },
    { value: 'PAGO_TERCERO', label: 'Pago Tercero' },
    { value: 'RETIRADO_AUTORIZADO', label: 'Retirado Autorizado' },
    { value: 'CONTRATISTAS', label: 'Contratistas (No ERP)' },
    { value: 'EXONERACION', label: 'Exoneración de Pago' },
    { value: 'PORCENTAJE_EMPRESA', label: 'Porcentaje Pago Empresa' }
];



const ExcepcionesPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [colaboradorEstadoERP, setColaboradorEstadoERP] = useState<string | null>(null);

    const [allSubcategories, setAllSubcategories] = useState<string[]>([]);
    const [selectedSubs, setSelectedSubs] = useState<string[]>([]);

    const [formData, setFormData] = useState<Partial<Excepcion>>({
        tipo: 'SALDO_FAVOR',
        estado: 'ACTIVO',
        fecha_inicio: new Date().toISOString().split('T')[0],
        valor_configurado: 0,
        saldo_actual: 0,
        nombre_asociado: ''
    });

    // Formateador de moneda para visualización
    const formatCurrencyInput = (val?: number) => {
        if (!val && val !== 0) return "";
        return new Intl.NumberFormat('es-CO').format(val);
    };

    // Parser para quitar formato al guardar
    const parseCurrencyInput = (val: string) => {
        return parseFloat(val.replace(/\./g, '')) || 0;
    };

    const fetchExcepciones = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/`);
            setExcepciones(res.data);
        } catch (err) {
            console.error("Error fetching excepciones:", err);
            addNotification('error', 'No se pudieron cargar las excepciones de la base de datos');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCatalog = async () => {
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/catalogo`);
            if (res.data) {
                const subs = Object.values(res.data).flat().filter(s => typeof s === 'string') as string[];
                // Filter out 'GESTION EXCEPCIONES' to avoid self-reference
                const filteredSubs = subs.filter(s => 
                    s !== 'GESTION EXCEPCIONES' && 
                    s !== 'PLANILLAS REGIONALES 1Q' && 
                    s !== 'PLANILLAS REGIONALES 2Q'
                );
                setAllSubcategories(filteredSubs);
                if (filteredSubs.length > 0 && !formData.subcategoria) {
                    setFormData((prev: any) => ({ ...prev, subcategoria: filteredSubs[0] }));
                }
            }
        } catch (err) {
            console.error("Error fetching catalog:", err);
            addNotification('error', 'No se pudo cargar el listado de subcategorías');
        }
    };

    useEffect(() => {
        fetchExcepciones();
        fetchCatalog();
    }, []);

    const handleValidate = async () => {
        if (!formData.cedula) {
            addNotification('warning', 'Ingresa una cédula para validar');
            return;
        }

        setIsValidating(true);
        setColaboradorEstadoERP(null);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/validar-colaborador/${formData.cedula}`);
            if (res.data && res.data.nombre) {
                setFormData(prev => ({ ...prev, nombre_asociado: res.data.nombre }));
                const estadoRaw = (res.data.estado || '').toUpperCase();
                const isActivo = estadoRaw === 'ACTIVO';
                setColaboradorEstadoERP(estadoRaw || 'DESCONOCIDO');
                if (!isActivo) {
                    addNotification('info', `Colaborador encontrado: ${res.data.nombre} (Estado: ${res.data.estado})`);
                } else {
                    addNotification('success', 'Colaborador encontrado en base de datos');
                    // Si está activo, limpiar pagador ya que no se necesita
                    setFormData(prev => ({ ...prev, pagador_cedula: '' }));
                }
            } else {
                setColaboradorEstadoERP('NO_ENCONTRADO');
                addNotification('info', 'No se encontró en base ERP. Puedes ingresar el nombre manualmente.');
                setFormData(prev => ({ ...prev, nombre_asociado: '' }));
            }
        } catch (err) {
            console.error("Error validating collaborator:", err);
            addNotification('error', 'Error al consultar la base de datos de Solid');
        } finally {
            setIsValidating(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.cedula || !formData.tipo || selectedSubs.length === 0) {
                addNotification('warning', 'Cédula, Tipo y al menos una Subcategoría son obligatorios');
                return;
            }

            setIsLoading(true);
            let successCount = 0;
            let errorMessages: string[] = [];

            for (const sub of selectedSubs) {
                try {
                    // Asegurar que la fecha se envíe en un formato que el backend maneje bien
                    const fechaEnvio = formData.fecha_inicio ? new Date(formData.fecha_inicio).toISOString() : new Date().toISOString();
                    const payload = { ...formData, subcategoria: sub, creado_por: 'ADMIN', fecha_inicio: fechaEnvio };
                    await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/`, payload);
                    successCount++;
                } catch (err: any) {
                    console.error(`Error saving for ${sub}:`, err);
                    const detail = err.response?.data?.detail;
                    errorMessages.push(`${sub}: ${typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Error desconocido'}`);
                }
            }

            if (successCount > 0) {
                addNotification('success', `Se crearon ${successCount} excepciones correctamente`);
            }
            
            if (errorMessages.length > 0) {
                addNotification('error', `Errores: ${errorMessages.join(', ')}`);
            }

            if (successCount > 0) {
                setShowForm(false);
                fetchExcepciones();
                setFormData({
                    tipo: 'SALDO_FAVOR',
                    estado: 'ACTIVO',
                    fecha_inicio: new Date().toISOString().split('T')[0],
                    valor_configurado: 0,
                    saldo_actual: 0
                });
                setSelectedSubs([]);
            }
        } catch (err: any) {
            console.error(err);
            addNotification('error', 'Error general al procesar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Â¿Estás seguro de eliminar esta excepción?')) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}/novedades-nomina/excepciones/${id}`);
            addNotification('success', 'Eliminada');
            fetchExcepciones();
        } catch (err) {
            addNotification('error', 'Error al eliminar');
        }
    };

    const columns = useMemo<ColumnDef<Excepcion>[]>(() => [
        { header: 'COLABORADOR', accessorKey: 'cedula', cell: (row) => (
            <div className="flex flex-col">
                <Text size="sm" weight="bold">{row.cedula}</Text>
                <Text size="xs" color="text-tertiary">{row.nombre_asociado || 'N/A'}</Text>
            </div>
        )},
        { header: 'SUBCATEGORÃA', accessorKey: 'subcategoria' },
        { header: 'TIPO', accessorKey: 'tipo', cell: (row) => (
            <Badge variant="info" size="sm">{row.tipo}</Badge>
        )},
        { header: 'ESTADO', accessorKey: 'estado', cell: (row) => (
            <Badge variant={row.estado === 'ACTIVO' ? 'success' : 'warning'} size="sm">{row.estado}</Badge>
        )},
        { header: 'VALOR/SALDO', accessorKey: 'saldo_actual', align: 'right', cell: (row) => (
            <div className="flex flex-col items-end">
                <Text size="xs" weight="bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(row.saldo_actual || row.valor_configurado)}</Text>
                {row.tipo === 'SALDO_FAVOR' && <Text size="xs" color="text-tertiary">Saldo</Text>}
            </div>
        )},
        { header: 'ACCIONES', accessorKey: 'id', align: 'center', cell: (row) => (
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id!)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        )}
    ], []);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <img src={ExcepcionesIcon} alt="Excepciones" className="max-w-full max-h-full object-contain scale-125" />
                        </div>
                        <div>
                            <Title variant="h4" weight="bold">Gestión de Excepciones</Title>
                            <Text color="text-secondary">Ajustes especiales de nómina personalizables</Text>
                        </div>
                    </div>
                </div>
                <Button variant="primary" onClick={() => setShowForm(!showForm)} className="min-w-[140px] h-[52px] !flex !items-center !justify-center">
                    <div className="flex flex-col items-center justify-center w-full min-h-[44px]">
                        <div className="flex items-center justify-center h-6 w-full">
                            {showForm ? <Minus className="w-6 h-6 stroke-[3px]" /> : <Plus className="w-6 h-6 stroke-[3px]" />}
                        </div>
                        <Text variant="caption" weight="bold" color="inherit" className="leading-none mt-1 uppercase text-[10px] tracking-wide">{showForm ? 'Cerrar Formulario' : 'Nueva Excepción'}</Text>
                    </div>
                </Button>
            </div>

            {/* Formulario */}
            {showForm && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input
                                        label="Cédula Colaborador"
                                        placeholder="Ej: 12345678"
                                        value={formData.cedula || ''}
                                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                    />
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={handleValidate} 
                                    isLoading={isValidating}
                                    className="mb-1 h-[42px]"
                                >
                                    Validar
                                </Button>
                            </div>
                            <Input
                                label="Nombre del Colaborador"
                                placeholder="Nombre completo"
                                value={formData.nombre_asociado || ''}
                                onChange={(e) => setFormData({ ...formData, nombre_asociado: e.target.value })}
                                className={formData.nombre_asociado ? "border-green-500 bg-green-50 dark:bg-green-900/10" : ""}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <Text weight="bold" size="sm">Aplicar a Subcategorías (Checklist)</Text>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-[10px] uppercase font-bold"
                                        onClick={() => setSelectedSubs(allSubcategories)}
                                    >
                                        Marcar Todas
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-[10px] uppercase font-bold text-red-500"
                                        onClick={() => setSelectedSubs([])}
                                    >
                                        Limpiar
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto grid grid-cols-2 gap-3">
                                {allSubcategories.map(sub => (
                                    <Checkbox
                                        key={sub}
                                        label={sub}
                                        checked={selectedSubs.includes(sub)}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            if (isChecked) setSelectedSubs([...selectedSubs, sub]);
                                            else setSelectedSubs(selectedSubs.filter(s => s !== sub));
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <Select
                            label="Tipo de Excepción"
                            value={formData.tipo || ''}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                            options={TIPOS_EXCEPCION}
                        />
                        
                        {formData.tipo === 'PORCENTAJE_EMPRESA' && (
                            <Input
                                label="Porcentaje que asume la empresa (%)"
                                icon={Percent}
                                type="number"
                                value={formData.valor_configurado?.toString() || '0'}
                                onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                    setFormData({ ...formData, valor_configurado: val });
                                }}
                                placeholder="Ej: 50"
                            />
                        )}

                        {formData.tipo === 'SALDO_FAVOR' && (
                            <Input
                                label="Saldo Inicial"
                                icon={DollarSign}
                                value={formatCurrencyInput(formData.valor_configurado)}
                                onChange={(e) => {
                                    const val = parseCurrencyInput(e.target.value);
                                    setFormData({ ...formData, valor_configurado: val, saldo_actual: val });
                                }}
                                placeholder="0"
                            />
                        )}

                        {(formData.tipo === 'PAGO_TERCERO' || (formData.tipo === 'PORCENTAJE_EMPRESA' && colaboradorEstadoERP !== 'ACTIVO')) && (
                            <Input
                                label="Cédula del Pagador"
                                placeholder="Quién asume el pago"
                                value={formData.pagador_cedula || ''}
                                onChange={(e) => setFormData({ ...formData, pagador_cedula: e.target.value })}
                            />
                        )}

                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <Input
                                    label="Fecha Inicio"
                                    type="date"
                                    value={formData.fecha_inicio || ''}
                                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                />
                            </div>
                            <Button variant="primary" className="mb-1 min-w-[140px] h-[52px] !flex !items-center !justify-center" onClick={handleSave}>
                                <div className="flex flex-col items-center justify-center w-full min-h-[44px]">
                                    <div className="flex items-center justify-center h-6 w-full">
                                        <Save className="w-6 h-6" />
                                    </div>
                                    <Text variant="caption" weight="bold" color="inherit" className="leading-none mt-1 uppercase text-[10px] tracking-wide">Guardar Excepción</Text>
                                </div>
                            </Button>
                        </div>

                        <div className="md:col-span-3">
                             <Input
                                label="Observaciones / Motivo"
                                placeholder="Explica el caso especial..."
                                value={formData.observacion || ''}
                                onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Avisos */}
             {!showForm && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
                        <CreditCard className="w-8 h-8 text-blue-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">Saldo a Favor</Text>
                            <Text size="xs" color="text-tertiary">Abonos previos. Requiere saldo total para aplicar.</Text>
                        </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 flex items-start gap-4">
                        <User className="w-8 h-8 text-indigo-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">Pago Tercero</Text>
                            <Text size="xs" color="text-tertiary">Cuando un gerente asume el cobro de otro.</Text>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 flex items-start gap-4">
                        <Calendar className="w-8 h-8 text-amber-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">Retirado Autorizado</Text>
                            <Text size="xs" color="text-tertiary">Bypass para retirados con aprobación.</Text>
                        </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 flex items-start gap-4">
                        <Plus className="w-8 h-8 text-emerald-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">Contratistas</Text>
                            <Text size="xs" color="text-tertiary">Colaboradores externos que no están en el ERP.</Text>
                        </div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 flex items-start gap-4">
                        <ShieldOff className="w-8 h-8 text-rose-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">Exoneración</Text>
                            <Text size="xs" color="text-tertiary">Empleado activo exento de pago en la subcategoría.</Text>
                        </div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl border border-violet-100 flex items-start gap-4">
                        <Percent className="w-8 h-8 text-violet-500 mt-1" />
                        <div>
                            <Text weight="bold" size="sm">% Empresa</Text>
                            <Text size="xs" color="text-tertiary">La empresa asume un porcentaje del descuento.</Text>
                        </div>
                    </div>
                 </div>
            )}

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-end items-center">
                    <Badge variant="default">{excepciones.length} Excepciones registradas</Badge>
                </div>
                <div className="h-[500px]">
                    <NominaTable
                        data={excepciones}
                        columns={columns}
                        globalFilterText={searchText}
                        onGlobalFilterChange={setSearchText}
                        fullHeight
                    />
                </div>
            </div>
        </div>
    );
};

export default ExcepcionesPreview;
