import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Title } from '../../components/atoms';
import { ServiceCard } from '../../components/molecules';

export interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    form_type: 'support' | 'development' | 'asset' | 'change_control';
    section: 'soporte' | 'mejoramiento';
}

interface CategoryViewProps {
    categories: Category[];
    onSelect: (cat: Category) => void;
    onBack: () => void;
}

const CategoryView: React.FC<CategoryViewProps> = ({ categories, onSelect, onBack }) => {
    return (
        <div className="space-y-12 py-4">
            <Button
                variant="ghost"
                onClick={onBack}
                icon={ArrowLeft}
                className="font-bold p-0"
            >
                Volver a las áreas
            </Button>

            <div className="space-y-8">
                <div className="flex items-center space-x-4 border-b-2 border-[var(--color-primary)] pb-4">
                    <Title variant="h3" weight="bold" className="text-[var(--color-primary)]">
                        Selecciona el servicio específico
                    </Title>
                    <div className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase">
                        {categories.length} opciones disponibles
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map(cat => (
                        <ServiceCard
                            key={cat.id}
                            title={cat.name}
                            description={cat.description}
                            icon={cat.icon}
                            onClick={() => onSelect(cat)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryView;
