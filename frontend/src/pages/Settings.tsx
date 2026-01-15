import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Bell,
  Globe,
  Moon,
  Sun,
  Key,
  Mail,
  Smartphone,
  Save,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../components/notifications/NotificationsContext';

const Settings: React.FC = () => {
  const { addNotification } = useNotifications();
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { darkMode, user } = state;

  const [profile, setProfile] = useState({
    name: user?.name || 'Usuario Demo',
    email: user?.email || 'usuario@empresa.com',
    role: user?.role || 'Analista Senior',
    timezone: 'America/Mexico_City',
    avatar: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    teams: false,
    slack: true,
    browser: true,
    sla_alerts: true,
    daily_summary: true,
  });

  const [apiTokens, setApiTokens] = useState([
    {
      id: '1',
      name: 'Token Principal',
      token: 'pk_live_51234567890abcdef',
      created: '2025-01-10',
      lastUsed: '2025-01-20',
      isVisible: false,
    }
  ]);

  const [newToken, setNewToken] = useState({ name: '', description: '' });
  const [showTokenForm, setShowTokenForm] = useState(false);

  const handleProfileUpdate = () => {
    // API call to update profile
    addNotification('success', 'Perfil actualizado correctamente');
  };

  const handleNotificationUpdate = () => {
    // API call to update notification preferences
    addNotification('success', 'Preferencias de notificación actualizadas');
  };

  const generateApiToken = () => {
    if (!newToken.name) {
      addNotification('error', 'Ingresa un nombre para el token');
      return;
    }

    const token = {
      id: Date.now().toString(),
      name: newToken.name,
      token: `pk_live_${Math.random().toString(36).substr(2, 24)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Nunca',
      isVisible: false,
    };

    setApiTokens(prev => [...prev, token]);
    setNewToken({ name: '', description: '' });
    setShowTokenForm(false);
    addNotification('success', 'Token API generado correctamente');
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    addNotification('success', 'Token copiado al portapapeles');
  };

  const toggleTokenVisibility = (id: string) => {
    setApiTokens(prev => prev.map(token =>
      token.id === id ? { ...token, isVisible: !token.isVisible } : token
    ));
  };

  const deleteToken = (id: string) => {
    setApiTokens(prev => prev.filter(token => token.id !== id));
    addNotification('success', 'Token eliminado');
  };

  const timezones = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
    { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
    { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
    { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
        {t('settings')}
      </h1>

      {/* Profile Settings */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
        <div className="flex items-center space-x-3 mb-6">
          <User className={darkMode ? 'text-neutral-400' : 'text-neutral-600'} size={24} />
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Perfil de Usuario
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Nombre Completo
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Rol
              </label>
              <select
                value={profile.role}
                onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              >
                <option value="Analista Junior">Analista Junior</option>
                <option value="Analista Senior">Analista Senior</option>
                <option value="Líder Técnico">Líder Técnico</option>
                <option value="Gerente de Proyecto">Gerente de Proyecto</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Zona Horaria
              </label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Idioma
              </label>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                Tema
              </label>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                className={`w-full px-4 py-2 rounded-lg border transition-colors flex items-center justify-center space-x-2 ${darkMode
                    ? 'bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 hover:bg-neutral-100'
                  }`}
              >
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                <span>{darkMode ? 'Modo Oscuro' : 'Modo Claro'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleProfileUpdate}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save size={20} />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
        <div className="flex items-center space-x-3 mb-6">
          <Bell className={darkMode ? 'text-neutral-400' : 'text-neutral-600'} size={24} />
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Notificaciones
          </h2>
        </div>

        <div className="space-y-4">
          {[
            { key: 'email', label: 'Notificaciones por Email', icon: Mail },
            { key: 'teams', label: 'Notificaciones de Teams', icon: Smartphone },
            { key: 'slack', label: 'Notificaciones de Slack', icon: Smartphone },
            { key: 'browser', label: 'Notificaciones del Navegador', icon: Globe },
            { key: 'sla_alerts', label: 'Alertas de SLA', icon: Bell },
            { key: 'daily_summary', label: 'Resumen Diario', icon: Mail },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700">
              <div className="flex items-center space-x-3">
                <Icon className={darkMode ? 'text-neutral-400' : 'text-neutral-600'} size={20} />
                <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                  {label}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) => setNotifications(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-500"></div>
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleNotificationUpdate}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save size={20} />
            <span>Guardar Preferencias</span>
          </button>
        </div>
      </div>

      {/* API Tokens */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Key className={darkMode ? 'text-neutral-400' : 'text-neutral-600'} size={24} />
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Tokens API
            </h2>
          </div>
          <button
            onClick={() => setShowTokenForm(!showTokenForm)}
            className="bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Key size={20} />
            <span>Nuevo Token</span>
          </button>
        </div>

        {showTokenForm && (
          <div className={`p-4 mb-6 rounded-lg border ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-neutral-50 border-neutral-300'
            }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Nombre del token"
                value={newToken.name}
                onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                className={`px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={newToken.description}
                onChange={(e) => setNewToken(prev => ({ ...prev, description: e.target.value }))}
                className={`px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={generateApiToken}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Generar Token
              </button>
              <button
                onClick={() => setShowTokenForm(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${darkMode
                    ? 'border-neutral-600 text-neutral-300 hover:bg-neutral-700'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {apiTokens.map(token => (
            <div key={token.id} className={`p-4 rounded-lg border ${darkMode ? 'border-neutral-600 bg-neutral-700' : 'border-neutral-300 bg-neutral-50'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {token.name}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Creado: {token.created} • Último uso: {token.lastUsed}
                  </p>
                </div>
                <button
                  onClick={() => deleteToken(token.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <code className={`flex-1 px-3 py-2 rounded font-mono text-sm ${darkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                  {token.isVisible ? token.token : '•'.repeat(20) + token.token.slice(-4)}
                </code>
                <button
                  onClick={() => toggleTokenVisibility(token.id)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-neutral-600 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
                    }`}
                >
                  {token.isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToken(token.token)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-neutral-600 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
                    }`}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;