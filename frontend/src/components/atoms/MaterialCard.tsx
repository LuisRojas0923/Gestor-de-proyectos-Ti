import React from 'react';
import { materialDesignTokens } from '../tokens';

interface MaterialCardProps {
  children: React.ReactNode;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 12 | 16 | 24;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  darkMode?: boolean;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  children,
  elevation = 1,
  className = '',
  onClick,
  hoverable = false,
  darkMode = false,
}) => {
  const tokens = materialDesignTokens;
  
  const baseClasses = `rounded-lg transition-all duration-200 ${
    darkMode ? 'bg-neutral-800' : 'bg-white'
  }`;
  
  const elevationClasses = {
    0: 'shadow-none',
    1: 'shadow-sm hover:shadow-md',
    2: 'shadow-md hover:shadow-lg',
    3: 'shadow-lg hover:shadow-xl',
    4: 'shadow-xl hover:shadow-2xl',
    5: 'shadow-2xl hover:shadow-2xl',
    6: 'shadow-2xl hover:shadow-2xl',
    8: 'shadow-2xl hover:shadow-2xl',
    9: 'shadow-2xl hover:shadow-2xl',
    12: 'shadow-2xl hover:shadow-2xl',
    16: 'shadow-2xl hover:shadow-2xl',
    24: 'shadow-2xl hover:shadow-2xl'
  };

  const hoverClasses = hoverable ? 'hover:shadow-xl cursor-pointer' : '';
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
interface MaterialCardSubComponentProps {
  children: React.ReactNode;
  className?: string;
  darkMode?: boolean;
}

const MaterialCardHeader: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
  darkMode = false
}) => (
  <div className={`px-6 py-4 border-b transition-colors ${
    darkMode ? 'border-neutral-700' : 'border-gray-200'
  } ${className}`}>
    {children}
  </div>
);

const MaterialCardContent: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
  darkMode = false
}) => (
  <div className={`px-6 py-4 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'} ${className}`}>
    {children}
  </div>
);

const MaterialCardActions: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
  darkMode = false
}) => (
  <div className={`px-6 py-4 flex items-center justify-end space-x-2 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'} ${className}`}>
    {children}
  </div>
);

// Crear el componente principal con subcomponentes
const MaterialCardWithSubcomponents = MaterialCard as typeof MaterialCard & {
  Header: typeof MaterialCardHeader;
  Content: typeof MaterialCardContent;
  Actions: typeof MaterialCardActions;
};

MaterialCardWithSubcomponents.Header = MaterialCardHeader;
MaterialCardWithSubcomponents.Content = MaterialCardContent;
MaterialCardWithSubcomponents.Actions = MaterialCardActions;

export default MaterialCardWithSubcomponents;
