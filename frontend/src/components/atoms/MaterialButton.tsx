import React from 'react';
import { LucideIcon } from 'lucide-react';
import { materialDesignTokens } from '../tokens';

interface MaterialButtonProps {
  children?: React.ReactNode;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

const MaterialButton: React.FC<MaterialButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}) => {
  const tokens = materialDesignTokens;
  
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Variantes de Material Design
  const variantClasses = {
    contained: 'shadow-md hover:shadow-lg active:shadow-sm',
    outlined: 'border-2 bg-transparent hover:bg-opacity-8',
    text: 'bg-transparent hover:bg-opacity-8'
  };

  // Colores de Material Design
  const colorClasses = {
    primary: {
      contained: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      outlined: 'text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      text: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
    },
    secondary: {
      contained: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500',
      outlined: 'text-orange-500 border-orange-500 hover:bg-orange-50 focus:ring-orange-500',
      text: 'text-orange-500 hover:bg-orange-50 focus:ring-orange-500'
    },
    inherit: {
      contained: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outlined: 'text-gray-600 border-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      text: 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500'
    }
  };

  // Tamaños de Material Design
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm min-h-[32px]',
    medium: 'px-4 py-2 text-sm min-h-[36px]',
    large: 'px-6 py-3 text-base min-h-[42px]'
  };

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  const fullWidthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${colorClasses[color][variant]} 
        ${sizeClasses[size]} 
        ${fullWidthClass}
        ${className}
      `}
      style={{
        fontFamily: tokens.typography.fontFamily.primary,
        transition: `all ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`
      }}
    >
      {loading && (
        <div className={`animate-spin ${iconSizeClasses[size]} mr-2`}>
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={`${iconSizeClasses[size]} ${children ? 'mr-2' : ''}`} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={`${iconSizeClasses[size]} ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  );
};

export default MaterialButton;
