import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { materialDesignTokens } from '../tokens';

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
  const { state } = useAppContext();
  const { darkMode } = state;
  const tokens = materialDesignTokens;

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
        <button
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 hover:bg-opacity-8 ${
            isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
          } ${level > 0 ? 'pl-8' : ''}`}
          style={{
            backgroundColor: isActive 
              ? (darkMode ? 'rgba(33, 150, 243, 0.12)' : 'rgba(33, 150, 243, 0.08)')
              : 'transparent',
            color: isActive 
              ? tokens.colors.primary[600]
              : (darkMode ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light),
            fontFamily: tokens.typography.fontFamily.primary,
            fontSize: tokens.typography.fontSize.body2,
            fontWeight: isActive ? tokens.typography.fontWeight.medium : tokens.typography.fontWeight.regular
          }}
        >
          <item.icon 
            size={20} 
            className="mr-3 flex-shrink-0"
            style={{
              color: isActive 
                ? tokens.colors.primary[600]
                : (darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light)
            }}
          />
          
          <span className="flex-1 truncate">{item.label}</span>
          
          {item.badge && (
            <span 
              className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600"
              style={{
                fontSize: tokens.typography.fontSize.caption,
                backgroundColor: tokens.colors.primary[100],
                color: tokens.colors.primary[600]
              }}
            >
              {item.badge}
            </span>
          )}
        </button>
        
        {hasChildren && (
          <div className="ml-4">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const drawerClasses = `
    fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out
    ${open ? 'translate-x-0' : '-translate-x-full'}
    ${variant === 'permanent' ? 'relative translate-x-0' : ''}
  `;

  return (
    <>
      {/* Overlay para drawer temporal */}
      {variant === 'temporary' && open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={drawerClasses}
        style={{
          width: `${width}px`,
          backgroundColor: darkMode ? tokens.colors.surface.dark : tokens.colors.surface.light,
          boxShadow: variant === 'temporary' ? tokens.elevation[16] : tokens.elevation[1]
        }}
      >
        {/* Header */}
        <div 
          className="px-4 py-6 border-b"
          style={{
            borderColor: darkMode ? tokens.colors.surface.variant.dark : tokens.colors.surface.variant.light
          }}
        >
          <h2 
            className="text-lg font-medium"
            style={{
              color: darkMode ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light,
              fontSize: tokens.typography.fontSize.h6,
              fontWeight: tokens.typography.fontWeight.medium,
              fontFamily: tokens.typography.fontFamily.primary
            }}
          >
            {title}
          </h2>
          
          {user && (
            <div className="mt-4 flex items-center space-x-3">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: tokens.colors.primary[100],
                    color: tokens.colors.primary[600]
                  }}
                >
                  <span className="text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <p 
                  className="text-sm font-medium"
                  style={{
                    color: darkMode ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light,
                    fontSize: tokens.typography.fontSize.body2,
                    fontWeight: tokens.typography.fontWeight.medium
                  }}
                >
                  {user.name}
                </p>
                {user.role && (
                  <p 
                    className="text-xs"
                    style={{
                      color: darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light,
                      fontSize: tokens.typography.fontSize.caption
                    }}
                  >
                    {user.role}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {items.map(item => renderNavigationItem(item))}
        </nav>
        
        {/* Footer */}
        {footer && (
          <div 
            className="px-4 py-4 border-t"
            style={{
              borderColor: darkMode ? tokens.colors.surface.variant.dark : tokens.colors.surface.variant.light
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default MaterialDrawer;
