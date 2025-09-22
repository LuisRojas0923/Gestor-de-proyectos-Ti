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
  darkMode?: boolean;
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
  darkMode = false,
}) => {
  const tokens = materialDesignTokens;
  
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Diseño esbelto y moderno
  const getButtonClasses = () => {
    const sizeClasses = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };

    const baseButtonClasses = `${baseClasses} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''}`;

    if (disabled) {
      return `${baseButtonClasses} ${
        darkMode ? 'bg-neutral-600 text-white' : 'bg-neutral-600 text-white'
      }`;
    }

    if (variant === 'contained') {
      if (color === 'primary') {
        return `${baseButtonClasses} bg-primary-500 text-white hover:bg-primary-600`;
      } else if (color === 'secondary') {
        return `${baseButtonClasses} ${
          darkMode ? 'bg-neutral-600 text-white hover:bg-neutral-500' : 'bg-neutral-600 text-white hover:bg-neutral-500'
        }`;
      } else {
        return `${baseButtonClasses} ${
          darkMode ? 'bg-neutral-600 text-white hover:bg-neutral-500' : 'bg-neutral-600 text-white hover:bg-neutral-500'
        }`;
      }
    } else if (variant === 'outlined') {
      return `${baseButtonClasses} border bg-transparent ${
        color === 'primary' 
          ? 'border-primary-500 text-primary-500 hover:bg-primary-50' 
          : darkMode
            ? 'border-neutral-300 text-neutral-300 hover:bg-neutral-700'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
      }`;
    } else { // text
      return `${baseButtonClasses} ${
        color === 'primary' 
          ? 'text-primary-500 hover:bg-primary-50' 
          : darkMode
            ? 'text-neutral-300 hover:bg-neutral-700'
            : 'text-neutral-700 hover:bg-neutral-50'
      }`;
    }
  };

  const buttonClasses = getButtonClasses();

  return (
    <button
      type={type}
      className={`${buttonClasses} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        fontFamily: tokens.typography.fontFamily.primary,
        transition: `all ${tokens.transitions.duration.standard} ${tokens.transitions.easing.standard}`
      }}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className="w-4 h-4 mr-2" />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon className="w-4 h-4 ml-2" />
          )}
        </>
      )}
    </button>
  );
};

export default MaterialButton;