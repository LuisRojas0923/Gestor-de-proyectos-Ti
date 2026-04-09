import React from 'react';
import { Text } from '../atoms';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CalloutProps {
    children: React.ReactNode;
    variant?: 'info' | 'warning' | 'success' | 'error';
    title?: string;
    className?: string;
    icon?: React.ElementType;
}

const Callout: React.FC<CalloutProps> = ({
    children,
    variant = 'info',
    title,
    className = '',
    icon: IconComponent
}) => {
    const variants = {
        info: {
            bg: 'bg-primary-50 dark:bg-primary-500/10',
            border: 'border-primary-100 dark:border-primary-500/20',
            text: 'text-primary-700 dark:text-primary-300',
            icon: Info,
            iconColor: 'text-primary-500'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-100 dark:border-amber-500/20',
            text: 'text-amber-700 dark:text-amber-300',
            icon: AlertTriangle,
            iconColor: 'text-amber-500'
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-500/10',
            border: 'border-green-100 dark:border-green-500/20',
            text: 'text-green-700 dark:text-green-300',
            icon: CheckCircle,
            iconColor: 'text-green-500'
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-100 dark:border-red-500/20',
            text: 'text-red-700 dark:text-red-300',
            icon: XCircle,
            iconColor: 'text-red-500'
        }
    };

    const config = variants[variant];
    const Icon = IconComponent || config.icon;

    return (
        <div className={`p-4 rounded-2xl border ${config.bg} ${config.border} ${className}`}>
            <div className="flex gap-3">
                <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
                    <Icon size={18} />
                </div>
                <div className="flex-1 space-y-1">
                    {title && (
                        <Text variant="body2" weight="bold" color="inherit" className={`${config.text} block mb-1`}>
                            {title}
                        </Text>
                    )}
                    <div className={`${config.text} text-sm leading-relaxed antialiased`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Callout;
