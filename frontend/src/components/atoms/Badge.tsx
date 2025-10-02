import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-all';
  
  const variantClasses = {
    default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300 shadow-md hover:shadow-lg',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 shadow-md hover:shadow-lg',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 shadow-md hover:shadow-lg',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 shadow-md hover:shadow-lg',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 shadow-md hover:shadow-lg',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
