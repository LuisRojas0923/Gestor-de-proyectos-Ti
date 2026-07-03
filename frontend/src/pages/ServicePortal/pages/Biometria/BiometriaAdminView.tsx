import React, { useState, useEffect, useMemo } from 'react';
import { Title, Text, Button, MaterialCard, Input, Badge, Spinner } from '../../../../components/atoms';
import { DataTable } from '../../../../components/molecules/DataTable';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import axios from 'axios';
import { MapPin, Plus, Trash2, CheckCircle, XCircle, Map, UserCheck, Folder, ArrowLeft } from 'lucide-react';

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

    interface UserFolder {
        userId: string;
        userName: string;
        userCedula: string;
        recordsCount: number;
        lastActivity: string;
        records: Asistencia[];
    }

    // States for Asistencias
    const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
    const [isLoadingAsistencias, setIsLoadingAsistencias] = useState(false);
    const [searchCedula, setSearchCedula] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const userFolders = useMemo<UserFolder[]>(() => {
        const groups: { [key: string]: UserFolder } = {};
        asistencias.forEach(a => {
            const key = a.userId;
            if (!groups[key]) {
                groups[key] = {
                    userId: a.userId,
                    userName: (a as any).userName || 'Usuario Desconocido',
                    userCedula: (a as any).userCedula || a.userId,
                    recordsCount: 0,
                    lastActivity: a.timestamp,
                    records: []
                };
            }
            groups[key].records.push(a);
            groups[key].recordsCount += 1;
            if (new Date(a.timestamp) > new Date(groups[key].lastActivity)) {
                groups[key].lastActivity = a.timestamp;
            }
        });
        return Object.values(groups).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }, [asistencias]);

    const filteredFolders = useMemo(() => {
        if (!searchCedula.trim()) return userFolders;
        const q = searchCedula.toLowerCase().trim();
        return userFolders.filter(f => 
            f.userName.toLowerCase().includes(q) || 
            f.userCedula.toLowerCase().includes(q) ||
            f.userId.toLowerCase().includes(q)
        );
    }, [userFolders, searchCedula]);

    const selectedFolder = useMemo(() => {
        if (!selectedUserId) return null;
        return userFolders.find(f => f.userId === selectedUserId) || null;
    }, [userFolders, selectedUserId]);

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

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            addNotification('error', 'Tu navegador no soporta geolocalización');
            return;
        }
        
        addNotification('info', 'Obteniendo ubicación...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setNewZona(prev => ({
                    ...prev,
                    latitud: position.coords.latitude.toString(),
                    longitud: position.coords.longitude.toString()
                }));
                addNotification('success', 'Ubicación obtenida correctamente');
            },
            (error) => {
                console.error("Error getting location", error);
                addNotification('error', 'No se pudo obtener la ubicación. Verifica los permisos.');
            },
            { enableHighAccuracy: true }
        );
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
            render: (row: any) => <Text className="font-medium">{row.userName || row.userId}</Text>
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
                <Button
                    variant="custom"
                    onClick={() => setActiveTab('asistencias')}
                    icon={UserCheck}
                    className={`px-4 py-2 border-b-2 transition-colors rounded-none ${
                        activeTab === 'asistencias'
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    Historial de Asistencias
                </Button>
                <Button
                    variant="custom"
                    onClick={() => setActiveTab('zonas')}
                    icon={MapPin}
                    className={`px-4 py-2 border-b-2 transition-colors rounded-none ${
                        activeTab === 'zonas'
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    Gestión de Zonas
                </Button>
            </div>

            {/* Tab Content: Asistencias */}
            {activeTab === 'asistencias' && (
                <div className="space-y-4">
                    {selectedUserId ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={ArrowLeft}
                                    onClick={() => setSelectedUserId(null)}
                                >
                                    Volver
                                </Button>
                                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-neutral-400">
                                    <Folder className="w-4 h-4 text-blue-500" />
                                    <Text className="font-semibold text-slate-700 dark:text-slate-200">
                                        {selectedFolder?.userName} (C.C. {selectedFolder?.userCedula})
                                    </Text>
                                </div>
                            </div>
                            <MaterialCard className="p-4 md:p-6 overflow-hidden">
                                {isLoadingAsistencias ? (
                                    <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                                ) : (
                                    <DataTable 
                                        data={selectedFolder?.records || []} 
                                        columns={columnsAsistencias} 
                                        keyExtractor={(row) => row.id.toString()}
                                    />
                                )}
                            </MaterialCard>
                        </div>
                    ) : (
                        <MaterialCard className="p-4 md:p-6">
                            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="max-w-xs w-full">
                                    <Input 
                                        placeholder="Buscar por nombre o cédula..." 
                                        value={searchCedula}
                                        onChange={(e) => setSearchCedula(e.target.value)}
                                    />
                                </div>
                                <Text variant="caption" color="text-secondary" className="font-semibold">
                                    Total: {filteredFolders.length} carpetas de empleados
                                </Text>
                            </div>
                            
                            {isLoadingAsistencias ? (
                                <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                            ) : filteredFolders.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-lg">
                                    <Folder className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                    <Text color="text-secondary" className="font-medium">
                                        No se encontraron carpetas de asistencias.
                                    </Text>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredFolders.map(folder => (
                                        <div 
                                            key={folder.userId} 
                                            onClick={() => setSelectedUserId(folder.userId)}
                                            className="p-4 hover:shadow-md transition-all cursor-pointer border border-slate-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl bg-slate-50/50 dark:bg-neutral-800/40 flex flex-col justify-between group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                                    <Folder className="w-8 h-8 fill-blue-500/10" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Title variant="subtitle2" weight="bold" className="truncate text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {folder.userName}
                                                    </Title>
                                                    <Text variant="caption" color="text-secondary" className="block truncate font-medium">
                                                        C.C. {folder.userCedula}
                                                    </Text>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-850 flex justify-between items-center text-xs text-slate-400">
                                                <Badge variant="info" className="text-[10px]">
                                                    {folder.recordsCount} {folder.recordsCount === 1 ? 'registro' : 'registros'}
                                                </Badge>
                                                <Text variant="caption" className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">
                                                    Último: {new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(folder.lastActivity))}
                                                </Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </MaterialCard>
                    )}
                </div>
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
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    icon={MapPin}
                                    onClick={handleGetCurrentLocation}
                                    className="w-full text-sm"
                                >
                                    Usar mi ubicación actual
                                </Button>
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
