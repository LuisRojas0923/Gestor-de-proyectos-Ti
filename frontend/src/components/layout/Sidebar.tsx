import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Ticket,
  ClipboardList,
  Share2,
  LogOut,
  Palette,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Button, Text } from '../atoms';

const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, user } = state;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const navigation = [
    { name: 'Tablero', href: '/', icon: LayoutDashboard, role: ['analyst', 'admin'] },
    { name: 'Mis Desarrollos', href: '/developments', icon: Briefcase, role: ['analyst', 'admin'] },
    { name: 'Indicadores', href: '/indicators', icon: BarChart3, role: ['analyst', 'admin'] },
    { name: 'Gestión de Tickets', href: '/ticket-management', icon: Ticket, role: ['analyst', 'admin'] },
    { name: 'Reportes', href: '/reports', icon: ClipboardList, role: ['analyst', 'admin'] },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare, role: ['analyst', 'admin'] },
    { name: 'Portal de Servicios', href: '/service-portal', icon: Share2, role: ['user', 'analyst', 'admin'] },
    { name: 'Configuración', href: '/settings', icon: Settings, role: ['analyst', 'admin'] },
    { name: 'Catálogo de Diseño', href: '/design-catalog', icon: Palette, role: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    !item.role || (user && item.role.includes(user.role))
  );

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 ease-in-out flex flex-col h-full`}
    >
      {/* Header */}
      <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-[var(--color-border)]`}>
        {sidebarOpen ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[var(--deep-navy)] rounded-lg flex items-center justify-center">
              <Text weight="bold" variant="body2" className="text-white">GT</Text>
            </div>
            <Text weight="bold" variant="caption" className="uppercase tracking-tighter text-[var(--color-text-primary)]">
              Gestor Proyectos
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
          icon={sidebarOpen ? ChevronLeft : ChevronRight}
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
      </div>
    </div>
  );
};

export default Sidebar;