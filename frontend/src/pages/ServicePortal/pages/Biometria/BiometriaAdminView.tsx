import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, MaterialCard, Input, Badge, Spinner } from '../../../../components/atoms';
import { DataTable } from '../../../../components/molecules/DataTable';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import axios from 'axios';
import { MapPin, Plus, Trash2, CheckCircle, XCircle, Map, UserCheck } from 'lucide-react';

interface Zona {
    id: number;
    nombre: string;
    latitud: number;
    longitud: number;
    radio: number;
}

interface Asistencia {
    id: number;
    userId: string;
    zoneId: string | null;
    isMatch: boolean;
    confidence: number;
    location: {
        latitude: number;
        longitude: number;
    };
    timestamp: string;
    evidenciaUrl: string | null;
}

const BiometriaAdminView: React.FC = () => {
    const { addNotification } = useNotifications();
    
    const [activeTab, setActiveTab] = useState<'zonas' | 'asistencias'>('asistencias');
    
    // States for Zonas
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [isLoadingZonas, setIsLoadingZonas] = useState(false);
    const [newZona, setNewZona] = useState({ nombre: '', latitud: '', longitud: '', radio: '100' });
    const [isCreating, setIsCreating] = useState(false);

    // States for Asistencias
    const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
    const [isLoadingAsistencias, setIsLoadingAsistencias] = useState(false);

    const fetchZonas = async () => {
        setIsLoadingZonas(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setZonas(res.data);
        } catch (error) {
            console.error("Error loading zonas", error);
            addNotification('error', 'Error al cargar las zonas');
        } finally {
            setIsLoadingZonas(false);
        }
    };

    const fetchAsistencias = async () => {
        setIsLoadingAsistencias(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ASISTENCIAS}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setAsistencias(res.data);
        } catch (error) {
            console.error("Error loading asistencias", error);
            addNotification('error', 'Error al cargar las asistencias');
        } finally {
            setIsLoadingAsistencias(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'zonas') {
            fetchZonas();
        } else {
            fetchAsistencias();
        }
    }, [activeTab]);

    const handleCreateZona = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, {
                nombre: newZona.nombre,
                latitud: parseFloat(newZona.latitud),
                longitud: parseFloat(newZona.longitud),
                radio: parseFloat(newZona.radio)
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            addNotification('success', 'Zona creada exitosamente');
            setNewZona({ nombre: '', latitud: '', longitud: '', radio: '100' });
            fetchZonas();
        } catch (error) {
            console.error("Error creating zona", error);
            addNotification('error', 'Error al crear la zona');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteZona = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta zona?')) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            addNotification('success', 'Zona eliminada');
            fetchZonas();
        } catch (error) {
            console.error("Error deleting zona", error);
            addNotification('error', 'Error al eliminar la zona');
        }
    };

    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const columnsAsistencias = useMemo(() => [
        {
            key: 'timestamp',
            label: 'Fecha',
            render: (row: any) => {
                const val = row.timestamp;
                if (!val) return 'N/A';
                return new Intl.DateTimeFormat('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(new Date(val));
            }
        },
        {
            key: 'userId',
            label: 'Usuario',
            render: (row: any) => <Text className="font-medium">{row.userId}</Text>
        },
        {
            key: 'isMatch',
            label: 'Match',
            render: (row: any) => {
                return row.isMatch ? (
                    <Badge variant="success">Exitoso</Badge>
                ) : (
                    <Badge variant="error">Fallido</Badge>
                );
            }
        },
        {
            key: 'confidence',
            label: 'Confianza',
            render: (row: any) => `${row.confidence}%`
        },
        {
            key: 'evidencia',
            label: 'Evidencia',
            render: (row: any) => {
                if (!row.evidenciaUrl) return <Text color="text-secondary">Sin foto</Text>;
                return (
                    <a href={`${API_CONFIG.BASE_URL.replace('/api/v2', '')}${row.evidenciaUrl}`} target="_blank" rel="noreferrer">
                        <img 
                            src={`${API_CONFIG.BASE_URL.replace('/api/v2', '')}${row.evidenciaUrl}`} 
                            alt="Evidencia" 
                            className="w-10 h-10 object-cover rounded-md border border-slate-200" 
                        />
                    </a>
                );
            }
        },
        {
            key: 'location',
            label: 'Ubicación',
            render: (row: any) => {
                const loc = row.location;
                if (!loc || (loc.latitude === 0 && loc.longitude === 0)) {
                    return <Text color="text-secondary">Sin ubicación</Text>;
                }
                return (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={Map} 
                        onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}
                    >
                        Ver en Mapa
                    </Button>
                );
            }
        }
    ], []);

    return (
        <div className="flex-1 w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Title variant="h3" weight="bold" className="text-slate-800 dark:text-white">
                        Administración de Biometría
                    </Title>
                    <Text variant="body1" color="text-secondary">
                        Gestiona las zonas de geocerca y audita las asistencias.
                    </Text>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200 dark:border-neutral-700">
                <button
                    onClick={() => setActiveTab('asistencias')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'asistencias'
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Historial de Asistencias
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('zonas')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'zonas'
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Gestión de Zonas
                    </div>
                </button>
            </div>

            {/* Tab Content: Asistencias */}
            {activeTab === 'asistencias' && (
                <MaterialCard className="p-4 md:p-6 overflow-hidden">
                    {isLoadingAsistencias ? (
                        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                    ) : (
                        <DataTable 
                            data={asistencias} 
                            columns={columnsAsistencias} 
                            keyExtractor={(row) => row.id.toString()}
                        />
                    )}
                </MaterialCard>
            )}

            {/* Tab Content: Zonas */}
            {activeTab === 'zonas' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <MaterialCard className="p-4 md:p-6 sticky top-6">
                            <Title variant="h6" className="mb-4">Nueva Zona</Title>
                            <form onSubmit={handleCreateZona} className="space-y-4">
                                <Input 
                                    label="Nombre de la zona"
                                    placeholder="Ej. Sede Principal"
                                    value={newZona.nombre}
                                    onChange={(e) => setNewZona({...newZona, nombre: e.target.value})}
                                    required
                                />
                                <Input 
                                    label="Latitud"
                                    placeholder="Ej. 4.6097"
                                    type="number"
                                    step="any"
                                    value={newZona.latitud}
                                    onChange={(e) => setNewZona({...newZona, latitud: e.target.value})}
                                    required
                                />
                                <Input 
                                    label="Longitud"
                                    placeholder="Ej. -74.0817"
                                    type="number"
                                    step="any"
                                    value={newZona.longitud}
                                    onChange={(e) => setNewZona({...newZona, longitud: e.target.value})}
                                    required
                                />
                                <Input 
                                    label="Radio (metros)"
                                    placeholder="100"
                                    type="number"
                                    value={newZona.radio}
                                    onChange={(e) => setNewZona({...newZona, radio: e.target.value})}
                                    required
                                />
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    icon={Plus} 
                                    fullWidth 
                                    disabled={isCreating}
                                >
                                    Crear Zona
                                </Button>
                            </form>
                        </MaterialCard>
                    </div>

                    <div className="md:col-span-2">
                        <MaterialCard className="p-4 md:p-6">
                            <Title variant="h6" className="mb-4">Zonas Registradas</Title>
                            {isLoadingZonas ? (
                                <div className="flex justify-center p-8"><Spinner size="md" /></div>
                            ) : zonas.length === 0 ? (
                                <Text className="p-8 text-center" color="text-secondary">No hay zonas configuradas.</Text>
                            ) : (
                                <div className="space-y-3">
                                    {zonas.map(zona => (
                                        <div key={zona.id} className="flex justify-between items-center p-4 border border-slate-200 dark:border-neutral-700 rounded-lg hover:border-slate-300 transition-colors bg-slate-50 dark:bg-neutral-800/50">
                                            <div>
                                                <Title variant="subtitle2" weight="bold">{zona.nombre}</Title>
                                                <Text variant="body2" color="text-secondary">
                                                    Lat: {zona.latitud} | Lng: {zona.longitud} | Radio: {zona.radio}m
                                                </Text>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    icon={Map} 
                                                    onClick={() => openGoogleMaps(zona.latitud, zona.longitud)}
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                                                    icon={Trash2} 
                                                    onClick={() => handleDeleteZona(zona.id)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </MaterialCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiometriaAdminView;
