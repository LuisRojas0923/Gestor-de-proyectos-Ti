import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Search,
  Globe,
  User,
  CheckCircle,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useState } from 'react';
import ThemeToggle from '../atoms/ThemeToggle';
import { Button, Input, Title, Text } from '../atoms';

const TopBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { user, notifications } = state;
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;


  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Input
            placeholder={t('search')}
            icon={Search}
            className="w-96"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="md"
          icon={Globe}
          onClick={toggleLanguage}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2.5 rounded-xl"
        />

        <ThemeToggle />

        <div className="relative">
          <Button
            variant="ghost"
            size="md"
            icon={Bell}
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2.5 rounded-xl relative"
          >
            {unreadCount > 0 && (
              <Text
                variant="caption"
                weight="bold"
                className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center border-2 border-[var(--color-surface)] text-[10px]"
              >
                {unreadCount}
              </Text>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-96 rounded-[2rem] shadow-2xl border border-[var(--color-border)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 bg-[var(--color-surface)]">
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <Title variant="h6" weight="bold" className="uppercase tracking-widest text-[var(--color-text-secondary)] text-xs">
                  Notificaciones
                </Title>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
                  className="text-[10px] font-black text-[var(--color-primary)] hover:underline p-0 min-h-0 h-auto"
                >
                  Limpiar todo
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <div className="bg-[var(--color-surface-variant)] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-[var(--color-text-secondary)]/30">
                      <Bell size={32} />
                    </div>
                    <Text variant="body2" weight="bold" color="secondary">
                      No hay notificaciones
                    </Text>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-5 border-b last:border-0 border-[var(--color-border)] cursor-pointer transition-colors ${!n.read ? 'bg-[var(--color-primary)]/5' : ''
                        } hover:bg-[var(--color-surface-variant)]`}
                    >
                      <div className="flex space-x-4">
                        <div className={`mt-1 p-2 rounded-xl ${n.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          n.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            n.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {n.type === 'success' ? <CheckCircle size={14} /> :
                            n.type === 'error' ? <AlertCircle size={14} /> :
                              n.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <Text weight="bold" className="mb-1">
                            {n.title}
                          </Text>
                          <Text variant="caption" weight="medium" color="secondary" className="leading-relaxed">
                            {n.message}
                          </Text>
                          <Text variant="caption" weight="bold" className="mt-3 uppercase tracking-tighter opacity-40">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </Text>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2"></div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 pl-4 border-l border-[var(--color-border)]">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-2xl flex items-center justify-center p-0.5 shadow-sm">
            <div className="w-full h-full bg-[var(--color-surface)] rounded-[0.85rem] flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-[var(--color-primary)]" />
              )}
            </div>
          </div>
          <div className="text-sm hidden sm:block">
            <Text weight="bold" className="leading-tight">
              {user?.name || 'Usuario'}
            </Text>
            <Text variant="caption" weight="bold" className="uppercase tracking-widest text-[10px]">
              {user?.role || 'Analista'}
            </Text>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;