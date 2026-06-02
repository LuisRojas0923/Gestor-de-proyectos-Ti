import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Title, Text, Icon, MaterialCard } from '../atoms';

export interface ServiceCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    title,
    description,
    icon,
    onClick,
    className = ''
}) => {
    return (
        <MaterialCard
            onClick={onClick}
            hoverable={true}
            className={`p-4 text-left w-full min-h-24 h-auto group ${className}`}
        >
            <div className="flex items-center gap-4 w-full h-full">
                {/* Contenedor del Icono/Logo */}
                <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">
                        {icon}
                    </div>
                </div>
                {/* Textos */}
                <div className="flex-grow min-w-0">
                    <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                        {title}
                    </Title>
                    {description && (
                        <Text variant="caption" color="text-secondary" className="block mt-1 font-medium line-clamp-2">
                            {description}
                        </Text>
                    )}
                </div>
                {/* Indicador de Acción */}
                <Icon name={ChevronRight} className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
            </div>
        </MaterialCard>
    );
};

export default ServiceCard;
