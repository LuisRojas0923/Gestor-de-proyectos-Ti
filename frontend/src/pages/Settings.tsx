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
  Type,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { MaterialTypography, MaterialCard, Input, Button, Select, Switch } from '../components/atoms';
import { materialDesignTokens } from '../components/tokens';
import DesignSystemCatalog from './DesignSystemCatalog';

const Settings: React.FC = () => {
  const { addNotification } = useNotifications();
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { darkMode, user } = state;

  const [profile, setProfile] = useState({
    name: user?.name || 'Usuario Demo',
    email: user?.email || 'usuario@refridcol.com',
    role: user?.role || 'Analista Senior',
    timezone: 'America//Bogota',
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
  const [showCatalog, setShowCatalog] = useState(false);

  // Si estamos viendo el catálogo, renderizarlo directamente
  if (showCatalog) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowCatalog(false)}
          className="mb-4"
        >
          ← Volver a Configuración
        </Button>
        <DesignSystemCatalog />
      </div>
    );
  }

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
    { value: 'America/Bogota', label: 'Bogota (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
    { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
    { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {t('settings')}
        </h1>
        <Button
          variant="outline"
          onClick={() => setShowCatalog(true)}
          title="Ver todos los componentes del sistema de diseño"
        >
          📖 Catálogo de Diseño
        </Button>
      </div>

      {/* Typography Settings */}
      <MaterialCard className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Type className="text-[var(--color-text-secondary)]" size={24} />
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Configuración de Tipografía
            </h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Typeface Preview */}
              <div>
                <MaterialTypography variant="subtitle2" className="mb-4 text-[var(--color-text-secondary)]">
                  Fuente Principal
                </MaterialTypography>
                <div className="p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]">
                  <p className="text-4xl mb-2" style={{ fontFamily: materialDesignTokens.typography.fontFamily.primary }}>
                    Aa
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {materialDesignTokens.typography.fontFamily.primary}
                  </p>
                </div>
              </div>

              {/* Scale Preview */}
              <div className="space-y-4">
                <MaterialTypography variant="subtitle2" className="mb-4 text-[var(--color-text-secondary)]">
                  Escala Tipográfica
                </MaterialTypography>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
                    <MaterialTypography variant="h4">H4 Heading</MaterialTypography>
                    <span className="text-xs text-[var(--color-text-secondary)]">34px</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
                    <MaterialTypography variant="h5">H5 Heading</MaterialTypography>
                    <span className="text-xs text-[var(--color-text-secondary)]">24px</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
                    <MaterialTypography variant="h6">H6 Heading</MaterialTypography>
                    <span className="text-xs text-[var(--color-text-secondary)]">20px</span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
                    <MaterialTypography variant="body1">Body 1</MaterialTypography>
                    <span className="text-xs text-[var(--color-text-secondary)]">16px</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <MaterialTypography variant="caption">Caption</MaterialTypography>
                    <span className="text-xs text-[var(--color-text-secondary)]">12px</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--color-border)]">
              <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)] text-center">
                El sistema de tipografía está centralizado. Cualquier cambio en los tokens se reflejará automáticamente en toda la aplicación.
              </MaterialTypography>
            </div>
          </div>
        </div>
      </MaterialCard>

      {/* Profile Settings */}
      <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="text-[var(--color-text-secondary)]" size={24} />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Perfil de Usuario
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Nombre Completo"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ingresa tu nombre"
            />

            <Input
              type="email"
              label="Email"
              value={profile.email}
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@ejemplo.com"
            />

            <Select
              label="Rol"
              value={profile.role}
              onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
              options={[
                { value: "Analista de sistemas", label: "Analista Junior" },
                { value: "Analista de mejoramiento", label: "Analista Senior" },
                { value: "Líder Técnico", label: "Líder Técnico" },
                { value: "Director", label: "Gerente de Proyecto" },
              ]}
            />
          </div>

          <div className="space-y-4">
            <Select
              label="Zona Horaria"
              value={profile.timezone}
              onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
              options={timezones}
            />

            <Select
              label="Idioma"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              options={[
                { value: "es", label: "Español" },
                { value: "en", label: "English" },
              ]}
            />

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
                Tema
              </label>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                icon={darkMode ? Moon : Sun}
              >
                {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleProfileUpdate}
            variant="primary"
            icon={Save}
          >
            Guardar Cambios
          </Button>
        </div>
      </MaterialCard>

      {/* Notifications */}
      <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="text-[var(--color-text-secondary)]" size={24} />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
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
            <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]">
              <div className="flex items-center space-x-3">
                <Icon className="text-[var(--color-text-secondary)]" size={20} />
                <span className="text-[var(--color-text-primary)]">
                  {label}
                </span>
              </div>
              <Switch
                checked={notifications[key as keyof typeof notifications]}
                onChange={(checked) => setNotifications(prev => ({
                  ...prev,
                  [key]: checked
                }))}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleNotificationUpdate}
            variant="primary"
            icon={Save}
          >
            Guardar Preferencias
          </Button>
        </div>
      </MaterialCard>

      {/* API Tokens */}
      <MaterialCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Key className="text-[var(--color-text-secondary)]" size={24} />
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Tokens API
            </h2>
          </div>
          <Button
            onClick={() => setShowTokenForm(!showTokenForm)}
            variant="secondary"
            icon={Key}
          >
            Nuevo Token
          </Button>
        </div>

        {showTokenForm && (
          <div className="p-4 mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                placeholder="Nombre del token"
                value={newToken.name}
                onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newToken.description}
                onChange={(e) => setNewToken(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={generateApiToken} variant="primary">
                Generar Token
              </Button>
              <Button onClick={() => setShowTokenForm(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {apiTokens.map(token => (
            <div key={token.id} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)]">
                    {token.name}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Creado: {token.created} • Último uso: {token.lastUsed}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteToken(token.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Eliminar
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 rounded font-mono text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                  {token.isVisible ? token.token : '•'.repeat(20) + token.token.slice(-4)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTokenVisibility(token.id)}
                  icon={token.isVisible ? EyeOff : Eye}
                >
                  {token.isVisible ? 'Ocultar' : 'Mostrar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToken(token.token)}
                  icon={Copy}
                >
                  Copiar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </MaterialCard>
    </div>
  );
};

export default Settings;