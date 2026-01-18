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
import { Button, Input } from '../atoms';

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
    <header className={`${darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
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
        <Button
          variant="ghost"
          size="sm"
          icon={Globe}
          onClick={toggleLanguage}
          className={`${darkMode
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        />

        <Button
          variant="ghost"
          size="sm"
          icon={darkMode ? Sun : Moon}
          onClick={toggleDarkMode}
          className={`${darkMode
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        />

        <Button
          variant="ghost"
          size="sm"
          icon={Bell}
          className={`${darkMode
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-neutral-900'
            } relative`}
        >
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900"></span>
        </Button>

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
