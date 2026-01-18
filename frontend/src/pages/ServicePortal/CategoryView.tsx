import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Title } from '../../components/atoms';
import { ServiceCard } from '../../components/molecules';

export interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    form_type: 'support' | 'development' | 'asset';
}

interface CategoryViewProps {
    categories: Category[];
    onSelect: (cat: Category) => void;
    onBack: () => void;
}

const CategoryView: React.FC<CategoryViewProps> = ({ categories, onSelect, onBack }) => (
    <div className="space-y-8 py-4">
        <Button
            variant="ghost"
            onClick={onBack}
            icon={ArrowLeft}
            className="font-bold p-0"
        >
            Volver al inicio
        </Button>
        <Title variant="h4" weight="bold" color="text-primary">Catálogo de Servicios</Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
);

export default CategoryView;
