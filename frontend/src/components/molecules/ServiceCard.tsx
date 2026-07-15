import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, Text, Icon, Tooltip } from '../atoms';

export interface ServiceCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    className?: string;
    compact?: boolean;
    descriptionMode?: 'visible' | 'tooltip';
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    title,
    description,
    icon,
    onClick,
    className = '',
    compact = false,
    descriptionMode = 'visible',
}) => {
    const card = (
        <Button
            variant="custom"
            onClick={onClick}
            wrapContent={false}
            aria-label={descriptionMode === 'tooltip' ? title : undefined}
            className={`group h-auto w-full border border-[var(--color-border)] bg-[var(--color-surface)] text-left shadow-sm hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-lg focus:ring-[var(--color-primary)] ${compact ? 'min-h-[72px] rounded-xl p-3' : 'min-h-24 rounded-[1.5rem] p-4'} ${className}`}
        >
            <Text as="span" className={`flex h-full w-full items-center ${compact ? 'gap-3' : 'gap-4'}`}>
                <Text as="span" className={`flex shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-2 text-[var(--color-primary)] shadow-sm ${compact ? 'h-12 w-12' : 'h-16 w-16'}`}>
                    <Text as="span" className="flex h-full w-full items-center justify-center">
                        {icon}
                    </Text>
                </Text>
                <Text as="span" className="min-w-0 flex-grow">
                    <Text as="span" variant={compact ? 'body2' : 'body1'} weight="bold" className="block truncate leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                        {title}
                    </Text>
                    {description && descriptionMode === 'visible' && (
                        <Text as="span" variant="caption" color="text-secondary" className="mt-1 block line-clamp-2 font-medium">
                            {description}
                        </Text>
                    )}
                </Text>
                <Icon name={ChevronRight} className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-[var(--color-text-secondary)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-primary)]`} />
            </Text>
        </Button>
    );

    if (!description || descriptionMode !== 'tooltip') return card;
    return <Tooltip content={description} width="w-72" className="block w-full">{card}</Tooltip>;
};

export default ServiceCard;
