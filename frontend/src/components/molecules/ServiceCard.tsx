import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, Text, Icon } from '../atoms';

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
            wrapContent={false}
            className={`group min-h-24 h-auto w-full rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-sm hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-lg focus:ring-[var(--color-primary)] ${className}`}
        >
            <Text as="span" className="flex h-full w-full items-center gap-4">
                <Text as="span" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-2 text-[var(--color-primary)] shadow-sm">
                    <Text as="span" className="flex h-full w-full items-center justify-center">
                        {icon}
                    </Text>
                </Text>
                <Text as="span" className="min-w-0 flex-grow">
                    <Text as="span" variant="body1" weight="bold" className="block truncate leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                        {title}
                    </Text>
                    {description && (
                        <Text as="span" variant="caption" color="text-secondary" className="mt-1 block line-clamp-2 font-medium">
                            {description}
                        </Text>
                    )}
                </Text>
                <Icon name={ChevronRight} className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
            </Text>
        </Button>
    );
};

export default ServiceCard;
