import React from 'react';
import { LucideIcon } from 'lucide-react';
import { materialDesignTokens } from '../tokens';
import { Text } from './Text';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface IconProps {
    /** El componente del icono de lucide-react */
    name: LucideIcon;
    /** Tamaño predefinido basado en el sistema de diseño */
    size?: IconSize;
    /** Color basado en el sistema de diseño o CSS válido */
    color?: 'primary' | 'secondary' | 'text-primary' | 'text-secondary' | 'error' | 'success' | 'warning' | 'white' | string;
    /** Clase adicional para ajustes finos */
    className?: string;
    /** Función al hacer click */
    onClick?: () => void;
}

/**
 * Átomo Icon para centralizar el uso de iconos en el proyecto.
 * Garantiza consistencia en tamaños y colores según el sistema de diseño.
 */
export const Icon: React.FC<IconProps> = ({
    name: IconComponent,
    size = 'md',
    color = 'inherit',
    className = '',
    onClick,
}) => {
    const tokens = materialDesignTokens;

    // Mapeo de colores predefinidos a tokens o variables
    const colorMap: Record<string, string> = {
        'primary': tokens.colors.primary[500],
        'secondary': tokens.colors.secondary[500],
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'error': tokens.colors.semantic.error,
        'success': tokens.colors.semantic.success,
        'warning': tokens.colors.semantic.warning,
        'white': '#ffffff',
        'inherit': 'currentColor'
    };

    const finalColor = colorMap[color] || color;
    const finalSize = tokens.icon.size[size] || tokens.icon.size.md;

    return (
        <Text
            as="span"
            className={`inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
            onClick={onClick}
            color="inherit"
        >
            <IconComponent
                size={finalSize}
                color={finalColor}
                strokeWidth={2}
            />
        </Text>
    );
};

export default Icon;
