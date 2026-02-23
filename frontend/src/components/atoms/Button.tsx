import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { Text } from './Text';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'erp' | 'custom';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  title?: string;
  fullWidth?: boolean;
  rounded?: 'lg' | 'full';
  tabIndex?: number;
}

/*
 ## User Review Required

> [!IMPORTANT]
> **PROTECCIÓN DE TRADUCCIÓN:** El proyecto utiliza envolturas de nodos estables para evitar que traductores automáticos dañen el Virtual DOM de React. Esta protección se implementa de forma estándar a través del sistema de diseño usando el átomo Text (as="span") en lugar de etiquetas HTML directas.
*/
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: IconComponent,
  iconPosition = 'left',
  onClick,
  onMouseDown,
  type = 'button',
  className = '',
  title = '',
  fullWidth = false,
  rounded = 'lg',
  tabIndex,
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-900 focus:ring-primary-500 shadow-sm hover:shadow-md',
    secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 focus:ring-neutral-500 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600',
    outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800',
    ghost: 'text-neutral-700 hover:bg-white/10 focus:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    erp: 'bg-gradient-to-b from-white to-slate-200 text-[#2b4c7e] border border-slate-300 shadow-sm hover:from-slate-50 hover:to-slate-300 active:shadow-inner dark:from-slate-800 dark:to-slate-900 dark:text-blue-300 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 dark:active:shadow-black/40',
    custom: '',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const spinnerSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const roundedClasses = {
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled || loading}
      title={title}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${roundedClasses[rounded]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      tabIndex={tabIndex}
    >
      {loading && (
        <div className={`animate-spin ${spinnerSizeClasses[size]} ${children ? 'mr-2' : ''}`}>
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {!loading && IconComponent && iconPosition === 'left' && (
        <Icon
          name={IconComponent}
          size={size}
          color="inherit"
          className={children ? 'mr-2' : ''}
        />
      )}

      {children && (
        <Text as="span" color="inherit">
          {children}
        </Text>
      )}

      {!loading && IconComponent && iconPosition === 'right' && (
        <Icon
          name={IconComponent}
          size={size}
          color="inherit"
          className={children ? 'ml-2' : ''}
        />
      )}
    </button>
  );
};

export default Button;
