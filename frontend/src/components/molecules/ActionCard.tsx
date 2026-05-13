import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Button, Title, Text, Icon } from '../atoms';

interface ActionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode | LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'primary_light';
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'purple';
    className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    description,
    icon,
    onClick,
    variant = 'default',
    color,
    className = ''
}) => {
    // Determine color classes based on the 'color' prop or 'variant'
    const getColorClasses = () => {
        if (color === 'success') return "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400";
        if (color === 'warning') return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";
        if (color === 'error') return "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400";
        if (color === 'info') return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";
        if (color === 'purple') return "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400";
        
        // Default / Primary fallback
        return variant === 'default'
            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            : "bg-[var(--color-primary-light)]/20 text-[var(--color-primary)]";
    };

    const iconContainerStyles = getColorClasses();

    return (
        <Button
            variant="custom"
            onClick={onClick}
            className={`group p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-1 text-center space-y-4 h-auto flex-col block w-full ${className}`}
        >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 ${iconContainerStyles}`}>
                {/* Render icon directly if it's a node, or wrap it if it's a function/component pattern */}
                {icon ? (
                    React.isValidElement(icon) ? icon : <Icon name={icon as any} size="xl" className="w-10 h-10" />
                ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
                )}
            </div>
            <Title variant="h5" weight="bold" color="text-primary">{title}</Title>
            <Text variant="body1" color="text-secondary" weight="medium">{description}</Text>
        </Button>
    );
};

export default ActionCard;
