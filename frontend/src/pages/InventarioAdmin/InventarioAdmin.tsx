import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Icon, Input } from '../../components/atoms';
import { AlertCircle, Loader2, UserPlus, Search } from 'lucide-react';
import CargaMasiva from './components/CargaMasiva';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

interface InventoryConfig {
    ronda_activa: number;
    conteo_nombre?: string;
}

interface ERP_Empleado {
    nombre: string;
    cargo?: string;
    [key: string]: any;
}

const InventarioAdmin: React.FC = () => {
    // Carga Masiva
    const [file, setFile] = useState<File | null>(null);
    const [conteoName, setConteoName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; created: number; errors: string[] } | null>(null);

    // Asignaciones y Configuración
    const [rondaActiva, setRondaActiva] = useState(1);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [newAsig, setNewAsig] = useState({ cedula: '', nombre: '', cargo: '', bodega: '', bloque: '', estante: '', nivel: '' });
    const [isSearchingEmpleado, setIsSearchingEmpleado] = useState(false);

    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    useEffect(() => {
        fetchConfig();
    }, []);

    // Debounce para búsqueda de empleado ERP
    useEffect(() => {
        if (newAsig.cedula.length >= 6) {
            const timer = setTimeout(() => {
                buscarEmpleadoERP(newAsig.cedula);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [newAsig.cedula]);

    const fetchConfig = async () => {
        try {
            const response = await axios.get<InventoryConfig>(`${API_CONFIG.BASE_URL}/inventario/config`, { headers });
            if (response.data) {
                setRondaActiva(response.data.ronda_activa);
                setConteoName(response.data.conteo_nombre || '');
            }
        } catch (error) {
            console.error("Error fetching inventory config", error);
        }
    };

    const buscarEmpleadoERP = async (cedula: string) => {
        setIsSearchingEmpleado(true);
        try {
            const response = await axios.get<ERP_Empleado>(`${API_CONFIG.BASE_URL}/erp/empleado/${cedula}`, { headers });
            if (response.data) {
                setNewAsig(prev => ({
                    ...prev,
                    nombre: response.data.nombre || '',
                    cargo: response.data.cargo || ''
                }));
            }
        } catch (error) {
            console.warn("Empleado no encontrado o error en ERP");
        } finally {
            setIsSearchingEmpleado(false);
        }
    };

    const handleUpdateRonda = async (r: number) => {
        setIsUpdatingConfig(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/inventario/config`, {
                ronda_activa: r,
                conteo_nombre: conteoName
            }, { headers });
            setRondaActiva(r);
        } catch (error) {
            alert("Error al actualizar la ronda global");
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !conteoName) return;
        setIsUploading(true);
        setUploadResult(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conteo', conteoName);
        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/inventario/cargar-excel`, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });
            const data = response.data as any;
            setUploadResult({ success: data.exito, created: data.creados, errors: data.errores || [] });
            handleUpdateRonda(rondaActiva);
        } catch (error: any) {
            setUploadResult({ success: false, created: 0, errors: [error.response?.data?.detail || 'Error de conexión'] });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <Title variant="h4" weight="bold">Inventario Anual</Title>
                <Text variant="body2" color="text-secondary">Configuración de la toma física de inventario: carga masiva de datos y asignación de personal.</Text>
            </div>

            {/* Centro de Control de Inventario (Ronda + Carga) */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                {/* Carga masiva primero: herramientas + fila nombre/archivo */}
            <CargaMasiva 
                conteoName={conteoName}
                setConteoName={setConteoName}
                file={file}
                setFile={setFile}
                handleUpload={handleUpload}
                isUploading={isUploading}
                uploadResult={uploadResult}
                setUploadResult={setUploadResult}
                inventoryHeaderSlot={
                    <div className="mt-1">
                        <Text variant="caption" color="text-secondary" className="flex items-center gap-2">
                            {isUpdatingConfig && <Loader2 size={12} className="animate-spin text-primary-500" />}
                            Configura la ronda para operarios y sincroniza datos maestros.
                        </Text>
                    </div>
                }
                rondaSlot={
                    <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm w-fit">
                        {[1, 2, 3, 4].map(r => (
                            <Button
                                key={r}
                                onClick={() => handleUpdateRonda(r)}
                                disabled={isUpdatingConfig}
                                variant={rondaActiva === r ? 'primary' : 'ghost'}
                                className={`w-10 h-8 rounded-lg font-bold text-xs transition-all ${rondaActiva === r ? 'shadow-sm scale-105' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                            >
                                C{r}
                            </Button>
                        ))}
                    </div>
                }
            />
            </div>

            {/* Asignación de Personal Section */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                    <Title variant="h6" weight="bold">Asignación de Personal</Title>
                    <Text variant="caption" color="text-secondary">Asigna operarios a ubicaciones específicas del almacén para la toma física.</Text>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                    <div className="space-y-1 relative">
                        <Text variant="caption" weight="bold" color="text-secondary" className="text-[10px] uppercase tracking-wider ml-1 block">Cédula</Text>
                        <div className="relative">
                            <Input
                                value={newAsig.cedula}
                                onChange={(e) => setNewAsig(prev => ({ ...prev, cedula: e.target.value }))}
                                placeholder="Cédula"
                                className="rounded-lg h-9 text-sm pr-8"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {isSearchingEmpleado ? <Loader2 size={14} className="animate-spin text-primary-500" /> : <Search size={14} className="text-neutral-300" />}
                            </div>
                        </div>
                    </div>

                    {(['nombre', 'cargo', 'bodega', 'bloque', 'estante', 'nivel'] as const).map(field => (
                        <div key={field} className="space-y-1">
                            <Text variant="caption" weight="bold" color="text-secondary" className="text-[10px] uppercase tracking-wider ml-1 block">{field}</Text>
                            <Input
                                value={newAsig[field]}
                                onChange={(e) => setNewAsig(prev => ({ ...prev, [field]: e.target.value }))}
                                placeholder={field}
                                className="rounded-lg h-9 text-sm disabled:bg-neutral-50 dark:disabled:bg-neutral-800/20"
                                disabled={(field === 'nombre' || field === 'cargo') && isSearchingEmpleado}
                            />
                        </div>
                    ))}
                    <div className="flex items-end">
                        <Button variant="primary" className="h-9 rounded-lg w-full" icon={UserPlus}>
                            Asignar
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                    <Icon name={AlertCircle} size="sm" color="secondary" />
                    <Text variant="caption" color="text-secondary">
                        Ingresa la cédula y el sistema buscará automáticamente el nombre y cargo en el ERP.
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default InventarioAdmin;
