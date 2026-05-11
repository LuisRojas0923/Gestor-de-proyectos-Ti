import { ActionCard } from '../../../components/molecules';
import { Title, Text } from '../../../components/atoms';
import { FileText, Briefcase } from 'lucide-react';
import imgSolicitar from '../../../assets/images/categories/Solicitar Servicio.png';
import imgGestionViaticos from '../../../assets/images/categories/gestion_viaticos.png';
import imgReunion from '../../../assets/images/categories/Reunion.png';
import sistemasolicitudes from '../../../assets/images/categories/logistico.png';
import imgInventario from '../../../assets/images/categories/Consultar Reportes.png';

interface DashboardViewProps {
    user: any;
    moduleStatus: Record<string, boolean>;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas' | 'requisiciones' | 'inventario' | 'contabilidad' | 'gestion_actividades') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, moduleStatus, onNavigate }) => {
    const permissions: string[] = user?.permissions || [];

    const canSeeSolicitudes = moduleStatus['mis_solicitudes'] !== false && (
        permissions.includes('mis_solicitudes') ||
        permissions.includes('sistemas') ||
        permissions.includes('mejoramiento') ||
        permissions.includes('desarrollo')
    );

    const canSeeRequisiciones = moduleStatus['requisiciones'] !== false &&
        permissions.includes('requisiciones');

    const canSeeReservaSalas = moduleStatus['reserva_salas'] !== false &&
        permissions.includes('reserva_salas');

    const canSeeViaticos = moduleStatus['viaticos_gestion'] !== false && (
        permissions.includes('viaticos_gestion') ||
        user?.viaticante === true
    );

    const canSeeInventario = moduleStatus['inventario_2026'] !== false &&
        permissions.includes('inventario_2026');

    const canSeeContabilidad = moduleStatus['contabilidad'] !== false &&
        permissions.includes('gestion_humana');

    const canSeeGestionActividades =
        permissions.includes('developments') ||
        permissions.includes('validaciones_asignacion') ||
        permissions.includes('jerarquia_organizacional');

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
                        icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('categories')}
                    />
                )}

                {canSeeReservaSalas && (
                    <ActionCard
                        title="Reserva de salas"
                        description="Reserva salas de reuniones y espacios para tu equipo."
                        icon={<img src={imgReunion} alt="Reserva de salas" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('reserva_salas')}
                    />
                )}

                {canSeeRequisiciones && (
                    <ActionCard
                        title="Sistema de Solicitudes"
                        description="Gestión de Requisiciones (Almacén, Suministros, Presupuesto)."
                        icon={<img src={sistemasolicitudes} alt="Sistema de Solicitudes" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('requisiciones')}
                    />
                )}

                {canSeeViaticos && (
                    <ActionCard
                        title="Gestión de Viáticos"
                        description="Reporte de gastos y consulta de estado de cuenta detallado."
                        icon={<img src={imgGestionViaticos} alt="Gestión de Viáticos" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('viaticos_gestion')}
                    />
                )}

                {canSeeInventario && (
                    <ActionCard
                        title="Inventario 2026"
                        description="Toma física de inventario y carga masiva de conteos."
                        icon={<img src={imgInventario} alt="Inventario 2026" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('inventario')}
                    />
                )}

                {canSeeContabilidad && (
                    <ActionCard
                        title="Gestión Humana"
                        description="Certificados laborales, desprendibles de pago e información tributaria."
                        icon={<FileText className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('contabilidad')}
                    />
                )}

                {canSeeGestionActividades && (
                    <ActionCard
                        title="Gestión de Actividades"
                        description="Accede a desarrollos, aprobaciones y jerarquía organizacional."
                        icon={<Briefcase className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('gestion_actividades')}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardView;
