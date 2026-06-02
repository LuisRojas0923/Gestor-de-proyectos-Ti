import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button, Title, Text, Badge, MaterialCard } from '../../../components/atoms';

export interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    form_type: 'support' | 'development' | 'asset' | 'change_control' | 'improvement_support';
    section: 'soporte' | 'mejoramiento';
    subCategories?: { id: string; name: string; description?: string; icon?: React.ReactNode; form_type?: string }[];
}

interface CategoryViewProps {
    categories: Category[];
    onSelect: (cat: Category) => void;
    onBack: () => void;
}

const CategoryView: React.FC<CategoryViewProps> = ({ categories, onSelect, onBack }) => {
    return (
        <div className="space-y-12 py-6">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Volver a las áreas
                </Button>
            </div>

            <div className="text-center space-y-4">
                <Badge
                    variant="primary"
                    size="lg"
                    className="mb-4 uppercase tracking-[0.2em] font-extrabold shadow-sm"
                >
                    Catálogo de Servicios
                </Badge>
                <Title variant="h2" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
                    Selecciona el servicio específico
                </Title>
                <Text variant="body1" color="text-secondary" className="max-w-2xl mx-auto font-medium">
                    Elige la categoría que mejor describa tu requerimiento ({categories.length} opciones disponibles).
                </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map(cat => (
                    <MaterialCard
                        key={cat.id}
                        onClick={() => onSelect(cat)}
                        hoverable={true}
                        className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full min-h-24 h-auto cursor-pointer group"
                    >
                        <div className="flex items-center gap-4 w-full h-full">
                            <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0 text-[var(--color-primary)]">
                                <div className="w-full h-full flex items-center justify-center [&>svg]:w-8 [&>svg]:h-8">
                                    {cat.icon}
                                </div>
                            </div>
                            <div className="flex-grow min-w-0">
                                <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                                    {cat.name}
                                </Title>
                                <Text variant="caption" color="text-secondary" className="block mt-1 font-medium line-clamp-2">
                                    {cat.description}
                                </Text>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                    </MaterialCard>
                ))}
            </div>
        </div>
    );
};

export default CategoryView;
