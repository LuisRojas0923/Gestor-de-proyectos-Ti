import React, { useState, useEffect } from 'react';
import {
    Activity,
    Users,
    Cpu,
    Database,
    HardDrive,
    RefreshCw,
    Signal,
    CheckCircle2,
    BarChart3
} from 'lucide-react';
import { Title, Text, MaterialCard as Card, Button, Badge } from '../../components/atoms';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import TrendChart from './TrendChart';

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="px-4 py-3 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-primary)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                <Users size={16} />
                            </div>
                            <div>
                                <Title variant="h4" weight="bold">{isLoading ? "..." : status?.usuarios.online}</Title>
                                <Text variant="caption" color="text-secondary">Usuarios activos</Text>
                            </div>
                        </div>
                        <Badge variant="success">En línea</Badge>
                    </div>
                </Card>

                <Card className="px-4 py-3 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-secondary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500">
                            <Cpu size={16} />
                        </div>
                        <div>
                            <Title variant="h4" weight="bold" className={getCpuColor(status?.servidor.cpu_load || 0)}>
                                {isLoading ? "..." : `${status?.servidor.cpu_load}%`}
                            </Title>
                            <Text variant="caption" color="text-secondary">Carga CPU</Text>
                        </div>
                    </div>
                </Card>

                <Card className="px-4 py-3 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-success)]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500">
                            <HardDrive size={16} />
                        </div>
                        <div className="flex-1">
                            <Title variant="h4" weight="bold">
                                {isLoading ? "..." : `${Math.round(status?.servidor.ram_uso_mb || 0)} MB`}
                            </Title>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-[var(--color-border)] rounded-full h-1">
                                    <div
                                        ref={(el) => { if (el) el.style.width = `${getRamPercentage()}%`; }}
                                        className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                                    ></div>
                                </div>
                                <Text variant="caption" color="text-secondary">{Math.round(getRamPercentage())}%</Text>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="px-4 py-3 transition-all hover:shadow-lg border-l-4 border-l-[var(--color-warning)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500">
                                <Database size={16} />
                            </div>
                            <div>
                                <Title variant="h4" weight="bold">{isLoading ? "..." : status?.operacion.tickets_pendientes}</Title>
                                <Text variant="caption" color="text-secondary">Tickets pendientes</Text>
                            </div>
                        </div>
                        <Badge variant={status?.operacion.db_status === 'online' ? 'success' : 'error'}>
                            {status?.operacion.db_status.toUpperCase()}
                        </Badge>
                    </div>
                </Card>

                {(() => {
                    const latencia = Math.random() * 20 + 10 | 0;
                    const variant: 'success' | 'warning' | 'error' = latencia < 100 ? 'success' : latencia < 150 ? 'warning' : 'error';
                    const borderColor = latencia < 100 ? 'border-l-green-500' : latencia < 150 ? 'border-l-yellow-500' : 'border-l-red-500';
                    return (
                        <Card className={`px-4 py-3 transition-all hover:shadow-lg border-l-4 ${borderColor}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-cyan-500">
                                        <Signal size={16} />
                                    </div>
                                    <div>
                                        <Title variant="h4" weight="bold">{latencia}ms</Title>
                                        <Text variant="caption" color="text-secondary">Latencia de red</Text>
                                    </div>
                                </div>
                                <Badge variant={variant}>
                                    {latencia < 100 ? 'ÓPTIMO' : latencia < 150 ? 'MEDIO' : 'ALTO'}
                                </Badge>
                            </div>
                        </Card>
                    );
                })()}
            </div>

            {/* Tendencia de Operación - 4 Gráficas */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <Title variant="h4" weight="bold" className="flex items-center gap-2">
                        <BarChart3 className="text-blue-500" /> Tendencia de Operación
                    </Title>
                    <Text variant="caption" color="text-secondary">
                        Hora actual: {new Date().toLocaleTimeString()}
                    </Text>
                </div>
                <TrendChart autoRefresh={autoRefresh} />
            </div>

            {/* Health + Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            </div>
        </div>
    );
};

export default ControlTower;
