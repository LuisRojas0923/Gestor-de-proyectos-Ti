import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button, Title, Text, Select, Input, Textarea } from '../../../../components/atoms';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG } from '../../../../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface UserData {
    id: string; cedula: string; name: string; email: string; area?: string; cargo?: string; sede?: string;
}

interface OTSistema {
    orden: string; cliente: string; uen: string; especialidad: string; subindice: string;
    centro_costo: string; subcentro: string; categoria_sub_indice: string;
}

interface CatalogoProducto {
    referencia: string; descripcion: string; unidadmedida: string; tipo: string; clasificacion: string; rotacion: string;
}

interface LineaForm {
    id: string; // id temporal
    referenciaproducto: string;
    descripcionproducto: string;
    cantidad: number;
    unidadmedida: string;
    tipo: string;
    clasificacion: string;
    rotacion: string;
    observaciones: string;
}

interface AlmacenFormViewProps {
    user: UserData;
}

const AlmacenFormView: React.FC<AlmacenFormViewProps> = () => {
    const { especialidad: especialidadUrl } = useParams<{ especialidad: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const [isLoading, setIsLoading] = useState(false);

    // Catalogos
    const [otsBase, setOtsBase] = useState<OTSistema[]>([]);
    const [catalogoProductos, setCatalogoProductos] = useState<CatalogoProducto[]>([]);

    // Formulario Encabezado
    const [fechaNecesidad, setFechaNecesidad] = useState('');
    const [observacionesGrles, setObservacionesGrles] = useState('');
    const [selectedOT, setSelectedOT] = useState<string>('');
    const [headerDatos, setHeaderDatos] = useState<Partial<OTSistema>>({});

    // Formulario Detalle (Lineas)
    const [lineas, setLineas] = useState<LineaForm[]>([]);

    // Estado nueva linea temporal
    const [newLine, setNewLine] = useState<LineaForm>({
        id: '', referenciaproducto: '', descripcionproducto: '', cantidad: 1,
        unidadmedida: '', tipo: '', clasificacion: '', rotacion: '', observaciones: ''
    });

    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                // TODO: Idealmente agregar un parámetro de búsqueda al endpoint de OTS si son muchas
                const [otsRes, catRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/erp/requisiciones/ots`, { params: { limit: 500 } }),
                    axios.get(`${API_BASE_URL}/erp/requisiciones/catalogo`, { params: { limit: 500 } })
                ]);
                setOtsBase(otsRes.data as OTSistema[]);
                setCatalogoProductos(catRes.data as CatalogoProducto[]);
            } catch (error) {
                console.error("Error cargando catálogos ERP", error);
                addNotification('error', 'Error conectando con el ERP para catálogos.');
            }
        };
        fetchCatalogs();
    }, [addNotification]);

    useEffect(() => {
        if (selectedOT) {
            const otData = otsBase.find(ot => ot.orden === selectedOT);
            if (otData) setHeaderDatos(otData);
            else setHeaderDatos({});
        } else {
            setHeaderDatos({});
        }
    }, [selectedOT, otsBase]);

    const handleAddLine = () => {
        if (!newLine.referenciaproducto || newLine.cantidad <= 0) {
            addNotification('warning', 'Seleccione un producto válido y cantidad mayor a 0');
            return;
        }
        setLineas([...lineas, { ...newLine, id: Math.random().toString(36).substring(7) }]);
        // Reset nueva linea
        setNewLine({
            id: '', referenciaproducto: '', descripcionproducto: '', cantidad: 1,
            unidadmedida: '', tipo: '', clasificacion: '', rotacion: '', observaciones: ''
        });
    };

    const handleRemoveLine = (id: string) => {
        setLineas(lineas.filter(l => l.id !== id));
    };

    const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const ref = e.target.value;
        const producto = catalogoProductos.find(p => p.referencia === ref);
        if (producto) {
            setNewLine({
                ...newLine,
                referenciaproducto: producto.referencia,
                descripcionproducto: producto.descripcion || '',
                unidadmedida: producto.unidadmedida || '',
                tipo: producto.tipo || '',
                clasificacion: producto.clasificacion || '',
                rotacion: producto.rotacion || ''
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedOT) return addNotification('warning', 'Debe seleccionar una Orden de Trabajo');
        if (!fechaNecesidad) return addNotification('warning', 'Debe seleccionar la Fecha de Necesidad');
        if (lineas.length === 0) return addNotification('warning', 'Debe agregar al menos una línea de producto');

        setIsLoading(true);

        const prefijoMap: Record<string, string> = {
            'materiales': 'MAT', 'paneleria': 'PAN', 'gases': 'GAS', 'importacion': 'IMP', 'epp': 'EPP'
        };
        const prefijo = prefijoMap[especialidadUrl || 'materiales'] || 'MAT';

        const payload = {
            prefijo_tipo: prefijo,
            ordentrabajo: selectedOT,
            cliente: headerDatos.cliente,
            uen: headerDatos.uen,
            fechanecesidad: fechaNecesidad,
            observaciones: observacionesGrles,
            lineas: lineas.map(l => ({
                especialidad: headerDatos.especialidad,
                subindice: headerDatos.subindice,
                centrocosto: headerDatos.centro_costo,
                subcentrocosto: headerDatos.subcentro,
                tipodestino: 'PROYECTO', // Valor por defecto o seleccionado en UI
                tipoproducto: 'INSUMO', // Valor por defecto
                referenciaproducto: l.referenciaproducto,
                descripcionproducto: l.descripcionproducto,
                cantidad: l.cantidad,
                unidadmedida: l.unidadmedida,
                tipo: l.tipo,
                clasificacion: l.clasificacion,
                rotacion: l.rotacion,
                observaciones: l.observaciones
            }))
        };

        try {
            await axios.post(`${API_BASE_URL}/erp/requisiciones/crear`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            addNotification('success', 'Requisición generada exitosamente en el ERP');
            navigate('/service-portal/requisiciones/mis-solicitudes');
        } catch (error) {
            console.error("Error guardando requisicion", error);
            addNotification('error', 'Ocurrió un error guardando la requisición');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" onClick={() => navigate('/service-portal/requisiciones/almacen')} icon={ArrowLeft} className="font-bold">
                    Volver a Especialidades
                </Button>
            </div>

            <div className="bg-[var(--color-surface)] rounded-3xl p-8 border border-[var(--color-border)] shadow-md">
                <Title variant="h4" weight="bold" className="mb-2">Crear Solicitud de Almacén: {especialidadUrl?.toUpperCase()}</Title>
                <Text variant="body2" color="text-secondary" className="mb-8">Complete los datos de la requisición y agregue las líneas necesarias.</Text>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* ENCABEZADO */}
                    <div className="space-y-4 p-6 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                        <Title variant="h6" className="text-[var(--color-primary)]">1. Información General (Encabezado)</Title>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Orden de Trabajo (OT) / OS"
                                name="ordentrabajo"
                                value={selectedOT}
                                onChange={(e) => setSelectedOT(e.target.value)}
                                required
                                options={[
                                    { value: '', label: '-- Seleccione OT --' },
                                    ...otsBase.map(ot => ({ value: ot.orden, label: `${ot.orden} - ${ot.cliente} (${ot.especialidad})` }))
                                ]}
                            />
                            <Input
                                label="Fecha Tentativa de Entrega (Necesidad)"
                                name="fechanecesidad"
                                type="date"
                                value={fechaNecesidad}
                                onChange={(e: any) => setFechaNecesidad(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                            <Input label="Cliente (Autocalculado)" name="cliente" value={headerDatos.cliente || ''} disabled />
                            <Input label="UEN (Autocalculado)" name="uen" value={headerDatos.uen || ''} disabled />
                        </div>
                        <Textarea
                            label="Observaciones Generales"
                            name="observaciones"
                            rows={2}
                            value={observacionesGrles}
                            onChange={(e: any) => setObservacionesGrles(e.target.value)}
                        />
                    </div>

                    {/* DETALLE (LÍNEAS) */}
                    <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <Title variant="h6" className="text-slate-700 dark:text-slate-300">2. Artículos Solicitados (Líneas)</Title>

                        {/* Buscador y Gestor de Línea Nueva */}
                        <div className="flex flex-col md:flex-row gap-4 items-end bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex-1">
                                <Select
                                    label="Referencia de Producto"
                                    name="producto_buscador"
                                    value={newLine.referenciaproducto}
                                    onChange={handleProductSelect}
                                    options={[
                                        { value: '', label: '-- Buscar Producto (Catálogo) --' },
                                        ...catalogoProductos.map(p => ({ value: p.referencia, label: `${p.referencia} - ${p.descripcion}` }))
                                    ]}
                                />
                            </div>
                            <div className="w-32">
                                <Input
                                    label="Cantidad"
                                    name="cantidad_linea"
                                    type="number"
                                    value={newLine.cantidad.toString()}
                                    onChange={(e: any) => setNewLine({ ...newLine, cantidad: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <Button type="button" variant="primary" onClick={handleAddLine} icon={Plus}>
                                    Añadir
                                </Button>
                            </div>
                        </div>

                        {/* Tabla de lineas */}
                        {lineas.length > 0 ? (
                            <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm text-left align-middle">
                                    <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">REF</th>
                                            <th className="px-4 py-3">Descripción</th>
                                            <th className="px-4 py-3 text-center">Cant.</th>
                                            <th className="px-4 py-3 text-center">UND</th>
                                            <th className="px-4 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {lineas.map(linea => (
                                            <tr key={linea.id} className="bg-white dark:bg-slate-900 border-b">
                                                <td className="px-4 py-3 font-medium">{linea.referenciaproducto}</td>
                                                <td className="px-4 py-3">{linea.descripcionproducto}</td>
                                                <td className="px-4 py-3 text-center font-bold">{linea.cantidad}</td>
                                                <td className="px-4 py-3 text-center">{linea.unidadmedida}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" className="text-red-500 hover:bg-red-50 p-2" onClick={() => handleRemoveLine(linea.id)}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 italic bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
                                No hay artículos en la solicitud. Utilice el buscador para añadir líneas.
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-[var(--color-border)] flex justify-end">
                        <Button type="submit" variant="primary" size="lg" icon={Save} disabled={isLoading || lineas.length === 0}>
                            {isLoading ? 'Guardando...' : 'Generar Requisición ERP'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AlmacenFormView;
