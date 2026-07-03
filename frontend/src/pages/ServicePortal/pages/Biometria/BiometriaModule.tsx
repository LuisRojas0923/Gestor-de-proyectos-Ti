import React, { useState } from 'react';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { Button } from '../../../../components/atoms';
import BiometriaDashboard from './BiometriaDashboard';
import BiometriaAdminView from './BiometriaAdminView';

const BiometriaModule: React.FC = () => {
    const isAdmin = useIsAdmin();
    // Si es administrador, muestra el panel administrativo por defecto. Si no, solo puede ver "asistencia".
    const [view, setView] = useState<'admin' | 'asistencia'>(isAdmin ? 'admin' : 'asistencia');

    if (!isAdmin) {
        // Usuarios estǭndar solo ven la interfaz de marcado de asistencia
        return <BiometriaDashboard />;
    }

    return (
        <div className="flex-1 flex flex-col w-full h-full bg-slate-50 dark:bg-[#0A0A0A]">
            {/* Cabecera de pestaas solo para administradores */}
            <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 flex justify-center space-x-2 shadow-sm">
                <Button
                    variant="custom"
                    onClick={() => setView('admin')}
                    className={`px-6 py-2 rounded-md transition-all duration-200 ${view === 'admin'
                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800'
                        }`}
                >
                    Panel de Administración
                </Button>
                <Button
                    variant="custom"
                    onClick={() => setView('asistencia')}
                    className={`px-6 py-2 rounded-md transition-all duration-200 ${view === 'asistencia'
                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-neutral-800'
                        }`}
                >
                    Mi Asistencia (Validación)
                </Button>
            </div>

            {/* Renderizado dinǭmico segn la pestaa seleccionada */}
            <div className="flex-1 overflow-auto">
                {view === 'admin' ? <BiometriaAdminView /> : <BiometriaDashboard />}
            </div>
        </div>
    );
};

export default BiometriaModule;
