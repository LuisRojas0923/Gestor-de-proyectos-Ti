import React from 'react';
import { User as UserIcon, Moon, Sun, Save } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button, Select } from '../../../components/atoms';

interface ProfileSectionProps {
    profile: any;
    setProfile: any;
    timezones: any[];
    i18n: any;
    darkMode: boolean;
    toggleDarkMode: () => void;
    handleProfileUpdate: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
    profile, setProfile, timezones, i18n, darkMode, toggleDarkMode, handleProfileUpdate
}) => (
    <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
            <UserIcon className="text-[var(--color-text-secondary)]" size={24} />
            <Title variant="h5" weight="semibold" color="text-primary">Perfil de Usuario</Title>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <Input label="Nombre Completo" value={profile.name} onChange={(e) => setProfile((prev: any) => ({ ...prev, name: e.target.value }))} placeholder="Ingresa tu nombre" />
                <Input type="email" label="Email" value={profile.email} onChange={(e) => setProfile((prev: any) => ({ ...prev, email: e.target.value }))} placeholder="usuario@ejemplo.com" />
                <Select label="Rol" value={profile.role} onChange={(e) => setProfile((prev: any) => ({ ...prev, role: e.target.value }))} options={[
                    { value: "Analista de sistemas", label: "Analista Junior" },
                    { value: "Analista de mejoramiento", label: "Analista Senior" },
                    { value: "Líder Técnico", label: "Líder Técnico" },
                    { value: "Director", label: "Gerente de Proyecto" },
                ]} />
            </div>
            <div className="space-y-4">
                <Select label="Zona Horaria" value={profile.timezone} onChange={(e) => setProfile((prev: any) => ({ ...prev, timezone: e.target.value }))} options={timezones} />
                <Select label="Idioma" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} options={[
                    { value: "es", label: "Español" },
                    { value: "en", label: "English" },
                ]} />
                <div>
                    <Text as="label" variant="body2" weight="medium" color="text-secondary" className="block mb-2">Tema</Text>
                    <Button variant="outline" className="w-full justify-center" onClick={toggleDarkMode} icon={darkMode ? Moon : Sun}>
                        {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
                    </Button>
                </div>
            </div>
        </div>
        <div className="flex justify-end mt-6">
            <Button onClick={handleProfileUpdate} variant="primary" icon={Save}>Guardar Cambios</Button>
        </div>
    </MaterialCard>
);

export default ProfileSection;
