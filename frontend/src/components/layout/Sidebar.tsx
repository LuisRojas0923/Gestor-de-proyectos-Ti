import {
    BarChart3,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    GitGraph,
    LayoutDashboard,
    MessageSquare,
    Settings
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, darkMode } = state;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navigation = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard },
    { name: "Mis Desarrollos", href: '/developments', icon: Briefcase },
    { name: "Indicadores", href: '/indicators', icon: GitGraph },
    { name: t('chat'), href: '/chat', icon: MessageSquare },
    { name: t('reports'), href: '/reports', icon: BarChart3 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div
      className={`${
        sidebarOpen ? 'w-64' : 'w-16'
      } ${
        darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
      } border-r transition-all duration-300 ease-in-out flex flex-col h-full`}
    >
      {/* Header */}
      <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-neutral-200 dark:border-neutral-700`}>
        {sidebarOpen ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PM</span>
            </div>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              ProjectManager
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PM</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name} className="relative">
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center ${sidebarOpen ? 'px-3' : 'px-2 justify-center'} py-2 rounded-lg transition-colors group relative ${
                      isActive
                        ? 'bg-primary-500 text-white'
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
                    <div className={`absolute left-full ml-2 px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap ${
                      darkMode 
                        ? 'bg-neutral-800 text-white border border-neutral-700' 
                        : 'bg-white text-neutral-900 border border-neutral-200'
                    }`}>
                      <span className="text-sm font-medium">{item.name}</span>
                      {/* Flecha del tooltip */}
                      <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45 ${
                        darkMode ? 'bg-neutral-800 border-l border-b border-neutral-700' : 'bg-white border-l border-b border-neutral-200'
                      }`}></div>
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;