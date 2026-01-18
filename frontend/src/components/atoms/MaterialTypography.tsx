import React from 'react';
import { Text, Title, Subtitle } from './index';

interface MaterialTypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline' | 'subtitle1' | 'subtitle2';
  component?: any; // Flexibilizar tipo para aceptar componentes
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'error' | 'warning' | 'success' | 'inherit' | 'white';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * @deprecated Use atoms directly: <Title />, <Subtitle />, or <Text />
 * Wrapper for backward compatibility.
 */
const MaterialTypography: React.FC<MaterialTypographyProps> = ({
  children,
  variant = 'body1',
  component,
  color = 'textPrimary',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  onClick,
}) => {

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  }[align];

  const gutterClasses = gutterBottom ? 'mb-2' : '';
  const wrapClasses = noWrap ? 'truncate' : '';
  const combinedClasses = `${alignClasses} ${gutterClasses} ${wrapClasses} ${className}`.trim();

  // Color mapping
  const colorMap: Record<string, any> = {
    primary: 'primary',
    secondary: 'secondary',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
    error: 'error',
    warning: 'warning',
    success: 'success',
    inherit: 'inherit',
    white: 'white'
  };

  const finalColor = colorMap[color] || 'text-primary';

  // Render Title
  if (variant.startsWith('h')) {
    return (
      <Title
        variant={variant as any}
        color={finalColor as any}
        className={combinedClasses}
        as={component}
      >
        {children}
      </Title>
    );
  }

  // Render Subtitle
  if (variant.startsWith('subtitle')) {
    return (
      <Subtitle
        variant={variant === 'subtitle1' ? 'h6' : 'body1'} // Mapping approx
        color={finalColor as any}
        className={combinedClasses}
        as={component}
      >
        {children}
      </Subtitle>
    );
  }

  // Render Text
  return (
    <Text
      variant={variant === 'body1' ? 'body1' : variant === 'body2' ? 'body2' : 'caption'}
      color={finalColor as any}
      className={combinedClasses}
      as={component}
      onClick={onClick}
    >
      {children}
    </Text>
  );
};

export default MaterialTypography;
