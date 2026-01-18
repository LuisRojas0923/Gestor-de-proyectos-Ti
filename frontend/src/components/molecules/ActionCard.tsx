import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Button, Title, Text, Icon } from '../atoms';

interface ActionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode | LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'primary_light'; // To handle the slight color difference in the dashboard
    className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    description,
    icon,
    onClick,
    variant = 'default',
    className = ''
}) => {
    // Distinct styles for the icon container based on variant
    const iconContainerStyles = variant === 'default'
        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        : "bg-[var(--color-primary-light)]/20 text-[var(--color-primary)]";

    return (
        <Button
            variant="custom"
            onClick={onClick}
            className={`group p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-1 text-center space-y-4 h-auto flex-col block w-full ${className}`}
        >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 ${iconContainerStyles}`}>
                {/* Render icon directly if it's a node, or wrap it if it's a function/component pattern */}
                {React.isValidElement(icon) ? icon : <Icon name={icon as any} size="xl" className="w-10 h-10" />}
            </div>
            <Title variant="h5" weight="bold" color="text-primary">{title}</Title>
            <Text variant="body1" color="text-secondary" weight="medium">{description}</Text>
        </Button>
    );
};

export default ActionCard;
