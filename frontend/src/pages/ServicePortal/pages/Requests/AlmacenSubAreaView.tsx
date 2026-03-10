import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Zap, Grid, Globe, Shield } from 'lucide-react';
import { Button, Title, Text } from '../../../../components/atoms';
import { ActionCard } from '../../../../components/molecules';
import { motion } from 'framer-motion';

const AlmacenSubAreaView: React.FC = () => {
    const navigate = useNavigate();

    const handleSelectSpecialty = (specialty: string) => {
        // Redirigir al formulario principal del almacén pre-cargando la especialidad
        navigate(`/service-portal/requisiciones/almacen/crear/${specialty}`);
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" onClick={() => navigate('/service-portal/requisiciones')} icon={ArrowLeft} className="font-bold">
                    Volver a Áreas
                </Button>
                <div>
                    <Title variant="h4" weight="bold">Requisiciones de Almacén</Title>
                    <Text variant="body2" color="text-secondary">Selecciona el tipo de material o servicio a solicitar</Text>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <ActionCard
                    title="Materiales"
                    description="Solicitud general de insumos y materiales de almacén."
                    icon={<Package className="w-12 h-12 text-blue-500 mx-auto" />}
                    onClick={() => handleSelectSpecialty('materiales')}
                />
                <ActionCard
                    title="Gases"
                    description="Solicitud de cilindros y recargas de gases industriales."
                    icon={<Zap className="w-12 h-12 text-yellow-500 mx-auto" />}
                    onClick={() => handleSelectSpecialty('gases')}
                />
                <ActionCard
                    title="Panelería"
                    description="Suministro de paneles para obra."
                    icon={<Grid className="w-12 h-12 text-slate-500 mx-auto" />}
                    onClick={() => handleSelectSpecialty('paneleria')}
                />
                <ActionCard
                    title="Importación"
                    description="Requisición de materiales importados (Comex)."
                    icon={<Globe className="w-12 h-12 text-indigo-500 mx-auto" />}
                    onClick={() => handleSelectSpecialty('importacion')}
                />
                <ActionCard
                    title="Dotación y EPP"
                    description="Elementos de Protección Personal e indumentaria."
                    icon={<Shield className="w-12 h-12 text-emerald-500 mx-auto" />}
                    onClick={() => handleSelectSpecialty('epp')}
                />
            </motion.div>
        </div>
    );
};

export default AlmacenSubAreaView;
