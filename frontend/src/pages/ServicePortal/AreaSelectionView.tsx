import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Title, Text, Button } from '../../components/atoms';
import { ActionCard } from '../../components/molecules';

// Imágenes para las áreas (reutilizando activos si existen o iconos representativos)
import imgSistemas from '../../assets/images/categories/Soporte Hardware.png';
import imgDesarrollo from '../../assets/images/categories/Nuevos desarrollos.png';
import imgMejora from '../../assets/images/categories/Soporte Mejoramiento.png';
import imgMisSolicitudes from '../../assets/images/categories/Mis Solicitudes.png';

interface AreaSelectionViewProps {
    onSelectArea: (area: 'sistemas' | 'desarrollo' | 'mejoramiento') => void;
    onConsultStatus: () => void;
    onBack: () => void;
}

const AreaSelectionView: React.FC<AreaSelectionViewProps> = ({ onSelectArea, onConsultStatus, onBack }) => {
    return (
        <div className="space-y-12 py-6">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Volver
                </Button>
            </div>

            <div className="text-center space-y-4">
                <div className="inline-block px-4 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-widest mb-2">
                    Gestión de Solicitudes TI
                </div>
                <Title variant="h2" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
                    ¿Qué deseas gestionar hoy?
                </Title>
                <Text variant="body1" color="text-secondary" className="max-w-2xl mx-auto font-medium">
                    Puedes crear un nuevo requerimiento o consultar el estado de tus solicitudes activas.
                </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <ActionCard
                    title="Soporte Sistemas"
                    description="Hardware, Software, Impresoras e Infraestructura tecnológica."
                    icon={<img src={imgSistemas} alt="Sistemas" className="w-full h-full object-contain p-2" />}
                    onClick={() => onSelectArea('sistemas')}
                />

                <ActionCard
                    title="Desarrollo Software"
                    description="Solicitud de nuevos módulos o funcionalidades en SOLID."
                    icon={<img src={imgDesarrollo} alt="Desarrollo" className="w-full h-full object-fill scale-x-150" />}
                    onClick={() => onSelectArea('desarrollo')}
                />

                <ActionCard
                    title="Mejoramiento"
                    description="Ajustes a herramientas de Excel y procesos existentes."
                    icon={<img src={imgMejora} alt="Mejoramiento" className="w-full h-full object-contain p-2" />}
                    onClick={() => onSelectArea('mejoramiento')}
                />

                <ActionCard
                    title="Mis Solicitudes"
                    description="Consulta el estado y progreso de tus tickets activos."
                    icon={<img src={imgMisSolicitudes} alt="Mis Solicitudes" className="w-full h-full object-contain p-2" />}
                    onClick={onConsultStatus}
                    variant="primary_light"
                />
            </div>
        </div>
    );
};

export default AreaSelectionView;
