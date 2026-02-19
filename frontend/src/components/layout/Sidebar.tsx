import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Ticket,
  ClipboardList,
  Share2,
  LogOut,
  Palette,
  Users,
  X
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Button, Text } from '../atoms';

const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, user } = state;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');
  const { get } = useApi();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const data = await get('/health');
        if (data && (data as any).version) {
          setVersion((data as any).version);
        }
      } catch (err) {
        console.error("Error al obtener version:", err);
        setVersion('2.0.0');
      }
    };
    fetchVersion();
  }, [get]);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    // El router debería encargarse de la redirección al cambiar el estado del usuario
  };

  const navigation = [
    { id: 'dashboard', name: 'Tablero', href: '/', icon: LayoutDashboard },
    { id: 'developments', name: 'Mis Desarrollos', href: '/developments', icon: Briefcase },
    { id: 'indicators', name: 'Indicadores', href: '/indicators', icon: BarChart3 },
    { id: 'ticket-management', name: 'Gestión de Tickets', href: '/ticket-management', icon: Ticket },
    { id: 'reports', name: 'Reportes', href: '/reports', icon: ClipboardList },
    { id: 'chat', name: 'Chat IA', href: '/chat', icon: MessageSquare },
    { id: 'service-portal', name: 'Portal de Servicios', href: '/service-portal', icon: Share2 },
    { id: 'user-admin', name: 'Gestión de Usuarios', href: '/admin/users', icon: Users },
    { id: 'rooms-admin', name: 'Gestión de Salas', href: '/admin/rooms', icon: DoorOpen },
    { id: 'settings', name: 'Configuración', href: '/settings', icon: Settings },
    { id: 'design-catalog', name: 'Catálogo de Diseño', href: '/design-catalog', icon: Palette },
  ];

  const filteredNavigation = navigation.filter(item => {
    // Normalizar rol para comparaciones
    const userRole = (user?.role || '').trim().toLowerCase();

    // Gestión de Salas: solo rol admin
    if (item.id === 'rooms-admin') return userRole === 'admin' || userRole === 'manager';

    // Si el usuario no tiene cargados los permisos todavía (sesión antigua en caché)
    // permitimos ver todo lo que su rol tradicional permitía
    if (!user?.permissions) {
      if (userRole === 'admin') return true;
      if (['analyst', 'director', 'manager'].includes(userRole)) {
        return !['user-admin', 'design-catalog'].includes(item.id);
      }
      if (userRole === 'user' || userRole === 'usuario') {
        return item.id === 'service-portal';
      }
      return false;
    }

    // Si ya tiene permisos dinámicos, filtramos estrictamente por ellos
    return user.permissions.includes(item.id);
  });

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768 && sidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-16'}
          bg-[var(--color-surface)] border-r border-[var(--color-border)] 
          transition-all duration-300 ease-in-out flex flex-col h-full
          ${sidebarOpen ? 'shadow-2xl md:shadow-none' : ''}
        `}
      >
        {/* Header */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-[var(--color-border)]`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[var(--deep-navy)] rounded-lg flex items-center justify-center">
                <Text weight="bold" variant="body2" className="text-white">GT</Text>
              </div>
              <Text weight="bold" variant="caption" className="uppercase tracking-tighter text-[var(--color-text-primary)]">
                Portal de Servicios
              </Text>
            </div>
          ) : (
            <div className="w-8 h-8 bg-[var(--deep-navy)] rounded-lg flex items-center justify-center">
              <Text weight="bold" variant="body2" className="text-white">GT</Text>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={sidebarOpen ? (window.innerWidth < 768 ? X : ChevronLeft) : ChevronRight}
            onClick={toggleSidebar}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name} className="relative">
                  <NavLink
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center ${sidebarOpen ? 'px-3' : 'px-2 justify-center'} py-2.5 rounded-xl transition-all group relative ${isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-md'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-text-primary)]'
                      }`
                    }
                    onMouseEnter={() => !sidebarOpen && setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <Text variant="body2" weight="bold" color="inherit" className="ml-3">
                        {item.name}
                      </Text>
                    )}

                    {!sidebarOpen && hoveredItem === item.name && (
                      <div className="absolute left-full ml-4 px-3 py-2 rounded-xl shadow-2xl z-50 whitespace-nowrap bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                        <Text variant="caption" weight="bold">{item.name}</Text>
                      </div>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <Button
            variant="ghost"
            onClick={handleLogout}
            icon={LogOut}
            fullWidth
            className={`text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold ${sidebarOpen ? 'px-3 justify-start' : 'px-2 justify-center'}`}
          >
            {sidebarOpen && <Text variant="body2" className="ml-3">Cerrar Sesión</Text>}
          </Button>
          {sidebarOpen && user && (
            <div className="mt-4 flex items-center px-3 pt-4 border-t border-[var(--color-border)]/50">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)]/20 flex items-center justify-center text-[var(--color-primary)] font-black text-xs uppercase border border-[var(--color-primary)]/10">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <Text variant="caption" weight="bold" className="truncate">
                  {user.name}
                </Text>
                <Text variant="caption" weight="bold" className="uppercase tracking-widest text-[var(--color-text-secondary)] text-[10px]">
                  {user.role}
                </Text>
              </div>
            </div>
          )}

          {/* VERSION DISPLAY */}
          {sidebarOpen && (
            <div className="mt-4 pt-2 flex justify-center opacity-40 select-none">
              <Text variant="caption" className="text-[10px] font-mono tracking-tighter uppercase whitespace-nowrap bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                {version}
              </Text>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;