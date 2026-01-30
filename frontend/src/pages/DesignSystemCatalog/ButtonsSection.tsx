import React from 'react';
import { MaterialCard, Text, Button } from '../../components/atoms';
import { Search } from 'lucide-react';

const ButtonsSection: React.FC = () => {
    return (
        <div className="space-y-6">
            <MaterialCard className="p-6">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                    <Text variant="h5" weight="bold">Variantes</Text>
                    <Text variant="body2" color="text-secondary">Componente: {'<Button />'}</Text>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="erp">ERP Style</Button>
                </div>
            </MaterialCard>

            <MaterialCard className="p-6">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                    <Text variant="h5" weight="bold">Tamaños e Iconos</Text>
                </div>
                <div className="space-y-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <Button size="xs" variant="primary">Extra Small</Button>
                        <Button size="sm" variant="primary">Small</Button>
                        <Button size="md" variant="primary">Medium</Button>
                        <Button size="lg" variant="primary">Large</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Button icon={Search}>Con Icono</Button>
                        <Button icon={Search} iconPosition="right">Icono Derecha</Button>
                        <Button loading>Cargando</Button>
                        <Button disabled>Deshabilitado</Button>
                    </div>
                </div>
            </MaterialCard>
        </div>
    );
};

export default ButtonsSection;
