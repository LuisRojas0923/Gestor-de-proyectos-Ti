import { useState } from 'react';
import { AuthService } from '../../../services/AuthService';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

export const useSecuritySettings = () => {
    const { addNotification } = useNotifications();
    const [analystCedula, setAnalystCedula] = useState('');
    const [isCreatingAnalyst, setIsCreatingAnalyst] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ actual: '', nueva: '', confirmar: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleCreateAnalyst = async () => {
        if (!analystCedula) { addNotification('error', 'Ingresa una cédula válida'); return; }
        setIsCreatingAnalyst(true);
        try {
            await AuthService.createAnalyst(analystCedula);
            addNotification('success', 'Analista creado correctamente.');
            setAnalystCedula('');
        } catch (err: any) {
            addNotification('error', typeof err === 'string' ? err : 'Error al crear analista');
        } finally {
            setIsCreatingAnalyst(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.nueva !== passwordForm.confirmar) { addNotification('error', 'Las contraseñas no coinciden'); return; }
        if (passwordForm.nueva.length < 8) { addNotification('error', 'La nueva contraseña debe tener al menos 8 caracteres'); return; }
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

    return {
        analystCedula, setAnalystCedula, isCreatingAnalyst, handleCreateAnalyst,
        passwordForm, setPasswordForm, isChangingPassword, handleChangePassword
    };
};
