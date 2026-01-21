import React from 'react';

export interface TextProps {
    children: React.ReactNode;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label' | 'div';
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'subtitle1' | 'subtitle2';
    weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
    align?: 'left' | 'center' | 'right' | 'justify';
    color?: 'primary' | 'secondary' | 'text-primary' | 'text-secondary' | 'error' | 'success' | 'warning' | 'white' | 'gray' | 'inherit';
    className?: string;
    onClick?: () => void;
    htmlFor?: string; // Para labels
    style?: React.CSSProperties;
}

export const Text: React.FC<TextProps> = ({
    children,
    as,
    variant = 'body1',
    weight = 'normal',
    align = 'left',
    color = 'text-primary',
    className = '',
    onClick,
    htmlFor,
    style,
}) => {

    // Mapping variants to base styles
    const variantStyles = {
        h1: 'text-4xl leading-tight',
        h2: 'text-3xl leading-snug',
        h3: 'text-2xl leading-snug',
        h4: 'text-xl leading-snug',
        h5: 'text-lg leading-snug',
        h6: 'text-base leading-snug',
        subtitle1: 'text-base',
        subtitle2: 'text-sm',
        body1: 'text-base',
        body2: 'text-sm',
        caption: 'text-xs',
    };

    const weightStyles = {
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
    };

    const alignStyles = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
    };

    const colorStyles = {
        primary: 'text-primary-600 dark:text-primary-400',
        secondary: 'text-secondary-600 dark:text-secondary-400',
        'text-primary': 'text-gray-900 dark:text-gray-100',
        'text-secondary': 'text-gray-500 dark:text-gray-400',
        error: 'text-red-600 dark:text-red-400',
        success: 'text-green-600 dark:text-green-400',
        warning: 'text-amber-600 dark:text-amber-400',
        white: 'text-white',
        gray: 'text-gray-500',
        inherit: '',
    };

    // Determine Component
    let Component = as as any;
    if (!Component) {
        // Default mapping based on variant
        if (variant.startsWith('h')) Component = variant;
        else if (variant === 'caption') Component = 'span';
        else Component = 'p';
    }

    return (
        <Component
            className={`
        ${variantStyles[variant]}
        ${weightStyles[weight]}
        ${alignStyles[align]}
        ${colorStyles[color] || ''}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
            style={style}
            onClick={onClick}
            htmlFor={htmlFor}
        >
            {children}
        </Component>
    );
};


