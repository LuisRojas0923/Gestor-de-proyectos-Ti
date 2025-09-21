import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { MaterialButton } from '../atoms';
import { MaterialSearchBar } from '../molecules';
import { materialDesignTokens } from '../tokens';

interface MaterialAppBarProps {
  title?: string;
  onMenuClick?: () => void;
  onSearch?: (query: string) => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  notificationsCount?: number;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  actions?: React.ReactNode;
}

const MaterialAppBar: React.FC<MaterialAppBarProps> = ({
  title = 'Gestor de Proyectos TI',
  onMenuClick,
  onSearch,
  onNotificationsClick,
  onProfileClick,
  showSearch = true,
  showNotifications = true,
  showProfile = true,
  notificationsCount = 0,
  user,
  actions
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const tokens = materialDesignTokens;

  return (
    <header 
      className="sticky top-0 z-50 shadow-md"
      style={{
        backgroundColor: darkMode ? tokens.colors.surface.dark : tokens.colors.primary[600],
        color: darkMode ? tokens.colors.text.primary.dark : 'white',
        boxShadow: tokens.elevation[4],
        fontFamily: tokens.typography.fontFamily.primary
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Lado izquierdo */}
          <div className="flex items-center space-x-4">
            {onMenuClick && (
              <MaterialButton
                variant="text"
                color="inherit"
                icon={Menu}
                onClick={onMenuClick}
                className="text-white hover:bg-white hover:bg-opacity-10"
              />
            )}
            
            <h1 
              className="text-xl font-medium"
              style={{
                fontSize: tokens.typography.fontSize.h6,
                fontWeight: tokens.typography.fontWeight.medium,
                color: 'white'
              }}
            >
              {title}
            </h1>
          </div>

          {/* Centro - Barra de búsqueda */}
          {showSearch && onSearch && (
            <div className="flex-1 max-w-md mx-8">
              <MaterialSearchBar
                placeholder="Buscar desarrollos, requerimientos..."
                onSearch={onSearch}
                className="w-full"
              />
            </div>
          )}

          {/* Lado derecho */}
          <div className="flex items-center space-x-2">
            {actions}
            
            {showNotifications && (
              <div className="relative">
                <MaterialButton
                  variant="text"
                  color="inherit"
                  icon={Bell}
                  onClick={onNotificationsClick}
                  className="text-white hover:bg-white hover:bg-opacity-10 relative"
                />
                {notificationsCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                    style={{
                      fontSize: tokens.typography.fontSize.caption,
                      fontWeight: tokens.typography.fontWeight.medium
                    }}
                  >
                    {notificationsCount > 99 ? '99+' : notificationsCount}
                  </span>
                )}
              </div>
            )}
            
            {showProfile && user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p 
                    className="text-sm font-medium"
                    style={{
                      fontSize: tokens.typography.fontSize.body2,
                      fontWeight: tokens.typography.fontWeight.medium,
                      color: 'white'
                    }}
                  >
                    {user.name}
                  </p>
                  {user.role && (
                    <p 
                      className="text-xs opacity-80"
                      style={{
                        fontSize: tokens.typography.fontSize.caption,
                        color: 'white'
                      }}
                    >
                      {user.role}
                    </p>
                  )}
                </div>
                
                <MaterialButton
                  variant="text"
                  color="inherit"
                  onClick={onProfileClick}
                  className="text-white hover:bg-white hover:bg-opacity-10 p-2"
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User size={32} />
                  )}
                </MaterialButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MaterialAppBar;
