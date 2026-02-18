import React from 'react';

interface MaterialCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
  ...props
}) => {

  const baseClasses = `rounded-[1.5rem] transition-all bg-[var(--color-surface)] border border-[var(--color-border)]`;

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

  const hoverClasses = hoverable ? 'hover:shadow-xl cursor-pointer hover:-translate-y-1' : '';
  const clickableClasses = onClick ? 'cursor-pointer active:scale-95' : '';

  return (
    <div
      className={`${baseClasses} ${elevationClasses[elevation]} ${hoverClasses} ${clickableClasses} ${className} font-sans duration-300 ease-in-out`}
      onClick={onClick}
      {...props}
    >
      <span className="block w-full h-full">{children}</span>
    </div>
  );
};

// Subcomponentes de MaterialCard
interface MaterialCardSubComponentProps {
  children: React.ReactNode;
  className?: string;
}

const MaterialCardHeader: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
}) => (
  <div className={`px-6 py-4 border-b border-[var(--color-border)]/50 transition-colors ${className}`}>
    <span>{children}</span>
  </div>
);

const MaterialCardContent: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
}) => (
  <div className={`px-6 py-4 transition-colors text-[var(--color-text-primary)] ${className}`}>
    <span>{children}</span>
  </div>
);

const MaterialCardActions: React.FC<MaterialCardSubComponentProps> = ({
  children,
  className = '',
}) => (
  <div className={`px-6 py-4 flex items-center justify-end space-x-2 transition-colors ${className}`}>
    <span>{children}</span>
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
