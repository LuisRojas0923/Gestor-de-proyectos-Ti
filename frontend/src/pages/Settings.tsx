import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Power, ShieldCheck } from 'lucide-react';
import { Title, MaterialCard, Button, Text } from '../components/atoms';
import { useNotifications } from '../components/notifications/NotificationsContext';

import EmailUpdateSection from './Settings/components/EmailUpdateSection';
import ProfileSection from './Settings/components/ProfileSection';
import NotificationSection from './Settings/components/NotificationSection';
import SecuritySection from './Settings/components/SecuritySection';
import AdminSection from './Settings/components/AdminSection';
import ApiTokenSection from './Settings/components/ApiTokenSection';
import AdminLoginLock from './Settings/components/AdminLoginLock';
import ModuleMasterPanel from './Settings/components/ModuleMasterPanel';

import { useProfileSettings } from './Settings/hooks/useProfileSettings';
import { useSecuritySettings } from './Settings/hooks/useSecuritySettings';
import { useApiTokenSettings } from './Settings/hooks/useApiTokenSettings';

const Settings: React.FC = () => {
  const { addNotification } = useNotifications();
  const { t, i18n } = useTranslation();
  const { 
    profile, setProfile, handleProfileUpdate, 
    handleEmailUpdate, isUpdatingEmail,
    darkMode, toggleDarkMode, user 
  } = useProfileSettings();

  // Estados para el Panel Maestro
  const [showAdminLock, setShowAdminLock] = useState(false);
  const [isPanelUnlocked, setIsPanelUnlocked] = useState(false);
  const [adminVerifyPassword, setAdminVerifyPassword] = useState('');

  const {
    analystCedula, setAnalystCedula, isCreatingAnalyst, handleCreateAnalyst,
    passwordForm, setPasswordForm, isChangingPassword, handleChangePassword
  } = useSecuritySettings();
  const {
    apiTokens, generateApiToken, copyToken, deleteToken, toggleTokenVisibility,
    newToken, setNewToken, showTokenForm, setShowTokenForm
  } = useApiTokenSettings();

  const [notifications, setNotifications] = useState({
    email: true, teams: false, slack: true, browser: true, sla_alerts: true, daily_summary: true,
  });

  const timezones = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
    { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
    { value: 'America/Bogota', label: 'Bogota (GMT-5)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
    { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
    { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' },
  ];

  const handleUnlockAdmin = (password: string) => {
    setAdminVerifyPassword(password);
    setIsPanelUnlocked(true);
    setShowAdminLock(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <Title variant="h3" weight="bold" color="text-primary">{t('settings')}</Title>
      </div>

      {user?.emailNeedsUpdate && (
        <EmailUpdateSection 
          email={user?.email || ''}
          needsUpdate={true}
          onUpdate={handleEmailUpdate}
          isLoading={isUpdatingEmail}
        />
      )}

      <ProfileSection
        profile={profile} setProfile={setProfile} timezones={timezones}
        i18n={i18n} darkMode={darkMode} toggleDarkMode={toggleDarkMode}
        handleProfileUpdate={handleProfileUpdate}
      />

      {!user?.emailNeedsUpdate && (
        <EmailUpdateSection 
          email={user?.email || ''}
          needsUpdate={false}
          onUpdate={handleEmailUpdate}
          isLoading={isUpdatingEmail}
        />
      )}

      <NotificationSection
        notifications={notifications} setNotifications={setNotifications}
        handleNotificationUpdate={() => addNotification('success', 'Preferencias actualizadas')}
      />

      <SecuritySection
        passwordForm={passwordForm} setPasswordForm={setPasswordForm}
        isChangingPassword={isChangingPassword} handleChangePassword={handleChangePassword}
      />

      {user?.role === 'admin' && (
        <AdminSection
          analystCedula={analystCedula} setAnalystCedula={setAnalystCedula}
          isCreatingAnalyst={isCreatingAnalyst} handleCreateAnalyst={handleCreateAnalyst}
        />
      )}

      {user?.role === 'admin' && (
        <MaterialCard className="p-6 border-2 border-red-500/10 bg-red-50/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-600">
                <Power size={24} />
              </div>
              <div>
                <Title variant="h5" weight="bold">Zona de Seguridad Global</Title>
                <Text variant="body2" color="text-secondary">Control maestro de módulos y disponibilidad del sistema.</Text>
              </div>
            </div>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700 !rounded-xl px-8 shadow-lg shadow-red-500/20"
              onClick={() => setShowAdminLock(true)}
              icon={ShieldCheck}
            >
              Abrir Panel Maestro
            </Button>
          </div>

          {isPanelUnlocked && (
            <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
              <ModuleMasterPanel
                adminPassword={adminVerifyPassword}
                onClose={() => { setIsPanelUnlocked(false); setAdminVerifyPassword(''); }}
              />
            </div>
          )}
        </MaterialCard>
      )}

      <AdminLoginLock
        isOpen={showAdminLock}
        onUnlock={handleUnlockAdmin}
        onClose={() => setShowAdminLock(false)}
      />

      <ApiTokenSection
        apiTokens={apiTokens} showTokenForm={showTokenForm} setShowTokenForm={setShowTokenForm}
        newToken={newToken} setNewToken={setNewToken} generateApiToken={generateApiToken}
        deleteToken={deleteToken} toggleTokenVisibility={toggleTokenVisibility} copyToken={copyToken}
      />
    </div>
  );
};

export default Settings;
