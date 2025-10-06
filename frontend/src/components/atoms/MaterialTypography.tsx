import React from 'react';
import { materialDesignTokens } from '../tokens';

interface MaterialTypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline' | 'subtitle1' | 'subtitle2';
  component?: keyof JSX.IntrinsicElements;
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'error' | 'warning' | 'success' | 'inherit';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
  className?: string;
  darkMode?: boolean;
}

const MaterialTypography: React.FC<MaterialTypographyProps> = ({
  children,
  variant = 'body1',
  component,
  color = 'textPrimary',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  darkMode = false,
}) => {
  const tokens = materialDesignTokens;
  
  // Mapeo de variantes a clases de Tailwind
  const getVariantClasses = () => {
    const variants = {
      h1: 'text-4xl font-light tracking-tight',
      h2: 'text-3xl font-light tracking-tight',
      h3: 'text-2xl font-normal tracking-tight',
      h4: 'text-xl font-normal tracking-tight',
      h5: 'text-lg font-medium tracking-tight',
      h6: 'text-base font-medium tracking-tight',
      subtitle1: 'text-base font-normal',
      subtitle2: 'text-sm font-medium',
      body1: 'text-base font-normal',
      body2: 'text-sm font-normal',
      caption: 'text-xs font-normal',
      overline: 'text-xs font-normal uppercase tracking-wide'
    };
    
    return variants[variant] || variants.body1;
  };

  // Mapeo de colores
  const getColorClasses = () => {
    if (color === 'primary') {
      return 'text-primary-500';
    } else if (color === 'secondary') {
      return darkMode ? 'text-neutral-300' : 'text-neutral-600';
    } else if (color === 'textPrimary') {
      return darkMode ? 'text-white' : 'text-gray-900';
    } else if (color === 'textSecondary') {
      return darkMode ? 'text-neutral-400' : 'text-gray-600';
    } else if (color === 'error') {
      return 'text-red-500';
    } else if (color === 'warning') {
      return 'text-yellow-500';
    } else if (color === 'success') {
      return 'text-green-500';
    } else {
      return darkMode ? 'text-white' : 'text-gray-900';
    }
  };

  // Mapeo de alineación
  const getAlignClasses = () => {
    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify'
    };
    
    return alignments[align] || alignments.left;
  };

  // Determinar el componente HTML a usar
  const getComponent = (): keyof JSX.IntrinsicElements => {
    if (component) return component;
    
    const componentMap = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      subtitle1: 'h6',
      subtitle2: 'h6',
      body1: 'p',
      body2: 'p',
      caption: 'span',
      overline: 'span'
    };
    
    return (componentMap[variant] || 'p') as keyof JSX.IntrinsicElements;
  };

  const baseClasses = 'transition-colors';
  const variantClasses = getVariantClasses();
  const colorClasses = getColorClasses();
  const alignClasses = getAlignClasses();
  const gutterClasses = gutterBottom ? 'mb-2' : '';
  const wrapClasses = noWrap ? 'whitespace-nowrap overflow-hidden text-ellipsis' : '';

  const finalClasses = `${baseClasses} ${variantClasses} ${colorClasses} ${alignClasses} ${gutterClasses} ${wrapClasses} ${className}`.trim();

  const Component = getComponent();

  return (
    <Component
      className={finalClasses}
      style={{
        fontFamily: tokens.typography.fontFamily.primary,
        transition: `color ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`
      }}
    >
      {children}
    </Component>
  );
};

export default MaterialTypography;
