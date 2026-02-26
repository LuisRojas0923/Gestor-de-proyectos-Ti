import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Title } from '../components/atoms';
import { useNotifications } from '../components/notifications/NotificationsContext';

import ProfileSection from './Settings/components/ProfileSection';
import NotificationSection from './Settings/components/NotificationSection';
import SecuritySection from './Settings/components/SecuritySection';
import AdminSection from './Settings/components/AdminSection';
import ApiTokenSection from './Settings/components/ApiTokenSection';

import { useProfileSettings } from './Settings/hooks/useProfileSettings';
import { useSecuritySettings } from './Settings/hooks/useSecuritySettings';
import { useApiTokenSettings } from './Settings/hooks/useApiTokenSettings';

const Settings: React.FC = () => {
  const { addNotification } = useNotifications();
  const { t, i18n } = useTranslation();
  const { profile, setProfile, handleProfileUpdate, darkMode, toggleDarkMode, user } = useProfileSettings();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Title variant="h3" weight="bold" color="text-primary">{t('settings')}</Title>

      <ProfileSection
        profile={profile} setProfile={setProfile} timezones={timezones}
        i18n={i18n} darkMode={darkMode} toggleDarkMode={toggleDarkMode}
        handleProfileUpdate={handleProfileUpdate}
      />

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

      <ApiTokenSection
        apiTokens={apiTokens} showTokenForm={showTokenForm} setShowTokenForm={setShowTokenForm}
        newToken={newToken} setNewToken={setNewToken} generateApiToken={generateApiToken}
        deleteToken={deleteToken} toggleTokenVisibility={toggleTokenVisibility} copyToken={copyToken}
      />
    </div>
  );
};

export default Settings;