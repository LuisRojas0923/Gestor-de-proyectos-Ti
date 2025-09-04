import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  GitGraph,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, darkMode } = state;

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
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        {sidebarOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PM</span>
            </div>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              ProjectManager
            </span>
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
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : darkMode
                        ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
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