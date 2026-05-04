import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, Input, Select, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Search, Save, User, DollarSign, ListOrdered, Database, Trash2, Edit2, CheckCircle2, Clock, Settings2 } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';

interface Concepto {
    id: number;
    nombre: string;
    concepto_nomina: string;
}

interface Empleado {
    cedula: string;
    nombre: string;
    empresa: string;
    cargo?: string;
    area?: string;
}

interface RegistroActivo {
    id: number;
    cedula: string;
    nombre: string;
    empresa: string;
    concepto: string;
    valor_descuento: number;
    n_cuotas: number;
    valor_cuota: number;
    saldo: number;
    estado: string;
    fecha_inicio: string;
    fecha_finalizacion: string;
}

const ControlDescuentosRegistro: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    
    const [conceptos, setConceptos] = useState<Concepto[]>([]);
    const [registros, setRegistros] = useState<RegistroActivo[]>([]);
    const [searchText, setSearchText] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        id: null as number | null,
        cedula: '',
        nombre: '',
        empresa: '',
        cargo: '',
        area: '',
        concepto: '',
        valor_descuento: '',
        n_cuotas: '1',
        fecha_inicio: new Date().toISOString().split('T')[0],
        observaciones: ''
    });

    // ── Data Fetching ────────────────────────────────────────────────────────────

    const fetchData = async () => {
        setIsLoadingTable(true);
        try {
            const [resConceptos, resRegistros] = await Promise.all([
                axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/conceptos`),
                axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/activos`)
            ]);
            setConceptos(resConceptos.data);
            setRegistros(resRegistros.data.items || []);
        } catch (err) {
            console.error('Error cargando datos:', err);
            addNotification('error', 'Error al cargar la información del servidor');
        } finally {
            setIsLoadingTable(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleSearchEmpleado = async () => {
        if (!formData.cedula) return;
        setIsSearching(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/empleado/${formData.cedula}`);
            const emp = res.data as Empleado;
            setFormData(prev => ({
                ...prev,
                nombre: emp.nombre,
                empresa: emp.empresa,
                cargo: emp.cargo || '',
                area: emp.area || ''
            }));
            addNotification('success', 'Empleado encontrado');
        } catch (err: any) {
            console.error(err);
            addNotification('error', 'Empleado no encontrado en el ERP');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre || !formData.concepto || !formData.valor_descuento) {
            addNotification('warning', 'Completa los campos obligatorios');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                valor_descuento: parseFloat(formData.valor_descuento),
                n_cuotas: parseInt(formData.n_cuotas)
            };

            if (formData.id) {
                await axios.put(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/registro/${formData.id}`, payload);
                addNotification('success', 'Registro actualizado correctamente');
            } else {
                await axios.post(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/registro`, payload);
                addNotification('success', 'Descuento registrado correctamente');
            }
            
            resetForm();
            fetchData();
        } catch (err: any) {
            console.error(err);
            addNotification('error', err.response?.data?.detail || 'Error en la operación');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/registro/${id}`);
            addNotification('success', 'Registro eliminado');
            fetchData();
        } catch (err) {
            addNotification('error', 'No se pudo eliminar el registro');
        }
    };

    const handleEdit = (reg: RegistroActivo) => {
        setFormData({
            id: reg.id,
            cedula: reg.cedula,
            nombre: reg.nombre,
            empresa: reg.empresa,
            cargo: '', 
            area: '',
            concepto: reg.concepto,
            valor_descuento: reg.valor_descuento.toString(),
            n_cuotas: reg.n_cuotas.toString(),
            fecha_inicio: reg.fecha_inicio,
            observaciones: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setFormData({
            id: null,
            cedula: '',
            nombre: '',
            empresa: '',
            cargo: '',
            area: '',
            concepto: '',
            valor_descuento: '',
            n_cuotas: '1',
            fecha_inicio: new Date().toISOString().split('T')[0],
            observaciones: ''
        });
    };

    // ── Formateo y Lógica ───────────────────────────────────────────────────────

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const columns = useMemo<ColumnDef<RegistroActivo>[]>(() => [
        { header: 'CEDULA', accessorKey: 'cedula', align: 'center' },
        { header: 'NOMBRE', accessorKey: 'nombre', align: 'center' },
        { header: 'CONCEPTO', accessorKey: 'concepto', align: 'center' },
        { 
            header: 'VALOR TOTAL', 
            accessorKey: 'valor_descuento',
            align: 'right',
            cell: (row) => <Text align="right" className="font-mono">{formatCurrency(row.valor_descuento)}</Text>
        },
        { header: 'CUOTAS', accessorKey: 'n_cuotas', align: 'center' },
        { 
            header: 'SALDO', 
            accessorKey: 'saldo',
            align: 'right',
            cell: (row) => <Text color="text-primary" align="right" className="font-mono">{formatCurrency(row.saldo)}</Text>
        },
        { 
            header: 'ESTADO', 
            accessorKey: 'estado',
            align: 'center',
            cell: (row) => (
                <Badge variant={row.estado === 'CERRADO' ? 'success' : 'warning'} size="sm">
                    {row.estado === 'CERRADO' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {row.estado}
                </Badge>
            )
        },
        { header: 'INICIO', accessorKey: 'fecha_inicio', align: 'center' },
        { header: 'FIN', accessorKey: 'fecha_finalizacion', align: 'center' },
        {
            header: 'ACCIONES',
            accessorKey: 'id',
            align: 'center',
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(row)}>
                        <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                </div>
            )
        }
    ], []);

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 flex flex-col h-[calc(100vh-170px)] overflow-hidden space-y-4 px-2">
            
            {/* Header Compacto */}
            <div className="flex-none flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <Title variant="h5" weight="bold">Gestión Maestra de Descuentos</Title>
                        <Text color="text-secondary" className="text-[10px] uppercase tracking-widest opacity-70">
                            HISTORIAL Y REGISTRO DE DESCUENTOS ACTIVOS
                        </Text>
                    </div>
                </div>
                {formData.id && (
                    <Button variant="neutral" size="sm" onClick={resetForm} className="h-8 px-4">
                        Limpiar / Nuevo Registro
                    </Button>
                )}
            </div>

            {/* Panel de Formulario y Tabla en Estructura Vertical */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                
                {/* PARTE SUPERIOR: FORMULARIO ERP STYLE ULTRA-COMPACTO */}
                <div className="w-full flex-none bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 overflow-visible">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Fila 1: Colaborador - Distribución Corregida */}
                        <div className="flex flex-wrap items-center gap-8 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                            
                            {/* Cédula */}
                            <div className="flex items-center gap-3 w-[180px]">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Cédula:</Text>
                                <Input
                                    id="cedula-input"
                                    type="text"
                                    placeholder="00000000"
                                    className="[&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] [&_input]:font-mono [&_input]:w-[120px] shadow-sm"
                                    value={formData.cedula}
                                    onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchEmpleado()}
                                    onBlur={() => formData.cedula && handleSearchEmpleado()}
                                />
                            </div>

                            {/* Nombre */}
                            <div className="flex-[1.8] flex items-center gap-3 min-w-[200px]">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Nombre:</Text>
                                <Input
                                    readOnly
                                    className="flex-1 [&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] [&_input]:bg-slate-100 dark:[&_input]:bg-slate-800 [&_input]:cursor-not-allowed [&_input]:font-bold shadow-sm"
                                    value={formData.nombre}
                                />
                            </div>

                            {/* Empresa */}
                            <div className="flex-1 flex items-center gap-3 min-w-[150px]">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Empresa:</Text>
                                <Input
                                    readOnly
                                    className="flex-1 [&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] [&_input]:bg-slate-100 dark:[&_input]:bg-slate-800 [&_input]:cursor-not-allowed shadow-sm"
                                    value={formData.empresa}
                                />
                            </div>

                            {/* Área */}
                            <div className="flex-1 flex items-center gap-3 min-w-[150px]">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Área:</Text>
                                <Input
                                    readOnly
                                    className="flex-1 [&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] [&_input]:bg-slate-100 dark:[&_input]:bg-slate-800 [&_input]:cursor-not-allowed shadow-sm"
                                    value={formData.area}
                                />
                            </div>
                        </div>

                        {/* Fila 2: Configuración Descuento */}
                        <div className="flex flex-wrap items-center gap-8 px-4">
                            
                            {/* Concepto + Gear */}
                            <div className="flex-1 min-w-[300px] flex items-center gap-3">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Concepto:</Text>
                                <div className="flex-1 flex gap-1">
                                    <Select
                                        value={formData.concepto}
                                        onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                                        options={[
                                            { value: "", label: "Seleccionar concepto..." },
                                            ...conceptos.map(c => ({ value: c.nombre, label: c.nombre }))
                                        ]}
                                        className="flex-1 [&_select]:h-8 [&_select]:px-3 [&_select]:text-[11px] shadow-sm"
                                    />
                                    <Button 
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        title="Configurar Conceptos"
                                        className="h-8 w-8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 shadow-sm"
                                        onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/conceptos')}
                                        icon={Settings2}
                                    />
                                </div>
                            </div>

                            {/* Valor */}
                            <div className="flex items-center gap-3">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Valor:</Text>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        className="w-[150px] [&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] [&_input]:font-black [&_input]:text-right shadow-sm"
                                        placeholder="$ 0"
                                        value={formData.valor_descuento ? `$ ${Number(formData.valor_descuento).toLocaleString('es-CO')}` : ''}
                                        onChange={e => {
                                            const rawValue = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, valor_descuento: rawValue });
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Cuotas */}
                            <div className="flex items-center gap-3">
                                <Text variant="caption" weight="bold" className="text-slate-500 uppercase whitespace-nowrap text-[10px]">Cuotas:</Text>
                                <Input
                                    type="number"
                                    className="w-[70px] [&_input]:h-8 [&_input]:px-3 [&_input]:text-[11px] shadow-sm"
                                    min="1"
                                    value={formData.n_cuotas}
                                    onChange={e => setFormData({ ...formData, n_cuotas: e.target.value })}
                                />
                            </div>

                            {/* Fecha (15/30) */}
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 h-8 px-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                <Text variant="caption" weight="bold" className="text-slate-400 uppercase ml-1 text-[10px]">Fecha:</Text>
                                <Select
                                    value={formData.fecha_inicio.split('-')[2] === '15' ? '15' : '30'}
                                    onChange={e => {
                                        const parts = formData.fecha_inicio.split('-');
                                        parts[2] = e.target.value;
                                        setFormData({ ...formData, fecha_inicio: parts.join('-') });
                                    }}
                                    options={[{ value: "15", label: "15" }, { value: "30", label: "30" }]}
                                    className="[&_select]:h-8 [&_select]:px-2 [&_select]:text-xs [&_select]:bg-transparent [&_select]:border-none [&_select]:font-bold [&_select]:w-12"
                                />
                                <Select
                                    value={formData.fecha_inicio.split('-')[1]}
                                    onChange={e => {
                                        const parts = formData.fecha_inicio.split('-');
                                        parts[1] = e.target.value;
                                        setFormData({ ...formData, fecha_inicio: parts.join('-') });
                                    }}
                                    options={['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => ({
                                        value: m,
                                        label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]
                                    }))}
                                    className="[&_select]:h-8 [&_select]:px-2 [&_select]:text-xs [&_select]:bg-transparent [&_select]:border-none [&_select]:font-bold [&_select]:w-16"
                                />
                                <Input
                                    type="number"
                                    className="w-20 [&_input]:h-8 [&_input]:px-2 [&_input]:text-xs [&_input]:bg-transparent [&_input]:border-none [&_input]:font-bold"
                                    value={formData.fecha_inicio.split('-')[0]}
                                    onChange={e => {
                                        const parts = formData.fecha_inicio.split('-');
                                        parts[0] = e.target.value;
                                        setFormData({ ...formData, fecha_inicio: parts.join('-') });
                                    }}
                                />
                            </div>

                            {/* Botón Guardar - ERP STYLE FINAL */}
                            <div className="flex items-center gap-2 ml-auto">
                                {formData.id && (
                                    <Button 
                                        variant="ghost"
                                        onClick={resetForm}
                                        className="h-8 px-3"
                                    >
                                        <Text size="xs" weight="bold" color="text-tertiary" className="uppercase tracking-wider">Cancelar</Text>
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    variant="primary"
                                    className="px-8 h-8 rounded-xl bg-gradient-to-b from-white to-slate-200 dark:from-slate-800 dark:to-slate-900 !text-[#2b4c7e] dark:!text-blue-300 border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg transition-all"
                                >
                                    {isLoading ? (
                                        <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                    ) : (
                                        <Text as="span" weight="black" className="text-[10px] uppercase tracking-widest text-inherit">
                                            {formData.id ? 'ACTUALIZAR' : 'GENERAR DESCUENTO'}
                                        </Text>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* PARTE INFERIOR: TABLA MAESTRA */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="flex-none p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-purple-500" />
                            <Title variant="h6" weight="bold" className="text-slate-700 dark:text-slate-200 uppercase text-[11px] tracking-wider">HISTORIAL MAESTRO DE DESCUENTOS</Title>
                        </div>
                        <div className="flex items-center gap-4">
                            <Text size="xs" color="text-tertiary" className="font-bold uppercase tracking-tighter opacity-60">{registros.length} REGISTROS TOTALES</Text>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-hidden relative">
                        {isLoadingTable ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-20 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
                            </div>
                        ) : (
                            <NominaTable
                                data={registros}
                                columns={columns}
                                hideSearch // Propiedad para ocultar el buscador interno
                                fullHeight
                            />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

/* Icons */
const PlusCircleIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

export default ControlDescuentosRegistro;
