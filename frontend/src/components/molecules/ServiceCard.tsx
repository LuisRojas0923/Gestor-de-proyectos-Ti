import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, Title, Text, Icon } from '../atoms';

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
        <Button
            variant="custom"
            onClick={onClick}
            className={`p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] text-left hover:border-[var(--color-primary)] hover:shadow-xl transition-all group flex flex-col h-full items-start w-full ${className}`}
        >
            <div className="text-[var(--color-primary)] mb-4 bg-[var(--color-primary)]/10 w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-background)] shrink-0">
                {icon}
            </div>
            <div className="flex-grow">
                <Title variant="h6" weight="bold" className="mb-2" color="text-primary">{title}</Title>
                <Text variant="body2" color="text-secondary" weight="medium" className="line-clamp-3">{description}</Text>
            </div>
            <div className="mt-4 flex items-center text-[var(--color-primary)] font-black text-sm uppercase tracking-wider">
                Seleccionar <Icon name={ChevronRight} size="sm" className="ml-1" />
            </div>
        </Button>
    );
};

export default ServiceCard;
