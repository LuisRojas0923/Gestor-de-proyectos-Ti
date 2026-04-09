import React from 'react';

interface ProgressBarProps {
    progress: number;
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'accent';
    className?: string;
}

/**
 * Átomo de Barra de Progreso institucionalizado para evitar estilos inline dispersos.
 * Cumple con la normativa de diseño centralizado.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
    progress, 
    variant = 'primary', 
    className = '' 
}) => {
    const barRef = React.useRef<HTMLDivElement>(null);
    const variantClasses = {
        primary: 'bg-primary-500',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        accent: 'bg-[#3dfd1b] shadow-[0_0_8px_rgba(61,253,27,0.5)]'
    };

    const validatedProgress = Math.min(100, Math.max(0, progress));

    React.useLayoutEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = `${validatedProgress}%`;
        }
    }, [validatedProgress]);

    return (
        <div className={`w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex ${className}`}>
            <div 
                ref={barRef}
                className={`h-full transition-all duration-500 ${variantClasses[variant]}`} 
            />
        </div>
    );
};
