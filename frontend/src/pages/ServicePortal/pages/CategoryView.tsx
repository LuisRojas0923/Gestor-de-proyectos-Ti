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
            {/* Header Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Selecciona el servicio específico
                        </Title>
                    </div>
                </div>
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
