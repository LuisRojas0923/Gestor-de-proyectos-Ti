import React from 'react';
import { Text } from './Text';

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    width?: string;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    align = 'center',
    width = 'w-52',
    className = 'inline-block',
}) => {
    const alignmentClasses = {
        left: {
            container: "left-0 translate-x-0 origin-top-left",
            arrow: "left-6"
        },
        right: {
            container: "right-0 left-auto translate-x-0 origin-top-right",
            arrow: "right-6 left-auto"
        },
        center: {
            container: "left-1/2 -translate-x-1/2 origin-top",
            arrow: "left-1/2 -translate-x-1/2"
        }
    };

    const placement = alignmentClasses[align];

    return (
        <div className={`relative group cursor-help ${className}`}>
            {children}
            <div className={`absolute top-full ${placement.container} mt-2 ${width} p-2.5 bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-border)] rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 ease-out z-50 text-center`}>
                <div className={`absolute -top-1 ${placement.arrow} w-2 h-2 bg-[var(--color-surface)] border-t border-l border-[var(--color-border)] rotate-45`}></div>
                {typeof content === 'string' ? (
                    <Text 
                        variant="caption" 
                        color="text-primary" 
                        weight="medium"
                        className="leading-normal text-[10.5px] block normal-case font-medium text-gray-950 dark:text-gray-50"
                    >
                        {content}
                    </Text>
                ) : (
                    content
                )}
            </div>
        </div>
    );
};

export default Tooltip;
