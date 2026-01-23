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
    const soporteCats = categories.filter(c => c.section === 'soporte');
    const mejoramientoCats = categories.filter(c => c.section === 'mejoramiento');

    return (
        <div className="space-y-12 py-4">
            <Button
                variant="ghost"
                onClick={onBack}
                icon={ArrowLeft}
                className="font-bold p-0"
            >
                Volver al inicio
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Columna A: Soporte */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-4 border-b-2 border-[var(--color-primary)] pb-2">
                        <Title variant="h4" weight="bold" color="text-primary">Soporte Técnico</Title>
                        <div className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase">Hardware & Infra</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {soporteCats.map(cat => (
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

                {/* Columna B: Mejoramiento */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-4 border-b-2 border-emerald-500 pb-2">
                        <Title variant="h4" weight="bold" className="text-emerald-600">Mejoramiento & SOLID</Title>
                        <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">Software & Evolución</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {mejoramientoCats.map(cat => (
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
        </div>
    );
};

export default CategoryView;
