import React from 'react';
import { materialDesignTokens } from '../tokens';

interface MaterialCardProps {
  children: React.ReactNode;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 12 | 16 | 24;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  children,
  elevation = 1,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const tokens = materialDesignTokens;
  
  const baseClasses = 'bg-white rounded-lg transition-all duration-200';
  
  const elevationClasses = {
    0: 'shadow-none',
    1: 'shadow-sm',
    2: 'shadow-md',
    3: 'shadow-lg',
    4: 'shadow-xl',
    5: 'shadow-2xl',
    6: 'shadow-2xl',
    8: 'shadow-2xl',
    9: 'shadow-2xl',
    12: 'shadow-2xl',
    16: 'shadow-2xl',
    24: 'shadow-2xl'
  };

  const hoverClasses = hoverable ? 'hover:shadow-lg cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${elevationClasses[elevation]} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      style={{
        fontFamily: tokens.typography.fontFamily.primary,
        transition: `all ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`,
        boxShadow: elevation > 0 ? tokens.elevation[elevation] : 'none'
      }}
    >
      {children}
    </div>
  );
};

// Subcomponentes de MaterialCard
const MaterialCardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const MaterialCardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const MaterialCardActions: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`px-6 py-4 flex items-center justify-end space-x-2 ${className}`}>
    {children}
  </div>
);

// Agregar subcomponentes al componente principal
MaterialCard.Header = MaterialCardHeader;
MaterialCard.Content = MaterialCardContent;
MaterialCard.Actions = MaterialCardActions;

export default MaterialCard;
