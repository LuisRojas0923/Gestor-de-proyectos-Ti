import React from 'react';
import { User } from '../hooks/useUserAdmin';
import { especialidadesList } from '../constants';
import { Text, Badge } from '../../../components/atoms';
import { DataTable, DataTableColumn } from '../../../components/molecules/DataTable';
import { Shield } from 'lucide-react';

interface UserListProps {
    users: User[];
    selectedUserId?: string;
    onUserSelect: (user: User) => void;
    isLoading: boolean;
    columnFilters: Record<string, Set<string>>;
    cascadingOptions: Record<string, string[]>;
    onFilterChange: (columnKey: string, filter: Set<string>) => void;
    sortState: { key: string; dir: 'asc' | 'desc' | null } | null;
    onSort: (key: string, dir: 'asc' | 'desc' | null) => void;
}

const UserList: React.FC<UserListProps> = ({
    users,
    selectedUserId,
    onUserSelect,
    isLoading,
    columnFilters,
    cascadingOptions,
    onFilterChange,
    sortState,
    onSort
}) => {
    const columns: DataTableColumn<User>[] = [
        {
            key: 'cedula',
            label: 'Cédula',
            minWidth: '110px',
            filterable: true,
            render: (row) => (
                <Text
                    as="span"
                    variant="caption"
                    className="font-mono bg-[var(--color-surface-variant)] px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300"
                >
                    {row.cedula}
                </Text>
            )
        },
        {
            key: 'nombre',
            label: 'Nombre Completo',
            flex: true,
            minWidth: '220px',
            filterable: true,
            render: (row) => {
                const isSelected = row.id === selectedUserId;
                return (
                    <div className="flex items-center gap-2">
                        {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] animate-pulse shrink-0" />
                        )}
                        <Text
                            weight={isSelected ? 'bold' : 'medium'}
                            variant="body2"
                            className={isSelected ? 'text-[var(--color-primary)]' : 'text-gray-900 dark:text-gray-100'}
                        >
                            {row.nombre}
                        </Text>
                    </div>
                );
            }
        },
        {
            key: 'rol',
            label: 'Rol',
            minWidth: '120px',
            filterable: true,
            render: (row) => (
                <Text variant="caption" weight="bold" color="primary" className="uppercase tracking-wider text-[10px]">
                    {row.rol}
                </Text>
            )
        },
        {
            key: 'esta_activo',
            label: 'Estado',
            minWidth: '100px',
            filterable: true,
            render: (row) => (
                <Badge variant={row.esta_activo ? 'success' : 'error'} size="sm" className="shadow-none">
                    {row.esta_activo ? 'Activo' : 'Inactivo'}
                </Badge>
            )
        },
        {
            key: 'especialidades',
            label: 'Especialidades TI / Áreas',
            minWidth: '240px',
            filterable: false,
            render: (row) => {
                const especialidades = JSON.parse(row.especialidades || '[]') as string[];
                const areasCount = JSON.parse(row.areas_asignadas || '[]').length;
                return (
                    <div className="flex flex-wrap gap-1 items-center">
                        {especialidades.slice(0, 2).map((esp: string) => (
                            <Badge key={esp} variant="info" size="sm" className="bg-opacity-30 border-transparent text-[9px] py-0 px-1.5 h-4.5">
                                {especialidadesList.find(e => e.id === esp)?.label || esp}
                            </Badge>
                        ))}
                        {especialidades.length > 2 && (
                            <Text
                                as="span"
                                variant="caption"
                                className="!text-[9px] text-neutral-500 font-bold self-center"
                            >
                                +{especialidades.length - 2}
                            </Text>
                        )}
                        {areasCount > 0 && (
                            <Badge variant="warning" size="sm" className="bg-opacity-30 border-transparent text-[9px] py-0 px-1.5 h-4.5">
                                {areasCount} Áreas
                            </Badge>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <DataTable<User>
            columns={columns}
            data={users}
            keyExtractor={(row) => row.id}
            onRowClick={onUserSelect}
            columnFilters={columnFilters}
            columnOptions={cascadingOptions}
            onFilterChange={onFilterChange}
            activeSortKey={sortState?.key ?? null}
            activeSortDir={sortState?.dir ?? null}
            onSort={onSort}
            isLoading={isLoading}
            loadingMessage="Cargando lista de usuarios..."
            emptyMessage="No se encontraron usuarios para los criterios de búsqueda"
            emptyIcon={
                <div className="p-4 rounded-full bg-[var(--color-surface-variant)] text-neutral-400">
                    <Shield size={32} />
                </div>
            }
            maxHeight="max-h-[600px]"
            className="!rounded-2xl border border-[var(--color-border)] shadow-sm"
            rowIndicatorColor="bg-[var(--color-primary)]"
            showRowIndicator={true}
        />
    );
};

export default UserList;
