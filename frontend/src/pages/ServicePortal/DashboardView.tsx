import { ActionCard } from '../../components/molecules';
import { Title, Text } from '../../components/atoms';

import imgSolicitar from '../../assets/images/categories/Solicitar Servicio.png';
import imgMisSolicitudes from '../../assets/images/categories/Mis Solicitudes.png';

interface DashboardViewProps {
    onNavigate: (view: 'categories' | 'status') => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => (
    <div className="space-y-12 py-6">
        <div className="text-center space-y-2">
            <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                ¿En qué podemos ayudarte hoy?
            </Title>
            <Text variant="h6" color="text-secondary" weight="medium">Selecciona una de las opciones principales de gestión</Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ActionCard
                title="Solicitar Servicio"
                description="Crea un nuevo ticket de soporte, desarrollo o activos."
                icon={<img src={imgSolicitar} alt="Solicitar Servicio" className="w-full h-full object-contain p-2" />}
                onClick={() => onNavigate('categories')}
            />

            <ActionCard
                title="Mis Solicitudes"
                description="Consulta el estado y progreso de tus tickets activos."
                icon={<img src={imgMisSolicitudes} alt="Mis Solicitudes" className="w-full h-full object-contain p-2" />}
                onClick={() => onNavigate('status')}
                variant="primary_light"
            />
        </div>
    </div>
);

export default DashboardView;
