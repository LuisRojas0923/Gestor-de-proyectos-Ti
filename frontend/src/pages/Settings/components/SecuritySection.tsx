import React from 'react';
import { Shield, Lock as LockIcon, Key } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button } from '../../../components/atoms';

interface SecuritySectionProps {
    passwordForm: any;
    setPasswordForm: any;
    isChangingPassword: boolean;
    handleChangePassword: () => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({
    passwordForm, setPasswordForm, isChangingPassword, handleChangePassword
}) => (
    <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
            <Shield className="text-[var(--color-text-secondary)]" size={24} />
            <Title variant="h5" weight="semibold" color="text-primary">Seguridad y Acceso</Title>
        </div>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} noValidate>
            <Text variant="body2" color="text-secondary" className="mb-4">Mantenga su cuenta segura cambiando periódicamente su contraseña.</Text>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input type="password" label="Contraseña Actual" value={passwordForm.actual} onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, actual: e.target.value }))} placeholder="••••••••" icon={LockIcon} autoComplete="current-password" />
                <Input type="password" label="Nueva Contraseña" value={passwordForm.nueva} onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, nueva: e.target.value }))} placeholder="••••••••" icon={LockIcon} autoComplete="new-password" />
                <Input type="password" label="Confirmar Contraseña" value={passwordForm.confirmar} onChange={(e) => setPasswordForm((prev: any) => ({ ...prev, confirmar: e.target.value }))} placeholder="••••••••" icon={LockIcon} autoComplete="new-password" />
            </div>
            <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={isChangingPassword} icon={Key}>Cambiar Contraseña</Button>
            </div>
        </form>
    </MaterialCard>
);

export default SecuritySection;
