import { ActionCard } from '../../../components/molecules';
import { Title, Text } from '../../../components/atoms';

import imgSolicitar from '../../../assets/images/categories/Solicitar Servicio.png';
import imgGestionViaticos from '../../../assets/images/categories/gestion_viaticos.png';
import imgReunion from '../../../assets/images/categories/Reunion.png';

interface DashboardViewProps {
    user: any;
    onNavigate: (view: 'categories' | 'status' | 'legalizar_gastos' | 'viaticos_gestion' | 'viaticos_estado' | 'reserva_salas') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigate }) => {
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const viaticante = String(user?.viaticante || '').trim().toLowerCase();
    const canLegalize =
        viaticante === 'true' ||
        viaticante === 's' ||
        viaticante === '1' ||
        viaticante === 'si' ||
        userRole === 'admin' ||
        userRole === 'director' ||
        user?.permissions?.includes('legalizar-gastos');

    return (
        <div className="space-y-12 py-6">
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    ¿En qué podemos ayudarte hoy?
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
            </div>

            <div className={`grid grid-cols-1 ${canLegalize ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-8`}>
                <ActionCard
                    title="Gestión de Solicitudes TI"
                    description="Crea nuevos requerimientos o consulta el estado de tus tickets actuales."
                    icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('categories')}
                />

                {/* Tarjeta de salas desactivada temporalmente
                <ActionCard
                    title="Reserva de salas"
                    description="Reserva salas de reuniones y espacios para tu equipo."
                    icon={<img src={imgReunion} alt="Reserva de salas" className="w-full h-full object-contain p-2" />}
                    onClick={() => onNavigate('reserva_salas')}
                />
                */}

                {canLegalize && (
                    <ActionCard
                        title="Gestión de Viáticos"
                        description="Reporte de gastos y consulta de estado de cuenta detallado."
                        icon={<img src={imgGestionViaticos} alt="Gestión de Viáticos" className="w-full h-full object-contain p-2" />}
                        onClick={() => onNavigate('viaticos_gestion')}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardView;
