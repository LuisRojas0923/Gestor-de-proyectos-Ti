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
  LogOut
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, darkMode, user } = state;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const navigation = [
    { name: 'Tablero', href: '/', icon: LayoutDashboard, role: ['analyst'] },
    { name: 'Mis Desarrollos', href: '/developments', icon: Briefcase, role: ['analyst'] },
    { name: 'Indicadores', href: '/indicators', icon: BarChart3, role: ['analyst'] },
    { name: 'Gestión de Tickets', href: '/ticket-management', icon: Ticket, role: ['analyst'] },
    { name: 'Reportes', href: '/reports', icon: ClipboardList, role: ['analyst'] },
    { name: 'Chat IA', href: '/chat', icon: MessageSquare, role: ['analyst'] },
    { name: 'Portal de Servicios', href: '/service-portal', icon: Share2, role: ['user', 'analyst'] },
    { name: 'Configuración', href: '/settings', icon: Settings, role: ['analyst'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    !item.role || (user && item.role.includes(user.role))
  );

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-16'
        } ${darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
        } border-r transition-all duration-300 ease-in-out flex flex-col h-full`}
    >
      {/* Header */}
      <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-neutral-200 dark:border-neutral-700`}>
        {sidebarOpen ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GT</span>
            </div>
            <span className={`font-black text-xs uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Gestor Proyectos
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GT</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors ${darkMode
            ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
            : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
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
                    `flex items-center ${sidebarOpen ? 'px-3' : 'px-2 justify-center'} py-2 rounded-lg transition-colors group relative ${isActive
                      ? 'bg-blue-600 text-white'
                      : darkMode
                        ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                  onMouseEnter={() => !sidebarOpen && setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}

                  {/* Tooltip para estado contraído */}
                  {!sidebarOpen && hoveredItem === item.name && (
                    <div className={`absolute left-full ml-4 px-3 py-2 rounded-xl shadow-2xl z-50 whitespace-nowrap ${darkMode
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'bg-white text-neutral-900 border border-neutral-200'
                      }`}>
                      <span className="text-xs font-bold">{item.name}</span>
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${sidebarOpen ? 'px-3' : 'px-2 justify-center'} py-2 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10`}
        >
          <LogOut size={20} />
          {sidebarOpen && <span className="ml-3 text-sm font-bold">Cerrar Sesión</span>}
        </button>
        {sidebarOpen && user && (
          <div className="mt-4 flex items-center px-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-neutral-800 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;