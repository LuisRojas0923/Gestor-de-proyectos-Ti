import React, { useState } from 'react';
import { Mail, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button, Icon, Badge } from '../../../components/atoms';

interface EmailUpdateSectionProps {
    email: string;
    needsUpdate: boolean;
    onUpdate: (newEmail: string) => Promise<void>;
    isLoading: boolean;
}

const EmailUpdateSection: React.FC<EmailUpdateSectionProps> = ({
    email, needsUpdate, onUpdate, isLoading
}) => {
    const [newEmail, setNewEmail] = useState(email);
    const [isValid, setIsValid] = useState(true);

    const validateEmail = (val: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(val);
    };

    const handleUpdate = async () => {
        if (!validateEmail(newEmail)) {
            setIsValid(false);
            return;
        }
        setIsValid(true);
        await onUpdate(newEmail);
    };

    return (
        <MaterialCard className={`p-6 border-2 transition-all duration-500 ${needsUpdate ? 'border-amber-400/50 bg-amber-50/5' : 'border-success-400/20 bg-success-50/5'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${needsUpdate ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-success-100 dark:bg-success-900/20 text-success-600'}`}>
                        <Icon name={needsUpdate ? AlertTriangle : CheckCircle} size="lg" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Title variant="h5" weight="bold">Correo Corporativo (ERP)</Title>
                            {!needsUpdate && (
                                <Badge variant="success" size="sm" className="uppercase tracking-wider">
                                    Sincronizado
                                </Badge>
                            )}
                        </div>
                        <Text variant="body2" color="text-secondary" className="max-w-md">
                            {needsUpdate 
                                ? "Tu correo no ha sido validado con el ERP Solid. Es necesario sincronizarlo para recibir notificaciones de nómina, viáticos e indicadores."
                                : "Tu correo está correctamente sincronizado con el ERP Solid. Recibirás todas las comunicaciones oficiales en esta dirección."}
                        </Text>
                    </div>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-64">
                        <Input 
                            type="email" 
                            label="Correo Electrónico" 
                            value={newEmail} 
                            onChange={(e) => {
                                setNewEmail(e.target.value);
                                if (!isValid) setIsValid(validateEmail(e.target.value));
                            }} 
                            placeholder="correo@refridcol.com" 
                            className={!isValid ? 'border-red-500' : ''}
                            disabled={isLoading}
                        />
                        {!isValid && <Text variant="caption" color="error" className="mt-1">Ingresa un correo válido</Text>}
                    </div>
                    <Button 
                        variant={needsUpdate ? "primary" : "outline"} 
                        onClick={handleUpdate}
                        disabled={isLoading || (newEmail === email && !needsUpdate)}
                        icon={isLoading ? RefreshCw : (needsUpdate ? Mail : CheckCircle)}
                        className={`${isLoading ? 'animate-spin' : ''} h-[42px]`}
                    >
                        {isLoading ? 'Sincronizando...' : (needsUpdate ? 'Sincronizar ahora' : 'Actualizar')}
                    </Button>
                </div>
            </div>
        </MaterialCard>
    );
};

export default EmailUpdateSection;
