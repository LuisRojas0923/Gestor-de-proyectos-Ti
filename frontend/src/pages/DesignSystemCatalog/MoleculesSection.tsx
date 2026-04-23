import React from 'react';
import { MaterialCard, Title, Subtitle, Text, Button } from '../../components/atoms';
import {
    ActivityCard,
    // ActivityForm, // Note: mentioned in original but unused directly in render except as text descriptions
    // DevelopmentEditModal,
    // DevelopmentFlowCompact,
    // DevelopmentTimelineCompact,
    // IndicatorsHeader,
    // KpiDetailsModal,
    MaterialMetricCard,
    MaterialSearchBar,
    MetricCard,
    ProviderSelector,
    FilterDropdown
} from '../../components/molecules';
import ApiDebug from '../../components/molecules/ApiDebug';
import { CheckCircle, Star } from 'lucide-react';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const MoleculesSection: React.FC = () => {
    const { addNotification } = useNotifications();
    const [demoOpen, setDemoOpen] = React.useState(false);
    const [demoSearch, setDemoSearch] = React.useState('');
    const [demoAnchor, setDemoAnchor] = React.useState<{ top: number, left: number, width: number } | null>(null);

    return (
        <div className="lg:col-span-3 space-y-6 animate-in slide-in-from-right-4 duration-500">
            <MaterialCard className="p-8">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-8">
                    <Title variant="h4">Moléculas del Sistema</Title>
                    <Subtitle variant="body1">Componentes compuestos que combinan átomos para funcionalidad específica.</Subtitle>
                </div>

                <div className="space-y-8">
                    {/* MetricCard */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">MetricCard</Title>
                        <Text color="text-secondary" className="mb-4">Tarjeta para mostrar métricas con indicador de cambio.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <MetricCard
                                title="Ejemplo Métrica"
                                value={42}
                                change={{ value: 5, type: 'increase' }}
                                icon={CheckCircle}
                                color="blue"
                            />
                        </div>
                    </div>

                    {/* MaterialMetricCard */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">MaterialMetricCard</Title>
                        <Text color="text-secondary" className="mb-4">Versión Material Design de tarjeta de métricas.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <MaterialMetricCard
                                title="Métrica Material"
                                value={128}
                                subtitle="Actualizado hoy"
                                icon={Star}
                                color="primary"
                            />
                        </div>
                    </div>

                    {/* MaterialSearchBar */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">MaterialSearchBar</Title>
                        <Text color="text-secondary" className="mb-4">Barra de búsqueda con estilo Material Design.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <MaterialSearchBar
                                value=""
                                onChange={() => { }}
                                placeholder="Buscar en el sistema..."
                            />
                        </div>
                    </div>

                    {/* ActivityCard */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">ActivityCard</Title>
                        <Text color="text-secondary" className="mb-4">Tarjeta para mostrar actividades de bitácora.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <ActivityCard
                                activity={{
                                    id: 1,
                                    development_id: 1,
                                    stage_id: 1,
                                    stage_name: 'Desarrollo',
                                    activity_type: 'seguimiento',
                                    actor_type: 'equipo_interno',
                                    status: 'pendiente',
                                    start_date: '2026-01-20',
                                    notes: 'Actividad de ejemplo',
                                    created_at: '2026-01-20'
                                }}
                                darkMode={false}
                                onEdit={() => addNotification('info', 'Editar actividad')}
                                onDelete={() => addNotification('warning', 'Eliminar actividad')}
                            />
                        </div>
                    </div>

                    {/* ActivityForm */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">ActivityForm</Title>
                        <Text color="text-secondary" className="mb-4">Formulario para crear/editar actividades en fases.</Text>
                        <Text variant="caption" color="text-secondary">Este componente requiere props específicas de desarrollo. Ver uso en PhasesView.</Text>
                    </div>

                    {/* DevelopmentFlowCompact */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">DevelopmentFlowCompact</Title>
                        <Text color="text-secondary" className="mb-4">Vista compacta del flujo de desarrollo con etapas.</Text>
                        <Text variant="caption" color="text-secondary">Requiere datos de desarrollo. Ver uso en Dashboard.</Text>
                    </div>

                    {/* DevelopmentTimelineCompact */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">DevelopmentTimelineCompact</Title>
                        <Text color="text-secondary" className="mb-4">Timeline compacto de actividades del desarrollo.</Text>
                        <Text variant="caption" color="text-secondary">Requiere datos de desarrollo. Ver uso en Dashboard.</Text>
                    </div>

                    {/* DevelopmentEditModal */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">DevelopmentEditModal</Title>
                        <Text color="text-secondary" className="mb-4">Modal para editar información de un desarrollo.</Text>
                        <Text variant="caption" color="text-secondary">Requiere props de desarrollo. Ver uso en DevelopmentDetail.</Text>
                    </div>

                    {/* IndicatorsHeader */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">IndicatorsHeader</Title>
                        <Text color="text-secondary" className="mb-4">Encabezado para la página de indicadores con filtros.</Text>
                        <Text variant="caption" color="text-secondary">Ver uso en Indicators page.</Text>
                    </div>

                    {/* KpiDetailsModal */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">KpiDetailsModal</Title>
                        <Text color="text-secondary" className="mb-4">Modal para ver detalles de KPIs específicos.</Text>
                        <Text variant="caption" color="text-secondary">Requiere datos de KPI. Ver uso en Indicators.</Text>
                    </div>

                    {/* ProviderSelector */}
                    <div className="border-b pb-6">
                        <Title variant="h6" className="mb-2">ProviderSelector</Title>
                        <Text color="text-secondary" className="mb-4">Selector de proveedores para filtrado.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <ProviderSelector
                                availableProviders={['Proveedor A', 'Proveedor B', 'Proveedor C']}
                                selectedProvider=""
                                loading={false}
                                onProviderChange={() => { }}
                            />
                        </div>
                    </div>

                    {/* ApiDebug */}
                    <div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg max-h-40 overflow-auto">
                            <ApiDebug />
                        </div>
                    </div>

                    {/* FilterDropdown */}
                    <div className="pt-6">
                        <Title variant="h6" className="mb-2">FilterDropdown</Title>
                        <Text color="text-secondary" className="mb-4">Portal de filtrado avanzado con búsqueda y selección múltiple, diseñado bajo el estándar de catálogo.</Text>
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-8 rounded-lg flex flex-col items-center gap-4">
                            <Button 
                                variant="primary"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDemoAnchor(rect);
                                    setDemoOpen(true);
                                }}
                            >
                                Probar FilterDropdown
                            </Button>
                            
                            <FilterDropdown
                                isOpen={demoOpen}
                                onClose={() => setDemoOpen(false)}
                                anchorRect={demoAnchor}
                                title="Filtro de Ejemplo"
                                type="categorical"
                                searchTerm={demoSearch}
                                onSearchChange={setDemoSearch}
                                onSelectAll={() => addNotification('info', 'Seleccionar todos clickeado')}
                                isAllSelected={false}
                                options={[
                                    { value: '1', label: 'Item de ejemplo A' },
                                    { value: '2', label: 'Item de ejemplo B' },
                                    { value: '3', label: 'Item de ejemplo C' },
                                    { value: '', label: '(Vacío)' }
                                ]}
                                tempValue={['1', '2']}
                                onToggleOption={(val) => addNotification('success', `Toggle: ${val}`)}
                                onApply={() => {
                                    addNotification('info', 'Filtros aplicados');
                                    setDemoOpen(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </MaterialCard>
        </div>
    );
};

export default MoleculesSection;
