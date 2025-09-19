import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Globe,
  User,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Input } from '../atoms';

const TopBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { darkMode, user } = state;

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className={`${
      darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
    } border-b px-6 py-4 flex items-center justify-between`}>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Input
            type="search"
            placeholder={t('search')}
            icon={Search}
            iconPosition="left"
            className="w-96"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleLanguage}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Globe size={20} />
        </button>

        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          className={`p-2 rounded-lg transition-colors relative ${
            darkMode
              ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>

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
