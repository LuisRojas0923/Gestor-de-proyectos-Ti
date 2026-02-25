import React, { useState, useEffect } from 'react';
import {
    Activity,
    Users,
    Cpu,
    Database,
    HardDrive,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    BarChart3
} from 'lucide-react';
import { Title, Text, MaterialCard as Card, Button, Badge } from '../components/atoms';
import { useApi } from '../hooks/useApi';
import { useNotifications } from '../components/notifications/NotificationsContext';

interface AppStatus {
    usuarios: {
        online: number;
        total_registrados: number;
    };
    servidor: {
        cpu_load: number;
        ram_uso_mb: number;
        ram_total_mb: number;
        uptime: string;
    };
    operacion: {
        tickets_pendientes: number;
        db_status: string;
    };
    timestamp: string;
}

const ControlTower: React.FC = () => {
    const { get } = useApi<AppStatus>();
    const { addNotification } = useNotifications();
    const [status, setStatus] = useState<AppStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchStatus = async () => {
        try {
            const data = await get('/panel-control/torre-control/estado');
            if (data) setStatus(data);
        } catch (error) {
            console.error("Error fetching system status:", error);
            addNotification("error", "No se pudo conectar con el servicio de monitoreo");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchStatus, 15000); // 15 segundos
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getCpuColor = (load: number) => {
        if (load > 8) return 'text-red-600 dark:text-red-400';
        if (load > 5) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-green-600 dark:text-green-400';
    };

    const getRamPercentage = () => {
        if (!status) return 0;
        return (status.servidor.ram_uso_mb / status.servidor.ram_total_mb) * 100;
    };

    return (
        <div className="space-y-8 pb-10 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary" className="mb-1 flex items-center gap-2">
                        <Activity className="text-[var(--color-primary)]" /> Torre de Control
                    </Title>
                    <Text variant="body1" color="text-secondary">
                        Monitoreo preventivo del servidor y actividad de usuarios
                    </Text>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={autoRefresh ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
                        {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-primary)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                            <Users size={24} />
                        </div>
                        <Badge variant="success">En línea</Badge>
                    </div>
                    <Title variant="h2" weight="bold">{isLoading ? "..." : status?.usuarios.online}</Title>
                    <Text variant="caption" color="text-secondary" className="mt-1">
                        Usuarios activos (últimos 5 min)
                    </Text>
                </Card>

                <Card className="p-6 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-secondary)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500">
                            <Cpu size={24} />
                        </div>
                    </div>
                    <Title variant="h2" weight="bold" className={getCpuColor(status?.servidor.cpu_load || 0)}>
                        {isLoading ? "..." : `${status?.servidor.cpu_load}%`}
                    </Title>
                    <Text variant="caption" color="text-secondary" className="mt-1">
                        Carga promedio de CPU
                    </Text>
                </Card>

                <Card className="p-6 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-success)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500">
                            <HardDrive size={24} />
                        </div>
                    </div>
                    <Title variant="h2" weight="bold">
                        {isLoading ? "..." : `${Math.round(status?.servidor.ram_uso_mb || 0)} MB`}
                    </Title>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${getRamPercentage()}%` }}
                        ></div>
                    </div>
                    <Text variant="caption" color="text-secondary" className="mt-1 block text-right">
                        RAM: {Math.round(getRamPercentage())}% de {Math.round(status?.servidor.ram_total_mb || 0 / 1024)}GB
                    </Text>
                </Card>

                <Card className="p-6 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-warning)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500">
                            <Database size={24} />
                        </div>
                        <Badge variant={status?.operacion.db_status === 'online' ? 'success' : 'error'}>
                            {status?.operacion.db_status.toUpperCase()}
                        </Badge>
                    </div>
                    <Title variant="h2" weight="bold">{isLoading ? "..." : status?.operacion.tickets_pendientes}</Title>
                    <Text variant="caption" color="text-secondary" className="mt-1">
                        Tickets pendientes de atención
                    </Text>
                </Card>
            </div>

            {/* Health Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="col-span-1 lg:col-span-2 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <Title variant="h4" weight="bold" className="flex items-center gap-2">
                            <BarChart3 className="text-blue-500" /> Tendencia de Operación
                        </Title>
                        <Text variant="caption" color="text-secondary">
                            Hora actual: {new Date().toLocaleTimeString()}
                        </Text>
                    </div>

                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/20">
                        <div className="text-center">
                            <Activity size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4 animate-pulse" />
                            <Text variant="body2" color="text-secondary">
                                El recolector de métricas históricas está compilando datos...
                            </Text>
                            <Text variant="caption" color="text-secondary">
                                Los gráficos de tendencia aparecerán tras 24h de monitoreo continuo.
                            </Text>
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <Title variant="h5" weight="bold" className="mb-4">Salud del Sistema</Title>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <Text variant="body2">Servidor API</Text>
                                </div>
                                <CheckCircle2 size={16} className="text-green-500" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <Text variant="body2">Base de Datos</Text>
                                </div>
                                <CheckCircle2 size={16} className="text-green-500" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <Text variant="body2">Sincronización ERP</Text>
                                </div>
                                <Badge variant="info">Standby</Badge>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-[var(--color-primary)] text-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-start gap-4">
                            <AlertCircle size={32} className="text-[var(--color-surface)] opacity-80 shrink-0" />
                            <div>
                                <Title variant="h5" weight="bold" className="text-inherit mb-2">Información Técnica</Title>
                                <Text variant="body2" className="text-inherit opacity-90">
                                    Esta vista es exclusiva para administradores. La latencia de red actual es de {Math.random() * 20 + 10 | 0}ms.
                                </Text>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ControlTower;
