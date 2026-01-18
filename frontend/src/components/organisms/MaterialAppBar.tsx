import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { Button, Text } from '../atoms';
import { MaterialSearchBar } from '../molecules';

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
  return (
    <header className="sticky top-0 z-50 bg-[var(--color-primary)] text-white dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)] shadow-lg transition-colors duration-300">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Lado izquierdo */}
          <div className="flex items-center space-x-4">
            {onMenuClick && (
              <Button
                variant="ghost"
                icon={Menu}
                onClick={onMenuClick}
                className="text-inherit hover:bg-white/10 dark:hover:bg-neutral-800"
              />
            )}

            <Text
              as="h1"
              variant="h6"
              weight="medium"
              color="inherit"
            >
              {title}
            </Text>
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
                <Button
                  variant="ghost"
                  icon={Bell}
                  onClick={onNotificationsClick}
                  className="text-inherit hover:bg-white/10 dark:hover:bg-neutral-800 relative"
                />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {notificationsCount > 99 ? '99+' : notificationsCount}
                  </span>
                )}
              </div>
            )}

            {showProfile && user && (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <Text
                    variant="body2"
                    weight="medium"
                    color="inherit"
                  >
                    {user.name}
                  </Text>
                  {user.role && (
                    <Text
                      variant="caption"
                      color="inherit"
                      className="opacity-80"
                    >
                      {user.role}
                    </Text>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={onProfileClick}
                  className="text-inherit hover:bg-white/10 dark:hover:bg-neutral-800 p-2"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <User size={24} />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MaterialAppBar;
