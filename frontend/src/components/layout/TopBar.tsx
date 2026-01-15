import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Globe,
  User,
  CheckCircle,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useState } from 'react';

const TopBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { darkMode, user, notifications } = state;
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  return (
    <header className={`${darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
      } border-b px-6 py-4 flex items-center justify-between`}>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`} size={20} />
          <input
            type="text"
            placeholder={t('search')}
            className={`pl-10 pr-4 py-2 w-96 rounded-lg border transition-colors ${darkMode
              ? 'bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400 focus:border-primary-500'
              : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:border-primary-500'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleLanguage}
          className={`p-2 rounded-lg transition-colors ${darkMode
            ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
            : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
        >
          <Globe size={20} />
        </button>

        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg transition-colors ${darkMode
            ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
            : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg transition-colors relative ${darkMode
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-neutral-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-100'
              }`}>
              <div className="p-4 border-b dark:border-neutral-700 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Notificaciones</h3>
                <button
                  onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-600"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={32} className="mx-auto text-neutral-300 mb-2 opacity-50" />
                    <p className="text-xs font-bold text-neutral-400">No hay notificaciones</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 border-b last:border-0 dark:border-neutral-800 cursor-pointer transition-colors ${!n.read ? (darkMode ? 'bg-blue-900/10' : 'bg-blue-50/50') : ''
                        } hover:bg-neutral-50 dark:hover:bg-neutral-800/50`}
                    >
                      <div className="flex space-x-3">
                        <div className={`mt-1 p-1 rounded-lg ${n.type === 'success' ? 'text-green-500' :
                          n.type === 'error' ? 'text-red-500' :
                            n.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                          }`}>
                          {n.type === 'success' ? <CheckCircle size={14} /> :
                            n.type === 'error' ? <AlertCircle size={14} /> :
                              n.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-black mb-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{n.title}</p>
                          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 line-clamp-2">{n.message}</p>
                          <p className="text-[9px] font-bold text-neutral-400 mt-2 uppercase">{new Date(n.timestamp).toLocaleTimeString()}</p>
                        </div>
                        {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pl-4 border-l border-neutral-200 dark:border-neutral-700">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
          <div className="text-sm">
            <p className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {user?.name || 'Usuario'}
            </p>
            <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {user?.role || 'Analista'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;