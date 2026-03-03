import { ActionCard } from '../../../components/molecules';
import { Title, Text } from '../../../components/atoms';

import { PhoneIcon as Headset, CalendarDaysIcon as CalendarDays, ClipboardDocumentListIcon as ClipboardList, BriefcaseIcon as Briefcase } from '@heroicons/react/24/outline';

interface DashboardViewProps {
    user: any;
    moduleStatus: Record<string, boolean>;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas' | 'requisiciones') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions = user?.permissions || [];

    // Lógica de visibilidad por tarjeta (RBAC + Estado Global)
    const canSeeSolicitudes = moduleStatus['mis_solicitudes'] !== false && (
        permissions.includes('mis_solicitudes') ||
        permissions.includes('sistemas') ||
        permissions.includes('mejoramiento') ||
        permissions.includes('desarrollo') ||
        permissions.includes('desarrollo') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeRequisiciones = moduleStatus['requisiciones'] !== false && (
        permissions.includes('requisiciones') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeReservaSalas = moduleStatus['reserva_salas'] !== false && (
        permissions.includes('reserva_salas') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeViaticos = moduleStatus['viaticos_gestion'] !== false && (
        permissions.includes('viaticos_gestion') ||
        user?.viaticante === true ||
        ['admin', 'director', 'manager'].includes(userRole)
    );

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {canSeeSolicitudes && (
                    <ActionCard
                        title="Gestión de Solicitudes TI"
                        description="Crea nuevos requerimientos o consulta el estado de tus tickets actuales."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-[var(--color-primary)]/10"><Headset className="w-12 h-12 text-[var(--color-primary)]" /></div>}
                        onClick={() => onNavigate('categories')}
                    />
                )}

                {canSeeReservaSalas && (
                    <ActionCard
                        title="Reserva de salas"
                        description="Reserva salas de reuniones y espacios para tu equipo."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-indigo-500/10"><CalendarDays className="w-12 h-12 text-indigo-500" /></div>}
                        onClick={() => onNavigate('reserva_salas')}
                    />
                )}

                {canSeeRequisiciones && (
                    <ActionCard
                        title="Sistema de Solicitudes"
                        description="Gestión de Requisiciones (Almacén, Suministros, Presupuesto)."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-[var(--warm-orange)]/10"><ClipboardList className="w-12 h-12 text-[var(--warm-orange)]" /></div>}
                        onClick={() => onNavigate('requisiciones')}
                    />
                )}

                {canSeeViaticos && (
                    <ActionCard
                        title="Gestión de Viáticos"
                        description="Reporte de gastos y consulta de estado de cuenta detallado."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-emerald-500/10"><Briefcase className="w-12 h-12 text-emerald-500" /></div>}
                        onClick={() => onNavigate('viaticos_gestion')}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardView;
