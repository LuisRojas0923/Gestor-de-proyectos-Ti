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
  Users,
  Shield,
  Lock as LockIcon,
} from 'lucide-react';
import { AuthService } from '../services/AuthService';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { Title, Text, MaterialCard, Input, Button, Select, Switch } from '../components/atoms';

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

  // Estados para nuevas funcionalidades
  const [analystCedula, setAnalystCedula] = useState('');
  const [isCreatingAnalyst, setIsCreatingAnalyst] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);


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

  const handleCreateAnalyst = async () => {
    if (!analystCedula) {
      addNotification('error', 'Ingresa una cédula válida');
      return;
    }
    setIsCreatingAnalyst(true);
    try {
      await AuthService.createAnalyst(analystCedula);
      addNotification('success', 'Analista creado correctamente. Su contraseña inicial es su cédula.');
      setAnalystCedula('');
    } catch (err: any) {
      addNotification('error', typeof err === 'string' ? err : 'Error al crear analista');
    } finally {
      setIsCreatingAnalyst(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.nueva !== passwordForm.confirmar) {
      addNotification('error', 'Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.nueva.length < 8) {
      addNotification('error', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsChangingPassword(true);
    try {
      await AuthService.changePassword(passwordForm.actual, passwordForm.nueva);
      addNotification('success', 'Contraseña cambiada exitosamente');
      setPasswordForm({ actual: '', nueva: '', confirmar: '' });
    } catch (err: any) {
      addNotification('error', typeof err === 'string' ? err : 'Error al cambiar contraseña');
    } finally {
      setIsChangingPassword(false);
    }
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
      <Title variant="h3" weight="bold" color="text-primary">
        {t('settings')}
      </Title>
      {/* Profile Settings */}
      <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="text-[var(--color-text-secondary)]" size={24} />
          <Title variant="h5" weight="semibold" color="text-primary">
            Perfil de Usuario
          </Title>
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
              <Text as="label" variant="body2" weight="medium" color="text-secondary" className="block mb-2">
                Tema
              </Text>
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
          <Title variant="h5" weight="semibold" color="text-primary">
            Notificaciones
          </Title>
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
                <Text color="text-primary">
                  {label}
                </Text>
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

      {/* Security - Change Password */}
      <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="text-[var(--color-text-secondary)]" size={24} />
          <Title variant="h5" weight="semibold" color="text-primary">
            Seguridad y Acceso
          </Title>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
          noValidate
        >
          <Text variant="body2" color="text-secondary" className="mb-4">
            Mantenga su cuenta segura cambiando periódicamente su contraseña.
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="password"
              label="Contraseña Actual"
              value={passwordForm.actual}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, actual: e.target.value }))}
              placeholder="••••••••"
              icon={LockIcon}
              autoComplete="current-password"
            />
            <Input
              type="password"
              label="Nueva Contraseña"
              value={passwordForm.nueva}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, nueva: e.target.value }))}
              placeholder="••••••••"
              icon={LockIcon}
              autoComplete="new-password"
            />
            <Input
              type="password"
              label="Confirmar Contraseña"
              value={passwordForm.confirmar}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmar: e.target.value }))}
              placeholder="••••••••"
              icon={LockIcon}
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={isChangingPassword}
              icon={Key}
            >
              Cambiar Contraseña
            </Button>
          </div>
        </form>
      </MaterialCard>

      {/* Admin Section - Only for Admin role */}
      {user?.role === 'admin' && (
        <MaterialCard className="p-6 border-2 border-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/5">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="text-[var(--color-primary)]" size={24} />
            <Title variant="h5" weight="bold" color="text-primary">
              Administración de Analistas
            </Title>
          </div>

          <div className="bg-[var(--color-primary)]/5 p-6 rounded-3xl border border-[var(--color-primary)]/10">
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Cédula del nuevo analista (Semilla)"
                  placeholder="Ej: 123456789"
                  value={analystCedula}
                  onChange={(e) => setAnalystCedula(e.target.value)}
                  icon={User}
                />
                <Text variant="caption" className="mt-2 text-[var(--color-primary)]/60 font-medium italic">
                  * El sistema validará los datos en Solid ERP automáticamente.
                </Text>
              </div>
              <Button
                onClick={handleCreateAnalyst}
                variant="primary"
                loading={isCreatingAnalyst}
                icon={Users}
                className="mb-1"
              >
                Crear Analista
              </Button>
            </div>
          </div>
        </MaterialCard>
      )}

      {/* API Tokens */}
      <MaterialCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Key className="text-[var(--color-text-secondary)]" size={24} />
            <Title variant="h5" weight="semibold" color="text-primary">
              Tokens API
            </Title>
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
                  <Title variant="h6" weight="medium" color="text-primary">
                    {token.name}
                  </Title>
                  <Text variant="body2" color="text-secondary">
                    Creado: {token.created} • Último uso: {token.lastUsed}
                  </Text>
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