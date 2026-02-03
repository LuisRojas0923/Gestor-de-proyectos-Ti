import React from 'react';
import { Briefcase, MapPin, AlertCircle, Clock, Calendar } from 'lucide-react';
import { Text, Badge } from '../../../components/atoms';
import { formatFriendlyDate } from '../../../utils/dateUtils';

interface AnalystSidebarInfoProps {
    user: {
        name: string;
        id: string;
        area?: string;
        sede?: string;
        cargo?: string;
        prioridad?: string;
    };
    createdAt: string;
    idealDate?: string;
    prioridadJustificacion?: string;
}

const AnalystSidebarInfo: React.FC<AnalystSidebarInfoProps> = ({ user, createdAt, idealDate, prioridadJustificacion }) => {
    // Cálculo simple de SLA (ejemplo 4h)
    const creationDate = new Date(createdAt);
    const slaLimit = new Date(creationDate.getTime() + 4 * 60 * 60 * 1000);
    const now = new Date();
    const remainingTimeMs = Math.max(0, slaLimit.getTime() - now.getTime());
    const remainingMinutes = Math.floor(remainingTimeMs / (1000 * 60));
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const slaPercent = Math.max(0, Math.min(100, (remainingTimeMs / (4 * 60 * 60 * 1000)) * 100));
    const progressStyle = { width: `${Math.max(0, 100 - slaPercent)}%` };

    return (
        <aside className="col-span-2 bg-[var(--color-background)] border-r border-[var(--color-border)] p-4 space-y-6 overflow-y-auto hidden lg:block custom-scrollbar transition-colors">
            <section>
                <Text variant="caption" weight="bold" color="navy" className="uppercase mb-4 tracking-widest block">Solicitante</Text>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden uppercase">
                        {user.name ? user.name.split(' ').filter(p => p).slice(0, 2).map(n => n[0]).join('') : 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <Text variant="body2" weight="bold" className="truncate block" color="text-primary">{user.name}</Text>
                        <Text variant="caption" className="font-mono text-slate-500 opacity-60 uppercase">{user.id}</Text>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <Text variant="caption" weight="bold" color="navy" className="uppercase tracking-widest block">Detalles del Perfil</Text>
                <div className="space-y-3">
                    <ProfileItem icon={<Briefcase size={12} />} label="Área" value={user.area || 'N/A'} />
                    <ProfileItem icon={<Briefcase size={12} />} label="Cargo" value={user.cargo || 'N/A'} />
                    <ProfileItem icon={<MapPin size={12} />} label="Sede" value={user.sede || 'N/A'} />
                    <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-2 text-slate-400">
                            <AlertCircle size={12} />
                            <Text variant="caption" weight="bold" className="uppercase">Prioridad</Text>
                        </div>
                        <Badge
                            variant={user.prioridad === 'Alta' || user.prioridad === 'Crítica' ? 'error' : 'success'}
                            size="sm"
                            className="uppercase tracking-widest"
                        >
                            {user.prioridad || 'Media'}
                        </Badge>
                    </div>
                    {prioridadJustificacion && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-100 dark:border-amber-800/50 mt-1">
                            <Text variant="caption" color="text-secondary" className="italic leading-snug block">
                                "{prioridadJustificacion}"
                            </Text>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-[var(--color-border)]">
                <Text variant="caption" weight="bold" color="navy" className="uppercase tracking-widest block">Tiempos</Text>
                <div className="space-y-3">
                    <ProfileItem icon={<Calendar size={12} />} label="Creado el" value={formatFriendlyDate(createdAt)} />
                    {idealDate && (
                        <ProfileItem icon={<Clock size={12} />} label="Fecha Ideal" value={formatFriendlyDate(idealDate)} />
                    )}
                </div>
            </section>

            <section className="pt-4 border-t border-[var(--color-border)] opacity-80">
                <Text variant="caption" weight="bold" color="navy" className="uppercase mb-4 tracking-widest block">SLA de Respuesta</Text>
                <div className="relative w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${slaPercent < 25 ? 'bg-red-500' : slaPercent < 50 ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={progressStyle}
                    ></div>
                </div>
                <div className="flex justify-between mt-2">
                    <Text variant="caption" weight="bold" className={remainingMinutes < 60 ? 'text-red-600' : 'text-orange-600'}>
                        {remainingMinutes > 0 ? `Quedan ${hours > 0 ? `${hours}h ` : ''}${mins}min` : 'Excedido'}
                    </Text>
                    <Text variant="caption" color="text-secondary" className="opacity-40">Meta: 4h</Text>
                </div>
            </section>
        </aside>
    );
};

const ProfileItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-800/50 pb-2">
        <div className="flex items-center gap-2 text-slate-400">
            {icon}
            <Text variant="caption" weight="bold" className="uppercase tracking-tighter opacity-70">{label}</Text>
        </div>
        <Text variant="caption" weight="bold" color="text-primary" className="pl-5 break-words leading-tight">
            {value}
        </Text>
    </div>
);

export default AnalystSidebarInfo;
