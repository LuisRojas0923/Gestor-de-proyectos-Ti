import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Text } from '../atoms';

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: NavigationItem[];
}

interface MaterialDrawerProps {
  open: boolean;
  onClose?: () => void;
  items: NavigationItem[];
  activeItem?: string;
  onItemClick?: (item: NavigationItem) => void;
  title?: string;
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  footer?: React.ReactNode;
  variant?: 'permanent' | 'temporary' | 'persistent';
  width?: number;
}

const MaterialDrawer: React.FC<MaterialDrawerProps> = ({
  open,
  onClose,
  items,
  activeItem,
  onItemClick,
  title = 'Navegación',
  user,
  footer,
  variant = 'temporary',
  width = 280
}) => {
  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item);
    }
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = activeItem === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 cursor-pointer rounded-r-full mr-4 group ${isActive
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)]'
            } ${level > 0 ? 'pl-8' : ''}`}
          role="button"
          tabIndex={0}
        >
          <item.icon
            size={20}
            className={`mr-3 flex-shrink-0 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
          />

          <Text
            variant="body2"
            weight={isActive ? 'medium' : 'normal'}
            color="inherit"
            className="flex-1 truncate"
          >
            {item.label}
          </Text>

          {item.badge && (
            <Text
              as="span"
              className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-primary)] text-white"
            >
              {item.badge}
            </Text>
          )}
        </div>

        {hasChildren && (
          <div className="mt-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const drawerClasses = `
    fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out
    bg-[var(--color-surface)] border-r border-[var(--color-border)]
    ${open ? 'translate-x-0' : '-translate-x-full'}
    ${variant === 'permanent' ? 'relative translate-x-0' : ''}
    ${variant === 'temporary' ? 'shadow-2xl' : 'shadow-sm'}
  `;

  const drawerStyle = { width: `${width}px` };

  return (
    <>
      {/* Overlay para drawer temporal */}
      {variant === 'temporary' && open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={drawerClasses}
        style={drawerStyle}
      >
        {/* Header */}
        <div className="px-6 py-8 border-b border-[var(--color-border)]/50">
          <Text
            as="h2"
            variant="h6"
            weight="bold"
            color="text-primary"
          >
            {title}
          </Text>

          {user && (
            <div className="mt-6 flex items-center space-x-3 p-3 rounded-2xl bg-[var(--color-surface-variant)]/50 border border-[var(--color-border)]/30">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-white dark:border-neutral-700 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-primary)] text-white text-lg font-bold shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="overflow-hidden">
                <Text
                  variant="body2"
                  weight="bold"
                  className="truncate"
                >
                  {user.name}
                </Text>
                {user.role && (
                  <Text
                    variant="caption"
                    color="text-secondary"
                    className="truncate block"
                  >
                    {user.role}
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <div className="px-2 space-y-1">
            {items.map(item => renderNavigationItem(item))}
          </div>
        </nav>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-variant)]/20">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default MaterialDrawer;
