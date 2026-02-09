import React from 'react';
import { User, IdCard, Network, MapPin, Wallet } from 'lucide-react';
import { Text, MaterialCard } from '../../../components/atoms';

interface UserSummaryCardProps {
    user: any;
}

const UserSummaryCard: React.FC<UserSummaryCardProps> = ({ user }) => {
    return (
        <MaterialCard className="!bg-[#002060] !text-white p-2 sm:p-3 md:p-4 rounded-2xl shadow-lg !border-none md:sticky top-[104px] z-30 mb-0.5 backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 md:gap-6 items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                        <User size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Empleado</Text>
                        <Text variant="caption" className="text-[10px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.name}>{user.name}</Text>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                        <IdCard size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Cargo</Text>
                        <Text variant="caption" className="text-[10px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.cargo}>{user.cargo}</Text>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                        <Network size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Área</Text>
                        <Text variant="caption" className="text-[10px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.area}>{user.area}</Text>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                        <MapPin size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">Sede</Text>
                        <Text variant="caption" className="text-[10px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.sede}>{user.sede}</Text>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-800/40 p-2 rounded-lg text-white">
                        <Wallet size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70 truncate">C. Costo</Text>
                        <Text variant="caption" className="text-[10px] sm:text-[14px] font-bold leading-tight truncate block" color="white" title={user.centrocosto || '---'}>{user.centrocosto || '---'}</Text>
                    </div>
                </div>
                <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 col-span-2 md:col-span-1">
                    <div className="bg-blue-800/40 p-2.5 rounded-lg text-white">
                        <Wallet size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Text variant="caption" weight="semibold" color="white" className="text-[10px] sm:text-[14px] uppercase tracking-tight block opacity-70">Base Viáticos</Text>
                        <Text variant="caption" className="text-[11px] sm:text-[14px] font-black leading-tight" color="white">${(user.baseviaticos || 0).toLocaleString()}</Text>
                    </div>
                </div>
            </div>
        </MaterialCard>
    );
};

export default UserSummaryCard;
